---
type: decision
title: Crew banners share the existing upload prefix
description: Crew banners use the events/ upload namespace and shared picture locks.
date: "2026-11-04"
issue: 01M6KP6K0QFJF47C2271PE7VBY
---

Reusing ImageUpload and its endpoint keeps URL validation and orphan cleanup consistent; ownership checks count both crews and events.
