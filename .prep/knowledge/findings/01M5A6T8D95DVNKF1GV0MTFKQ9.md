---
type: finding
title: Authentication recovery does not revoke existing sessions
description: Source review and an offline Better Auth 1.7.7 handler harness with synthetic adapter spies confirmed that reset-password calls updatePassword without deleteUserSessions, while the settings change-password call only updates the credential. auth.ts omits revokeSessionsOnPasswordReset and the page omits revokeOtherSessions. Sessions default to seven days with daily renewal. High-severity child 01M5A6NTZZ25Z46EJQ6F23G7B1 requests recovery revocation with real old-cookie regression tests; recommend fix before cutover. No live identity or database was touched.
date: "2026-10-19"
issue: 01M5A34XDWPGKSKMTVA213DHX7
---


