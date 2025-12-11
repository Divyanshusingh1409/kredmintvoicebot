import React, { useRef, useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Mic, MicOff, Volume2, Power, Terminal, ArrowLeft, User, Key } from 'lucide-react';
import { KREDMINT_SYSTEM_PROMPT } from '../constants';
import { addCallLog } from '../utils/storage';
import { CallLog, Agent } from '../types';

// Helper for Blob creation
function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
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
  const dataInt16 = new Int16Array(data.buffer);
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

// Voice Mapping Logic
const getGeminiVoiceName = (voiceId: string) => {
  switch(voiceId) {
    case 'female_1': return 'Aoede';
    case 'female_2': return 'Fenrir';
    case 'male_1': return 'Charon';
    default: return 'Puck';
  }
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
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  
  // Session handling
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Check for API Key on Mount
  useEffect(() => {
    const checkApiKey = async () => {
        const win = window as any;
        if (win.aistudio && win.aistudio.hasSelectedApiKey) {
            const hasKey = await win.aistudio.hasSelectedApiKey();
            setNeedsApiKey(!hasKey);
        }
    };
    checkApiKey();
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-4), msg]);
  };

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
        await win.aistudio.openSelectKey();
        setNeedsApiKey(false);
    }
  };

  const startSession = async () => {
    try {
      if (needsApiKey) {
          await handleSelectKey();
      }

      setStatus('Connecting');
      addLog('Initializing audio contexts...');

      // 1. Initialize Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);
      outputNodeRef.current = outputNode;

      // 2. Get Microphone Stream
      addLog('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize Recorder on the Mic Stream
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.start();
      startTimeRef.current = Date.now();

      // 3. Initialize Gemini Client
      // Create a new instance right before making the call to ensure it uses the latest key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      // 4. Connect to Live API
      addLog(`Connecting to Agent: ${testAgent?.name || 'Default'}...`);
      
      // Configure System Instruction: Prepend agent instruction + Initial Message directive
      let systemInstruction = testAgent?.instructions || KREDMINT_SYSTEM_PROMPT;
      if (testAgent?.initialMessage) {
        systemInstruction += `\n\nIMPORTANT: Start the conversation by saying exactly this: "${testAgent.initialMessage}"`;
      }

      const voiceName = testAgent ? getGeminiVoiceName(testAgent.voiceId) : 'Kore';

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            addLog('Connection Established.');
            setStatus('Live');
            setIsConnected(true);

            // Setup Input Stream Processing
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return; // Don't send data if muted locally
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume meter viz
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += Math.abs(inputData[i]);
              setCurrentVolume(Math.min(100, (sum / inputData.length) * 5000));

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);

            // Save cleanup closure
            cleanupRef.current = () => {
              source.disconnect();
              scriptProcessor.disconnect();
              stream.getTracks().forEach(t => t.stop());
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtx && outputNode) {
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputCtx,
                24000,
                1
              );
              
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              
              // Simple audio scheduling
              const now = outputCtx.currentTime;
              const startTime = Math.max(nextStartTimeRef.current, now);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Interruptions
            if (msg.serverContent?.interrupted) {
              addLog('Model interrupted by user.');
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            addLog('Session closed.');
            handleDisconnect();
          },
          onerror: (err) => {
            console.error(err);
            addLog(`Error: ${err.message || 'Network error'}`);
            setStatus('Error');
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            },
            systemInstruction: systemInstruction
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error: any) {
      console.error(error);
      addLog(`Failed to start: ${error.message}`);
      setStatus('Error');
      // If error is related to API Key, prompt again
      if (error.message && (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403'))) {
          setNeedsApiKey(true);
      }
    }
  };

  const handleDisconnect = () => {
    // 1. Stop Recorder & Save Log
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;

        // Capture Logs as Transcript
        const sessionTranscript = logs.join('\n');

        // Save Log
        const newLog: CallLog = {
          id: `log_${Date.now()}`,
          customerName: testAgent ? `Tester (Agent: ${testAgent.name})` : 'Demo User',
          phoneNumber: 'Web Client',
          status: 'Connected',
          duration: `${minutes}m ${seconds}s`,
          timestamp: new Date().toLocaleString(),
          sentiment: 'Positive', 
          agentId: testAgent?.id || 'demo_agent',
          recordingUrl: url,
          transcript: sessionTranscript
        };
        addLog('Call saved to Dashboard.');
        addCallLog(newLog);
      };
    }

    if (cleanupRef.current) cleanupRef.current();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    
    setIsConnected(false);
    setStatus('Disconnected');
    setLogs([]);
    setCurrentVolume(0);
    nextStartTimeRef.current = 0;
    sourcesRef.current.clear();
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
                   <span className="text-xs uppercase font-bold tracking-wider">Recording</span>
                </div>
                <span className="text-slate-400 text-xs flex items-center">
                  <Volume2 size={14} className="mr-1" /> PCM 24kHz Out / 16kHz In
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
            
            <p className="mt-8 text-slate-400 text-lg font-light text-center max-w-md">
              {status === 'Disconnected' && "Click 'Connect' to start talking."}
              {status === 'Connecting' && "Establishing secure voice channel..."}
              {status === 'Live' && (testAgent?.initialMessage ? "Bot is starting..." : "Listening... Speak naturally.")}
              {status === 'Error' && "Connection failed. Please check network/API Key."}
            </p>
        </div>

        {/* Logs Overlay */}
        <div className="absolute top-16 right-4 w-64 bg-black/50 backdrop-blur-sm rounded-lg p-3 font-mono text-xs text-green-400 border border-green-900/30 pointer-events-none">
            <div className="flex items-center mb-2 border-b border-green-900/30 pb-1">
                <Terminal size={12} className="mr-2" /> System Logs
            </div>
            {logs.map((log, i) => (
                <div key={i} className="mb-1 opacity-80">{`> ${log}`}</div>
            ))}
        </div>

        {/* Controls */}
        <div className="bg-slate-800 p-6 flex justify-center space-x-6 border-t border-slate-700">
          {!isConnected ? (
             <button 
               onClick={startSession}
               className={`text-white px-8 py-4 rounded-full font-bold shadow-lg transform transition active:scale-95 flex items-center ${needsApiKey ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
             >
               {needsApiKey ? (
                   <>
                     <Key size={20} className="mr-2" /> Select API Key & Connect
                   </>
               ) : (
                   <>
                    <Power size={20} className="mr-2" /> Connect {testAgent ? 'Agent' : 'Demo'}
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
                   onClick={handleDisconnect}
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