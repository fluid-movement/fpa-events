---
title: Verify production email delivery from the Mailgun domain
kind: manual
parent: 01M4B36G3YXMS9BWXT4XSZAC0S
tags:
  - email
  - deploy
priority: high
---

Source: project sweep, 2026-10-08.

Sign-up cannot finish without the verification email (`requireEmailVerification: true`), and after cutover every user who forgot their password depends on the reset email. `sendEmail` never throws and only logs a failure, so a misconfigured domain would fail silently.

Before cutover: the production `MAILGUN_DOMAIN` (EU region, which `email.ts` hardcodes) is verified in Mailgun with SPF, DKIM and a DMARC record on the sending domain; `MAILGUN_FROM_EMAIL` is an address on that domain; a verification and a password-reset email sent from the deployed app arrive in the inbox (not spam) of a Gmail and an Outlook address, and their links point at the public domain.

Knowledge: /components/email.md.

## Open questions
