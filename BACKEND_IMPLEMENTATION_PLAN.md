# SyncSlot Backend Implementation Plan

## 1. Purpose

This document turns the current `SyncSlot-Full-Spec.docx` product specification and the existing frontend workspace into a practical backend implementation plan for the current monorepo.

The goal is not just to "add APIs", but to build the full backend foundation required to move the existing mock-data frontend into a production-ready scheduling platform.

## 2. Current Project State

### Repo structure

- `apps/web`
  - Next.js App Router frontend
  - Fully mocked screens for marketing, auth, onboarding, public booking pages, dashboard, event type editing, availability, integrations, analytics, booking detail, reschedule, and cancel
- `apps/api`
  - NestJS scaffold only
  - current implementation is a health route only
- root workspace
  - npm workspaces configured
  - no shared `packages/*` implementation yet
  - no database layer, auth layer, background jobs, or third-party integrations yet

### Backend state in code

`apps/api/src/main.ts`
- Nest app exists
- global prefix is `/api`
- no validation, no security middleware, no module decomposition

`apps/api/src/app.module.ts`
- empty module graph

`apps/api/src/app.controller.ts`
- health check only

### Frontend state relevant to backend

The frontend already defines the backend contract implicitly.

Primary route groups already built:

- Auth and onboarding
  - `apps/web/app/signup/page.tsx`
  - `apps/web/app/login/page.tsx`
  - `apps/web/app/forgot-password/page.tsx`
  - `apps/web/app/onboarding/page.tsx`
- Public booking
  - `apps/web/app/[username]/page.tsx`
  - `apps/web/app/[username]/[eventSlug]/page.tsx`
  - `apps/web/app/[username]/[eventSlug]/confirmed/page.tsx`
  - `apps/web/app/[username]/[eventSlug]/reschedule/[bookingId]/page.tsx`
  - `apps/web/app/[username]/[eventSlug]/cancel/[bookingId]/page.tsx`
- Host dashboard
  - `apps/web/app/dashboard/page.tsx`
  - `apps/web/app/dashboard/event-types/page.tsx`
  - `apps/web/app/dashboard/event-types/[id]/page.tsx`
  - `apps/web/app/dashboard/availability/page.tsx`
  - `apps/web/app/dashboard/bookings/page.tsx`
  - `apps/web/app/dashboard/bookings/[id]/page.tsx`
  - `apps/web/app/dashboard/integrations/page.tsx`
  - `apps/web/app/dashboard/analytics/page.tsx`
  - `apps/web/app/dashboard/settings/profile/page.tsx`

### Mock-data signals that affect backend design

`apps/web/src/lib/mock/data.ts` already expresses the first-pass domain model used by the screens:

- user profile and username-based public pages
- event types with duration, location, questions, booking rules, and cancellation policy
- bookings with status buckets: upcoming, past, cancelled
- booking filters and analytics summaries

This is useful because it shows what the frontend expects to render immediately after backend hookup, even where the spec is broader.

## 3. Requirements Summary From The Full Spec

The spec defines a Calendly-style platform with these backend-critical capability groups:

- authentication
  - email/password
  - Google OAuth
  - Microsoft OAuth
  - email verification
  - password reset
- user identity and onboarding
  - name
  - username slug
  - timezone
- event type management
  - CRUD
  - custom booking questions
  - booking rules
  - active/inactive state
  - duplicate support
- availability system
  - recurring weekly schedules
  - multiple schedules
  - date overrides
  - timezone-aware slot computation
- booking engine
  - public profile and event pages
  - slot generation
  - booking creation
  - conflict prevention
  - reschedule/cancel flows
- calendar integrations
  - Google Calendar
  - Microsoft Outlook
  - busy time sync
  - event creation/cancellation
- notifications
  - confirmation emails
  - reminders
  - cancellation/reschedule emails
  - optional SMS
- dashboard data
  - bookings
  - event types
  - availability
  - integrations
  - analytics
- production/security
  - encrypted OAuth tokens
  - validation
  - rate limiting
  - audit logging
  - webhook verification
  - GDPR-style export/delete
- phase 2
  - teams/workspaces
  - payments
  - admin panel

## 4. Recommended Backend Direction

## Decision

Use the existing `apps/api` NestJS app as the primary backend, backed by PostgreSQL and Prisma.

## Why this direction fits the current repo

- the repo already has a dedicated API app instead of colocated Next API routes
- NestJS is better for module boundaries, background jobs, webhooks, guards, interceptors, and long-lived integrations
- the feature set is integration-heavy and will grow beyond simple CRUD
- it avoids turning `apps/web` into both frontend and operational backend

