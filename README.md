# SyncSlot Monorepo

This workspace contains a separate monorepo migration of the original Lovable frontend.

## Structure

- `apps/web`
  - Next.js App Router app
  - migrated UI components, styles, mock data, and major route surfaces
- `apps/api`
  - NestJS scaffold
  - health endpoint at `GET /api/health`

## Goal of this migration

The migration is set up to preserve the current frontend visual language while moving the project into a backend-friendly monorepo shape.

What was migrated:
- global design tokens and styles
- shared UI components
- marketing pages
- auth pages
- onboarding
- dashboard shell and major dashboard routes
- public booking pages and confirm/reschedule/cancel flow

## Notes

- The frontend is still mock-data backed, matching the current pre-backend state.
- Some dashboard settings routes currently redirect to profile until their full page bodies are ported.
- Package installation and runtime verification have not been completed in this workspace yet.
- `apps/api` integration tests require a reachable Redis via `REDIS_URL` for BullMQ. Resend is mocked in the test suite and is never called.
- Later hardening note: consider a dedicated test-only Redis target (local Docker, a fake such as `ioredis-mock`, or a second Upstash database) so CI does not depend on the shared dev Redis instance.

## Suggested next steps

1. Install workspace dependencies with `npm install`
2. Run `npm run dev:web`
3. Smoke test the migrated routes
4. Start replacing mock data with real API contracts
