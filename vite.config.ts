import { defineConfig } from 'vite'
import { config } from 'dotenv'
import react from '@vitejs/plugin-react-swc'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import glsl from 'vite-plugin-glsl'
import path from 'node:path'

config()

export default defineConfig({
  base: './',
  plugins: [
    react(),
    glsl(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          define: {
            'process.env.EVE3D_API_KEY': JSON.stringify(
              process.env.EVE3D_API_KEY || ''
            ),
          },
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5174,
  },
})
