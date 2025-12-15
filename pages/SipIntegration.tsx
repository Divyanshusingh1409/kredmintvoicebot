import React, { useState, useEffect } from 'react';
import { PhoneForwarded, Save, ShieldCheck, Server, Globe, Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SipConfig } from '../types';
import { getSipConfig, saveSipConfig } from '../utils/storage';

const SipIntegration: React.FC = () => {
  const [config, setConfig] = useState<SipConfig>({
    domain: '',
    username: '',
    password: '',
    port: '5060',
    protocol: 'UDP'
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    const saved = getSipConfig();
    if (saved) {
      setConfig(saved);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
    setStatus('idle');
    setTestStatus('idle');
  };

  const handleSave = () => {
    setStatus('saving');
    setTimeout(() => {
      saveSipConfig(config);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    }, 800);
  };

  const handleTestConnection = () => {
    if (!config.domain || !config.username) {
        alert("Please enter Domain and Username first.");
        return;
    }
    setTestStatus('testing');
    
    // Simulate SIP REGISTER packet
    setTimeout(() => {
        // Simple mock validation
        if (config.domain.includes('.') && config.username.length > 0) {
            setTestStatus('success');
        } else {
            setTestStatus('failed');
        }
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SIP Integration</h1>
        <p className="text-slate-500">Configure your VOIP provider credentials for outbound calling.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center bg-indigo-50/50">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg mr-4">
            <PhoneForwarded size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">SIP Server Details</h3>
            <p className="text-sm text-slate-500">Enter the SIP Trunking details provided by your carrier (e.g., Twilio, Plivo, Asterisk).</p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                <Globe size={16} className="mr-2 text-slate-400" />
                SIP Domain / Host IP
              </label>
              <input
                type="text"
                name="domain"
                value={config.domain}
                onChange={handleChange}
                placeholder="sip.provider.com or 192.168.1.1"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                  <Server size={16} className="mr-2 text-slate-400" />
                  Port
                </label>
                <input
                  type="text"
                  name="port"
                  value={config.port}
                  onChange={handleChange}
                  placeholder="5060"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                  Protocol
                </label>
                <select
                  name="protocol"
                  value={config.protocol}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="UDP">UDP</option>
                  <option value="TCP">TCP</option>
                  <option value="TLS">TLS (Secure)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                <ShieldCheck size={16} className="mr-2 text-slate-400" />
                Username / Auth ID
              </label>
              <input
                type="text"
                name="username"
                value={config.username}
                onChange={handleChange}
                placeholder="Your SIP Username"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={config.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center">
             <button
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !config.domain}
                className="text-slate-600 hover:text-indigo-600 font-medium text-sm flex items-center px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-indigo-50 transition-colors"
             >
                {testStatus === 'testing' ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                    <Activity size={16} className="mr-2" />
                )}
                Test Connectivity
             </button>
             
             {testStatus === 'success' && (
                 <span className="ml-3 text-sm text-green-600 font-medium flex items-center">
                     <CheckCircle2 size={16} className="mr-1" /> Connected
                 </span>
             )}
             {testStatus === 'failed' && (
                 <span className="ml-3 text-sm text-red-600 font-medium flex items-center">
                     <AlertCircle size={16} className="mr-1" /> Connection Failed
                 </span>
             )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className={`flex items-center px-6 py-2 rounded-lg font-medium text-white transition-all
              ${status === 'saved' ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}
            `}
          >
            {status === 'saving' ? (
              <>Saving...</>
            ) : status === 'saved' ? (
              <>Saved Successfully</>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SipIntegration;