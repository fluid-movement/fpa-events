---
type: decision
title: Turnstile is tested on a second dev server with Cloudflare's dummy keys
description: Specs that need the live Turnstile widget run in the 'turnstile' Playwright project against a second dev server on port 5175 (npm run dev:test:turnstile) using Cloudflare's always-pass test keys. Turnstile is not enabled in .env.test or on the main 5174 server because the Better Auth captcha plugin would then demand a token on every API sign-up and sign-in the other specs make. Specs there cannot wait for networkidle, since the widget keeps polling Cloudflare. Decided with the owner on 2026-11-01.
date: "2026-11-01"
issue: 01M6BA31PDYJJRKF1C948JD86R
scope:
  - playwright.config.ts
---


