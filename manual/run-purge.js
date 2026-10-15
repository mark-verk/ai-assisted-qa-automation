const { spawnSync } = require('node:child_process');
const path = require('node:path');

const count = process.argv[2];
if (!count || count.startsWith('-')) {
  console.error('Usage: npm run test:purge-programs -- 10');
  console.error('Pass a positive integer, or all.');
  process.exit(1);
}

const playwrightCli = require.resolve('@playwright/test/cli');
const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', '--config=playwright.manual.config.ts', '--workers=1'],
  {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DELETE_PROGRAMS: count },
  },
);

process.exit(result.status ?? 1);
