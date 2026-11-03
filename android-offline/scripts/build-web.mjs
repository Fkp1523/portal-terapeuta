import { mkdir, readdir, cp } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir('www', { recursive: true });
for (const entry of await readdir('web', { withFileTypes: true })) {
  if (entry.name === 'native.js') continue;
  await cp(`web/${entry.name}`, `www/${entry.name}`, { recursive: true });
}
await build({ entryPoints: ['src/main.js'], outfile: 'www/native.js', bundle: true, format: 'iife', platform: 'browser', target: 'chrome130', sourcemap: false, minify: false });
console.log('Arquivos Android preparados em www.');
