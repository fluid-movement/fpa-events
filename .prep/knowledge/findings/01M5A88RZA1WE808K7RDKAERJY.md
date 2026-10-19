---
type: finding
title: 'Delegating audits to Codex: what failed'
description: Observed 2026-10-19 running the security audits with codex exec -m gpt-6-astra -c model_reasoning_effort=high -s workspace-write -c sandbox_workspace_write.network_access=true. (1) The sandbox cannot write .git/index.lock, so prep records are written but not staged; the orchestrator stages and commits them. (2) Coolify MCP calls are refused under approval policy 'never', and Codex has no GlitchTip MCP configured, so audits needing either should run on a Claude subagent. (3) The final message (-o) was not a usable report and the run did not log completion; read the filed issues with prep instead of trusting the summary. (4) Lock-in issues were filed without acceptance criteria when the run was cut off. (5) Both runs hit the OpenAI usage limit mid-audit; a second parallel codex exec launch was once refused by the Claude Code auto-mode classifier and had to be re-requested by the user. (6) A Codex run wrote a decision record on its own; prompts should say decisions are for the user.
date: "2026-10-19"
---


