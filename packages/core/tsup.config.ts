import { baseConfig } from '@auth-orchestrator/tsup-config';

export default baseConfig({
  entry: {
    index: 'src/index.ts',
    'providers/keycloak': 'src/providers/keycloak.ts',
    'providers/generic-oidc': 'src/providers/generic-oidc.ts',
  },
});
