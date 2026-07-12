# Preproute Test Management System

A production-quality, high-fidelity administration portal for creating, editing, previewing, and publishing student assessments. This application is built as a React + TypeScript SPA utilizing modern engineering best practices, type-safety, and responsive layout structures.

---

## 🚀 Tech Stack & Design Choices

- **Runtime & Bundling**: React 18/19, TypeScript, and Vite.
- **Styling**: Tailwind CSS v4. Integrated natively inside Vite for extremely fast builds and custom variables.
- **Routing**: React Router v7. Includes custom `ProtectedRoute` and `PublicRoute` route-guard components for robust page shielding.
- **State Management**: Zustand. Used for lightweight, non-boilerplate auth state and session storage syncing.
- **Data Fetching**: TanStack Query (React Query) v5. Implements server-caching, auto-retry on network errors, and optimistic caches.
- **Forms & Validation**: React Hook Form combined with Zod validation. Protects fields with strict validations (e.g. valid scoring limits, required fields) and disables submissions during requests.
- **UI Details**: Lucide React for consistent vector symbols, React Hot Toast for global alerts, and custom accessible modal overlays utilizing React Portals.

---

## 📁 Project Structure

Following a clean, scalable architectural design:

```
src/
├── api/          # Axios client instance, token interceptors, and error handlers
├── assets/       # Global CSS, styling configurations, and static graphics
├── components/   # Reusable UI widgets (MultiSelect, Modal, ErrorBoundary)
├── constants/    # Fixed configs (routes, limits, system labels)
├── hooks/        # Common abstractions (queries, page transitions)
├── layouts/      # App structures (DashboardLayout for sidebar and header)
├── pages/        # Views (Login, Dashboard, CreateEditTest, QuestionManagement, PreviewPublish, NotFound)
├── routes/       # Route bindings and authorization guard overlays
├── schemas/      # Zod validation validation schemas
├── services/     # API endpoints declarations (auth, subjects, tests, questions)
├── store/        # Zustand global state declarations
├── types/        # TypeScript interfaces and signatures
└── utils/        # Date formatting, token handlers, and mathematical aids
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
- Node.js (version `>=20.19` or `>=22.12` recommended for Vite v8 / Rolldown native bindings).

### Step-by-Step Run Guide

1. **Clone the Repository** and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd Preproute-Test-Management
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory and copy the contents of `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Modify `VITE_API_BASE_URL` if needed:
   ```env
   VITE_API_BASE_URL=https://admin-moderator-backend-staging.up.railway.app/api
   ```

3. **Install Dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

4. **Start the Local Development Server**:
   ```bash
   npm run dev
   ```

5. **Build and Preview Production Bundle Locally**:
   ```bash
   npm run build
   ```
   This compiles TypeScript checking and outputs the bundled files inside the `dist/` directory. You can preview the production bundle locally with:
   ```bash
   npm run preview
   ```

---

## 🌐 Vercel Deployment Instructions

Follow these instructions to deploy this application to Vercel:

1. **Vercel CLI (Command Line)**:
   Ensure you have Vercel CLI installed globally:
   ```bash
   npm install -g vercel
   ```
   Run the deployment command in the root folder:
   ```bash
   vercel
   ```
   Set the build directory to `dist` when prompted, and configure the project root path.

2. **GitHub Integration (Recommended)**:
   - Import the GitHub repository inside the Vercel Dashboard.
   - Configure **Framework Preset** as `Vite`.
   - Set **Build Command** to `tsc -b && vite build`.
   - Set **Output Directory** to `dist`.
   - Add **Environment Variables**: Add `VITE_API_BASE_URL` with value `https://admin-moderator-backend-staging.up.railway.app/api`.
   - Click **Deploy**. Vercel will automatically build and deploy new changes on every push to the `main` branch.

3. **Client-Side Routing Routing Fix**:
   To prevent 404 errors when reloading subpages on Vercel (due to SPA history routing), create a `vercel.json` file in the root folder:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

---

## 🛠️ Architecture & Design Decisions

### 1. Verification of Questions via Bulk mapping
Since the backend API lacks individual endpoints to edit or delete questions, we implement a **Local Queue + Bulk Upload** model:
- Questions are added, deleted, and edited in React state.
- When the administrator clicks **Save & Continue**, they are uploaded in one call to `POST /questions/bulk`.
- The returned question IDs are then associated with the test using `PUT /tests/:id` while updating total question counts and test scores dynamically.

### 2. Matching Names to UUIDs
Staging APIs often return subject names (`"Mathematics"`) on test details but require UUIDs (`"24f22e65-..."`) for creation payloads. To address this mismatch, the application uses TanStack Query to load all subjects and mapping tables on form load, translating human-readable strings to their correct backend UUID hashes transparently.

### 3. Absolute Imports
Aliases are mapped in `tsconfig.app.json` and resolved in `vite.config.ts`, mapping `@/*` to the `src/*` folder. This eliminates long and brittle relative paths (`../../../components`).

---

## 🌐 Same-Origin Proxy Configuration (CORS Workaround)

To work around browser CORS errors (since the staging backend doesn't send the `Access-Control-Allow-Origin` header for browser origins), the app is configured to use a same-origin proxy:
- **Local Dev Server Proxy**: Configured in `vite.config.ts` to route `/api/*` requests to the Railway backend server-side.
- **Production CDN Redirect**: Configured in `netlify.toml` to transparently route `/api/*` calls from the same domain to the staging API.
- **Base URL**: Set to `VITE_API_BASE_URL=/api` in `.env` and `.env.example`.

*Ideal Long-Term Fix*: CORS should eventually be enabled on the backend server to accept requests directly from the deployed frontend domains.

---

## 🤝 Git Commit Guidelines

We recommend using **Conventional Commits** to keep the project history neat:

- `feat(auth): add protected routes and Zustand session stores`
- `fix(test): resolve Zod enum type validation warning`
- `style(dashboard): improve responsive layout and glassmorphism borders`
- `docs(readme): add deploy steps and vercel history configuration`
- `refactor(questions): abstract bulk upload handler hooks`

---

## 🔮 Future Improvements

1. **Optimistic UI Updates**: Instantly update test status badges on the dashboard grid before network requests resolve.
2. **Server-Side Pagination**: Integrate paginated endpoints to fetch tests incrementally when database limits scale.
3. **Draft Cache Auto-Recovery**: Save incomplete form states in IndexedDB or localStorage to prevent loss if a browser tab accidentally closes.
