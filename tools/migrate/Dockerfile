FROM node:24-bookworm-slim
WORKDIR /migration

# No credential ARGs, ENV, secret mounts or .env/.npmrc files at build time.
COPY package.json package-lock.json verify-preparation.mjs ./
RUN node verify-preparation.mjs \
    && npm ci --ignore-scripts --no-audit --no-fund \
    && npm rebuild --foreground-scripts esbuild

COPY src/ ./src/
COPY data/ ./data/
# Exercise actual TypeScript loading and esbuild's native binary, without
# importing the executable entry points or opening a DB/bucket connection.
RUN node --import tsx --input-type=module -e "import './src/emails.ts'; import { transformSync } from 'esbuild'; transformSync('const ok: boolean = true', { loader: 'ts' }); console.log('Credential-free tsx/esbuild preparation passed')"

USER node
ENTRYPOINT ["node", "--import", "tsx"]
CMD ["src/migrate.ts", "--dry-run"]
