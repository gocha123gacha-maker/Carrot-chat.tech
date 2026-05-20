// ============ ЧАТЫ ============
async function loadChats() {
    const snap = await database.ref(`users/${currentUser.username}/chats`).get();
    const userChats = snap.val() || { general: true };
    allChats = [];
    
    allChats.push({ 
        id: 'general', 
        name: 'Общий чат', 
        type: 'general', 
        icon: '🌍',
        path: 'messages/general'
    });
    
    for (const chatId in userChats) {
        if (chatId !== 'general' && !chatId.startsWith('group_')) {
            const userCheck = await database.ref(`users/${chatId}`).get();
            if (userCheck.exists()) {
                const avatar = await getUserAvatar(chatId);
                const sorted = [currentUser.username, chatId].sort();
                const path = `messages/private_${sorted[0]}_${sorted[1]}`;
                allChats.push({ 
                    id: chatId,
                    name: chatId, 
                    type: 'private', 
                    icon: avatar,
                    path: path,
                    otherUser: chatId
                });
            }
        }
    }
    
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
        // Цвет имени для личных чатов (асинхронно добавим после рендера)
        let nameColorStyle = '';
        let nameColorClass = '';
        
        html += `<div class="chat-item ${currentChat.id === chat.id ? 'active' : ''}" 
                       data-chat-id="${chat.id}" 
                       data-chat-type="${chat.type}"
                       data-chat-path="${chat.path}"
                       data-chat-name="${chat.name}"
                       data-chat-other="${chat.otherUser || ''}">
            <div class="chat-avatar">${chat.icon}</div>
            <div class="chat-info">
                <div class="chat-name" style="${nameColorStyle}" data-username="${chat.otherUser || ''}">${escapeHtml(chat.name)}</div>
                <div class="chat-preview">${chat.type === 'general' ? 'Общий чат' : (chat.type === 'group' ? 'Группа' : 'Личный чат')}</div>
            </div>
            ${chat.type === 'group' ? `<button class="delete-group-btn" data-group-id="${chat.id}" style="background:none;border:none;font-size:18px;cursor:pointer;">🗑️</button>` : ''}
        </div>`;
    }
    chatsList.innerHTML = html;
    
    // Асинхронно добавляем цвета имен для личных чатов
    document.querySelectorAll('.chat-item[data-chat-type="private"] .chat-name').forEach(async (nameEl) => {
        const username = nameEl.dataset.username;
        if (username) {
            const hasCarrot = await hasCarrotAvatar(username);
            if (hasCarrot) {
                const userColor = await getUserColor(username);
                if (userColor === 'rainbow') {
                    nameEl.classList.add('rainbow-name');
                } else if (userColor) {
                    nameEl.style.color = userColor;
                } else {
                    nameEl.classList.add('rainbow-name');
                }
            }
        }
    });
    
    document.querySelectorAll('.chat-item').forEach(el => {
        const chat = allChats.find(c => c.id === el.dataset.chatId);
        if (chat) {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-group-btn')) return;
                currentChat = chat;
                currentChatName.textContent = chat.name;
                chatTypeIcon.textContent = chat.icon;
                document.getElementById('groupSettingsBtn').style.display = chat.type === 'group' ? 'block' : 'none';
                
                if (window.messageListenerPath) {
                    database.ref(window.messageListenerPath).off();
                    window.messageListenerPath = null;
                }
                
                loadMessages();
                showChat();
            });
        }
    });
    
    document.querySelectorAll('.delete-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const groupId = btn.dataset.groupId;
            const group = allChats.find(c => c.id === groupId);
            if (group && group.type === 'group') {
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

// ============ СООБЩЕНИЯ ============
let currentMessagesListener = null;

async function loadMessages() {
    if (!currentChat || !currentChat.path) return;
    
    if (currentMessagesListener) {
        database.ref(currentMessagesListener).off();
        currentMessagesListener = null;
    }
    
    messagesArea.innerHTML = '<div style="text-align:center;padding:20px;">Загрузка...</div>';
    
    const path = currentChat.path;
    
    try {
        const snap = await database.ref(path).get();
        const msgs = snap.val();
        
        if (msgs && Object.keys(msgs).length) {
            const messagesArray = Object.entries(msgs).map(([id, msg]) => ({ id, ...msg }))
                .sort((a, b) => a.timestamp - b.timestamp);
            displayMessages(messagesArray);
        } else {
            messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">✨ Нет сообщений. Напишите первым! 🥕</div>';
        }
        
        currentMessagesListener = path;
        database.ref(path).on('child_added', (data) => {
            const msg = data.val();
            if (!msg) return;
            if (messagesArea.querySelector(`[data-msg-id="${data.key}"]`)) return;
            addSingleMessage(msg, data.key);
        });
        
        database.ref(path).on('child_removed', (data) => {
            const el = messagesArea.querySelector(`[data-msg-id="${data.key}"]`);
            if (el) el.remove();
        });
        
    } catch(e) {
        console.error("Ошибка:", e);
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#dc3545;">❌ Ошибка загрузки</div>';
    }
}

function displayMessages(messages) {
    if (!messagesArea) return;
    if (!messages.length) {
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">✨ Нет сообщений. Напишите первым! 🥕</div>';
        return;
    }
    
    let html = '';
    for (const msg of messages) {
        const isOwn = msg.sender === currentUser.username;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageText = msg.text || '';
        
        let avatarHtml = isOwn ? '👤' : '👤';
        let nameStyle = '';
        let nameClass = '';
        
        if (!isOwn) {
            setTimeout(async () => {
                const avatar = await getUserAvatar(msg.sender);
                const hasCarrot = await hasCarrotAvatar(msg.sender);
                const userColor = await getUserColor(msg.sender);
                
                const avatarDiv = document.querySelector(`.message[data-msg-id="${msg.id}"] .message-avatar`);
                if (avatarDiv) avatarDiv.textContent = avatar;
                
                const nameSpan = document.querySelector(`.message[data-msg-id="${msg.id}"] .message-info span`);
                if (nameSpan && hasCarrot) {
                    if (userColor === 'rainbow') {
                        nameSpan.classList.add('rainbow-name');
                    } else if (userColor) {
                        nameSpan.style.color = userColor;
                    } else {
                        nameSpan.classList.add('rainbow-name');
                    }
                }
            }, 10);
        }
        
        html += `<div class="message ${isOwn ? 'own' : 'other'}" data-msg-id="${msg.id}">
            <div class="message-avatar">${avatarHtml}</div>
            <div class="message-content">
                <div class="message-info">
                    <span class="${nameClass}" style="${nameStyle}">${escapeHtml(msg.sender)}</span> • ${time}
                    ${msg.edited ? ' <span style="font-size:9px;">(изменено)</span>' : ''}
                </div>
                <div class="message-text">${escapeHtml(messageText)}</div>
                ${messageText ? `<button class="speak-btn" data-text="${escapeHtml(messageText)}" style="background:none;border:none;font-size:12px;cursor:pointer;margin-top:6px;opacity:0.6;display:inline-flex;align-items:center;gap:4px;">🔊 Озвучить</button>` : ''}
            </div>
        </div>`;
    }
    messagesArea.innerHTML = html;
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    document.querySelectorAll('.message.own').forEach(el => {
        el.addEventListener('dblclick', () => {
            const msgId = el.dataset.msgId;
            const textEl = el.querySelector('.message-text');
            if (textEl && textEl.textContent) {
                showEditModal(msgId, textEl.textContent);
            }
        });
    });
    
    document.querySelectorAll('.speak-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = btn.dataset.text;
            if (text) speakText(text);
        });
    });
}

