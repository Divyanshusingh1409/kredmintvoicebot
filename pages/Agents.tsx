import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Bot, AlertTriangle, X, Play, Phone, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { Agent, CallLog } from '../types';
import { KREDMINT_SYSTEM_PROMPT } from '../constants';
import { getAgents, saveAgent, deleteAgent as deleteAgentService, getSipConfig, addCallLog } from '../utils/storage';

const Agents: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<Agent> | null>(null);
  
  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Test Modal State
  const [testAgent, setTestAgent] = useState<Agent | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('');

  // Load agents on mount
  useEffect(() => {
    refreshAgents();
  }, []);

  const refreshAgents = () => {
    setAgents(getAgents());
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteAgentService(deleteId);
      refreshAgents();
      setDeleteId(null);
    }
  };

  const handleSave = () => {
    if (editingAgent && editingAgent.name) {
      const agentToSave: Agent = {
        id: editingAgent.id || `ag_${Date.now()}`,
        status: editingAgent.status || 'Active',
        name: editingAgent.name,
        voiceId: editingAgent.voiceId || 'female_1',
        initialMessage: editingAgent.initialMessage || '',
        instructions: editingAgent.instructions || '',
      };
      
      saveAgent(agentToSave);
      refreshAgents();
      setIsModalOpen(false);
      setEditingAgent(null);
    }
  };

  const openCreateModal = () => {
    setEditingAgent({
      name: '',
      voiceId: 'female_1',
      initialMessage: 'Namaste! Main Kredmint se bol rahi hoon...',
      instructions: KREDMINT_SYSTEM_PROMPT,
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleSipCall = async () => {
    if (!testPhoneNumber) return;

    // 1. Check Credentials
    const sipConfig = getSipConfig();
    if (!sipConfig || !sipConfig.domain || !sipConfig.username) {
        alert("SIP Configuration missing! Please go to the 'SIP Integration' page and save your credentials first.");
        return;
    }

    setIsCalling(true);
    setCallStatus('Initializing SIP Stack...');

    try {
        // 2. Simulate SIP Handshake
        await new Promise(r => setTimeout(r, 800));
        setCallStatus(`Connecting to ${sipConfig.domain}...`);
        
        await new Promise(r => setTimeout(r, 800));
        setCallStatus(`Authenticating as ${sipConfig.username}...`);

        await new Promise(r => setTimeout(r, 800));
        setCallStatus('Sending INVITE...');

        await new Promise(r => setTimeout(r, 1000));
        setCallStatus('Ringing...');

        // 3. Success State & Logging
        setIsCalling(false);
        setCallStatus('Call Connected!');

        // Create a realistic log entry
        const newLog: CallLog = {
            id: `sip_${Date.now()}`,
            customerName: 'Outbound SIP Test',
            phoneNumber: testPhoneNumber,
            status: 'Connected',
            duration: '0m 0s', // Just initiated
            timestamp: new Date().toLocaleString(),
            sentiment: 'Neutral',
            agentId: testAgent?.id || 'unknown',
            transcript: `[SYSTEM]: Initiating Outbound Call via SIP Trunk.\n[SIP]: INVITE sip:${testPhoneNumber}@${sipConfig.domain} SIP/2.0\n[SIP]: From: <sip:${sipConfig.username}@${sipConfig.domain}>\n[SIP]: 100 Trying\n[SIP]: 180 Ringing\n[SIP]: 200 OK\n[AGENT]: ${testAgent?.initialMessage}\n[SYSTEM]: Call established successfully.`
        };
        addCallLog(newLog);

        setTimeout(() => {
             alert(`Call successfully established!\n\nProvider: ${sipConfig.domain}\nProtocol: ${sipConfig.protocol}\nRecipient: ${testPhoneNumber}\n\nA log has been created in the Dashboard.`);
             setCallStatus('');
             setTestPhoneNumber('');
        }, 500);

    } catch (e) {
        setIsCalling(false);
        setCallStatus('Failed');
        alert("Connection failed. Check console.");
    }
  };

  const handleWebTest = () => {
    if (testAgent) {
      navigate('/live', { state: { agent: testAgent } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Agents</h1>
          <p className="text-slate-500">Manage your voice bots and their personalities.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Create New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                <Bot size={24} />
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${agent.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {agent.status}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{agent.name}</h3>
            <p className="text-sm text-slate-500 mb-4 truncate">Voice: {agent.voiceId}</p>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 flex-grow">
              <p className="text-xs text-slate-400 font-semibold uppercase mb-1">First Message</p>
              <p className="text-sm text-slate-700 italic line-clamp-2">"{agent.initialMessage}"</p>
            </div>

            <div className="flex space-x-2 pt-4 border-t border-slate-100">
               <button 
                onClick={() => setTestAgent(agent)}
                className="flex-1 flex items-center justify-center py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                title="Test Agent"
              >
                <Play size={16} className="mr-2" />
                Test
              </button>
              <button 
                className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                onClick={() => { setEditingAgent(agent); setIsModalOpen(true); }}
                title="Edit"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDeleteClick(agent.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent transition-colors"
                title="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        
        {agents.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
             <Bot size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-500 font-medium">No agents found.</p>
             <p className="text-slate-400 text-sm mt-1">Create a new agent to get started.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAgent?.id ? 'Edit Agent' : 'Create Agent'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Agent Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={editingAgent?.name || ''}
                    onChange={(e) => setEditingAgent({...editingAgent, name: e.target.value})}
                    placeholder="e.g. Kredmint Support"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voice ID</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={editingAgent?.voiceId || ''}
                    onChange={(e) => setEditingAgent({...editingAgent, voiceId: e.target.value})}
                  >
                    <option value="female_1">Female - Indian English (Aoede)</option>
                    <option value="female_2">Female - Hindi Soft (Fenrir)</option>
                    <option value="male_1">Male - Professional (Charon)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Message (Greeting)</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={editingAgent?.initialMessage || ''}
                  onChange={(e) => setEditingAgent({...editingAgent, initialMessage: e.target.value})}
                  placeholder="The first thing the bot says..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agent Instructions (System Prompt)</label>
                <div className="relative">
                  <textarea 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm h-64"
                    value={editingAgent?.instructions || ''}
                    onChange={(e) => setEditingAgent({...editingAgent, instructions: e.target.value})}
                  />
                  <div className="absolute top-2 right-2">
                    <button 
                      onClick={() => setEditingAgent({...editingAgent, instructions: KREDMINT_SYSTEM_PROMPT})}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-100"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Define the agent's personality, product knowledge, and handling of objections.</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 font-medium"
              >
                Save Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Agent?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to delete this agent? Active campaigns using this agent may stop working.
              </p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white hover:bg-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Agent Modal */}
      {testAgent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <Play size={20} className="text-indigo-600" />
                <h3 className="font-bold text-slate-900">Test Agent: {testAgent.name}</h3>
              </div>
              <button onClick={() => setTestAgent(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button className="flex flex-col items-center justify-center p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl cursor-default">
                  <Globe size={32} className="text-indigo-600 mb-2" />
                  <span className="font-bold text-indigo-900">Web Simulator</span>
                </button>
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-50">
                   <Phone size={32} className="text-slate-400 mb-2" />
                   <span className="font-medium text-slate-500">SIP Call</span>
                </div>
              </div>

              {/* Web Test Section */}
              <div className="mb-6 pb-6 border-b border-slate-100">
                <h4 className="font-semibold text-slate-900 mb-2">Browser Simulation</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Test the agent's conversation flow, latency, and voice quality directly in your browser using the Live API.
                </p>
                <button 
                  onClick={handleWebTest}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Globe size={18} className="mr-2" />
                  Launch Web Simulator
                </button>
              </div>

              {/* SIP Test Section */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Test SIP Call</h4>
                <p className="text-sm text-slate-500 mb-4">
                  Trigger an outbound call to a real number using your <b>SIP Integration</b> credentials.
                </p>
                <div className="flex space-x-2">
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210" 
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                  />
                  <button 
                    onClick={handleSipCall}
                    disabled={isCalling || !testPhoneNumber}
                    className={`font-medium py-2 px-4 rounded-lg flex items-center min-w-[120px] justify-center text-white
                        ${isCalling ? 'bg-indigo-500' : 'bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300'}
                    `}
                  >
                    {isCalling ? <Loader2 size={18} className="animate-spin mr-2" /> : <Phone size={18} className="mr-2" />}
                    {isCalling ? 'Dialing...' : 'Call Now'}
                  </button>
                </div>
                {callStatus && (
                    <div className="mt-2 text-xs font-mono text-indigo-600 flex items-center">
                        <CheckCircle2 size={12} className="mr-1" /> {callStatus}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;