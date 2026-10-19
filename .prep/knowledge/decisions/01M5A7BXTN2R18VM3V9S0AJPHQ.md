---
type: decision
title: Review both dependency trees monthly and before dependency-changing releases
description: 'Audit maintenance rule: the maintainer reviews full npm audit output for the app and tools/migrate monthly while the tool exists, before go-live, and whenever changing dependencies or the Node/build image. Use committed locks and credential-free npm ci; review lifecycle scripts, new registry sources, peer ranges, and exact installed/build versions. Treat audit output as triage: fix reachable high/critical issues before release; give each other advisory a named finding or time-bounded acceptance with reachability reason, revisited on dependency or feature changes and at the next monthly review. Run existing check/unit/build and pre-push gates on actual dependency updates; recheck production-only framework defenses when Kit/Auth changes. Record Node patch/image identity and inspect final runtime inventory rather than assuming omit=dev removes optional peer tooling. Rationale: no maintenance cadence was recorded, no CI security gate exists, current advisories are tool-specific, and two independently locked trees plus cached/installed version drift can escape a root-only audit. Manual review fits this private direct-to-main repository without adding an automated advisory gate that blocks on irrelevant transitive findings. This decision records the audit rule only; no hooks, configs, schedules, dependencies or deployment settings were changed.'
date: "2026-10-19"
issue: 01M5A3500S3M2DBNP0EZ1EC4WK
scope:
  - '**/package*.json'
---


