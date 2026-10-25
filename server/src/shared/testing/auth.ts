import supertest from 'supertest';

import type { createApp } from '../../app.js';

export const TEST_JWT_SECRET = 'test-only-jwt-secret-at-least-32-bytes';
export const TEST_REGISTRATION = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'test password 123',
  passwordConfirmation: 'test password 123',
};

export const createTestClient = (
  app: ReturnType<typeof createApp>['app'],
  auth: ReturnType<typeof createApp>['auth'],
) => {
  const client = supertest.agent(app);
  return {
    client,
    register: async () => {
      const { token } = await auth.register(TEST_REGISTRATION);
      client.set('Authorization', `Bearer ${token}`);
    },
  };
};
