# Phase 1 — Events (current focus)

## ✅ Done
- Theme, color palette, typography (layout.css)
- Button micro-interactions (shadow lift, glow, press-down)
- Card glass-border gradient effect
- EventCalendarCard redesigned (glow, chip date, glass card)
- Design system page (/design) — all components showcased
- Events index — month grouping, card styling
- Past events archive (/events/past/[year])
- Event create/edit with Tiptap rich text editor
- Event detail page — info, schedules tab, edit/manage for owner
- Auth pages (sign-in, sign-up, forgot/reset password)
- Magic link invite acceptance
- RSVP toggle (attending / not going) on event detail page
- /attending page — upcoming events with countdown + past attended
- Event delete (creator or admin only)
- Unit tests (Vitest) + integration tests (Playwright) for all features
- `role` column on user table
- Admins can edit/delete any event (event detail + admin + edit pages)

## 🔜 Next
- [x] Event image upload (Cloudflare R2)

# Phase 2 — Admin Role
- [ ] Admin route guards (/admin/*) — site-level admin dashboard

# Phase 3 — Players & Membership
- [ ] players + active_years tables
- [ ] /admin/members CRUD
- [ ] /admin/dashboard analytics
- [ ] Player self-service (user manages own membership)

# Backlog
- [ ] Home page — something interesting (event stats, upcoming highlight?)
- [ ] User settings page polish
- [ ] Seed data for dev
- [ ] Email notifications (deferred)
- [ ] Rankings algorithm (placeholder only)
