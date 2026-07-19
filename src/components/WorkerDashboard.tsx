import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, X, Search, FileText, Mic, Volume2, Upload, Clock, ArrowRight,
  ShieldAlert, Wrench, AlertTriangle, CheckCircle, Info, Camera
} from 'lucide-react';
import { Account, WorkerReport, ChatMessage, Document, Equipment, EmergencyData, ChatSession, Employee } from '../types';

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export function SafeAvatar({ name, photo, className = "w-10 h-10 text-xs" }: { name: string; photo?: string; className?: string }) {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    setHasError(false);
  }, [photo]);

  const cleanPhoto = photo && photo.trim() !== '' && !photo.includes('images.unsplash.com') ? photo : null;
  
  if (!cleanPhoto || hasError) {
    const initials = getInitials(name || 'User');
    return (
      <div className={`${className} rounded-full bg-neutral-900 text-white font-extrabold flex items-center justify-center uppercase border border-neutral-200 shrink-0 select-none shadow-sm font-sans`}>
        {initials}
      </div>
    );
  }
  
  return (
    <img
      src={cleanPhoto}
      alt={name}
      onError={() => setHasError(true)}
      className={`${className} object-cover rounded-full border border-neutral-200 shrink-0 shadow-sm`}
    />
  );
}

interface WorkerDashboardProps {
  currentUser: Account;
  employees: Employee[];
  documents: Document[];
  equipment: Equipment[];
  emergency: EmergencyData;
  onAddReport: (report: Omit<WorkerReport, 'id' | 'timestamp' | 'workerName'>) => void;
  onUpdateEmployee: (emp: Employee, newPassword?: string) => Promise<void>;
  onSignOut: () => void;
}

type WorkerTab = 'ask' | 'docs' | 'equipment' | 'report' | 'emergency';

