import React, { useRef, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Mic, MicOff, Volume2, Power, Terminal, ArrowLeft, User, Key, Trash2, AlertCircle } from 'lucide-react';
import { KREDMINT_SYSTEM_PROMPT } from '../constants';
import { addCallLog } from '../utils/storage';
import { CallLog, Agent } from '../types';

// Helper for Blob creation
function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] before scaling to avoid distortion artifacts
    const clamped = Math.max(-1, Math.min(1, data[i]));
    int16[i] = clamped * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helpers for Encoding/Decoding
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Production-ready Voice Mapping
const getGeminiVoiceName = (voiceId: string) => {
  switch(voiceId) {
    case 'female_1': return 'Kore';
    case 'female_2': return 'Zephyr';
    case 'male_1': return 'Charon';
    default: return 'Puck';
  }
};

// Determine supported MIME type for MediaRecorder (Safari vs Chrome)
const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  console.warn("No preferred MIME type supported, defaulting to browser default.");
  return ''; 
};

const LiveAgent: React.FC = () => {
  const location = useLocation();
  const testAgent = location.state?.agent as Agent | undefined;

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'Disconnected' | 'Connecting' | 'Live' | 'Error'>('Disconnected');
  const [currentVolume, setCurrentVolume] = useState(0);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const audioEpochRef = useRef<number>(0);
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const recordingDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Session handling
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Transcript Accumulators
  const conversationHistoryRef = useRef<string[]>([]);
  const currentTurnInputRef = useRef<string>('');
  const currentTurnOutputRef = useRef<string>('');
  
  // Ref to track if we are currently disconnecting to prevent double cleanup
  const isDisconnectingRef = useRef(false);

  useEffect(() => {
    const checkApiKey = async () => {
        try {
            const win = window as any;
            if (win.aistudio && win.aistudio.hasSelectedApiKey) {
                const hasKey = await win.aistudio.hasSelectedApiKey();
                setNeedsApiKey(!hasKey);
            }
        } catch (e) {
            console.error("Error checking API key state", e);
        }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    return () => {
      handleDisconnect(true);
    };
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), msg]); 
  };

  const addConversationLog = (role: 'User' | 'Agent', text: string) => {
      const entry = `${role}: ${text}`;
      conversationHistoryRef.current.push(entry);
      if (text.length < 50) {
        addLog(entry);
      } else {
        addLog(`${role}: ${text.substring(0, 40)}...`);
      }
  };

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
        await win.aistudio.openSelectKey();
        setNeedsApiKey(false);
    }
  };

  const startSession = async () => {
    if (isConnected || status === 'Connecting') return;
    
    // Reset disconnection lock
    isDisconnectingRef.current = false;

    try {
      if (needsApiKey) {
          await handleSelectKey();
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
          throw new Error("API key not found. Please select a valid key.");
      }

      await handleDisconnect(false);

      setStatus('Connecting');
      addLog('--- New Session Started ---');
      addLog('Initializing audio contexts...');

      // 1. Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000, latencyHint: 'interactive' });
      const outputCtx = new AudioContextClass({ latencyHint: 'interactive' }); 
      
      try {
        if (inputCtx.state === 'suspended') await inputCtx.resume();
        if (outputCtx.state === 'suspended') await outputCtx.resume();
      } catch (e) {
        console.warn("AudioContext resume failed, user interaction may be required.");
      }

      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      // Output Node
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      // 2. Get Microphone Stream
      addLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          } 
      });

      // 3. Setup Mixed Recording
      const recordingDest = outputCtx.createMediaStreamDestination();
      recordingDestRef.current = recordingDest;

      outputNode.connect(recordingDest);

      const micSourceForRecord = outputCtx.createMediaStreamSource(stream);
      micSourceForRecord.connect(recordingDest);
      micSourceRef.current = micSourceForRecord;

      // Initialize Recorder with Browser-Supported MimeType
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      let recorder: MediaRecorder;
      try {
         recorder = new MediaRecorder(recordingDest.stream, options);
      } catch (e) {
         console.error("MediaRecorder creation failed with options, trying default", e);
         recorder = new MediaRecorder(recordingDest.stream);
      }
      
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
        }
      };
      
      // Start with timeslice to ensure data isn't lost on crash
      recorder.start(500); 
      
      startTimeRef.current = Date.now();
      audioEpochRef.current = 0;

      // 4. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey });

      // 5. Connect to Live API
      addLog(`Connecting to Agent: ${testAgent?.name || 'Default'}...`);
      
      const agentName = testAgent?.name || 'Sara';
      const baseInstruction = testAgent ? testAgent.instructions : KREDMINT_SYSTEM_PROMPT;
      let systemInstruction = `You are ${agentName}.\n\n${baseInstruction}`;
      systemInstruction += `\n\nIDENTITY RULE: Your name is "${agentName}". If asked for your name, you MUST answer "${agentName}".`;
      
      if (testAgent?.initialMessage) {
        systemInstruction += `\n\nStart the conversation by saying exactly: "${testAgent.initialMessage}"`;
      }

      const voiceName = testAgent ? getGeminiVoiceName(testAgent.voiceId) : 'Kore';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addLog('Connection Established.');
            setStatus('Live');
            setIsConnected(true);

            // Input Processing
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return; 
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Volume Viz
              let sum = 0;
              for(let i=0; i<inputData.length; i+=8) sum += Math.abs(inputData[i]);
              const avg = sum / (inputData.length / 8);
              setCurrentVolume(Math.min(100, avg * 5000));

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            cleanupRef.current = () => {
              source.disconnect();
              scriptProcessor.disconnect();
              stream.getTracks().forEach(t => t.stop());
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
             const serverContent = msg.serverContent;

             if (serverContent?.interrupted) {
              addLog('Model interrupted.');
              audioEpochRef.current += 1;
              sourcesRef.current.forEach(s => {
                  try { s.stop(); s.disconnect(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0; 
              return; 
            }

             if (serverContent?.modelTurn?.parts) {
                const currentEpoch = audioEpochRef.current;
                for (const part of serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        const base64Audio = part.inlineData.data;
                        if (outputCtx && outputNode) {
                            if (currentEpoch !== audioEpochRef.current) continue;
                            try {
                                const audioBuffer = await decodeAudioData(
                                    decode(base64Audio),
                                    outputCtx,
                                    24000, 
                                    1
                                );
                                if (currentEpoch !== audioEpochRef.current) return;
                                const source = outputCtx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNode);
                                const now = outputCtx.currentTime;
                                const startTime = Math.max(nextStartTimeRef.current, now);
                                source.start(startTime);
                                nextStartTimeRef.current = startTime + audioBuffer.duration;
                                sourcesRef.current.add(source);
                                source.onended = () => sourcesRef.current.delete(source);
                            } catch (e) {
                                console.error("Error decoding audio:", e);
                            }
                        }
                    }
                }
             }

            const inputTranscript = serverContent?.inputTranscription?.text;
            if (inputTranscript) {
               currentTurnInputRef.current += inputTranscript;
            }

            const outputTranscript = serverContent?.outputTranscription?.text;
            if (outputTranscript) {
                currentTurnOutputRef.current += outputTranscript;
            }

            if (serverContent?.turnComplete) {
                if (currentTurnInputRef.current.trim()) {
                    addConversationLog('User', currentTurnInputRef.current.trim());
                    currentTurnInputRef.current = '';
                }
                if (currentTurnOutputRef.current.trim()) {
                    addConversationLog('Agent', currentTurnOutputRef.current.trim());
                    currentTurnOutputRef.current = '';
                }
            }
          },
          onclose: (e) => {
            if (!isDisconnectingRef.current) {
                addLog(`Session closed by server. Code: ${e.code}`);
                handleDisconnect(false);
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live API Error:", err);
            const message = err.message || 'Network error';
            addLog(`Error: ${message}`);
            setStatus('Error');
            handleDisconnect(false);
            if (message.includes('401') || message.includes('403') || message.includes('API key')) {
                 setNeedsApiKey(true);
            }
          }
        },
        config: {
            responseModalities: [Modality.AUDIO], 
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction: systemInstruction, // Using string format (Production Safe)
            inputAudioTranscription: {}, 
            outputAudioTranscription: {} 
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error: any) {
      console.error(error);
      addLog(`Failed to start: ${error.message}`);
      setStatus('Error');
      handleDisconnect(false);
      if (error.message && (error.message.includes('API key') || error.message.includes('401'))) {
          setNeedsApiKey(true);
      }
    }
  };

  const handleDisconnect = async (clearAllLogs: boolean = false) => {
    // Prevent re-entry if already disconnecting
    if (isDisconnectingRef.current) return;
    isDisconnectingRef.current = true;

    // 1. Capture any partial transcripts immediately
    if (currentTurnInputRef.current.trim()) {
        conversationHistoryRef.current.push(`User: ${currentTurnInputRef.current.trim()}`);
    }
    if (currentTurnOutputRef.current.trim()) {
        conversationHistoryRef.current.push(`Agent: ${currentTurnOutputRef.current.trim()}`);
    }

    // 2. Stop Recorder & Save
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        // Give the recorder a moment to fire 'ondataavailable'
        await new Promise(resolve => setTimeout(resolve, 300)); 
      } catch (e) {
          console.warn("Error stopping recorder", e);
      }

      const saveSessionData = async () => {
        if (recordedChunksRef.current.length === 0) return;

        // Detect mime type used
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;

        const sessionTranscript = conversationHistoryRef.current.join('\n');

        // Only save if there was actual interaction
        if (durationSec > 2 || sessionTranscript.length > 5) {
            let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
            const apiKey = process.env.API_KEY;

            // Attempt Sentiment Analysis
            if (apiKey && sessionTranscript.length > 20) {
               addLog('Saving call details...');
               try {
                  const ai = new GoogleGenAI({ apiKey });
                  const response = await ai.models.generateContent({
                      model: 'gemini-2.5-flash',
                      contents: `Analyze sentiment of User:
                      Transcript: ${sessionTranscript.substring(0, 2000)}
                      Return ONLY: Positive, Neutral, or Negative.`,
                  });
                  const text = response.text?.trim().toLowerCase();
                  if (text?.includes('positive')) sentiment = 'Positive';
                  else if (text?.includes('negative')) sentiment = 'Negative';
               } catch (e) {
                   console.warn("Sentiment analysis skipped due to error");
               }
            }

            const newLog: CallLog = {
              id: `log_${Date.now()}`,
              customerName: testAgent ? `Tester (Agent: ${testAgent.name})` : 'Demo User',
              phoneNumber: 'Web Client',
              status: 'Connected',
              duration: `${minutes}m ${seconds}s`,
              timestamp: new Date().toLocaleString(),
              sentiment: sentiment, 
              agentId: testAgent?.id || 'demo_agent',
              recordingUrl: url,
              transcript: sessionTranscript || 'No transcription available.'
            };
            addCallLog(newLog);
            addLog('Call saved successfully.');
        }
        
        // Cleanup refs
        conversationHistoryRef.current = [];
        currentTurnInputRef.current = '';
        currentTurnOutputRef.current = '';
        recordedChunksRef.current = [];
      };
      
      await saveSessionData();
    }

    if (cleanupRef.current) cleanupRef.current();
    
    // Cleanup nodes
    try {
        if (micSourceRef.current) micSourceRef.current.disconnect();
        if (recordingDestRef.current) recordingDestRef.current.disconnect();
        sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
        sourcesRef.current.clear();
    } catch(e) { console.warn("Node cleanup warning", e); }

    // Cleanup Contexts
    try {
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
          await inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
          await outputAudioContextRef.current.close();
        }
    } catch(e) { console.warn("Context closure warning", e); }
    
    setIsConnected(false);
    setStatus(prev => prev === 'Error' ? 'Error' : 'Disconnected');
    
    if (clearAllLogs) {
        setLogs([]);
    }
    
    setCurrentVolume(0);
    nextStartTimeRef.current = 0;
    audioEpochRef.current = 0; 
    
    // Unlock
    isDisconnectingRef.current = false;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
             {testAgent && (
                <Link to="/agents" className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded-full">
                  <ArrowLeft size={24} />
                </Link>
             )}
             <h1 className="text-2xl font-bold text-slate-900">
               {testAgent ? `Test Mode: ${testAgent.name}` : 'Live Agent Demo'}
             </h1>
          </div>
          <p className="text-slate-500 mt-1">
            {testAgent 
              ? `Simulation mode. Voice: ${getGeminiVoiceName(testAgent.voiceId)}. Call logs will be saved as "Tester".`
              : 'Interact with the Kredmint AI (Gemini Native Audio) in real-time.'}
          </p>
        </div>
        
        {testAgent && (
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <User size={16} className="mr-2" />
            Config: {testAgent.voiceId}
          </div>
        )}
      </div>

      <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
        {/* Status Bar */}
        <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
           <div className="flex items-center space-x-3">
             <div className={`w-3 h-3 rounded-full ${status === 'Live' ? 'bg-green-500 animate-pulse' : status === 'Error' ? 'bg-red-500' : 'bg-slate-500'}`} />
             <span className="text-white font-mono text-sm uppercase tracking-wider">{status}</span>
           </div>
           {status === 'Live' && (
             <div className="flex items-center space-x-4">
                <div className="flex items-center text-red-400 animate-pulse">
                   <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                   <span className="text-xs uppercase font-bold tracking-wider">REC</span>
                </div>
                <span className="text-slate-400 text-xs flex items-center">
                  <Volume2 size={14} className="mr-1" /> PCM 24kHz
                </span>
             </div>
           )}
        </div>

        {/* Visualization Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-8">
            {/* Ambient Circle */}
            <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-300
              ${status === 'Live' ? 'border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.3)]' : 'border-slate-700'}`}>
                {status === 'Live' ? (
                   <div 
                    className="w-48 h-48 bg-indigo-600 rounded-full transition-all duration-75 ease-out opacity-80"
                    style={{ transform: `scale(${1 + currentVolume / 100})` }}
                   />
                ) : (
                  <div className="text-slate-600">
                    <Power size={64} />
                  </div>
                )}
            </div>
            
            <div className="mt-8 text-center max-w-md">
                 <p className="text-slate-400 text-lg font-light">
                  {status === 'Disconnected' && "Click 'Connect' to start testing."}
                  {status === 'Connecting' && "Establishing secure voice channel..."}
                  {status === 'Live' && (testAgent?.initialMessage ? "Bot is starting..." : "Listening... Speak naturally.")}
                  {status === 'Error' && "Connection failed."}
                </p>
                {status === 'Error' && needsApiKey && (
                    <p className="text-amber-500 text-sm mt-2 flex items-center justify-center">
                        <AlertCircle size={14} className="mr-1" /> API Key required. Please click connect again to select one.
                    </p>
                )}
            </div>
        </div>

        {/* Logs Overlay */}
        <div className="absolute top-16 right-4 w-80 bg-black/60 backdrop-blur-sm rounded-lg p-3 font-mono text-xs text-green-400 border border-green-900/30 pointer-events-auto max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-2 border-b border-green-900/30 pb-1">
                <div className="flex items-center">
                    <Terminal size={12} className="mr-2" /> Live Transcripts
                </div>
                <button 
                    onClick={() => setLogs([])} 
                    className="flex items-center text-slate-400 hover:text-red-400 px-1 rounded transition-colors"
                    title="Clear Logs"
                >
                    <Trash2 size={10} className="mr-1"/> Clear
                </button>
            </div>
            <div className="space-y-1">
              {logs.map((log, i) => (
                  <div key={i} className={`opacity-90 break-words ${log.includes('---') ? 'text-slate-500 py-2 text-center italic' : ''}`}>{log.includes('---') ? log : `> ${log}`}</div>
              ))}
            </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 p-6 flex justify-center space-x-6 border-t border-slate-700">
          {!isConnected ? (
             <button 
               onClick={startSession}
               disabled={status === 'Connecting'}
               className={`text-white px-8 py-4 rounded-full font-bold shadow-lg transform transition active:scale-95 flex items-center 
                 ${needsApiKey ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
                 ${status === 'Connecting' ? 'opacity-50 cursor-not-allowed' : ''}
               `}
             >
               {needsApiKey ? (
                   <>
                     <Key size={20} className="mr-2" /> Select API Key & Connect
                   </>
               ) : (
                   <>
                    <Power size={20} className="mr-2" /> {status === 'Error' ? 'Retry Connection' : `Connect ${testAgent ? 'Agent' : 'Demo'}`}
                   </>
               )}
             </button>
          ) : (
             <>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <button 
                   onClick={() => handleDisconnect(false)}
                   className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold shadow-lg flex items-center"
                >
                  <Power size={20} className="mr-2" /> End Call
                </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveAgent;