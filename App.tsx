import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Campaigns from './pages/Campaigns';
import ApiKeys from './pages/ApiKeys';
import LiveAgent from './pages/LiveAgent';
import SipIntegration from './pages/SipIntegration';
import CallLogs from './pages/CallLogs';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<CallLogs />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/live" element={<LiveAgent />} />
          <Route path="/sip" element={<SipIntegration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;