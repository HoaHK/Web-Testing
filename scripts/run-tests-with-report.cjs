'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const playwrightCli = path.join(path.dirname(require.resolve('@playwright/test')), 'cli.js');
const reportHost = '127.0.0.1';

function runPlaywright(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, ...args], {
      stdio: options.stdio ?? 'inherit',
      env: options.env ?? process.env,
    });

    child.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
    child.on('exit', (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    const opener = spawn('cmd.exe', ['/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore',
    });
    opener.unref();
    return;
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  const opener = spawn(command, [url], { detached: true, stdio: 'ignore' });
  opener.unref();
}

async function main() {
  // Headed run + live report server are for local use only; CI stays headless and exits with the test result.
  const isCI = Boolean(process.env.CI);
  const testExitCode = await runPlaywright(['test', ...(isCI ? [] : ['--headed']), ...process.argv.slice(2)], {
    env: { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' },
  });

  if (isCI) {
    process.exitCode = testExitCode;
    return;
  }

  let reportProcess;
  let reportOpened = false;
  let output = '';

  reportProcess = spawn(process.execPath, [
    playwrightCli,
    'show-report',
    '--host',
    reportHost,
    '--port',
    '0',
  ], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  const handleOutput = (chunk, target) => {
    const text = chunk.toString();
    target.write(text);
    output += text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');

    if (!reportOpened) {
      const match = output.match(/Serving HTML report at\s+(https?:\/\/[^\s]+)/);
      if (match) {
        reportOpened = true;
        openBrowser(match[1]);
      }
    }
  };

  reportProcess.stdout.on('data', (chunk) => handleOutput(chunk, process.stdout));
  reportProcess.stderr.on('data', (chunk) => handleOutput(chunk, process.stderr));

  const reportExitCode = await new Promise((resolve) => {
    reportProcess.on('error', (error) => {
      console.error(error);
      resolve(1);
    });
    reportProcess.on('exit', (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  });

  process.exitCode = testExitCode !== 0 ? testExitCode : reportExitCode;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
