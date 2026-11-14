# Oddio Admin Console V2 — Product, data and implementation plan

Status: Phase 0 started (2026-11-14). This document distinguishes verified existing behavior from proposals.

## Mission and guardrails
Build a reliable, role-aware operations console for music publishing, artist onboarding, trust and safety, user support, analytics and platform health. Never display demo/seed metrics as production truth. Preserve existing routes while migrating. Enforce permissions server-side. Keep all sensitive actions audited. Arabic/English, responsive, accessible.

## Verified inventory (GitHub main, 2026-11-14)
Current UI routes: /admin, /admin/review, /admin/applications, /admin/reports, /admin/comments, /admin/users, /admin/verification, /admin/featured, /admin/audit, /admin/track-changes. The last route is linked from dashboard but absent from the layout tab list.

Existing API actions: track decision and preview; artist application decision; report resolution; comment status; user role and quota; verification decision; featured content; track change decision.

Current staff roles in contracts: super_admin, admin, moderator.
Verified endpoint roles:
- track decision: admin, super_admin
- artist application decision: admin, super_admin
- verification decision: admin, super_admin
- quota change: admin, super_admin
- featured: admin, super_admin
- reports/comments: moderator, admin, super_admin
- track change: moderator, admin, super_admin
- user role: super_admin
Do not extend moderator track-approval privileges without explicit product/security decision.

### P0 confirmed data correctness problem
Dashboard, users, verification and audit pages directly call readDb(), which reads ephemeral demo JSON (seeded on first access; /tmp on Vercel). Review and reports use loadDbFromSupabase() in production. This is an actual data-source inconsistency; replace direct demo reads in production-facing admin pages and verify all mutations. `getAdminData` currently returns `storageBytes: 0` and derives `activeListeners` from all-time history, not a bounded DAU/MAU metric. Do not label these as real storage or period-active users.

## Navigation architecture
1. Command Center: Overview, Action Center, Notifications
2. Music & Content: Tracks, Albums, Artists, Applications, Change Requests
3. Trust & Safety: Reports, Copyright, Comments, Verification, Appeals
4. People & Access: Users, Support, Roles & Permissions, Staff Operations
5. Analytics: Listening, Growth, Content Performance, Artist Performance
6. Editorial: Featured, Editorial Calendar
7. System & Security: Health, Processing Jobs, Storage, Audit Log, Settings

Navigation visibility must be based on actual capabilities, with backend enforcement. Existing pages can remain at old URLs during migration.

## Information architecture and requirements
### Command Center
Real pending counts with explicit time windows, overdue/high-priority work, assigned reviewer, last refresh, queue links, service incidents and recent staff actions. No fabricated counts.
### Track Intelligence
Title, artist, album, genre, AI production metadata, copyright attestation, submitted/reviewed/released timestamps, audio format/size/duration/checksum/processing status, artwork health, review history, reports, qualified plays and engagement, actionable preview.
### Artist Intelligence
Owner, onboarding status, verification, catalog, followers/listening, upload quotas, report and decision history, last activity, ownership and rights issues.
### User Support
Account creation and verification state, login provider if available, activity time windows, likes/playlists/follows, linked artists, support cases, restrictions and staff changes. Never expose passwords, session tokens or sensitive auth material.
### Trust & Safety
Case ID, target, evidence, severity, owner, SLA, status, decision and reason, notifications, appeal/reversal trail; copyright takedown and dispute workflow. Human review for adverse decisions.
### Listening and growth analytics
Qualified plays, unique listeners, skips/completion where event definitions support them, retention, DAU/WAU/MAU, geography and genre, signup and artist onboarding funnels. Define time windows, anonymous handling, exclusions and event quality. New instrumentation required for unavailable events.
### Staff operations
Assignment, due date, workload, review time, reopened cases, reversals and escalation. Avoid simplistic per-person productivity rankings.
### Editorial
Featured slots, ranking, scheduling, expiry, attribution and performance; require additional schema/telemetry.
### System health
API error/latency, login/signup errors, upload failures, artwork storage, transcoding and playback failures, cron/job health, deployment version, storage utilization and cost. Integrate real sources before displaying status.

## Proposed permissions (target policy; not yet implemented)
- super_admin: all capabilities, staff-role assignment, critical settings
- admin: content/artist decisions, verification, quotas, editorial, report handling, most analytics, audit (with access controls)
- moderator: reports/comments/track-change triage; no track approval or artist approval unless explicitly authorized
- capability-based server policy: tracks.review, artists.approve, reports.resolve, comments.moderate, verification.decide, users.quotas.manage, users.roles.manage, featured.manage, analytics.view, audit.view, system.health.view.
Require reason codes for consequential actions; reauthentication for especially sensitive changes; least privilege; audit actor, target, timestamp, old/new values where safe. Test unauthorized API calls for every role.

## Delivery phases and exit gates
P0-A Audit and data integrity: map all admin pages/API/data sources, replace demo reads in production, audit mutations, define metric contracts. Gate: production data provenance verified, no seed data in admin.
P0-B RBAC and audit: central capability policy, server tests for all endpoints, audit integrity. Gate: negative authorization tests pass.
P0-C Design: editable Figma screens and component system, desktop/mobile, Arabic/English, empty/loading/error states. Gate: stakeholder review and accessibility checks. Figma file created: https://www.figma.com/design/NkcqG1slvy4LLHppZ8Fi6V ; frames NOT created because Figma Starter MCP quota was reached.
P1-A Admin shell and Command Center: grouped nav, role visibility, priority queue, trustworthy KPIs. Gate: existing workflows preserved.
P1-B Music & Content: review queues, track/artist details, applications, change requests. Gate: end-to-end staff decisions and audits.
P1-C Trust & Safety and People: cases, verification, support, role management. Gate: escalation and access tests.
P2-A Analytics and editorial: real event-based KPIs, funnels, featured scheduling. Gate: documented metric definitions.
P2-B Health and rollout: integrations, alerts, accessibility, regression, staged release. Gate: monitoring and rollback readiness.

## Immediate implementation checklist
- [x] Inventory routes, role checks and core data paths.
- [x] Confirm dashboard/user/verification/audit use demo DB.
- [ ] Migrate production-facing admin reads to authoritative data, including audit.
- [ ] Audit admin mutations for production persistence (especially featured, quotas, verification).
- [ ] Confirm role-specific visibility matches backend enforcement.
- [ ] Add automated RBAC negative tests.
- [ ] Implement responsive shell and trustworthy Action Center.
- [ ] Finish editable Figma screens when connector quota allows.
- [ ] Run end-to-end checks with authorized test staff accounts.

## Risks
Avoid production data changes without tests and rollback. New queues, assignments, appeals and support cases need schema migrations. Data privacy: restrict sensitive user fields, retention and access logging. No invented health status, cost or analytics data.
