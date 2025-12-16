import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, FileText, Download, Play, MessageSquare, CheckSquare, Square, RefreshCw, Activity, ArrowUp } from 'lucide-react';
import { getCallLogs, DATA_UPDATE_EVENT } from '../utils/storage';
import { CallLog } from '../types';

const EXPORT_COLUMNS = [
  { key: 'customerName', label: 'Customer Name' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'agentId', label: 'Agent ID' },
  { key: 'status', label: 'Status' },
  { key: 'duration', label: 'Duration' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'recordingUrl', label: 'Recording Link' },
  { key: 'transcript', label: 'Transcript' },
];

const CallLogs: React.FC = () => {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<CallLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState('All');

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(EXPORT_COLUMNS.map(c => c.key));

  // Scroll State
  const [showScrollButton, setShowScrollButton] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = () => {
    const allLogs = getCallLogs();
    setLogs(allLogs);
  };

  useEffect(() => {
    fetchLogs();
    const handleUpdate = () => fetchLogs();
    window.addEventListener(DATA_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(DATA_UPDATE_EVENT, handleUpdate);
  }, []);

  useEffect(() => {
    let result = logs;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.customerName.toLowerCase().includes(q) || 
        log.phoneNumber.includes(q) ||
        log.agentId.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(log => log.status === statusFilter);
    }

    if (sentimentFilter !== 'All') {
      result = result.filter(log => log.sentiment === sentimentFilter);
    }

    setFilteredLogs(result);
  }, [logs, searchQuery, statusFilter, sentimentFilter]);

  // Handle Scroll Event
  useEffect(() => {
    const handleScroll = () => {
        if (tableContainerRef.current) {
            const { scrollTop } = tableContainerRef.current;
            setShowScrollButton(scrollTop > 200);
        }
    };

    const container = tableContainerRef.current;
    if (container) {
        container.addEventListener('scroll', handleScroll);
    }
    return () => {
        if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
      if (tableContainerRef.current) {
          tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter(c => c !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const executeCSVExport = () => {
    const headers = EXPORT_COLUMNS
      .filter(col => selectedColumns.includes(col.key))
      .map(col => `"${col.label}"`)
      .join(',');

    const rows = filteredLogs.map(log => {
      return EXPORT_COLUMNS
        .filter(col => selectedColumns.includes(col.key))
        .map(col => {
          let value = log[col.key as keyof CallLog] || '';
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kredmint_logs_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  };

  const downloadTranscript = (log: CallLog) => {
    if (!log.transcript) return;
    const blob = new Blob([log.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${log.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
          <p className="text-slate-500">Detailed history of all AI agent interactions.</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={fetchLogs}
                className="flex items-center px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium shadow-sm transition-colors"
            >
                <RefreshCw size={18} className="mr-2" />
                Refresh
            </button>
            <button 
            onClick={handleExportClick}
            className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-white hover:bg-indigo-700 font-medium shadow-sm transition-colors"
            >
            <Download size={18} className="mr-2" />
            Export CSV
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 flex-shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by customer, phone, or agent ID..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-900 text-white placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="w-full md:w-48 relative">
           <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
           <select 
             className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none bg-slate-900 text-white"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
           >
             <option value="All">All Status</option>
             <option value="Connected">Connected</option>
             <option value="Failed">Failed</option>
             <option value="No Answer">No Answer</option>
             <option value="Busy">Busy</option>
           </select>
        </div>

        <div className="w-full md:w-48 relative">
           <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
           <select 
             className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none bg-slate-900 text-white"
             value={sentimentFilter}
             onChange={(e) => setSentimentFilter(e.target.value)}
           >
             <option value="All">All Sentiments</option>
             <option value="Positive">Positive</option>
             <option value="Neutral">Neutral</option>
             <option value="Negative">Negative</option>
           </select>
        </div>
      </div>

      {/* Table Container - Uses flex-1 to fill remaining space */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 relative">
        <div 
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto flex-1 h-full scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent hover:scrollbar-thumb-indigo-400"
        >
          <table className="w-full text-left text-sm text-slate-600 relative">
            <thead className="bg-slate-900 text-xs uppercase font-semibold text-white sticky top-0 z-10 shadow-md">
              <tr>
                <th className="px-6 py-4 bg-slate-900">Customer</th>
                <th className="px-6 py-4 bg-slate-900">Agent ID</th>
                <th className="px-6 py-4 bg-slate-900">Status</th>
                <th className="px-6 py-4 bg-slate-900">Duration</th>
                <th className="px-6 py-4 bg-slate-900">Sentiment</th>
                <th className="px-6 py-4 bg-slate-900">Timestamp</th>
                <th className="px-6 py-4 bg-slate-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{log.customerName}</div>
                    <div className="text-xs text-slate-400">{log.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{log.agentId}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${log.status === 'Connected' ? 'bg-green-100 text-green-800' : 
                        log.status === 'Failed' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{log.duration}</td>
                   <td className="px-6 py-4">
                     <div 
                        className={`w-4 h-4 rounded-full ${
                            log.sentiment === 'Positive' ? 'bg-yellow-400' : 
                            log.sentiment === 'Negative' ? 'bg-red-500' : 
                            'bg-green-500'
                        }`} 
                        title={`Sentiment: ${log.sentiment}`}
                    />
                  </td>
                  <td className="px-6 py-4 text-slate-400">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium text-xs flex items-center hover:bg-indigo-50 px-2 py-1 rounded"
                    >
                       View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                 <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText size={48} className="text-slate-200 mb-4" />
                      <p className="font-medium">No logs found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center flex-shrink-0">
          <span>Showing {filteredLogs.length} entries</span>
        </div>
      </div>

      {/* Floating Scroll to Top Button */}
      <button 
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all transform duration-300 z-50 ${showScrollButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
        title="Scroll to Top"
      >
        <ArrowUp size={24} />
      </button>

      {/* Export Options Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center">
                <Download size={18} className="mr-2 text-indigo-600" /> Export CSV Configuration
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Select the columns you want to include in your CSV export.</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {EXPORT_COLUMNS.map((col) => {
                  const isSelected = selectedColumns.includes(col.key);
                  return (
                    <div 
                      key={col.key} 
                      onClick={() => toggleColumn(col.key)}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className={`mr-3 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                        {col.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3">
                 <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeCSVExport}
                  disabled={selectedColumns.length === 0}
                  className="bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center"
                >
                  <Download size={18} className="mr-2" />
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

       {/* Call Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Call Details</h3>
                <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{selectedLog.customerName}</div>
                    <div className="text-sm text-slate-500">{selectedLog.phoneNumber}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedLog.status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedLog.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-slate-500 text-xs uppercase mb-1">Duration</div>
                    <div className="font-medium">{selectedLog.duration}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-slate-500 text-xs uppercase mb-1">Timestamp</div>
                    <div className="font-medium">{selectedLog.timestamp}</div>
                  </div>
                </div>

                 <div className="bg-slate-50 p-3 rounded-lg text-sm">
                    <div className="text-slate-500 text-xs uppercase mb-1">Sentiment Analysis</div>
                    <div className="flex items-center space-x-2">
                         <div 
                            className={`w-6 h-6 rounded-full ${
                                selectedLog.sentiment === 'Positive' ? 'bg-yellow-400' : 
                                selectedLog.sentiment === 'Negative' ? 'bg-red-500' : 
                                'bg-green-500'
                            }`}
                         />
                         <span className="text-slate-600 font-medium">
                            {selectedLog.sentiment} (Indicated by Color)
                         </span>
                    </div>
                  </div>

                <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-xs font-bold text-slate-500 uppercase flex items-center">
                           <Play size={14} className="mr-1" /> Recording & Transcript
                        </div>
                        <div className="flex space-x-2">
                             {selectedLog.recordingUrl && (
                                <a 
                                  href={selectedLog.recordingUrl} 
                                  download={`recording-${selectedLog.id}.webm`}
                                  className="flex items-center px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-xs font-medium transition-colors"
                                >
                                    <Download size={12} className="mr-1" /> Audio
                                </a>
                             )}
                             {selectedLog.transcript && (
                                 <button 
                                    onClick={() => downloadTranscript(selectedLog)}
                                    className="flex items-center px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-medium transition-colors"
                                 >
                                    <FileText size={12} className="mr-1" /> Text
                                 </button>
                             )}
                        </div>
                    </div>
                    
                    {selectedLog.recordingUrl ? (
                        <audio controls src={selectedLog.recordingUrl} className="w-full mb-4 h-8" />
                    ) : (
                         <div className="p-3 bg-slate-50 text-slate-500 text-xs rounded-lg mb-4 italic text-center">No audio recording available.</div>
                    )}
                    
                    {selectedLog.transcript ? (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-48 overflow-y-auto">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center">
                               <MessageSquare size={12} className="mr-1" /> Transcript
                            </h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {selectedLog.transcript}
                            </p>
                        </div>
                    ) : (
                         <div className="p-3 bg-slate-50 text-slate-500 text-xs rounded-lg italic text-center">No transcript available.</div>
                    )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CallLogs;