export interface CallLog {
  id: string;
  customerName: string;
  phoneNumber: string;
  status: 'Connected' | 'Failed' | 'No Answer' | 'Busy';
  duration: string;
  timestamp: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  agentId: string;
  recordingUrl?: string; // Blob URL for playback
  transcript?: string; // Full conversation text
}

export interface Agent {
  id: string;
  name: string;
  voiceId: string;
  initialMessage: string;
  instructions: string;
  status: 'Active' | 'Inactive';
}

export interface Campaign {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  scheduleTime: string;
  startDate: string;
  agentId: string;
  totalContacts: number;
  status: 'Scheduled' | 'Running' | 'Completed' | 'Draft';
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
}

export interface Contact {
  name: string;
  phoneNumber: string;
  customFields?: Record<string, string>;
}

export interface SipConfig {
  domain: string;
  username: string;
  password: string;
  port: string;
  protocol: 'UDP' | 'TCP' | 'TLS';
}