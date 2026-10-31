---
type: decision
title: Local Postgres runs in Docker Compose, started by just up; DBngin is retired
description: 'Owner decision 2026-10-31. OrbStack is always running, so a Postgres container costs no more RAM or battery than native DBngin (~25 MB measured), while compose pins the version in the repo, mirrors the Dockerized prod database, isolates projects, and makes adding services later trivial. A justfile ''up'' recipe is the single entry point: idempotent, creates .env from .env.example, starts compose, migrates, seeds an empty DB, starts the dev server (in a Rex pane when $REX_SESSION is set). Dev DB is named fpa_events; test DB fpa_events_test.'
date: "2026-10-31"
issue: 01M69NQBE8V4H2G6CBVMG5GWHH
scope:
  - compose.yaml
---