export default function WorkerDashboard({
  currentUser,
  employees,
  documents,
  equipment,
  emergency,
  onAddReport,
  onUpdateEmployee,
  onSignOut,
}: WorkerDashboardProps) {
  const [activeTab, setActiveTab] = useState<WorkerTab>('ask');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const currentUserEmployee = employees.find(emp => emp.employeeId === currentUser.id);
  const currentUserPhoto = currentUserEmployee?.photo || '';

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editProfileName, setEditProfileName] = useState(currentUser.name);
  const [editProfilePhoto, setEditProfilePhoto] = useState(currentUserPhoto);
  const [editProfilePassword, setEditProfilePassword] = useState('');
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');
  const editProfilePhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditProfileName(currentUser.name);
    setEditProfilePhoto(currentUserPhoto);
  }, [currentUser.name, currentUserPhoto]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditProfileError('');
    setEditProfileSuccess('');

    if (!currentUserEmployee) return;

    try {
      const updatedEmp: Employee = {
        ...currentUserEmployee,
        name: editProfileName,
        photo: editProfilePhoto
      };

      await onUpdateEmployee(updatedEmp, editProfilePassword || undefined);
      setEditProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditProfileModalOpen(false);
        setEditProfileSuccess('');
        setEditProfilePassword('');
      }, 1500);
    } catch (error) {
      setEditProfileError('Failed to update profile. Please try again.');
    }
  };

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

  // Chat History Management (ChatGPT-style!)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');

  // Input & Streaming states
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreamWarning, setIsStreamWarning] = useState(false);
  const [chatImageBase64, setChatImageBase64] = useState<string | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'pending' | 'streaming' | 'error'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const [speechError, setSpeechError] = useState('');

  // Drawer / Detail modals
  const [viewDocTarget, setViewDocTarget] = useState<Document | null>(null);
  const [viewEqTarget, setViewEqTarget] = useState<Equipment | null>(null);
  const [previewingMachineFile, setPreviewingMachineFile] = useState<any | null>(null);

  // Report state
  const [reportType, setReportType] = useState<'Not working' | 'Missing file' | 'Other'>('Not working');
  const [description, setDescription] = useState('');
  const [reportMsg, setReportMsg] = useState('');
  const [reportPhoto, setReportPhoto] = useState('');
  const [reportPhotoError, setReportPhotoError] = useState('');
  const reportPhotoInputRef = useRef<HTMLInputElement>(null);

  const chatImageRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat sessions from database for current worker user
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role
        },
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
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role
        },
        body: JSON.stringify({ action: 'create', userId: currentUser.id, title: 'New Worker Inquiry' }),
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

  // Delete Session
  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role
        },
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
    setAiState('pending');
    setAiError(null);
    setIsStreaming(true);
    setStreamingText('');
    setIsStreamWarning(false);

    try {
      if (!targetSid) {
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': currentUser.id,
            'X-User-Role': currentUser.role
          },
          body: JSON.stringify({ action: 'create', userId: currentUser.id, title: chatInput.substring(0, 24) || 'Worker Panel' }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions);
          targetSid = data.activeId;
          setActiveSessionId(data.activeId);
        } else {
          throw new Error('Failed to create chat session');
        }
      }

      const messageText = chatInput;
      setChatInput('');

      const controller = new AbortController();
      let timer = setTimeout(() => {
        controller.abort();
      }, 15000);

      const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          controller.abort();
        }, 15000);
      };

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id,
          'X-User-Role': currentUser.role
        },
        body: JSON.stringify({
          userId: currentUser.id,
          sessionId: targetSid,
          message: messageText,
          imageBase64: chatImageBase64
        }),
        signal: controller.signal
      });

      // Optimistically fetch sessions to display the user's new message instantly
      await fetchSessions();

      if (!res.ok) {
        clearTimeout(timer);
        if (res.status === 401) {
          throw new Error('Unauthorized: The AI API key is invalid or unauthorized.');
        } else if (res.status === 429) {
          throw new Error('Rate Limit Exceeded: The AI service is currently busy or the request limit has been reached.');
        } else {
          throw new Error(`Operations Gateway returned status ${res.status}`);
        }
      }

      setChatImageBase64(null);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) {
        clearTimeout(timer);
        throw new Error('Failed to load streaming reader');
      }

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        resetTimer(); // Reset the 15s timer on receiving data

        if (done) break;

        // Transition from pending to streaming once we receive actual data chunks
        setAiState('streaming');

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;

          try {
            const parsed = JSON.parse(cleanLine.substring(6));
            if (parsed.error) {
              setAiError(parsed.error);
              setAiState('error');
            } else if (parsed.text !== undefined) {
              setStreamingText(parsed.text);
              if (parsed.isWarning) {
                setIsStreamWarning(true);
              }
            }
            if (parsed.done) {
              clearTimeout(timer);
              await fetchSessions();
              setIsStreaming(false);
              setStreamingText('');
              setAiState('idle');
            }
          } catch (e) {
            // ignore partial JSON bounds
          }
        }
      }
      clearTimeout(timer);
    } catch (err: any) {
      console.error('Streaming error:', err);
      setIsStreaming(false);
      setStreamingText('');
      
      let finalErrMsg = err.message;
      if (err.name === 'AbortError') {
        finalErrMsg = 'Request timed out: Operations Gateway did not respond within 15 seconds. Please check the network connectivity or try again.';
      }
      setAiError(finalErrMsg);
      setAiState('error');
    }
  };

  // Voice Speech Synthesis & Recognition
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
    recognition.lang = 'en-US';

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

  const handleChatImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setChatImageBase64(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Worker Report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setReportMsg("Please describe what's wrong before submitting.");
      return;
    }

    onAddReport({
      title: reportType === 'Missing file' ? 'Missing file request' : `${reportType} report`,
      type: reportType,
      description: description.trim(),
      photo: reportPhoto || undefined,
    } as any);

    setReportMsg('Your report has been sent directly to the management system.');
    setDescription('');
    setReportPhoto('');
    setReportPhotoError('');

    setTimeout(() => {
      setReportMsg('');
    }, 4000);
  };

  const handleTabChange = (tab: WorkerTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase()));
  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="screen active" id="screenWorker">
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
              className="group relative cursor-pointer shrink-0 animate-fade-in"
              title="Click to edit profile"
            >
              <SafeAvatar
                name={currentUser.name}
                photo={currentUserPhoto}
                className="w-10 h-10 border border-white/10 shadow-lg group-hover:opacity-75 transition-all"
              />
              {/* Overlay edit icon */}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Camera size={12} className="text-white" />
              </div>
            </div>
            <div>
              <div className="who text-[9px] uppercase tracking-widest text-neutral-500 font-bold mb-0.5">Signed in as</div>
              <div className="nm text-sm font-extrabold text-white tracking-tight leading-tight" id="workerNameDisplay">
                {currentUser.name}
              </div>
              <div className="rl uppercase tracking-widest text-[8px] text-white/45 font-mono mt-0.5">
                Worker / Operator
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto w-full -mx-1 px-1">
            <div
              className={`navItem flex justify-between items-center px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
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
              className={`navItem flex justify-between items-center px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'docs' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('docs')}
            >
              <span className="flex items-center gap-2">
                <FileText size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Approved SOPs ({documents.length})</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'docs' ? 'text-white/60' : 'text-neutral-500'}`}>02</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
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
              <span className={`text-[9px] font-mono ${activeTab === 'equipment' ? 'text-white/60' : 'text-neutral-500'}`}>03</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
                activeTab === 'report' 
                  ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)] border-white/15' 
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
              onClick={() => handleTabChange('report')}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} className="icon-interact text-neutral-400 group-hover:text-white" />
                <span>Raise Report</span>
              </span>
              <span className={`text-[9px] font-mono ${activeTab === 'report' ? 'text-white/60' : 'text-neutral-500'}`}>04</span>
            </div>

            <div
              className={`navItem flex justify-between items-center px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 border ${
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
              <span className={`text-[9px] font-mono ${activeTab === 'emergency' ? 'text-white/60' : 'text-neutral-500'}`}>05</span>
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
                <h1 id="workerTitle" className="font-sans tracking-tight font-bold text-lg text-neutral-900">
                  {activeTab === 'ask' && 'Ask the Operations Brain'}
                  {activeTab === 'docs' && 'Approved Operating SOPs'}
                  {activeTab === 'equipment' && 'Active Equipment Directory'}
                  {activeTab === 'report' && 'Raise Operational Issue'}
                  {activeTab === 'emergency' && 'Emergency Action Center'}
                </h1>
                <div className="sub text-[11px] text-neutral-400 font-sans mt-0.5" id="workerSub">
                  {activeTab === 'ask' && 'Real-time neural assistant for field compliance'}
                  {activeTab === 'docs' && 'Authorized plant guides, safety SOPs, and manual index'}
                  {activeTab === 'equipment' && 'Check locations, checklist requirements, and status logs'}
                  {activeTab === 'report' && 'Instantly dispatch field incidents or missing files to shift lead'}
                  {activeTab === 'emergency' && 'Emergency mushroom shutdown, assembly points, and contacts'}
                </div>
              </div>
            </div>
            <div className="badge hidden sm:flex font-mono text-[9px] font-bold border border-neutral-200 bg-neutral-50/50 text-neutral-500 tracking-widest uppercase px-3 py-1.5 rounded-full">
              Worker Console
            </div>
          </div>

          <div className="stageBody flex-1 overflow-y-auto" id="workerBody">
            {/* ASK VIEW - EXQUISITE DYNAMIC CHAT CANVAS */}
            {activeTab === 'ask' && (
              <div className="flex h-full glass-panel overflow-hidden border border-neutral-200/50 shadow-xl rounded-[24px]">
                {/* CHAT HISTORY SIDEBAR */}
                <div className="hidden md:flex flex-col w-64 border-r border-neutral-200/55 bg-neutral-50/25 p-4 shrink-0">
                  <button
                    onClick={handleCreateSession}
                    className="btn-glass-primary w-full py-2.5 mb-3 text-[10px] uppercase tracking-wider font-bold shadow-xs hover-lift"
                  >
                    + New Inquiry
                  </button>

                  <div className="relative mb-3.5">
                    <Search className="absolute left-3 top-3 text-neutral-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search inquiries..."
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white/60 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 transition-all"
                    />
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
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity p-0.5 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CONVERSATION AREA */}
                <div className="flex-1 flex flex-col justify-between bg-neutral-50/15 backdrop-blur-sm relative">
                  <div className="flex-1 overflow-y-auto p-5 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {(!activeSession || activeSession.messages.length === 0) && !isStreaming ? (
                      <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-12">
                        <div className="mk w-12 h-12 mb-5 scale-125 bg-neutral-900 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xl shadow-black/10">IB</div>
                        <h2 className="text-lg font-sans font-extrabold text-neutral-900 mb-2">Worker Operations Brain</h2>
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

                              {msg.sender === 'bot' && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono text-neutral-400 pl-1">
                                  {msg.confidence !== undefined && (
                                    <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium">
                                      Confidence: <b>{(msg.confidence * 100).toFixed(0)}%</b>
                                    </span>
                                  )}
                                  {msg.sourceDoc && (
                                    <span className="bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-medium">
                                      Source: <b>{msg.sourceDoc}</b>
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleSpeakText(msg.id, msg.text)}
                                    className="hover:text-black p-1 bg-neutral-100 hover:bg-neutral-200/80 rounded-full transition-all"
                                  >
                                    <Volume2 size={11} className={speakingMsgId === msg.id ? 'animate-pulse text-red-500' : ''} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {msg.sender === 'me' && (
                              <SafeAvatar
                                name={currentUser.name}
                                photo={currentUserPhoto}
                                className="w-6 h-6 border border-neutral-200 shrink-0 mt-1.5 shadow-sm"
                              />
                            )}
                          </div>
                        ))}

                        {aiState === 'pending' && !streamingText && (
                          <div className="flex gap-3.5 max-w-3xl mr-auto justify-start animate-pulse">
                            <div className="w-6 h-6 shrink-0 mt-1.5 bg-neutral-900 rounded-lg flex items-center justify-center text-white text-[8px] font-bold">IB</div>
                            <div className="space-y-1">
                              <div className="p-4 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-neutral-200/40 bg-white/80 text-neutral-500 backdrop-blur-md flex items-center gap-2">
                                <span className="flex space-x-1 shrink-0">
                                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </span>
                                <span>Operations Brain is analyzing your request...</span>
                              </div>
                            </div>
                          </div>
                        )}

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

                        {aiError && (
                          <div className="flex gap-3.5 max-w-3xl mr-auto justify-start animate-fadeIn">
                            <div className="w-6 h-6 shrink-0 mt-1.5 bg-red-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-md">⚠️</div>
                            <div className="space-y-1">
                              <div className="p-4 rounded-2xl rounded-tl-sm text-xs leading-relaxed max-w-xl shadow-[0_2px_12px_rgba(239,68,68,0.05)] border bg-red-50/90 border-red-200 text-red-900 backdrop-blur-md">
                                <p className="font-semibold mb-1">Operations Interruption</p>
                                <p className="text-red-700/90 mb-3 leading-relaxed">{aiError}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAiError(null);
                                    setAiState('idle');
                                  }}
                                  className="px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 rounded-lg font-medium transition-all text-[11px] shadow-sm cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>

                  {/* INPUT BAR */}
                  <div className="p-4 border-t border-neutral-200/40 bg-white/65 backdrop-blur-md">
                    {speechError && (
                      <div className="text-[11px] text-red-600 bg-red-50/70 border border-red-100 px-3 py-1.5 rounded-xl mb-2 flex items-center justify-between font-medium">
                        <span className="flex items-center gap-1.5">⚠️ {speechError}</span>
                        <button type="button" onClick={() => setSpeechError('')} className="text-red-400 hover:text-red-700 font-bold ml-2">✕</button>
                      </div>
                    )}

                    {chatImageBase64 && (
                      <div className="relative inline-block mb-3 border border-neutral-200/50 p-1.5 rounded-xl bg-white/80 shadow-md">
                        <img src={chatImageBase64} alt="Upload preview" className="h-16 w-16 object-cover rounded-lg" />
                        <button
                          onClick={() => setChatImageBase64(null)}
                          className="absolute -top-2 -right-2 bg-neutral-900 text-white hover:bg-black rounded-full p-1 shadow-md transition-all text-[8px]"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendChat} className="flex gap-2 items-center border border-neutral-200/70 rounded-2xl p-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] bg-neutral-50/70 hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5 focus-within:border-neutral-900/30 transition-all duration-300">
                      <input
                        type="text"
                        className="flex-1 text-xs outline-none bg-transparent py-2 px-1 text-neutral-800"
                        placeholder={
                          aiState === 'pending'
                            ? "Connecting to Operations Gateway..."
                            : aiState === 'streaming'
                              ? "Receiving operations data..."
                              : "Type or speak a question..."
                        }
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={aiState === 'pending' || aiState === 'streaming'}
                      />

                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        disabled={aiState === 'pending' || aiState === 'streaming'}
                        className={`p-2 rounded-xl transition-all ${
                          isListening
                            ? 'bg-red-50 text-red-500 animate-pulse'
                            : (aiState === 'pending' || aiState === 'streaming')
                              ? 'text-neutral-200 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Mic size={14} />
                      </button>

                      <button
                        type="submit"
                        className="btn-glass-primary p-2.5 w-9 h-9 rounded-xl text-white shrink-0 flex items-center justify-center hover-lift"
                        disabled={
                          aiState === 'pending' ||
                          aiState === 'streaming' ||
                          (!chatInput.trim() && !chatImageBase64)
                        }
                      >
                        {aiState === 'pending' || aiState === 'streaming' ? (
                          <span className="flex space-x-0.5">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
                          </span>
                        ) : (
                          <ArrowRight size={13} />
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* APPROVED SOPS INDEX */}
            {activeTab === 'docs' && (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded overflow-hidden shadow-xs">
                  <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Approved Field Guidelines &amp; Manuals ({documents.length})
                    </h3>
                  </div>

                  <div className="divide-y divide-neutral-100">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-4 hover:bg-neutral-50/30 transition-all flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-100 text-neutral-600 rounded flex items-center justify-center text-[10px] font-mono font-bold">
                            SOP
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-neutral-900">{doc.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              Size: {doc.size} · Revised: {doc.revisionDate || '2026-06-24'}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setViewDocTarget(doc)}
                          className="px-3 py-1.5 text-[10px] font-semibold border border-neutral-200 hover:border-black rounded bg-white"
                        >
                          Read SOP Manual
                        </button>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <div className="text-center py-12 text-neutral-400 text-xs font-mono">No approved safety guidelines published.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* READ-ONLY EQUIPMENT DIRECTORY */}
            {activeTab === 'equipment' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipment.map((eq) => (
                  <div key={eq.id} className="bg-white border border-neutral-200 rounded p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{eq.id}</span>
                          <h4 className="text-sm font-semibold text-neutral-900 mt-1">{eq.name}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase ${
                          eq.status === 'Operational' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {eq.status}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-500 mt-3 space-y-1">
                        <div>📍 Location: <b className="text-neutral-700">{eq.location}</b></div>
                        <div>🏭 Dept: <b className="text-neutral-700">{eq.department}</b></div>
                        {eq.sector && <div>⚙️ Sector: <b className="text-neutral-700">{eq.sector}</b></div>}
                        {eq.machineType && <div>🔧 Type: <b className="text-neutral-700">{eq.machineType}</b></div>}
                        {eq.manualCategory && <div>📂 Category: <b className="text-neutral-700">{eq.manualCategory}</b></div>}
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

                      {eq.sop && (
                        <div className="mt-3 bg-neutral-50 p-2.5 rounded border border-neutral-100 text-[11px] leading-relaxed text-neutral-600">
                          <div className="font-bold text-[10px] uppercase text-neutral-400 tracking-wider mb-1 flex items-center gap-1">
                            <ShieldAlert size={10} /> Pre-Run Checklist
                          </div>
                          {eq.sop}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setViewEqTarget(eq)}
                      className="w-full mt-4 py-1 text-[10px] font-semibold tracking-wider text-neutral-600 hover:text-black border border-neutral-200 rounded text-center transition-colors font-mono uppercase bg-neutral-50/30"
                    >
                      Maintenance Record Log
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* RAISE REPORT VIEW */}
            {activeTab === 'report' && (
              <div className="max-w-xl mx-auto">
                <form onSubmit={handleSubmitReport} className="bg-white border border-neutral-200 p-6 rounded shadow-xs space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Raise Operational Incident Form</h4>

                  <div className="flex gap-2 font-mono text-[10px]">
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded border ${reportType === 'Not working' ? 'bg-neutral-900 text-white border-neutral-950' : 'border-neutral-200 hover:border-black'}`}
                      onClick={() => setReportType('Not working')}
                    >
                      Machine Fault
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded border ${reportType === 'Missing file' ? 'bg-neutral-900 text-white border-neutral-950' : 'border-neutral-200 hover:border-black'}`}
                      onClick={() => setReportType('Missing file')}
                    >
                      Missing SOP File
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded border ${reportType === 'Other' ? 'bg-neutral-900 text-white border-neutral-950' : 'border-neutral-200 hover:border-black'}`}
                      onClick={() => setReportType('Other')}
                    >
                      Other Request
                    </button>
                  </div>

                  <div className="field mt-3">
                    <label className="text-[10px] font-mono uppercase text-neutral-400">Describe what&apos;s wrong</label>
                    <textarea
                      placeholder="Include machine ID, location, or details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-xs p-2 border border-neutral-200 outline-none rounded bg-neutral-50/50 mt-1 h-28"
                    />
                  </div>

                  {/* Attach Photo for Machine Fault / Damage reports (Not working) */}
                  {reportType === 'Not working' && (
                    <div className="border border-neutral-100 bg-neutral-50/30 p-4 rounded-xl flex flex-col items-center justify-center gap-2">
                      <label className="text-[10px] font-mono uppercase text-neutral-400 self-start">Attach Damage Photo</label>
                      
                      {reportPhoto ? (
                        <div className="relative w-full max-w-[160px] h-32 border border-neutral-200 rounded-xl overflow-hidden shadow-sm group">
                          <img
                            src={reportPhoto}
                            alt="Damage report preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setReportPhoto('')}
                            className="absolute top-2 right-2 bg-neutral-900 text-white hover:bg-black rounded-full p-1.5 shadow-md transition-all text-[8px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reportPhotoInputRef.current?.click()}
                          className="w-full py-4 border border-dashed border-neutral-200 hover:border-black rounded-xl text-neutral-500 hover:text-black flex flex-col items-center justify-center gap-1.5 transition-all bg-white"
                        >
                          <Camera size={18} className="text-neutral-400" />
                          <span className="text-[11px] font-medium uppercase tracking-wider">Take or Attach Photo</span>
                          <span className="text-[9px] text-neutral-400">JPG or JPEG, maximum 5 MB</span>
                        </button>
                      )}

                      <input
                        type="file"
                        ref={reportPhotoInputRef}
                        onChange={(e) => {
                          setReportPhotoError('');
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (file.size > 5 * 1024 * 1024) {
                            setReportPhotoError('File size exceeds 5 MB.');
                            return;
                          }

                          const fileName = file.name.toLowerCase();
                          const isValid = file.type === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
                          if (!isValid) {
                            setReportPhotoError('Only JPG or JPEG images are allowed.');
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setReportPhoto(event.target?.result as string);
                          };
                          reader.onerror = () => {
                            setReportPhotoError('Error reading file.');
                          };
                          reader.readAsDataURL(file);
                        }}
                        accept="image/jpeg, image/jpg"
                        className="hidden"
                      />

                      {reportPhotoError && (
                        <div className="text-[10px] text-red-500 font-medium p-1.5 bg-red-50 border border-red-100 rounded-lg text-center w-full mt-1">
                          ⚠️ {reportPhotoError}
                        </div>
                      )}
                    </div>
                  )}

                  <button type="submit" className="w-full py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold tracking-wider uppercase rounded">
                    Dispatch Incident report
                  </button>

                  {reportMsg && (
                    <div className="mt-4 text-xs font-mono text-green-600 flex items-center gap-1.5 justify-center">
                      <CheckCircle size={14} /> {reportMsg}
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* EMERGENCY VIEW */}
            {activeTab === 'emergency' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-red-50 border border-red-200 text-red-950 p-5 rounded shadow-xs lg:col-span-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="text-red-500" size={16} /> EMERGENCY COMMAND CENTRE
                  </h3>
                  <p className="text-xs leading-relaxed font-sans max-w-3xl">
                    In the event of active fire, gas leak, chemical spill, or power surge, follow these legal protocols. Prioritize coworker safety, press emergency trip keys on field machines, and assemble at safety zones immediately.
                  </p>
                </div>

                <div className="lg:col-span-2 bg-white border border-neutral-200 p-5 rounded shadow-xs space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Operational Emergency Manuals</h3>
                  
                  <div className="text-xs space-y-4 font-sans text-neutral-700 leading-relaxed">
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
                </div>

                <div className="bg-white border border-neutral-200 p-5 rounded shadow-xs h-fit">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">Quick Dial Safety Contacts</h3>
                  <div className="space-y-3">
                    {getEmergencyContacts().map((c, idx) => {
                      const cleanPhone = c.phone ? c.phone.replace(/\s+/g, '') : '';
                      const isPhoneAvailable = c.phone && c.phone !== 'Not Added';
                      return (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-neutral-100 text-xs font-sans">
                          <div>
                            <div className="font-bold text-neutral-900">{c.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{c.role}</div>
                          </div>
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
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* READ SOP MODAL */}
      {viewDocTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-2xl w-full p-6 shadow-2xl relative flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex justify-between items-start border-b border-neutral-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-900 flex items-center gap-1.5">
                  <FileText size={16} /> {viewDocTarget.name}
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono mt-1">
                  Size: {viewDocTarget.size} · Version: {viewDocTarget.version || 1} · Index Date: {viewDocTarget.uploadedAt}
                </p>
              </div>
              <button className="text-gray-400 hover:text-black font-semibold text-lg" onClick={() => setViewDocTarget(null)}>✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs leading-relaxed text-neutral-700">
              {viewDocTarget.summary && (
                <div className="bg-neutral-50 p-3.5 border border-neutral-150 rounded">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-neutral-500 mb-1">🤖 AI SOP Summary</h4>
                  <p>{viewDocTarget.summary}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-green-50/50 p-3 border border-green-100 rounded">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-green-700 mb-1">✅ Safety Rules</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {(viewDocTarget.safetyPoints || []).map((p, idx) => <li key={idx}>{p}</li>)}
                  </ul>
                </div>
                <div className="bg-red-50/50 p-3 border border-red-100 rounded">
                  <h4 className="font-bold text-[10px] uppercase tracking-wider text-red-700 mb-1">⚠️ Warnings</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {(viewDocTarget.warnings || []).map((p, idx) => <li key={idx}>{p}</li>)}
                  </ul>
                </div>
              </div>

              <div className="bg-neutral-900 text-neutral-200 border border-neutral-950 p-4 rounded font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                {viewDocTarget.text || '[No readable text indexed]'}
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-neutral-100">
              <button className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 rounded" onClick={() => setViewDocTarget(null)}>
                Close SOP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW EQUIPMENT LOG MODAL */}
      {viewEqTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-black max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold uppercase tracking-wide text-gray-900 mb-2 flex items-center gap-1.5">
              <Wrench size={16} /> Maintenance Ledger Log
            </h3>
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-mono mb-4">
              Machine: {viewEqTarget.name} ({viewEqTarget.id})
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {viewEqTarget.maintenanceHistory && viewEqTarget.maintenanceHistory.length > 0 ? (
                viewEqTarget.maintenanceHistory.map((h, idx) => (
                  <div key={idx} className="border-l-2 border-neutral-800 pl-3 py-1 space-y-1">
                    <div className="text-xs font-bold text-neutral-900">{h.description}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      Service Date: <b>{h.date}</b> · Technician: <b>{h.technician}</b>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs font-mono">No historical maintenance logs indexed.</div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-neutral-100 pt-4 mt-5 text-[10px] font-mono text-neutral-400">
              <div>Last Checked: <b>{viewEqTarget.lastService}</b></div>
              <div>Next Scheduled: <b>{viewEqTarget.nextService}</b></div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                className="px-4 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wider hover:opacity-80 transition-all rounded"
                onClick={() => setViewEqTarget(null)}
              >
                Close Ledger
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

      {/* WORKER EDIT PROFILE MODAL */}
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
                  <SafeAvatar
                    name={editProfileName}
                    photo={editProfilePhoto}
                    className="w-full h-full animate-fade-in"
                  />
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
                <div className="text-[10px] text-red-500 font-medium p-2 bg-red-50/50 border border-red-100 rounded-xl text-center animate-fade-in">
                  ⚠️ {editProfileError}
                </div>
              )}

              {editProfileSuccess && (
                <div className="text-[10px] text-green-600 font-medium p-2 bg-green-50/50 border border-green-100 rounded-xl text-center animate-fade-in">
                  ✅ {editProfileSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all"
                  onClick={() => {
                    setIsEditProfileModalOpen(false);
                    setEditProfileError('');
                    setEditProfileSuccess('');
                    setEditProfilePassword('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white hover:bg-black rounded-xl transition-all"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
