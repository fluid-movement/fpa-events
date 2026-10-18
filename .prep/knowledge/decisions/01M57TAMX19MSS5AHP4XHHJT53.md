---
type: decision
title: Deleting an account requires the current password
description: Account deletion asks for the current password in the dialog, not a fresh sign-in; a wrong password deletes nothing. The field is named _password so SvelteKit 3 does not echo it back on a failed submission. Verified through Better Auth's configured verifier, so legacy bcrypt hashes work. Default chosen by the agent on 2026-10-18 and not contradicted by the user.
date: "2026-10-18"
issue: 01M4B48HXJPEM6AW10WJ47T12C
---