function addSingleMessage(msg, msgId) {
    const isOwn = msg.sender === currentUser.username;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageText = msg.text || '';
    
    let avatarHtml = isOwn ? '👤' : '👤';
    let nameStyle = '';
    let nameClass = '';
    
    if (!isOwn) {
        setTimeout(async () => {
            const avatar = await getUserAvatar(msg.sender);
            const hasCarrot = await hasCarrotAvatar(msg.sender);
            const userColor = await getUserColor(msg.sender);
            
            const avatarDiv = document.querySelector(`.message[data-msg-id="${msgId}"] .message-avatar`);
            if (avatarDiv) avatarDiv.textContent = avatar;
            
            const nameSpan = document.querySelector(`.message[data-msg-id="${msgId}"] .message-info span`);
            if (nameSpan && hasCarrot) {
                if (userColor === 'rainbow') {
                    nameSpan.classList.add('rainbow-name');
                } else if (userColor) {
                    nameSpan.style.color = userColor;
                } else {
                    nameSpan.classList.add('rainbow-name');
                }
            }
        }, 10);
    }
    
    const html = `<div class="message ${isOwn ? 'own' : 'other'}" data-msg-id="${msgId}">
        <div class="message-avatar">${avatarHtml}</div>
        <div class="message-content">
            <div class="message-info">
                <span class="${nameClass}" style="${nameStyle}">${escapeHtml(msg.sender)}</span> • ${time}
            </div>
            <div class="message-text">${escapeHtml(messageText)}</div>
            ${messageText ? `<button class="speak-btn" data-text="${escapeHtml(messageText)}" style="background:none;border:none;font-size:12px;cursor:pointer;margin-top:6px;opacity:0.6;display:inline-flex;align-items:center;gap:4px;">🔊 Озвучить</button>` : ''}
        </div>
    </div>`;
    
    messagesArea.insertAdjacentHTML('beforeend', html);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    if (isOwn && messageText) {
        const newEl = messagesArea.lastElementChild;
        newEl.addEventListener('dblclick', () => showEditModal(msgId, messageText));
    }
}

function speakText(text) {
    if (!text) return;
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
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

console.log("✅ script4.js загружен");