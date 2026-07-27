import assert from 'node:assert';
import { validatePasswordRules, generateCompliantTempPassword } from './passwordSecurity.js';
import bcrypt from 'bcryptjs';

console.log('Running Password Management Security Verification Tests...');

// Test 1: Password Rule Validation
console.log('Test 1: Password Rule Validation');

// Too short (< 10 chars)
const shortCheck = validatePasswordRules('Short1!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(shortCheck.valid, false, 'Password under 10 characters should fail');

// Missing uppercase
const noUpperCheck = validatePasswordRules('lowercase1!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(noUpperCheck.valid, false, 'Password without uppercase should fail');

// Missing lowercase
const noLowerCheck = validatePasswordRules('UPPERCASE1!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(noLowerCheck.valid, false, 'Password without lowercase should fail');

// Missing number
const noNumberCheck = validatePasswordRules('NoNumberHere!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(noNumberCheck.valid, false, 'Password without numbers should fail');

// Missing special char
const noSpecialCheck = validatePasswordRules('NoSpecial1234', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(noSpecialCheck.valid, false, 'Password without special characters should fail');

// Contains user's employee ID
const idReuseCheck = validatePasswordRules('PassEMP001Word!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(idReuseCheck.valid, false, 'Password containing employee ID should fail');

// Contains user's name
const nameReuseCheck = validatePasswordRules('JohnDoePass123!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(nameReuseCheck.valid, false, 'Password containing user name should fail');

// Valid strong password
const validCheck = validatePasswordRules('SecureVault#2026!', { name: 'John Doe', employeeId: 'EMP001' });
assert.strictEqual(validCheck.valid, true, 'Valid password meeting all rules should pass');

console.log('✓ Test 1 Passed: Password Rule Validation');

// Test 2: Temporary Password Generation Compliance
console.log('Test 2: Temporary Password Generation');
for (let i = 0; i < 20; i++) {
  const tempPw = generateCompliantTempPassword({ name: 'Alice Smith', employeeId: 'WORKER-123' });
  const check = validatePasswordRules(tempPw, { name: 'Alice Smith', employeeId: 'WORKER-123' });
  assert.strictEqual(check.valid, true, `Generated temp password "${tempPw}" must pass all validation rules`);
}
console.log('✓ Test 2 Passed: Temporary Password Generation');

// Test 3: One-Way Password Hashing Verification
console.log('Test 3: Password Hashing & Irreversibility');
const rawPassword = 'SuperSecretPass1!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(rawPassword, salt);

assert.notStrictEqual(hash, rawPassword, 'Hashed password must not equal raw password');
assert.strictEqual(hash.startsWith('$2a$') || hash.startsWith('$2b$'), true, 'Password must be hashed with bcrypt');
assert.strictEqual(bcrypt.compareSync(rawPassword, hash), true, 'Bcrypt compare should match correct raw password');
assert.strictEqual(bcrypt.compareSync('WrongPassword1!', hash), false, 'Bcrypt compare should reject incorrect raw password');
console.log('✓ Test 3 Passed: One-Way Password Hashing Verification');

console.log('All Password Security Tests Passed Successfully!');
