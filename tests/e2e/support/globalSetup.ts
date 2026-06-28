import { execFileSync } from 'node:child_process';
import { baseUrl } from './routes.js';

async function waitForApp() {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`App returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`E2E app did not become reachable at ${baseUrl}: ${String(lastError)}`);
}

export default async function globalSetup() {
  if (process.env.E2E_SKIP_DB_RESET !== '1') {
    execFileSync('pnpm', ['db:reset'], { stdio: 'inherit' });
  }
  await waitForApp();
}
