## D1: Log route ids, not URLs
date: 2026-10-07

The calendar feed (/api/calendar/<token>/feed.ics) and invite links (/invite/<token>) put credentials in the path. Logs outlive deploys once error tracking lands, so the logged location is the route id, with the method; the raw path is only used when no route matched (a 404 never reaches the unknown branch anyway).
