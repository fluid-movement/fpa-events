---
type: component
title: Email
description: Mailgun EU sending, the console fallback, templates and the dev preview route.
generated:
  by: claude-code/opus-5.5
  at: 2026-10-07T11:46:38Z
scope:
  - src/lib/server/email.ts
  - src/lib/email
  - src/routes/dev
status: stable
confirmed_commit: ee73afc64738434fd6f496fd50caf09ce5470f63
---

# Email

`src/lib/server/email.ts` sends through Mailgun's **EU** API
(`api.eu.mailgun.net`) when `MAILGUN_API_KEY` is set. The sender is
`MAILGUN_FROM_EMAIL`, or `noreply@MAILGUN_DOMAIN` if that is unset.

- **Fallback**: with no key, `sendEmail` logs To, Subject and the first URL in
  the body to the console. Local dev and the Playwright suite read verification
  links this way, so keep the link as the first URL in a template.
- **Never throws**: send failures are logged. Better Auth's callbacks invoke
  the sends with `void`, so a slow Mailgun call never stalls sign-up.
- **Templates**: `src/lib/email/templates.ts` holds `baseTemplate` plus
  `activate-account` (verification) and `reset-password`, registered in
  `emailTemplates` with sample data. They are unit-tested.
- **Preview**: `/dev/emails` (dev-only. The layout 404s outside `import.meta.env.DEV`
  and the `sendTestEmailForm` remote function checks it again itself) renders
  each template and can send a test.

The app sends no event notifications.
