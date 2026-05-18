# Contributing to Auth Orchestrator

Thanks for your interest in contributing!

## Development setup

```bash
git clone https://github.com/ivp-arch/auth-orchestrator.git
cd auth-orchestrator
pnpm install
pnpm build
pnpm test
```

## Workflow

1. Fork & branch from `main`
2. Make your changes
3. Add a changeset: `pnpm changeset`
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a PR

## Security-sensitive changes

Changes to `packages/core/src/flows/`, `packages/core/src/tokens/`, or any
crypto-related code require two reviewer approvals.

## Releasing

Maintainers only. Run `changesets/action` via GitHub Actions on `main`.
