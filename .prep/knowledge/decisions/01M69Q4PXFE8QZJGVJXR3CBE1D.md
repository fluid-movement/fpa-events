---
type: decision
title: Local Postgres stays on host port 5432; parallel project databases deferred
description: 'Owner decision 2026-10-31: each project gets its own compose Postgres; this one publishes 5432, so two projects'' DBs cannot run at once (just up refuses when 5432 is held). Owner chose not to solve parallel databases now (options were per-project ports, one shared container, or OrbStack *.orb.local hostnames); revisit if they actually need it. POSTGRES_HOST_PORT plus DATABASE_URL is the escape hatch.'
date: "2026-10-31"
issue: 01M69NQBE8V4H2G6CBVMG5GWHH
---


