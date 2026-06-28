import postgres from 'postgres';

export function createSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL must be set before starting the API.');
  return postgres(databaseUrl, { max: 10 });
}
