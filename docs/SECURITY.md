# Security Best Practices

Security guidelines for managing secrets, environment variables, and sensitive data in the FPA Events application.

## Overview

This project follows security best practices by:
- Keeping secrets out of git
- Using environment variables for local development
- Configuring production secrets via Cloudflare Dashboard
- Properly gitignoring sensitive files

## File Security

### ✅ Safe to Commit (Public)

- **`wrangler.toml`** - Configuration only (no secrets)
- **`.env.example`** - Template with placeholders
- **`drizzle.config.ts`** - Reads from environment variables
- **All source code** - Application logic
- **Migration files** - Database schema changes

### 🔒 Never Commit (Contains Secrets)

- **`.env`** - Local development secrets (gitignored)
- **`.wrangler/`** - Local database and state (gitignored)
- **`node_modules/`** - Dependencies (gitignored)

## Environment Variables

### Local Development (.env)

Create `.env` for local secrets (optional for basic development):

```env
# Only needed for Drizzle Studio with remote database
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token

# Add other secrets as needed
API_KEY=your-secret-key
```

**Note**: For local development with local D1 database, no environment variables are required!

### Production Secrets

Configure in Cloudflare Dashboard:
1. Go to **Workers & Pages** → Your project
2. Navigate to **Settings** → **Environment variables**
3. Add production secrets
4. Never expose these in code or git

## Common Secrets

### API Keys
```env
# Example: Third-party API keys
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...
```

### Database Credentials
```env
# For Drizzle Kit operations (optional)
CLOUDFLARE_ACCOUNT_ID=abc123...
CLOUDFLARE_DATABASE_ID=def456...
CLOUDFLARE_D1_TOKEN=xyz789...
```

### Authentication Secrets
```env
# Better Auth configuration
AUTH_SECRET=your-random-secret
JWT_SECRET=your-jwt-secret
```

## Database IDs Are NOT Secrets

**Important**: Database IDs in `wrangler.toml` are identifiers, not secrets.

```toml
# ✅ Safe to commit
[[ d1_databases ]]
binding = "DB"
database_name = "fpa-events-local"
database_id = "20a892bb-9a93-4f92-ae34-86e78c3f3808"
```

**Why?**
- They're just identifiers (like table names)
- Access requires authentication (API tokens)
- Cloudflare requires them for local development
- Standard practice in Cloudflare projects

## Pre-Commit Checklist

Before committing code, verify:

- [ ] No API keys in committed files
- [ ] No passwords or tokens in code
- [ ] `.env` is gitignored
- [ ] Only `.env.example` is committed
- [ ] `wrangler.toml` contains no secrets
- [ ] Run `git status` - `.env` should not appear

### Verification Commands

```bash
# Check if .env is gitignored
git check-ignore -v .env
# Should output: .gitignore:XX:.env	.env

# Verify .env is not staged
git status
# Should NOT show .env

# Search for potential secrets in git
git grep -i "api_key"
git grep -i "secret"
git grep -i "password"
```

## If You Accidentally Commit Secrets

### Immediate Actions

1. **Rotate/regenerate ALL exposed secrets immediately**
   - Generate new API keys
   - Create new tokens
   - Update passwords

2. **Remove from git history**
   ```bash
   # Using git filter-branch
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Or use BFG Repo-Cleaner (recommended)
   # Download from: https://rtyley.github.io/bfg-repo-cleaner/
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force push** (⚠️ Coordinate with team!)
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

4. **Update local secrets**
   - Edit `.env` with new values
   - Update production secrets in Cloudflare Dashboard
   - Notify team members

## Best Practices

### Development

✅ **DO:**
- Use `.env` for all local secrets
- Copy `.env.example` to `.env` for new projects
- Keep `.env` in `.gitignore`
- Use strong, unique secrets for production
- Rotate secrets regularly

❌ **DON'T:**
- Commit `.env` to git
- Put secrets in `wrangler.toml`
- Share secrets via chat/email
- Use production secrets in development
- Reuse secrets across projects

### Production

✅ **DO:**
- Configure secrets via Cloudflare Dashboard
- Use environment-specific secrets
- Monitor secret access logs
- Implement least-privilege access
- Document required secrets in `.env.example`

❌ **DON'T:**
- Hardcode secrets in application code
- Log sensitive information
- Expose secrets in error messages
- Use weak or default secrets
- Share production access unnecessarily

### Secret Management

```typescript
// ✅ Good: Use environment variables
const apiKey = process.env.API_KEY;

