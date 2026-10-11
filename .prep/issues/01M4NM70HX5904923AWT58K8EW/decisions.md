## D1: Render Markdown on the server with marked + sanitize-html
date: 2026-10-11

`bio` is Markdown. No Markdown parser is in the tree yet; tiptap only parses HTML. Add `marked`
(small, no deps) and run it inside the remote query, then sanitize with `sanitize-html` (already a
dependency) using the rich-text whitelist plus `a[href]` limited to http(s)/mailto.
Alternatives: render as plain text with line breaks (loses links and emphasis written for the old
site); a hand-rolled subset parser (more code to own, more ways to be wrong).

## D2: Validate profile fields by shape and drop the rest
date: 2026-10-11

The upstream contract allows new keys at any time and most players have no profile at all. A pure
`toPlayerBio` accepts only the three documented shapes, drops non-http(s) links, empty values and
anything malformed, and returns null when nothing remains, so the panel only ever checks one
`if`. Unknown string/name keys still render, labelled from their camelCase key.
