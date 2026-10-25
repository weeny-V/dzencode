export interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  registeredAt: Date;
}

export interface User extends Participant {
  email: string;
}

export interface UserCredentials extends User {
  passwordHash: string;
}

export interface NewUser {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}
