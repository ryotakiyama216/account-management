export type CredentialRecord = {
  id: string;
  userId: string;
  serviceName: string;
  loginId: string;
  passwordCipher: string;
  passwordIv: string;
  passwordAuthTag: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type CredentialStore = {
  credentials: CredentialRecord[];
};

export type CreateCredentialInput = {
  userId: string;
  serviceName: string;
  loginId: string;
  password: string;
  notes?: string;
};
