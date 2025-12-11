import React, { useState } from 'react';
import { Key, Trash2, Copy, RefreshCw, Plus, Eye, EyeOff } from 'lucide-react';
import { ApiKey } from '../types';

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production App', key: 'sk-proj-....................AB12', createdAt: '2023-09-01', lastUsed: '2 mins ago' },
  { id: '2', name: 'Dev Test', key: 'sk-proj-....................CD34', createdAt: '2023-10-15', lastUsed: '3 days ago' },
];

const ApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this API Key? Integration will stop working.')) {
      setKeys(keys.filter(k => k.id !== id));
    }
  };

  const handleCreate = () => {
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: `New Key ${keys.length + 1}`,
      key: `sk-proj-....................${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never'
    };
    setKeys([...keys, newKey]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Key Management</h1>
          <p className="text-slate-500">Manage keys for external integrations.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm"
        >
          <Plus size={20} className="mr-2" />
          Generate New Key
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Secret Key</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Last Used</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {keys.map((key) => (
              <tr key={key.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{key.name}</td>
                <td className="px-6 py-4 font-mono text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span>{showKeyId === key.id ? 'sk-proj-83928492019382901' : key.key}</span>
                    <button onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)} className="text-slate-400 hover:text-slate-600">
                      {showKeyId === key.id ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">{key.createdAt}</td>
                <td className="px-6 py-4">{key.lastUsed}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Copy size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <RefreshCw size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(key.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No API keys found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiKeys;