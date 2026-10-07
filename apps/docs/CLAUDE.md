# apps/docs

Consumer documentation for Auth Orchestrator. The site generator is not set up yet (planned:
Astro Starlight), but pages are already written in its content layout so they move into the site
without migration. Root `CLAUDE.md` rules apply.

## Where things go

```
src/content/docs/
  index.md                      landing page
  getting-started/              install, first sign-in, per-framework quick start
  guides/                       one page per feature (token storage, refresh, multi-tab, …)
  providers/                    one page per provider preset (keycloak, generic-oidc, …)
  angular/  react/              framework-specific recipes
  troubleshooting/              error codes and common misconfigurations
```

Every page starts with Starlight frontmatter (`title`, `description`). File names are
kebab-case; the path is the URL.

## Rules

- **Document only what is implemented.** A page lands in the same PR as the feature it
  describes. Planned behaviour belongs in the root README status table, not here.
- **Package READMEs stay short** (install, minimal setup, link here). Long explanations,
  recipes and troubleshooting live in this folder.
- **Code samples must compile** against the current public API (exports of each package's
  `src/index.ts`), with the repo's TypeScript strictness. Angular samples use standalone APIs,
  signals and the built-in control flow (`@if`, `@for`).
- **Security trade-offs are explicit.** Any page about token storage, refresh or BFF setups says
  what is exposed to XSS and what the recommended default is.
- **Every `AuthError` code gets a troubleshooting entry**: what it means, typical causes,
  how to fix it.
- Never include real client IDs, tenant URLs or tokens; use `example.com` hosts.
- English, second person, short sentences.
