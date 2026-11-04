// Password lock for the profile saved on this device. There is no server, so this is a lock for
// people who pick up the device or the browser, not encryption of the data: whoever can read the
// browser storage with developer tools can still read the profile. Only a salted hash is stored,
// never the password. A forgotten password cannot be recovered: the only way back in is to erase
// the data on this device.

export interface PasswordHash {
  algo: 'PBKDF2-SHA256';
  iterations: number;
  /** Base64. */
  salt: string;
  /** Base64. */
  hash: string;
}

// OWASP guidance for PBKDF2 with SHA-256.
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, KEY_BITS);
  return new Uint8Array(bits);
}

// Compares every byte so the time does not reveal how many leading bytes matched.
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = new Uint8Array(new ArrayBuffer(SALT_BYTES));
  crypto.getRandomValues(salt);
  return { algo: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: toBase64(salt), hash: toBase64(await derive(password, salt, ITERATIONS)) };
}

export async function checkPassword(password: string, stored: PasswordHash): Promise<boolean> {
  try {
    return sameBytes(await derive(password, fromBase64(stored.salt), stored.iterations), fromBase64(stored.hash));
  } catch {
    return false;
  }
}

export interface LockableProfile {
  /** Legacy: older profiles saved the password as plain text. Migrated to a hash on first load. */
  password?: string;
  passwordHash?: PasswordHash;
}

export function profileHasPassword(profile: LockableProfile): boolean {
  return Boolean(profile.passwordHash) || Boolean(profile.password);
}

export async function verifyProfilePassword(input: string, profile: LockableProfile): Promise<boolean> {
  if (profile.passwordHash) return checkPassword(input, profile.passwordHash);
  // A legacy plain-text password is still accepted until it is turned into a hash.
  return Boolean(profile.password) && input === profile.password;
}

export const PASSWORD_RULES = {
  minLength: (value: string) => value.length >= 8,
  letterAndOther: (value: string) => /(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?])/.test(value),
};
