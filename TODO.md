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

## 🔜 Next
- [x] RSVP toggle (attending / not going) on event detail page
- [x] /attending page — upcoming events with countdown + past attended
- [x] Event delete (creator or admin only)
- [ ] Event image upload (Cloudflare R2)

# Phase 2 — Admin Role
- [ ] `role` column on user table
- [ ] Admin route guards (/admin/*)
- [ ] Admins can edit/delete any event

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
