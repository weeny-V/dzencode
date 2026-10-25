import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { asDuplicateKey } from '../../shared/db/errors.js';
import type { DbExecutor } from '../../shared/db/executor.js';
import type { Pool } from '../../shared/db/pool.js';
import type { NewUser, Participant, User, UserCredentials } from './users.types.js';

interface UserRow extends RowDataPacket, UserCredentials {}
interface ParticipantRow extends RowDataPacket, Participant {}

const toUser = ({ id, firstName, lastName, email, registeredAt }: UserRow): User => ({
  id,
  firstName,
  lastName,
  email,
  registeredAt,
});

export const createUsersRepository = (pool: Pool) => ({
  async create(input: NewUser, executor: DbExecutor): Promise<User> {
    try {
      const [result] = await executor.query<ResultSetHeader>(
        'INSERT INTO users (first_name, last_name, email, password_hash, registered_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())',
        [input.firstName, input.lastName, input.email, input.passwordHash],
      );
      const [rows] = await executor.query<UserRow[]>(
        'SELECT id, first_name AS firstName, last_name AS lastName, email, registered_at AS registeredAt FROM users WHERE id = ?',
        [result.insertId],
      );
      return toUser(rows[0]!);
    } catch (error) {
      throw asDuplicateKey(error) ?? error;
    }
  },

  async findCredentials(email: string): Promise<UserCredentials | undefined> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, first_name AS firstName, last_name AS lastName, email, password_hash AS passwordHash, registered_at AS registeredAt FROM users WHERE email = ?',
      [email],
    );
    const row = rows[0];
    return row ? { ...toUser(row), passwordHash: row.passwordHash } : undefined;
  },

  async findById(id: number): Promise<User | undefined> {
    const [rows] = await pool.query<UserRow[]>(
      'SELECT id, first_name AS firstName, last_name AS lastName, email, registered_at AS registeredAt FROM users WHERE id = ?',
      [id],
    );
    return rows[0] ? toUser(rows[0]) : undefined;
  },

  async list(): Promise<Participant[]> {
    const [rows] = await pool.query<ParticipantRow[]>(
      'SELECT id, first_name AS firstName, last_name AS lastName, registered_at AS registeredAt FROM users ORDER BY registered_at DESC, id DESC',
    );
    return rows.map(({ id, firstName, lastName, registeredAt }) => ({
      id,
      firstName,
      lastName,
      registeredAt,
    }));
  },
});

export type UsersRepository = ReturnType<typeof createUsersRepository>;
