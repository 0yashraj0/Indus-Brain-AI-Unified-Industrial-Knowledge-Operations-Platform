import assert from 'node:assert/strict';

// Core Account Creation Logic & Rules Verification Test Suite

// Account type definition
interface AccountData {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'worker';
  employeeId?: string;
  status?: string;
}

const MAX_WORKER_ACCOUNTS = 100;

// Helper: Simulate normalized duplicate check
function checkDuplicate(existingAccounts: AccountData[], newId: string): boolean {
  const normalizedNewId = newId.trim().toLowerCase();
  return existingAccounts.some(acc => {
    const id1 = String(acc.id || '').trim().toLowerCase();
    const id2 = String(acc.employeeId || '').trim().toLowerCase();
    return id1 === normalizedNewId || id2 === normalizedNewId;
  });
}

// Helper: Simulate account registration logic
function registerAccount(
  existingAccounts: AccountData[],
  newAcc: AccountData,
  actorRole: 'owner' | 'manager' | 'worker'
): { success: boolean; error?: string; updatedAccounts?: AccountData[] } {
  // Permission check
  if (actorRole !== 'owner' && actorRole !== 'manager') {
    return { success: false, error: 'You are not authorized to create employee accounts.' };
  }

  // Manager constraint
  if (actorRole === 'manager' && newAcc.role !== 'worker') {
    return { success: false, error: 'You are not authorized to create employee accounts.' };
  }

  // ID validation
  const cleanId = String(newAcc.id || '').trim();
  const cleanName = String(newAcc.name || '').trim();

  if (!cleanId || cleanId.length < 2 || !/^[a-zA-Z0-9_\-]+$/.test(cleanId)) {
    return { success: false, error: 'Enter a valid Employee ID.' };
  }

  // Duplicate ID check
  if (checkDuplicate(existingAccounts, cleanId)) {
    return { success: false, error: 'An account with this Employee ID already exists.' };
  }

  // 100 worker accounts limit check
  if (newAcc.role === 'worker') {
    const activeWorkerCount = existingAccounts.filter(
      acc => acc.role === 'worker' && acc.status !== 'Inactive'
    ).length;

    if (activeWorkerCount >= MAX_WORKER_ACCOUNTS) {
      return { success: false, error: 'The maximum limit of 100 employee accounts has been reached.' };
    }
  }

  const createdAccount: AccountData = {
    ...newAcc,
    id: cleanId,
    name: cleanName,
    employeeId: cleanId,
    status: 'Active'
  };

  return {
    success: true,
    updatedAccounts: [...existingAccounts, createdAccount]
  };
}

async function runAccountCreationTests() {
  console.log('----------------------------------------------------');
  console.log('Running Account Creation & Limit Verification Tests');
  console.log('----------------------------------------------------');

  let db: AccountData[] = [
    { id: 'YASHOWN01', name: 'System Owner', role: 'owner', employeeId: 'YASHOWN01', status: 'Active' },
    { id: 'P-0001', name: 'PRAVAN', role: 'worker', employeeId: 'P-0001', status: 'Active' }
  ];

  // Test 1: Register 2nd worker (WORKER002)
  console.log('Test 1: Creating 2nd worker account...');
  const res1 = registerAccount(db, { id: 'WORKER002', name: 'Worker Two', role: 'worker' }, 'owner');
  assert.equal(res1.success, true, 'Worker 2 creation failed');
  db = res1.updatedAccounts!;
  console.log('✓ Test 1 Passed: 2nd worker account created.');

  // Test 2: Register 3rd worker (WORKER003) - Proves system goes beyond ~2 accounts
  console.log('Test 2: Creating 3rd worker account (WORKER003)...');
  const res2 = registerAccount(db, { id: 'WORKER003', name: 'Worker Three', role: 'worker' }, 'owner');
  assert.equal(res2.success, true, 'Worker 3 creation failed');
  db = res2.updatedAccounts!;
  console.log('✓ Test 2 Passed: 3rd worker account created successfully.');

  // Test 3: Exact duplicate ID rejection
  console.log('Test 3: Rejecting exact duplicate ID (WORKER003)...');
  const res3 = registerAccount(db, { id: 'WORKER003', name: 'Duplicate Person', role: 'worker' }, 'owner');
  assert.equal(res3.success, false);
  assert.equal(res3.error, 'An account with this Employee ID already exists.');
  console.log('✓ Test 3 Passed: Exact duplicate rejected.');

  // Test 4: Normalized duplicate ID rejection (casing & leading/trailing whitespace)
  console.log('Test 4: Rejecting normalized duplicate ID ("  worker003  ")...');
  const res4 = registerAccount(db, { id: '  worker003  ', name: 'Spaced Duplicate', role: 'worker' }, 'owner');
  assert.equal(res4.success, false);
  assert.equal(res4.error, 'An account with this Employee ID already exists.');
  console.log('✓ Test 4 Passed: Case and whitespace insensitive duplicate rejected.');

  // Test 5: Worker role cannot create employee accounts
  console.log('Test 5: Worker role permission enforcement...');
  const res5 = registerAccount(db, { id: 'WORKER004', name: 'Unauthorized Creation', role: 'worker' }, 'worker');
  assert.equal(res5.success, false);
  assert.equal(res5.error, 'You are not authorized to create employee accounts.');
  console.log('✓ Test 5 Passed: Worker role prevented from creating accounts.');

  // Test 6: Creating multiple accounts up to 100 workers
  console.log('Test 6: Registering up to 100 worker accounts...');
  for (let i = db.filter(a => a.role === 'worker').length + 1; i <= 100; i++) {
    const id = `EMP-TEST-${String(i).padStart(3, '0')}`;
    const res = registerAccount(db, { id, name: `Employee ${i}`, role: 'worker' }, 'manager');
    assert.equal(res.success, true, `Failed at worker #${i}`);
    db = res.updatedAccounts!;
  }
  const workerCount = db.filter(a => a.role === 'worker').length;
  assert.equal(workerCount, 100, `Worker count should be 100, got ${workerCount}`);
  console.log(`✓ Test 6 Passed: Successfully populated ${workerCount} worker accounts.`);

  // Test 7: Rejecting 101st worker account with specific error message
  console.log('Test 7: Attempting 101st worker account creation...');
  const res7 = registerAccount(db, { id: 'EMP-TEST-101', name: 'Over Limit Worker', role: 'worker' }, 'owner');
  assert.equal(res7.success, false);
  assert.equal(res7.error, 'The maximum limit of 100 employee accounts has been reached.');
  console.log('✓ Test 7 Passed: 101st worker account rejected with exact limit message.');

  // Test 8: Re-registering a deleted ID
  console.log('Test 8: Re-registering an account after deletion...');
  // Delete EMP-TEST-050
  db = db.filter(a => a.id !== 'EMP-TEST-050');
  assert.equal(db.filter(a => a.role === 'worker').length, 99);
  
  // Re-register EMP-TEST-050
  const res8 = registerAccount(db, { id: 'EMP-TEST-050', name: 'Replacement Worker', role: 'worker' }, 'owner');
  assert.equal(res8.success, true);
  db = res8.updatedAccounts!;
  assert.equal(db.filter(a => a.role === 'worker').length, 100);
  console.log('✓ Test 8 Passed: Re-registration of deleted account succeeded and worker count maintained.');

  console.log('----------------------------------------------------');
  console.log('ALL ACCOUNT CREATION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('----------------------------------------------------');
}

runAccountCreationTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
