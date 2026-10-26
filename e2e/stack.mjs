/** Run checks in an owned disposable project; always release its containers and volumes. */
export async function verifyStack(mode, run, project, root) {
  if (!['integration', 'e2e', 'system', 'deploy'].includes(mode))
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
  if (mode === 'deploy') compose.push('--file', 'docker-compose.deploy-test.yml');
  const docker = (...args) => run('docker', [...compose, ...args]);
  try {
    await docker('up', '-d', '--build', '--wait', '--wait-timeout', '180', 'db');
    await docker('run', '--rm', '--build', 'liquibase');
    if (mode === 'integration' || mode === 'system') {
      await run('npm', ['run', 'test:integration', '-w', 'server'], {
        DB_HOST: '127.0.0.1',
        DB_PORT: '3374',
        DB_NAME: 'dzencode_e2e',
        DB_USER: 'verification',
        DB_PASSWORD: 'verification',
      });
    }
    if (mode !== 'integration') {
      await docker(
        'up',
        '-d',
        '--build',
        '--wait',
        '--wait-timeout',
        '180',
        ...(mode === 'deploy' ? ['app'] : ['server', 'client']),
      );
      await run('playwright', ['test', '-c', 'e2e/playwright.config.ts'], {
        E2E_MANAGED_STACK: project,
        ...(mode === 'deploy' ? { E2E_PROXY: '1' } : {}),
      });
      if (mode === 'deploy') {
        await docker(
          'exec',
          '-T',
          'app',
          'node',
          '-e',
          "const fs=require('node:fs');const peak=Number(fs.readFileSync('/sys/fs/cgroup/memory.peak','utf8'));const max=Number(fs.readFileSync('/sys/fs/cgroup/memory.max','utf8'));console.info(JSON.stringify({peakMiB:Math.ceil(peak/1048576),limitMiB:max/1048576}));if(peak>max)process.exitCode=1",
        );
      }
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
