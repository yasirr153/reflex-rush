# REFLEX RUSH

A free, mobile-first browser arcade built with TypeScript and Vite. It includes five short challenges:

- **Quick Reflex** — react to the green signal across five rounds.
- **Colour Rush** — tap the requested colour before the timer expires.
- **Fake Out** — react to real GO signals and ignore fake ones.
- **Speed Survival** — hit 20 targets before three escape.
- **Memory Flash** — repeat an expanding sequence of colours.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production output is written to `dist/` and can be deployed to Vercel as a Vite project. No environment variables or backend are required for the current version.

## Data and privacy

Personal-best scores are stored in the browser's local storage. There is no account system, server leaderboard or analytics integration in this version. Sharing uses the browser's Web Share API when available, with clipboard fallback.

## QA

See [QA-REPORT.md](./QA-REPORT.md) for changes, verification completed and known limitations.
