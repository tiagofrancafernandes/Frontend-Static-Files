# GEMINI.md

Specialized system context and project guidelines for Gemini AI models interacting with this repository.

## Project Summary

- **Project**: Vite Serve Static HTML Files
- **Runtime**: Node.js (v22+)
- **Package Manager**: pnpm (v11+)
- **Build Tool**: Vite 8 with Rolldown / Rollup bundler
- **Core Mission**: Serve and build multi-page static HTML files, client mockups, and interactive prototypes while strictly preserving directory paths (e.g. `files/pasta01/arquivo01.html` -> `dist/files/pasta01/arquivo01.html`).

---

## Strict Rules & Conventions

### 1. 4-Space Indentation
- All newly created or modified files (`.ts`, `.js`, `.json`, `.html`, `.css`, `.md`) must use **4-space indentation**.
- Never use tabs or 2-space indentation in this repository.

### 2. Prettier Formatting Routine
Before finalizing any response or committing changes, run:
```sh
prettier --config ./.prettierrc --ignore-path .prettierignore --write .
```
Ensure that `.prettierignore` is respected.

### 3. Icon Management with Iconify
- Use **Iconify** (`iconify-icon`) for all icon needs.
- Avoid loose SVGs or separate icon font packages.
- Format: `<collection>:<icon-name>`, for example `<iconify-icon icon="fa7-solid:folder"></iconify-icon>`.
- Use CSS or Tailwind classes (`w-*`, `h-*`, `text-*`, `transition`) for styling and hover states.

### 4. API Routes & Demonstration Files (.http)
- If backend routes are introduced in the future, generate corresponding demonstration request files (`.http`) saved in `backend/dev-contents/demo-requests/` with the suffix `-demo` (e.g., using `tenants-demo.http` as a template).

### 5. Preserving Static Directory Layout
- Any prototype placed in `files/<subfolder>/<filename>.html` must automatically be served in development and built into `dist/files/<subfolder>/<filename>.html`.
- Non-HTML assets in `files/` (styles, scripts, images, mock JSON files, media) must be copied as-is to `dist/files/` via `staticDirectoryPlugin` in `vite.config.ts`.
- `base: './'` is required to ensure links and assets work when deployed under subdirectories or static hosting services (GitHub Pages, Netlify, Vercel, S3).

---

## Common Commands

- `pnpm dev`: Start Vite development server with hot-reload and instant access to all pages.
- `pnpm build`: Scan all HTML files, bundle assets, copy static resources to `dist/files/`, and inject prototype listing into `dist/index.html`.
- `pnpm preview`: Start local preview of the production build in `dist/`.
- `pnpm run format`: Execute Prettier formatting across the repository.

