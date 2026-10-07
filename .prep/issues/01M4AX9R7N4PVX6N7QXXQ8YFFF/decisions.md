## D1: Validate on the way in, guard on the way out
date: 2026-10-07

Rejecting foreign URLs stops new damage; refusing to delete a URL another event still uses also protects against any bad data already stored. Legacy pictures/ URLs stay valid only as an event's existing value, since a fresh pick can only come from the upload endpoint (events/).
