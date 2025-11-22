# Changelog

All notable changes to the database seeding scripts will be documented in this file.

## [2.0.0] - 2024-01-XX - Clean Architecture Rewrite

### 🎉 Major Improvements

**Completely rewrote the seeding architecture to follow Drizzle ORM best practices.**

### Changed

- **Simplified database connection**: Now uses standard `better-sqlite3` with `./local.db`
- **Removed all hacks**: No more path finding, no `.wrangler` directory searching
- **Follows Drizzle documentation**: Uses the exact pattern from official docs
- **Clean separation**: Local development vs production environments

### Removed

- ❌ Complex path resolution logic
- ❌ File system searching for Wrangler databases
- ❌ Hash-based directory finding
- ❌ Custom ID generation (using Drizzle's defaults)
- ❌ Unnecessary imports (`fs`, `path`, `crypto` hashing)

### Added

- ✅ Simple `./local.db` file for local development
- ✅ Standard Drizzle ORM connection pattern
- ✅ Clean architecture documentation
- ✅ Better separation of concerns
- ✅ `.gitignore` entries for local database files

### Technical Details

**Before (Hacky):**
```typescript
// ❌ Bad: Complex path finding
function getLocalDbPath(): string {
  const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
  const files = readdirSync(d1Dir);
  const dbFile = files.find((f) => f.endsWith('.sqlite'));
  return join(d1Dir, dbFile);
}
const sqlite = new Database(getLocalDbPath());
```

**After (Clean):**
```typescript
// ✅ Good: Standard Drizzle pattern
const sqlite = new Database('./local.db');
const db = drizzle(sqlite, { schema });
```

### Migration Guide

If you have existing local data:

```bash
# Old approach used Wrangler's internal DB
# New approach uses local.db

# 1. Delete old database (if you want to start fresh)
rm local.db

# 2. Push schema
bun run db:push

# 3. Seed new database
bun run db:seed
```

---

## [1.0.0] - 2024-01-XX - Initial Release

### Added

- Initial seeding script using drizzle-seed
- Support for seeding all tables:
  - Users (100 records)
  - Events (50 records)
  - Schedules (2-5 per event)
  - Event Magic Links (1-2 per event)
  - Event-User relationships (300 records)
- Weighted random distributions
- Fixed seed value (42) for reproducibility
- Documentation:
  - README.md
  - QUICK-START.md
  - EXAMPLES.md
  - CHANGELOG.md
- Package.json script: `bun run db:seed`

### Features

- Realistic test data generation
- Customizable seed configuration
- Reproducible random data
- Comprehensive documentation

---

## Philosophy

This project follows these principles:

1. **Use tools as intended**: Drizzle ORM has clear patterns - follow them
2. **Keep it simple**: A simple file path beats complex discovery logic
3. **Separate concerns**: Local development ≠ Production
4. **No magic**: Explicit is better than clever
5. **Standard practices**: If it's in the official docs, that's the way

---

## Learn More

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Why we chose this approach
- [README.md](./README.md) - Full usage documentation
- [QUICK-START.md](./QUICK-START.md) - Get started in 3 steps
- [Drizzle ORM Docs](https://orm.drizzle.team) - Official documentation