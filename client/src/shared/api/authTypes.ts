export interface AuthUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  registeredAt: string;
}

export interface SessionIdentity {
  userId: number;
  sessionId: string;
}

export interface CurrentSession {
  user: AuthUser;
  sessionId: string;
}

export type Participant = Omit<AuthUser, 'email'>;
