document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在主页面
    if (window.location.pathname.includes('index.html')) {
        // 检查是否已登录
        currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            // 如果未登录，重定向到登录页面
            window.location.href = 'login.html';
        }
    }
});

let currentUser = null;

// 登录功能
function login(role) {
    currentUser = role;
    localStorage.setItem('currentUser', role);
    window.location.href = 'index.html';
}

// 添加新便签
function showAddNoteDialog() {
    const dialog = document.createElement('div');
    dialog.className = `add-note-dialog ${currentUser}`;
    dialog.innerHTML = `
        <div class="dialog-content">
            <textarea id="noteContent" placeholder="写下你想说的话..."></textarea>
            <div class="button-group">
                <input type="file" id="fileInput" accept="image/*,audio/*,.pdf,.doc,.docx" style="display: none;">
                <button onclick="document.getElementById('fileInput').click()">添加文件</button>
                <button id="recordButton" onclick="toggleRecording()">录音</button>
                <button onclick="addNoteWithAttachments()">保存</button>
                <button onclick="closeDialog()">取消</button>
            </div>
            <div id="previewArea"></div>
        </div>
    `;
    document.body.appendChild(dialog);

    // 添加文件上传监听
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        // 处理图片
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewArea = document.getElementById('previewArea');
            previewArea.innerHTML = `<img src="${e.target.result}" class="attachment-preview">`;
            previewArea.dataset.attachment = e.target.result;
            previewArea.dataset.attachmentType = 'image';
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('audio/')) {
        // 处理音频
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewArea = document.getElementById('previewArea');
            previewArea.innerHTML = `<audio controls src="${e.target.result}" class="audio-player"></audio>`;
            previewArea.dataset.attachment = e.target.result;
            previewArea.dataset.attachmentType = 'audio';
        };
        reader.readAsDataURL(file);
    }
}

// 关闭对话框
function closeDialog() {
    const dialog = document.querySelector('.add-note-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// 保存便签
function addNote(content, attachments = []) {
    if (!content && (!attachments || attachments.length === 0)) {
        alert('请输入内容或添加附件！');
        return;
    }

    const note = {
        id: Date.now(),
        content: content,
        attachments: attachments,
        timestamp: new Date(),
        user: currentUser
    };
    
    saveToLocalStorage(note);
    renderNote(note);
    closeDialog();
}

// 保存到本地存储
function saveToLocalStorage(note) {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.push(note);
    try {
        localStorage.setItem('notes', JSON.stringify(notes));
    } catch (e) {
        alert('存储空间不足，已自动删除较早的记录');
        notes.splice(0, Math.floor(notes.length / 2)); // 删除一半旧记录
        notes.push(note);
        localStorage.setItem('notes', JSON.stringify(notes));
    }
}

// 压缩图片
function compressImage(base64String) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64String;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 计算压缩后的尺寸，最大宽度为1200像素
            let width = img.width;
            let height = img.height;
            if (width > 1200) {
                height = Math.floor(height * 1200 / width);
                width = 1200;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制压缩后的图片
            ctx.drawImage(img, 0, 0, width, height);
            
            // 压缩质量为0.8，提高一点图片质量
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
    });
}

// 渲染便签
function renderNote(note) {
    const noteElement = document.createElement('div');
    noteElement.className = `note ${note.user}-note`;
    noteElement.draggable = true;
    noteElement.dataset.noteId = note.id;
    
    // 添加拖拽事件监听
    noteElement.addEventListener('dragstart', handleDragStart);
    noteElement.addEventListener('dragend', handleDragEnd);
    
    // 设置随机旋转角度
    const rotation = (Math.random() * 3 - 1.5);
    noteElement.style.setProperty('--random-rotate', `${rotation}deg`);
    
    let content = '';
    // 如果只有文字，使用较小的容器
    if (note.content && !note.attachment) {
        content = `<div class="note-content" style="max-width: 200px;">${note.content}</div>`;
    } else if (!note.content && note.attachment) {
        // 如果只有图片，让图片占主导
        content = `<div class="note-content"></div>`;
    } else {
        // 如果既有文字又有图片，使用较大的容器
        content = `<div class="note-content">${note.content}</div>`;
    }
    
    let attachmentHtml = '';
    if (note.attachment) {
        if (note.attachmentType === 'image') {
            attachmentHtml = `
                <div class="image-container">
                    <img src="${note.attachment}" class="attachment-preview" onclick="showFullImage(this.src)">
                </div>`;
        } else if (note.attachmentType === 'audio') {
            attachmentHtml = `<audio controls src="${note.attachment}" class="audio-player"></audio>`;
        }
    }

    noteElement.innerHTML = `
        ${content}
        ${attachmentHtml}
        <button class="delete-button" onclick="deleteNote(${note.id})">×</button>
    `;
    
    const messageBoard = document.getElementById('messageBoard');
    const dateDivider = getOrCreateDateDivider(note.timestamp);
    messageBoard.insertBefore(noteElement, dateDivider.nextSibling);
}

