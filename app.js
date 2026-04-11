import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getDatabase, ref, set, get, push, onChildAdded, update, remove, onChildRemoved, onChildChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCnHM0qm3abbaReu-DDbFg51JoRiHgOpVI",
    authDomain: "chat-f3df6.firebaseapp.com",
    databaseURL: "https://chat-f3df6-default-rtdb.firebaseio.com",
    projectId: "chat-f3df6",
    storageBucket: "chat-f3df6.firebasestorage.app",
    messagingSenderId: "973935585421",
    appId: "1:973935585421:web:d77cf62ffc22696f8c1ac4",
    measurementId: "G-YXHZXYDY69"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentUser = null;
let currentChat = { id: 'general', name: 'Общий чат', type: 'general', icon: '🌍' };
let allChats = [];
let messagesListener = null;
let messagesRef = null;

const authScreen = document.getElementById('authScreen');
const messengerScreen = document.getElementById('messengerScreen');
const chatsList = document.getElementById('chatsList');
const messagesArea = document.getElementById('messages');
const currentChatName = document.getElementById('currentChatName');
const currentUserName = document.getElementById('currentUserName');
const chatTypeIcon = document.getElementById('chatTypeIcon');
const chatsPanel = document.getElementById('chatsPanel');
const chatPanel = document.getElementById('chatPanel');

function showChats() {
    if (window.innerWidth < 768) {
        if (chatsPanel) chatsPanel.classList.add('active');
        if (chatPanel) chatPanel.classList.remove('active');
    }
}

function showChat() {
    if (window.innerWidth < 768) {
        if (chatsPanel) chatsPanel.classList.remove('active');
        if (chatPanel) chatPanel.classList.add('active');
    }
}

const backBtn = document.getElementById('backToChatsBtn');
if (backBtn) backBtn.addEventListener('click', showChats);

function showNotification(message, isError = false) {
    const modal = document.getElementById('notificationModal');
    if (!modal) return;
    document.getElementById('notificationTitle').textContent = isError ? 'Ошибка' : 'Успех';
    document.getElementById('notificationIcon').textContent = isError ? '❌' : '✅';
    document.getElementById('notificationMessage').textContent = message;
    modal.style.display = 'flex';
}

function showConfirm(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    document.getElementById('confirmMessage').textContent = message;
    modal.style.display = 'flex';
    
    const confirmBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    
    const handleConfirm = () => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        onConfirm();
    };
    const handleCancel = () => {
        modal.style.display = 'none';
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
}

document.querySelectorAll('.close, .close-btn').forEach(el => {
    el.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.style.display = 'none';
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(`${btn.dataset.tab}Form`).classList.add('active');
    });
});

// Проверка, заблокирован ли пользователь
async function isUserBlocked(username) {
    try {
        const blockedRef = ref(database, `blocked/${username}`);
        const snapshot = await get(blockedRef);
        return snapshot.val() === true;
    } catch (e) {
        return false;
    }
}

// Функция входа с проверкой блокировки
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginName').value.trim();
    const password = document.getElementById('loginPass').value;
    document.getElementById('loginError').textContent = '';
    
    try {
        // Проверяем существование пользователя
        const userRef = ref(database, `users/${username}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            document.getElementById('loginError').textContent = 'Неверное имя или пароль';
            return;
        }
        
        // Проверяем пароль
        if (snapshot.val().password !== password) {
            document.getElementById('loginError').textContent = 'Неверное имя или пароль';
            return;
        }
        
        // ПРОВЕРКА НА БЛОКИРОВКУ
        const blocked = await isUserBlocked(username);
        if (blocked) {
            document.getElementById('loginError').textContent = '❌ Ваш аккаунт заблокирован администратором. Обратитесь к администратору.';
            return;
        }
        
        // Вход разрешён
        currentUser = { username, ...snapshot.val() };
        localStorage.setItem('currentUser', username);
        await loadMessenger();
        
    } catch (error) {
        document.getElementById('loginError').textContent = 'Ошибка подключения';
    }
});

// Регистрация (без изменений)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regName').value.trim();
    const password = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    document.getElementById('regError').textContent = '';
    
    if (!username || !password) {
        document.getElementById('regError').textContent = 'Заполните все поля';
        return;
    }
    if (password !== confirm) {
        document.getElementById('regError').textContent = 'Пароли не совпадают';
        return;
    }
    if (password.length < 3) {
        document.getElementById('regError').textContent = 'Пароль минимум 3 символа';
        return;
    }
    
    try {
        const userRef = ref(database, `users/${username}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            document.getElementById('regError').textContent = 'Имя уже занято';
            return;
        }
        await set(userRef, {
            username: username,
            password: password,
            chats: { general: true },
            createdAt: Date.now()
        });
        showNotification('Регистрация успешна! Теперь войдите.');
        document.getElementById('regName').value = '';
        document.getElementById('regPass').value = '';
        document.getElementById('regConfirmPass').value = '';
        document.querySelector('.tab-btn[data-tab="login"]').click();
    } catch (error) {
        document.getElementById('regError').textContent = 'Ошибка: ' + error.message;
    }
});