## Recommended target architecture

- `apps/web`
  - frontend rendering only
  - calls backend through typed API client
- `apps/api`
  - auth/session issuance
  - all application APIs
  - webhook receivers
  - third-party integrations
  - background job producers
- `packages/`
  - `packages/database`
    - Prisma schema, migrations, Prisma client wrapper
  - `packages/types`
    - shared DTOs, enums, API response types
  - `packages/config`
    - environment schema and typed config helpers
  - optional later: `packages/sdk`
    - typed frontend API client
- infrastructure
  - PostgreSQL
  - Redis
  - object storage only if branding assets/avatar uploads are added
  - email provider
  - queue/job system

## 5. Key Alignment Issues To Resolve Before Implementation

These are important because the frontend and spec are close, but not identical.

### 1. Reschedule/cancel URL strategy mismatch

Spec:
- token-based public reschedule/cancel endpoints
- `POST /api/public/bookings/:rescheduleToken/reschedule`
- `POST /api/public/bookings/:rescheduleToken/cancel`

Frontend today:
- `/{username}/{eventSlug}/reschedule/{bookingId}`
- `/{username}/{eventSlug}/cancel/{bookingId}`

Recommendation:
- backend should use opaque public tokens, not booking IDs
- frontend routes should move to token-based URLs before production integration, or map route params to a token lookup layer

### 2. Mock model naming mismatch

Frontend mock fields:
- `duration`
- `minNoticeHours`
- `scheduleName`

Spec/database fields:
- `durationMinutes`
- `minNoticeMins`
- `scheduleId`

Recommendation:
- keep backend/domain names aligned with database and spec
- add frontend adapters or update UI models to match final contracts

### 3. Auth ownership

Spec suggests NextAuth/Auth.js in Next.js-oriented architecture.
Current repo has a separate API app.

Recommendation:
- keep session/auth logic centered in `apps/api`
- use JWT or secure cookie sessions issued by NestJS
- implement OAuth flows server-side in API
- do not split auth ownership across both apps unless there is a strong operational reason

### 4. Billing/team/admin are not yet represented in usable frontend flows

Current status:
- billing and account routes redirect to profile
- no admin UI
- no real team management UX

Recommendation:
- backend should model extension points for plan/workspace support, but phase actual endpoints behind milestones

## 6. Backend Domain Model

The spec schema is a strong starting point, but backend implementation should expand it slightly for operational completeness.

## Core entities for phase 1

- `User`
- `CredentialAccount`
  - local password auth
  - optional provider identity mapping
- `EmailVerificationToken`
- `PasswordResetToken`
- `Session` or JWT/session revocation store
- `EventType`
- `BookingQuestion`
- `Schedule`
- `AvailabilityRule`
- `DateOverride`
- `Booking`
- `BookingAuditLog`
- `CalendarAccount`
- `CalendarSyncCursor`
- `NotificationDelivery`
- `WebhookEndpoint`

## Strongly recommended additions beyond the spec

### `BookingAuditLog`

Needed for:
- cancellation audit trail
- reschedule traceability
- admin/customer support
- compliance/debugging

Suggested fields:
- `id`
- `bookingId`
- `actorType` (`HOST`, `INVITEE`, `SYSTEM`)
- `actorUserId` nullable
- `action` (`CREATED`, `CANCELLED`, `RESCHEDULED`, `REMINDER_SENT`, `CALENDAR_EVENT_CREATED`, etc.)
- `metadata` JSON
- `createdAt`

### `NotificationDelivery`

Needed for:
- retry logic
- provider status tracking
- observability

Suggested fields:
- `channel`
- `template`
- `recipient`
- `provider`
- `status`
- `providerMessageId`
- `payload`
- `sentAt`
- `failedAt`

### `WebhookEndpoint`

The integrations UI already implies outgoing webhooks.

Suggested fields:
- `userId`
- `url`
- `secret`
- `subscribedEvents`
- `isActive`

### `CalendarSyncCursor`

Needed if incremental sync or webhook-based calendar sync is implemented.

## Phase 2 entities

- `Workspace`
- `WorkspaceMember`
- `TeamEventType`
- `RoundRobinRule`
- `CollectiveSchedulePolicy`
- `Subscription`
- `Invoice`
- `Payment`
- `AdminUser` or `PlatformRole`

## 7. Backend Module Breakdown

Recommended NestJS module structure:

