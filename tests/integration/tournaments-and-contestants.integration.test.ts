import { describe, it, expect, beforeAll } from 'vitest';
import { request, checkPostgresConnection } from './test-helper.js';

describe('Tournaments & Contestants API Integration Tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkPostgresConnection();
  });

  it('POST /tournaments rejects unauthenticated users with 401', async () => {
    const res = await request.post('/api/v1/tournaments').send({
      name: 'Unauthorized Tournament',
    });
    expect(res.status).toBe(401);
  });

  it('POST /contestants rejects malformed email with 400', async () => {
    const res = await request.post('/api/v1/contestants').send({
      displayName: 'Comedian',
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /contestants/:id rejects invalid non-uuid parameter with 400', async () => {
    const res = await request.get('/api/v1/contestants/123-not-uuid');
    expect(res.status).toBe(400);
  });

  it('GET /tournament/:id/winner rejects invalid non-uuid parameter with 400', async () => {
    const res = await request.get('/api/v1/tournament/invalid-id/winner');
    expect(res.status).toBe(400);
  });

  it('Database-dependent: Tournament creation, settings validation, and contestant management', async () => {
    if (!dbAvailable) {
      console.warn('⚠️ Skipping DB-dependent Tournament test: PostgreSQL is not connected in this local environment.');
      return;
    }

    // 1. Create Admin
    const adminRes = await request.post('/api/v1/auth/register').send({
      name: 'Tournament Admin',
      email: `admin-${Date.now()}@roastbattle.com`,
      password: 'AdminPassword123!',
      role: 'ADMIN',
    });
    const adminToken = adminRes.body.data.token;

    // 2. Create Tournament with invalid duration (< 10 seconds) -> 400
    const invalidTournRes = await request
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Invalid Tournament',
        votingDurationSeconds: 5,
      });
    expect(invalidTournRes.status).toBe(400);

    // 3. Create Valid Tournament
    const tournRes = await request
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Integration Roast Championship 2026',
        votingDurationSeconds: 300,
      });
    expect(tournRes.status).toBe(201);
    const tournamentId = tournRes.body.data.id;
    expect(tournamentId).toBeDefined();

    // 4. Register Contestant
    const contestantEmail = `contestant-${Date.now()}@roastbattle.com`;
    const contestantRes = await request.post('/api/v1/contestants').send({
      displayName: 'Speedy Roaster',
      email: contestantEmail,
      tournamentId,
    });
    expect(contestantRes.status).toBe(201);
    const contestantId = contestantRes.body.data.id;

    // 5. Duplicate contestant email rejection (409)
    const dupContestantRes = await request.post('/api/v1/contestants').send({
      displayName: 'Duplicate Roaster',
      email: contestantEmail,
      tournamentId,
    });
    expect(dupContestantRes.status).toBe(409);

    // 6. Delete contestant before bracket generation -> 200
    const delRes = await request
      .delete(`/api/v1/contestants/${contestantId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    // 7. Check tournament winner endpoint when not completed
    const winnerRes = await request.get(`/api/v1/tournament/${tournamentId}/winner`);
    expect(winnerRes.status).toBe(200);
    expect(winnerRes.body.data.isCompleted).toBe(false);
    expect(winnerRes.body.data.champion).toBeNull();
  });
});
