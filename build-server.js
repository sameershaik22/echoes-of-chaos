import { build } from 'esbuild';

await build({
  entryPoints: ['src/server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server/index.js',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
});

console.log('✅ Server build complete → dist/server/index.js');
