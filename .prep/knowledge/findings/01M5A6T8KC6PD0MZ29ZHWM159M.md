---
type: finding
title: Legacy password verification is compatibility only, not transparent upgrading
description: src/lib/server/password.ts only verifies supported bcrypt prefixes and otherwise delegates to scrypt. The installed sign-in handler never rewrites credentials after a successful bcrypt login; the offline adapter trace only created a session. Prep product decisions require legacy passwords to keep working and do not specify rehash-on-login. Therefore the parent scope phrase transparent legacy bcrypt upgrade is an assumption to correct, not a verified defense or a new mandatory feature. Existing password.test.ts passed; timing risk is filed separately. Migration intentionally marks all imported users verified, as already documented by the upstream audit.
date: "2026-10-19"
issue: 01M5A34XDWPGKSKMTVA213DHX7
---


