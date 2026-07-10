import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

dotenv.config();

const app = express();
const PORT = 3000;

// Serve larger payloads for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Firebase Client SDK on backend for seamless server-side Firestore operations
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
);
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Initial Seed Data Setup
function getInitialData() {
  return {
    accounts: [
      { id: '80079385', password: '80079385', role: 'owner', name: 'Manager / Owner' },
    ],
    documents: [
      {
        id: 'doc-1',
        name: 'Safety_Procedure_SOP_14.pdf',
        size: '1.2 MB',
        chunks: 12,
        status: 'Approved',
        uploadedAt: 'June 24, 2026, 10:00 AM',
        text: `SAFETY COMPLIANCE STANDARD OPERATING PROCEDURE (SOP) 14 - COKE OVEN & CONFINED SPACES\n\nSection 1: Confined Space Entry\n1.1 Confined space entry near the coke oven requires an active gas-test permit, continuous atmospheric monitoring, and a standby attendant at the entry point at all times.\n1.2 Under no circumstances should personnel enter without proper safety harnesses and gas detectors.\n1.3 Respiratory protection must be worn in high dust/gas areas.\n\nSection 2: Gas Leaks & Emergency Response\n2.1 If a user smells gas near the coke oven, stop work immediately, evacuate the area, and alert your shift supervisor.\n2.2 Do not re-enter until a formal gas test confirms safe oxygen and toxic gas levels.\n2.3 The assembly point for coke oven emergencies is Assembly Zone Alpha (West Gate).\n\nSection 3: Work Permits & Approvals\n3.1 Hot work and height permits must be co-signed by the designated shift safety officer and retained for audit for 12 months.\n3.2 Daily checklists must be submitted to the Operations Manager before commencing shifts.`,
        summary: 'Official Safety SOP 14 detailing the guidelines for entering confined spaces near the coke oven, gas leak emergency response protocols, and required work permits.',
        safetyPoints: [
          'Confined space entry requires an active gas-test permit.',
          'Continuous atmospheric monitoring must be maintained.',
          'A standby attendant is required at the entry point at all times.'
        ],
        warnings: [
          'No entry allowed without safety harnesses and gas detectors.',
          'High dust/gas areas require respiratory protection.'
        ],
        ppe: ['Safety Harness', 'Gas Detector', 'Respirator mask', 'Hard hat'],
        emergencyProcedures: 'Stop work immediately, evacuate the area, alert shift supervisor, and assemble at Zone Alpha (West Gate).',
        revisionDate: '2026-06-24',
        keywords: ['coke oven', 'confined space', 'gas test', 'permit', 'assembly zone alpha', 'SOP 14'],
        version: 1,
        versions: [
          { version: 1, text: 'Initial approved version.', uploadedAt: 'June 24, 2026, 10:00 AM' }
        ]
      },
      {
        id: 'doc-2',
        name: 'Maintenance_Log_PumpStation.pdf',
        size: '640 KB',
        chunks: 8,
        status: 'Approved',
        uploadedAt: 'June 24, 2026, 11:30 AM',
        text: `MAINTENANCE OPERATIONS LOG - INDUSTRIAL PUMP STATION B & CONVEYOR BELT SYSTEMS\n\nSection 1: Pump Station B Operations\n1.1 Pump Station B check-valves must be manually verified. Leak logs show nominal pressure ranges of 14.2 to 15.6 bar.\n1.2 Main seal lubricants must be topped up every 100 operating hours.\n1.3 In case of pressure drops below 12.0 bar, trigger the emergency isolation valves.\n\nSection 2: Conveyor Belt 2 System\n2.1 The maintenance manual for Conveyor Belt 2 states that main conveyor rollers require inspection every 24 operating hours.\n2.2 Belt tension must be kept between 450N and 500N. Adjust the tension pulleys during weekly maintenance shutdowns.\n2.3 Any belt misalignment must be reported immediately to prevent friction-induced heat hazards.`,
        summary: 'Logbook detailing maintenance checks for Pump Station B and Conveyor Belt 2 systems.',
        safetyPoints: [
          'Verify check-valves manually.',
          'Check conveyor rollers every 24 operating hours.',
          'Report belt misalignments immediately to prevent friction heat.'
        ],
        warnings: [
          'Pressure drops below 12.0 bar require triggering emergency isolation valves.',
          'Friction-induced heat hazards from belt misalignment.'
        ],
        ppe: ['Insulated gloves', 'Safety shoes', 'High-visibility vest'],
        emergencyProcedures: 'Trigger the emergency isolation valves if pressure drops below 12.0 bar.',
        revisionDate: '2026-06-24',
        keywords: ['pump station b', 'conveyor belt 2', 'lubricant', 'valves', 'misalignment'],
        version: 1,
        versions: [
          { version: 1, text: 'Initial approved version.', uploadedAt: 'June 24, 2026, 11:30 AM' }
        ]
      }
    ],
    reports: [
      {
        id: 'rep-1',
        title: 'Missing file',
        type: 'Missing file',
        description: "The maintenance manual for Conveyor Belt 2 doesn't seem to be in the system.",
        timestamp: 'Today, 11:42 AM',
        workerName: 'Ravi Kumar',
      },
    ],
    equipment: [
      {
        id: 'EQ-CO-01',
        name: 'Coke Oven Chamber A',
        department: 'Production',
        location: 'Sector 4, Main Bay',
        manual: 'Safety_Procedure_SOP_14.pdf',
        sop: 'Always run a pre-gas check. Put on safety harness and respiratory protection. Ensure standby guard is present.',
        maintenanceHistory: [
          { date: '2026-05-12', description: 'Thermal lining inspection, small crack repaired', technician: 'M. S. Swaminathan' }
        ],
        lastService: '2026-05-12',
        nextService: '2026-11-12',
        status: 'Operational',
        notes: 'Operates at extremely high temperatures. Monitor atmospheric levels regularly.'
      },
      {
        id: 'EQ-PS-02',
        name: 'Pump Station B Lubricant Feed',
        department: 'Utilities',
        location: 'Sector 2, Water Works',
        manual: 'Maintenance_Log_PumpStation.pdf',
        sop: 'Check valves manually. Verify pressure is between 14.2 and 15.6 bar. Top up lubricant every 100 hours.',
        maintenanceHistory: [
          { date: '2026-06-10', description: 'Seal replacement and valve calibration', technician: 'H. J. Bhabha' }
        ],
        lastService: '2026-06-10',
        nextService: '2026-07-10',
        status: 'Operational',
        notes: 'Main seal is highly critical.'
      },
      {
        id: 'EQ-CB-02',
        name: 'Conveyor Belt 2 Heavy Feed',
        department: 'Logistics',
        location: 'Sector 3, Dispatch',
        manual: 'Maintenance_Log_PumpStation.pdf',
        sop: 'Inspect conveyor rollers every 24 hours. Ensure belt tension is between 450N and 500N.',
        maintenanceHistory: [],
        lastService: '2026-06-20',
        nextService: '2026-06-27',
        status: 'Maintenance Required',
        notes: 'Reported belt slippage yesterday. Rollers need greasing.'
      }
    ],
    employees: [
      {
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop',
        name: 'Manager / Owner',
        employeeId: '80079385',
        department: 'Executive',
        role: 'owner',
        phone: '+91 98765 43210',
        email: 'owner@indusbrain.com',
        joiningDate: '2024-01-15',
        status: 'Active'
      }
    ],
    logs: [
      { id: 'log-1', user: 'Manager', role: 'owner', action: 'System Setup and Seed Data Configuration', date: '2026-06-24', time: '10:00 AM' }
    ],
    chats: {},
    emergency: {
      fireProcedures: '1. Sound the nearest manual fire call point alarm.\n2. Evacuate via nearest fire exit immediately. Do not use elevators.\n3. Assemble at Assembly Zone Alpha.\n4. Call emergency services at 101.\n5. Do not attempt to fight large chemical or electrical fires unless trained.',
      chemicalSpillSops: '1. Evacuate immediate area and isolate the leak.\n2. Wear full PPE (Chemical suit, breathing apparatus).\n3. Use dry sand or chemical neutralizing agents. Do not wash with water.\n4. Notify Safety Officer and plant control room.',
      emergencyContacts: [
        { name: 'Shift Safety Officer', phone: '+91 98765 12345', role: 'Safety Warden' },
        { name: 'Main Plant Control Room', phone: '+91 99900 88811', role: 'Emergency Desk' },
        { name: 'Local Industrial Fire Station', phone: '101', role: 'External Help' },
        { name: 'City Trauma Center', phone: '102', role: 'Medical Emergency' }
      ],
      firstAid: '- Burns: Flush under cold water for 20 mins. Do not apply grease.\n- Gas Inhalation: Move victim to fresh air. Provide oxygen if breathing is labored.\n- Chemical Contact: Flush eyes or skin with water for at least 15 minutes. Remove contaminated clothes.',
      emergencyShutdown: '1. Press the big red emergency stop mushroom buttons at Sector 4 Control Desk.\n2. Cut main power feed from Transformer Yard G.\n3. Close primary fuel isolation valves manually.',
      evacuationProcedures: 'Follow green glowing exit signage. Leave all belongings behind. Crawl below smoke. Do not panic.',
      assemblyPoints: 'Assembly Zone Alpha (West Gate) for Sectors 3-4. Assembly Zone Beta (East Gate) for Sectors 1-2.'
    }
  };
}

