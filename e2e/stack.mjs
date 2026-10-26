/** Run checks in an owned disposable project; always release its containers and volumes. */
export async function verifyStack(mode, run, project, root) {
  if (!['integration', 'e2e', 'system'].includes(mode))
    throw new Error('Unknown verification mode.');
  if (!/^dzencode-tests-\d+$/.test(project)) throw new Error('Invalid disposable project name.');
  const compose = [
    'compose',
    '--project-name',
    project,
    '--project-directory',
    root,
    '--env-file',
    'e2e/compose.env',
    '--file',
    'docker-compose.test.yml',
  ];
  const docker = (...args) => run('docker', [...compose, ...args]);
  try {
    await docker('up', '-d', '--build', '--wait', '--wait-timeout', '180', 'db');
    await docker('run', '--rm', '--build', 'liquibase');
    if (mode !== 'e2e') {
      await run('npm', ['run', 'test:integration', '-w', 'server'], {
        DB_HOST: '127.0.0.1',
        DB_PORT: '3374',
        DB_NAME: 'dzencode_e2e',
        DB_USER: 'verification',
        DB_PASSWORD: 'verification',
      });
    }
    if (mode !== 'integration') {
      await docker('up', '-d', '--build', '--wait', '--wait-timeout', '180', 'server', 'client');
      await run('playwright', ['test', '-c', 'e2e/playwright.config.ts'], {
        E2E_MANAGED_STACK: project,
      });
    }
  } catch (error) {
    try {
      await docker('logs', '--no-color', '--tail', '100');
    } catch (logsError) {
      console.error('Could not collect stack logs:', logsError);
    }
    throw error;
  } finally {
    // Only the project created above is removed, including when setup or a test fails.
    await docker('down', '--volumes', '--remove-orphans', '--timeout', '10');
  }
}
