import { describe, it, expect, beforeAll } from 'vitest';
import { request, checkPostgresConnection } from './test-helper.js';

describe('Matchups, Roast Lines, and Voting API Integration Tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await checkPostgresConnection();
  });

  it('POST /vote/:matchupId rejects unauthenticated requests with 401', async () => {
    const res = await request
      .post('/api/v1/vote/123e4567-e89b-12d3-a456-426614174000')
      .send({ contestantId: '223e4567-e89b-12d3-a456-426614174001' });
    expect(res.status).toBe(401);
  });

  it('POST /matchup/:matchupId/roast-lines rejects unauthenticated requests with 401', async () => {
    const res = await request
      .post('/api/v1/matchup/123e4567-e89b-12d3-a456-426614174000/roast-lines')
      .send({ content: 'Your comedy makes people nostalgic for silence.' });
    expect(res.status).toBe(401);
  });

  it('GET /matchup/:id/status rejects non-uuid parameter with 400', async () => {
    const res = await request.get('/api/v1/matchup/not-a-valid-uuid/status');
    expect(res.status).toBe(400);
  });

  it('POST /round/advance requires ADMIN role', async () => {
    const res = await request.post('/api/v1/round/advance').send({
      tournamentId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(res.status).toBe(401);
  });
});
