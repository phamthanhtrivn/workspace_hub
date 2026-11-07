import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Reuse the existing TS tooling; all imports must share the same Axios/Redux instances.
const require = createRequire(new URL('../project-service/package.json', import.meta.url));
require('ts-node').register({
  transpileOnly: true, skipProject: true,
  compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', target: 'ES2023', esModuleInterop: true, jsx: 'react-jsx' },
});
require('tsconfig-paths').register({
  baseUrl: fileURLToPath(new URL('../../frontend/web/', import.meta.url)),
  paths: { '@/*': ['./*'] },
});
require('../../frontend/web/features/auth/api/session-recovery-core.spec.ts');
require('../../frontend/web/features/auth/api/session-recovery.spec.ts');
require('../../frontend/web/lib/socket-recovery.spec.ts');
