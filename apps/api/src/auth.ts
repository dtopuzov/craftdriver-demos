import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { CurrentUser } from '@exam/contracts';
import type { FastifyRequest } from 'fastify';
import type { Sql } from 'postgres';
import { emailAlreadyRegistered, unauthenticated } from './errors.js';

export const sessionCookieName = 'exam_session';
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;

type UserRow = CurrentUser & { passwordHash: string; isActive: boolean };

export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function authenticateRequest(sql: Sql, request: FastifyRequest): Promise<CurrentUser> {
  const token = request.cookies[sessionCookieName];
  if (!token) throw unauthenticated();

  const rows = await sql<CurrentUser[]>`
    select u.id, u.email, u.display_name as "displayName", u.role
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash(token)}
      and s.revoked_at is null
      and s.expires_at > now()
      and u.is_active = true
    limit 1
  `;
  if (!rows[0]) throw unauthenticated();
  return rows[0];
}

export async function login(sql: Sql, email: string, password: string) {
  const rows = await sql<UserRow[]>`
    select id, email, display_name as "displayName", role, password_hash as "passwordHash", is_active as "isActive"
    from users where email = ${email} limit 1
  `;
  const user = rows[0];
  if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password))) {
    throw unauthenticated();
  }

  const token = randomBytes(32).toString('base64url');
  await sql`
    insert into sessions (user_id, token_hash, expires_at)
    values (${user.id}, ${tokenHash(token)}, now() + interval '7 days')
  `;
  const safeUser: CurrentUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
  return { token, user: safeUser, maxAge: sessionLifetimeSeconds };
}

export async function registerStudent(sql: Sql, input: { displayName: string; email: string; password: string }) {
  const passwordHash = await argon2.hash(input.password);
  let user: CurrentUser;
  try {
    const rows = await sql<CurrentUser[]>`
      insert into users (email, password_hash, display_name, role)
      values (${input.email}, ${passwordHash}, ${input.displayName}, 'student')
      returning id, email, display_name as "displayName", role
    `;
    user = rows[0]!;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505')
      throw emailAlreadyRegistered();
    throw error;
  }

  const token = randomBytes(32).toString('base64url');
  await sql`
    insert into sessions (user_id, token_hash, expires_at)
    values (${user.id}, ${tokenHash(token)}, now() + interval '7 days')
  `;
  return { token, user, maxAge: sessionLifetimeSeconds };
}

export async function logout(sql: Sql, request: FastifyRequest) {
  const token = request.cookies[sessionCookieName];
  if (token)
    await sql`update sessions set revoked_at = now() where token_hash = ${tokenHash(token)}`;
}

export function sessionCookieOptions(maxAge = sessionLifetimeSeconds) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