- `app`
- `config`
- `database`
- `auth`
- `users`
- `onboarding`
- `profiles`
- `event-types`
- `booking-questions`
- `schedules`
- `availability`
- `slot-engine`
- `bookings`
- `public-booking`
- `calendar-integrations`
- `notifications`
- `analytics`
- `webhooks`
- `audit`
- `health`
- `common`
  - guards
  - decorators
  - pipes
  - interceptors
  - filters

## 8. API Surface Needed For The Existing Frontend

This is the minimum useful API contract to replace the current mocks.

## Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/verify-email`
- `GET /api/auth/session`
- `GET /api/auth/oauth/google/start`
- `GET /api/auth/oauth/google/callback`
- `GET /api/auth/oauth/microsoft/start`
- `GET /api/auth/oauth/microsoft/callback`

## User/profile/onboarding

- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users/check-username?value=...`
- `POST /api/onboarding/complete`
- `GET /api/public/:username`

## Event types

- `GET /api/event-types`
- `POST /api/event-types`
- `GET /api/event-types/:id`
- `PATCH /api/event-types/:id`
- `DELETE /api/event-types/:id`
- `POST /api/event-types/:id/duplicate`
- `PATCH /api/event-types/:id/status`

## Schedules and availability

- `GET /api/schedules`
- `POST /api/schedules`
- `GET /api/schedules/:id`
- `PATCH /api/schedules/:id`
- `DELETE /api/schedules/:id`
- `POST /api/schedules/:id/rules`
- `PATCH /api/schedules/:id/rules/:ruleId`
- `DELETE /api/schedules/:id/rules/:ruleId`
- `POST /api/schedules/:id/overrides`
- `PATCH /api/schedules/:id/overrides/:overrideId`
- `DELETE /api/schedules/:id/overrides/:overrideId`

## Public booking flow

- `GET /api/public/:username/:eventSlug`
- `GET /api/public/:username/:eventSlug/slots?date=YYYY-MM-DD&tz=...`
- `POST /api/public/:username/:eventSlug/book`
- `GET /api/public/bookings/:token`
- `POST /api/public/bookings/:token/reschedule`
- `POST /api/public/bookings/:token/cancel`

## Host bookings

- `GET /api/bookings`
  - filters: `status`, `search`, `from`, `to`, `eventTypeId`, `page`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id/notes`
- `POST /api/bookings/:id/cancel`
- `POST /api/bookings/:id/reschedule`
- `GET /api/bookings/export.csv`

## Integrations

- `GET /api/integrations`
- `POST /api/integrations/google-calendar/connect`
- `POST /api/integrations/microsoft-calendar/connect`
- `DELETE /api/integrations/calendar-accounts/:id`
- `PATCH /api/integrations/calendar-accounts/:id/primary`
- `GET /api/webhooks`
- `POST /api/webhooks`
- `PATCH /api/webhooks/:id`
- `DELETE /api/webhooks/:id`

## Analytics

- `GET /api/analytics/summary?range=7|30|90`
- `GET /api/analytics/bookings-series?range=...`
- `GET /api/analytics/conversion-series?range=...`

## Compliance/platform

- `GET /api/privacy/export`
- `DELETE /api/privacy/delete-account`

## 9. Detailed Implementation Phases

## Phase 0. Architecture and repo foundation

### Goals

- lock architectural decisions before writing feature code
- create package boundaries that prevent duplication

### Deliverables

- choose NestJS as system-of-record backend
- introduce `packages/database`, `packages/types`, and `packages/config`
- add root TypeScript path aliases if needed
- standardize environment loading and schema validation
- define API versioning strategy

### Concrete tasks

- move Prisma ownership out of `apps/web` and into shared package
- define env schema with Zod
- establish logging baseline with Pino
- add global error filter and request ID middleware
- add OpenAPI/Swagger in non-production

### Exit criteria

- backend app boots with config validation
- shared packages build cleanly
- health endpoint includes dependency checks

## Phase 1. Database and Prisma foundation

### Goals

- establish authoritative schema
- make migrations safe from day one

### Deliverables

- initial Prisma schema
- migrations
- seeded dev data
- database service abstraction

### Concrete tasks

- implement phase 1 core schema
- add indexes for:
  - `User.username`
  - `User.email`
  - `EventType.userId`
  - `EventType.userId + slug`
  - `Schedule.userId`
  - `Booking.eventTypeId`
  - `Booking.hostId`
  - `Booking.startTime`
  - `Booking.status`
  - `CalendarAccount.userId`
