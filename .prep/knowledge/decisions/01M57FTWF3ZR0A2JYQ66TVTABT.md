---
type: decision
title: Backups are Hetzner's VPS backups; no per-app database backup
description: 'Production runs on a Hetzner VPS managed by Coolify, and Hetzner''s paid VPS backups cover the whole server, Postgres included. Decided with the user on 2026-10-18 that this is a good enough backup strategy for now: no Coolify scheduled Postgres backup and no off-box S3 copy. Revisit if point-in-time recovery or a faster restore is ever needed.'
date: "2026-10-18"
issue: 01M4D4DQ8FN2WXQK0EA2FEZ03E
---


