# findings

## Entries

* [Codex runs cannot run the Playwright suite on this machine](/findings/01M57VXJCMW7ZH0QYS3NXC7S6B.md) - Codex exec in a workspace-write sandbox on macOS cannot launch Chromium (Mach port registration is denied), so integration tests never run inside a Codex handoff. Codex implementers run check, unit tests, lint and build; a Claude reviewer (or the orchestrator) runs the Playwright suite afterwards. Only one agent can use the shared test database and port 5174 at a time, so Codex prompts say not to touch them and integration runs are serialised. Observed 2026-10-18 with the better-auth upgrade.
