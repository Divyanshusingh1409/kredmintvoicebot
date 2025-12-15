import { Agent, CallLog, Campaign, SipConfig } from '../types';

// Keys for LocalStorage
const AGENTS_KEY = 'kredmint_agents';
const LOGS_KEY = 'kredmint_logs';
const CAMPAIGNS_KEY = 'kredmint_campaigns';
const SIP_KEY = 'kredmint_sip';

// Event for real-time updates
export const DATA_UPDATE_EVENT = 'kredmint_data_update';

const triggerUpdate = () => {
  window.dispatchEvent(new Event(DATA_UPDATE_EVENT));
};

// Helper to initialize data if empty
const initData = () => {
  if (!localStorage.getItem(AGENTS_KEY)) {
    localStorage.setItem(AGENTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOGS_KEY)) {
    localStorage.setItem(LOGS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(CAMPAIGNS_KEY)) {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify([]));
  }
};

initData();

// --- Agent Service ---
export const getAgents = (): Agent[] => {
  const data = localStorage.getItem(AGENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveAgent = (agent: Agent) => {
  const agents = getAgents();
  const index = agents.findIndex(a => a.id === agent.id);
  if (index >= 0) {
    agents[index] = agent;
  } else {
    agents.push(agent);
  }
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
  triggerUpdate();
};

export const deleteAgent = (id: string) => {
  const agents = getAgents().filter(a => a.id !== id);
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
  triggerUpdate();
};

// --- Call Log Service ---
export const getCallLogs = (): CallLog[] => {
  const data = localStorage.getItem(LOGS_KEY);
  // Sort by newest first
  return data ? JSON.parse(data).sort((a: CallLog, b: CallLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];
};

export const addCallLog = (log: CallLog) => {
  const logs = getCallLogs();
  logs.unshift(log); // Add to beginning
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  triggerUpdate();
};

// --- Campaign Service ---
export const getCampaigns = (): Campaign[] => {
  const data = localStorage.getItem(CAMPAIGNS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCampaign = (campaign: Campaign) => {
  const campaigns = getCampaigns();
  const index = campaigns.findIndex(c => c.id === campaign.id);
  if (index >= 0) {
    campaigns[index] = campaign;
  } else {
    campaigns.unshift(campaign);
  }
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  triggerUpdate();
};

export const deleteCampaign = (id: string) => {
  const campaigns = getCampaigns().filter(c => c.id !== id);
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  triggerUpdate();
};

// --- SIP Service ---
export const getSipConfig = (): SipConfig | null => {
  const data = localStorage.getItem(SIP_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveSipConfig = (config: SipConfig) => {
  localStorage.setItem(SIP_KEY, JSON.stringify(config));
  triggerUpdate();
};
