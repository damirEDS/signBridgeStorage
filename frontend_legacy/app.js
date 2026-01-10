// API Configuration
// Use relative path since frontend is served from the same origin
const API_BASE_URL = '';

// State
let token = localStorage.getItem('token');
let currentTab = 'files';
let currentUser = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const statusBadge = document.getElementById('statusBadge');
const filesGrid = document.getElementById('filesGrid');
const toastContainer = document.getElementById('toastContainer');

// Tabs
const tabButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Forms & Tables
const glossesTable = document.querySelector('#glossesTable tbody');
const variantsTable = document.querySelector('#variantsTable tbody');
const glossForm = document.getElementById('glossForm');
const glossModal = document.getElementById('glossModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();

    // Check if we have a token
    if (token) {
        if (loginModal) loginModal.classList.remove('active');
        initApp();
    } else {
        if (loginModal) loginModal.classList.add('active');
    }

    setupEventListeners();
});

function initApp() {
    loadFiles();
    // Load other tabs data if they exist
    if (glossesTable) loadGlosses();
    if (variantsTable) loadVariants();
}

// Event Listeners
function setupEventListeners() {
    // Auth
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Navigation
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // File Upload
    const selectFileBtn = document.getElementById('selectFileBtn');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const refreshBtn = document.getElementById('refreshBtn');

    if (selectFileBtn) selectFileBtn.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadFiles());

    // Drag & Drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); uploadArea.classList.remove('drag-over'); });
        uploadArea.addEventListener('drop', handleDrop);
    }

    // Glosses
    const addGlossBtn = document.getElementById('addGlossBtn');
    if (addGlossBtn && glossModal) {
        addGlossBtn.addEventListener('click', () => openModal(glossModal));
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
    });

    if (glossForm) glossForm.addEventListener('submit', handleCreateGloss);

    // Quick Add Variant (Placeholder)
    const addVariantBtn = document.getElementById('addVariantBtn');
    if (addVariantBtn) {
        addVariantBtn.addEventListener('click', () => {
            showToast('Функционал создания связей в разработке', 'warning');
        });
    }
}

// --- Auth Functions ---

async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (!usernameInput || !passwordInput) return;

    try {
        const formData = new URLSearchParams();
        formData.append('username', usernameInput.value);
        formData.append('password', passwordInput.value);

        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!response.ok) throw new Error('Неверный логин или пароль');

        const data = await response.json();
        token = data.access_token;
        localStorage.setItem('token', token);

        loginModal.classList.remove('active');
        initApp();
        showToast('Успешный вход', 'success');

    } catch (error) {
        if (loginError) loginError.textContent = error.message;
    }
}

