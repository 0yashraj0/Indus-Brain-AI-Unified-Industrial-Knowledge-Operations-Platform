import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Account, Document, WorkerReport, Equipment, Employee, ActivityLog, EmergencyData } from './types';
import LoginScreen from './components/LoginScreen';
import OwnerDashboard from './components/OwnerDashboard';
import WorkerDashboard from './components/WorkerDashboard';
import GuestViewSelection from './components/GuestViewSelection';
import { validatePasswordRules } from './utils/passwordSecurity';

const SESSION_STORAGE_USER_KEY = 'indus_brain_session_user';

function ForcedPasswordChangeModal({
  user,
  onPasswordChanged
}: {
  user: Account;
  onPasswordChanged: (updatedUser: Account) => void;
}) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPw !== confirmPw) {
      setError('New Password and Confirm New Password must match.');
      return;
    }

    const ruleCheck = validatePasswordRules(newPw, { employeeId: user.id, name: user.name });
    if (!ruleCheck.valid) {
      setError(ruleCheck.error || 'The password does not meet the security requirements.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id,
          'X-User-Role': user.role
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });

      if (res.ok) {
        const data = await res.json();
        const updated = { ...user, mustChangePassword: false };
        if (data.credentialsVersion) {
          updated.credentialsVersion = data.credentialsVersion;
        }
        localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(updated));
        onPasswordChanged(updated);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update password.');
      }
    } catch (err) {
      setError('Failed to update password. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 text-neutral-800">
      <div className="bg-white border border-neutral-300 max-w-sm w-full p-6 shadow-2xl rounded-[28px] relative">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center mb-3">
          <Lock size={22} />
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-1 text-center">
          Password Change Required
        </h3>

        <p className="text-xs text-neutral-600 text-center leading-relaxed mb-4">
          An administrator has required you to change your password before accessing the system.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="field relative">
            <label className="text-[10px] font-mono uppercase text-neutral-500">Current Password</label>
            <div className="relative mt-1">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full p-2 pr-8 border-b border-neutral-200 outline-none bg-neutral-50 rounded-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="field relative">
            <label className="text-[10px] font-mono uppercase text-neutral-500">New Password</label>
            <div className="relative mt-1">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="10+ chars, A-Z, a-z, 0-9, symbol"
                className="w-full p-2 pr-8 border-b border-neutral-200 outline-none bg-neutral-50 rounded-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="field relative">
            <label className="text-[10px] font-mono uppercase text-neutral-500">Confirm New Password</label>
            <div className="relative mt-1">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full p-2 pr-8 border-b border-neutral-200 outline-none bg-neutral-50 rounded-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[10px] text-red-600 font-medium p-2 bg-red-50 border border-red-200 rounded-xl text-center">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md mt-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Updating Password...' : 'Update Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<WorkerReport[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [emergency, setEmergency] = useState<EmergencyData | null>(null);
  const [currentSession, setCurrentSession] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch complete system data from DB on load
  const refreshData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        const dbAccounts: Account[] = data.accounts || [];
        setAccounts(dbAccounts);
        setDocuments(data.documents || []);
        setReports(data.reports || []);
        setEquipment(data.equipment || []);
        setEmployees(data.employees || []);
        setLogs(data.logs || []);
        setEmergency(data.emergency || null);

        // Verify currently active session and ensure deleted workers/managers are logged out
        const savedSession = localStorage.getItem(SESSION_STORAGE_USER_KEY);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            const stillExists = dbAccounts.some((a) => a.id === parsed.id);
            if (!stillExists) {
              localStorage.removeItem(SESSION_STORAGE_USER_KEY);
              setCurrentSession(null);
            } else {
              // sync updated credentials/roles/details
              const matchedAcc = dbAccounts.find((a) => a.id === parsed.id);
              if (matchedAcc) {
                setCurrentSession(matchedAcc);
                localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(matchedAcc));
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Failed to load system state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if session already exists
    const savedSession = localStorage.getItem(SESSION_STORAGE_USER_KEY);
    if (savedSession) {
      try {
        setCurrentSession(JSON.parse(savedSession));
      } catch (e) {
        // ignore
      }
    }
    refreshData();
  }, []);

  // Save/clear active login session
  const handleLoginSuccess = (user: Account) => {
    setCurrentSession(user);
    localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(user));
    // Log login activity
    handleLogActivity(user.name, user.role, 'User signed in successfully');
  };

  const handleSignOut = () => {
    if (currentSession) {
      handleLogActivity(currentSession.name, currentSession.role, 'User signed out');
    }
    setCurrentSession(null);
    localStorage.removeItem(SESSION_STORAGE_USER_KEY);
  };

  // Log activity helper
  const handleLogActivity = async (user: string, role: string, action: string) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || 'anonymous',
          'X-User-Role': currentSession?.role || 'anonymous'
        },
        body: JSON.stringify({ user, role, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to post activity log:', err);
    }
  };

  // Add Account
  const handleAddAccount = async (newAcc: Account): Promise<{ success: boolean; error?: string }> => {
    const cleanId = (newAcc.id || '').trim();
    const normalizedNewId = cleanId.toLowerCase();

    if (accounts.some((a) => (a.id || '').trim().toLowerCase() === normalizedNewId)) {
      return { success: false, error: 'An account with this Employee ID already exists.' };
    }

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'add', account: newAcc, currentUserId: currentSession?.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setAccounts(data.accounts || []);
        setEmployees(data.employees || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Created account for ${newAcc.name} (${cleanId})`);
        return { success: true };
      } else {
        const errorMsg = data.error || (res.status === 403 
          ? 'You are not authorized to create employee accounts.' 
          : 'The employee account could not be created. Please try again.');
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error('Error adding account:', err);
      return { success: false, error: 'The employee account could not be created. Please try again.' };
    }
  };

  // Delete Account
  const handleDeleteAccount = async (targetId: string, currentUserId: string): Promise<boolean> => {
    const targetAcc = accounts.find((a) => a.id === targetId);
    if (targetAcc && targetAcc.role === 'owner') {
      const ownerCount = accounts.filter((a) => a.role === 'owner').length;
      if (ownerCount <= 1) return false;
    }
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'delete', targetId, currentUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setEmployees(data.employees || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Deleted account with ID: ${targetId}`);
        return true;
      }
    } catch (err) {
      console.error('Error deleting account:', err);
    }
    return false;
  };

  // Update Employee Profile
  const handleUpdateEmployee = async (updatedEmp: Employee, newPassword?: string, newEmployeeId?: string) => {
    try {
      const activeId = currentSession?.id || '';
      const res = await fetch('/api/employees/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': activeId,
          'X-User-Role': currentSession?.role || '',
          'X-Credentials-Version': String(currentSession?.credentialsVersion || '')
        },
        body: JSON.stringify({ employee: updatedEmp, newPassword, newEmployeeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        if (data.accounts) {
          setAccounts(data.accounts);
        }

        const isSelfUpdate = currentSession && (currentSession.id === updatedEmp.employeeId || activeId === updatedEmp.employeeId);

        if (data.credentialsChanged && isSelfUpdate) {
          // Clear all cached session data immediately
          localStorage.removeItem(SESSION_STORAGE_USER_KEY);
          localStorage.clear();
          sessionStorage.clear();
          setCurrentSession(null);
          alert('Credentials updated successfully. Please log in again using your newly updated Employee ID and Password.');
          return;
        }

        if (data.accounts && currentSession) {
          const targetSessionId = data.updatedId || currentSession.id;
          const updatedSession = data.accounts.find((a: any) => a.id === targetSessionId);
          if (updatedSession) {
            setCurrentSession(updatedSession);
            localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(updatedSession));
          }
        }
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Updated employee profile for ${updatedEmp.name}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update employee profile.');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      throw err;
    }
  };

  // Add Document
  const handleAddDocument = async (doc: Document) => {
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({
          name: doc.name,
          text: doc.text || '',
          size: doc.size,
          uploadedAt: doc.uploadedAt,
          version: doc.version || 1
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Uploaded document: ${doc.name}`);
      }
    } catch (err) {
      console.error('Error uploading document:', err);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch('/api/documents/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'delete', id }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Permanently deleted document with ID: ${id}`);
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  // Rename Document
  const handleRenameDocument = async (id: string, newName: string) => {
    try {
      const res = await fetch('/api/documents/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'rename', id, name: newName }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Renamed document to: ${newName}`);
      }
    } catch (err) {
      console.error('Error renaming document:', err);
    }
  };

  // Approve / Reject Document Workflow
  const handleApproveDocument = async (id: string, status: 'Approved' | 'Rejected' | 'Pending') => {
    try {
      const res = await fetch('/api/documents/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'approve', id, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Updated document approval status to "${status}"`);
      }
    } catch (err) {
      console.error('Error updating document approval status:', err);
    }
  };

  // Add New Document Version
  const handleAddNewVersion = async (id: string, text: string) => {
    const today = new Date();
    const uploadedAt = today.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch('/api/documents/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'new_version', id, text, uploadedAt }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Created new version for document ID: ${id}`);
      }
    } catch (err) {
      console.error('Error creating new document version:', err);
    }
  };

  // Submit Worker Report
  const handleAddReport = async (repData: Omit<WorkerReport, 'id' | 'timestamp' | 'workerName'>) => {
    const today = new Date();
    const timeString = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = `Today, ${timeString}`;

    const newReport: WorkerReport = {
      id: `rep-${Date.now()}`,
      title: repData.title,
      type: repData.type,
      description: repData.description,
      timestamp: dateLabel,
      workerName: currentSession?.name || 'Worker',
      photo: (repData as any).photo,
    };

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ report: newReport }),
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        handleLogActivity(currentSession?.name || 'Worker', currentSession?.role || 'worker', `Raised report: ${repData.title}`);
      }
    } catch (err) {
      console.error('Error raising report:', err);
    }
  };

  // Equipment CRUD
  const handleAddEquipment = async (eq: Equipment) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'add', equipment: eq }),
      });
      if (res.ok) {
        const data = await res.json();
        setEquipment(data.equipment || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Added new equipment: ${eq.name}`);
      }
    } catch (err) {
      console.error('Error adding equipment:', err);
    }
  };

  const handleEditEquipment = async (eq: Equipment) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'edit', equipment: eq }),
      });
      if (res.ok) {
        const data = await res.json();
        setEquipment(data.equipment || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Updated equipment details: ${eq.name}`);
      }
    } catch (err) {
      console.error('Error editing equipment:', err);
    }
  };

  const handleDeleteEquipment = async (eq: Equipment) => {
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ action: 'delete', equipment: eq }),
      });
      if (res.ok) {
        const data = await res.json();
        setEquipment(data.equipment || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Deleted equipment: ${eq.name}`);
      }
    } catch (err) {
      console.error('Error deleting equipment:', err);
    }
  };

  // Emergency Center Update
  const handleUpdateEmergency = async (newEmergency: EmergencyData) => {
    try {
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentSession?.id || '',
          'X-User-Role': currentSession?.role || ''
        },
        body: JSON.stringify({ emergency: newEmergency }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmergency(data.emergency || null);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', 'Updated plant emergency protocols');
      }
    } catch (err) {
      console.error('Error updating emergency procedures:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950 text-white">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-mono tracking-wider uppercase text-neutral-400">Loading INDUS BRAIN State...</p>
        </div>
      </div>
    );
  }

  const handleSelectGuestView = (view: 'WORKER' | 'OWNER_MANAGER') => {
    if (currentSession) {
      const updated = { ...currentSession, demoView: view };
      setCurrentSession(updated);
      localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(updated));
    }
  };

  const handleClearGuestView = () => {
    if (currentSession) {
      const updated = { ...currentSession, demoView: undefined };
      setCurrentSession(updated);
      localStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(updated));
    }
  };

  const isGuest = currentSession?.role === 'DEMO_GUEST';
  const isManagement = currentSession && (currentSession.role === 'owner' || currentSession.role === 'manager');

  return (
    <div id="app">
      {currentSession?.mustChangePassword && (
        <ForcedPasswordChangeModal
          user={currentSession}
          onPasswordChanged={(updatedUser) => setCurrentSession(updatedUser)}
        />
      )}
      {!currentSession ? (
        <LoginScreen accounts={accounts} onLoginSuccess={handleLoginSuccess} />
      ) : isGuest ? (
        !currentSession.demoView ? (
          <GuestViewSelection
            currentUser={currentSession}
            onSelectView={handleSelectGuestView}
            onSignOut={handleSignOut}
          />
        ) : currentSession.demoView === 'OWNER_MANAGER' ? (
          <OwnerDashboard
            currentUser={currentSession}
            accounts={accounts}
            documents={documents}
            reports={reports}
            equipment={equipment}
            employees={employees}
            logs={logs}
            emergency={emergency || {
              fireProcedures: '', chemicalSpillSops: '', emergencyContacts: [], firstAid: '', emergencyShutdown: '', evacuationProcedures: '', assemblyPoints: ''
            }}
            onAddAccount={handleAddAccount}
            onDeleteAccount={handleDeleteAccount}
            onUpdateEmployee={handleUpdateEmployee}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            onRenameDocument={handleRenameDocument}
            onApproveDocument={handleApproveDocument}
            onAddNewVersion={handleAddNewVersion}
            onAddEquipment={handleAddEquipment}
            onEditEquipment={handleEditEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onUpdateEmergency={handleUpdateEmergency}
            onSignOut={handleSignOut}
            onChangeGuestView={handleClearGuestView}
          />
        ) : (
          <WorkerDashboard
            currentUser={currentSession}
            employees={employees}
            documents={documents.filter((d) => d.status === 'Approved')}
            equipment={equipment}
            emergency={emergency || {
              fireProcedures: '', chemicalSpillSops: '', emergencyContacts: [], firstAid: '', emergencyShutdown: '', evacuationProcedures: '', assemblyPoints: ''
            }}
            onAddReport={handleAddReport}
            onUpdateEmployee={handleUpdateEmployee}
            onSignOut={handleSignOut}
            onChangeGuestView={handleClearGuestView}
          />
        )
      ) : isManagement ? (
        <OwnerDashboard
          currentUser={currentSession}
          accounts={accounts}
          documents={documents}
          reports={reports}
          equipment={equipment}
          employees={employees}
          logs={logs}
          emergency={emergency || {
            fireProcedures: '', chemicalSpillSops: '', emergencyContacts: [], firstAid: '', emergencyShutdown: '', evacuationProcedures: '', assemblyPoints: ''
          }}
          onAddAccount={handleAddAccount}
          onDeleteAccount={handleDeleteAccount}
          onUpdateEmployee={handleUpdateEmployee}
          onAddDocument={handleAddDocument}
          onDeleteDocument={handleDeleteDocument}
          onRenameDocument={handleRenameDocument}
          onApproveDocument={handleApproveDocument}
          onAddNewVersion={handleAddNewVersion}
          onAddEquipment={handleAddEquipment}
          onEditEquipment={handleEditEquipment}
          onDeleteEquipment={handleDeleteEquipment}
          onUpdateEmergency={handleUpdateEmergency}
          onSignOut={handleSignOut}
        />
      ) : (
        <WorkerDashboard
          currentUser={currentSession}
          employees={employees}
          documents={documents.filter((d) => d.status === 'Approved')}
          equipment={equipment}
          emergency={emergency || {
            fireProcedures: '', chemicalSpillSops: '', emergencyContacts: [], firstAid: '', emergencyShutdown: '', evacuationProcedures: '', assemblyPoints: ''
          }}
          onAddReport={handleAddReport}
          onUpdateEmployee={handleUpdateEmployee}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
