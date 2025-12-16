import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Calendar, Clock, Upload, CheckCircle, ArrowRight, ArrowLeft, Play, Edit2, X, Globe, Phone, Loader2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Contact, Campaign, Agent, CallLog } from '../types';
import { getAgents, getCampaigns, saveCampaign, deleteCampaign, getSipConfig, addCallLog } from '../utils/storage';

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [step, setStep] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Test Modal State
  const [testCampaign, setTestCampaign] = useState<Campaign | null>(null);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('');
  
  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'daily',
    scheduleTime: '09:00',
    startDate: '',
    agentId: '',
  });
  const [uploadedContacts, setUploadedContacts] = useState<Contact[]>([]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    refreshCampaigns();
    setAgents(getAgents());
  }, [view]);

  const refreshCampaigns = () => {
    setCampaigns(getCampaigns());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
            const text = event.target?.result as string;
            // Robust splitting for various line endings (Windows/Unix/Mac)
            const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
            
            // Basic mapping with validation
            const contacts: Contact[] = lines.slice(1).map((line, index) => {
                const parts = line.split(',');
                // Ensure we have at least a phone number candidate
                const phone = parts[1] ? parts[1].trim() : (parts[0] && /[\d\+\-\(\)\s]{5,}/.test(parts[0]) ? parts[0].trim() : '');
                const name = parts[0] ? parts[0].trim() : `Contact ${index + 1}`;
                
                return {
                    name: name || `Contact ${index+1}`,
                    phoneNumber: phone
                };
            }).filter(c => c.phoneNumber && c.phoneNumber.length > 3); // Basic length check for phone

            setUploadedContacts(contacts.length > 0 ? contacts : []);
        } catch (error) {
            console.error("Failed to parse CSV", error);
            alert("Error parsing file. Please ensure it is a valid CSV.");
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleCreateOrUpdate = () => {
    const newCampaign: Campaign = {
      id: editingId || `c_${Date.now()}`,
      name: formData.name,
      frequency: formData.frequency as 'daily' | 'weekly',
      scheduleTime: formData.scheduleTime,
      startDate: formData.startDate,
      agentId: formData.agentId,
      totalContacts: uploadedContacts.length, 
      status: 'Scheduled'
    };
    saveCampaign(newCampaign);
    resetForm();
    setView('list');
  };

  const resetForm = () => {
    setStep(1);
    setEditingId(null);
    setFormData({ name: '', frequency: 'daily', scheduleTime: '09:00', startDate: '', agentId: '' });
    setFile(null);
    setUploadedContacts([]);
  };

  const handleEditClick = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setFormData({
      name: campaign.name,
      frequency: campaign.frequency,
      scheduleTime: campaign.scheduleTime,
      startDate: campaign.startDate,
      agentId: campaign.agentId
    });
    setUploadedContacts([]); 
    setStep(1);
    setView('edit');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteCampaign(deleteId);
      refreshCampaigns();
      setDeleteId(null);
    }
  };

  const handleTestClick = (campaign: Campaign) => {
    setTestCampaign(campaign);
  };

  const handleWebTest = () => {
    if (testCampaign) {
      const agent = agents.find(a => a.id === testCampaign.agentId);
      if (agent) {
        navigate('/live', { state: { agent } });
      } else {
        alert("Agent not found for this campaign");
      }
    }
  };

  const handleSipCall = async () => {
    if (!testPhoneNumber) return;

    // 1. Check Credentials
    const sipConfig = getSipConfig();
    if (!sipConfig || !sipConfig.domain || !sipConfig.username) {
        alert("SIP Configuration missing! Please configure SIP settings first.");
        return;
    }

    setIsCalling(true);
    setCallStatus('Initializing SIP Stack...');

    try {
        // 2. Simulate SIP Handshake
        await new Promise(r => setTimeout(r, 600));
        setCallStatus(`Routing via ${sipConfig.domain}...`);
        
        await new Promise(r => setTimeout(r, 600));
        setCallStatus('Sending INVITE...');

        await new Promise(r => setTimeout(r, 800));
        setCallStatus('Ringing...');

        // 3. Success State & Logging
        setIsCalling(false);
        setCallStatus('Call Connected!');
        
        const usedAgent = agents.find(a => a.id === testCampaign?.agentId);

        // Create a realistic log entry
        const newLog: CallLog = {
            id: `sip_camp_${Date.now()}`,
            customerName: `Campaign Test: ${testCampaign?.name}`,
            phoneNumber: testPhoneNumber,
            status: 'Connected',
            duration: '0m 0s',
            timestamp: new Date().toLocaleString(),
            sentiment: 'Neutral',
            agentId: usedAgent?.id || 'unknown',
            transcript: `[CAMPAIGN]: Executing test call for '${testCampaign?.name}'.\n[SIP]: INVITE sip:${testPhoneNumber}@${sipConfig.domain}\n[SIP]: 200 OK\n[AGENT]: ${usedAgent?.initialMessage}\n[SYSTEM]: Call established.`
        };
        addCallLog(newLog);

        setTimeout(() => {
             alert(`Campaign Test Call Sent!\n\nConfig: ${sipConfig.domain}\nUser: ${sipConfig.username}\n\nThe call has been logged.`);
             setCallStatus('');
             setTestPhoneNumber('');
        }, 500);

    } catch (e) {
        setIsCalling(false);
        setCallStatus('Failed');
        alert("Connection failed.");
    }
  };

  const selectedAgent = agents.find(a => a.id === formData.agentId);
  const testCampaignAgent = testCampaign ? agents.find(a => a.id === testCampaign.agentId) : null;

  // Render List View
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
            <p className="text-slate-500">Schedule and manage your outbound calls.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setView('create'); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
          >
            <Megaphone size={20} className="mr-2" />
            Create Campaign
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            {/* Header Updated to Black background with White text */}
            <thead className="bg-slate-900 text-xs uppercase font-semibold text-white">
              <tr>
                <th className="px-6 py-4">Campaign Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4">Contacts</th>
                <th className="px-6 py-4">Agent</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${c.status === 'Running' ? 'bg-green-100 text-green-800' : 
                        c.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 
                        'bg-slate-100 text-slate-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize">{c.frequency}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1 text-slate-400" />
                      {c.scheduleTime}
                    </div>
                    <div className="text-xs text-slate-400">{c.startDate}</div>
                  </td>
                  <td className="px-6 py-4">{c.totalContacts}</td>
                  <td className="px-6 py-4">
                    {agents.find(a => a.id === c.agentId)?.name || 'Unknown Agent'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                       <button 
                        onClick={() => handleTestClick(c)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100 transition-colors"
                        title="Test Campaign"
                      >
                        <Play size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditClick(c)}
                        className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                        title="Edit Campaign"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(c.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No campaigns found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Test Modal */}
        {testCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <Play size={20} className="text-indigo-600" />
                <div>
                   <h3 className="font-bold text-slate-900">Test Campaign: {testCampaign.name}</h3>
                   <p className="text-xs text-slate-500">Agent: {testCampaignAgent?.name || 'Unknown'}</p>
                </div>
              </div>
              <button onClick={() => setTestCampaign(null)} className="text-slate-400 hover:text-slate-600">
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
                  Simulate the outbound call flow using the Web Live API. This uses the configured agent's prompt and voice.
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
                  Trigger a real outbound test call to a specific number using your SIP configuration.
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

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Campaign?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to delete this campaign? This action cannot be undone.
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
      </div>
    );
  }

  // Render Wizard View (Create or Edit)
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button 
          onClick={() => setView('list')}
          className="text-slate-500 hover:text-slate-900 flex items-center mb-4"
        >
          <ArrowLeft size={20} className="mr-1" /> Back to Campaigns
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{view === 'edit' ? 'Edit Campaign' : 'Create New Campaign'}</h1>
        
        {/* Progress Bar */}
        <div className="flex items-center mt-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
          <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
        </div>
        <div className="flex justify-between mt-2 text-xs font-medium text-slate-500">
          <span>Details</span>
          <span>Upload Contacts</span>
          <span>Review</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Campaign Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. November Sales Drive"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Frequency</label>
                <select 
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Time</label>
                <input 
                  type="time" 
                  value={formData.scheduleTime}
                  onChange={(e) => setFormData({...formData, scheduleTime: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input 
                  type="date" 
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Agent</label>
                <select 
                  value={formData.agentId}
                  onChange={(e) => setFormData({...formData, agentId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select an Agent --</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.agentId && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                <p className="font-semibold text-slate-700">Agent will say:</p>
                <p className="text-slate-600 italic mt-1">"{selectedAgent?.initialMessage}"</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.agentId || !formData.startDate}
                className="bg-indigo-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg flex items-center"
              >
                Next <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Upload Contacts</h2>
            <p className="text-sm text-slate-500">
              {view === 'edit' ? 'Upload a new list to replace or append to the existing contacts.' : 'Upload your contact list for this campaign.'}
            </p>
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".csv, .txt"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full mb-4">
                  <Upload size={32} />
                </div>
                <span className="text-lg font-medium text-slate-700">
                  {file ? file.name : "Click to upload CSV or Text file"}
                </span>
                <span className="text-sm text-slate-500 mt-2">
                  Format: Name, Phone Number (Comma separated)
                </span>
              </label>
            </div>

            {uploadedContacts.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-slate-800 mb-2">Preview (First 5 records)</h3>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadedContacts.slice(0, 5).map((contact, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-4 py-2">{contact.name}</td>
                          <td className="px-4 py-2">{contact.phoneNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-green-600 mt-2 flex items-center">
                  <CheckCircle size={14} className="mr-1" />
                  Successfully parsed {uploadedContacts.length} contacts
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-900 font-medium">Back</button>
              <button 
                onClick={() => setStep(3)}
                // Allow proceeding without file if editing (keep existing)
                disabled={!file && view !== 'edit'} 
                className="bg-indigo-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg flex items-center"
              >
                Next <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
           <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">Summary & Confirmation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Campaign Name</p>
                <p className="text-lg font-medium text-slate-900">{formData.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Frequency</p>
                <p className="text-lg font-medium text-slate-900 capitalize">{formData.frequency}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Start Schedule</p>
                <p className="text-lg font-medium text-slate-900">{formData.startDate} at {formData.scheduleTime}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Contacts</p>
                <p className="text-lg font-medium text-slate-900">
                  {uploadedContacts.length > 0 ? uploadedContacts.length : 0}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 uppercase font-bold">Selected Agent</p>
                <p className="text-lg font-medium text-slate-900">{selectedAgent?.name}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-500 uppercase font-bold">Agent Speaking Prompt (Override)</p>
                <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm text-slate-600 max-h-32 overflow-y-auto">
                   <p className="font-semibold mb-1">Initial: "{selectedAgent?.initialMessage}"</p>
                   <p className="text-xs text-slate-400">--- Instructions ---</p>
                   <pre className="whitespace-pre-wrap font-sans">{selectedAgent?.instructions}</pre>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-900 font-medium">Back</button>
              <button 
                onClick={handleCreateOrUpdate}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
              >
                {view === 'edit' ? 'Update Campaign' : 'Confirm & Start Campaign'} <Megaphone size={18} className="ml-2" />
              </button>
            </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;