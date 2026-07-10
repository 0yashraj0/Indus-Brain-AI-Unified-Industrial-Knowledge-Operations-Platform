import { useState, useEffect } from 'react';
import { Account, Document, WorkerReport, Equipment, Employee, ActivityLog, EmergencyData } from './types';
import LoginScreen from './components/LoginScreen';
import OwnerDashboard from './components/OwnerDashboard';
import WorkerDashboard from './components/WorkerDashboard';

const SESSION_STORAGE_USER_KEY = 'indus_brain_session_user';

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
        headers: { 'Content-Type': 'application/json' },
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
  const handleAddAccount = async (newAcc: Account): Promise<boolean> => {
    if (accounts.some((a) => a.id.toLowerCase() === newAcc.id.toLowerCase())) {
      return false; // Already exists
    }
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', account: newAcc, currentUserId: currentSession?.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setEmployees(data.employees || []);
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Created account for ${newAcc.name} (${newAcc.id})`);
        return true;
      }
    } catch (err) {
      console.error('Error adding account:', err);
    }
    return false;
  };

  // Delete Account
  const handleDeleteAccount = async (targetId: string, currentUserId: string): Promise<boolean> => {
    if (targetId === '80079385') return false;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  const handleUpdateEmployee = async (updatedEmp: Employee, newPassword?: string) => {
    try {
      const res = await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: updatedEmp, newPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
        if (data.accounts) {
          setAccounts(data.accounts);
          if (currentSession && currentSession.id === updatedEmp.employeeId) {
            const updatedSession = data.accounts.find((a: any) => a.id === currentSession.id);
            if (updatedSession) {
              setCurrentSession(updatedSession);
            }
          }
        }
        handleLogActivity(currentSession?.name || 'Manager', currentSession?.role || 'owner', `Updated employee profile for ${updatedEmp.name}`);
      }
    } catch (err) {
      console.error('Error updating employee:', err);
    }
  };

  // Add Document
  const handleAddDocument = async (doc: Document) => {
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  const isManagement = currentSession && (currentSession.role === 'owner' || currentSession.role === 'manager');

  return (
    <div id="app">
      {!currentSession ? (
        <LoginScreen accounts={accounts} onLoginSuccess={handleLoginSuccess} />
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
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
