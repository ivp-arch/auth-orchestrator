import type { HttpInterceptorFn } from '@angular/common/http';

type AuthInterceptorOptions = {
  matchUrls?: RegExp[];
  excludeUrls?: RegExp[];
  retryOn401?: boolean;
};

export function authInterceptor(options: AuthInterceptorOptions = {}): HttpInterceptorFn {
  return (req, next) => {
    const { matchUrls = [/.*/], excludeUrls = [] } = options;

    const isExcluded = excludeUrls.some((re) => re.test(req.url));
    const isMatched = matchUrls.some((re) => re.test(req.url));

    if (isExcluded || !isMatched) {
      return next(req);
    }

    // TODO Week 6: real implementation — attach Bearer token, refresh on 401
    return next(req);
  };
}