async function loadMessenger() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && !currentUser) {
        const userRef = ref(database, `users/${savedUser}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            // Дополнительная проверка при загрузке
            const blocked = await isUserBlocked(savedUser);
            if (blocked) {
                localStorage.removeItem('currentUser');
                showNotification('Ваш аккаунт был заблокирован', true);
                authScreen.style.display = 'flex';
                messengerScreen.style.display = 'none';
                return;
            }
            currentUser = { username: savedUser, ...snapshot.val() };
        }
    }
    if (!currentUser) return;
    
    authScreen.style.display = 'none';
    messengerScreen.style.display = 'block';
    currentUserName.textContent = currentUser.username;
    
    await loadChats();
    await loadMessages();
    if (window.innerWidth < 768) showChats();
    
    document.getElementById('searchChats').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        const filtered = allChats.filter(chat => chat.name.toLowerCase().includes(search));
        renderChats(filtered);
    });
}

// Экспорт для админки
window.currentUserGetter = () => currentUser;
window.showNotification = showNotification;
window.database = database;
window.isUserBlocked = isUserBlocked;
async function loadChats() {
    const userRef = ref(database, `users/${currentUser.username}/chats`);
    const snapshot = await get(userRef);
    const userChats = snapshot.val() || { general: true };
    allChats = [];
    allChats.push({ id: 'general', name: 'Общий чат', type: 'general', icon: '🌍' });
    
    for (const [chatId, value] of Object.entries(userChats)) {
        if (chatId !== 'general' && !chatId.startsWith('group_')) {
            const userCheck = await get(ref(database, `users/${chatId}`));
            if (userCheck.exists()) {
                const sortedId = [currentUser.username, chatId].sort().join('_');
                allChats.push({ id: sortedId, originalId: chatId, name: chatId, type: 'private', icon: '💬', with: chatId });
            } else {
                await remove(ref(database, `users/${currentUser.username}/chats/${chatId}`));
            }
        }
    }
    
    for (const [chatId, value] of Object.entries(userChats)) {
        if (chatId.startsWith('group_')) {
            const groupRef = ref(database, `groups/${chatId}`);
            const groupSnap = await get(groupRef);
            if (groupSnap.exists()) {
                allChats.push({ id: chatId, name: groupSnap.val().name, type: 'group', icon: '👥', data: groupSnap.val() });
            }
        }
    }
    renderChats();
}

function renderChats(chats = null) {
    if (!chatsList) return;
    const list = chats || allChats;
    chatsList.innerHTML = list.map(chat => `
        <div class="chat-item ${currentChat.id === chat.id ? 'active' : ''}" data-chat-id="${chat.id}" data-chat-type="${chat.type}" data-chat-name="${chat.name}">
            <div class="chat-avatar">${chat.icon}</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(chat.name)}</div>
                <div class="chat-preview">${chat.type === 'general' ? 'Общий чат' : (chat.type === 'group' ? 'Группа' : 'Личный чат')}</div>
            </div>
            ${chat.type === 'group' ? `<button class="delete-group-btn" data-group-id="${chat.id}" style="background:none; border:none; font-size:18px; cursor:pointer; opacity:0.5;">🗑️</button>` : ''}
        </div>
    `).join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        const chatId = el.dataset.chatId;
        const chat = allChats.find(c => c.id === chatId);
        if (chat) {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-group-btn')) return;
                currentChat = chat;
                currentChatName.textContent = chat.name;
                chatTypeIcon.textContent = chat.icon;
                document.getElementById('groupSettingsBtn').style.display = chat.type === 'group' ? 'block' : 'none';
                loadMessages();
                renderChats();
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
                showConfirm(`Вы уверены, что хотите удалить группу "${group.name}"? Это действие необратимо.`, async () => {
                    await deleteGroup(groupId);
                });
            }
        });
    });
}

async function deleteGroup(groupId) {
    const groupRef = ref(database, `groups/${groupId}`);
    const groupSnap = await get(groupRef);
    const groupData = groupSnap.val();
    if (!groupData) return;
    
    const members = groupData.members || {};
    for (const member of Object.keys(members)) {
        await remove(ref(database, `users/${member}/chats/${groupId}`));
    }
    await remove(ref(database, `messages/${groupId}`));
    await remove(groupRef);
    showNotification(`Группа "${groupData.name}" удалена`);
    
    if (currentChat.id === groupId) {
        currentChat = { id: 'general', name: 'Общий чат', type: 'general', icon: '🌍' };
        currentChatName.textContent = 'Общий чат';
        chatTypeIcon.textContent = '🌍';
        document.getElementById('groupSettingsBtn').style.display = 'none';
        await loadMessages();
    }
    await loadChats();
}

async function loadMessages() {
    if (!currentChat) return;
    if (messagesListener) messagesListener();
    if (messagesRef) messagesRef = null;
    
    messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Загрузка...</div>';
    
    let messagesPath = `messages/${currentChat.id}`;
    if (currentChat.type === 'private' && currentChat.originalId) {
        const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
        messagesPath = `messages/private_${sortedId}`;
        currentChat.id = messagesPath.replace('messages/', '');
    }
    
    try {
        messagesRef = ref(database, messagesPath);
        const snapshot = await get(messagesRef);
        const messages = snapshot.val();
        
        if (messages && Object.keys(messages).length > 0) {
            const messagesArray = Object.entries(messages).map(([id, msg]) => ({ id, ...msg })).sort((a, b) => a.timestamp - b.timestamp);
            displayMessages(messagesArray);
        } else {
            messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Нет сообщений. Напишите первым! 🥕</div>';
        }
        setupRealtimeMessages(messagesPath);
    } catch (error) {
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Ошибка загрузки</div>';
    }
}

function displayMessages(messages) {
    if (!messagesArea) return;
    if (!messages || !messages.length) {
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Нет сообщений. Напишите первым! 🥕</div>';
        return;
    }
    
    messagesArea.innerHTML = messages.map(msg => `
        <div class="message ${msg.sender === currentUser.username ? 'own' : 'other'}" data-message-id="${msg.id}" data-message-text="${escapeHtml(msg.text)}">
            <div class="message-info">
                ${escapeHtml(msg.sender)} • ${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                ${msg.edited ? '<span style="font-size:9px; opacity:0.6;"> (изменено)</span>' : ''}
            </div>
            <div class="message-text">${escapeHtml(msg.text)}</div>
        </div>
    `).join('');
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    document.querySelectorAll('.message.own').forEach(msgEl => {
        msgEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            const messageId = msgEl.dataset.messageId;
            const currentText = msgEl.dataset.messageText;
            showEditMessageModal(messageId, currentText);
        });
    });
}

function showEditMessageModal(messageId, currentText) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 350px;">
            <div class="modal-header">
                <h3>✏️ Редактировать сообщение</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <textarea id="editMessageText" class="input-field" style="width:100%; min-height:80px; resize:none; padding:10px;">${escapeHtml(currentText)}</textarea>
            </div>
            <div class="modal-footer">
                <button id="saveEditBtn" class="btn-primary">Сохранить</button>
                <button id="deleteMsgBtn" class="btn-danger">Удалить</button>
                <button class="btn-secondary close-btn">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    modal.querySelector('.close').onclick = closeModal;
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.getElementById('saveEditBtn').onclick = async () => {
        const newText = document.getElementById('editMessageText').value.trim();
        if (!newText) {
            showNotification('Сообщение не может быть пустым', true);
            return;
        }
        
        let messagesPath = `messages/${currentChat.id}`;
        if (currentChat.type === 'private' && currentChat.originalId) {
            const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
            messagesPath = `messages/private_${sortedId}`;
        }
        
        const msgRef = ref(database, `${messagesPath}/${messageId}`);
        await update(msgRef, {
            text: newText,
            edited: true,
            editedAt: Date.now()
        });
        closeModal();
        showNotification('Сообщение изменено');
        await loadMessages();
    };
    
    document.getElementById('deleteMsgBtn').onclick = async () => {
        closeModal();
        showConfirm('Удалить это сообщение?', async () => {
            let messagesPath = `messages/${currentChat.id}`;
            if (currentChat.type === 'private' && currentChat.originalId) {
                const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
                messagesPath = `messages/private_${sortedId}`;
            }
            const msgRef = ref(database, `${messagesPath}/${messageId}`);
            await remove(msgRef);
            showNotification('Сообщение удалено');
            await loadMessages();
        });
    };
}

function setupRealtimeMessages(messagesPath) {
    if (!messagesPath) return;
    const msgRef = ref(database, messagesPath);
    
    messagesListener = onChildAdded(msgRef, (data) => {
        const msg = data.val();
        const existing = document.querySelector(`.message[data-message-id="${data.key}"]`);
        if (!existing && currentChat.id === messagesPath.replace('messages/', '')) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.sender === currentUser.username ? 'own' : 'other'}`;
            messageDiv.dataset.messageId = data.key;
            messageDiv.dataset.messageText = msg.text;
            messageDiv.innerHTML = `
                <div class="message-info">
                    ${escapeHtml(msg.sender)} • ${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    ${msg.edited ? '<span style="font-size:9px; opacity:0.6;"> (изменено)</span>' : ''}
                </div>
                <div class="message-text">${escapeHtml(msg.text)}</div>
            `;
            messagesArea.appendChild(messageDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            if (msg.sender === currentUser.username) {
                messageDiv.addEventListener('dblclick', () => {
                    showEditMessageModal(data.key, msg.text);
                });
            }
        }
    });
    
    onChildChanged(msgRef, (data) => {
        const msg = data.val();
        const msgElement = document.querySelector(`.message[data-message-id="${data.key}"]`);
        if (msgElement && currentChat.id === messagesPath.replace('messages/', '')) {
            const infoDiv = msgElement.querySelector('.message-info');
            const textDiv = msgElement.querySelector('.message-text');
            if (infoDiv) {
                infoDiv.innerHTML = `${escapeHtml(msg.sender)} • ${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}${msg.edited ? '<span style="font-size:9px; opacity:0.6;"> (изменено)</span>' : ''}`;
            }
            if (textDiv) textDiv.innerHTML = escapeHtml(msg.text);
            msgElement.dataset.messageText = msg.text;
        }
    });
    
    onChildRemoved(msgRef, (data) => {
        const msgElement = document.querySelector(`.message[data-message-id="${data.key}"]`);
        if (msgElement) msgElement.remove();
    });
}

