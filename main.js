import 'iconify-icon';

// Se vc está vendo isso, parabéns, mas não replique isso pois não é a melhor forma de se proteger algo. O objetivo aqui não é segurança é só ocultar algumas informações. A senha é só 112233
const STORED_AUTH_HASH = 'MTEyMjMz';

function validatePassword(input) {
    try {
        return btoa(input.trim()) === STORED_AUTH_HASH;
    } catch {
        return false;
    }
}

let allRawPages = [];
let activeBase = '';
let isFlatView = false;
let expandedFolders = new Set();
let toastTimeout = null;

// DOM elements
const authOverlay = document.querySelector('[data-el-id="auth-overlay"]');
const authForm = document.querySelector('[data-el-id="auth-form"]');
const authPasswordInput = document.querySelector('[data-el-id="auth-password-input"]');
const authErrorMsg = document.querySelector('[data-el-id="auth-error-msg"]');
const indexContentEl = document.querySelector('[data-el-id="index-content"]');
const searchInput = document.querySelector('[data-el-id="search"]');
const searchClearBtn = document.querySelector('[data-el-id="search-clear"]');
const statsText = document.querySelector('[data-el-id="stats-text"]');
const btnToggleView = document.querySelector('[data-el-id="btn-toggle-view"]');
const btnToggleViewText = document.querySelector('[data-el-id="btn-toggle-view-text"]');
const breadcrumbsEl = document.querySelector('[data-el-id="breadcrumbs"]');
const baseIndicatorEl = document.querySelector('[data-el-id="base-indicator"]');
const currentBaseNameEl = document.querySelector('[data-el-id="current-base-name"]');
const btnOpenChangeBase = document.querySelector('[data-el-id="btn-open-change-base"]');
const toastEl = document.querySelector('[data-el-id="toast"]');
const toastMessageEl = document.querySelector('[data-el-id="toast-message"]');

// Share Modal Elements
const shareModal = document.querySelector('[data-el-id="share-modal"]');
const shareModalClose = document.querySelector('[data-el-id="share-modal-close"]');
const shareFolderPathInput = document.querySelector('[data-el-id="share-folder-path"]');
const shareOptSetbase = document.querySelector('[data-el-id="share-opt-setbase"]');
const shareOptFolder = document.querySelector('[data-el-id="share-opt-folder"]');
const shareUrlPreview = document.querySelector('[data-el-id="share-url-preview"]');
const shareBtnCopy = document.querySelector('[data-el-id="share-btn-copy"]');
const shareBtnTest = document.querySelector('[data-el-id="share-btn-test"]');
let currentSharingFolder = '';

// Change Base Modal Elements
const changeBaseModal = document.querySelector('[data-el-id="change-base-modal"]');
const changeBaseClose = document.querySelector('[data-el-id="change-base-close"]');
const changeBaseAuthStep = document.querySelector('[data-el-id="change-base-auth-step"]');
const changeBaseInputStep = document.querySelector('[data-el-id="change-base-input-step"]');
const changeBasePassInput = document.querySelector('[data-el-id="change-base-pass-input"]');
const changeBasePassError = document.querySelector('[data-el-id="change-base-pass-error"]');
const changeBaseInput = document.querySelector('[data-el-id="change-base-input"]');
const btnResetDefaultBase = document.querySelector('[data-el-id="btn-reset-default-base"]');
const btnApplyBase = document.querySelector('[data-el-id="btn-apply-base"]');
const btnApplyBaseText = document.querySelector('[data-el-id="btn-apply-base-text"]');

function showToast(message) {
    toastMessageEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 2200);
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizePath(p) {
    if (!p) return '';
    let clean = p.trim().replace(/^[\/\\]+|[\/\\]+$/g, '');
    if (clean === 'files' || clean === '/' || clean === '\\') {
        return '';
    }
    if (clean.startsWith('files/')) {
        clean = clean.slice(6);
    }
    return clean.replace(/^[\/\\]+|[\/\\]+$/g, '');
}

function isDefaultBase(p) {
    const norm = normalizePath(p);
    return norm === '' || norm === 'files';
}

function isAuthenticated() {
    return sessionStorage.getItem('auth_files_viewer') === 'granted';
}

function setAuthenticated() {
    sessionStorage.setItem('auth_files_viewer', 'granted');
}

function folderExists(targetFolder) {
    const norm = normalizePath(targetFolder);
    if (norm === '') return true;
    const prefix = `files/${norm}/`;
    return allRawPages.some((f) => f.startsWith(prefix) || f === `files/${norm}`);
}