function handleLogout() {
    token = null;
    localStorage.removeItem('token');
    loginModal.classList.add('active');
    // Clear data
    if (filesGrid) filesGrid.innerHTML = '';
    if (glossesTable) glossesTable.innerHTML = '';
    if (variantsTable) variantsTable.innerHTML = '';
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${token}`
    };
}

// --- Navigation ---

function switchTab(tabId) {
    currentTab = tabId;

    // Update buttons
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update content
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
}

// --- Files Logic ---

async function loadFiles() {
    if (!filesGrid) return;

    try {
        filesGrid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Загрузка файлов...</p></div>';

        const response = await fetch(`${API_BASE_URL}/api/v1/files?max_keys=100`);
        if (!response.ok) throw new Error('Failed to load files');

        const data = await response.json();
        renderFiles(data.files);
    } catch (error) {
        console.error(error);
        filesGrid.innerHTML = `<div class="error-state"><p>Ошибка загрузки файлов</p></div>`;
        showToast('Ошибка загрузки файлов', 'error');
    }
}

function renderFiles(files) {
    if (!filesGrid) return;

    if (files.length === 0) {
        filesGrid.innerHTML = '<div class="empty-state"><p>Файлов нет. Загрузите первый файл!</p></div>';
        return;
    }

    filesGrid.innerHTML = files.map(file => {
        const fileName = file.key.split('/').pop();
        const ext = fileName.split('.').pop().toLowerCase();

        return `
            <div class="file-card">
                <div class="file-header">
                    <div class="file-icon">${getFileIcon(ext)}</div>
                    <div class="file-info">
                        <div class="file-name" title="${fileName}">${fileName}</div>
                        <div class="file-meta">${formatFileSize(file.size)}</div>
                    </div>
                </div>
                <div class="file-actions">
                     <button class="btn-icon" onclick="downloadFile('${file.key}', '${fileName}')" title="Скачать">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteFile('${file.key}', '${fileName}')" title="Удалить">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Show progress
    const progressEl = document.getElementById('uploadProgress');
    const fillEl = document.getElementById('progressFill'); // This might differ in HTML structure, checking mainly logic
    // Based on HTML in index.html, structure is a bit different, but let's assume standard
    // Actually index.html structure for progress is:
    // <div class="upload-progress" id="uploadProgress"> <svg...> ... </div>
    // It doesn't seem to have fillEl/percentEl placeholders in the provided index.html snippet?
    // Let's rely on basic display for now or simpler logic.

    if (progressEl) progressEl.style.display = 'block';

    try {
        const xhr = new XMLHttpRequest();

        const promise = new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', e => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    // Update UI if elements exist
                }
            });

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
                else reject(new Error(xhr.statusText));
            };

            xhr.onerror = () => reject(new Error('Network Error'));

            xhr.open('POST', `${API_BASE_URL}/api/v1/files/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
        });

        await promise;
        showToast(`Файл ${file.name} загружен`, 'success');
        loadFiles();

    } catch (error) {
        showToast(`Ошибка загрузки: ${error.message}`, 'error');
    } finally {
        if (progressEl) setTimeout(() => { progressEl.style.display = 'none'; }, 2000);
    }
}

async function deleteFile(key, name) {
    if (!confirm(`Удалить ${name}?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/files/delete?file_key=${encodeURIComponent(key)}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error('Ошибка удаления');

        showToast('Файл удален', 'success');
        loadFiles();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// --- CMS Logic ---

async function loadGlosses() {
    if (!glossesTable) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/cms/glosses`);
        const glosses = await res.json();

        glossesTable.innerHTML = glosses.map(g => `
            <tr>
                <td>${g.id}</td>
                <td><strong>${g.name}</strong></td>
                <td>${g.synonyms ? g.synonyms.join(', ') : '-'}</td>
                <td>${g.description || '-'}</td>
                <td>
                    <button class="btn-icon">✏️</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

async function handleCreateGloss(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name').toUpperCase(),
        synonyms: formData.get('synonyms') ? formData.get('synonyms').split(',').map(s => s.trim()) : [],
        description: formData.get('description')
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/cms/glosses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error('Ошибка создания');

        showToast('Глосс создан', 'success');
        if (glossModal) closeModal(glossModal);
        e.target.reset();
        loadGlosses();

    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadVariants() {
    if (!variantsTable) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/cms/variants`);
        const variants = await res.json();

        variantsTable.innerHTML = variants.map(v => `
            <tr>
                <td>${v.id}</td>
                <td>${v.gloss?.name || 'ID:' + v.gloss_id}</td>
                <td>Files...</td>
                <td>${v.language_id}</td>
                <td>${v.emotion}</td>
                <td>${v.type}</td>
                <td><button class="btn-icon">🗑️</button></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

// --- Helpers ---
function showToast(msg, type = 'info') {
    if (!toastContainer) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function checkHealth() {
    fetch(`${API_BASE_URL}/health/ready`)
        .then(res => res.json())
        .then(data => {
            if (statusBadge) {
                if (data.s3_connection) {
                    statusBadge.classList.remove('offline');
                    statusBadge.querySelector('.status-text').textContent = 'Онлайн';
                } else {
                    statusBadge.classList.add('offline');
                    statusBadge.querySelector('.status-text').textContent = 'S3 Ошибка';
                }
            }
        })
        .catch(() => {
            if (statusBadge) {
                statusBadge.classList.add('offline');
                statusBadge.querySelector('.status-text').textContent = 'Офлайн';
            }
        });
}

// Drag Drop Handlers
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length) uploadFile(files[0]);
}
function handleFileSelect(e) {
    if (e.target.files.length) uploadFile(e.target.files[0]);
}

// Utils
function openModal(modal) { modal.classList.add('active'); }
function closeModal(modal) { modal.classList.remove('active'); }
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
function getFileIcon(ext) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path></svg>';
}

// Expose global functions for onclick
window.downloadFile = async (key, name) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/files/download?file_key=${encodeURIComponent(key)}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
};
window.deleteFile = deleteFile;
