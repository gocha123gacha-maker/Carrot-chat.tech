// ============ ЧАТЫ ============
async function loadChats() {
    const snap = await database.ref(`users/${currentUser.username}/chats`).get();
    const userChats = snap.val() || { general: true };
    allChats = [];
    
    // Всегда добавляем общий чат
    allChats.push({ 
        id: 'general', 
        name: 'Общий чат', 
        type: 'general', 
        icon: '🌍',
        path: 'messages/general'
    });
    
    // Добавляем личные чаты
    for (const chatId in userChats) {
        if (chatId !== 'general' && !chatId.startsWith('group_')) {
            const userCheck = await database.ref(`users/${chatId}`).get();
            if (userCheck.exists()) {
                const sorted = [currentUser.username, chatId].sort();
                const path = `messages/private_${sorted[0]}_${sorted[1]}`;
                allChats.push({ 
                    id: chatId,
                    name: chatId, 
                    type: 'private', 
                    icon: '💬',
                    path: path,
                    otherUser: chatId
                });
            }
        }
    }
    
    // Добавляем группы
    for (const chatId in userChats) {
        if (chatId.startsWith('group_')) {
            const groupSnap = await database.ref(`groups/${chatId}`).get();
            if (groupSnap.exists()) {
                allChats.push({ 
                    id: chatId, 
                    name: groupSnap.val().name, 
                    type: 'group', 
                    icon: '👥',
                    path: `messages/${chatId}`
                });
            }
        }
    }
    
    renderChats();
}

function renderChats(chats = null) {
    if (!chatsList) return;
    const list = chats || allChats;
    let html = '';
    
    for (const chat of list) {
        html += `<div class="chat-item ${currentChat.id === chat.id ? 'active' : ''}" 
                       data-chat-id="${chat.id}" 
                       data-chat-type="${chat.type}"
                       data-chat-path="${chat.path}"
                       data-chat-name="${chat.name}"
                       data-chat-other="${chat.otherUser || ''}">
            <div class="chat-avatar">${chat.icon}</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.name)}</div>
                <div class="chat-preview">${chat.type === 'general' ? 'Общий чат' : (chat.type === 'group' ? 'Группа' : 'Личный чат')}</div>
            </div>
            ${chat.type === 'group' ? `<button class="delete-group-btn" data-group-id="${chat.id}" style="background:none;border:none;font-size:18px;cursor:pointer;">🗑️</button>` : ''}
        </div>`;
    }
    chatsList.innerHTML = html;
    
    document.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-group-btn')) return;
            
            const chatId = el.dataset.chatId;
            const chat = allChats.find(c => c.id === chatId);
            if (chat) {
                currentChat = chat;
                currentChatName.textContent = chat.name;
                chatTypeIcon.textContent = chat.icon;
                document.getElementById('groupSettingsBtn').style.display = chat.type === 'group' ? 'block' : 'none';
                
                if (window.messageListenerPath) {
                    database.ref(window.messageListenerPath).off();
                    window.messageListenerPath = null;
                }
                
                loadMessages();
                renderChats();
                showChat();
            }
        });
    });
    
    document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const groupId = btn.dataset.groupId;
            const group = allChats.find(c => c.id === groupId);
            if (group) {
                showConfirm(`Удалить группу "${group.name}"?`, async () => {
                    await deleteGroup(groupId);
                });
            }
        });
    });
}

async function deleteGroup(groupId) {
    const groupSnap = await database.ref(`groups/${groupId}`).get();
    if (!groupSnap.exists()) return;
    const members = groupSnap.val().members || {};
    for (const member in members) {
        await database.ref(`users/${member}/chats/${groupId}`).remove();
    }
    await database.ref(`messages/${groupId}`).remove();
    await database.ref(`groups/${groupId}`).remove();
    showNotification(`Группа удалена`);
    if (currentChat.id === groupId) {
        currentChat = allChats.find(c => c.id === 'general');
        await loadMessages();
    }
    await loadChats();
}

// ============ СООБЩЕНИЯ (С ГОВОРИЛКОЙ) ============
async function loadMessages() {
    if (!currentChat || !currentChat.path) return;
    
    if (window.messageListenerPath) {
        database.ref(window.messageListenerPath).off();
        window.messageListenerPath = null;
    }
    
    messagesArea.innerHTML = '<div style="text-align:center;padding:20px;">Загрузка...</div>';
    
    const path = currentChat.path;
    console.log("📂 Загрузка сообщений из:", path);
    
    try {
        const snap = await database.ref(path).get();
        const messages = snap.val();
        
        if (messages && Object.keys(messages).length) {
            const messagesArray = Object.entries(messages)
                .map(([id, msg]) => ({ id, ...msg }))
                .sort((a, b) => a.timestamp - b.timestamp);
            renderMessages(messagesArray);
        } else {
            messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">✨ Нет сообщений. Напишите первым! 🥕</div>';
        }
        
        window.messageListenerPath = path;
        database.ref(path).on('child_added', (data) => {
            const msg = data.val();
            if (!msg) return;
            if (messagesArea.querySelector(`[data-mid="${data.key}"]`)) return;
            appendMessage(msg, data.key);
        });
        
        database.ref(path).on('child_removed', (data) => {
            const el = messagesArea.querySelector(`[data-mid="${data.key}"]`);
            if (el) el.remove();
        });
        
        database.ref(path).on('child_changed', (data) => {
            const msg = data.val();
            const el = messagesArea.querySelector(`[data-mid="${data.key}"]`);
            if (el && msg.text) {
                const textDiv = el.querySelector('.message-text');
                if (textDiv) textDiv.innerHTML = escapeHtml(msg.text);
            }
        });
        
    } catch(e) {
        console.error("Ошибка:", e);
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#dc3545;">❌ Ошибка загрузки</div>';
    }
}

