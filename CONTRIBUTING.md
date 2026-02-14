# Contributing to Cognifast AI

Thank you for your interest in contributing. This document gives you the guidelines we use so contributions fit the project and are easy to review.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Add the upstream remote:  
   `git remote add upstream https://github.com/Gideon1107/Cognifast-ai.git`
3. Create a branch from `dev`:  
   `git checkout dev && git pull upstream dev && git checkout -b feature/your-feature-name`  
   Use `fix/` for bugfixes and `docs/` for documentation-only changes.

## Development Setup

- **Node.js**: Use a current LTS version (v20+).
- **Database**: Start PostgreSQL with pgvector via Docker:
  ```bash
  npm run db:up
  ```
- **Dependencies**:
  ```bash
  npm install
  cd backend && npm install
  cd ../frontend && npm install
  ```
- **Environment**: Copy `.env.example` (if present) to `.env` in `backend/` and `frontend/` and set required variables (e.g. `DATABASE_URL`, `OPENAI_API_KEY`).
- **Run the app**: From the repo root, run the backend and frontend as described in the [README](README.md#5-run-the-app).

Make sure existing tests and the app run correctly before changing code.

## Coding Standards

- **TypeScript**: Strict mode; avoid `any`. Prefer named exports; default exports only for pages and Express routers.
- **Backend**: Route → Controller → Service (→ DB / Agent). Use `createLogger('Context')` from `utils/logger.ts` — no `console.log`. Use Drizzle for DB; raw SQL only for vector search via the existing `pool` and helpers.
- **Frontend**: React 19, Tailwind in JSX (no CSS modules). Use Zustand for client state and React Query for server state. No API calls inside stores.
- **Shared**: Types live in `shared/types/`; use the `@shared/*` path alias.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for types/components/classes, `UPPER_SNAKE_CASE` for constants, `kebab-case` for file names (backend) and as noted in the README for frontend.

Keep functions small and focused; handle errors explicitly and return consistent `{ success, data?, error? }` from API endpoints.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add dark mode toggle`
- `fix: correct citation indexing in chat response`
- `docs: update API section in README`
- `chore: bump drizzle-orm`

Scope is optional, e.g. `feat(quiz): add time limit option`.

## Pull Request Process

1. **Target branch**: Open PRs against `dev`, not `main`.
2. **Scope**: One logical change per PR. Split large features into smaller PRs where possible.
3. **Description**: Fill in the PR template. Link any related issues.
4. **Checks**: Ensure the app runs, and any relevant tests pass.
5. **Review**: Address feedback from maintainers. We may ask for changes or squash before merge.

After your PR is merged, you can delete your branch and pull the latest `dev` from upstream.

## Reporting Bugs

Use the [Bug report](https://github.com/Gideon1107/Cognifast-ai/issues/new?template=bug_report.md) issue template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, browser if frontend)
- Relevant logs or screenshots

## Suggesting Features

Use the [Feature request](https://github.com/Gideon1107/Cognifast-ai/issues/new?template=feature_request.md) issue template. Describe the problem or use case, your proposed solution, and any alternatives you considered.

---

Thanks for contributing to Cognifast AI.