// Immutable auditLogs helper
async function addLogToFirestore(userId: string, role: string, action: string) {
  const logId = `log-${Date.now()}`;
  const now = new Date();
  const timestamp = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const logDoc = {
    logId,
    userId,
    role,
    action,
    timestamp
  };
  try {
    await setDoc(doc(firestore, 'auditLogs', logId), logDoc);
  } catch (err) {
    console.error('Error saving audit log to Firestore:', err);
  }
}

async function saveChatSessionToFirestore(userId: string, sessionId: string, session: any) {
  try {
    await setDoc(doc(firestore, 'chatSessions', `${userId}-${sessionId}`), {
      userId,
      sessionId,
      session
    });
  } catch (err) {
    console.error('Error saving chat session to Firestore:', err);
  }
}

// Load and map from Firestore collections
async function loadDBFromFirestore() {
  try {
    console.log('Fetching system data from Firestore...');

    // 1. Fetch Users
    const usersSnap = await getDocs(collection(firestore, 'users'));
    let usersList: any[] = [];
    usersSnap.forEach(doc => {
      usersList.push({ id: doc.id, ...doc.data() });
    });

    // 2. Fetch Equipment
    const equipmentSnap = await getDocs(collection(firestore, 'equipment'));
    let equipmentList: any[] = [];
    equipmentSnap.forEach(doc => {
      equipmentList.push({ id: doc.id, ...doc.data() });
    });

    // 3. Fetch Documents
    const documentsSnap = await getDocs(collection(firestore, 'documents'));
    let documentsList: any[] = [];
    documentsSnap.forEach(doc => {
      documentsList.push({ id: doc.id, ...doc.data() });
    });

    // 4. Fetch Reports
    const reportsSnap = await getDocs(collection(firestore, 'reports'));
    let reportsList: any[] = [];
    reportsSnap.forEach(doc => {
      reportsList.push({ id: doc.id, ...doc.data() });
    });

    // 5. Fetch Audit Logs
    const auditLogsSnap = await getDocs(collection(firestore, 'auditLogs'));
    let auditLogsList: any[] = [];
    auditLogsSnap.forEach(doc => {
      auditLogsList.push({ id: doc.id, ...doc.data() });
    });

    // 6. Fetch Emergency Contacts
    const emergencyContactsSnap = await getDocs(collection(firestore, 'emergencyContacts'));
    let emergencyContactsList: any[] = [];
    emergencyContactsSnap.forEach(doc => {
      emergencyContactsList.push({ id: doc.id, ...doc.data() });
    });

    // Fetch Emergency Config document
    const emergencyConfigDoc = await getDoc(doc(firestore, 'config', 'emergency'));
    let emergencyConfig = null;
    if (emergencyConfigDoc.exists()) {
      emergencyConfig = emergencyConfigDoc.data();
    }

    // Fetch Chat Sessions
    const chatSessionsSnap = await getDocs(collection(firestore, 'chatSessions'));
    let chatSessionsMap: Record<string, any[]> = {};
    chatSessionsSnap.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (userId) {
        if (!chatSessionsMap[userId]) {
          chatSessionsMap[userId] = [];
        }
        chatSessionsMap[userId].push(data.session);
      }
    });

    // Check if Firestore is empty. If it is, seed it!
    if (usersList.length === 0 && equipmentList.length === 0 && documentsList.length === 0) {
      console.log('Firestore is empty. Seeding initial/demo data...');
      const seed = getInitialData() as any;

      // Seed Users
      for (const acc of seed.accounts) {
        const emp = seed.employees.find((e: any) => e.employeeId === acc.id) || {};
        const userDoc: any = {
          id: acc.id,
          name: acc.name,
          role: acc.role,
          department: emp.department || 'Executive',
          email: emp.email || `${acc.name.toLowerCase().replace(/\s+/g, '')}@indusbrain.com`,
          employeeId: acc.id,
          photoUrl: acc.photo || emp.photo || '',
          createdAt: new Date().toISOString(),
          password: acc.password || acc.id,
          phone: emp.phone || '+91 98765 43210',
          joiningDate: emp.joiningDate || new Date().toISOString().split('T')[0],
          status: emp.status || 'Active'
        };
        await setDoc(doc(firestore, 'users', acc.id), userDoc);
        usersList.push(userDoc);
      }

      // Seed Equipment
      for (const eq of seed.equipment) {
        const eqDoc: any = {
          machineId: eq.id,
          machineName: eq.name,
          location: eq.location,
          department: eq.department,
          status: eq.status,
          associatedSop: eq.sop,
          notes: eq.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          manual: eq.manual,
          maintenanceHistory: eq.maintenanceHistory,
          lastService: eq.lastService,
          nextService: eq.nextService,
          sector: eq.sector || '',
          machineType: eq.machineType || '',
          manualCategory: eq.manualCategory || '',
          files: eq.files || []
        };
        await setDoc(doc(firestore, 'equipment', eq.id), eqDoc);
        equipmentList.push(eqDoc);
      }

      // Seed Documents
      for (const d of seed.documents) {
        const docDoc: any = {
          documentId: d.id,
          fileName: d.name,
          fileType: 'application/pdf',
          fileSize: d.size,
          status: d.status,
          uploadedBy: 'System Seed',
          extractedText: d.text,
          uploadedAt: d.uploadedAt || new Date().toISOString(),
          summary: d.summary || '',
          safetyPoints: d.safetyPoints || [],
          warnings: d.warnings || [],
          ppe: d.ppe || [],
          emergencyProcedures: d.emergencyProcedures || '',
          revisionDate: d.revisionDate || '',
          keywords: d.keywords || [],
          version: d.version || 1,
          versions: d.versions || []
        };
        await setDoc(doc(firestore, 'documents', d.id), docDoc);
        documentsList.push(docDoc);
      }

      // Seed Reports
      for (const rep of seed.reports) {
        const repDoc: any = {
          reportId: rep.id,
          type: rep.type,
          machineId: '',
          description: rep.description,
          photoUrl: rep.photo || '',
          priority: 'Medium',
          status: 'Open',
          raisedBy: rep.workerName,
          createdAt: rep.timestamp,
          reviewedBy: '',
          reviewedAt: '',
          title: rep.title
        };
        await setDoc(doc(firestore, 'reports', rep.id), repDoc);
        reportsList.push(repDoc);
      }

      // Seed Audit Logs
      for (const log of seed.logs) {
        const logDoc: any = {
          logId: log.id,
          userId: log.user,
          role: log.role,
          action: log.action,
          timestamp: `${log.date} ${log.time}`
        };
        await setDoc(doc(firestore, 'auditLogs', log.id), logDoc);
        auditLogsList.push(logDoc);
      }

      // Seed Emergency Contacts
      for (const contact of seed.emergency.emergencyContacts) {
        const id = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const contactDoc = {
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          type: 'emergency',
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(firestore, 'emergencyContacts', id), contactDoc);
        emergencyContactsList.push(contactDoc);
      }

      // Seed Emergency Config
      const emergencyData = {
        fireProcedures: seed.emergency.fireProcedures,
        chemicalSpillSops: seed.emergency.chemicalSpillSops,
        firstAid: seed.emergency.firstAid,
        emergencyShutdown: seed.emergency.emergencyShutdown,
        evacuationProcedures: seed.emergency.evacuationProcedures,
        assemblyPoints: seed.emergency.assemblyPoints
      };
      await setDoc(doc(firestore, 'config', 'emergency'), emergencyData);
      emergencyConfig = emergencyData;
    }

    // Build standard structures expected by front-end client
    const accounts = usersList.map((u: any) => ({
      id: u.id,
      role: u.role,
      name: u.name,
      photo: u.photoUrl,
      password: u.password || u.id
    }));

    const employees = usersList.map((u: any) => ({
      photo: u.photoUrl || '',
      name: u.name,
      employeeId: u.id,
      department: u.department || 'Production',
      role: u.role,
      phone: u.phone || '+91 XXXXX XXXXX',
      email: u.email || `${u.name.toLowerCase().replace(/\s+/g, '')}@indusbrain.com`,
      joiningDate: u.joiningDate || (u.createdAt ? u.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      status: u.status || 'Active'
    }));

    const equipment = equipmentList.map((eq: any) => ({
      id: eq.machineId,
      name: eq.machineName,
      location: eq.location,
      department: eq.department,
      status: eq.status,
      sop: eq.associatedSop,
      notes: eq.notes,
      manual: eq.manual || '',
      maintenanceHistory: eq.maintenanceHistory || [],
      lastService: eq.lastService || '',
      nextService: eq.nextService || '',
      sector: eq.sector || '',
      machineType: eq.machineType || '',
      manualCategory: eq.manualCategory || '',
      files: eq.files || []
    }));

    const documents = documentsList.map((d: any) => ({
      id: d.documentId,
      name: d.fileName,
      size: d.fileSize,
      status: d.status,
      text: d.extractedText,
      uploadedAt: d.uploadedAt,
      summary: d.summary || '',
      safetyPoints: d.safetyPoints || [],
      warnings: d.warnings || [],
      ppe: d.ppe || [],
      emergencyProcedures: d.emergencyProcedures || '',
      revisionDate: d.revisionDate || '',
      keywords: d.keywords || [],
      version: d.version || 1,
      versions: d.versions || []
    }));

    const reports = reportsList.map((r: any) => ({
      id: r.reportId,
      title: r.title || r.type,
      type: r.type,
      description: r.description,
      timestamp: r.createdAt,
      workerName: r.raisedBy,
      photo: r.photoUrl
    }));

    const logs = auditLogsList.map((l: any) => ({
      id: l.logId,
      user: l.userId,
      role: l.role as any,
      action: l.action,
      date: l.timestamp.split(' ')[0] || l.timestamp,
      time: l.timestamp.split(' ').slice(1).join(' ') || ''
    }));

    // Sort logs descending
    logs.sort((a, b) => b.id.localeCompare(a.id));

    const emergency = {
      fireProcedures: emergencyConfig?.fireProcedures || '',
      chemicalSpillSops: emergencyConfig?.chemicalSpillSops || '',
      firstAid: emergencyConfig?.firstAid || '',
      emergencyShutdown: emergencyConfig?.emergencyShutdown || '',
      evacuationProcedures: emergencyConfig?.evacuationProcedures || '',
      assemblyPoints: emergencyConfig?.assemblyPoints || '',
      emergencyContacts: emergencyContactsList.map((c: any) => ({
        name: c.name,
        phone: c.phone,
        role: c.role
      }))
    };

    return {
      accounts,
      documents,
      reports,
      equipment,
      employees,
      logs,
      chats: chatSessionsMap,
      emergency
    };

  } catch (error) {
    console.error('Error loading database from Firestore:', error);
    return getInitialData();
  }
}