function getAbsoluteUrl(relPath) {
    return new URL(relPath, window.location.href).href;
}

// Build hierarchical node
function buildFolderTree(fileList, baseDir = '') {
    const normBase = normalizePath(baseDir);
    const prefix = normBase ? `files/${normBase}/` : 'files/';

    const scopedFiles = fileList.filter((f) => f.startsWith(prefix) || (normBase === '' && f.startsWith('files/')));

    const root = {
        name: normBase ? normBase.split('/').pop() : 'files',
        path: normBase,
        directFiles: [],
        childDirs: new Map(),
    };

    for (const file of scopedFiles) {
        const relativeToFilePrefix = file.slice(prefix.length);
        const parts = relativeToFilePrefix.split('/');
        const fileName = parts.pop();

        let curr = root;
        let accumulatedPath = normBase;

        for (const part of parts) {
            accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
            if (!curr.childDirs.has(part)) {
                curr.childDirs.set(part, {
                    name: part,
                    path: accumulatedPath,
                    directFiles: [],
                    childDirs: new Map(),
                });
            }
            curr = curr.childDirs.get(part);
        }
        curr.directFiles.push({
            name: fileName,
            fullPath: file,
        });
    }

    return root;
}

// Recursive HTML renderer for folder tree
function renderFolderNodeHtml(node, depth = 0) {
    const dirCount = node.childDirs.size;
    const fileCount = node.directFiles.length;
    const isExpanded = expandedFolders.has(node.path);
    const openClass = isExpanded ? 'expanded' : '';

    let html = `
        <div class="tree-node ${openClass}" data-path="${escapeHtml(node.path)}">
            <div class="tree-folder-row" data-action="toggle-folder" data-path="${escapeHtml(node.path)}">
                <div class="tree-folder-left">
                    <iconify-icon icon="fa7-solid:chevron-right" class="folder-chevron-icon"></iconify-icon>
                    <iconify-icon icon="${isExpanded ? 'fa7-solid:folder-open' : 'fa7-solid:folder'}" class="folder-icon"></iconify-icon>
                    <span class="folder-title-name">${escapeHtml(node.name)}</span>
                    <span class="folder-stats-pill">
                        ${dirCount} ${dirCount === 1 ? 'dir' : 'dirs'}, ${fileCount} ${fileCount === 1 ? 'file' : 'files'}
                    </span>
                </div>
                <div class="tree-folder-right">
                    <button
                        type="button"
                        class="btn-share-folder"
                        data-action="open-share"
                        data-folder="${escapeHtml(node.path)}"
                        title="Gerar link de compartilhamento"
                    >
                        <iconify-icon icon="fa7-solid:share-nodes"></iconify-icon>
                        <span>Compartilhar</span>
                    </button>
                </div>
            </div>

            <div class="tree-children">
    `;

    // Subdirectories first
    const sortedDirs = Array.from(node.childDirs.values()).sort((a, b) => a.name.localeCompare(b.name));
    for (const childDir of sortedDirs) {
        html += renderFolderNodeHtml(childDir, depth + 1);
    }

    // Direct files in this directory
    const sortedFiles = [...node.directFiles].sort((a, b) => a.name.localeCompare(b.name));
    for (const file of sortedFiles) {
        const fullUrl = getAbsoluteUrl(file.fullPath);
        html += `
            <div class="tree-file-row">
                <div class="file-details">
                    <iconify-icon icon="fa7-solid:file-code" class="file-icon"></iconify-icon>
                    <div class="file-meta">
                        <div class="file-title">${escapeHtml(file.name)}</div>
                        <div class="file-path">${escapeHtml(file.fullPath)}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button
                        type="button"
                        class="btn-action btn-copy"
                        data-action="copy-file-url"
                        data-url="${escapeHtml(fullUrl)}"
                        title="Copiar URL direta"
                    >
                        <iconify-icon icon="fa7-solid:copy"></iconify-icon>
                        <span>Copiar URL</span>
                    </button>
                    <a
                        href="./${file.fullPath}"
                        class="btn-action btn-view"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Visualizar arquivo em nova aba"
                    >
                        <iconify-icon icon="fa7-solid:arrow-up-right-from-square"></iconify-icon>
                        <span>Visualizar</span>
                    </a>
                </div>
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

// Render breadcrumbs
function renderBreadcrumbs() {
    const parts = activeBase ? activeBase.split('/') : [];
    let html = `
        <span class="crumb-item ${parts.length === 0 ? 'current' : ''}" data-crumb="">
            <iconify-icon icon="fa7-solid:house"></iconify-icon>
            <span>files</span>
        </span>
    `;

    let acc = '';
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        acc = acc ? `${acc}/${part}` : part;
        const isLast = i === parts.length - 1;
        html += `
            <span class="crumb-separator">/</span>
            <span class="crumb-item ${isLast ? 'current' : ''}" data-crumb="${escapeHtml(acc)}">
                <span>${escapeHtml(part)}</span>
            </span>
        `;
    }

    breadcrumbsEl.innerHTML = html;
}

// Render Flat View (Listar Todos)
function renderFlatView(files) {
    if (files.length === 0) {
        indexContentEl.innerHTML = `
            <div class="empty-state">
                <iconify-icon icon="fa7-solid:file-circle-question" class="empty-icon"></iconify-icon>
                <p>Nenhum arquivo encontrado.</p>
            </div>
        `;
        return;
    }

    // Group files by directory
    const groups = {};
    for (const file of files) {
        const lastSlash = file.lastIndexOf('/');
        const dir = lastSlash !== -1 ? file.substring(0, lastSlash) : 'raiz';
        if (!groups[dir]) groups[dir] = [];
        groups[dir].push(file);
    }

    let html = '';
    for (const [dir, dirFiles] of Object.entries(groups)) {
        html += `
            <div class="flat-folder-block">
                <div class="flat-folder-header">
                    <div class="flat-folder-title">
                        <iconify-icon icon="fa7-solid:folder-open"></iconify-icon>
                        <span>${escapeHtml(dir)}</span>
                        <span class="folder-stats-pill">${dirFiles.length} ${dirFiles.length === 1 ? 'item' : 'itens'}</span>
                    </div>
                    <button
                        type="button"
                        class="btn-share-folder"
                        data-action="open-share"
                        data-folder="${escapeHtml(dir.replace(/^files\/?/, ''))}"
                        title="Gerar link de compartilhamento"
                    >
                        <iconify-icon icon="fa7-solid:share-nodes"></iconify-icon>
                        <span>Compartilhar</span>
                    </button>
                </div>
                <div class="flat-files-container">
                    ${dirFiles
                        .map((file) => {
                            const fileName = file.split('/').pop();
                            const fullUrl = getAbsoluteUrl(file);
                            return `
                            <div class="tree-file-row">
                                <div class="file-details">
                                    <iconify-icon icon="fa7-solid:file-code" class="file-icon"></iconify-icon>
                                    <div class="file-meta">
                                        <div class="file-title">${escapeHtml(fileName)}</div>
                                        <div class="file-path">${escapeHtml(file)}</div>
                                    </div>
                                </div>
                                <div class="file-actions">
                                    <button
                                        type="button"
                                        class="btn-action btn-copy"
                                        data-action="copy-file-url"
                                        data-url="${escapeHtml(fullUrl)}"
                                        title="Copiar URL direta"
                                    >
                                        <iconify-icon icon="fa7-solid:copy"></iconify-icon>
                                        <span>Copiar URL</span>
                                    </button>
                                    <a
                                        href="./${file}"
                                        class="btn-action btn-view"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Visualizar arquivo em nova aba"
                                    >
                                        <iconify-icon icon="fa7-solid:arrow-up-right-from-square"></iconify-icon>
                                        <span>Visualizar</span>
                                    </a>
                                </div>
                            </div>
                        `;
                        })
                        .join('')}
                </div>
            </div>
        `;
    }

    indexContentEl.innerHTML = html;
}

// Main Render Function
function render() {
    const query = searchInput.value.trim().toLowerCase();
    searchClearBtn.style.display = query ? 'block' : 'none';

    // Scoped list under activeBase
    const prefix = activeBase ? `files/${activeBase}/` : 'files/';
    const scopedFiles = allRawPages.filter(
        (f) => f.startsWith(prefix) || (activeBase === '' && f.startsWith('files/'))
    );

    // Search strictly inside files
    const filteredFiles = scopedFiles.filter((f) => f.toLowerCase().includes(query));

    statsText.textContent = `${filteredFiles.length} ${filteredFiles.length === 1 ? 'arquivo' : 'arquivos'}`;

    renderBreadcrumbs();

    // If searching, show matching files directly
    if (query) {
        renderFlatView(filteredFiles);
        return;
    }

    // If Flat View selected
    if (isFlatView) {
        renderFlatView(scopedFiles);
        return;
    }

    // Tree View
    const tree = buildFolderTree(allRawPages, activeBase);

    if (tree.childDirs.size === 0 && tree.directFiles.length === 0) {
        indexContentEl.innerHTML = `
            <div class="empty-state">
                <iconify-icon icon="fa7-solid:folder-open" class="empty-icon"></iconify-icon>
                <p>Nenhum arquivo ou subpasta encontrado em <strong>${escapeHtml(activeBase || 'files')}</strong>.</p>
            </div>
        `;
        return;
    }

    let html = '';
    // Render top-level children under activeBase
    const sortedDirs = Array.from(tree.childDirs.values()).sort((a, b) => a.name.localeCompare(b.name));
    for (const childDir of sortedDirs) {
        html += renderFolderNodeHtml(childDir);
    }

    // Direct files in activeBase
    const sortedFiles = [...tree.directFiles].sort((a, b) => a.name.localeCompare(b.name));
    for (const file of sortedFiles) {
        const fullUrl = getAbsoluteUrl(file.fullPath);
        html += `
            <div class="tree-file-row" style="padding-left: 1.25rem;">
                <div class="file-details">
                    <iconify-icon icon="fa7-solid:file-code" class="file-icon"></iconify-icon>
                    <div class="file-meta">
                        <div class="file-title">${escapeHtml(file.name)}</div>
                        <div class="file-path">${escapeHtml(file.fullPath)}</div>
                    </div>
                </div>
                <div class="file-actions">
                    <button
                        type="button"
                        class="btn-action btn-copy"
                        data-action="copy-file-url"
                        data-url="${escapeHtml(fullUrl)}"
                        title="Copiar URL direta"
                    >
                        <iconify-icon icon="fa7-solid:copy"></iconify-icon>
                        <span>Copiar URL</span>
                    </button>
                    <a
                        href="./${file.fullPath}"
                        class="btn-action btn-view"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Visualizar arquivo em nova aba"
                    >
                        <iconify-icon icon="fa7-solid:arrow-up-right-from-square"></iconify-icon>
                        <span>Visualizar</span>
                    </a>
                </div>
            </div>
        `;
    }

    indexContentEl.innerHTML = html;
}

// Update Share Link Modal Preview URL
function updateShareUrlPreview() {
    const url = new URL(window.location.origin + window.location.pathname);
    const isSetBase = shareOptSetbase.checked;
    const isIncludeFolder = shareOptFolder.checked;

    if (isSetBase && currentSharingFolder) {
        url.searchParams.set('set_base', currentSharingFolder);
    }
    if (isIncludeFolder && currentSharingFolder) {
        url.searchParams.set('folder', currentSharingFolder);
    }

    shareUrlPreview.value = url.href;
}

function openShareModal(folderPath) {
    currentSharingFolder = normalizePath(folderPath);
    shareFolderPathInput.value = currentSharingFolder ? `files/${currentSharingFolder}` : 'files';
    shareOptSetbase.checked = false;
    shareOptFolder.checked = true;
    updateShareUrlPreview();
    shareModal.classList.add('show');
}

function closeShareModal() {
    shareModal.classList.remove('show');
}

shareOptSetbase.addEventListener('change', updateShareUrlPreview);
shareOptFolder.addEventListener('change', updateShareUrlPreview);
shareModalClose.addEventListener('click', closeShareModal);
shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) closeShareModal();
});

shareBtnCopy.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(shareUrlPreview.value);
        showToast('Link de compartilhamento copiado!');
        const span = shareBtnCopy.querySelector('span');
        const icon = shareBtnCopy.querySelector('iconify-icon');
        if (span) span.textContent = 'Copiado!';
        if (icon) icon.setAttribute('icon', 'fa7-solid:check');
        setTimeout(() => {
            if (span) span.textContent = 'Copiar Link';
            if (icon) icon.setAttribute('icon', 'fa7-solid:copy');
        }, 1800);
    } catch (err) {
        showToast('Erro ao copiar link.');
    }
});

shareBtnTest.addEventListener('click', () => {
    window.open(shareUrlPreview.value, '_blank');
});

// Change Base Modal Handlers
function openChangeBaseModal() {
    changeBaseAuthStep.style.display = 'block';
    changeBaseInputStep.style.display = 'none';
    changeBasePassInput.value = '';
    changeBasePassError.style.display = 'none';
    if (btnApplyBaseText) {
        btnApplyBaseText.textContent = 'Avançar';
    }
    changeBaseModal.classList.add('show');
    setTimeout(() => {
        changeBasePassInput.focus();
    }, 50);
}

function closeChangeBaseModal() {
    changeBaseModal.classList.remove('show');
}

btnOpenChangeBase.addEventListener('click', openChangeBaseModal);
changeBaseClose.addEventListener('click', closeChangeBaseModal);
changeBaseModal.addEventListener('click', (e) => {
    if (e.target === changeBaseModal) closeChangeBaseModal();
});

btnResetDefaultBase.addEventListener('click', () => {
    // If auth step is active, validate password before allowing reset
    if (changeBaseAuthStep.style.display !== 'none') {
        if (!validatePassword(changeBasePassInput.value)) {
            changeBasePassError.style.display = 'block';
            changeBasePassInput.select();
            return;
        }
        setAuthenticated();
    }

    localStorage.removeItem('saved_base_folder');
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.delete('set_base');
    url.searchParams.delete('folder');
    window.location.href = url.href;
});

btnApplyBase.addEventListener('click', () => {
    // If in auth step, verify password first
    if (changeBaseAuthStep.style.display !== 'none') {
        if (validatePassword(changeBasePassInput.value)) {
            setAuthenticated();
            changeBaseAuthStep.style.display = 'none';
            changeBaseInputStep.style.display = 'block';
            changeBaseInput.value = activeBase;
            if (btnApplyBaseText) {
                btnApplyBaseText.textContent = 'Aplicar';
            }
            changeBaseInput.focus();
            return;
        } else {
            changeBasePassError.style.display = 'block';
            changeBasePassInput.select();
            return;
        }
    }

    const newBase = normalizePath(changeBaseInput.value);
    const url = new URL(window.location.origin + window.location.pathname);
    if (newBase && newBase !== 'files') {
        localStorage.setItem('saved_base_folder', newBase);
        url.searchParams.set('set_base', newBase);
    } else {
        localStorage.removeItem('saved_base_folder');
        url.searchParams.delete('set_base');
    }
    window.location.href = url.href;
});

changeBasePassInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnApplyBase.click();
    }
});

changeBaseInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnApplyBase.click();
    }
});

// Auth Screen Handlers
function checkInitialAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const reqBase = urlParams.get('set_base');
    const reqFolder = urlParams.get('folder');

    const normBase = normalizePath(reqBase);
    const normFolder = normalizePath(reqFolder);

    let isCustomBase = false;

    if (reqBase !== null) {
        if (!isDefaultBase(reqBase) && folderExists(normBase)) {
            activeBase = normBase;
            isCustomBase = true;
            localStorage.setItem('saved_base_folder', activeBase);
        } else {
            // Explicitly set to empty/default: remove from localStorage
            activeBase = '';
            localStorage.removeItem('saved_base_folder');
        }
    } else if (reqFolder !== null && !isDefaultBase(reqFolder) && folderExists(normFolder)) {
        activeBase = normFolder;
        isCustomBase = true;
        localStorage.setItem('saved_base_folder', activeBase);
    } else {
        // Not in query parameters: restore from localStorage if available
        const savedBase = localStorage.getItem('saved_base_folder');
        const normSaved = normalizePath(savedBase);
        if (normSaved && !isDefaultBase(normSaved) && folderExists(normSaved)) {
            activeBase = normSaved;
            isCustomBase = true;
        } else {
            activeBase = '';
            localStorage.removeItem('saved_base_folder');
        }
    }

    // If custom base active, show base indicator in header and sync URL
    if (isCustomBase) {
        baseIndicatorEl.style.display = 'flex';
        currentBaseNameEl.textContent = `files/${activeBase}`;

        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('set_base') !== activeBase) {
            currentUrl.searchParams.set('set_base', activeBase);
            window.history.replaceState({}, '', currentUrl.href);
        }
    } else {
        baseIndicatorEl.style.display = 'none';
    }

    // If non-default base: NO PASSWORD REQUIRED!
    if (isCustomBase) {
        authOverlay.classList.remove('show');
        if (normFolder) {
            expandedFolders.add(normFolder);
        }
        render();
        return;
    }

    // Default base requested (/files or all): password required unless already authenticated in session
    if (isAuthenticated()) {
        authOverlay.classList.remove('show');
        render();
    } else {
        authOverlay.classList.add('show');
        authPasswordInput.focus();
    }
}

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = authPasswordInput.value;
    if (validatePassword(pass)) {
        setAuthenticated();
        authOverlay.classList.remove('show');
        authErrorMsg.style.display = 'none';
        render();
    } else {
        authErrorMsg.style.display = 'block';
        authPasswordInput.select();
    }
});

// Delegate Click Events in indexContentEl
indexContentEl.addEventListener('click', async (e) => {
    // Copy file URL
    const copyBtn = e.target.closest('[data-action="copy-file-url"]');
    if (copyBtn) {
        e.stopPropagation();
        const url = copyBtn.getAttribute('data-url');
        try {
            await navigator.clipboard.writeText(url);
            copyBtn.classList.add('copied');
            const label = copyBtn.querySelector('span');
            const icon = copyBtn.querySelector('iconify-icon');
            if (label) label.textContent = 'Copiado!';
            if (icon) icon.setAttribute('icon', 'fa7-solid:check');
            showToast('URL copiada para a área de transferência!');
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                if (label) label.textContent = 'Copiar URL';
                if (icon) icon.setAttribute('icon', 'fa7-solid:copy');
            }, 1800);
        } catch (err) {
            showToast('Erro ao copiar URL.');
        }
        return;
    }

    // Share Folder button
    const shareBtn = e.target.closest('[data-action="open-share"]');
    if (shareBtn) {
        e.stopPropagation();
        const folder = shareBtn.getAttribute('data-folder');
        openShareModal(folder);
        return;
    }

    // Toggle Folder expansion
    const folderRow = e.target.closest('[data-action="toggle-folder"]');
    if (folderRow) {
        const path = folderRow.getAttribute('data-path');
        const treeNode = folderRow.closest('.tree-node');
        if (treeNode) {
            if (expandedFolders.has(path)) {
                expandedFolders.delete(path);
                treeNode.classList.remove('expanded');
                const icon = folderRow.querySelector('.folder-icon');
                if (icon) icon.setAttribute('icon', 'fa7-solid:folder');
            } else {
                expandedFolders.add(path);
                treeNode.classList.add('expanded');
                const icon = folderRow.querySelector('.folder-icon');
                if (icon) icon.setAttribute('icon', 'fa7-solid:folder-open');
            }
        }
        return;
    }
});

// Breadcrumbs Click Delegation
breadcrumbsEl.addEventListener('click', (e) => {
    const crumb = e.target.closest('[data-crumb]');
    if (crumb && !crumb.classList.contains('current')) {
        const targetPath = crumb.getAttribute('data-crumb');
        activeBase = targetPath;
        if (activeBase && !isDefaultBase(activeBase)) {
            localStorage.setItem('saved_base_folder', activeBase);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('set_base', activeBase);
            window.history.replaceState({}, '', currentUrl.href);
            baseIndicatorEl.style.display = 'flex';
            currentBaseNameEl.textContent = `files/${activeBase}`;
        } else {
            localStorage.removeItem('saved_base_folder');
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('set_base');
            window.history.replaceState({}, '', currentUrl.href);
            baseIndicatorEl.style.display = 'none';
        }
        render();
    }
});

// Toggle View Mode (Hierárquico <-> Listar Todos)
btnToggleView.addEventListener('click', () => {
    isFlatView = !isFlatView;
    btnToggleViewText.textContent = isFlatView ? 'Modo Hierárquico' : 'Listar Todos';
    btnToggleView.classList.toggle('active', isFlatView);
    render();
});

// Search input
searchInput.addEventListener('input', () => {
    render();
});

searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    render();
    searchInput.focus();
});

// Load Pages
async function loadInitialData() {
    const scriptEl = document.querySelector('[data-el-id="__PAGES_DATA__"]');
    if (scriptEl && scriptEl.textContent) {
        try {
            const parsed = JSON.parse(scriptEl.textContent.trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
                allRawPages = parsed;
            }
        } catch (e) {
            console.warn('__PAGES_DATA__ parse error:', e);
        }
    }

    if (allRawPages.length === 0) {
        try {
            const res = await fetch('./api/pages');
            if (res.ok) {
                allRawPages = await res.json();
            }
        } catch (e) {
            console.warn('/api/pages fetch error:', e);
        }
    }

    checkInitialAccess();
}

loadInitialData();