// Функция для озвучивания текста
function speakText(text) {
    if (!text) return;
    
    // Останавливаем текущее воспроизведение
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
    console.log("🔊 Озвучивание:", text.substring(0, 50));
}

function renderMessages(messages) {
    if (!messagesArea) return;
    if (!messages.length) {
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">✨ Нет сообщений. Напишите первым! 🥕</div>';
        return;
    }
    
    let html = '';
    for (const msg of messages) {
        html += createMessageHTML(msg);
    }
    messagesArea.innerHTML = html;
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Обработчики для своих сообщений (редактирование)
    document.querySelectorAll('.message.own').forEach(el => {
        el.addEventListener('dblclick', () => {
            const msgId = el.dataset.mid;
            const textEl = el.querySelector('.message-text');
            if (textEl && textEl.textContent) {
                showEditModal(msgId, textEl.textContent);
            }
        });
    });
    
    // Обработчики для кнопок говорилки
    document.querySelectorAll('.speak-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = btn.dataset.text;
            if (text) speakText(text);
        });
    });
}

function createMessageHTML(msg) {
    const isOwn = msg.sender === currentUser.username;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = msg.text || '';
    
    return `<div class="message ${isOwn ? 'own' : 'other'}" data-mid="${msg.id}">
        <div class="message-avatar">${isOwn ? '👤' : '👤'}</div>
        <div class="message-content">
            <div class="message-info">${escapeHtml(msg.sender)} • ${time}${msg.edited ? ' <span style="font-size:9px;">(изменено)</span>' : ''}</div>
            <div class="message-text">${escapeHtml(messageText)}</div>
            ${messageText ? `<button class="speak-btn" data-text="${escapeHtml(messageText)}" style="background:none;border:none;font-size:14px;cursor:pointer;margin-top:4px;opacity:0.6;">🔊 Озвучить</button>` : ''}
        </div>
    </div>`;
}

function appendMessage(msg, msgId) {
    const isOwn = msg.sender === currentUser.username;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = msg.text || '';
    
    const html = `<div class="message ${isOwn ? 'own' : 'other'}" data-mid="${msgId}">
        <div class="message-avatar">${isOwn ? '👤' : '👤'}</div>
        <div class="message-content">
            <div class="message-info">${escapeHtml(msg.sender)} • ${time}</div>
            <div class="message-text">${escapeHtml(messageText)}</div>
            ${messageText ? `<button class="speak-btn" data-text="${escapeHtml(messageText)}" style="background:none;border:none;font-size:14px;cursor:pointer;margin-top:4px;opacity:0.6;">🔊 Озвучить</button>` : ''}
        </div>
    </div>`;
    
    messagesArea.insertAdjacentHTML('beforeend', html);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Добавляем обработчик для кнопки говорилки
    const newEl = messagesArea.lastElementChild;
    const speakBtn = newEl.querySelector('.speak-btn');
    if (speakBtn) {
        speakBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = speakBtn.dataset.text;
            if (text) speakText(text);
        });
    }
    
    // Добавляем обработчик для своего сообщения (редактирование)
    if (isOwn && messageText) {
        newEl.addEventListener('dblclick', () => showEditModal(msgId, messageText));
    }
}

function showEditModal(msgId, currentText) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:350px;">
            <div class="modal-header">
                <h3>✏️ Редактировать</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <textarea id="editMsgText" class="input-field" style="width:100%; min-height:80px; resize:none; padding:10px;">${escapeHtml(currentText)}</textarea>
            </div>
            <div class="modal-footer">
                <button id="saveMsgEdit" class="btn-primary">Сохранить</button>
                <button id="deleteMsg" class="btn-danger">Удалить</button>
                <button class="btn-secondary close-btn">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    modal.querySelector('.close').onclick = closeModal;
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.getElementById('saveMsgEdit').onclick = async () => {
        const newText = document.getElementById('editMsgText').value.trim();
        if (!newText) {
            showNotification('Сообщение не может быть пустым', true);
            return;
        }
        
        const path = currentChat.path;
        await database.ref(`${path}/${msgId}`).update({
            text: newText,
            edited: true,
            editedAt: Date.now()
        });
        
        closeModal();
        showNotification('✅ Сообщение изменено');
        await loadMessages();
    };
    
    document.getElementById('deleteMsg').onclick = async () => {
        closeModal();
        showConfirm('🗑️ Удалить сообщение?', async () => {
            const path = currentChat.path;
            await database.ref(`${path}/${msgId}`).remove();
            showNotification('✅ Сообщение удалено');
            await loadMessages();
        });
    };
}

// Отправка текстового сообщения
document.getElementById('sendBtn').addEventListener('click', async () => {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat || !currentChat.path) return;
    
    if (currentChat.type === 'private') {
        const other = currentChat.otherUser || currentChat.id;
        if (await isUserBlocked(other)) {
            showNotification(`⚠️ Пользователь ${other} заблокирован!`, true);
            input.value = '';
            return;
        }
    }
    
    const path = currentChat.path;
    await database.ref(path).push({
        text: text,
        sender: currentUser.username,
        timestamp: Date.now()
    });
    input.value = '';
});

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('sendBtn').click();
});

console.log("✅ script4.js загружен (с говорилкой)");