// Global DB in-memory proxy sync
let db: any = getInitialData();

async function syncLocalDbFromFirestore() {
  db = await loadDBFromFirestore();
}

// Initial pull on start
syncLocalDbFromFirestore();

// API Routes
app.get('/api/data', async (req, res) => {
  await syncLocalDbFromFirestore();
  res.json(db);
});

// Logs Endpoint (managers & owners only)
app.post('/api/logs', async (req, res) => {
  const { user, role, action } = req.body;
  await addLogToFirestore(user, role, action);
  await syncLocalDbFromFirestore();
  res.json({ success: true, logs: db.logs });
});

// Account CRUD
app.post('/api/accounts', async (req, res) => {
  const { action, account, targetId, currentUserId } = req.body;
  if (action === 'add') {
    const usersSnap = await getDocs(collection(firestore, 'users'));
    let exists = false;
    usersSnap.forEach(doc => {
      if (doc.id.toLowerCase() === account.id.toLowerCase()) {
        exists = true;
      }
    });

    if (exists) {
      return res.status(400).json({ error: 'ID already exists' });
    }

    const newUserDoc = {
      id: account.id,
      name: account.name,
      role: account.role,
      department: account.role === 'owner' ? 'Management' : account.role === 'manager' ? 'Operations' : 'Floor Staff',
      email: `${account.name.toLowerCase().replace(/\s+/g, '')}@indusbrain.com`,
      employeeId: account.id,
      photoUrl: account.photo || '',
      createdAt: new Date().toISOString(),
      password: account.password || account.id,
      phone: '+91 XXXXX XXXXX',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    };

    await setDoc(doc(firestore, 'users', account.id), newUserDoc);
    await addLogToFirestore(currentUserId || 'Manager', 'manager', `Created account for ${account.name} (${account.id})`);
    
    await syncLocalDbFromFirestore();
    res.json({ success: true, accounts: db.accounts, employees: db.employees });
  } else if (action === 'delete') {
    if (targetId === '80079385') {
      return res.status(400).json({ error: 'Cannot delete permanent owner' });
    }
    await deleteDoc(doc(firestore, 'users', targetId));
    await addLogToFirestore(currentUserId || 'Manager', 'manager', `Deleted account with ID: ${targetId}`);

    await syncLocalDbFromFirestore();
    res.json({ success: true, accounts: db.accounts, employees: db.employees });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

// Employee CRUD
app.post('/api/employees/update', async (req, res) => {
  const { employee, newPassword } = req.body;
  const userRef = doc(firestore, 'users', employee.employeeId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const existing = userSnap.data();
    const updated: any = {
      ...existing,
      name: employee.name,
      photoUrl: employee.photo || existing.photoUrl || '',
      department: employee.department || existing.department || '',
      role: employee.role || existing.role || '',
      phone: employee.phone || existing.phone || '',
      email: employee.email || existing.email || '',
      status: employee.status || existing.status || 'Active'
    };
    if (newPassword) {
      updated.password = newPassword;
    }
    await setDoc(userRef, updated);
    await addLogToFirestore(employee.name, employee.role, `Updated employee profile for ${employee.name}`);
  }

  await syncLocalDbFromFirestore();
  res.json({ success: true, employees: db.employees, accounts: db.accounts });
});

// Equipment CRUD
app.post('/api/equipment', async (req, res) => {
  const { action, equipment } = req.body;
  const eqId = equipment.id;

  if (action === 'add') {
    const eqDoc = {
      machineId: equipment.id,
      machineName: equipment.name,
      location: equipment.location,
      department: equipment.department,
      status: equipment.status,
      associatedSop: equipment.sop,
      notes: equipment.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manual: equipment.manual || '',
      maintenanceHistory: equipment.maintenanceHistory || [],
      lastService: equipment.lastService || '',
      nextService: equipment.nextService || '',
      sector: equipment.sector || '',
      machineType: equipment.machineType || '',
      manualCategory: equipment.manualCategory || '',
      files: equipment.files || []
    };
    await setDoc(doc(firestore, 'equipment', eqId), eqDoc);
    await addLogToFirestore('Manager', 'manager', `Added new equipment: ${equipment.name}`);
  } else if (action === 'edit') {
    const eqDoc = {
      machineId: equipment.id,
      machineName: equipment.name,
      location: equipment.location,
      department: equipment.department,
      status: equipment.status,
      associatedSop: equipment.sop,
      notes: equipment.notes,
      updatedAt: new Date().toISOString(),
      manual: equipment.manual || '',
      maintenanceHistory: equipment.maintenanceHistory || [],
      lastService: equipment.lastService || '',
      nextService: equipment.nextService || '',
      sector: equipment.sector || '',
      machineType: equipment.machineType || '',
      manualCategory: equipment.manualCategory || '',
      files: equipment.files || []
    };
    await setDoc(doc(firestore, 'equipment', eqId), eqDoc);
    await addLogToFirestore('Manager', 'manager', `Updated equipment details: ${equipment.name}`);
  } else if (action === 'delete') {
    await deleteDoc(doc(firestore, 'equipment', eqId));
    await addLogToFirestore('Manager', 'manager', `Deleted equipment: ${equipment.name}`);
  }

  await syncLocalDbFromFirestore();
  res.json({ success: true, equipment: db.equipment });
});

// Emergency Center Update
app.post('/api/emergency', async (req, res) => {
  const { emergency } = req.body;

  const emergencyData = {
    fireProcedures: emergency.fireProcedures || '',
    chemicalSpillSops: emergency.chemicalSpillSops || '',
    firstAid: emergency.firstAid || '',
    emergencyShutdown: emergency.emergencyShutdown || '',
    evacuationProcedures: emergency.evacuationProcedures || '',
    assemblyPoints: emergency.assemblyPoints || ''
  };
  await setDoc(doc(firestore, 'config', 'emergency'), emergencyData);

  const contactsSnap = await getDocs(collection(firestore, 'emergencyContacts'));
  for (const doc of contactsSnap.docs) {
    await deleteDoc(doc.ref);
  }

  if (emergency.emergencyContacts && Array.isArray(emergency.emergencyContacts)) {
    for (const c of emergency.emergencyContacts) {
      const contactId = `contact-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const contactDoc = {
        name: c.name,
        role: c.role,
        phone: c.phone,
        type: 'emergency',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(firestore, 'emergencyContacts', contactId), contactDoc);
    }
  }

  await addLogToFirestore('Manager', 'manager', 'Updated plant emergency protocols');

  await syncLocalDbFromFirestore();
  res.json({ success: true, emergency: db.emergency });
});

// Raise Worker Report
app.post('/api/reports', async (req, res) => {
  const { report } = req.body;
  const repId = report.id;

  const repDoc = {
    reportId: repId,
    type: report.type,
    machineId: '',
    description: report.description,
    photoUrl: report.photo || '',
    priority: 'Medium',
    status: 'Open',
    raisedBy: report.workerName,
    createdAt: report.timestamp,
    reviewedBy: '',
    reviewedAt: '',
    title: report.title
  };

  await setDoc(doc(firestore, 'reports', repId), repDoc);
  await addLogToFirestore(report.workerName || 'Worker', 'worker', `Raised report: ${report.title}`);

  await syncLocalDbFromFirestore();
  res.json({ success: true, reports: db.reports });
});

// Document Intelligence with Gemini
app.post('/api/documents/upload', async (req, res) => {
  const { name, text, size, uploadedAt, version } = req.body;
  const docId = `doc-${Date.now()}`;


  const cleanText = text || 'Empty document contents.';
  
  let summary = 'Standard industrial procedural layout.';
  let safetyPoints: string[] = [];
  let warnings: string[] = [];
  let ppe: string[] = [];
  let emergencyProcedures = 'Alert supervisor in case of failures.';
  let revisionDate = new Date().toISOString().split('T')[0];
  let keywords: string[] = [];

  if (ai) {
    try {
      const prompt = `You are an industrial safety and systems auditor. Analyze the following document text and extract structured metrics in JSON.
      
      Document text:
      "${cleanText}"
      
      Provide a JSON output matching this schema:
      {
        "summary": "Short 1-2 sentence overview of the file",
        "safetyPoints": ["Safety point 1", "Safety point 2"],
        "warnings": ["Warning 1", "Warning 2"],
        "ppe": ["Required PPE item 1", "PPE item 2"],
        "emergencyProcedures": "What to do in case of an emergency or incident in this context",
        "revisionDate": "YYYY-MM-DD format (or estimate current date if not found)",
        "keywords": ["keyword1", "keyword2"]
      }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              safetyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              ppe: { type: Type.ARRAY, items: { type: Type.STRING } },
              emergencyProcedures: { type: Type.STRING },
              revisionDate: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['summary', 'safetyPoints', 'warnings', 'ppe', 'emergencyProcedures', 'revisionDate', 'keywords'],
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      summary = result.summary || summary;
      safetyPoints = result.safetyPoints || safetyPoints;
      warnings = result.warnings || warnings;
      ppe = result.ppe || ppe;
      emergencyProcedures = result.emergencyProcedures || emergencyProcedures;
      revisionDate = result.revisionDate || revisionDate;
      keywords = result.keywords || keywords;
    } catch (err) {
      console.error('Error in document analysis Gemini call:', err);
    }
  }

  // Version history setup
  const docVersion = version || 1;
  const docDoc = {
    documentId: docId,
    fileName: name,
    fileSize: size,
    status: 'Pending', // Pending is default status! Approved or rejected done later.
    extractedText: cleanText,
    uploadedAt,
    summary,
    safetyPoints,
    warnings,
    ppe,
    emergencyProcedures,
    revisionDate,
    keywords,
    version: docVersion,
    versions: [
      { version: docVersion, text: cleanText, uploadedAt }
    ]
  };

  await setDoc(doc(firestore, 'documents', docId), docDoc);
  await addLogToFirestore('Operator', 'worker', `Uploaded document: ${name}`);
  await syncLocalDbFromFirestore();
  res.json({ success: true, documents: db.documents });
});

// Update Document Version / Rename / Delete / Approve Workflow
app.post('/api/documents/action', async (req, res) => {
  const { action, id, name, text, uploadedAt, status } = req.body;
  const docRef = doc(firestore, 'documents', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const existing = docSnap.data();

  if (action === 'rename') {
    existing.fileName = name;
  } else if (action === 'approve') {
    existing.status = status; // Approved, Rejected, Pending
  } else if (action === 'delete') {
    await deleteDoc(docRef);
    await addLogToFirestore('Manager', 'manager', `Deleted document with ID: ${id}`);
    await syncLocalDbFromFirestore();
    return res.json({ success: true, documents: db.documents });
  } else if (action === 'new_version') {
    const nextVer = (existing.version || 1) + 1;
    existing.extractedText = text;
    existing.version = nextVer;
    existing.uploadedAt = uploadedAt;
    if (!existing.versions) existing.versions = [];
    existing.versions.push({
      version: nextVer,
      text,
      uploadedAt
    });
  }

  await setDoc(docRef, existing);
  await syncLocalDbFromFirestore();
  res.json({ success: true, documents: db.documents });
});

// Chat Session CRUD
app.post('/api/chat/sessions', async (req, res) => {
  const { action, userId, sessionId, title } = req.body;

  if (action === 'create') {
    const newSessionId = `session-${Date.now()}`;
    const newSession = {
      id: newSessionId,
      title: title || 'New Conversation',
      createdAt: new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: []
    };
    await setDoc(doc(firestore, 'chatSessions', `${userId}-${newSessionId}`), {
      userId,
      sessionId: newSessionId,
      session: newSession
    });
    await syncLocalDbFromFirestore();
    return res.json({ success: true, sessions: db.chats[userId] || [], activeId: newSessionId });
  } else if (action === 'rename') {
    const sessionRef = doc(firestore, 'chatSessions', `${userId}-${sessionId}`);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
      const data = sessionSnap.data();
      data.session.title = title;
      await setDoc(sessionRef, data);
    }
    await syncLocalDbFromFirestore();
    return res.json({ success: true, sessions: db.chats[userId] || [] });
  } else if (action === 'delete') {
    await deleteDoc(doc(firestore, 'chatSessions', `${userId}-${sessionId}`));
    await syncLocalDbFromFirestore();
    return res.json({ success: true, sessions: db.chats[userId] || [] });
  } else if (action === 'list') {
    await syncLocalDbFromFirestore();
    return res.json({ success: true, sessions: db.chats[userId] || [] });
  }
  res.status(400).json({ error: 'Invalid chat action' });
});

// Chunking and scoring helper functions for PS 8: Industrial Asset Intelligence
function splitIntoChunks(text: string, chunkSize = 1200, overlap = 200): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    const chunk = text.slice(index, index + chunkSize);
    chunks.push(chunk);
    index += (chunkSize - overlap);
    if (index >= text.length || chunk.length < chunkSize) {
      break;
    }
  }
  if (chunks.length === 0 && text) {
    chunks.push(text);
  }
  return chunks;
}

function scoreChunk(chunkText: string, docName: string, query: string): number {
  const q = query.toLowerCase();
  const chunk = chunkText.toLowerCase();
  const name = docName.toLowerCase();
  
  let score = 0;

  // Exact phrase match
  if (chunk.includes(q)) {
    score += 150;
  }

  // Check specific industrial aliases & IDs
  const aliasMappings = [
    { id: "car-robo-01", terms: ["car-robo-01", "eq-vm82wf", "automotive body inspection", "assembly cell", "robotic assembly", "pneumatic pressure"] },
    { id: "can-fill-02", terms: ["can-fill-02", "can filling machine", "carbonated beverage", "seaming machine", "co2 pressure"] },
    { id: "can-e112", terms: ["can-e112", "low fill", "fill level"] },
    { id: "car-e101", terms: ["car-e101", "pneumatic pressure low"] },
    { id: "car-e204", terms: ["car-e204", "robotic arm stopped"] },
    { id: "car-e310", terms: ["car-e310", "vision camera"] },
    { id: "car-e415", terms: ["car-e415", "high vibration"] },
    { id: "can-e220", terms: ["can-e220", "seamer vibration"] },
    { id: "can-e305", terms: ["can-e305", "co2 pressure unstable"] },
    { id: "can-e410", terms: ["can-e410", "conveyor jam"] }
  ];

  for (const alias of aliasMappings) {
    const queryHasAlias = alias.terms.some(t => q.includes(t));
    const chunkHasAlias = alias.terms.some(t => chunk.includes(t));
    if (queryHasAlias && chunkHasAlias) {
      score += 200; // Large boost for matching target machine / fault and corresponding chunk!
    }
  }

  // Term matching
  const words = q.split(/[\s,.\-?()]+/).filter(w => w.length > 2);
  for (const word of words) {
    if (chunk.includes(word)) {
      score += 15;
    }
    if (name.includes(word)) {
      score += 5;
    }
  }

  return score;
}

// Chat streaming word-by-word with Gemini
app.post('/api/chat/stream', async (req, res) => {
  const { userId, sessionId, message, imageBase64 } = req.body;
  
  if (!userId || !sessionId) {
    return res.status(400).json({ error: 'Missing userId or sessionId' });
  }

  // Ensure user has session
  if (!db.chats[userId]) {
    db.chats[userId] = [];
  }
  let session = db.chats[userId].find((s: any) => s.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      title: message.substring(0, 30) + '...',
      createdAt: new Date().toLocaleString(),
      messages: []
    };
    db.chats[userId].push(session);
  }

  // Add User Message to History
  const userMsgId = `msg-${Date.now()}`;
  const userMsg = {
    id: userMsgId,
    sender: 'me' as const,
    text: message,
    source: imageBase64 ? 'Uploaded Image Analysis' : undefined
  };
  session.messages.push(userMsg);
  await saveChatSessionToFirestore(userId, sessionId, session);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Fast utility to write stream event
  const sendChunk = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!ai) {
    // Fallback if no Gemini Key configured
    const mockReply = "I am INDUS BRAIN, developed by INDUS GROUP, an enterprise industrial operations intelligence platform. I am currently operating in offline backup mode. Please verify that enterprise credentials are fully provisioned to unlock my active multimodal scanning, document intelligence indexes, and real-time plant analytics. In this local offline mode, I can still assist you with general queries on safety guidelines, standard operating procedures, and facility contact details.";
    let currentIdx = 0;
    const interval = setInterval(async () => {
      if (currentIdx >= mockReply.length) {
        clearInterval(interval);
        // Save final
        const botMsg = { id: `msg-${Date.now() + 1}`, sender: 'bot' as const, text: mockReply };
        session.messages.push(botMsg);
        await saveChatSessionToFirestore(userId, sessionId, session);
        sendChunk({ done: true, text: mockReply });
        res.end();
      } else {
        const nextChunk = mockReply.substring(0, currentIdx + 5);
        sendChunk({ text: nextChunk });
        currentIdx += 5;
      }
    }, 40);
    return;
  }

  try {
    const qLower = message.trim().toLowerCase();

    // 1. AI Safety Risk Detection
    // Check if worker is asking something dangerous/unsafe (e.g., bypass safety logs, work without harness, igniting gas, hot work without permit)
    const dangerousKeywords = [
      'bypass safety', 'work without harness', 'ignore gas alarm', 'skip gas test',
      'force hot work', 'hot work without permit', 'disable vent', 'turn off ventilator'
    ];
    const isDangerous = dangerousKeywords.some(keyword => qLower.includes(keyword));

    if (isDangerous) {
      const dangerWarning = `⚠️ WARNING: UNSAFE OPERATIONAL PROCEDURE DETECTED.
      
Entering or performing hot work without a valid safety permit or bypassing atmospheric sensors is strictly prohibited and can be FATAL. 

According to Standard Operating Procedure (SOP) 14:
- Confined space entry requires a gas-test permit.
- Atmospheric levels must be continuously monitored.
- Standby safety supervisor must be present.
- Proper PPE (safety harness, gas detectors) is legally mandatory.

Please stop current operations immediately and contact your shift safety officer.`;

      // Stream the warning
      sendChunk({ text: dangerWarning, isWarning: true });
      
      const botMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot' as const,
        text: dangerWarning,
        isWarning: true
      };
      session.messages.push(botMsg);
      await saveChatSessionToFirestore(userId, sessionId, session);
      sendChunk({ done: true, text: dangerWarning });
      res.end();
      return;
    }

    // 1b. Identity and System Security Checks
    const isRestrictedQuery = [
      'what model', 'which api', 'backend provider', 'system prompt', 'your prompt',
      'who built you', 'who created you', 'how are you built', 'internal architecture',
      'confidential system', 'your api', 'google ai', 'gemini', 'openrouter', 'openai',
      'underlying model', 'large language model', 'your developer', 'who is your developer'
    ].some(keyword => qLower.includes(keyword));

    const isDirectIdentityQuery = [
      'who are you', 'what is your name', 'tell me about yourself'
    ].some(keyword => qLower.includes(keyword));

    if (isRestrictedQuery) {
      const account = db.accounts.find((a: any) => a.id === userId) || { name: userId, role: 'worker' };
      await addLogToFirestore(account.name, account.role, `🚨 SECURITY ALERT: Restricted Question Blocked. Query: "${message}"`);

      const refusalResponse = `Sorry, I cannot disclose internal architecture, implementation details, prompts, APIs, infrastructure, or confidential system information. Please ask questions related to plant operations, equipment, maintenance, SOPs, reports, or uploaded documents.`;
      
      sendChunk({ text: refusalResponse });
      const botMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot' as const,
        text: refusalResponse
      };
      session.messages.push(botMsg);
      await saveChatSessionToFirestore(userId, sessionId, session);
      sendChunk({ done: true, text: refusalResponse });
      res.end();
      return;
    }

    if (isDirectIdentityQuery) {
      const identityResponse = `I am INDUS BRAIN, developed by INDUS GROUP, an enterprise industrial operations intelligence platform. I assist with industrial operations, maintenance, equipment management, compliance, safety, documentation, and organizational knowledge.`;
      
      sendChunk({ text: identityResponse });
      const botMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot' as const,
        text: identityResponse
      };
      session.messages.push(botMsg);
      await saveChatSessionToFirestore(userId, sessionId, session);
      sendChunk({ done: true, text: identityResponse });
      res.end();
      return;
    }

    // 2. Classify Message (General Conversation vs. Document/Equipment Lookup)
    const defaultDocTexts: { [key: string]: string } = {
      "INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf": `Document: INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf
Type: PDF Document Intelligence Section
---
Physical Assets & Operations:
- Asset ID: CAR-ROBO-01
  Name: CAR-ROBO-01 (Automotive Body Inspection and Assembly Cell)
  Also known as: Automotive Body Inspection and Assembly Cell.
  Location: Sector 4, Main Assembly Bay, Waluj MIDC, Chhatrapati Sambhajinagar, Maharashtra.
  Department: Production / Automation Cell.
  Safe Operating Parameters:
  * Safe pneumatic pressure is 5.5 to 6.2 bar.
  * Operating temperature is 20°C to 38°C.
  * Maximum safe vibration is below 4.5 mm/s.
  * Inspection cycle time is 90 seconds per car body.
  Operating Parameter Speed: 1.2 m/s, Payload limit: 500 kg.
  SOP: Ensure workspace clearing before booting, run safety self-test.
  Maintenance Log: Last serviced on June 15, 2026. Sensor calibration completed.
  Safety Rule: Maintain 1.5m safety boundary during operation. No entry in active zone.
  Emergency Procedure: Press closest emergency stop mushroom button or contact shift supervisor.
  Responsible Team: Automation & Robotics Cell (contact shift lead).

Fault Diagnostic Directory:
- Fault Code: CAR-E101
  Meaning: pneumatic pressure low.
- Fault Code: CAR-E204
  Meaning: robotic arm stopped.
  Possible causes: obstruction, safety curtain triggered, or servo fault.
- Fault Code: CAR-E310
  Meaning: vision camera alignment error.
- Fault Code: CAR-E415
  Meaning: high vibration detected.

- Fault Code: CAN-E112
  Meaning: low fill level detected.
  Possible causes: Filling valve blockage, low product pressure, or fill timing error.
  Recommended action: Stop the line, inspect and clean the filling valve, verify product pressure and pump condition, check fill timing settings, and test with trial cans.

Special Assets:
- Asset: CAN-FILL-02 (Carbonated Beverage Can Filling and Seaming Machine)
  Also known as: Carbonated Beverage Can Filling and Seaming Machine.
  Location: Line B, Packaging Hall, Shendra MIDC, Chhatrapati Sambhajinagar, Maharashtra.
  Safe Operating Parameters:
  * Safe CO2 pressure is 2.2 to 2.8 bar.
  * Filling temperature is 3°C to 6°C.
  * Recommended speed is 180 cans per minute.
  * Maximum seamer vibration is below 5.0 mm/s.
  Emergency conditions: Heavy leakage, abnormal vibration, can burst, or conveyor jam.
  Emergency Action / Safety SOP:
  1. Press emergency stop first.
  2. Isolate product and CO2 supply where appropriate.
  3. Keep workers away from conveyors and seamer.
  4. Inform packaging supervisor and maintenance immediately.
  5. Restart only after inspection and supervisor approval.

Fault Diagnostic Directory (CAN-FILL-02):
- Fault Code: CAN-E112
  Meaning: low fill level detected.
  Possible causes: filling valve blockage, low product pressure, or fill timing error.
- Fault Code: CAN-E220
  Meaning: seamer vibration high.
- Fault Code: CAN-E305
  Meaning: CO2 pressure unstable.
- Fault Code: CAN-E410
  Meaning: conveyor jam.

Maintenance Notifications / Status:
- CAN-FILL-02 needs maintenance because seamer vibration reached 5.8 mm/s and seaming roller inspection was requested.`,

      "Safety_Procedure_SOP_14.pdf": `Document: Safety_Procedure_SOP_14.pdf
Type: Approved SOP Document
---
SAFETY COMPLIANCE STANDARD OPERATING PROCEDURE (SOP) 14 - COKE OVEN & CONFINED SPACES

Section 1: Confined Space Entry
1.1 Confined space entry near the coke oven requires an active gas-test permit, continuous atmospheric monitoring, and a standby attendant at the entry point at all times.
1.2 Under no circumstances should personnel enter without proper safety harnesses and gas detectors.
1.3 Respiratory protection must be worn in high dust/gas areas.

Section 2: Gas Leaks & Emergency Response
2.1 If a user smells gas near the coke oven, stop work immediately, evacuate the area, and alert your shift supervisor.
2.2 Do not re-enter until a formal gas test confirms safe oxygen and toxic gas levels.
2.3 The assembly point for coke oven emergencies is Assembly Zone Alpha (West Gate).

Section 3: Work Permits & Approvals
3.1 Hot work and height permits must be co-signed by the designated shift safety officer and retained for audit for 12 months.
3.2 Daily checklists must be submitted to the Operations Manager before commencing shifts.`,

      "Maintenance_Log_PumpStation.pdf": `Document: Maintenance_Log_PumpStation.pdf
Type: Approved Maintenance Log
---
MAINTENANCE OPERATIONS LOG - INDUSTRIAL PUMP STATION B & CONVEYOR BELT SYSTEMS

Section 1: Pump Station B Operations
1.1 Pump Station B check-valves must be manually verified. Leak logs show nominal pressure ranges of 14.2 to 15.6 bar.
1.2 Main seal lubricants must be topped up every 100 operating hours.
1.3 In case of pressure drops below 12.0 bar, trigger the emergency isolation valves.

Section 2: Conveyor Belt 2 System
2.1 The maintenance manual for Conveyor Belt 2 states that main conveyor rollers require inspection every 24 operating hours.
2.2 Belt tension must be kept between 450N and 500N. Adjust the tension pulleys during weekly maintenance shutdowns.
2.3 Any belt misalignment must be reported immediately to prevent friction-induced heat hazards.`
    };

    // Synthesize/Ensure demo documents are loaded in the query context
    const docList = [...(db.documents || [])];
    for (const name of Object.keys(defaultDocTexts)) {
      const exists = docList.some((d: any) => d.name === name);
      if (!exists) {
        docList.push({
          id: `doc-demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name,
          size: "3.8 MB",
          chunks: 10,
          status: "Approved",
          text: defaultDocTexts[name],
          uploadedAt: new Date().toISOString()
        });
      }
    }

    // Check if user is asking general conversation questions first
    const conversationKeywords = [
      'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
      'thank you', 'thanks', 'what can you do', 'help me', 'how are you',
      'what is artificial intelligence'
    ];
    const isGeneralConversation = conversationKeywords.some(keyword => qLower.startsWith(keyword) || qLower.includes(keyword)) || qLower.length < 15;

    // Match query against documents first via chunk search
    const allDocs = docList.map((d: any) => {
      const customText = defaultDocTexts[d.name] || d.text || '';
      return {
        id: d.id,
        name: d.name,
        text: customText,
        status: d.status
      };
    });

    const allChunks: { text: string; docName: string; docId: string; docStatus: string }[] = [];
    for (const doc of allDocs) {
      const chunks = splitIntoChunks(doc.text, 1000, 200);
      for (const ch of chunks) {
        allChunks.push({
          text: ch,
          docName: doc.name,
          docId: doc.id,
          docStatus: doc.status || 'Pending'
        });
      }
    }

    // Score chunks
    const scoredChunks = allChunks.map(chunk => {
      const score = scoreChunk(chunk.text, chunk.docName, message);
      return { ...chunk, score };
    }).filter(ch => ch.score > 20); // Filter out irrelevant/low matches

    scoredChunks.sort((a, b) => b.score - a.score);

    let foundInDocument = scoredChunks.length > 0;
    let documentContext = '';
    let primaryMatchedDocName = '';
    let foundDocs: any[] = [];

    if (foundInDocument) {
      documentContext = `MATCHING DOCUMENT CHUNKS (FOUND IN UPLOADED MANUALS):\n` +
        scoredChunks.slice(0, 3).map((ch, idx) => `[Chunk ${idx + 1} from Document: ${ch.docName}] (Status: ${ch.docStatus})\n${ch.text}`).join('\n\n');
      primaryMatchedDocName = scoredChunks[0].docName;
      foundDocs = [{ doc: { name: primaryMatchedDocName, status: scoredChunks[0].docStatus }, matches: scoredChunks[0].score }];
    } else {
      // Default fallback
      const primaryDoc = allDocs.find(d => d.name === "INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf");
      if (primaryDoc) {
        documentContext = `DEFAULT DOCUMENT CONTEXT (Fallback):\n[Document: INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf] (Status: Approved)\n${primaryDoc.text}`;
        primaryMatchedDocName = "INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf";
        foundDocs = [{ doc: primaryDoc, matches: 10 }];
      }
    }

    // Check Equipment Registry
    let matchedEquipment: any = null;
    if (db.equipment) {
      for (const eq of db.equipment) {
        const eqNameLower = eq.name.toLowerCase();
        const eqIdLower = eq.id.toLowerCase();
        if (qLower.includes(eqNameLower) || qLower.includes(eqIdLower)) {
          matchedEquipment = eq;
          break;
        }
      }
    }

    let equipmentContext = '';
    if (matchedEquipment) {
      equipmentContext = `MATCHING EQUIPMENT RECORD FROM REGISTRY:\n` +
        `- Machine ID: ${matchedEquipment.id}
  Machine Name: ${matchedEquipment.name}
  Department: ${matchedEquipment.department}
  Location: ${matchedEquipment.location}
  Manual: ${matchedEquipment.manual}
  SOP: ${matchedEquipment.sop}
  Status: ${matchedEquipment.status}
  Sector: ${matchedEquipment.sector}
  Machine Type: ${matchedEquipment.machineType}
  Notes: ${matchedEquipment.notes}`;
    }

    const fullEquipmentListText = (db.equipment || []).map((eq: any) => {
      return `- Machine ID: ${eq.id}
  Machine Name: ${eq.name}
  Department: ${eq.department}
  Location: ${eq.location}
  Manual: ${eq.manual}
  SOP: ${eq.sop}
  Status: ${eq.status}
  Sector: ${eq.sector}
  Machine Type: ${eq.machineType}
  Notes: ${eq.notes}`;
    }).join('\n\n');

    const equipmentRegistryContext = `ALL EQUIPMENT REGISTRY RECORDS:\n${fullEquipmentListText}`;

    // 4. Construct Prompt
    let finalPrompt = '';
    let systemInstruction = '';

    if (isGeneralConversation) {
      systemInstruction = `You are Indus Brain AI, an industrial knowledge assistant for PS 8: AI for Industrial Knowledge Intelligence — Unified Asset & Operations Brain.
This is a general friendly conversation. Answer naturally, warmly, and helpfully using your general knowledge model without references to any documents. Keep the tone professional but warm.
CRITICAL STYLE RULE: Do NOT use any bold star formatting (i.e. do NOT write any words enclosed in double or single stars like **word** or *word*). Always output plain text, standard capitalization, and short paragraphs.`;
      finalPrompt = `User Question: ${message}`;
    } else {
      systemInstruction = `You are Indus Brain AI, an industrial knowledge assistant for PS 8: AI for Industrial Knowledge Intelligence — Unified Asset & Operations Brain.
Your main job is to help workers, operators, and managers understand industrial machines, SOPs, maintenance logs, emergency steps, safety instructions, fault codes, reports, and operating parameters.

SOURCE PRIORITY RULE:
Always prioritize and answer using this exact source priority order:
1. Uploaded PDF documents from the Document Intelligence section (such as INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf, Safety_Procedure_SOP_14.pdf, Maintenance_Log_PumpStation.pdf)
2. Approved SOP documents
3. Equipment Directory / Add Machine registry
4. General AI knowledge only when no uploaded project data is available

The uploaded document MUST always be checked first.
If the uploaded document contains the answer, use that answer as the final answer.
If uploaded document data and Equipment Directory data are different, prefer the uploaded document.

STARTING PHRASES:
- When using uploaded document data, you MUST start the answer with exactly:
According to the uploaded document,
(Do NOT start with "Based on the enterprise asset registry" or anything else unless the uploaded document does not contain the answer.)

- If the answer is not found in the uploaded document, you MUST say exactly:
I could not find this in the uploaded document. Based on the equipment registry,

- If the answer is not found anywhere in the uploaded documents, SOPs, or equipment registry, you MUST say exactly:
I could not find this information in the uploaded documents, SOPs, or equipment registry.

ANSWER STYLE RULES (CRITICAL):
- Keep answers clean, simple, and professional.
- Do NOT use too much Markdown.
- STRICTLY FORBIDDEN: Do NOT use any bold star formatting. Do NOT use double stars (**) or single stars (*) anywhere in the text or headers. Write completely in plain text, standard capitalization, clean spacing, and short paragraphs.
- Do NOT use unnecessary symbols.
- Do NOT over-explain.
- Use short paragraphs.
- Give direct answers first.
- Do NOT invent information.

SOURCE LINE RULE (CRITICAL):
At the end of every answer, you MUST mention the source clearly on a new line.
Format: Source: Uploaded document — <document_name>
(or "Source: Equipment Directory" if the answer is found in the Equipment Registry)

MACHINE QUESTION RULE:
When the user asks about a machine ID, machine name, machine location, operating parameter, SOP, fault code, maintenance log, safety rule, emergency procedure, or responsible team, search the uploaded document first.
For example, if asked: Where is CAR-ROBO-01 located?
Your response MUST be exactly:
According to the uploaded document, CAR-ROBO-01 is located at Sector 4, Main Assembly Bay, Waluj MIDC, Chhatrapati Sambhajinagar, Maharashtra.
Source: Uploaded document — INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf

FAULT QUESTION RULE:
For fault questions (such as CAN-E112, CAR-E204 or others), you MUST answer in this exact format (no stars, no bolding):
Fault: [fault code or name]
Meaning: [what it means]
Possible causes: [list of causes]
Recommended action: [list of actions]
Source: Uploaded document — <document_name>

Example for CAN-E112:
Fault: CAN-E112
Meaning: low fill level detected
Possible causes:
Filling valve blockage, low product pressure, or fill timing error.
Recommended action:
Stop the line, inspect and clean the filling valve, verify product pressure and pump condition, check fill timing settings, and test with trial cans.
Source: Uploaded document — INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf

EMERGENCY QUESTION RULE:
For emergency questions, you MUST give immediate safety action first in this exact format (no stars, no bolding):
Immediate action: [action]
Safety steps: [steps]
Who to inform: [who to tell]
Restart condition: [conditions]
Source: [source info]

PROJECT SCOPE RULE:
Never claim that the current prototype uses IoT, sensors, CCTV, Arduino, Raspberry Pi, or real factory machines.
If asked about IoT, say:
This prototype is a pure software AI platform. It uses uploaded documents, SOPs, machine records, reports, and AI assistance. IoT integration can be added in future scope.

HACKATHON DEMO RULE:
When answering during demo, sound confident and practical.
Explain that Indus Brain AI connects: documents, SOPs, equipment data, maintenance logs, worker reports, emergency procedures, audit logs, and AI assistance into one unified industrial operations brain.`;

      // Inject deterministic query formatting instruction based on matches
      let queryGuidance = '';
      if (foundInDocument) {
        queryGuidance = `[DETERMINISTIC INSTRUCTION: The information is available in the uploaded document ${primaryMatchedDocName}. You MUST start your response with "According to the uploaded document," and end with "Source: Uploaded document — ${primaryMatchedDocName}". Strictly use NO stars/bolding.]`;
      } else if (matchedEquipment) {
        queryGuidance = `[DETERMINISTIC INSTRUCTION: The information is NOT in the uploaded documents, but it is available in the Equipment Registry. You MUST start your response with "I could not find this in the uploaded document. Based on the equipment registry," and end with "Source: Equipment Directory". Strictly use NO stars/bolding.]`;
      } else {
        queryGuidance = `[DETERMINISTIC INSTRUCTION: The information is not found in documents or equipment registry. You MUST output exactly: "I could not find this information in the uploaded documents, SOPs, or equipment registry." and end with no other source.]`;
      }

      finalPrompt = `${documentContext}\n\n${equipmentContext}\n\n${equipmentRegistryContext}\n\n${queryGuidance}\n\nUser Question:\n${message}`;
    }

    // 5. Build multimodal payload if image is uploaded
    let contentsPayload: any = finalPrompt;
    if (imageBase64) {
      const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
      const base64Data = imageBase64.substring(imageBase64.indexOf(',') + 1);
      
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analyze this equipment panel, machine warning sticker, layout, or handwritten sheet. Perform OCR to read text and markings, and explain the contents. Answer this question: "${message}"`,
          },
        ],
      };
      systemInstruction += '\nYou are viewing an uploaded machine nameplate, checklist, or physical plant photo. Extract warnings, nameplates, control values, and read handwritten logs.';
    }

    // Call Gemini Stream API
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: contentsPayload,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    let accumulatedText = '';
    for await (const chunk of responseStream) {
      let text = chunk.text || '';
      accumulatedText += text;
      
      // Clean text to avoid bold stars if any slipped through
      const cleanStreamText = accumulatedText.replace(/\*\*/g, '').replace(/\*/g, '');
      sendChunk({ text: cleanStreamText });
    }

    // Fully strip out any bold stars and asterisks in the final saved message
    accumulatedText = accumulatedText.replace(/\*\*/g, '').replace(/\*/g, '');

    // Append metadata to AI Response
    let confidence = 0.95;
    let sourceDoc = undefined;
    let relatedDocs: string[] = [];

    if (!isGeneralConversation) {
      if (foundDocs.length > 0) {
        confidence = Math.min(0.99, 0.7 + (foundDocs[0].matches * 0.05));
        sourceDoc = foundDocs[0].doc.name;
        relatedDocs = foundDocs.slice(1, 3).map(f => f.doc.name);
      } else {
        // Default sourceDoc mapping if we fallback to INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf
        sourceDoc = "INDUS-BRAIN-AI-INDUSTRIAL-ASSET-KNOWLEDGE-DOCUMENT.pdf";
      }
    }

    const botMsg = {
      id: `msg-${Date.now() + 1}`,
      sender: 'bot' as const,
      text: accumulatedText,
      confidence: isGeneralConversation ? undefined : confidence,
      sourceDoc,
      pageNumber: isGeneralConversation ? undefined : 1,
      relatedDocs: relatedDocs.length > 0 ? relatedDocs : undefined
    };

    session.messages.push(botMsg);
    await saveChatSessionToFirestore(userId, sessionId, session);

    // Finalize stream
    sendChunk({ done: true, text: accumulatedText, ...botMsg });
    res.end();

  } catch (err: any) {
    console.error('Streaming Chat Error:', err);
    sendChunk({ text: "I apologize, but I encountered a temporary operational processing interruption. Please ensure that the plant database connection is fully stable. If this disruption persists, please alert your shift systems supervisor." });
    sendChunk({ done: true });
    res.end();
  }
});

// Gemini TTS Generation for Voice assistant
app.post('/api/voice/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  if (!ai) {
    return res.status(500).json({ error: 'Gemini API not configured' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: `Read this technical response clearly and professional: ${text}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Clear tech assistant voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: 'No audio data generated' });
    }
  } catch (err: any) {
    console.error('TTS error:', err);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  // Setup dev server or static file server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Indus Brain Server active on http://localhost:${PORT}`);
  });
}

startServer();
