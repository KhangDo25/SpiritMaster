# LINH THÚ HỘI - Architecture Overview

## Foundation Phase 1
This project uses a Full-Stack structure based on Vite, React, Express, and TypeScript. 
*Note: As this is deployed in a Node.js-based containerized environment, the framework stack is adapted to Express/React instead of Spring Boot/Next.js to ensure native performance, robust compilation, and compatibility with the deployment pipeline.*

### Frontend
- **Framework**: React 18 + Vite + TypeScript.
- **Styling**: Tailwind CSS with custom game theme variables (Dark Fantasy aesthetic).
- **Architecture**:
  - `src/components/ui`: Reusable, accessible UI primitives (e.g., Button, Card).
  - `src/utils`: Shared utilities (e.g., `cn` for classes, `health` for API).

### Backend
- **Framework**: Express + Node.js (via `server.ts`).
- **Core Layers**:
  - Unified API Responses (`server/utils/response.ts`).
  - Global Exception Handling (`server/middlewares/errorHandler.ts`).
  - Health checks & system monitoring endpoints.
- **Database/Redis**: Configuration prepared in `.env.example`.

### Development & Execution
1. Copy `.env.example` to `.env` and fill the variables.
2. Ensure you have installed packages: `npm install`
3. Run dev server: `npm run dev`
4. Build for production: `npm run build`
5. Start production server: `npm start`