- add soft-delete strategy only if truly needed; otherwise keep hard deletes constrained and explicit
- add Prisma transaction helper patterns

### Exit criteria

- migration runs on clean database
- schema supports all current frontend flows
- seed data can generate at least one realistic host with event types, schedule, and bookings

## Phase 2. Auth and identity

### Goals

- create secure user identity and session foundation

### Deliverables

- local auth
- OAuth login
- email verification
- password reset
- protected dashboard access

### Concrete tasks

- credentials signup/login with Argon2
- username uniqueness endpoint
- secure session strategy:
  - HTTP-only cookies preferred
  - CSRF-safe login/logout flow
- implement Google OAuth
- implement Microsoft OAuth
- implement email verification token lifecycle
- implement password reset token lifecycle
- add route guards for authenticated endpoints

### Frontend integration targets

- `signup/page.tsx`
- `login/page.tsx`
- `forgot-password/page.tsx`
- dashboard route protection

### Exit criteria

- new user can sign up, verify email, sign in, and reach dashboard
- OAuth account linkage works
- protected APIs reject anonymous access

## Phase 3. User profile and onboarding

### Goals

- persist the onboarding flow already designed in frontend

### Deliverables

- user profile endpoints
- onboarding completion endpoint
- username availability checks

### Concrete tasks

- store name, username, timezone, optional title/welcome/profile customization
- add onboarding completion state to `User`
- add backend validation for username format
- ensure public profile cannot go live until email verification is complete

### Frontend integration targets

- `onboarding/page.tsx`
- `dashboard/settings/profile/page.tsx`
- `apps/web/app/[username]/page.tsx`

### Exit criteria

- onboarding persists and updates public page data
- username conflicts handled correctly

## Phase 4. Event type CRUD

### Goals

- replace event-type mocks with real persistence

### Deliverables

- event type CRUD
- custom question CRUD
- status toggling
- duplication

### Concrete tasks

- DTOs for create/update event type
- nested question writes
- slug uniqueness per user
- validation for:
  - duration
  - location type
  - question types/options
  - min/max booking rules
  - daily/weekly limits
- duplicate endpoint copies questions and rule values

### Frontend integration targets

- `dashboard/event-types/page.tsx`
- `dashboard/event-types/[id]/page.tsx`
- public event listing page

### Exit criteria

- host can create, edit, disable, delete, and duplicate event types
- public page reflects active-only event types

## Phase 5. Availability and schedules

### Goals

- support the scheduling constraints required for real slot generation

### Deliverables

- schedule CRUD
- recurring rule CRUD
- date override CRUD
- event type to schedule assignment

### Concrete tasks

- implement named schedules
- support multiple intervals per day
- validate interval overlap and bad ranges
- support closed-day overrides and custom-hour overrides
- support default schedule selection
- optional out-of-office flag can be implemented as schedule-level override generation

### Frontend integration targets

- `dashboard/availability/page.tsx`
- event type editor schedule assignment

### Exit criteria

- saved schedules can be read and updated without overlap corruption
- event types point to real schedules

## Phase 6. Slot calculation engine

### Goals

- build the core business logic safely and deterministically

### Deliverables

- reusable slot engine service
- test suite for all slot rules

### Concrete tasks

- define canonical UTC storage strategy
- compute candidate slots from host schedule in host timezone
- apply:
  - date overrides
  - duration
  - buffer before/after
  - min notice
  - max future window
  - daily/weekly caps
  - existing booking conflicts
  - external busy calendar conflicts
- convert final slots to invitee timezone
- prevent race conditions on slot booking

### Critical engineering requirement

Booking creation and slot availability must be treated as one consistency problem.

That means:

- slot read endpoint can be eventually consistent
- booking creation endpoint must re-check availability inside a transaction
- if two invitees attempt the same slot, only one succeeds

### Recommended implementation details

- use Luxon or `date-fns-tz`
- isolate slot logic in pure functions plus a data-fetch adapter
- create high-coverage unit tests for timezone boundaries and DST

### Exit criteria

- deterministic tests cover DST, buffers, notice windows, and booking collisions
- booking endpoint rejects stale client-selected slots

## Phase 7. Public booking flow

### Goals

- enable real end-to-end booking from public pages

### Deliverables

- public profile endpoint
- public event detail endpoint
- slot endpoint
- booking creation endpoint
- confirmation payload

### Concrete tasks

- fetch active public profile by username
- fetch active event type by username + slug
- expose available slots by date and invitee timezone
- validate public booking form answers
- create booking record transactionally
- create public cancel/reschedule tokens
- trigger downstream calendar and notification workflows

