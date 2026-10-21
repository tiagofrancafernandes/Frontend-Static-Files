# Vite Serve Static HTML Files

A modern Vite-powered static prototype and HTML hosting repository designed to preserve exact directory structures in both development and production builds.

## Overview

When building prototypes, client review pages, or static HTML mockups, maintaining an intuitive URL hierarchy (such as `files/pasta01/arquivo01.html`) is critical. Standard Vite setups often flatten assets or assume single-page applications.

This repository solves that by providing:
- **Dynamic HTML Entry Discovery**: Vite automatically scans the repository for all `.html` files (e.g., inside `files/pasta01/`, `files/pasta02/`, or any newly added folder) and configures them as Rollup inputs.
- **Strict Directory Structure Preservation**: When executing `pnpm build`, files are compiled into `dist/` preserving their exact relative path (e.g., `dist/files/pasta01/arquivo01.html`).
- **Static Asset Mirroring**: Non-HTML assets (CSS, JS, images, fonts, mock JSON, PDFs) located inside `files/` are mirrored directly to `dist/files/`.
- **Interactive Directory Portal**: The root `index.html` automatically detects all pages and provides a responsive, searchable directory with instant filtering and direct links for clients and reviewers.
- **Deployment Resilience**: Configured with `base: './'`, enabling trouble-free deployment to root domains, subdirectories, GitHub Pages, Netlify, Vercel, or static S3 buckets.

---

## Directory Layout

```text
├── files/
│   ├── pasta01/
│   │   ├── arquivo01.css
│   │   ├── arquivo01.html
│   │   ├── arquivo02.css
│   │   └── arquivo02.html
│   └── pasta02/
│       ├── arquivo01.css
│       └── arquivo01.html
├── dist/                               # Generated on build (git-ignored)
│   ├── assets/                         # Bundled JS/CSS chunks
│   ├── files/                          # Preserved static structure
│   └── index.html                      # Root portal
├── index.html                          # Root prototype explorer
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts                      # Dynamic MPA & static asset config
├── .editorconfig
├── .gitignore
├── .prettierrc                         # Configured with 4 spaces
└── .prettierignore
```

---

## Quick Start

### 1. Requirements

- [Node.js](https://nodejs.org/) v18+ (v20+ or v22+ recommended)
- [pnpm](https://pnpm.io/) v9+ / v11+ (or npm / yarn)

### 2. Installation

```sh
pnpm install
```

### 3. Development Server

Start Vite in local development mode:

```sh
pnpm dev
```

Open `http://localhost:5173/` in your browser. You can access:
- The Prototype Hub at `http://localhost:5173/`
- Any static page, e.g., `http://localhost:5173/files/pasta01/arquivo01.html`

### 4. Production Build

Build the project into the `dist/` directory:

```sh
pnpm build
```

The output in `dist/` will preserve the exact structure:
```text
dist/
├── files/
│   ├── pasta01/
│   │   ├── arquivo01.html
│   │   ├── arquivo01.css
│   │   ├── arquivo02.html
│   │   └── arquivo02.css
│   └── pasta02/
│       ├── arquivo01.html
│       └── arquivo01.css
├── assets/
└── index.html
```

### 5. Preview Production Build

Preview the production build locally:

```sh
pnpm preview
```

---

## Adding New Prototypes or Folders

You don't need to manually configure `vite.config.ts` when adding new files. Simply create a new folder and HTML file:

```sh
mkdir -p files/cliente-novo
touch files/cliente-novo/pagina01.html
```

On next `pnpm dev` or `pnpm build`, Vite will automatically:
1. Discover `files/cliente-novo/pagina01.html`.
2. Bundle and output it to `dist/files/cliente-novo/pagina01.html`.
3. Include it in the root portal directory search and list.

---

## Code Formatting

All files in this repository follow a strict 4-space indentation rule. Format the repository before committing:

```sh
pnpm run format
# or directly:
prettier --config ./.prettierrc --ignore-path .prettierignore --write .
```

---

## Deployment

Deploy the `dist/` folder to any static hosting provider:

- **Vercel / Netlify**: Set build command to `pnpm build` and output directory to `dist`.
- **GitHub Pages**: Deploy the contents of the `dist/` directory (relative paths work out of the box with `base: './'`).
- **Nginx / Apache / S3**: Upload the `dist/` folder directly to the web root or subfolder.

