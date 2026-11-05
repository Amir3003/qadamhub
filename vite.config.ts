import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: loadEnv(mode, '.', '').QADAM_LOCAL_FORM_API === '1'
    ? { proxy: { '/api/public-form': {
        target: 'http://127.0.0.1:8789',
        configure: proxy => {
          // This project does not load Node's ambient types in the Vite config.
          const events = proxy as unknown as { on: (event: string, listener: (out: { setHeader: (name: string, value: string) => void }, request: { headers: { host?: string } }) => void) => void };
          events.on('proxyReq', (out, request) => {
            if (request.headers.host) out.setHeader('x-forwarded-host', request.headers.host);
          });
        },
      } } }
    : undefined,
}));

