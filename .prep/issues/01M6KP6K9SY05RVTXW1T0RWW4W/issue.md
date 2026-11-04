---
title: Crew body text with declared language and translation
kind: code
parent: 01M5EVT0B4G7G7V5AA15ZC5BWP
depends_on:
  - 01M6KP6JPAT43YSZ3K8MTVJD9K
---

A crew has one body text and one declared language (BCP 47), edited by admins. Render the body in an element with lang=<code>; keep the rest of the page in the app language and mark user-generated names translate=no. Where the browser has the Translator API (feature-detected, on-device), show a 'Translate' button translating from the declared language to navigator.language, with 'Show original'. Elsewhere rely on the browser's own page-translate, which the lang attribute informs but does not guarantee. Rich text goes through sanitizeRichText on the way in. Test the button logic (feature detection, same-language hides it, failure falls back to the original).

## Open questions
