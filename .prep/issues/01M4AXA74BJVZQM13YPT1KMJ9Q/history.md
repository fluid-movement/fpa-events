- 2026-10-07T11:50:39Z edited by claude-code/opus-5.5: parent

- 2026-10-19T14:35:30Z edited by claude-code: requirement

- 2026-10-19T14:39:42Z claude-code: Implemented, ready for check: added heroLayout (banner at ratio 1.4 or more, split below, unknown without a valid size) with unit tests, and the event hero now renders banners above the header and split or unknown pictures uncropped beside or below it.

- 2026-10-19T14:41:21Z claude-code: Check failed: split layout on desktop (1280px, 900x1350 picture) renders the picture at only 119x178px, floating mid-row at x=954 instead of flush right (md:w-auto md:max-w-[45%] md:max-h-96 inside grid-cols-[minmax(0,1fr)_auto] collapses: percentage max-width on an auto track resolves cyclically, and max-h-96 with h-auto shrinks width via the ratio). Needs a real size, e.g. fixed column width or height-driven sizing (md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] with w-full), then recheck. Banner (desktop 924x404, mobile 342x150), split mobile (after RSVP, 342 wide, bg-muted, object-contain) and unknown OK. check, vitest (344 pass), prettier, eslint pass.

- 2026-10-19T14:42:22Z claude-code: Implemented, ready for check: fixed the desktop split layout by giving the picture column a fixed minmax(0,20rem) track, with the picture w-full, justify-self-end and a md:max-h-[32rem] cap with object-contain, and removed the percentage max-width; mobile, banner and unknown branches unchanged.
