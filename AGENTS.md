# Repository Guidelines

## Project Structure & Module Organization
The repo couples a React 19 + Vite client with an Express proxy that shields the Gemini key. UI flows sit in `components/`, shared config in `constants/`, `services/`, and `contexts/`, while `types.ts` and `src/config.ts` hold global contracts. `server/server.ts` is the runtime entry; keep proxy helpers alongside it. `scripts/` stores operational utilities, `supabase/` covers backend assets, `docs/` tracks product notes, and the Vitest harness resides in `tests/`.

## Build, Test, and Development Commands
- `npm install` — install dependencies for Node 18+.
- `npm run dev` — start Vite (3000) and the proxy (8787) together.
- `npm run dev:web` / `npm run dev:server` — run either side when debugging a single surface.
- `npm run build` then `npm run preview` — create and inspect the production bundle.
- `npm test` — sources `scripts/ensure-swisseph.sh` and runs Vitest from `tests/`.

## Coding Style & Naming Conventions
Use strict TypeScript (see `tsconfig.json`) with ES2022 modules, `react-jsx`, and the `@/` alias for absolute imports. Default to 2-space indentation, prefer pure functions, and keep side effects inside hooks, context providers, or `services/`. Components stay PascalCase (`AgentSelectionView.tsx`), hooks/utilities camelCase, and server handlers verb-first (`handleGeminiProxy`). Reuse Tailwind utilities already present in `styles.css` and keep environment literals inside `constants/`.

## Testing Guidelines
Vitest drives regression coverage. Specs use the `*.spec.ts` suffix (`tests/security-flow.spec.ts`) and should stub proxy hops to exercise every engine fallback (Bazi → Gemini → placeholder). New features need both success and failure assertions, and UI shifts should include refreshed screenshots. Always run `npm test` locally and note the command output when the suite fixes prior failures.

## Commit & Pull Request Guidelines
History follows Conventional Commits (`feat: security hardening and automated testing infrastructure`), so keep using `type: short summary` with scoped commits. PRs should describe the user outcome, list the commands you ran, link an issue, attach UI captures when visuals shift, and request reviewers who own the affected modules.

## Security & Configuration Tips
Secrets stay in `.env`; only the proxy should read `GEMINI_API_KEY`, so never log or bundle it. The Swiss Ephemeris helper writes to `/usr/local/share/swisseph` or `$HOME/.local/share/swisseph`—confirm permissions before running tests locally or in CI. Rotate Supabase keys via the files under `supabase/` instead of hard-coding values.