// ❌ Bad: Hardcoded secret
const apiKey = "sk_live_abc123...";

// ✅ Good: Check for required secrets
if (!process.env.API_KEY) {
  throw new Error('API_KEY is required');
}

// ✅ Good: Don't log secrets
console.log('API request sent'); // OK

// ❌ Bad: Logging secrets
console.log('API key:', apiKey); // Never do this!
```

## Setup for New Developers

When setting up the project:

```bash
# 1. Clone repository
git clone <repo-url>
cd fpa-events

# 2. Install dependencies
bun install

# 3. (Optional) Set up local secrets
cp .env.example .env
# Edit .env if needed for Drizzle Studio or API integrations

# 4. Verify security
git check-ignore -v .env  # Should confirm it's gitignored
git status                # Should NOT show .env

# 5. Start development
bun run dev
```

## API Token Security

### Creating Cloudflare API Tokens

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Edit Cloudflare Workers** template
4. Or create custom token with minimal permissions:
   - Account → D1 → Edit (only if needed)
5. Set token expiration
6. Copy token immediately (shown only once)
7. Store in `.env` (never commit)

### Token Best Practices

- Create separate tokens for different purposes
- Use least-privilege permissions
- Set expiration dates
- Rotate tokens regularly
- Revoke tokens when no longer needed
- Never share tokens

## Monitoring and Auditing

### Regular Security Checks

```bash
# Check for secrets in git history
git log -S "api_key" --all
git log -S "password" --all

# Check current files
grep -r "api_key" src/ --exclude-dir=node_modules
grep -r "password" src/ --exclude-dir=node_modules

# Audit .gitignore
cat .gitignore | grep -E "\.env|\.wrangler"
```

### Security Audit Checklist

- [ ] All secrets in `.env` (gitignored)
- [ ] `.env.example` has no real secrets
- [ ] `wrangler.toml` has no sensitive data
- [ ] Production secrets in Cloudflare Dashboard
- [ ] API tokens have appropriate permissions
- [ ] No secrets in error messages or logs
- [ ] Dependencies are up to date
- [ ] Access logs are monitored

## Common Mistakes

### Mistake 1: Committing .env

**Problem**: `.env` file accidentally committed to git.

**Prevention**:
- Ensure `.env` is in `.gitignore`
- Use `git status` before committing
- Set up pre-commit hooks

**Solution**:
- Rotate all exposed secrets immediately
- Remove from git history
- Force push (with team coordination)

### Mistake 2: Secrets in wrangler.toml

**Problem**: API keys stored in `wrangler.toml`.

**Prevention**:
- Only put public configuration in `wrangler.toml`
- Use `.env` for secrets
- Review file before committing

**Solution**:
- Move secrets to `.env`
- Remove from `wrangler.toml`
- Rotate exposed secrets

### Mistake 3: Logging Secrets

**Problem**: Secrets logged to console or error messages.

**Prevention**:
- Never log environment variables directly
- Sanitize error messages
- Use structured logging with secret redaction

**Solution**:
- Remove logging statements
- Implement secret sanitization
- Review production logs

## Production Deployment Security

### Cloudflare Dashboard Configuration

1. **D1 Database Binding**
   - Settings → Functions → D1 database bindings
   - Variable name: `DB`
   - Select production database

2. **Environment Variables**
   - Settings → Environment variables
   - Add secrets (never commit these)
   - Use different values than development

3. **Access Control**
   - Limit dashboard access
   - Use role-based permissions
   - Enable 2FA for accounts

### Deployment Checklist

- [ ] Production secrets configured in dashboard
- [ ] No secrets in deployed code
- [ ] Database uses production binding
- [ ] API tokens have minimal permissions
- [ ] Error messages don't expose sensitive data
- [ ] Logs don't contain secrets
- [ ] HTTPS enforced
- [ ] CORS configured properly

## Resources

- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Secrets Management Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [Git Filter-Branch](https://git-scm.com/docs/git-filter-branch)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

## Summary

- **Local secrets** → `.env` (gitignored)
- **Production secrets** → Cloudflare Dashboard
- **Public config** → `wrangler.toml` (committed)
- **Database IDs** → Safe to commit (not secrets)
- **Always verify** → `.env` is gitignored before committing
- **If exposed** → Rotate immediately, remove from history