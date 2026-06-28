import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL must be set. Copy .env.example to .env for local use.');
  return url;
}

export function createDatabase() {
  const client = postgres(databaseUrl(), { max: 1 });
  return { client, db: drizzle(client, { schema }) };
}
