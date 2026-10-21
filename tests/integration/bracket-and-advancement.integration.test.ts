import { describe, it, expect, beforeAll } from 'vitest';
import { request, checkPostgresConnection } from './test-helper.js';

describe('Bracket Generation & Automatic Advancement Integration Tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkPostgresConnection();
  });

  it('POST /bracket/generate requires ADMIN authorization', async () => {
    const res = await request.post('/api/v1/bracket/generate').send({
      tournamentId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(res.status).toBe(401);
  });

  it('GET /bracket/:tournamentId validates UUID format', async () => {
    const res = await request.get('/api/v1/bracket/invalid-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Database-dependent: Bracket generation with 5 contestants, byes, and deletion locking', async () => {
    if (!dbAvailable) {
      console.warn('⚠️ Skipping DB-dependent Bracket test: PostgreSQL is not connected in this local environment.');
      return;
    }

    // 1. Admin login
    const adminRes = await request.post('/api/v1/auth/register').send({
      name: 'Bracket Admin',
      email: `bracket-admin-${Date.now()}@roastbattle.com`,
      password: 'AdminPassword123!',
      role: 'ADMIN',
    });
    const adminToken = adminRes.body.data.token;

    // 2. Create Tournament
    const tournRes = await request
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Five Contestant Tournament',
        votingDurationSeconds: 10,
      });
    const tournamentId = tournRes.body.data.id;

    // 3. Register 5 Contestants
    const contestantIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const cRes = await request.post('/api/v1/contestants').send({
        displayName: `Contestant ${i}`,
        email: `c${i}-${Date.now()}@roastbattle.com`,
        tournamentId,
      });
      contestantIds.push(cRes.body.data.id);
    }

    // 4. Generate Bracket
    const genRes = await request
      .post('/api/v1/bracket/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tournamentId });

    expect(genRes.status).toBe(201);
    expect(genRes.body.data.totalContestants).toBe(5);
    expect(genRes.body.data.powerOfTwo).toBe(8);
    expect(genRes.body.data.totalByes).toBe(3);

    // 5. Duplicate bracket generation rejected with 409
    const dupGenRes = await request
      .post('/api/v1/bracket/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tournamentId });
    expect(dupGenRes.status).toBe(409);

    // 6. Contestant deletion rejected with 409 once bracket exists
    const delRes = await request
      .delete(`/api/v1/contestants/${contestantIds[0]}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(409);

    // 7. Full bracket structure inspection
    const bracketRes = await request.get(`/api/v1/bracket/${tournamentId}`);
    expect(bracketRes.status).toBe(200);
    expect(bracketRes.body.data.rounds).toHaveLength(3); // 3 rounds for power of 8
  });
});
