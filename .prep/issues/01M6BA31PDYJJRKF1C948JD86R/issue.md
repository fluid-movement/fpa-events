---
title: 'Event create and edit forms fail on submit: Turnstile injects a field Kit did not build'
kind: code
parent: 01M4B368HR728N7P81MK1DFQCR
tags:
  - bug
priority: high
---

Found 2026-11-01 during the events-dev smoke test: creating an event at /events/create fails on submit. GlitchTip EVENTS-NEW-3 (issue 16) shows Kit's client throwing form_field_unbound from parse_form_key in convert_formdata, inside the form's preflight; the production build hides the field name.

Likely cause (unconfirmed in a browser): Cloudflare Turnstile's explicit render adds a hidden input named cf-turnstile-response to the enclosing <form>. Kit 3 rejects any field not created by fields.as(...) (AGENTS.md). Only events/create/+page.svelte and events/[id]/admin/edit/EventDetailsForm.svelte put <Turnstile> inside a remote form(); the auth pages use better-auth client calls and tolerate the extra field. The integration tests never see it because .env.test leaves the Turnstile keys blank, which disables the widget.

Fix direction: stop Turnstile from writing the field (render option response-field: false in src/lib/components/Turnstile.svelte, to be verified against Cloudflare's docs) since the token already travels through fields.turnstileToken.as('hidden', token). Confirm in a browser on events-dev with the real widget on both forms.

## Open questions
