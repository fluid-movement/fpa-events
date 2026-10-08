---
title: Fill in the operator details on the legal notice and privacy policy
kind: code
parent: 01M4D4F1CRK1FA4AZ2QDPV303T
tags:
  - legal
priority: critical
---

Source: project sweep, 2026-10-08; `TODO` comments in `src/routes/legal-notice/+page.svelte` and `src/routes/privacy-policy/+page.svelte`.

Both pages still render placeholders to visitors: `[OPERATOR NAME]`, `[STREET ADDRESS]`, `[CITY, POSTAL CODE, COUNTRY]` and `[CONTACT EMAIL]` (also as a `mailto:` link) in the legal notice, and the controller block and the data-subject-rights contact in the privacy policy. A German site without a complete Impressum is open to warning letters, and the GDPR requires a named controller with a reachable contact.

## Open questions

- Who is the operator and controller (the FPA as an association, or a named person), and which postal address and contact email go on both pages?
