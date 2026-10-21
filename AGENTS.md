# AGENTS.md

Guidelines and operational instructions for AI coding assistants and autonomous agents operating in this repository.

## Repository Purpose

This repository provides a Vite-based development and build environment for hosting static HTML files, client mockups, and interactive prototypes while strictly maintaining the directory structure across development and production builds (e.g., `files/pasta01/arquivo01.html`).

---

## Architectural Rules

### 1. Dynamic Entry Point Discovery
- Do **not** hardcode HTML entry points in `vite.config.ts`.
- `vite.config.ts` dynamically scans the workspace for `.html` files (excluding standard ignore patterns such as `node_modules`, `dist`, `.vite`, `.output`, `.git`).
- Every discovered HTML file is automatically registered in Rollup's `input` options, preserving its relative directory structure in `dist/`.

### 2. Static Asset Copying
- Non-HTML assets (e.g., `.css`, `.js`, images, mock JSON, fonts, `.pdf`) inside `files/` must be mirrored to `dist/files/` upon build completion via the `staticDirectoryPlugin` in `vite.config.ts`.
- This guarantees that unbundled static assets, direct URL downloads, or assets loaded via dynamic `fetch()` calls remain accessible at their identical paths post-deployment.

### 3. Portal & Directory Listing
- The root `index.html` acts as a central prototype catalog and dashboard for clients and developers.
- `vite.config.ts` injects the dynamically discovered list of pages into `<script id="__PAGES_DATA__" type="application/json">[]</script>` during both development and production builds.
- When creating or modifying the root portal, ensure it remains responsive, supports real-time text filtering, and renders using standard web technologies.

### 4. Icon Management
- Always use **Iconify** (`iconify-icon`) for UI icons across the repository.
- Use the unified syntax: `<iconify-icon icon="collection:icon-name"></iconify-icon>`.
- Recommended collections: Font Awesome (`fa7-solid:`, `fa7-brands:`, `fa7-regular:`), Material Design (`mdi:`), Tabler (`tabler:`).
- Style icons using Tailwind classes or standard CSS for sizing (`width`, `height`, `font-size`) and colors.

---

## Code Style & Formatting Standards

- **Indentation**: Strict **4-space** indentation for all code files (HTML, CSS, JS, TS, JSON, YAML). Tabs are forbidden.
- **Prettier Configuration**: Formatting rules are defined in `.prettierrc`:
    - `tabWidth`: 4
    - `useTabs`: false
    - `semi`: true
    - `singleQuote`: true
    - `trailingComma`: "es5"
    - `printWidth`: 120
- **Mandatory Pre-Commit Command**:
    Always execute the following command before concluding a task or preparing a commit:
    ```sh
    prettier --config ./.prettierrc --ignore-path .prettierignore --write .
    ```

---

## Agent Verification Checklist

When creating, updating, or debugging features:
1. Verify `pnpm build` executes cleanly with zero errors and no unhandled warnings.
2. Confirm output files in `dist/files/` mirror the layout in `files/`.
3. Check that `dist/index.html` contains the updated list of pages in `__PAGES_DATA__`.
4. Verify code conforms to 4-space indentation.
5. Run the prettier command above.

