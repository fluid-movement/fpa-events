---
type: finding
title: Legacy HTML is safe only because of sanitize-on-read
description: 'tools/migrate stores legacy event and schedule descriptions raw. Every HTML render sanitizes on read (events/[id]/+page.server.ts, event-details.remote.ts, admin/schedule/+page.server.ts), and RichContent is the only {@html}. Any new place that renders a description must call sanitizeRichText or stripHtml, or legacy markup goes straight to the page. Sanitizing in the import too would be defense in depth, but it is not what keeps pages safe today. The allow-list drops every attribute, so legacy <a href> links in descriptions show as plain text: content loss, not a hole. Check the dry run''s output for how many descriptions have links.'
date: "2026-10-19"
issue: 01M5A45SJ0DTHEX1G0R86JKXEJ
---


