import { Agent, CallLog, Campaign } from './types';

export const KREDMINT_SYSTEM_PROMPT = `
You are an AI Voice Agent for Kredmint.ai. Your name is Sara.
You speak in a mix of Hindi and English (Hinglish) suitable for Indian business owners.

**Core Mission:** Help customers with Kredmint's financial products: Distribution Finance, Invoice Discounting, Pre-Invoice Discounting, Supplier Invoice Discounting, and Term Loans.

**Tone & Style:**
1. Polite and Professional (Always greet nicely).
2. Fast responses.
3. If you need to think, use natural fillers like "Ek second...", "Main check karti hu...", "Line pe rahiye...".
4. Determine sentiment (Positive/Negative/Neutral) based on their tone.

**Product Details:**

1. **Distribution / Retailer Finance:**
   - Credit for distributors/retailers to buy stock.
   - Eligibility: 1 yr vintage, Registered biz.
   - Docs: PAN, GST, 6-month Bank Statement, KYC.

2. **Invoice Discounting (ID):**
   - Early payment against raised invoices.
   - Funds in 24-72 hours.

3. **Pre-Invoice Discounting (PID):**
   - Funds based on PO (Purchase Order), before invoice generation.

4. **Term Loans:**
   - Short-mid term loans (6-36 months) for expansion.
   - Needs 2+ years vintage.

**Onboarding Process:**
1. Download Kredmint App/Web Portal.
2. Register & Upload Docs.
3. Choose Product.
4. Approval/Disbursement.

**Support Guidelines:**
- If asking about loan status/repayment -> Guide to Kredmint App.
- Technical issues -> Email care@kredmint.com.

**Important:** Always confirm the product type they are interested in before giving specific details.
`;

export const MOCK_CALL_LOGS: CallLog[] = [
  { 
    id: '1', 
    customerName: 'Rajesh Kumar', 
    phoneNumber: '+91 98765 43210', 
    status: 'Connected', 
    duration: '2m 15s', 
    timestamp: '2023-10-27 10:30 AM', 
    sentiment: 'Positive', 
    agentId: 'ag_1',
    transcript: "Agent: Namaste! Main Kredmint se Sara bol rahi hoon.\nCustomer: Haan boliye.\nAgent: Sir, kya aap apne business ke liye loan dekh rahe hain?\nCustomer: Haan, invoice discounting ke baare mein bataiye.\nAgent: Ji zaroor. Invoice discounting mein aap apne raised invoices ke against 24 se 72 ghante mein payment le sakte hain."
  },
  { 
    id: '2', 
    customerName: 'Amit Enterprises', 
    phoneNumber: '+91 98123 45678', 
    status: 'Connected', 
    duration: '4m 02s', 
    timestamp: '2023-10-27 10:45 AM', 
    sentiment: 'Neutral', 
    agentId: 'ag_1',
    transcript: "Agent: Namaste! Main Kredmint se Sara bol rahi hoon.\nCustomer: Busy hoon abhi.\nAgent: Koi baat nahi sir, main baad mein call karungi. Dhanyavaad."
  },
  { 
    id: '3', 
    customerName: 'Sneha Logistics', 
    phoneNumber: '+91 99887 76655', 
    status: 'Failed', 
    duration: '0s', 
    timestamp: '2023-10-27 11:00 AM', 
    sentiment: 'Negative', 
    agentId: 'ag_2' 
  },
  { 
    id: '4', 
    customerName: 'Vikas Traders', 
    phoneNumber: '+91 91234 56789', 
    status: 'Connected', 
    duration: '1m 30s', 
    timestamp: '2023-10-27 11:15 AM', 
    sentiment: 'Positive', 
    agentId: 'ag_1',
    transcript: "Agent: Namaste!\nCustomer: Hi, I need a term loan.\nAgent: Sure sir. Term loans are available for 6 to 36 months. Do you have a registered business with 2 years vintage?"
  },
  { 
    id: '5', 
    customerName: 'BlueSky Retail', 
    phoneNumber: '+91 90000 11111', 
    status: 'No Answer', 
    duration: '0s', 
    timestamp: '2023-10-27 11:20 AM', 
    sentiment: 'Neutral', 
    agentId: 'ag_2' 
  },
];

export const MOCK_AGENTS: Agent[] = [
  { 
    id: 'ag_1', 
    name: 'Kredmint Support (Sara)', 
    voiceId: 'female_1', 
    status: 'Active', 
    initialMessage: "Namaste! Main Kredmint se Sara bol rahi hoon. Main aapki business financing mein kaise madad kar sakti hoon?",
    instructions: KREDMINT_SYSTEM_PROMPT 
  },
  { 
    id: 'ag_2', 
    name: 'Collections Agent (Rahul)', 
    voiceId: 'male_1', 
    status: 'Inactive',
    initialMessage: "Hello, calling from Kredmint regarding your pending invoice.",
    instructions: "You are a polite collections agent..." 
  },
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'c_1', name: 'Diwali Offers', frequency: 'daily', scheduleTime: '10:00', startDate: '2023-11-01', agentId: 'ag_1', totalContacts: 1500, status: 'Running' },
  { id: 'c_2', name: 'Inactive Users Reactivation', frequency: 'weekly', scheduleTime: '14:00', startDate: '2023-11-05', agentId: 'ag_1', totalContacts: 500, status: 'Scheduled' },
];