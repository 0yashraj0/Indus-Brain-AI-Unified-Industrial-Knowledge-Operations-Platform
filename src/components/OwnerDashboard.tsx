import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Search, Trash2, Edit, Plus, Check, FileText, Settings, Activity,
  ShieldAlert, Wrench, Users, Download, BarChart2, Mic, Volume2, VolumeX,
  Upload, History, Clock, ArrowRight, Eye, CheckCircle, XCircle, AlertTriangle,
  Play, Pause, RefreshCw, Layers, Calendar, Camera
} from 'lucide-react';
import { Account, Document, WorkerReport, ChatMessage, Equipment, Employee, ActivityLog, EmergencyData, ChatSession } from '../types';
import { extractTextFromFile } from '../utils/fileExtractor';

interface OwnerDashboardProps {
  currentUser: Account;
  accounts: Account[];
  documents: Document[];
  reports: WorkerReport[];
  equipment: Equipment[];
  employees: Employee[];
  logs: ActivityLog[];
  emergency: EmergencyData;
  onAddAccount: (acc: Account) => Promise<boolean>;
  onDeleteAccount: (targetId: string, currentUserId: string) => Promise<boolean>;
  onUpdateEmployee: (emp: Employee, newPassword?: string) => Promise<void>;
  onAddDocument: (doc: Document) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onRenameDocument: (id: string, newName: string) => Promise<void>;
  onApproveDocument: (id: string, status: 'Approved' | 'Rejected' | 'Pending') => Promise<void>;
  onAddNewVersion: (id: string, text: string) => Promise<void>;
  onAddEquipment: (eq: Equipment) => Promise<void>;
  onEditEquipment: (eq: Equipment) => Promise<void>;
  onDeleteEquipment: (eq: Equipment) => Promise<void>;
  onUpdateEmergency: (em: EmergencyData) => Promise<void>;
  onSignOut: () => void;
}

