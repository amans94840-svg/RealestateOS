# AGENTS.md

## Cursor Cloud specific instructions

### Project layout

The application lives in `astral-estate-grid-RealestateOS/` (not the repo root). All npm commands must be run from that directory.

### Running the dev server

```
cd astral-estate-grid-RealestateOS
npm run dev -- --host 0.0.0.0
```

The server starts on **port 8080** (configured by the `@lovable.dev/vite-tanstack-config` package via `strictPort`/`port` settings). No `.env` file is required — all external services (Supabase auth, Stripe, Twilio) are stubbed with mock implementations and in-memory seed data.

### Lint / Format

```
npm run lint      # ESLint 9 + Prettier (expects cwd = astral-estate-grid-RealestateOS/)
npm run format    # Prettier auto-fix
```

Note: the codebase has pre-existing Prettier formatting violations. `npm run lint` will exit non-zero due to these; this is expected and not caused by new changes.

### Build

```
npm run build     # production build (Cloudflare Workers target)
npm run build:dev # development-mode build
```

### Key caveats

- **No database or Docker required.** All backend APIs are client-side stubs returning mock/seed data.
- **Supabase auth is optional.** If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars are empty or unset, the app falls back to localStorage-based mock auth. Registration via "Get Started" works without real credentials.
- **No automated test suite exists.** There are no unit/integration tests configured. Validation is done via manual testing (dev server + browser).
- **The `@lovable.dev/vite-tanstack-config` package bundles many Vite plugins** (TanStack Start, React, Tailwind CSS, tsconfig-paths, Cloudflare, etc.). Do not add these plugins manually to `vite.config.ts` or the app will break with duplicate-plugin errors.
