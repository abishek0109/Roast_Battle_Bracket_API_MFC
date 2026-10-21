import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

export const app = createApp();
export const request = supertest(app);

export let isPostgresAvailable = false;

export async function checkPostgresConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPostgresAvailable = true;
    return true;
  } catch {
    isPostgresAvailable = false;
    return false;
  }
}