type OwnerTab = 'ask' | 'docs' | 'analytics' | 'equipment' | 'reports' | 'accounts' | 'logs' | 'emergency';

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function OwnerDashboard({
  currentUser,
  accounts,
  documents,
  reports,
  equipment,
  employees,
  logs,
  emergency,
  onAddAccount,
  onDeleteAccount,
  onUpdateEmployee,
  onAddDocument,
  onDeleteDocument,
  onRenameDocument,
  onApproveDocument,
  onAddNewVersion,
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  onUpdateEmergency,
  onSignOut
}: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<OwnerTab>('ask');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const currentUserEmployee = employees.find(emp => emp.employeeId === currentUser.id);
  const currentUserPhoto = currentUserEmployee?.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

  // Chat History & Session Management (ChatGPT-style!)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSortOrder, setSessionSortOrder] = useState<'desc' | 'asc'>('desc');

  // Input & Streaming states
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreamWarning, setIsStreamWarning] = useState(false);
  const [chatImageBase64, setChatImageBase64] = useState<string | null>(null);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const [speechError, setSpeechError] = useState('');

  // Modals & Drawers
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<Account | null>(null);
  const [deleteDocumentTarget, setDeleteDocumentTarget] = useState<Document | null>(null);
  const [renameDocumentTarget, setRenameDocumentTarget] = useState<Document | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [viewDocDetailTarget, setViewDocDetailTarget] = useState<Document | null>(null);
  const [newVersionText, setNewVersionText] = useState('');
  const [isNewVersionFormOpen, setIsNewVersionFormOpen] = useState(false);

  // Equipment Drawer / Form states
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [isEquipmentFormOpen, setIsEquipmentFormOpen] = useState(false);
  const [eqFormId, setEqFormId] = useState('');
  const [eqFormName, setEqFormName] = useState('');
  const [eqFormDept, setEqFormDept] = useState('');
  const [eqFormDeptCustom, setEqFormDeptCustom] = useState('');
  const [eqFormSector, setEqFormSector] = useState('Sector 1');
  const [eqFormSectorCustom, setEqFormSectorCustom] = useState('');
  const [eqFormMachineType, setEqFormMachineType] = useState('Oven');
  const [eqFormMachineTypeCustom, setEqFormMachineTypeCustom] = useState('');
  const [eqFormManualCategory, setEqFormManualCategory] = useState('Safety SOP');
  const [eqFormManualCategoryCustom, setEqFormManualCategoryCustom] = useState('');
  const [eqFormLoc, setEqFormLoc] = useState('');
  const [eqFormManual, setEqFormManual] = useState('');
  const [eqFormSop, setEqFormSop] = useState('');
  const [eqFormStatus, setEqFormStatus] = useState<'Operational' | 'Maintenance Required' | 'Shutdown'>('Operational');
  const [eqFormNotes, setEqFormNotes] = useState('');
  const [eqFormFiles, setEqFormFiles] = useState<{ id: string; name: string; size: string; text: string; uploadedAt: string }[]>([]);
  const [previewingMachineFile, setPreviewingMachineFile] = useState<{ id: string; name: string; size: string; text: string; uploadedAt: string } | null>(null);
  const [deleteEquipmentTarget, setDeleteEquipmentTarget] = useState<Equipment | null>(null);

  // Employee Form states
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);

  // Emergency Form states
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [emFire, setEmFire] = useState(emergency.fireProcedures);
  const [emChem, setEmChem] = useState(emergency.chemicalSpillSops);
  const [emFirst, setEmFirst] = useState(emergency.firstAid);
  const [emShutdown, setEmShutdown] = useState(emergency.emergencyShutdown);
  const [emEvac, setEmEvac] = useState(emergency.evacuationProcedures);
  const [emAssembly, setEmAssembly] = useState(emergency.assemblyPoints);

  // Account creation state
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newRole, setNewRole] = useState<'worker' | 'manager' | 'owner'>('worker');
  const [newPhoto, setNewPhoto] = useState('');
  const [newPhotoError, setNewPhotoError] = useState('');
  const createPhotoInputRef = useRef<HTMLInputElement>(null);
  const [accountMsg, setAccountMsg] = useState({ text: '', isError: false });

  // Upload/File State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [profileUploadError, setProfileUploadError] = useState('');

  // Edit Profile Modal state for current Owner/Manager
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editProfileName, setEditProfileName] = useState(currentUser.name);
  const [editProfilePhoto, setEditProfilePhoto] = useState('');
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');
  const editProfilePhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditProfileName(currentUser.name);
    if (currentUserEmployee) {
      setEditProfilePhoto(currentUserEmployee.photo || '');
    }
  }, [currentUser, currentUserEmployee]);

  useEffect(() => {
    if (currentUser.role === 'manager') {
      setNewRole('worker');
    }
  }, [currentUser]);

  // Emergency contacts inline edit states
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');

  const getEmergencyContacts = () => {
    const ownerEmp = employees.find(e => e.role === 'owner');
    const managerEmp = employees.find(e => e.role === 'manager');

    const savedContacts = emergency.emergencyContacts || [];
    const savedSafety = savedContacts.find(c => c.role === 'Safety Department' || c.name === 'Safety Department' || c.role === 'safety');
    const savedFire = savedContacts.find(c => c.role === 'Fire Brigade' || c.role === 'fire');
    const savedPolice = savedContacts.find(c => c.role === 'Police' || c.role === 'police');
    const savedNational = savedContacts.find(c => c.role === 'National Emergency' || c.role === 'national');
    const savedAmbulance = savedContacts.find(c => c.role === 'Ambulance' || c.role === 'ambulance');

    return [
      {
        name: savedContacts[0]?.name || 'Owner / Plant Head',
        phone: ownerEmp?.phone || 'Not Added',
        role: 'Owner Contact',
        roleType: 'owner'
      },
      {
        name: savedContacts[1]?.name || 'Manager / Shift Incharge',
        phone: managerEmp?.phone || 'Not Added',
        role: 'Manager Contact',
        roleType: 'manager'
      },
      {
        name: savedSafety?.name || 'Safety Department',
        phone: savedSafety?.phone || '',
        role: 'Safety Department',
        roleType: 'safety'
      },
      {
        name: savedFire?.name || 'Fire Brigade',
        phone: '101',
        role: 'External Help',
        roleType: 'fire'
      },
      {
        name: savedPolice?.name || 'Police',
        phone: '100',
        role: 'External Help',
        roleType: 'police'
      },
      {
        name: savedNational?.name || 'National Emergency / Rescue',
        phone: '112',
        role: 'External Help',
        roleType: 'national'
      },
      {
        name: savedAmbulance?.name || 'Ambulance',
        phone: '108',
        role: 'External Help',
        roleType: 'ambulance'
      }
    ];
  };

  const getAvailableEmergencyContactsCount = () => {
    const contacts = getEmergencyContacts();
    return contacts.filter(c => c.phone && c.phone !== 'Not Added').length;
  };

  const canEditContact = (idx: number) => {
    if (currentUser.role === 'owner') {
      return true;
    }
    if (currentUser.role === 'manager') {
      return idx === 1 || idx === 2;
    }
    return false;
  };

  const handleSaveContact = async (idx: number) => {
    if (idx === 0) {
      const ownerEmp = employees.find(e => e.role === 'owner');
      if (ownerEmp) {
        await onUpdateEmployee({
          ...ownerEmp,
          phone: editContactPhone
        });
      }
      const updatedContacts = [...(emergency.emergencyContacts || [])];
      while (updatedContacts.length <= 0) {
        updatedContacts.push({ name: '', phone: '', role: '' });
      }
      updatedContacts[0] = {
        name: editContactName || 'Owner / Plant Head',
        phone: editContactPhone,
        role: 'Owner Contact'
      };
      await onUpdateEmergency({
        ...emergency,
        emergencyContacts: updatedContacts
      });
    } else if (idx === 1) {
      const managerEmp = employees.find(e => e.role === 'manager');
      if (managerEmp) {
        await onUpdateEmployee({
          ...managerEmp,
          phone: editContactPhone
        });
      }
      const updatedContacts = [...(emergency.emergencyContacts || [])];
      while (updatedContacts.length <= 1) {
        updatedContacts.push({ name: '', phone: '', role: '' });
      }
      updatedContacts[1] = {
        name: editContactName || 'Manager / Shift Incharge',
        phone: editContactPhone,
        role: 'Manager Contact'
      };
      await onUpdateEmergency({
        ...emergency,
        emergencyContacts: updatedContacts
      });
    } else if (idx === 2) {
      const updatedContacts = [...(emergency.emergencyContacts || [])];
      const safetyIdx = updatedContacts.findIndex(c => c.role === 'Safety Department' || c.name === 'Safety Department' || c.role === 'safety');
      const newEntry = {
        name: editContactName || 'Safety Department',
        phone: editContactPhone,
        role: 'Safety Department'
      };
      if (safetyIdx > -1) {
        updatedContacts[safetyIdx] = newEntry;
      } else {
        updatedContacts.push(newEntry);
      }
      await onUpdateEmergency({
        ...emergency,
        emergencyContacts: updatedContacts
      });
    } else {
      const roles = ['Fire Brigade', 'Police', 'National Emergency', 'Ambulance'];
      const updatedContacts = [...(emergency.emergencyContacts || [])];
      const roleName = roles[idx - 3];
      const phoneNum = idx === 3 ? '101' : idx === 4 ? '100' : idx === 5 ? '112' : '108';
      
      const foundIdx = updatedContacts.findIndex(c => c.role === roleName);
      const newEntry = {
        name: editContactName,
        phone: phoneNum,
        role: roleName
      };
      if (foundIdx > -1) {
        updatedContacts[foundIdx] = newEntry;
      } else {
        updatedContacts.push(newEntry);
      }
      await onUpdateEmergency({
        ...emergency,
        emergencyContacts: updatedContacts
      });
    }

    setEditingContactIdx(null);
  };

  // Load chat sessions from database for current user
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId: currentUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const loaded = data.sessions || [];
        setSessions(loaded);
        if (loaded.length > 0 && !activeSessionId) {
          setActiveSessionId(loaded[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSessionId, sessions, streamingText]);

  // Create Chat Session
  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId: currentUser.id, title: 'New Analysis' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        setActiveSessionId(data.activeId);
      }
    } catch (err) {
      console.error('Error creating session:', err);
    }
  };

  // Rename Session
  const handleRenameSession = async (sid: string, title: string) => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', userId: currentUser.id, sessionId: sid, title }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Error renaming session:', err);
    }
  };

  // Delete Session
  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: currentUser.id, sessionId: sid }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        if (activeSessionId === sid) {
          setActiveSessionId(data.sessions.length > 0 ? data.sessions[0].id : '');
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Chat Submission & Streaming
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatImageBase64) return;

    let targetSid = activeSessionId;
    if (!targetSid) {
      // Auto-create session if none active
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId: currentUser.id, title: chatInput.substring(0, 24) || 'Image Analysis' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        targetSid = data.activeId;
        setActiveSessionId(data.activeId);
      } else {
        return;
      }
    }

    const messageText = chatInput;
    setChatInput('');
    setIsStreaming(true);
    setStreamingText('');
    setIsStreamWarning(false);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          sessionId: targetSid,
          message: messageText,
          imageBase64: chatImageBase64
        }),
      });

      if (!res.ok) {
        throw new Error('Streaming connection failed');
      }

      setChatImageBase64(null); // Clear image preview

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          
          try {
            const parsed = JSON.parse(cleanLine.substring(6));
            if (parsed.error) {
              setStreamingText((p) => p + `\n[Stream Error: ${parsed.error}]`);
            } else if (parsed.text !== undefined) {
              setStreamingText(parsed.text);
              if (parsed.isWarning) {
                setIsStreamWarning(true);
              }
            }
            if (parsed.done) {
              // Final payload received, refresh sessions from DB
              await fetchSessions();
              setIsStreaming(false);
              setStreamingText('');
            }
          } catch (e) {
            // ignore JSON parse errors of incomplete chunk boundaries
          }
        }
      }
    } catch (err: any) {
      console.error('Streaming error:', err);
      setStreamingText(`Failed to connect to the intelligence gateway: ${err.message}`);
      setIsStreaming(false);
    }
  };

  // Voice Assistant: Web Speech Recognition
  const toggleSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError('Speech Recognition is not natively supported in this browser. Please try Chrome/Safari.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    setSpeechError('');
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Supports 'hi-IN', 'ta-IN' etc

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = (err: any) => {
      console.error('Speech recognition error:', err);
      setIsListening(false);
      if (err.error === 'not-allowed') {
        setSpeechError('Microphone permission blocked or not allowed in this iframe. Please open the app in a new tab.');
      } else if (err.error === 'no-speech') {
        setSpeechError('No speech detected. Please speak clearly into the microphone.');
      } else {
        setSpeechError(err.error ? `Speech Recognition issue: ${err.error}` : 'Unable to access microphone.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setSpeechError('Failed to start microphone streaming.');
      setIsListening(false);
    }
  };

  // Speak AI Text back using Web Speech Synthesis
  const handleSpeakText = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_~`⚠️]/g, ''));
    utterance.onend = () => {
      setSpeakingMsgId(null);
    };
    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Image Upload handler for chat composer
  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setChatImageBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Document Upload Process
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const processFiles = async (files: FileList) => {
    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'webp'];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowed.includes(ext)) {
        alert(`File format ".${ext}" is not supported.`);
        continue;
      }

      const textContent = await extractTextFromFile(file);
      const sizeMb = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      await onAddDocument({
        id: '',
        name: file.name,
        size: sizeMb,
        chunks: Math.max(1, Math.ceil(file.size / 1500)),
        status: 'Pending',
        text: textContent,
        uploadedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        version: 1
      });
    }
  };

  // Document Rename Action
  const triggerRename = (doc: Document) => {
    setRenameDocumentTarget(doc);
    setRenameValue(doc.name.split('.').slice(0, -1).join('.'));
  };

  // Add User Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanId = newId.trim();
    const cleanPw = newPw.trim();

    if (!cleanName || !cleanId || !cleanPw) {
      setAccountMsg({ text: 'Please fill in name, ID, and password.', isError: true });
      return;
    }

    if (currentUser.role === 'manager' && newRole !== 'worker') {
      setAccountMsg({ text: 'Managers can only authorize worker accounts.', isError: true });
      return;
    }

    const success = await onAddAccount({
      id: cleanId,
      name: cleanName,
      password: cleanPw,
      role: newRole,
      photo: newPhoto,
    });

    if (success) {
      setAccountMsg({
        text: `Account "${cleanId}" successfully created.`,
        isError: false,
      });
      setNewName('');
      setNewId('');
      setNewPw('');
      setNewPhoto('');
      setNewPhotoError('');
    } else {
      setAccountMsg({ text: 'That ID is already taken.', isError: true });
    }
  };

  // Delete User Account
  const confirmDeleteAccount = async () => {
    if (!deleteAccountTarget) return;

    if (currentUser.role === 'manager' && deleteAccountTarget.role !== 'worker') {
      setAccountMsg({ text: 'Managers can only delete worker accounts.', isError: true });
      setDeleteAccountTarget(null);
      return;
    }

    const success = await onDeleteAccount(deleteAccountTarget.id, currentUser.id);
    if (success) {
      setAccountMsg({ text: `Account "${deleteAccountTarget.id}" was permanently deleted.`, isError: false });
    } else {
      setAccountMsg({ text: `Failed or insufficient permissions to delete "${deleteAccountTarget.id}".`, isError: true });
    }
    setDeleteAccountTarget(null);
  };

  // Open & Save Equipment CRUD
  const openEquipmentForm = (eq?: Equipment) => {
    if (eq) {
      setEditingEquipment(eq);
      setEqFormId(eq.id);
      setEqFormName(eq.name);
      
      const depts = ["Production", "Utilities", "Logistics", "Executive"];
      if (depts.includes(eq.department)) {
        setEqFormDept(eq.department);
        setEqFormDeptCustom('');
      } else {
        setEqFormDept('Other');
        setEqFormDeptCustom(eq.department);
      }

      const sectors = ["Sector 1", "Sector 2", "Sector 3", "Sector 4"];
      if (eq.sector && sectors.includes(eq.sector)) {
        setEqFormSector(eq.sector);
        setEqFormSectorCustom('');
      } else if (eq.sector) {
        setEqFormSector('Other');
        setEqFormSectorCustom(eq.sector);
      } else {
        setEqFormSector('Sector 1');
        setEqFormSectorCustom('');
      }

      const mtypes = ["Oven", "Pump", "Conveyor", "Compressor"];
      if (eq.machineType && mtypes.includes(eq.machineType)) {
        setEqFormMachineType(eq.machineType);
        setEqFormMachineTypeCustom('');
      } else if (eq.machineType) {
        setEqFormMachineType('Other');
        setEqFormMachineTypeCustom(eq.machineType);
      } else {
        setEqFormMachineType('Oven');
        setEqFormMachineTypeCustom('');
      }

      const mcats = ["Safety SOP", "Maintenance Log", "User Guide", "Compliance Guidelines"];
      if (eq.manualCategory && mcats.includes(eq.manualCategory)) {
        setEqFormManualCategory(eq.manualCategory);
        setEqFormManualCategoryCustom('');
      } else if (eq.manualCategory) {
        setEqFormManualCategory('Other');
        setEqFormManualCategoryCustom(eq.manualCategory);
      } else {
        setEqFormManualCategory('Safety SOP');
        setEqFormManualCategoryCustom('');
      }

      setEqFormLoc(eq.location);
      setEqFormManual(eq.manual);
      setEqFormSop(eq.sop);
      setEqFormStatus(eq.status);
      setEqFormNotes(eq.notes);
      setEqFormFiles(eq.files || []);
    } else {
      setEditingEquipment(null);
      setEqFormId(`EQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
      setEqFormName('');
      setEqFormDept('Production');
      setEqFormDeptCustom('');
      setEqFormSector('Sector 1');
      setEqFormSectorCustom('');
      setEqFormMachineType('Oven');
      setEqFormMachineTypeCustom('');
      setEqFormManualCategory('Safety SOP');
      setEqFormManualCategoryCustom('');
      setEqFormLoc('');
      setEqFormManual(documents[0]?.name || '');
      setEqFormSop('');
      setEqFormStatus('Operational');
      setEqFormNotes('');
      setEqFormFiles([]);
    }
    setIsEquipmentFormOpen(true);
  };

  const saveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const eqData: Equipment = {
      id: eqFormId,
      name: eqFormName,
      department: eqFormDept === 'Other' ? eqFormDeptCustom : eqFormDept,
      location: eqFormLoc,
      manual: eqFormManual,
      sop: eqFormSop,
      maintenanceHistory: editingEquipment?.maintenanceHistory || [],
      lastService: editingEquipment?.lastService || new Date().toISOString().split('T')[0],
      nextService: editingEquipment?.nextService || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: eqFormStatus,
      notes: eqFormNotes,
      sector: eqFormSector === 'Other' ? eqFormSectorCustom : eqFormSector,
      machineType: eqFormMachineType === 'Other' ? eqFormMachineTypeCustom : eqFormMachineType,
      manualCategory: eqFormManualCategory === 'Other' ? eqFormManualCategoryCustom : eqFormManualCategory,
      files: eqFormFiles
    };

    if (editingEquipment) {
      await onEditEquipment(eqData);
    } else {
      await onAddEquipment(eqData);
    }
    setIsEquipmentFormOpen(false);
  };

  // Open Employee editing
  const openEmployeeForm = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsEmployeeFormOpen(true);
    setProfileUploadError('');
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileUploadError('File size exceeds the 5 MB limit. Please choose a smaller image.');
      return;
    }

    // Validate type (JPG or JPEG)
    const fileName = file.name.toLowerCase();
    const isValidFormat = file.type === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
    if (!isValidFormat) {
      setProfileUploadError('Unsupported format. Only JPG and JPEG images are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (editingEmployee) {
        setEditingEmployee({
          ...editingEmployee,
          photo: base64String
        });
      }
    };
    reader.onerror = () => {
      setProfileUploadError('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const saveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      await onUpdateEmployee(editingEmployee);
      setIsEmployeeFormOpen(false);
    }
  };

  // Submit Handler for Owner/Manager editing their own profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditProfileError('');
    setEditProfileSuccess('');

    const cleanName = editProfileName.trim();
    if (!cleanName) {
      setEditProfileError('Name cannot be empty.');
      return;
    }

    if (!currentUserEmployee) {
      setEditProfileError('Owner/Manager employee record not found.');
      return;
    }

    // Build updated employee profile
    const updatedEmployee: Employee = {
      ...currentUserEmployee,
      name: cleanName,
      photo: editProfilePhoto,
    };

    try {
      await onUpdateEmployee(updatedEmployee, editProfilePassword || undefined);
      setEditProfileSuccess('Profile successfully updated!');
      setEditProfilePassword('');
      // Auto close modal after a short delay
      setTimeout(() => {
        setIsEditProfileModalOpen(false);
        setEditProfileSuccess('');
      }, 1500);
    } catch (err) {
      setEditProfileError('Failed to update profile.');
    }
  };

  // Save emergency protocols
  const handleSaveEmergency = async () => {
    await onUpdateEmergency({
      fireProcedures: emFire,
      chemicalSpillSops: emChem,
      firstAid: emFirst,
      emergencyShutdown: emShutdown,
      evacuationProcedures: emEvac,
      assemblyPoints: emAssembly,
      emergencyContacts: emergency.emergencyContacts
    });
    setIsEditingEmergency(false);
  };

  // Document version upgrade handler
  const handleUploadNewVersion = async () => {
    if (viewDocDetailTarget && newVersionText.trim()) {
      await onAddNewVersion(viewDocDetailTarget.id, newVersionText.trim());
      // Refresh current view
      const updated = documents.find(d => d.id === viewDocDetailTarget.id);
      if (updated) {
        setViewDocDetailTarget(updated);
      }
      setNewVersionText('');
      setIsNewVersionFormOpen(false);
      // alert user
      alert('New document version indexed successfully.');
    }
  };

  const handleTabChange = (tab: OwnerTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // Filtered Chat Sessions
  const filteredSessions = sessions
    .filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase()))
    .sort((a, b) => {
      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();
      return sessionSortOrder === 'desc' ? bd - ad : ad - bd;
    });

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Export reports to CSV
  const handleExportReports = () => {
    let csv = 'ID,Worker,Type,Incident Title,Description,Timestamp\n';
    reports.forEach(r => {
      csv += `"${r.id}","${r.workerName}","${r.type}","${r.title.replace(/"/g, '""')}","${r.description.replace(/"/g, '""')}","${r.timestamp}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `indus_reports_${Date.now()}.csv`);
    a.click();
  };

  return (
    <div className="screen active" id="screenOwner">
      <div className="shell">
        {/* BACKDROP OVERLAY FOR MOBILE SIDEBAR */}
        <div
          className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        ></div>

        {/* SIDEBAR RAIL */}
        <div className={`rail ${isSidebarOpen ? 'open' : ''} glass-dark m-4 mr-0 rounded-[24px] border border-white/10 shadow-2xl h-[calc(100vh-32px)] flex flex-col p-6`}>
          <div className="railTop justify-between flex items-center w-full mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_#fff]"></div>
              <span className="font-sans font-bold tracking-widest text-xs text-white">INDUS BRAIN</span>
            </div>
            <button className="mobileCloseBtn p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-all md:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="idBlock mb-8 pb-6 border-b border-white/5 flex items-center gap-3">
            <div 
              onClick={() => setIsEditProfileModalOpen(true)}
              className="group relative cursor-pointer shrink-0"
              title="Click to edit profile"
            >
              {currentUserEmployee?.photo ? (
                <img
                  src={currentUserEmployee.photo}
                  alt={currentUser.name}
                  className="w-10 h-10 object-cover rounded-full border border-white/10 shadow-lg group-hover:opacity-75 transition-all"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-900 font-extrabold text-xs flex items-center justify-center uppercase border border-white/10 shadow-lg group-hover:bg-neutral-200 transition-all">
                  {getInitials(currentUser.name)}
                </div>
              )}
              {/* Overlay edit icon */}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Camera size={12} className="text-white" />
              </div>
            </div>
            <div>
              <div className="who text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-0.5">Signed in as</div>
              <div className="nm text-sm font-extrabold text-white tracking-tight leading-tight" id="ownerNameDisplay">
                {currentUser.name}
              </div>
              <div className="rl uppercase tracking-widest text-[8px] text-white/45 font-mono mt-0.5">
                {currentUser.role} console
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 overflow-y-auto w-full -mx-1 px-1">
            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'ask' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('ask')}
            >
              <span className="flex items-center gap-2">
                <Search size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Ask AI</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'ask' ? 'text-white/60' : 'text-neutral-500'}`}>01</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'docs' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('docs')}
            >
              <span className="flex items-center gap-2">
                <FileText size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Documents ({documents.length})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'docs' ? 'text-white/60' : 'text-neutral-500'}`}>02</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'analytics' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('analytics')}
            >
              <span className="flex items-center gap-2">
                <BarChart2 size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Analytics</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'analytics' ? 'text-white/60' : 'text-neutral-500'}`}>03</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'equipment' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('equipment')}
            >
              <span className="flex items-center gap-2">
                <Wrench size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Equipment ({equipment.length})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'equipment' ? 'text-white/60' : 'text-neutral-500'}`}>04</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'reports' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('reports')}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Reports ({reports.length})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'reports' ? 'text-white/60' : 'text-neutral-500'}`}>05</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'accounts' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('accounts')}
            >
              <span className="flex items-center gap-2">
                <Users size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Accounts ({accounts.length})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'accounts' ? 'text-white/60' : 'text-neutral-500'}`}>06</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'logs' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('logs')}
            >
              <span className="flex items-center gap-2">
                <History size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Audit Logs ({logs.length})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'logs' ? 'text-white/60' : 'text-neutral-500'}`}>07</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'emergency' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('emergency')}
            >
              <span className="flex items-center gap-2">
                <ShieldAlert size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Emergency ({getAvailableEmergencyContactsCount()})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'emergency' ? 'text-white/60' : 'text-neutral-500'}`}>08</span>
            </div>
          </nav>

          <div className="railBottom mt-auto pt-6 border-t border-white/5">
            <span className="signOut text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white cursor-pointer transition-all duration-200 flex items-center gap-2" onClick={onSignOut}>
              <ArrowRight size={12} className="rotate-180" /> Sign out
            </span>
          </div>
        </div>

        {/* WORK STAGE */}
        <div className="stage flex-1 flex flex-col overflow-hidden min-w-0 pr-4 py-4">
          <div className="stageHead glass-header mb-4 p-5 rounded-[20px] flex items-center justify-between border border-neutral-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3">
              {/* Hamburger Button for Mobile */}
              <button className="mobileMenuBtn p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>

              <div>
                <h1 id="ownerTitle" className="font-sans tracking-tight font-bold text-lg text-neutral-900">
                  {activeTab === 'ask' && 'Ask the Operations Brain'}
                  {activeTab === 'docs' && 'AI Document Intelligence'}
                  {activeTab === 'analytics' && 'Operational Analytics'}
                  {activeTab === 'equipment' && 'Equipment Directory'}
                  {activeTab === 'reports' && 'Worker Reports Center'}
                  {activeTab === 'accounts' && 'Manage Floor Accounts'}
                  {activeTab === 'logs' && 'Security Audit Log'}
                  {activeTab === 'emergency' && 'Emergency Command Center'}
                </h1>
                <div className="sub text-[11px] text-neutral-400 font-sans mt-0.5" id="ownerSub">
                  {activeTab === 'ask' && 'Multimodal real-time neural industrial assistant'}
                  {activeTab === 'docs' && 'Automated scanning, OCR indexing and safety extraction'}
                  {activeTab === 'analytics' && 'Plant-wide metric visualizers & system audits'}
                  {activeTab === 'equipment' && 'Operational manuals, locations, and maintenance ledgers'}
                  {activeTab === 'reports' && 'Review, trace and archive hazards raised from the floor'}
                  {activeTab === 'accounts' && 'Register employee directory and permission boundaries'}
                  {activeTab === 'logs' && 'Complete sequence history of industrial control actions'}
                  {activeTab === 'emergency' && 'Emergency shutdown, evacuation, and first-aid protocols'}
                </div>
              </div>
            </div>
            <div className="badge hidden sm:flex font-mono text-[9px] font-bold border border-neutral-200 bg-neutral-900 text-white tracking-widest uppercase px-3 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              {currentUser.role} Control
            </div>
          </div>

          <div className="stageBody" id="ownerBody">
            {/* ASK VIEW - EXQUISITE DYNAMIC CHAT CONTAINER */}
            {activeTab === 'ask' && (
              <div className="flex h-full glass-panel overflow-hidden border border-neutral-200/50 shadow-xl rounded-[24px]">
                {/* CHAT HISTORY SIDEBAR */}
                <div className="hidden md:flex flex-col w-64 border-r border-neutral-200/55 bg-neutral-50/25 p-4 shrink-0">
                  <button
                    onClick={handleCreateSession}
                    className="btn-glass-primary w-full py-2.5 mb-3 text-[10px] uppercase tracking-wider font-bold shadow-xs hover-lift flex items-center justify-center gap-1.5"
                  >
                    <Plus size={13} /> New Conversation
                  </button>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-3 text-neutral-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white/60 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] uppercase font-bold tracking-widest text-neutral-400 mb-2.5 px-1 font-sans">
                    <span>History</span>
                    <button
                      onClick={() => setSessionSortOrder((p) => p === 'desc' ? 'asc' : 'desc')}
                      className="hover:text-black flex items-center gap-1 transition-colors"
                    >
                      <Clock size={10} /> Sort
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 font-sans">
                    {isSessionsLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : filteredSessions.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 text-xs">No conversations</div>
                    ) : (
                      filteredSessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setActiveSessionId(s.id)}
                          className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                            activeSessionId === s.id 
                              ? 'bg-neutral-900 text-white shadow-md shadow-black/10' 
                              : 'hover:bg-neutral-100 text-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate text-xs">
                            <FileText size={13} className={activeSessionId === s.id ? 'text-white' : 'text-neutral-400'} />
                            <span className="truncate pr-1 font-semibold">{s.title}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-1 hover:bg-white/15 rounded"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ACTIVE CONVERSATION CANVAS */}
                <div className="flex-1 flex flex-col justify-between bg-neutral-50/15 backdrop-blur-sm relative">
                  <div className="flex-1 overflow-y-auto p-5 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {(!activeSession || activeSession.messages.length === 0) && !isStreaming ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-12">
                        <div className="mk w-12 h-12 mb-5 scale-125 bg-neutral-900 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xl shadow-black/10">IB</div>
                        <h2 className="text-lg font-sans font-extrabold text-neutral-900 mb-2">Operations Cognitive Engine</h2>
                        <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
                          Ask safety procedures, check conveyor status, inspect thermal logs, analyze control panels, or upload plant machine photos.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeSession?.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3.5 max-w-3xl ${msg.sender === 'me' ? 'ml-auto justify-end' : 'mr-auto justify-start'} animate-fadeIn`}
                          >
                            {msg.sender === 'bot' && (
                              <div className="w-6 h-6 shrink-0 mt-1.5 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-[8px] font-bold shadow-md">IB</div>
                            )}
                                                      <div className="space-y-1">
                              <div
                                className={`p-4 rounded-2xl text-xs leading-relaxed max-w-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border transition-all ${
                                  msg.sender === 'me'
                                    ? 'bg-neutral-900/90 text-white border-neutral-950 font-medium rounded-tr-sm'
                                    : msg.isWarning
                                      ? 'bg-red-50/85 border-red-200 text-red-900 font-medium rounded-tl-sm'
                                      : 'bg-white/80 border-neutral-200/40 text-neutral-800 backdrop-blur-md rounded-tl-sm'
                                }`}
                                style={{ whiteSpace: 'pre-line' }}
                              >
                                {msg.text}
                              </div>

                              {/* Rich Enterprise Answer Metadata */}
                              {msg.sender === 'bot' && (
                                <div className="flex flex-wrap gap-1.5 items-center mt-1.5 text-[10px] font-mono text-neutral-400 pl-1">
                                  {msg.confidence !== undefined && (
                                    <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                      Confidence: <b>{(msg.confidence * 100).toFixed(0)}%</b>
                                    </span>
                                  )}
                                  {msg.sourceDoc && (
                                    <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                      Source: <b>{msg.sourceDoc}</b>
                                    </span>
                                  )}
                                  {msg.relatedDocs && msg.relatedDocs.length > 0 && (
                                    <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium">
                                      Related: <b>{msg.relatedDocs.join(', ')}</b>
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleSpeakText(msg.id, msg.text)}
                                    className="hover:text-black p-1 bg-neutral-100 hover:bg-neutral-200/80 rounded-full transition-all"
                                    title="Speak response"
                                  >
                                    <Volume2 size={11} className={speakingMsgId === msg.id ? 'animate-pulse text-red-500' : ''} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {msg.sender === 'me' && (
                              <img
                                src={currentUserPhoto}
                                alt="Me"
                                className="w-6 h-6 object-cover rounded-full border border-neutral-200 shrink-0 mt-1.5 shadow-sm"
                              />
                            )}
                          </div>
                        ))}

                        {/* Streaming response */}
                        {isStreaming && streamingText && (
                          <div className="flex gap-3.5 max-w-3xl mr-auto justify-start">
                            <div className="w-6 h-6 shrink-0 mt-1.5 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-[8px] font-bold animate-pulse">IB</div>
                            <div className="space-y-1">
                              <div
                                className={`p-4 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border bg-white/80 border-neutral-200/40 text-neutral-800 backdrop-blur-md`}
                                style={{ whiteSpace: 'pre-line' }}
                              >
                                {streamingText}
                                <span className="inline-block w-1.5 h-3.5 bg-neutral-900 animate-pulse ml-1 align-middle"></span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>

                  {/* CHAT INPUT AREA */}
                  <div className="p-4 border-t border-neutral-200/40 bg-white/65 backdrop-blur-md font-sans">
                    {chatImageBase64 && (
                      <div className="relative inline-block mb-3 border border-neutral-200/50 p-1.5 rounded-xl bg-white/80 shadow-md">
                        <img src={chatImageBase64} alt="Upload preview" className="h-16 w-16 object-cover rounded-lg" />
                        <button
                          onClick={() => setChatImageBase64(null)}
                          className="absolute -top-2 -right-2 bg-neutral-900 text-white hover:bg-black rounded-full p-1 shadow-md transition-all text-[8px]"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}

                    {speechError && (
                      <div className="text-[11px] text-red-600 bg-red-50/70 border border-red-100 px-3 py-1.5 rounded-xl mb-2 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5">⚠️ {speechError}</span>
                        <button type="button" onClick={() => setSpeechError('')} className="text-red-400 hover:text-red-700 font-bold ml-2">×</button>
                      </div>
                    )}

                    <form onSubmit={handleSendChat} className="flex gap-2 items-center border border-neutral-200/70 rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] bg-neutral-50/70 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5 focus-within:border-neutral-900/30 transition-all duration-300">
                      <input
                        type="text"
                        className="flex-1 text-xs outline-none bg-transparent py-2 px-1 text-neutral-800 placeholder-neutral-400"
                        placeholder={isStreaming ? 'Thinking...' : 'Query manuals, procedures, panels or ask anything...'}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={isStreaming}
                      />

                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'text-neutral-400 hover:text-black hover:bg-neutral-100'}`}
                        title="Talk to assistant"
                      >
                        <Mic size={14} />
                      </button>

                      <button
                        type="submit"
                        className="btn-glass-primary p-2.5 w-9 h-9 rounded-xl text-white shrink-0 flex items-center justify-center hover-lift"
                        disabled={isStreaming || (!chatInput.trim() && !chatImageBase64)}
                      >
                        {isStreaming ? '...' : <ArrowRight size={13} />}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENTS VIEW */}
            {activeTab === 'docs' && (
              <div className="space-y-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                />

                <div
                  className={`uploadStrip rounded border-2 border-neutral-300 p-8 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-black bg-neutral-50 scale-[0.99]' : 'border-dashed hover:border-neutral-900 hover:bg-neutral-50/30'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-2 text-neutral-400" size={24} />
                  <b className="text-sm font-sans block text-neutral-800 mb-1">Drag &amp; drop files here, or click to browse</b>
                  <div className="text-[10px] text-neutral-400 font-mono">Supports PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, PNG, WEBP</div>
                </div>

                <div className="bg-white border border-neutral-200 rounded overflow-hidden shadow-xs">
                  <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                      Document Inventory ({documents.length})
                    </h3>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 hover:bg-neutral-50/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 bg-neutral-100 rounded flex items-center justify-center text-xs font-mono font-bold text-neutral-700 shrink-0">
                            {doc.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-neutral-900">{doc.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase ${
                                doc.status === 'Approved'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : doc.status === 'Rejected'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              }`}>
                                {doc.status || 'Pending'}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              Size: {doc.size} · Version: {doc.version || 1} · Uploaded {doc.uploadedAt}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            onClick={() => setViewDocDetailTarget(doc)}
                            className="px-2.5 py-1 text-[10px] font-semibold border border-neutral-200 rounded hover:border-black transition-all bg-white"
                          >
                            Analyze
                          </button>
                          
                          {/* Approval / Rejection buttons for owner/manager */}
                          {doc.status !== 'Approved' && (
                            <button
                              onClick={() => onApproveDocument(doc.id, 'Approved')}
                              className="px-2 py-1 text-[10px] font-semibold bg-green-900 text-white rounded hover:bg-green-800 transition-all flex items-center gap-0.5"
                            >
                              <Check size={10} /> Approve
                            </button>
                          )}
                          {doc.status !== 'Rejected' && (
                            <button
                              onClick={() => onApproveDocument(doc.id, 'Rejected')}
                              className="px-2 py-1 text-[10px] font-semibold bg-red-950 text-red-100 border border-red-800 rounded hover:bg-red-900 transition-all flex items-center gap-0.5"
                            >
                              <X size={10} /> Reject
                            </button>
                          )}

                          <button
                            onClick={() => triggerRename(doc)}
                            className="p-1 text-neutral-400 hover:text-black border border-transparent hover:border-neutral-200 rounded"
                            title="Rename"
                          >
                            <Edit size={11} />
                          </button>
                          <button
                            onClick={() => setDeleteDocumentTarget(doc)}
                            className="p-1 text-neutral-400 hover:text-red-600 border border-transparent hover:border-neutral-200 rounded"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-center py-12 text-neutral-400 text-xs font-mono">No uploaded manuals indexed yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS VIEW */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-200 p-4 rounded shadow-xs">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Total Documents</div>
                    <div className="text-2xl font-bold text-neutral-900 mt-1">{documents.length}</div>
                    <div className="text-[10px] text-green-600 font-mono flex items-center gap-0.5 mt-2">
                      <span>●</span> {documents.filter(d => d.status === 'Approved').length} Approved
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded shadow-xs">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Indexed Equipment</div>
                    <div className="text-2xl font-bold text-neutral-900 mt-1">{equipment.length}</div>
                    <div className="text-[10px] text-yellow-600 font-mono mt-2">
                      {equipment.filter(eq => eq.status !== 'Operational').length} require maintenance
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded shadow-xs">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Worker Reports</div>
                    <div className="text-2xl font-bold text-neutral-900 mt-1">{reports.length}</div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-2">
                      Incidents reported today
                    </div>
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded shadow-xs">
                    <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Control Logins</div>
                    <div className="text-2xl font-bold text-neutral-900 mt-1">
                      {logs.filter(l => l.action.toLowerCase().includes('sign in')).length}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-2">
                      Active operator sessions
                    </div>
                  </div>
                </div>

                {/* VISUALLY POLISHED CUSTOM CHART */}
                <div className="bg-white border border-neutral-200 p-5 rounded shadow-xs">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-6">
                    Activity Operations Density Ledger
                  </h3>
                  
                  <div className="h-48 flex items-end justify-between gap-2 border-b border-l border-neutral-200 pb-1 pl-1 font-mono text-[9px] text-neutral-400 relative">
                    {/* SVG Line Graph Overlay */}
                    <div className="absolute inset-0 pt-4 pb-2 px-6">
                      <svg viewBox="0 0 500 100" className="w-full h-full" preserveAspectRatio="none">
                        <path
                          d="M 0 80 Q 100 40 200 60 T 400 20 T 500 10"
                          fill="none"
                          stroke="#171717"
                          strokeWidth="2.5"
                        />
                        <path
                          d="M 0 80 Q 100 40 200 60 T 400 20 T 500 10 L 500 100 L 0 100 Z"
                          fill="url(#gradient-chart)"
                          opacity="0.06"
                        />
                        <defs>
                          <linearGradient id="gradient-chart" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#000000" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <circle cx="200" cy="60" r="4" fill="#000" stroke="#fff" strokeWidth="1.5" />
                        <circle cx="400" cy="20" r="4" fill="#000" stroke="#fff" strokeWidth="1.5" />
                      </svg>
                    </div>

                    <div className="flex flex-col items-center shrink-0 w-1/6">
                      <div className="text-[10px] font-bold text-neutral-900 mb-1">08:00</div>
                      <div className="w-1.5 h-12 bg-neutral-200 rounded-t"></div>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-1/6">
                      <div className="text-[10px] font-bold text-neutral-900 mb-1">10:00</div>
                      <div className="w-1.5 h-24 bg-neutral-300 rounded-t"></div>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-1/6">
                      <div className="text-[10px] font-bold text-neutral-900 mb-1">12:00</div>
                      <div className="w-1.5 h-16 bg-neutral-400 rounded-t"></div>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-1/6">
                      <div className="text-[10px] font-bold text-neutral-900 mb-1">14:00</div>
                      <div className="w-1.5 h-32 bg-neutral-900 rounded-t"></div>
                    </div>
                    <div className="flex flex-col items-center shrink-0 w-1/6">
                      <div className="text-[10px] font-bold text-neutral-900 mb-1">16:00</div>
                      <div className="w-1.5 h-20 bg-neutral-500 rounded-t"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EQUIPMENT VIEW */}
            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white border border-neutral-200 px-4 py-3 rounded shadow-xs">
                  <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                    Machine Index Registry ({equipment.length})
                  </h3>
                  <button
                    onClick={() => openEquipmentForm()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold tracking-wider uppercase rounded"
                  >
                    <Plus size={13} /> Add Machine
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipment.map((eq) => (
                    <div key={eq.id} className="bg-white border border-neutral-200 rounded p-4 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                              {eq.id}
                            </span>
                            <h4 className="text-sm font-semibold text-neutral-900 mt-1.5">{eq.name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase ${
                            eq.status === 'Operational'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : eq.status === 'Shutdown'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          }`}>
                            {eq.status}
                          </span>
                        </div>

                        <div className="text-xs text-neutral-500 space-y-1 mt-3 font-sans">
                          <div>📍 Location: <b className="text-neutral-700">{eq.location}</b></div>
                          <div>🏭 Dept: <b className="text-neutral-700">{eq.department}</b></div>
                          {eq.sector && <div>⚙️ Sector: <b className="text-neutral-700">{eq.sector}</b></div>}
                          {eq.machineType && <div>🔧 Type: <b className="text-neutral-700">{eq.machineType}</b></div>}
                          {eq.manualCategory && <div>📂 Category: <b className="text-neutral-700">{eq.manualCategory}</b></div>}
                          {eq.manual && (
                            <div className="flex items-center gap-1">
                              📘 Associated SOP: <span className="font-semibold text-neutral-900 underline truncate block max-w-[150px]">{eq.manual}</span>
                            </div>
                          )}
                          {eq.files && eq.files.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-neutral-100">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 block mb-1">Attached Files ({eq.files.length})</span>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {eq.files.map((file: any) => (
                                  <button
                                    key={file.id}
                                    onClick={() => setPreviewingMachineFile(file)}
                                    className="flex items-center gap-1 text-[11px] text-neutral-600 hover:text-black hover:underline text-left w-full truncate font-medium font-sans"
                                  >
                                    📎 <span className="truncate">{file.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {eq.notes && (
                          <p className="text-[11px] text-neutral-400 bg-neutral-50 p-2 border border-neutral-100 rounded mt-3.5 leading-relaxed font-sans">
                            {eq.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end gap-1.5 border-t border-neutral-100 pt-3 mt-4">
                        <button
                          onClick={() => openEquipmentForm(eq)}
                          className="p-1 text-neutral-400 hover:text-black border border-transparent hover:border-neutral-200 rounded"
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteEquipmentTarget(eq)}
                          className="p-1 text-neutral-400 hover:text-red-600 border border-transparent hover:border-neutral-200 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REPORTS VIEW */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white border border-neutral-200 px-4 py-3 rounded shadow-xs">
                  <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                    Incident Dispatch Log
                  </h3>
                  <button
                    onClick={handleExportReports}
                    className="flex items-center gap-1 px-3 py-1.5 border border-neutral-200 hover:border-black text-xs font-semibold tracking-wider uppercase bg-white rounded"
                  >
                    <Download size={13} /> Export Ledger (CSV)
                  </button>
                </div>

                <div className="bg-white border border-neutral-200 rounded overflow-hidden shadow-xs">
                  <div className="divide-y divide-neutral-100">
                    {reports.map((r) => (
                      <div key={r.id} className="p-4 hover:bg-neutral-50/20 transition-all flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-900">{r.title}</span>
                            <span className="text-[9px] font-mono tracking-wider uppercase bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                              {r.type}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 leading-relaxed font-sans max-w-2xl">{r.description}</p>
                          <div className="text-[10px] text-neutral-400 font-mono mt-2">
                            Report ID: {r.id} · Dispatcher: <b>{r.workerName}</b> · {r.timestamp}
                          </div>
                        </div>
                        {r.photo && (
                          <div className="shrink-0">
                            <a href={r.photo} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden border border-neutral-200 rounded-xl shadow-sm">
                              <img
                                src={r.photo}
                                alt="Damage attachment"
                                className="w-24 h-24 object-cover group-hover:scale-105 transition-all duration-300"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-bold uppercase tracking-wider">
                                View Full
                              </div>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                    {reports.length === 0 && (
                      <div className="text-center py-12 text-neutral-400 text-xs font-mono">No floor incident logs filed.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MANAGE ACCOUNTS & EMPLOYEE PROFILES */}
            {activeTab === 'accounts' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ACCOUNT CREATION */}
                <div className="bg-white border border-neutral-200 p-5 rounded shadow-xs h-fit">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
                    Register New ID
                  </h3>

                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    {/* Profile Photo Upload Field */}
                    <div className="flex flex-col items-center justify-center pb-4 border-b border-neutral-100 mb-4">
                      <div 
                        onClick={() => createPhotoInputRef.current?.click()}
                        className="w-24 h-24 rounded-full relative overflow-visible mx-auto border border-neutral-200 shadow bg-neutral-50/50 hover:scale-[1.03] active:scale-[0.99] transition-all duration-300 cursor-pointer flex items-center justify-center group"
                      >
                        {newPhoto ? (
                          <img
                            src={newPhoto}
                            alt="Person profile photo"
                            className="w-full h-full object-cover rounded-full border border-neutral-200/60 shadow-inner"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-neutral-900 text-white font-bold text-xl flex items-center justify-center uppercase shadow-inner">
                            {getInitials(newName)}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 bg-neutral-900 text-white hover:bg-black p-2 rounded-full border border-white shadow-md flex items-center justify-center transition-all">
                          <Camera size={12} />
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1.5 mt-2.5 text-center">
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => createPhotoInputRef.current?.click()}
                            className="text-[10px] font-bold uppercase tracking-wider text-neutral-800 hover:text-black transition-all hover:underline"
                          >
                            Upload Photo
                          </button>
                          {newPhoto && (
                            <button
                              type="button"
                              onClick={() => setNewPhoto('')}
                              className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-all hover:underline"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                        <span className="text-[8px] text-neutral-400 font-sans uppercase tracking-wider font-semibold">JPG or JPEG, max 5 MB</span>
                      </div>

                      <input
                        type="file"
                        ref={createPhotoInputRef}
                        onChange={(e) => {
                          setNewPhotoError('');
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 5 * 1024 * 1024) {
                            setNewPhotoError('File size exceeds 5 MB.');
                            return;
                          }

                          const fileName = file.name.toLowerCase();
                          const isValid = file.type === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
                          if (!isValid) {
                            setNewPhotoError('Only JPG or JPEG images are allowed.');
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setNewPhoto(event.target?.result as string);
                          };
                          reader.onerror = () => {
                            setNewPhotoError('Error reading file.');
                          };
                          reader.readAsDataURL(file);
                        }}
                        accept="image/jpeg, image/jpg"
                        className="hidden"
                      />

                      {newPhotoError && (
                        <div className="text-[10px] text-red-500 font-medium mt-2 p-1.5 bg-red-50/50 border border-red-100 rounded-lg text-center max-w-[200px]">
                          ⚠️ {newPhotoError}
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Alok Sharma"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full text-xs p-2 border-b border-neutral-200 outline-none focus:border-black bg-neutral-50/50 mt-1"
                      />
                    </div>
                    <div className="field">
                      <label className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Employee ID / Code</label>
                      <input
                        type="text"
                        placeholder="e.g., m-105"
                        value={newId}
                        onChange={(e) => setNewId(e.target.value)}
                        className="w-full text-xs p-2 border-b border-neutral-200 outline-none focus:border-black bg-neutral-50/50 mt-1"
                      />
                    </div>
                    <div className="field">
                      <label className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Secret Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        className="w-full text-xs p-2 border-b border-neutral-200 outline-none focus:border-black bg-neutral-50/50 mt-1"
                      />
                    </div>
                    <div className="field">
                      <label className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Organizational Role</label>
                      <select
                        value={newRole}
                        onChange={(e: any) => setNewRole(e.target.value)}
                        className="w-full text-xs p-2 border-b border-neutral-200 outline-none bg-white focus:border-black mt-1"
                      >
                        <option value="worker">Worker / Operator</option>
                        {currentUser.role === 'owner' && (
                          <>
                            <option value="manager">Manager / Shift Lead</option>
                            <option value="owner">System Owner</option>
                          </>
                        )}
                      </select>
                    </div>

                    {accountMsg.text && (
                      <p className={`text-[11px] font-mono mt-2 ${accountMsg.isError ? 'text-red-600' : 'text-green-600'}`}>
                        {accountMsg.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold tracking-wider uppercase transition-all mt-4 rounded"
                    >
                      Authorize Credentials
                    </button>
                  </form>
                </div>

                {/* EMPLOYEE DIRECTORY */}
                <div className="bg-white border border-neutral-200 p-5 rounded shadow-xs lg:col-span-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
                    Authorized Employee Directory ({employees.length})
                  </h3>

                  <div className="divide-y divide-neutral-100">
                    {employees.map((emp) => (
                      <div key={emp.employeeId} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {emp.photo ? (
                            <img
                              src={emp.photo}
                              alt={emp.name}
                              className="w-9 h-9 object-cover rounded-full border border-neutral-200 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center uppercase shrink-0 border border-neutral-200 shadow-sm">
                              {getInitials(emp.name)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-neutral-900">{emp.name}</span>
                              <span className="text-[9px] font-mono uppercase bg-neutral-100 text-neutral-500 px-1 py-0.2 rounded">
                                {emp.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              ID: {emp.employeeId} · {emp.department} · {emp.email || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEmployeeForm(emp)}
                            className="p-1 text-neutral-400 hover:text-black border border-transparent hover:border-neutral-200 rounded"
                            title="Edit employee details"
                          >
                            <Edit size={12} />
                          </button>
                          {emp.employeeId !== '80079385' && (currentUser.role === 'owner' || (currentUser.role === 'manager' && emp.role === 'worker')) && (
                            <button
                              onClick={() => {
                                const targetAcc = accounts.find(a => a.id === emp.employeeId);
                                if (targetAcc) setDeleteAccountTarget(targetAcc);
                              }}
                              className="p-1 text-neutral-400 hover:text-red-500 border border-transparent hover:border-neutral-200 rounded"
                              title="Revoke access"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITY LOGS VIEW */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div className="bg-white border border-neutral-200 p-4 rounded shadow-xs flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    System Security Dispatch Log
                  </h3>
                </div>

                <div className="bg-white border border-neutral-200 rounded overflow-hidden shadow-xs">
                  <table className="w-full text-left font-mono text-[11px] text-neutral-600">
                    <thead className="bg-neutral-50 border-b border-neutral-200 uppercase tracking-wider text-neutral-400 text-[10px]">
                      <tr>
                        <th className="p-3">Operator</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Action Completed</th>
                        <th className="p-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-mono">
                      {logs.map((l) => {
                        const matchedEmp = employees.find((e) => e.name === l.user);
                        const hasPhoto = !!matchedEmp?.photo;
                        return (
                          <tr key={l.id} className="hover:bg-neutral-50/20">
                            <td className="p-3 font-semibold text-neutral-900 flex items-center gap-2">
                              {hasPhoto ? (
                                <img
                                  src={matchedEmp.photo}
                                  alt={l.user}
                                  className="w-5 h-5 object-cover rounded-full border border-neutral-200/50 shrink-0 shadow-xs"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-neutral-900 text-white font-extrabold text-[8px] flex items-center justify-center uppercase shrink-0 border border-neutral-200 shadow-xs">
                                  {getInitials(l.user)}
                                </div>
                              )}
                              <span>{l.user}</span>
                            </td>
                            <td className="p-3 uppercase text-[10px] text-neutral-400">{l.role}</td>
                            <td className="p-3 text-neutral-700">{l.action}</td>
                            <td className="p-3 text-right text-neutral-400">
                              {l.date} · {l.time}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EMERGENCY CENTER */}
            {activeTab === 'emergency' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* EMERGENCY NOTIFICATION ACTION BAR */}
                <div className="bg-red-950 border border-red-800 text-red-100 p-5 rounded shadow-xs flex flex-col justify-between h-fit lg:col-span-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="text-red-400" size={16} /> RED ALERT SEQUENCE TRIGGER
                    </h3>
                    <p className="text-xs text-red-200 leading-relaxed max-w-3xl">
                      Triggering red alert broadcast notifies every shift safety officer, sounds visual sirens on the plant floor, and displays evacuation directions directly on workers terminals. Use with caution.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 self-end">
                    <button
                      onClick={() => alert('RED ALERT ISSUED: Sirens initialized on plant floors Sectors 1-4. Shift Lead notified.')}
                      className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all rounded"
                    >
                      BroadCast Red Alert
                    </button>
                    <button
                      onClick={() => alert('ALL CLEAR broadcast sent. Plant operations resuming.')}
                      className="bg-neutral-900 text-red-200 hover:bg-neutral-800 px-4 py-2 text-xs font-semibold tracking-wider uppercase transition-all rounded border border-red-800"
                    >
                      All Clear Signals
                    </button>
                  </div>
                </div>

                {/* PROCEDURAL DIRECTS */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-neutral-200 p-5 rounded shadow-xs">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        Operational Safety SOP Master Files
                      </h3>
                      {!isEditingEmergency ? (
                        <button
                          onClick={() => setIsEditingEmergency(true)}
                          className="text-xs font-semibold border border-neutral-200 px-2.5 py-1 hover:border-black rounded bg-white"
                        >
                          Modify Protocols
                        </button>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleSaveEmergency}
                            className="text-xs font-semibold bg-neutral-900 text-white px-2.5 py-1 hover:bg-neutral-800 rounded"
                          >
                            Save Rules
                          </button>
                          <button
                            onClick={() => setIsEditingEmergency(false)}
                            className="text-xs font-semibold border border-neutral-200 px-2.5 py-1 hover:border-black rounded bg-white"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditingEmergency ? (
                      <div className="space-y-4">
                        <div className="field">
                          <label className="text-[10px] font-mono uppercase text-neutral-400">Fire Emergency Procedure</label>
                          <textarea
                            value={emFire}
                            onChange={(e) => setEmFire(e.target.value)}
                            className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-20 font-mono"
                          />
                        </div>
                        <div className="field">
                          <label className="text-[10px] font-mono uppercase text-neutral-400">Chemical Spill SOP</label>
                          <textarea
                            value={emChem}
                            onChange={(e) => setEmChem(e.target.value)}
                            className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-20 font-mono"
                          />
                        </div>
                        <div className="field">
                          <label className="text-[10px] font-mono uppercase text-neutral-400">Emergency Shutdown Sequence</label>
                          <textarea
                            value={emShutdown}
                            onChange={(e) => setEmShutdown(e.target.value)}
                            className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-20 font-mono"
                          />
                        </div>
                        <div className="field">
                          <label className="text-[10px] font-mono uppercase text-neutral-400">Plant Assembly Points</label>
                          <textarea
                            value={emAssembly}
                            onChange={(e) => setEmAssembly(e.target.value)}
                            className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-16 font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs font-sans text-neutral-700 leading-relaxed">
                        <div className="border-b border-neutral-100 pb-3">
                          <h4 className="font-bold text-neutral-900 mb-1">🔥 Fire Emergency Procedure</h4>
                          <p className="whitespace-pre-wrap">{emergency.fireProcedures || 'Evacuate immediately.'}</p>
                        </div>
                        <div className="border-b border-neutral-100 pb-3">
                          <h4 className="font-bold text-neutral-900 mb-1">🧪 Chemical Spill SOP</h4>
                          <p className="whitespace-pre-wrap">{emergency.chemicalSpillSops || 'Wear PPE and isolate leak.'}</p>
                        </div>
                        <div className="border-b border-neutral-100 pb-3">
                          <h4 className="font-bold text-neutral-900 mb-1">🚨 Emergency Shutdown Sequence</h4>
                          <p className="whitespace-pre-wrap">{emergency.emergencyShutdown || 'Press emergency stop mushroom buttons.'}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral-900 mb-1">📍 Plant Assembly Points</h4>
                          <p className="whitespace-pre-wrap">{emergency.assemblyPoints || 'Assembly Zone Alpha (West Gate).'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* EMERGENCY QUICK CONTACTS */}
                <div className="bg-white border border-neutral-200 p-5 rounded shadow-xs h-fit">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
                    Emergency Hotline Directory
                  </h3>
                  <div className="space-y-3 font-sans">
                    {getEmergencyContacts().map((c, idx) => {
                      const isEditing = editingContactIdx === idx;
                      const hasEditPermission = canEditContact(idx);
                      const isPhoneAvailable = c.phone && c.phone !== 'Not Added';
                      const cleanPhone = c.phone ? c.phone.replace(/\s+/g, '') : '';

                      return (
                        <div key={idx} className="py-2 border-b border-neutral-100 text-xs flex flex-col gap-2">
                          {isEditing ? (
                            <div className="space-y-2">
                              {/* If Owner, or if Safety Department, allow editing Name/Label */}
                              {(currentUser.role === 'owner' || (currentUser.role === 'manager' && idx === 2)) ? (
                                <div>
                                  <label className="text-[10px] uppercase font-mono text-neutral-400">Label</label>
                                  <input
                                    type="text"
                                    value={editContactName}
                                    onChange={(e) => setEditContactName(e.target.value)}
                                    className="w-full text-xs p-1 border border-neutral-200 outline-none bg-white focus:border-black mt-0.5"
                                  />
                                </div>
                              ) : (
                                <div className="font-bold text-neutral-900">{c.name}</div>
                              )}

                              {/* Only Owner/Manager can edit Phone for certain items */}
                              {idx < 3 ? (
                                <div>
                                  <label className="text-[10px] uppercase font-mono text-neutral-400">Phone Number</label>
                                  <input
                                    type="text"
                                    value={editContactPhone}
                                    onChange={(e) => setEditContactPhone(e.target.value)}
                                    className="w-full text-xs p-1 border border-neutral-200 outline-none bg-white focus:border-black mt-0.5"
                                    placeholder="e.g. +91 98765 12345"
                                  />
                                </div>
                              ) : (
                                <div className="text-neutral-500 font-mono font-bold">{c.phone}</div>
                              )}

                              <div className="flex justify-end gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveContact(idx)}
                                  className="px-2 py-1 bg-black text-white text-[10px] font-semibold uppercase tracking-wider rounded hover:opacity-80 transition-all"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingContactIdx(null)}
                                  className="px-2 py-1 border border-neutral-200 text-neutral-600 text-[10px] font-semibold uppercase tracking-wider rounded hover:bg-neutral-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <div className="font-bold text-neutral-900 flex items-center gap-2">
                                  <span>{c.name}</span>
                                  {hasEditPermission && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingContactIdx(idx);
                                        setEditContactName(c.name);
                                        setEditContactPhone(c.phone === 'Not Added' ? '' : c.phone);
                                      }}
                                      className="text-neutral-400 hover:text-black p-0.5 transition-colors"
                                      title="Edit contact"
                                    >
                                      <Edit size={10} />
                                    </button>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">{c.role}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isPhoneAvailable ? (
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    className="font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded hover:bg-neutral-200 transition-colors"
                                  >
                                    {c.phone}
                                  </a>
                                ) : (
                                  <span className="font-mono font-medium text-neutral-400 bg-neutral-50 px-2 py-1 rounded border border-neutral-100">
                                    Not Added
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE ACCOUNT MODAL */}
      {deleteAccountTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900 mb-2">
              Confirm Account Deletion
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete account <b>{deleteAccountTarget.name}</b> (ID: {deleteAccountTarget.id})?
              This action cannot be undone. All credentials and access logs for this user will be completely purged.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-wider hover:border-black transition-all"
                onClick={() => setDeleteAccountTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-all"
                onClick={confirmDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DOCUMENT MODAL */}
      {deleteDocumentTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900 mb-2">
              Delete Document from Index
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <b>{deleteDocumentTarget.name}</b>?
              This file will be completely unindexed. AI agents and workers will no longer be able to query its guidelines.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-wider hover:border-black transition-all"
                onClick={() => setDeleteDocumentTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-all"
                onClick={async () => {
                  await onDeleteDocument(deleteDocumentTarget.id);
                  setDeleteDocumentTarget(null);
                }}
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE EQUIPMENT MODAL */}
      {deleteEquipmentTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-black max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold uppercase tracking-wider text-neutral-900 mb-2">Delete Machine?</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-sans mb-6">
              Are you sure you want to permanently delete machine <b>{deleteEquipmentTarget.name}</b>? This action cannot be undone. All associated files and its AI index/knowledge will be permanently deleted.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-neutral-200 text-[11px] font-mono hover:border-black uppercase transition-all"
                onClick={() => setDeleteEquipmentTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-mono uppercase transition-all"
                onClick={async () => {
                  await onDeleteEquipment(deleteEquipmentTarget);
                  setDeleteEquipmentTarget(null);
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MACHINE FILE PREVIEW MODAL */}
      {previewingMachineFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[110] p-4">
          <div className="bg-white border border-black max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-2 truncate">
              Preview: {previewingMachineFile.name}
            </h4>
            <div className="text-[10px] text-neutral-400 font-mono mb-4 border-b border-neutral-100 pb-2">
              Size: {previewingMachineFile.size} · Uploaded: {previewingMachineFile.uploadedAt}
            </div>
            
            <div className="flex-1 overflow-y-auto text-xs text-neutral-700 font-sans p-4 bg-neutral-50 border border-neutral-200 rounded whitespace-pre-wrap leading-relaxed">
              {previewingMachineFile.text || '[No text content extracted]'}
            </div>
            
            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-neutral-100 shrink-0">
              <button
                type="button"
                className="px-4 py-2 bg-neutral-900 text-white text-[11px] font-mono hover:bg-neutral-800 uppercase transition-all"
                onClick={() => setPreviewingMachineFile(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENAME DOCUMENT MODAL */}
      {renameDocumentTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900 mb-2">
              Rename Indexed Document
            </h3>
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">
              Current Name: {renameDocumentTarget.name}
            </p>
            <div className="field mb-4">
              <label>New File Name</label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter filename"
                className="w-full text-sm p-2 border-b border-gray-300 outline-none focus:border-black"
                style={{ width: '100%', maxWidth: 'none' }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-wider hover:border-black transition-all"
                onClick={() => setRenameDocumentTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-all"
                onClick={() => {
                  if (renameDocumentTarget && renameValue.trim()) {
                    onRenameDocument(renameDocumentTarget.id, renameValue.trim());
                    setRenameDocumentTarget(null);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED DOCUMENT DRAWERS / SPECIFICATION MODALS */}
      {viewDocDetailTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-3xl w-full p-6 shadow-2xl relative flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 flex items-center gap-1.5">
                  <FileText size={16} /> Document Intelligence Analyzer
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Name: {viewDocDetailTarget.name} · Chunks: {viewDocDetailTarget.chunks} · Status: {viewDocDetailTarget.status}
                </p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-black font-semibold text-lg"
                onClick={() => setViewDocDetailTarget(null)}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-sans">
              {/* AI-Generated Summary */}
              {viewDocDetailTarget.summary && (
                <div className="bg-neutral-50 p-3.5 border border-neutral-150 rounded">
                  <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[10px] mb-1">🤖 AI-Generated Abstract Summary</h4>
                  <p className="text-neutral-700 leading-relaxed font-sans">{viewDocDetailTarget.summary}</p>
                </div>
              )}

              {/* Safety, warnings, PPE, emergency split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-3.5 border border-green-150 rounded text-green-900">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-green-800 mb-1.5">✅ Key Safety Mandates</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {(viewDocDetailTarget.safetyPoints || ['Conduct atmospheric checks prior to entrance']).map((p, idx) => (
                      <li key={idx} className="leading-relaxed font-sans">{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 p-3.5 border border-red-150 rounded text-red-900">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-red-800 mb-1.5">⚠️ Critical Warnings</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {(viewDocDetailTarget.warnings || ['Do not entry without respiratory gear']).map((p, idx) => (
                      <li key={idx} className="leading-relaxed font-sans">{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-neutral-50 p-3.5 border border-neutral-150 rounded">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-neutral-800 mb-1.5">🛡️ PPE Equipment Standards</h4>
                  <div className="flex flex-wrap gap-1 mt-1 font-mono">
                    {(viewDocDetailTarget.ppe || ['Safety Harness', 'Gas Detector', 'Oxygen Meter']).map((item, idx) => (
                      <span key={idx} className="bg-white border border-neutral-200 px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 p-3.5 border border-yellow-150 rounded text-yellow-900">
                  <h4 className="font-bold uppercase tracking-wider text-[10px] text-yellow-800 mb-1">🚨 Emergency Protocol SOP</h4>
                  <p className="leading-relaxed font-sans mt-1">{viewDocDetailTarget.emergencyProcedures || 'Evacuate immediately.'}</p>
                </div>
              </div>

              {/* Revision Date & Keywords */}
              <div className="flex justify-between text-[11px] text-neutral-400 font-mono bg-neutral-50/50 p-2 border border-neutral-100 rounded">
                <div>Revision Date: <b>{viewDocDetailTarget.revisionDate || '2026-06-24'}</b></div>
                <div className="truncate">Keywords: <b>{(viewDocDetailTarget.keywords || ['coke oven']).join(', ')}</b></div>
              </div>

              {/* Version control */}
              <div className="border border-neutral-200 rounded p-3 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-neutral-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <History size={12} /> Version Ledger ({viewDocDetailTarget.versions?.length || 1})
                  </h4>
                  <button
                    onClick={() => setIsNewVersionFormOpen(!isNewVersionFormOpen)}
                    className="px-2 py-1 border border-neutral-200 text-[10px] hover:border-black font-semibold rounded"
                  >
                    {isNewVersionFormOpen ? 'Cancel' : 'Upload New Version'}
                  </button>
                </div>

                {isNewVersionFormOpen ? (
                  <div className="space-y-2 bg-neutral-50 p-2.5 rounded border border-neutral-150">
                    <textarea
                      placeholder="Paste updated document text contents here..."
                      value={newVersionText}
                      onChange={(e) => setNewVersionText(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-300 outline-none rounded bg-white h-24 font-mono"
                    />
                    <button
                      onClick={handleUploadNewVersion}
                      className="bg-neutral-900 text-white px-3 py-1.5 rounded text-[10px] uppercase font-semibold tracking-wider hover:bg-neutral-800 transition-colors"
                      disabled={!newVersionText.trim()}
                    >
                      Publish Version {(viewDocDetailTarget.version || 1) + 1}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-[10px] divide-y divide-neutral-100 max-h-24 overflow-y-auto pr-1">
                    {(viewDocDetailTarget.versions || [{ version: 1, text: 'Initial upload', uploadedAt: viewDocDetailTarget.uploadedAt || '' }]).map((v, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between items-center">
                        <div>
                          Version <b>{v.version}</b> · <span className="text-neutral-400">{v.uploadedAt}</span>
                        </div>
                        <span className="text-neutral-400">Indexed</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Document Text Preview */}
              <div className="bg-neutral-900 text-neutral-200 border border-neutral-950 p-4 rounded font-mono text-[11px] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {viewDocDetailTarget.text || '[No readable text indexed]'}
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-neutral-100">
              <button
                type="button"
                className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-all rounded"
                onClick={() => setViewDocDetailTarget(null)}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT FORM DRAWER / DIALOG */}
      {isEquipmentFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
            <h3 className="text-base font-bold uppercase tracking-wide text-gray-900 mb-4 shrink-0">
              {editingEquipment ? 'Edit Equipment Configuration' : 'Register New Plant Machine'}
            </h3>

            <form onSubmit={saveEquipment} className="space-y-4 text-xs font-sans flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Equipment Code / ID</label>
                  <input
                    type="text"
                    value={eqFormId}
                    onChange={(e) => setEqFormId(e.target.value)}
                    placeholder="e.g. EQ-CO-01"
                    className="w-full text-xs p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1"
                    disabled={!!editingEquipment}
                    required
                  />
                </div>
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Machine Name</label>
                  <input
                    type="text"
                    value={eqFormName}
                    onChange={(e) => setEqFormName(e.target.value)}
                    placeholder="e.g. Coke Oven Chamber A"
                    className="w-full text-xs p-2 border-b border-neutral-200 outline-none focus:border-black bg-neutral-50/50 mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Department / Sector</label>
                  <select
                    value={eqFormDept}
                    onChange={(e) => setEqFormDept(e.target.value)}
                    className="w-full text-xs p-2 border-b border-neutral-200 bg-white outline-none focus:border-black mt-1"
                  >
                    <option value="Production">Production / Coke Ovens</option>
                    <option value="Utilities">Utilities / Pump Stations</option>
                    <option value="Logistics">Logistics / Conveyors</option>
                    <option value="Executive">Executive / Management</option>
                    <option value="Other">Other...</option>
                  </select>
                  {eqFormDept === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom Department Name"
                      value={eqFormDeptCustom}
                      onChange={(e) => setEqFormDeptCustom(e.target.value)}
                      className="w-full text-xs p-2 border-b border-neutral-200 bg-neutral-50/50 outline-none focus:border-black mt-2"
                      required
                    />
                  )}
                </div>
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Physical Location</label>
                  <input
                    type="text"
                    value={eqFormLoc}
                    onChange={(e) => setEqFormLoc(e.target.value)}
                    placeholder="e.g. Sector 4, Main Bay"
                    className="w-full text-xs p-2 border-b border-neutral-200 outline-none focus:border-black bg-neutral-50/50 mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Sector</label>
                  <select
                    value={eqFormSector}
                    onChange={(e) => setEqFormSector(e.target.value)}
                    className="w-full text-xs p-2 border-b border-neutral-200 bg-white outline-none focus:border-black mt-1"
                  >
                    <option value="Sector 1">Sector 1</option>
                    <option value="Sector 2">Sector 2</option>
                    <option value="Sector 3">Sector 3</option>
                    <option value="Sector 4">Sector 4</option>
                    <option value="Other">Other...</option>
                  </select>
                  {eqFormSector === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom Sector Name"
                      value={eqFormSectorCustom}
                      onChange={(e) => setEqFormSectorCustom(e.target.value)}
                      className="w-full text-xs p-2 border-b border-neutral-200 bg-neutral-50/50 outline-none focus:border-black mt-2"
                      required
                    />
                  )}
                </div>
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Machine Type</label>
                  <select
                    value={eqFormMachineType}
                    onChange={(e) => setEqFormMachineType(e.target.value)}
                    className="w-full text-xs p-2 border-b border-neutral-200 bg-white outline-none focus:border-black mt-1"
                  >
                    <option value="Oven">Oven</option>
                    <option value="Pump">Pump</option>
                    <option value="Conveyor">Conveyor</option>
                    <option value="Compressor">Compressor</option>
                    <option value="Other">Other...</option>
                  </select>
                  {eqFormMachineType === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom Machine Type"
                      value={eqFormMachineTypeCustom}
                      onChange={(e) => setEqFormMachineTypeCustom(e.target.value)}
                      className="w-full text-xs p-2 border-b border-neutral-200 bg-neutral-50/50 outline-none focus:border-black mt-2"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Manual Category</label>
                  <select
                    value={eqFormManualCategory}
                    onChange={(e) => setEqFormManualCategory(e.target.value)}
                    className="w-full text-xs p-2 border-b border-neutral-200 bg-white outline-none focus:border-black mt-1"
                  >
                    <option value="Safety SOP">Safety SOP</option>
                    <option value="Maintenance Log">Maintenance Log</option>
                    <option value="User Guide">User Guide</option>
                    <option value="Compliance Guidelines">Compliance Guidelines</option>
                    <option value="Other">Other...</option>
                  </select>
                  {eqFormManualCategory === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom Manual Category"
                      value={eqFormManualCategoryCustom}
                      onChange={(e) => setEqFormManualCategoryCustom(e.target.value)}
                      className="w-full text-xs p-2 border-b border-neutral-200 bg-neutral-50/50 outline-none focus:border-black mt-2"
                      required
                    />
                  )}
                </div>
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Operational Status</label>
                  <select
                    value={eqFormStatus}
                    onChange={(e: any) => setEqFormStatus(e.target.value)}
                    className="w-full text-xs p-2 border-b border-neutral-200 bg-white outline-none focus:border-black mt-1"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Maintenance Required">Maintenance Required</option>
                    <option value="Shutdown">Shutdown (High Risk)</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Associated Reference Manual</label>
                <select
                  value={eqFormManual}
                  onChange={(e) => setEqFormManual(e.target.value)}
                  className="w-full text-xs p-2 border-b border-neutral-200 bg-white outline-none focus:border-black mt-1"
                >
                  <option value="">No Manual Reference</option>
                  {documents.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Checklist SOP Requirements</label>
                <textarea
                  value={eqFormSop}
                  onChange={(e) => setEqFormSop(e.target.value)}
                  placeholder="Mandatory pre-run checks for operators..."
                  className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-12 resize-none"
                />
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Operational Notes</label>
                <textarea
                  value={eqFormNotes}
                  onChange={(e) => setEqFormNotes(e.target.value)}
                  placeholder="Temperature limits, pressure indices, maintenance cycles..."
                  className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-12 resize-none"
                />
              </div>

              {/* Machine Document Upload section */}
              <div className="field border-t border-neutral-100 pt-4">
                <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-2">
                  Permanently Attached Machine Files
                </label>
                
                <input
                  type="file"
                  id="machineFilesInput"
                  className="hidden"
                  multiple
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const newAttachedFiles = [...eqFormFiles];
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const textContent = await extractTextFromFile(file);
                        const sizeMb = file.size > 1024 * 1024
                          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                          : `${(file.size / 1024).toFixed(0)} KB`;
                        newAttachedFiles.push({
                          id: `mach-doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          name: file.name,
                          size: sizeMb,
                          text: textContent,
                          uploadedAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                      }
                      setEqFormFiles(newAttachedFiles);
                    }
                  }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                />

                <div
                  onClick={() => document.getElementById('machineFilesInput')?.click()}
                  className="border border-dashed border-neutral-300 rounded p-4 text-center cursor-pointer hover:bg-neutral-50 hover:border-black transition-all mb-3"
                >
                  <span className="text-[11px] text-neutral-500 font-medium">Click to upload machine files (PDF, DOCX, TXT, CSV, Images)</span>
                </div>

                {eqFormFiles.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-neutral-100 rounded p-2 bg-neutral-50/50">
                    {eqFormFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-1.5 bg-white border border-neutral-100 rounded text-[11px]">
                        <div className="truncate pr-2">
                          <span className="font-bold text-neutral-800">{file.name}</span>
                          <span className="text-[9px] text-neutral-400 font-mono ml-2">({file.size})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewingMachineFile(file)}
                            className="text-neutral-500 hover:text-black font-semibold text-[10px] uppercase font-mono px-1 hover:underline"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEqFormFiles(eqFormFiles.filter(f => f.id !== file.id));
                            }}
                            className="text-red-500 hover:text-red-700 font-semibold text-[10px] uppercase font-mono px-1 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-wider hover:border-black transition-all"
                  onClick={() => setIsEquipmentFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-all"
                >
                  Save Machine Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE FORM DRAWERS */}
      {isEmployeeFormOpen && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-lg border border-neutral-200/80 max-w-sm w-full p-6 shadow-2xl rounded-[28px] relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-5 text-center">
              Edit Employee Profile
            </h3>

            <form onSubmit={saveEmployee} className="space-y-4 text-xs">
              {/* Profile Photo Upload Block */}
              <div className="flex flex-col items-center justify-center pb-4 border-b border-neutral-100 mb-2">
                <div 
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="w-[130px] h-[130px] rounded-full relative overflow-visible mx-auto border border-neutral-200/80 shadow-lg bg-neutral-50/50 backdrop-blur-md group cursor-pointer hover:scale-[1.03] active:scale-[0.99] transition-all duration-300"
                >
                  <img
                    src={editingEmployee.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'}
                    alt="Employee profile"
                    className="w-full h-full object-cover rounded-full border border-neutral-200/60 shadow-inner"
                  />
                  <div className="absolute bottom-1 right-1 bg-neutral-900 text-white hover:bg-black p-2.5 rounded-full border border-white shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-all duration-200 shadow-black/15 flex items-center justify-center">
                    <Camera size={14} />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 mt-3 text-center">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 hover:text-black transition-all hover:underline"
                    >
                      Change Photo
                    </button>
                    {editingEmployee.photo && (
                      <button
                        type="button"
                        onClick={() => setEditingEmployee({ ...editingEmployee, photo: '' })}
                        className="text-[11px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-all hover:underline"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-400 font-sans uppercase tracking-wider font-semibold">JPG or JPEG, max 5 MB</span>
                </div>

                <input
                  type="file"
                  ref={profilePhotoInputRef}
                  onChange={handleProfilePhotoUpload}
                  accept="image/jpeg, image/jpg"
                  className="hidden"
                />

                {profileUploadError && (
                  <div className="text-[10px] text-red-500 font-medium mt-2.5 p-2 bg-red-50/50 border border-red-100 rounded-xl text-center max-w-[240px]">
                    ⚠️ {profileUploadError}
                  </div>
                )}
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Employee Name</label>
                <input
                  type="text"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  className="w-full p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1 rounded-lg"
                  required
                />
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Department</label>
                <input
                  type="text"
                  value={editingEmployee.department}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                  className="w-full p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Phone</label>
                  <input
                    type="text"
                    value={editingEmployee.phone}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    className="w-full p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1 rounded-lg"
                  />
                </div>
                <div className="field">
                  <label className="text-[10px] font-mono uppercase text-neutral-400">Email</label>
                  <input
                    type="email"
                    value={editingEmployee.email}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1 rounded-lg"
                  />
                </div>
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Work Status</label>
                <select
                  value={editingEmployee.status}
                  onChange={(e: any) => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                  className="w-full p-2 border-b border-neutral-200 bg-white mt-1 rounded-lg"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:border-black transition-all"
                  onClick={() => setIsEmployeeFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-black transition-all"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER/MANAGER EDIT PROFILE MODAL */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-neutral-800">
          <div className="bg-white/95 backdrop-blur-lg border border-neutral-200/80 max-w-sm w-full p-6 shadow-2xl rounded-[28px] relative">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-5 text-center">
              Edit My Profile
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Profile Photo Upload Block */}
              <div className="flex flex-col items-center justify-center pb-4 border-b border-neutral-100 mb-2">
                <div 
                  onClick={() => editProfilePhotoInputRef.current?.click()}
                  className="w-[130px] h-[130px] rounded-full relative overflow-visible mx-auto border border-neutral-200/80 shadow-lg bg-neutral-50/50 backdrop-blur-md group cursor-pointer hover:scale-[1.03] active:scale-[0.99] transition-all duration-300 flex items-center justify-center"
                >
                  {editProfilePhoto ? (
                    <img
                      src={editProfilePhoto}
                      alt={editProfileName}
                      className="w-full h-full object-cover rounded-full border border-neutral-200/60 shadow-inner"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-900 text-white font-extrabold text-2xl flex items-center justify-center uppercase shadow-inner">
                      {getInitials(editProfileName)}
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-neutral-900 text-white hover:bg-black p-2.5 rounded-full border border-white shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-all duration-200 shadow-black/15 flex items-center justify-center">
                    <Camera size={14} />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 mt-3 text-center">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => editProfilePhotoInputRef.current?.click()}
                      className="text-[11px] font-bold uppercase tracking-wider text-neutral-800 hover:text-black transition-all hover:underline"
                    >
                      Change Photo
                    </button>
                    {editProfilePhoto && (
                      <button
                        type="button"
                        onClick={() => setEditProfilePhoto('')}
                        className="text-[11px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-all hover:underline"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-400 font-sans uppercase tracking-wider font-semibold">JPG or JPEG, max 5 MB</span>
                </div>

                <input
                  type="file"
                  ref={editProfilePhotoInputRef}
                  onChange={(e) => {
                    setEditProfileError('');
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (file.size > 5 * 1024 * 1024) {
                      setEditProfileError('File size exceeds 5 MB.');
                      return;
                    }

                    const fileName = file.name.toLowerCase();
                    const isValid = file.type === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
                    if (!isValid) {
                      setEditProfileError('Only JPG or JPEG images are allowed.');
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setEditProfilePhoto(event.target?.result as string);
                    };
                    reader.onerror = () => {
                      setEditProfileError('Error reading file. Please try again.');
                    };
                    reader.readAsDataURL(file);
                  }}
                  accept="image/jpeg, image/jpg"
                  className="hidden"
                />
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">Name</label>
                <input
                  type="text"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="w-full p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1 rounded-lg"
                  required
                />
              </div>

              <div className="field">
                <label className="text-[10px] font-mono uppercase text-neutral-400">New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editProfilePassword}
                  onChange={(e) => setEditProfilePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 border-b border-neutral-200 outline-none bg-neutral-50/50 mt-1 rounded-lg"
                />
              </div>

              {editProfileError && (
                <div className="text-[10px] text-red-500 font-medium p-2 bg-red-50/50 border border-red-100 rounded-xl text-center">
                  ⚠️ {editProfileError}
                </div>
              )}

              {editProfileSuccess && (
                <div className="text-[10px] text-green-600 font-medium p-2 bg-green-50/50 border border-green-100 rounded-xl text-center">
                  ✅ {editProfileSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:border-black transition-all"
                  onClick={() => {
                    setIsEditProfileModalOpen(false);
                    setEditProfileError('');
                    setEditProfileSuccess('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-black transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
