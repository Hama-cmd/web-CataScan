# OptiScan AI

## Overview

OptiScan AI is a web-based eye health screening application that uses AI-powered image analysis to detect potential eye conditions. Users can capture or upload eye images, which are analyzed by OpenAI's vision model (GPT) to provide preliminary screening results including condition identification, confidence level, recommendations, and disclaimers. The app is designed as a mobile-first health tool with a clean, professional medical UI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Structure
The project follows a monorepo pattern with three main directories:
- **`client/`** — React single-page application (frontend)
- **`server/`** — Express.js API server (backend)
- **`shared/`** — Shared types, schemas, and route definitions used by both client and server

### Frontend Architecture
- **Framework:** React with TypeScript, bundled by Vite
- **Routing:** Wouter (lightweight client-side router)
- **State Management:** TanStack React Query for server state (caching, mutations)
- **UI Components:** shadcn/ui component library built on Radix UI primitives with Tailwind CSS
- **Styling:** Tailwind CSS with CSS variables for theming (medical blue/teal color palette), using `Plus Jakarta Sans` (display) and `Inter` (body) fonts
- **Key Pages:** Landing (unauthenticated), Dashboard, Screening (camera/upload), Result, History, Information/Education
- **Image Capture:** react-webcam for camera capture, HTML file input for uploads; images handled as base64 strings
- **Path aliases:** `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Framework:** Express.js running on Node with TypeScript (via tsx)
- **API Pattern:** RESTful JSON API under `/api/` prefix
- **Route Definitions:** Shared route manifest in `shared/routes.ts` with Zod schemas for input validation and response types — keeps client and server in sync
- **AI Integration:** OpenAI API (via Replit AI Integrations) for eye image analysis using vision-capable model; system prompt instructs it to return structured JSON with condition, confidence, description, recommendation, and disclaimer
- **Build:** Vite for client build, esbuild for server bundle (outputs to `dist/`); production serves static files from `dist/public`
- **Dev Mode:** Vite dev server middleware with HMR integrated into Express

### Database
- **Database:** PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM:** Drizzle ORM with `drizzle-zod` for schema-to-Zod integration
- **Schema Location:** `shared/schema.ts` and `shared/models/` directory
- **Key Tables:**
  - `users` — User profiles (id, email, name, profile image, timestamps)
  - `sessions` — Server-side session storage for authentication (required by Replit Auth)
  - `screenings` — Eye screening records (id, userId FK, imageUrl, analysis JSONB, createdAt)
  - `conversations` / `messages` — Chat storage tables (from Replit integrations, may or may not be actively used)
- **Migrations:** Use `npm run db:push` (drizzle-kit push) to sync schema to database. Migration files output to `./migrations/`

### Authentication
- **Method:** Replit Auth via OpenID Connect (OIDC)
- **Session Store:** PostgreSQL-backed sessions using `connect-pg-simple`
- **Implementation:** Located in `server/replit_integrations/auth/` — includes Passport.js strategy, session middleware, and auth routes
- **Client Hook:** `useAuth()` hook fetches user from `/api/auth/user` and manages auth state
- **Protected Routes:** Server uses `isAuthenticated` middleware; client redirects unauthenticated users to Landing page
- **Required Environment Variables:** `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`, `DATABASE_URL`

### Replit Integrations
Several pre-built integration modules exist in `server/replit_integrations/` and `client/replit_integrations/`:
- **Auth** — Replit OIDC authentication (actively used)
- **Chat** — Conversation/message CRUD with OpenAI streaming
- **Audio** — Voice recording, playback, and speech-to-text utilities
- **Image** — Image generation via OpenAI's image model
- **Batch** — Batch processing with rate limiting and retries

These are scaffolded modules — not all are actively wired into routes. The core app uses auth and the OpenAI chat completions API for image analysis.

## External Dependencies

### Required Services
- **PostgreSQL Database** — Provisioned via Replit; connection string in `DATABASE_URL`
- **OpenAI API** — Accessed through Replit AI Integrations; requires `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables
- **Replit Auth (OIDC)** — Requires `REPL_ID`, `ISSUER_URL`, and `SESSION_SECRET` environment variables

### Key NPM Packages
- **Server:** express, drizzle-orm, pg, openai, passport, express-session, connect-pg-simple, zod
- **Client:** react, wouter, @tanstack/react-query, react-webcam, shadcn/ui (Radix primitives), tailwindcss, date-fns, lucide-react, framer-motion
- **Shared:** zod, drizzle-zod

### Scripts
- `npm run dev` — Start development server with Vite HMR
- `npm run build` — Build client (Vite) and server (esbuild) to `dist/`
- `npm start` — Run production build
- `npm run db:push` — Push Drizzle schema to PostgreSQL
- `npm run check` — TypeScript type checking