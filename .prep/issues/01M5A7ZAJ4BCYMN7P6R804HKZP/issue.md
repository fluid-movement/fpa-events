---
title: GlitchTip has no alert rules, so production errors notify no one
kind: manual
parent: 01M5A34Z75BVD5BE4AZWWEDCPA
tags:
  - security
priority: low
---

Deployment audit, 2026-10-19, parent 01M5A34Z75BVD5BE4AZWWEDCPA.

**Gap.** GlitchTip has no alert rules: `list_alerts` for organization `fpa` returns an empty list, so neither project (`events-new`, `events-old`) notifies anyone of new or recurring errors. Several security findings rely on "it would show up in GlitchTip" (the anonymous 500s in 01M5A4TE7KPBQEDTVNCYXKX1GN and 01M5A5KMSNKYDQ613E8D06KDSS, a missing-key misconfiguration in 01M5A7AYJYD1909E7QXA91F97C, CAPTCHA network failures). Probing already produced issue EVENTS-NEW-1 (7 events, the NUL-byte query error) that nobody was told about. No uptime monitor was checked for this finding beyond the feature being enabled.

**Where.** GlitchTip at https://glitchtip.fluid-movement.de, organization fpa, projects events-new and events-old.

**How to reproduce.** List alert rules for the organization (read-only).

**Severity.** Low (detection, not prevention). Not a go-live blocker, but it should be in place by cutover.

**Fix.** Add an alert rule for `events-new` that e-mails the owner on a new issue (and optionally on a frequency threshold), and an uptime monitor on the app's /healthz. Keep notifications free of event payloads beyond the title.

## Open questions