// Проверка, может ли пользователь отправлять сообщения заблокированному
async function canSendMessageToUser(targetUsername) {
    const isTargetBlocked = await isUserBlocked(targetUsername);
    if (isTargetBlocked) {
        showNotification(`Пользователь ${targetUsername} заблокирован администратором! Сообщение не отправлено.`, true);
        return false;
    }
    return true;
}

document.getElementById('sendBtn').addEventListener('click', async () => {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    
    // Проверка блокировки для личных чатов
    if (currentChat.type === 'private') {
        const otherUser = currentChat.originalId || currentChat.name;
        const canSend = await canSendMessageToUser(otherUser);
        if (!canSend) {
            input.value = '';
            return;
        }
    }
    
    let messagesPath = `messages/${currentChat.id}`;
    if (currentChat.type === 'private') {
        const otherUser = currentChat.originalId || currentChat.name;
        const sortedId = [currentUser.username, otherUser].sort().join('_');
        messagesPath = `messages/private_${sortedId}`;
    }
    
    const messagesRefDb = ref(database, messagesPath);
    await push(messagesRefDb, {
        text: text,
        sender: currentUser.username,
        timestamp: Date.now()
    });
    input.value = '';
});

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('sendBtn').click();
});
const addChatBtn = document.getElementById('addChatBtn');
if (addChatBtn) {
    addChatBtn.addEventListener('click', () => {
        document.getElementById('addChatModal').style.display = 'flex';
        document.getElementById('addChatError').textContent = '';
        document.getElementById('chatUserName').value = '';
    });
}

