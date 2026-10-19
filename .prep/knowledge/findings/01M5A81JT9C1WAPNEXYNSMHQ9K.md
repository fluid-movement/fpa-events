---
type: finding
title: Coolify MCP can show which env keys exist and their build/runtime flags, never whether they are blank
description: 'list_env_keys returns names and flags only. Nonblank status has to be inferred from behaviour: MAILGUN_API_KEY was shown nonblank because the container log (get_logs) prints ''[email] Sent'' only on the Mailgun path. TURNSTILE_SECRET_KEY has no such log trace on success, so it needs the owner. Backup execution sizes (list_backup_executions) are a cheap way to spot backups of the wrong database: the legacy DB''s dumps are all 1055 bytes. Criteria 1 and 2 stay open until the owner answers 01M5A7ZANWK8D315ZE8FD47HJZ and the filed exposures are fixed or accepted.'
date: "2026-10-19"
issue: 01M5A34Z75BVD5BE4AZWWEDCPA
---


