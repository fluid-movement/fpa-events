---
type: decision
title: Token-bearing routes emit no og:url
description: Link-preview tags use the request origin plus path for og:url, but routes whose path carries a credential (currently /invite) omit it, kept in TOKEN_ROUTE_PREFIXES in src/lib/utils/meta.ts, so a token never lands in a canonical-URL tag that crawlers and search engines read. The query string is never included, which already covers reset-password. Add any new token-in-path route to that list. Decided by the agent on 2026-10-18 after review.
date: "2026-10-18"
issue: 01M4D4F1Z695FE1SP8ZV04W9VH
---


