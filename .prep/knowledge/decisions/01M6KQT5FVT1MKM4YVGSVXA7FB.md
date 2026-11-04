---
type: decision
title: Cities are matched on case-insensitive country and city only
description: Shared markers are now keyed on lower(country), lower(city) in the cities table; coordinates no longer take part in matching and the first writer's coordinates win. Supersedes coordinate matching because crew pages need exactly one row per city to list every event there.
date: "2026-11-04"
scope:
  - src/lib/server/db/**
supersedes:
  - 01M5HBF41MRVJG5BZP30QYEZHZ
---


