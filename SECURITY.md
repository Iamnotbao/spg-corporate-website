# Security

Mandora is currently a portfolio-stage project. Security reports should be sent privately to the repository owner rather than posted with credentials or private data in a public issue.

## Never commit

- `.env` or `.env.local`
- MongoDB credentials or connection strings containing credentials
- JWT secrets
- admin passwords
- Cloudinary API secrets
- OpenAI/API keys
- private keys or certificates
- production database exports
- applicant/CV/chat data from the legacy product

Safe placeholders belong only in `.env.example` files.

## If a secret is exposed

1. Treat it as compromised even if the commit/file is later deleted.
2. Rotate or revoke the credential at the provider first.
3. Update the deployment environment with the replacement value.
4. Confirm the old credential no longer works.
5. Only then decide whether Git-history cleanup is needed.

Do not rely on deleting the current file or creating a new commit to invalidate a leaked secret.

## Repository history warning

This repository contains history from a product that existed before Mandora. Current-tree cleanup does not prove that historical commits are free of credentials, proprietary assets, personal data, or legacy deployment references.

Before treating the repository history as portfolio-ready:

- review reachable history for old environment/config files and hard-coded credentials;
- verify MongoDB, Cloudinary, admin/JWT and third-party credentials have been rotated where historical exposure is possible;
- verify rights to any retained historical images/assets;
- avoid publishing CV/application/chat exports or screenshots containing personal data;
- prefer a clean Mandora repository from the reviewed source tree if the old history cannot be confidently cleared for publication.

## Automated check

Run:

```bash
node scripts/repo-security-check.mjs
```

The check intentionally covers common accidental secret patterns and forbidden tracked artifacts. It is a guardrail, not a complete secret-history audit.

## Supported dependency/runtime baseline

CI uses Node.js 22. Keep frontend/backend dependencies locked through their committed `package-lock.json` files and use `npm ci` for reproducible checks.

## Deployment notes

Production secrets must stay in provider environment settings. Frontend `VITE_*` values are public because they are compiled into the browser bundle; never place a private secret in a `VITE_*` variable.