const confirmAddChat = document.getElementById('confirmAddChat');
if (confirmAddChat) {
    confirmAddChat.addEventListener('click', async () => {
        const username = document.getElementById('chatUserName').value.trim();
        const errorEl = document.getElementById('addChatError');
        if (!username) {
            errorEl.textContent = 'Введите имя пользователя';
            return;
        }
        if (username === currentUser.username) {
            errorEl.textContent = 'Нельзя добавить самого себя';
            return;
        }
        
        // Проверка на блокировку добавляемого пользователя
        const isBlocked = await isUserBlocked(username);
        if (isBlocked) {
            errorEl.textContent = 'Нельзя добавить заблокированного пользователя';
            return;
        }
        
        const userRef = ref(database, `users/${username}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            errorEl.textContent = 'Пользователь не найден';
            return;
        }
        await set(ref(database, `users/${currentUser.username}/chats/${username}`), true);
        await set(ref(database, `users/${username}/chats/${currentUser.username}`), true);
        document.getElementById('addChatModal').style.display = 'none';
        await loadChats();
        showNotification(`Чат с ${username} добавлен!`);
    });
}

const createGroupBtn = document.getElementById('createGroupBtn');
if (createGroupBtn) {
    createGroupBtn.addEventListener('click', () => {
        document.getElementById('createGroupModal').style.display = 'flex';
        document.getElementById('createGroupError').textContent = '';
        document.getElementById('groupNameInput').value = '';
    });
}

const confirmCreateGroup = document.getElementById('confirmCreateGroup');
if (confirmCreateGroup) {
    confirmCreateGroup.addEventListener('click', async () => {
        const groupName = document.getElementById('groupNameInput').value.trim();
        if (!groupName) {
            document.getElementById('createGroupError').textContent = 'Введите название группы';
            return;
        }
        const groupId = `group_${Date.now()}`;
        await set(ref(database, `groups/${groupId}`), {
            name: groupName,
            members: { [currentUser.username]: true },
            createdBy: currentUser.username,
            createdAt: Date.now()
        });
        await set(ref(database, `users/${currentUser.username}/chats/${groupId}`), true);
        document.getElementById('createGroupModal').style.display = 'none';
        await loadChats();
        showNotification(`Группа "${groupName}" создана!`);
    });
}

const groupSettingsBtn = document.getElementById('groupSettingsBtn');
if (groupSettingsBtn) {
    groupSettingsBtn.addEventListener('click', async () => {
        if (currentChat.type !== 'group') return;
        const groupRef = ref(database, `groups/${currentChat.id}`);
        const snapshot = await get(groupRef);
        const groupData = snapshot.val();
        const members = groupData?.members || {};
        
        const isCreator = groupData?.createdBy === currentUser.username;
        const isAdmin = currentUser.username === "Кева✓";
        
        document.getElementById('membersList').innerHTML = Object.keys(members).map(m => `<div class="member-item">👤 ${escapeHtml(m)}</div>`).join('');
        
        const modalBody = document.querySelector('#groupModal .modal-body');
        let deleteGroupBtn = document.getElementById('modalDeleteGroupBtn');
        if ((isCreator || isAdmin) && !deleteGroupBtn) {
            const btn = document.createElement('button');
            btn.id = 'modalDeleteGroupBtn';
            btn.className = 'btn-danger';
            btn.style.width = '100%';
            btn.style.marginTop = '15px';
            btn.innerHTML = '🗑️ Удалить группу';
            btn.onclick = () => {
                document.getElementById('groupModal').style.display = 'none';
                showConfirm(`Вы уверены, что хотите удалить группу "${currentChat.name}"?`, async () => {
                    await deleteGroup(currentChat.id);
                });
            };
            modalBody.appendChild(btn);
        } else if ((!isCreator && !isAdmin) && deleteGroupBtn) {
            deleteGroupBtn.remove();
        }
        
        document.getElementById('groupModal').style.display = 'flex';
    });
}

const openAddMemberModal = document.getElementById('openAddMemberModal');
if (openAddMemberModal) {
    openAddMemberModal.addEventListener('click', () => {
        document.getElementById('groupModal').style.display = 'none';
        document.getElementById('addMemberModal').style.display = 'flex';
        document.getElementById('addMemberError').textContent = '';
        document.getElementById('memberName').value = '';
    });
}

const confirmAddMember = document.getElementById('confirmAddMember');
if (confirmAddMember) {
    confirmAddMember.addEventListener('click', async () => {
        const memberName = document.getElementById('memberName').value.trim();
        if (!memberName) {
            document.getElementById('addMemberError').textContent = 'Введите имя';
            return;
        }
        
        // Проверка на блокировку добавляемого пользователя
        const isBlocked = await isUserBlocked(memberName);
        if (isBlocked) {
            document.getElementById('addMemberError').textContent = 'Нельзя добавить заблокированного пользователя';
            return;
        }
        
        const userRef = ref(database, `users/${memberName}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            document.getElementById('addMemberError').textContent = 'Пользователь не найден';
            return;
        }
        await set(ref(database, `groups/${currentChat.id}/members/${memberName}`), true);
        await set(ref(database, `users/${memberName}/chats/${currentChat.id}`), true);
        document.getElementById('addMemberModal').style.display = 'none';
        showNotification(`${memberName} добавлен в группу!`);
    });
}

