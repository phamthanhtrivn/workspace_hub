import { fileURLToPath } from 'node:url';
import { serviceRequire, webRequire } from './support.mjs';

const tooling = serviceRequire('communication-service');
tooling('ts-node').register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023',
    esModuleInterop: true, jsx: 'react-jsx',
  },
});
tooling('tsconfig-paths').register({
  baseUrl: fileURLToPath(new URL('../../frontend/web/', import.meta.url)),
  paths: { '@/*': ['./*'] },
});
webRequire('./features/work-assistant/components/work-assistant-message.spec.tsx');
