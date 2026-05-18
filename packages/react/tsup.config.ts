import { baseConfig } from '@auth-orchestrator/tsup-config';

export default baseConfig({
  external: ['react', 'react-dom'],
});