const profileBtn = document.getElementById('profileBtn');
if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        document.getElementById('profileModal').style.display = 'flex';
        document.getElementById('profileError').textContent = '';
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    });
}

const changePasswordBtn = document.getElementById('changePasswordBtn');
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', async () => {
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        const errorEl = document.getElementById('profileError');
        if (!current || !newPass) {
            errorEl.textContent = 'Заполните все поля';
            return;
        }
        if (newPass !== confirm) {
            errorEl.textContent = 'Новые пароли не совпадают';
            return;
        }
        if (newPass.length < 3) {
            errorEl.textContent = 'Пароль минимум 3 символа';
            return;
        }
        const userRef = ref(database, `users/${currentUser.username}`);
        const snapshot = await get(userRef);
        if (snapshot.val().password !== current) {
            errorEl.textContent = 'Неверный текущий пароль';
            return;
        }
        await update(userRef, { password: newPass });
        showNotification('Пароль изменён!');
        document.getElementById('profileModal').style.display = 'none';
    });
}

const deleteAccountBtn = document.getElementById('deleteAccountBtn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
        document.getElementById('profileModal').style.display = 'none';
        showConfirm('Вы уверены? Аккаунт будет удалён навсегда!', async () => {
            await remove(ref(database, `users/${currentUser.username}`));
            localStorage.removeItem('currentUser');
            showNotification('Аккаунт удалён');
            setTimeout(() => location.reload(), 1500);
        });
    });
}

