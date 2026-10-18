---
type: decision
title: Picture release never blocks account deletion
description: 'deleteAccount releases the pictures of the deleted events through releaseEventPictures in src/lib/server/eventForm.ts, after the event rows are deleted and before the verification and user deletes. The function is best-effort and cannot throw to its caller: each event is guarded separately, so an R2 failure or a failing ''picture used elsewhere'' query never leaves an account half-deleted, and a leftover object is cheaper than a failed erasure. Pictures shared with another user''s event stay. Chosen by the agent and confirmed by review on 2026-10-18. Gap: no test fails if the call is removed from the handler, since R2 keys are blank in tests.'
date: "2026-10-18"
issue: 01M4D4F1RXWJHC927FEKJ72PE6
---


