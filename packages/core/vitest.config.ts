import { baseTestConfig } from '@auth-orchestrator/vitest-preset';

export default baseTestConfig({
  test: {
    environment: 'happy-dom',
  },
});
