# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ CODE STYLE - READ THIS FIRST ⚠️

**These rules are NON-NEGOTIABLE. Violating them wastes the user's time.**

1. **NO VERBOSE COMMENTS** - Never write `// Handle the click` or `// Update state`. Code should be self-explanatory through clear naming. Only comment when explaining WHY something non-obvious is done, never WHAT.

2. **DRY** - If you write similar code twice, extract it. No copy-paste.

3. **KISS** - The simplest solution that works is the best solution. Don't add layers, abstractions, or "flexibility" that isn't needed right now.

4. **ONLY WHAT'S REQUESTED** - Never add features, helpers, or "improvements" the user didn't ask for. If you think something extra would help, ASK first.

5. **PRESERVE EXISTING** - Don't remove or change functionality unless explicitly asked.

6. **NO `eslint-disable`** - Fix the actual problem, don't silence the warning.

7. **NO ASSUMPTIONS AS FACTS** - Never present assumptions or guesses as facts. If you don't know how something works (API behavior, library limitations, etc.), say so and investigate first.

**Before writing ANY code, ask yourself:**
- Am I about to add a comment that states the obvious? → Don't.
- Am I about to add something the user didn't ask for? → Ask first.
- Is there a simpler way to do this? → Use it.
- Am I assuming something I haven't verified? → Investigate or ask first.

---

## Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Start development (Electron + Vite)
npm run build            # Build for production
npm run typecheck        # TypeScript type check
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run test             # Run tests
```

Before committing: `npm run typecheck && npm run lint`

**File size limit**: Keep files under 500 lines; split when approaching this limit.

## Architecture Overview

EVE 3D Universe is a full-screen 3D map explorer for EVE Online built with Electron + React + Babylon.js.

### Process Architecture

**Electron Main Process** (`electron/`)
- `main.ts` - Window management, fullscreen by default
- `preload.ts` - Context bridge exposing `window.electronAPI`
- `services/ref-api.ts` - edencom.net API client for universe data

**React Renderer Process** (`src/`)
- `App.tsx` - Babylon.js 3D scene setup and rendering
- `types/` - TypeScript type definitions

### Data Flow

1. **Universe Data**: `GET /api/v1/reference/systems-3d` → regions, constellations, systems with 3D positions
2. **Stargates**: `GET /api/v1/reference/stargates` → system connections (future)

### Ref API (edencom.net)

**Base URL**: `https://edencom.net/api/v1`

**Authentication**: `X-App-Key` header with value from `.env` `EVE3D_API_KEY`

**Key Endpoints**:
- `/reference/systems-3d` - All universe data in single payload:
  ```json
  {
    "regions": { "<id>": { "id", "name", "position": {x,y,z} } },
    "constellations": { "<id>": { "id", "name", "regionId", "position": {x,y,z} } },
    "systems": { "<id>": { "id", "name", "constellationId", "regionId", "securityStatus", "position": {x,y,z}, "star": {...} } }
  }
  ```
- `/reference/stargates` - Stargate connections (future)

### Key Types

- `SolarSystem` - System with position, security, star data
- `Region` / `Constellation` - Hierarchy containers with positions
- `Star` - Star properties (spectralClass, temperature, luminosity, radius)

## Documentation

**Session-specific in `.claude/`** (gitignored):
- `NEXT_SESSION.md` - Current state and next steps

### Slash Commands

**Session Management**
- `/start` - Read NEXT_SESSION.md, git status, provide briefing
- `/handoff` - End-of-session cleanup: update NEXT_SESSION.md

**Git Workflow**
- `/commit` - Create conventional commit, push to remote

## Git Workflow

- `main` - Stable releases
- `develop` - Active development
- Commit convention: Conventional Commits (feat, fix, refactor, docs)