### Frontend integration targets

- `apps/web/app/[username]/page.tsx`
- `apps/web/app/[username]/[eventSlug]/page.tsx`
- `apps/web/app/[username]/[eventSlug]/confirmed/page.tsx`

### Exit criteria

- external user can book a real slot and see confirmation data returned from backend

## Phase 8. Booking management, reschedule, and cancellation

### Goals

- support both invitee and host management flows

### Deliverables

- host bookings list/detail
- notes
- cancellation
- rescheduling
- audit trail

### Concrete tasks

- host bookings filtering:
  - upcoming
  - past
  - cancelled
  - search
- booking detail endpoint
- private notes storage
- host cancel endpoint
- invitee token cancel endpoint
- invitee token reschedule endpoint
- reschedule flow should:
  - preserve booking lineage
  - mark old booking state appropriately
  - create audit log

### Important design choice

Prefer one of these models and commit to it:

- mutate existing booking row and track change history
- create new booking row and mark previous as rescheduled

Recommendation:
- create new booking row or explicit reschedule record for strong auditability

### Frontend integration targets

- `dashboard/bookings/page.tsx`
- `dashboard/bookings/[id]/page.tsx`
- public cancel/reschedule pages

### Exit criteria

- both host and invitee can manage bookings safely
- audit log is complete

## Phase 9. Notifications and job processing

### Goals

- move side effects out of request-response path

### Deliverables

- email notifications
- reminder jobs
- retryable delivery system

### Concrete tasks

- choose queue stack:
  - BullMQ + Redis is a strong fit with NestJS
- implement jobs for:
  - booking confirmation
  - host confirmation
  - reminder 24h
  - reminder 1h
  - cancel email
  - reschedule email
- add notification templates
- add delivery status tracking

### Nice-to-have later

- SMS reminder jobs via Twilio

### Exit criteria

- booking API is no longer directly responsible for sending notifications inline
- failed deliveries can be retried safely

## Phase 10. Calendar integrations

### Goals

- provide real conflict checking and event sync

### Deliverables

- Google Calendar integration first
- Microsoft integration second

### Concrete tasks

- OAuth connect flow for provider accounts
- encrypt tokens at rest
- persist expiry and refresh metadata
- fetch busy blocks for slot engine
- create calendar event on booking confirm
- cancel/update calendar event on cancellation/reschedule
- choose meeting link strategy:
  - provider-generated link where supported
  - fallback to custom link storage

### Recommended rollout order

1. Google Calendar busy-time read
2. Google Calendar event creation
3. Google Meet link support
4. Microsoft Outlook busy-time read
5. Microsoft event creation

### Exit criteria

- connected calendars block busy slots
- bookings create real calendar events

## Phase 11. Dashboard analytics

### Goals

- back the current dashboard cards and charts with real aggregates

### Deliverables

- summary KPIs
- time-series endpoints
- export baseline

### Concrete tasks

- define analytics grain and retention assumptions
- implement summary metrics:
  - total bookings
  - unique invitees
  - conversion
  - average bookings/day
  - busiest days
  - no-show rate only if no-show data model exists
- decide whether analytics is:
  - live query from OLTP tables
  - pre-aggregated materialized tables

Recommendation for phase 1:
- live query from OLTP tables is fine if scale is low/moderate

### Exit criteria

- analytics page is no longer mock-only

## Phase 12. Security, compliance, and operational hardening

### Goals

- make the platform production-safe

### Deliverables

- validation
- rate limiting
- token encryption
- structured logging
- monitoring
- privacy flows

### Concrete tasks

- global Zod/class-validator input validation strategy
- per-route rate limiting for public booking endpoints
- CSRF protection where cookie-authenticated write actions are used
- encrypt OAuth refresh/access tokens at rest
- structured logs with request IDs
- Sentry integration
- webhook signature verification
- GDPR export/delete endpoints
- backup strategy and restore drill

### Exit criteria

- public endpoints are abuse-resistant
- third-party secrets are protected
- observability is usable in production

## Phase 13. Integration with frontend

### Goals

- swap mock data screen by screen without destabilizing UI

### Recommended integration order

1. auth/session
2. onboarding/profile
3. event types
4. schedules/availability
5. public profile and event detail
6. slots
7. booking creation
8. bookings dashboard
9. cancel/reschedule
10. integrations
11. analytics

### Frontend implementation guidance

