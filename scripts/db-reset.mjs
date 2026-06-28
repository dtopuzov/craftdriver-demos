import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`Could not run ${command}. Is Docker installed and running?`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('docker', ['compose', 'down', '--volumes']);
run('docker', ['compose', 'up', '--detach', '--wait', 'db']);
run('pnpm', ['db:migrate']);
run('pnpm', ['db:seed']);
