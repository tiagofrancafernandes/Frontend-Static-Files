import { defineConfig, type Plugin } from 'vite';
import { resolve, join, dirname } from 'node:path';
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';

const ROOT_DIR = import.meta.dirname;

const IGNORED_DIRS = new Set([
    'node_modules',
    'dist',
    '.dist',
    '.output',
    '.vite',
    '.vercel',
    '.git',
    '.idea',
    '.vscode',
    'coverage',
]);

/**
 * Recursively find all HTML files in a given directory.
 */
function getHtmlFiles(dir: string, base = ''): string[] {
    let results: string[] = [];
    if (!existsSync(dir)) {
        return results;
    }

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) {
            continue;
        }

        const fullPath = join(dir, entry.name);
        const relPath = base ? join(base, entry.name) : entry.name;

        if (entry.isDirectory()) {
            results = results.concat(getHtmlFiles(fullPath, relPath));
        } else if (entry.name.endsWith('.html')) {
            results.push(relPath);
        }
    }
    return results;
}

/**
 * Retrieve all project HTML entries: root index.html + files/ directory.
 */
function getAllHtmlEntries(rootDir: string): string[] {
    const list: string[] = [];
    if (existsSync(join(rootDir, 'index.html'))) {
        list.push('index.html');
    }
    const filesDir = join(rootDir, 'files');
    if (existsSync(filesDir)) {
        list.push(...getHtmlFiles(filesDir, 'files'));
    }
    return list;
}

/**
 * Recursively copy non-HTML assets to preserve full static tree in dist.
 */
function copyStaticNonHtmlFiles(srcDir: string, destDir: string) {
    if (!existsSync(srcDir)) {
        return;
    }

    const entries = readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) {
            continue;
        }

        const srcPath = join(srcDir, entry.name);
        const destPath = join(destDir, entry.name);

        if (entry.isDirectory()) {
            copyStaticNonHtmlFiles(srcPath, destPath);
        } else if (!entry.name.endsWith('.html')) {
            mkdirSync(dirname(destPath), { recursive: true });
            copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Custom Vite plugin to preserve static directory assets, inject pages list,
 * and provide a real-time `/api/pages` endpoint in dev server mode.
 */
function staticDirectoryPlugin(): Plugin {
    return {
        name: 'vite-plugin-static-directory',
        configureServer(server) {
            server.middlewares.use('/api/pages', (_req, res) => {
                const pages = getHtmlFiles(resolve(ROOT_DIR, 'files'), 'files').sort();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(pages));
            });
        },
        transformIndexHtml(html, ctx) {
            const isRootIndex =
                ctx.path === '/' ||
                ctx.path === '/index.html' ||
                ctx.filename.endsWith('/index.html') ||
                ctx.filename === 'index.html';

            if (isRootIndex) {
                const pages = getHtmlFiles(resolve(ROOT_DIR, 'files'), 'files').sort();

                return html.replace(
                    /<script[^>]*__PAGES_DATA__[^>]*>[\s\S]*?<\/script>/,
                    `<script data-el-id="__PAGES_DATA__" id="__PAGES_DATA__" type="application/json">${JSON.stringify(pages)}</script>`
                );
            }
            return html;
        },
        closeBundle() {
            copyStaticNonHtmlFiles(resolve(ROOT_DIR, 'files'), resolve(ROOT_DIR, 'dist/files'));
        },
    };
}

export default defineConfig(() => {
    const htmlFiles = getAllHtmlEntries(ROOT_DIR);
    const rollupInput: Record<string, string> = {};

    for (const file of htmlFiles) {
        const key = file.replace(/\.html$/, '');
        rollupInput[key] = resolve(ROOT_DIR, file);
    }

    return {
        base: './',
        plugins: [staticDirectoryPlugin()],
        build: {
            rollupOptions: {
                input: rollupInput,
            },
        },
    };
});