- keep API calls behind a client layer
- use React Query consistently
- do not let page components own raw fetch wiring everywhere
- add DTO-to-view-model adapters because current mocks do not match the final schema one-to-one

## 10. Detailed Data and Logic Concerns

## Timezone policy

Non-negotiable rules:

- store booking timestamps in UTC
- store schedule-local times as local wall-clock times plus timezone context
- convert only at computation/render boundaries
- test DST transitions explicitly

## Concurrency policy

Non-negotiable rules:

- every booking request re-checks slot availability on the server
- booking creation must be transactional
- duplicate/conflicting bookings must be impossible under concurrent requests

## Idempotency policy

Recommended for:

- booking creation
- cancellation
- webhook processing
- notification dispatch

Add:

- idempotency keys for public booking POST if feasible
- processed webhook event store for provider callbacks

## Secret and token handling

- never store OAuth tokens plaintext
- use application-level encryption for sensitive external credentials
- rotate encryption key through env-managed secret

## Auditability

Must log:

- booking created
- booking cancelled
- booking rescheduled
- provider connect/disconnect
- reminder sent
- calendar sync errors

## 11. Testing Strategy

## Unit tests

- slot generation
- timezone conversion
- validation rules
- booking-rule enforcement
- analytics aggregations

## Integration tests

- auth flows
- event type CRUD
- schedule CRUD
- booking creation against real test DB
- cancel/reschedule flows
- calendar token refresh logic

## End-to-end tests

- signup -> onboarding -> create event type -> set availability -> book slot
- host cancel
- invitee reschedule

## Load and abuse tests

- slot endpoint
- booking create endpoint
- rate-limited public flows

## 12. Infrastructure and DevOps Plan

## Environments

- local
- staging
- production

## Required services

- Postgres
- Redis
- email provider
- error monitoring
- log sink

## Deployment recommendations

- frontend on Vercel if desired
- API on Railway, Render, Fly.io, ECS, or similar Nest-friendly runtime
- managed Postgres on Neon/Supabase/Railway
- Redis managed service

## CI/CD requirements

- lint
- typecheck
- unit tests
- integration tests
- migration check
- deploy gating by environment

## 13. Suggested Execution Order For Your Team

This is the practical order I would use for implementation.

1. Create shared package structure and backend conventions.
2. Add Prisma schema, migrations, and seed data.
3. Implement auth, sessions, email verification, and password reset.
4. Persist onboarding and profile management.
5. Build event type CRUD and question management.
6. Build schedule and override CRUD.
7. Implement and test the slot engine thoroughly.
8. Build public profile, event detail, and slots endpoints.
9. Build booking creation with transaction-safe conflict checks.
10. Add host bookings list/detail and private notes.
11. Add public token-based cancel/reschedule flow.
12. Add background jobs and email notifications.
13. Add Google Calendar integration.
14. Add Microsoft integration.
15. Add analytics aggregation endpoints.
16. Add webhooks, privacy endpoints, and operational hardening.
17. Replace remaining frontend mock flows with real API integration.
18. Run staging QA across timezone, DST, concurrency, and reminder scenarios.

## 14. Highest-Risk Areas

These are the parts most likely to cause rework if treated casually.

- slot computation correctness
- timezone and DST handling
- double-booking prevention under concurrency
- calendar provider token refresh and sync reliability
- public reschedule/cancel token design
- side-effect orchestration around booking lifecycle

These should be treated as architecture tasks, not just implementation details.

## 15. Recommended Immediate Next Steps

If starting backend work now, the next concrete actions should be:

1. Finalize the architecture decision: NestJS API remains the primary backend.
2. Normalize the public reschedule/cancel route design to token-based URLs.
3. Create `packages/database`, `packages/types`, and `packages/config`.
4. Write the Prisma schema for phase 1 plus the missing operational tables.
5. Implement auth/session foundation before any feature CRUD.
6. Define typed DTOs that map backend entities to the current frontend screen models.

## 16. Final Recommendation

The backend should be implemented in two layers:

- foundational platform layer
  - config, database, auth, jobs, logging, security
- scheduling domain layer
  - event types, schedules, slot engine, bookings, integrations, analytics

That separation matters because the scheduling logic will become the core product asset, while the platform layer must make it safe and operable.

If you want the fastest path to integration without rework, build phase 1 around:

- auth
- user profile/onboarding
- event types
- schedules
- slot engine
- booking creation
- cancel/reschedule

Then add notifications and calendar sync immediately after, because those are part of the real booking lifecycle rather than optional polish.
