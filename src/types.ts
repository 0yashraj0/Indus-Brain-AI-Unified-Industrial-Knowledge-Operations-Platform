export type UserRole = 'owner' | 'manager' | 'worker';

export interface Account {
  id: string;
  password?: string;
  role: UserRole;
  name: string;
  photo?: string;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  chunks: number;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  text?: string;
  uploadedAt?: string;
  summary?: string;
  safetyPoints?: string[];
  warnings?: string[];
  ppe?: string[];
  emergencyProcedures?: string;
  revisionDate?: string;
  keywords?: string[];
  version?: number;
  versions?: {
    version: number;
    text: string;
    uploadedAt: string;
  }[];
}

export interface WorkerReport {
  id: string;
  title: string;
  type: 'Not working' | 'Missing file' | 'Other';
  description: string;
  timestamp: string;
  workerName: string;
  photo?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'bot';
  text: string;
  source?: string;
  confidence?: number;
  sourceDoc?: string;
  pageNumber?: number;
  relatedDocs?: string[];
  relatedImages?: string[];
  isWarning?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface MaintenanceRecord {
  date: string;
  description: string;
  technician: string;
}

export interface Equipment {
  id: string; // Equipment ID
  name: string;
  department: string;
  location: string;
  manual: string; // manual document name/ID
  sop: string; // SOP text
  maintenanceHistory: MaintenanceRecord[];
  lastService: string;
  nextService: string;
  status: 'Operational' | 'Maintenance Required' | 'Shutdown';
  notes: string;
  sector?: string;
  machineType?: string;
  manualCategory?: string;
  files?: { id: string; name: string; size: string; text: string; uploadedAt: string }[];
}

export interface Employee {
  photo: string; // base64 or placeholder URL
  name: string;
  employeeId: string;
  department: string;
  role: UserRole;
  phone: string;
  email: string;
  joiningDate: string;
  status: 'Active' | 'On Leave' | 'Inactive';
}

export interface ActivityLog {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  date: string;
  time: string;
}

export interface EmergencyData {
  fireProcedures: string;
  chemicalSpillSops: string;
  emergencyContacts: { name: string; phone: string; role: string }[];
  firstAid: string;
  emergencyShutdown: string;
  evacuationProcedures: string;
  assemblyPoints: string;
}