const profileModalBody = document.querySelector('#profileModal .modal-body');
if (profileModalBody && !document.getElementById('logoutBtn')) {
    const logoutSection = document.createElement('div');
    logoutSection.className = 'profile-section';
    logoutSection.style.marginTop = '12px';
    logoutSection.style.borderColor = '#ff6b35';
    logoutSection.innerHTML = `
        <h4>🚪 Выход</h4>
        <button id="logoutBtn" class="btn-primary" style="background: #ff6b35; width: 100%;">Выйти из аккаунта</button>
    `;
    profileModalBody.appendChild(logoutSection);
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        showConfirm('Вы уверены, что хотите выйти?', () => {
            localStorage.removeItem('currentUser');
            currentUser = null;
            closeAllModals();
            authScreen.style.display = 'flex';
            messengerScreen.style.display = 'none';
            document.getElementById('loginName').value = '';
            document.getElementById('loginPass').value = '';
            document.querySelector('.tab-btn[data-tab="login"]').click();
            showNotification('Вы вышли из аккаунта');
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        if (chatsPanel) chatsPanel.classList.add('active');
        if (chatPanel) chatPanel.classList.add('active');
    }
});

// Экспорт глобальных переменных для админки
window.currentUser = currentUser;
window.database = database;
window.currentUserGetter = () => currentUser;
window.isUserBlocked = isUserBlocked;

// Обновляем глобальный объект при изменении currentUser
Object.defineProperty(window, 'currentUser', {
    get: () => currentUser,
    set: (val) => { currentUser = val; }
});

if (localStorage.getItem('currentUser')) {
    loadMessenger();
}