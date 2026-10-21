import { describe, it, expect, beforeAll } from 'vitest';
import { request, checkPostgresConnection } from './test-helper.js';

describe('Authentication API Integration Tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkPostgresConnection();
  });

  it('GET /health returns health and database status', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.database).toBeDefined();
  });

  it('POST /auth/register rejects malformed body with 400', async () => {
    const res = await request.post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/login rejects unprovided password with 400', async () => {
    const res = await request.post('/api/v1/auth/login').send({
      email: 'valid@example.com',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /auth/me rejects unauthenticated request with 401', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('Database-dependent: User registration, duplicate conflict, and login flow', async () => {
    if (!dbAvailable) {
      console.warn('⚠️ Skipping DB-dependent Auth test: PostgreSQL is not connected in this local environment.');
      return;
    }

    const testUser = {
      name: 'Integration Test User',
      email: `test-${Date.now()}@roastbattle.com`,
      password: 'TestPassword123!',
      role: 'VOTER',
    };

    // 1. Register User
    const regRes = await request.post('/api/v1/auth/register').send(testUser);
    expect(regRes.status).toBe(201);
    expect(regRes.body.data.token).toBeDefined();
    expect(regRes.body.data.user.email).toBe(testUser.email);
    expect(regRes.body.data.user.passwordHash).toBeUndefined(); // Never leak secrets

    // 2. Duplicate registration conflict (409)
    const dupRes = await request.post('/api/v1/auth/register').send(testUser);
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);

    // 3. Login
    const loginRes = await request.post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;
    expect(token).toBeDefined();

    // 4. Authenticated profile check
    const meRes = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testUser.email);
  });
});
