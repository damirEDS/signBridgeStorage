// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// State
let currentPage = 1;
let nextToken = null;
let isUploading = false;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressName = document.getElementById('progressName');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const filesGrid = document.getElementById('filesGrid');
const refreshBtn = document.getElementById('refreshBtn');
const statusBadge = document.getElementById('statusBadge');
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
    loadFiles();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // File selection
    selectFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    // Refresh
    refreshBtn.addEventListener('click', () => loadFiles());
}

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        uploadFiles(files);
    }
    fileInput.value = '';
}

// Upload Files
async function uploadFiles(files) {
    if (isUploading) {
        showToast('Дождитесь завершения текущей загрузки', 'warning');
        return;
    }

    isUploading = true;
    uploadProgress.style.display = 'block';

    for (const file of files) {
        try {
            await uploadFile(file);
        } catch (error) {
            console.error('Upload error:', error);
            showToast(`Ошибка загрузки ${file.name}: ${error.message}`, 'error');
        }
    }

    isUploading = false;
    uploadProgress.style.display = 'none';
    loadFiles();
}

async function uploadFile(file) {
    progressName.textContent = file.name;
    progressPercent.textContent = '0%';
    progressFill.style.width = '0%';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const xhr = new XMLHttpRequest();

        // Progress tracking
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressPercent.textContent = `${percent}%`;
                progressFill.style.width = `${percent}%`;
            }
        });

        // Upload complete
        const response = await new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(xhr.statusText));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));

            xhr.open('POST', `${API_BASE_URL}/api/v1/files/upload`);
            xhr.send(formData);
        });

        progressPercent.textContent = '100%';
        progressFill.style.width = '100%';
        showToast(`Файл ${file.name} успешно загружен`, 'success');

    } catch (error) {
        throw new Error(error.message || 'Ошибка загрузки');
    }
}

// Load Files
async function loadFiles(token = null) {
    showLoading();

    try {
        let url = `${API_BASE_URL}/api/v1/files?max_keys=12`;
        if (token) {
            url += `&continuation_token=${token}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Ошибка загрузки файлов');
        }

        const data = await response.json();
        displayFiles(data.files);

        nextToken = data.next_token || null;

    } catch (error) {
        console.error('Load files error:', error);
        showError('Не удалось загрузить список файлов');
    }
}

// Display Files
function displayFiles(files) {
    if (files.length === 0) {
        filesGrid.innerHTML = `
            <div class="loading">
                <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
                    <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
                </svg>
                <p>Файлов пока нет. Загрузите свой первый файл!</p>
            </div>
        `;
        return;
    }

    filesGrid.innerHTML = files.map(file => createFileCard(file)).join('');

    // Add event listeners to download and delete buttons
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadFile(btn.dataset.key, btn.dataset.name);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteFile(btn.dataset.key, btn.dataset.name);
        });
    });
}

// Create File Card
function createFileCard(file) {
    const fileName = file.key.split('/').pop();
    const fileSize = formatFileSize(file.size);
    const fileDate = new Date(file.last_modified).toLocaleDateString('ru-RU');
    const fileExt = fileName.split('.').pop().toLowerCase();

    return `
        <div class="file-card">
            <div class="file-header">
                <div class="file-icon">
                    ${getFileIcon(fileExt)}
                </div>
                <div class="file-info">
                    <div class="file-name" title="${fileName}">${fileName}</div>
                    <div class="file-meta">${fileSize} • ${fileDate}</div>
                </div>
            </div>
            <div class="file-actions">
                <button class="btn-icon btn-download" data-key="${file.key}" data-name="${fileName}" title="Скачать">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
                <button class="btn-icon delete btn-delete" data-key="${file.key}" data-name="${fileName}" title="Удалить">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// Download File
async function downloadFile(fileKey, fileName) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/files/download?file_key=${encodeURIComponent(fileKey)}`);
        if (!response.ok) {
            throw new Error('Ошибка скачивания');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast(`Файл ${fileName} скачан`, 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast(`Ошибка скачивания ${fileName}`, 'error');
    }
}

// Delete File
async function deleteFile(fileKey, fileName) {
    if (!confirm(`Удалить файл ${fileName}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/files/delete?file_key=${encodeURIComponent(fileKey)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Ошибка удаления');
        }

        showToast(`Файл ${fileName} удален`, 'success');
        loadFiles();
    } catch (error) {
        console.error('Delete error:', error);
        showToast(`Ошибка удаления ${fileName}`, 'error');
    }
}

// Check Health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health/ready`);
        const data = await response.json();

        if (data.s3_connection) {
            statusBadge.classList.remove('offline');
            statusBadge.querySelector('.status-text').textContent = 'Подключено';
        } else {
            statusBadge.classList.add('offline');
            statusBadge.querySelector('.status-text').textContent = 'Нет подключения к S3';
        }
    } catch (error) {
        statusBadge.classList.add('offline');
        statusBadge.querySelector('.status-text').textContent = 'Офлайн';
    }
}

// Helper Functions
function showLoading() {
    filesGrid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Загрузка файлов...</p>
        </div>
    `;
}

function showError(message) {
    filesGrid.innerHTML = `
        <div class="loading">
            <p style="color: var(--danger);">${message}</p>
        </div>
    `;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getFileIcon(ext) {
    const iconMap = {
        'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'svg': 'image',
        'pdf': 'file-text',
        'doc': 'file-text', 'docx': 'file-text', 'txt': 'file-text',
        'zip': 'archive', 'rar': 'archive', 'tar': 'archive', 'gz': 'archive',
        'mp4': 'video', 'avi': 'video', 'mov': 'video',
        'mp3': 'music', 'wav': 'music',
    };

    const iconType = iconMap[ext] || 'file';

    const icons = {
        'image': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
        'archive': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>',
        'video': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
        'music': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
        'file': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>'
    };

    return icons[iconType];
}
