import { spawn, spawnSync } from 'node:child_process';

const compose = process.platform === 'win32' ? 'docker-compose' : 'docker';
const composePrefix = process.platform === 'win32' ? [] : ['compose'];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`Could not run ${command}. Is Docker installed and running?`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function databaseIsReady() {
  const result = spawnSync(compose, [...composePrefix, 'exec', '-T', 'db', 'pg_isready', '-U', 'exam', '-d', 'exam_poc'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

async function waitForDatabase() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (databaseIsReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  console.error('PostgreSQL did not become ready within 60 seconds.');
  process.exit(1);
}

run(compose, [...composePrefix, 'up', '-d', 'db']);
await waitForDatabase();

const children = [
  spawn('pnpm', ['--filter', 'api', 'dev'], { stdio: 'inherit' }),
  spawn('pnpm', ['--filter', 'web', 'dev'], { stdio: 'inherit' }),
];

function stopChildren() {
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', () => {
  stopChildren();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopChildren();
  process.exit(0);
});

for (const child of children) {
  child.on('exit', (code) => {
    if (code !== 0) {
      stopChildren();
      process.exit(code ?? 1);
    }
  });
}
