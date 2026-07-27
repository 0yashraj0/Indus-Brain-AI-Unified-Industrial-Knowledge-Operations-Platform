export interface EmployeeIdentifierContext {
  employeeId?: string;
  name?: string;
  phone?: string;
  email?: string;
}

export const COMMON_PASSWORDS_LIST = [
  'password', 'password123', 'password1234', 'p@ssword', 'p@ssword123',
  'admin', 'admin123', 'admin1234', 'administrator', 'welcome', 'welcome123',
  '123456789', '1234567890', 'qwerty', 'qwerty1234', 'indusbrain', 'employee',
  'employee123', 'masterkey', 'letmein123', 'changeme123', 'pass123456'
];

/**
 * Validates password rules both on frontend and backend:
 * - Minimum 10 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Reject common or easily guessed passwords
 * - Reject passwords containing employee ID, name, phone number, or email
 */
export function validatePasswordRules(
  password: string,
  context?: EmployeeIdentifierContext
): { valid: boolean; error?: string } {
  const genericError = 'The password does not meet the security requirements.';

  if (!password || password.length < 10) {
    return { valid: false, error: genericError };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: genericError };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: genericError };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: genericError };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: genericError };
  }

  const lowerPw = password.toLowerCase();

  // Reject common or easily guessed passwords
  if (COMMON_PASSWORDS_LIST.some(cp => lowerPw.includes(cp))) {
    return { valid: false, error: genericError };
  }

  // Reject passwords containing employee ID, name, phone, or email
  if (context) {
    const tokens: string[] = [];

    if (context.employeeId && context.employeeId.trim().length >= 2) {
      tokens.push(context.employeeId.trim().toLowerCase());
    }

    if (context.name) {
      const parts = context.name.trim().split(/\s+/);
      for (const p of parts) {
        if (p.length >= 3) tokens.push(p.toLowerCase());
      }
    }

    if (context.phone) {
      const cleanPhone = context.phone.replace(/\D/g, '');
      if (cleanPhone.length >= 4) tokens.push(cleanPhone);
    }

    if (context.email) {
      const emailPrefix = context.email.split('@')[0];
      if (emailPrefix && emailPrefix.length >= 3) {
        tokens.push(emailPrefix.toLowerCase());
      }
    }

    for (const token of tokens) {
      if (lowerPw.includes(token)) {
        return { valid: false, error: genericError };
      }
    }
  }

  return { valid: true };
}

/**
 * Generates a random, strong, compliant temporary password
 * that satisfies all security rules.
 */
export function generateCompliantTempPassword(context?: EmployeeIdentifierContext): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=';

  const getRandomChar = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const chars = [
      getRandomChar(uppers), getRandomChar(uppers), getRandomChar(uppers),
      getRandomChar(lowers), getRandomChar(lowers), getRandomChar(lowers),
      getRandomChar(numbers), getRandomChar(numbers), getRandomChar(numbers),
      getRandomChar(symbols), getRandomChar(symbols), getRandomChar(symbols),
      getRandomChar(uppers + lowers + numbers), getRandomChar(symbols)
    ];

    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const candidate = chars.join('');
    const check = validatePasswordRules(candidate, context);
    if (check.valid) {
      return candidate;
    }
  }

  // Fallback strong candidate
  return 'Xk9#pQ2$vM8!wL';
}
