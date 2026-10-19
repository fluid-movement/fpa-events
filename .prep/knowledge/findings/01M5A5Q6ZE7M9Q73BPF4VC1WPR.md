---
type: finding
title: adapter-node caps every request body at 512K unless BODY_SIZE_LIMIT is set
description: adapter-node 6 reads BODY_SIZE_LIMIT (default 512K) and Kit's getRequest then fails request.formData() with a 413 SvelteKitError once a body passes it. Nothing in the repo sets the variable, so the upload endpoint's 10 MB MAX_SIZE cannot be reached in production unless Coolify sets it. Any per-endpoint size limit above 512K needs the env var raised to match. Checked 2026-10-19 in a scratch harness; filed as 01M5A5KN8H0S977JQ72P7C1AAH.
date: "2026-10-19"
issue: 01M5A34YEEF5NVYZ4FXY7C25A9
---


