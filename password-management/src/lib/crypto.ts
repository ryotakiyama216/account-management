import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("Missing CREDENTIAL_ENCRYPTION_KEY in environment variables.");
  }

  const decoded = Buffer.from(key, "base64");
  if (decoded.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be 32 bytes in base64 format.");
  }

  return decoded;
}

export function encryptSecret(plainText: string): {
  cipherText: string;
  iv: string;
  authTag: string;
} {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipherText: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSecret(
  cipherText: string,
  iv: string,
  authTag: string
): string {
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherText, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
