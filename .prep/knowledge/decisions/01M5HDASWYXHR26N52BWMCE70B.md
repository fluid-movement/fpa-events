---
type: decision
title: Larger changes can go to a cloud agent through a branch with cloud-todo.md
description: 'Stated by the user 2026-10-22: for a larger change the orchestrator pushes a feature branch (with --no-verify, only after asking; never main) holding cloud-todo.md with all context, rules and todos, and points a cloud agent at it. The cloud agent never touches .prep or the prep CLI. When it is done the orchestrator reviews the branch, runs the integration specs locally, updates the prep issue, deletes cloud-todo.md and merges. Named cloud-todo.md because TODO.md already exists and macOS is case-insensitive.'
date: "2026-10-22"
---


