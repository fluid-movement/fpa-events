- 2026-10-08T06:50:34Z edited by claude-code/opus-5.5: depends_on

- 2026-10-18T12:32:15Z edited by claude-code: depends_on

- 2026-10-22T08:22:57Z claude-code: Note 2026-10-22 from the security work: the requirement still says to run the import 'in the app container's Coolify terminal', but tools/migrate/README.md (01M5A7A6MS1NSH8EMQ2QRC9WNS) now builds a separate credential-free migrate image and says never to run it in the app container; the app image's .dockerignore also excludes tools/. Follow the README; the requirement wording should be updated with the owner.

- 2026-10-22T13:50:23Z edited by claude-code: depends_on
