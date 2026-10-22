- 2026-10-22T07:38:22Z claude-code: Implemented, ready for check: create/update store sanitizeRichText(description); read-side sanitizing kept.

- 2026-10-22T07:40:56Z claude-code: Check passed: create and update both call sanitizeRichText; render-side sanitize in events/[id] and admin still present; schedule already sanitized. npm run check and vp test run green. Advisory: tools/migrate stores legacy descriptions raw (render-side covers it).
