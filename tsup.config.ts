import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/main.ts'],
  outDir: '.',
  format: ['cjs'],
  target: 'es2018',
  sourcemap: 'inline',
  shims: false,
  external: ['obsidian', 'electron'],
})
