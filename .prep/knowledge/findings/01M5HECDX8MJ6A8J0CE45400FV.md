---
type: finding
title: Agent isolation 'remote' ran locally
description: 'Observed 2026-10-22: two Agent calls with isolation ''remote'' ran as local subagents in .claude/worktrees/agent-*, not as claude.ai/code cloud sessions, with no error. A hand-off written for the cloud (createdb, db:reset:test, own Playwright server) is unsafe locally because the test DB and port 5174 are shared. Check ListAgents/git worktree list after launching; real cloud runs go through a routine (RemoteTrigger).'
date: "2026-10-22"
---


