import { baseConfig } from '@auth-orchestrator/tsup-config';

export default baseConfig({
  external: [
    '@angular/common',
    '@angular/common/http',
    '@angular/core',
    '@angular/router',
    'rxjs',
    'rxjs/operators',
  ],
});
