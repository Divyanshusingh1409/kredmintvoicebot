import React, { useState, useEffect } from 'react';
import { Key, Trash2, Copy, RefreshCw, Plus, Eye, EyeOff, Check, X, AlertTriangle } from 'lucide-react';
import { ApiKey } from '../types';

const API_KEYS_STORAGE_KEY = 'kredmint_api_keys';

const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (stored) {
      setKeys(JSON.parse(stored));
    } else {
        const initial: ApiKey[] = [{
            id: '1',
            name: 'Default Development Key',
            key: 'km_live_Ag7d8f9s8d7f9s8d7f9s8d7f',
            createdAt: new Date().toLocaleDateString(),
            lastUsed: 'Never'
        }];
        setKeys(initial);
        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(initial));
    }
  }, []);

  const saveKeys = (newKeys: ApiKey[]) => {
      setKeys(newKeys);
      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
  };

  const generateKeyString = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'km_live_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateKey = () => {
    const k = generateKeyString();
    setGeneratedKey(k);
    if (!newKeyName) setNewKeyName(`Key #${keys.length + 1}`);
  };

  const confirmCreate = () => {
      const newKey: ApiKey = {
          id: Date.now().toString(),
          name: newKeyName,
          key: generatedKey,
          createdAt: new Date().toLocaleDateString(),
          lastUsed: 'Never'
      };
      saveKeys([...keys, newKey]);
      closeModal();
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setNewKeyName('');
      setGeneratedKey('');
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Are you sure you want to revoke this API key? Applications using it will stop working immediately.')) {
          saveKeys(keys.filter(k => k.id !== id));
      }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleShowKey = (id: string) => {
      setShowKey(prev => ({...prev, [id]: !prev[id]}));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-500">Manage access tokens for the Kredmint API.</p>
        </div>
        <button 
          onClick={() => { handleCreateKey(); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Generate New Key
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-900 text-xs uppercase font-semibold text-white">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">API Key</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Last Used</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {keys.map((apiKey) => (
              <tr key={apiKey.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{apiKey.name}</td>
                <td className="px-6 py-4 font-mono">
                    <div className="flex items-center space-x-2">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                            {showKey[apiKey.id] ? apiKey.key : `${apiKey.key.substring(0, 8)}...${apiKey.key.substring(apiKey.key.length - 4)}`}
                        </span>
                        <button onClick={() => toggleShowKey(apiKey.id)} className="text-slate-400 hover:text-indigo-600">
                            {showKey[apiKey.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </td>
                <td className="px-6 py-4">{apiKey.createdAt}</td>
                <td className="px-6 py-4 text-slate-500">{apiKey.lastUsed}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Copy Key"
                    >
                      {copiedId === apiKey.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button 
                      onClick={() => handleDelete(apiKey.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke Key"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">No API keys found.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

       {/* Create Key Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Generate New API Key</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Key Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Server 1"
                  />
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Generated Secret</label>
                  <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg font-mono text-sm break-all text-slate-700">
                          {generatedKey}
                      </div>
                      <button 
                        onClick={() => handleCreateKey()}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                        title="Regenerate"
                      >
                          <RefreshCw size={18} />
                      </button>
                  </div>
                  <div className="mt-2 flex items-start text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      <AlertTriangle size={14} className="mr-1 mt-0.5 flex-shrink-0" />
                      <span>Make sure to copy this key now. You won't be able to see the full key again once you navigate away (in a real app).</span>
                  </div>
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                onClick={closeModal}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmCreate}
                disabled={!newKeyName}
                className="px-4 py-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeys;