import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Phone, PhoneIncoming, Clock, Activity, Play, X, Download, FileText, MessageSquare, RefreshCw } from 'lucide-react';
import { getCallLogs, DATA_UPDATE_EVENT } from '../utils/storage';
import { CallLog } from '../types';

// Helper to parse "2m 15s" or "30s" to total seconds
const parseDurationToSeconds = (durationStr: string): number => {
  let totalSeconds = 0;
  const minutesMatch = durationStr.match(/(\d+)m/);
  const secondsMatch = durationStr.match(/(\d+)s/);
  
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
  
  return totalSeconds;
};

// Helper to format seconds back to "2m 15s"
const formatSecondsToDuration = (seconds: number): string => {
  if (seconds === 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      <span className="text-green-600 font-medium">{subtext}</span>
      <span className="text-slate-400 ml-2">vs last week</span>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Computed Stats
  const [stats, setStats] = useState({
    totalCalls: 0,
    connectedCalls: 0,
    avgDuration: '0s',
    activeCalls: 0
  });

  // Chart Data
  const [chartData, setChartData] = useState<any[]>([]);

  const processData = () => {
    const allLogs = getCallLogs();
    setLogs(allLogs.slice(0, 10)); // Show recent 10 in table
    setLastUpdated(new Date());

    // 1. Calculate Stats
    const total = allLogs.length;
    const connected = allLogs.filter(l => l.status === 'Connected').length;
    
    let totalDurationSeconds = 0;
    let connectedCountForDuration = 0;
    
    allLogs.forEach(l => {
        if(l.duration && l.status === 'Connected') {
            totalDurationSeconds += parseDurationToSeconds(l.duration);
            connectedCountForDuration++;
        }
    });

    const avgSeconds = connectedCountForDuration > 0 ? totalDurationSeconds / connectedCountForDuration : 0;

    // Simulate active calls (random fluctuation for demo + any logs in last 2 mins)
    const recentActive = allLogs.filter(l => {
       const logTime = new Date(l.timestamp).getTime();
       const now = new Date().getTime();
       return (now - logTime) < 120000; // 2 mins
    }).length;

    setStats({
        totalCalls: total,
        connectedCalls: connected,
        avgDuration: formatSecondsToDuration(avgSeconds),
        activeCalls: Math.max(recentActive, Math.floor(Math.random() * 5)) // Mock active count base
    });

    // 2. Generate Chart Data (Last 7 days logic simulated by grouping mock data timestamps)
    // In a real app, we would group by actual dates. Here we mock groupings based on existing log count.
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    
    const newChartData = [];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        
        // Mock distribution based on total logs to make charts look populated
        // This makes the chart deterministic based on data volume but distributed over days
        const seed = total + i; 
        const dailyCalls = Math.floor((total / 7) + (seed % 10)); 
        const dailyConnected = Math.floor(dailyCalls * 0.7);
        const dailyFailed = dailyCalls - dailyConnected;

        newChartData.push({
            name: dayName,
            calls: dailyCalls,
            connected: dailyConnected,
            failed: dailyFailed
        });
    }
    setChartData(newChartData);
  };

  useEffect(() => {
    // Initial Load
    processData();

    // Event Listener for Realtime Updates from other components
    const handleUpdate = () => processData();
    window.addEventListener(DATA_UPDATE_EVENT, handleUpdate);

    // Polling for "Active Calls" simulation
    const interval = setInterval(() => {
        setStats(prev => ({
            ...prev,
            activeCalls: Math.max(0, prev.activeCalls + (Math.random() > 0.5 ? 1 : -1))
        }));
    }, 5000);

    return () => {
        window.removeEventListener(DATA_UPDATE_EVENT, handleUpdate);
        clearInterval(interval);
    };
  }, []);

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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-slate-500 mt-1">Real-time insights into your Kredmint AI agents.</p>
        </div>
        <div className="flex items-center text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Realtime: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Calls" 
          value={stats.totalCalls.toLocaleString()} 
          subtext="+12%" 
          icon={Phone} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Connected Calls" 
          value={stats.connectedCalls.toLocaleString()} 
          subtext={`${stats.totalCalls > 0 ? Math.round((stats.connectedCalls / stats.totalCalls) * 100) : 0}% Rate`}
          icon={PhoneIncoming} 
          color="bg-green-500" 
        />
        <StatCard 
          title="Avg. Duration" 
          value={stats.avgDuration} 
          subtext="Per Call" 
          icon={Clock} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Active Calls" 
          value={stats.activeCalls} 
          subtext="Live Now" 
          icon={Activity} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Call Volume Analytics (Last 7 Days)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#F1F5F9'}}
                />
                <Bar dataKey="calls" name="Total Calls" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="connected" name="Connected" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-w-0">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Success Rate Trend</h3>
          <div className="h-80 w-full">
             <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="connected" name="Connected" stroke="#22C55E" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="#EF4444" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <Clock size={18} className="mr-2 text-slate-500" /> Recent Activity
          </h3>
          <button 
            onClick={() => navigate('/logs')}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm transition-colors hover:bg-indigo-50"
          >
            View All Logs <RefreshCw size={12} className="ml-2" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Sentiment</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{log.customerName}</div>
                    <div className="text-xs text-slate-400">{log.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${log.status === 'Connected' ? 'bg-green-50 text-green-700 border-green-200' : 
                        log.status === 'Failed' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{log.duration}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1 font-medium
                      ${log.sentiment === 'Positive' ? 'text-green-600' : 
                        log.sentiment === 'Negative' ? 'text-red-600' : 
                        'text-slate-500'}`}>
                        {log.sentiment === 'Positive' && '😊'}
                        {log.sentiment === 'Neutral' && '😐'}
                        {log.sentiment === 'Negative' && '😠'}
                        {log.sentiment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-indigo-600 hover:text-indigo-900 font-medium text-xs flex items-center bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
                    >
                       Details
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                  <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 italic">No recent calls recorded.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

       {/* Call Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
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
                    <div className="font-medium flex items-center">
                         {selectedLog.sentiment === 'Positive' && '😊 Positive'}
                        {selectedLog.sentiment === 'Neutral' && '😐 Neutral'}
                        {selectedLog.sentiment === 'Negative' && '😠 Negative'}
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

export default Dashboard;