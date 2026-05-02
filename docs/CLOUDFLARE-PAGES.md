# Cloudflare Pages

This repo is configured for Cloudflare Pages instead of GitHub Pages.

## Dashboard setup

- Connect the private GitHub repository to Cloudflare Pages.
- Use the repository root as the root directory.
- Set the build command to `pnpm install --frozen-lockfile && pnpm build`.
- Set the build output directory to `web/dist`.

## Local deploy commands

- `pnpm cf:deploy` builds the app and deploys a production Pages release using the `freelanguageapp` project configured in `wrangler.jsonc`.
- `pnpm cf:preview` builds the app and deploys a preview release to the `preview` branch alias.

## Notes

- The repository can stay private on Cloudflare Pages.
- `wrangler.jsonc` becomes the source of truth for Pages configuration when you deploy with Wrangler.
