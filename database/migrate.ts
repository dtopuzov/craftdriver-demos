import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from './client.js';

const { client, db } = createDatabase();

try {
  await migrate(db, { migrationsFolder: 'database/migrations' });
  console.info('Database migrations applied.');
} finally {
  await client.end();
}