// 格式化日期
function formatDate(date) {
    date = new Date(date);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 获取或创建日期分割线
function getOrCreateDateDivider(timestamp) {
    const date = new Date(timestamp);
    const dateStr = formatDate(date);
    
    let divider = Array.from(document.getElementsByClassName('date-divider'))
        .find(div => div.textContent === dateStr);
    
    if (!divider) {
        divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.textContent = dateStr;
        
        const messageBoard = document.getElementById('messageBoard');
        
        // 找到正确的插入位置
        const notes = Array.from(messageBoard.children);
        let insertPosition = null;
        
        for (let element of notes) {
            if (element.classList.contains('date-divider')) {
                const elementDate = new Date(element.textContent.replace(/[年月日]/g, '/'));
                if (date > elementDate) {
                    insertPosition = element;
                    break;
                }
            }
        }
        
        if (insertPosition) {
            messageBoard.insertBefore(divider, insertPosition);
        } else {
            messageBoard.appendChild(divider);
        }
    }
    
    return divider;
}

// 删除便签
function deleteNote(noteId) {
    if (confirm('确定要删除这条留言吗？')) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const updatedNotes = notes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(updatedNotes));
        renderAllNotes();
    }
}

// 渲染所有便签
function renderAllNotes() {
    const messageBoard = document.getElementById('messageBoard');
    messageBoard.innerHTML = ''; // 清空现有内容
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    notes.forEach(note => renderNote(note));
}

// 录音相关变量
let mediaRecorder = null;
let audioChunks = [];

// 切换录音状态
async function toggleRecording() {
    const recordButton = document.getElementById('recordButton');
    const previewArea = document.getElementById('previewArea');
    
    if (!mediaRecorder) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                previewArea.innerHTML = `<audio controls src="${audioUrl}" class="audio-player"></audio>`;
                previewArea.dataset.attachment = audioUrl;
                previewArea.dataset.attachmentType = 'audio';
            };
            
            mediaRecorder.start();
            recordButton.textContent = '停止录音';
            recordButton.classList.add('recording');
        } catch (err) {
            alert('无法访问麦克风：' + err.message);
        }
    } else {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorder = null;
        recordButton.textContent = '录音';
        recordButton.classList.remove('recording');
    }
}

// 页面加载时渲染所有便签
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('index.html')) {
        currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
        } else {
            renderAllNotes();
        }
    }
});

// 导出功能
function exportNotes() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    // 导出为JSON文件
    const blob = new Blob([JSON.stringify(notes)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '家庭留言板备份.json';
    a.click();
}

// 导入功能
function importNotes(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const notes = JSON.parse(e.target.result);
        localStorage.setItem('notes', JSON.stringify(notes));
        renderAllNotes();
    };
    reader.readAsText(file);
}

// 添加带附件的便签
function addNoteWithAttachments() {
    const content = document.getElementById('noteContent').value;
    const previewArea = document.getElementById('previewArea');
    const attachment = previewArea.dataset.attachment;
    const attachmentType = previewArea.dataset.attachmentType;

    if (!content && !attachment) {
        alert('请输入内容或添加附件！');
        return;
    }

    const note = {
        id: Date.now(),
        content: content,
        attachment: attachment,
        attachmentType: attachmentType,
        timestamp: new Date(),
        user: currentUser
    };
    
    saveToLocalStorage(note);
    renderNote(note);
    closeDialog();
}

// 添加清理旧记录的功能
function clearOldNotes() {
    if (confirm('是否清理一个月前的记录？')) {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const filteredNotes = notes.filter(note => 
            new Date(note.timestamp) > oneMonthAgo
        );
        
        localStorage.setItem('notes', JSON.stringify(filteredNotes));
        renderAllNotes();
        alert('清理完成');
    }
}

// 添加图片放大功能
function showFullImage(src) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `<img src="${src}">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
    
    // 添加 ESC 键关闭功能
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// 添加拖拽相关的函数
let draggedNote = null;

function handleDragStart(e) {
    draggedNote = this;
    this.style.opacity = '0.4';
    this.classList.add('dragging');
    
    // 添加拖拽效果
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.noteId);
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    this.classList.remove('dragging');
    
    // 移除所有拖拽相关的临时样式
    document.querySelectorAll('.note').forEach(note => {
        note.classList.remove('drag-over');
    });
}

// 在页面加载时添加留言板的拖拽事件监听
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('index.html')) {
        const messageBoard = document.getElementById('messageBoard');
        
        messageBoard.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingNote = document.querySelector('.dragging');
            if (!draggingNote) return;
            
            const afterElement = getDragAfterElement(messageBoard, e.clientY);
            if (afterElement == null) {
                messageBoard.appendChild(draggingNote);
            } else {
                messageBoard.insertBefore(draggingNote, afterElement);
            }
        });
        
        messageBoard.addEventListener('drop', function(e) {
            e.preventDefault();
            const draggingNote = document.querySelector('.dragging');
            if (draggingNote) {
                draggingNote.style.opacity = '1';
                saveNotesOrder();
            }
        });
    }
});

// 获取拖拽位置后的元素
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.note:not(.dragging):not(.date-divider)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 保存便签顺序
function saveNotesOrder() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const newOrder = Array.from(document.querySelectorAll('.note'))
        .map(note => note.dataset.noteId)
        .map(id => notes.find(note => note.id.toString() === id));
    
    localStorage.setItem('notes', JSON.stringify(newOrder));
} 