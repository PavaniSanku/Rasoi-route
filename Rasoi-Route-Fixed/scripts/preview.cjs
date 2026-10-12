const {spawn} = require('node:child_process');
const result = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['--dir', 'artifacts/rasoi-route', 'dev'], {stdio:'inherit', shell:process.platform==='win32', env:{...process.env,VITE_DEMO_MODE:'true'}});
result.on('exit', code => process.exit(code || 0));
