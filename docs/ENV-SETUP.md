# Environment Setup

Guide for configuring environment variables and local development settings.

## Quick Start

For basic local development, **no environment variables are required**. Just run:

```bash
bun run dev
```

The local D1 database works automatically with Wrangler.

## When Do You Need .env?

You only need to create a `.env` file if you want to:

1. **Use Drizzle Studio with a remote database**
2. **Add third-party API keys** (Stripe, SendGrid, etc.)
3. **Configure authentication secrets**

## Setting Up .env

### 1. Copy the Example File

```bash
cp .env.example .env
```

### 2. Add Your Values

Edit `.env` with your actual values:

```env
# Optional: For Drizzle Studio with remote database
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token

# Add other secrets as needed
API_KEY=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Verify It's Gitignored

```bash
# Should confirm .env is gitignored
git check-ignore -v .env

# Should NOT show .env
git status
```

## Getting Cloudflare Credentials

Only needed if you want to use Drizzle Studio with a remote database.

### Get Account ID

```bash
bunx wrangler whoami
```

Look for the "Account ID" in the output.

### Get Database ID

```bash
bunx wrangler d1 list
```

Copy the ID of your database.

### Create API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Edit Cloudflare Workers** template
4. Or create custom token with:
   - **Account** → **D1** → **Edit** permissions
5. Copy the token (shown only once!)

## File Structure

```
fpa-events/
├── .env                    # 🔒 Your secrets (gitignored, NOT committed)
├── .env.example            # ✅ Template (committed)
├── wrangler.toml           # ✅ Public config (committed)
└── drizzle.config.ts       # ✅ Reads from .env (committed)
```

## Environment Variables Reference

### Cloudflare (Optional)

```env
# Your Cloudflare account ID
CLOUDFLARE_ACCOUNT_ID=abc123def456...

# Your D1 database ID
CLOUDFLARE_DATABASE_ID=20a892bb-9a93-4f92-ae34-86e78c3f3808

# API token with D1 edit permissions
CLOUDFLARE_D1_TOKEN=your-api-token-here
```

**Used by**: Drizzle Kit (for remote database operations)

### Third-Party APIs (As Needed)

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# SendGrid
SENDGRID_API_KEY=SG...

# Other services
YOUR_API_KEY=...
```

**Used by**: Your application code

### Authentication (If Using Better Auth)

```env
# Better Auth secret (generate a random string)
AUTH_SECRET=your-random-secret-here

# JWT secret
JWT_SECRET=your-jwt-secret-here
```

**Used by**: Better Auth library

## Production Configuration

### Don't Use .env in Production

Production secrets are configured via **Cloudflare Dashboard**, not `.env`:

1. Go to your Pages/Workers project
2. Navigate to **Settings** → **Environment variables**
3. Add secrets there
4. They're automatically available to your app

### D1 Binding

The D1 database binding is also configured in the dashboard:

1. Go to **Settings** → **Functions**
2. Add **D1 database binding**:
   - Variable name: `DB`
   - Select your production database
3. Save

No `.env` needed in production!

## Security

### ✅ DO

- Keep `.env` gitignored
- Use different values for dev and production
- Rotate secrets regularly
- Copy `.env.example` to `.env` for new projects

### ❌ DON'T

- Commit `.env` to git
- Share `.env` via email/chat
- Use production secrets in development
- Put secrets in `wrangler.toml`

## Verification

Before committing, always check:

```bash
# Verify .env is gitignored
git check-ignore -v .env
# Output: .gitignore:XX:.env	.env

# Verify it's not staged
git status
# Should NOT show .env

# Search for secrets in tracked files
git grep -i "api_key"
git grep -i "secret"
```

## Troubleshooting

### .env not loading

**Cause**: File is in wrong location or has wrong name.

**Solution**:
- Must be named `.env` exactly (not `.env.local` or `env`)
- Must be in project root (same level as `package.json`)
- Restart dev server after creating/editing

### Can't use Drizzle Studio with remote database

**Cause**: Missing or invalid Cloudflare credentials in `.env`.

**Solution**:
- Verify `CLOUDFLARE_ACCOUNT_ID` is correct
- Verify `CLOUDFLARE_DATABASE_ID` is correct
- Verify `CLOUDFLARE_D1_TOKEN` has D1 edit permissions
- Check token hasn't expired

### Accidentally committed .env

**Cause**: `.env` not properly gitignored.

**Solution**:
1. **Immediately rotate all exposed secrets**
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (coordinate with team)
4. Update `.env` with new secrets

See [SECURITY.md](./SECURITY.md) for details.

## Examples

### Minimal .env (Local Development)

For basic local development, you don't need any environment variables:

```env
# No variables needed! Just run: bun run dev
```

### Full .env (All Features)

If you need all optional features:

```env
# Cloudflare (for Drizzle Studio with remote DB)
CLOUDFLARE_ACCOUNT_ID=abc123...
CLOUDFLARE_DATABASE_ID=def456...
CLOUDFLARE_D1_TOKEN=xyz789...

# Authentication
AUTH_SECRET=random-secret-string-here
JWT_SECRET=another-random-secret

# Third-party APIs
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
```

## Summary

- **Basic local dev**: No `.env` needed
- **Drizzle Studio**: Add Cloudflare credentials to `.env`
- **Third-party APIs**: Add API keys to `.env`
- **Production**: Configure in Cloudflare Dashboard (not `.env`)
- **Always**: Keep `.env` gitignored and never commit it

For more details, see:
- [SETUP.md](./SETUP.md) - Complete setup guide
- [SECURITY.md](./SECURITY.md) - Security best practices
- [DATABASE.md](./DATABASE.md) - Database management