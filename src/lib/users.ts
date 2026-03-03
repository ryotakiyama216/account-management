import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureUsersStore(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
}

async function readUsersStore(): Promise<{ users: StoredUser[] }> {
  await ensureUsersStore();
  const raw = await fs.readFile(USERS_FILE, "utf8");
  return JSON.parse(raw) as { users: StoredUser[] };
}

async function writeUsersStore(users: StoredUser[]): Promise<void> {
  await ensureUsersStore();
  await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
}

export async function findStoredUserByEmail(
  email: string
): Promise<StoredUser | null> {
  const store = await readUsersStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

function scryptHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scryptHash(password, salt);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) {
    return false;
  }

  const hashBuffer = Buffer.from(hashHex, "hex");
  const suppliedHash = await scryptHash(password, salt);

  if (hashBuffer.length !== suppliedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, suppliedHash);
}

export async function createStoredUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<StoredUser> {
  const store = await readUsersStore();
  const normalizedEmail = input.email.trim().toLowerCase();
  const exists = store.users.some(
    (u) => u.email.toLowerCase() === normalizedEmail
  );
  if (exists) {
    throw new Error("Email already exists.");
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString()
  };

  store.users.push(user);
  await writeUsersStore(store.users);
  return user;
}
