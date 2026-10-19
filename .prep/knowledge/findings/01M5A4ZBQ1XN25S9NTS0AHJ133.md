---
type: finding
title: Migrated users are all email-verified; a squatted legacy address is recoverable by its owner
description: 'migrate.ts marks every legacy user email_verified=TRUE because Laravel never verified. So an address someone registered on the old app without owning it becomes a verified account here. The real mailbox owner cannot sign up (the address is taken), but can take the account over through password reset, which mails the address. Accepted as is: the alternative locks every legacy user out at cutover.'
date: "2026-10-19"
issue: 01M5A45SJ0DTHEX1G0R86JKXEJ
---


