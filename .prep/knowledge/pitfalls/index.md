# pitfalls

## Entries

- [Custom user columns are not on session.user](/pitfalls/better-auth-session-fields.md) - role, showAttendance and calendarToken must be read from the DB, not from locals.user.
- [Deploy Node is older than dev Node](/pitfalls/deploy-node-version.md) - nixpacks resolves Node 22.19; dependency engine floors above it break the deploy.
- [Rich text is sanitized on read, not on write](/pitfalls/rich-text-sanitizing.md) - Stored Tiptap HTML is raw; every load feeding RichContent must sanitizeRichText it.
