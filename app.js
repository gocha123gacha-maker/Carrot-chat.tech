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

let shopPrices = { '🥔':10, '🍅':20, '🥒':36, '🫜':47, '🫛':58, '🫑':500, '🥗':100, '🍄‍🟫':120, '🥕':1000 };

const authScreen = document.getElementById('authScreen');
const messengerScreen = document.getElementById('messengerScreen');
const chatsList = document.getElementById('chatsList');
const messagesArea = document.getElementById('messages');
const currentChatName = document.getElementById('currentChatName');
const currentUserName = document.getElementById('currentUserName');
const chatTypeIcon = document.getElementById('chatTypeIcon');
const chatsPanel = document.getElementById('chatsPanel');
const chatPanel = document.getElementById('chatPanel');
const userAvatar = document.getElementById('userAvatar');

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

function showNotification(msg, isError = false) {
    const modal = document.getElementById('notificationModal');
    if (!modal) return;
    document.getElementById('notificationTitle').textContent = isError ? 'Ошибка' : 'Успех';
    document.getElementById('notificationIcon').textContent = isError ? '❌' : '✅';
    document.getElementById('notificationMessage').textContent = msg;
    modal.style.display = 'flex';
}

function showConfirm(msg, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    document.getElementById('confirmMessage').textContent = msg;
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

async function getUserBalance(username) {
    const snap = await get(ref(database, `balances/${username}`));
    return snap.val() || 0;
}

async function updateUserBalance(username, newBalance) {
    await set(ref(database, `balances/${username}`), newBalance);
}

async function addCoins(username, amount) {
    const current = await getUserBalance(username);
    await updateUserBalance(username, current + amount);
}

async function removeCoins(username, amount) {
    const current = await getUserBalance(username);
    if (current >= amount) {
        await updateUserBalance(username, current - amount);
        return true;
    }
    return false;
}

async function transferCoins(fromUser, toUser, amount) {
    const fromBalance = await getUserBalance(fromUser);
    if (fromBalance >= amount) {
        await updateUserBalance(fromUser, fromBalance - amount);
        const toBalance = await getUserBalance(toUser);
        await updateUserBalance(toUser, toBalance + amount);
        return true;
    }
    return false;
}

async function getUserAvatar(username) {
    const snap = await get(ref(database, `avatars/${username}`));
    return snap.val() || '🥜';
}

async function setUserAvatar(username, avatar) {
    await set(ref(database, `avatars/${username}`), avatar);
}

async function getUserOwnedAvatars(username) {
    const snap = await get(ref(database, `ownedAvatars/${username}`));
    return snap.val() || { '🥜': true };
}

async function addOwnedAvatar(username, avatar) {
    const owned = await getUserOwnedAvatars(username);
    owned[avatar] = true;
    await set(ref(database, `ownedAvatars/${username}`), owned);
}

async function loadShopPrices() {
    const snap = await get(ref(database, 'shopPrices'));
    if (snap.exists()) {
        shopPrices = snap.val();
    } else {
        await set(ref(database, 'shopPrices'), shopPrices);
    }
}

async function isUserBlocked(username) {
    const snap = await get(ref(database, `blocked/${username}`));
    return snap.val() === true;
}

async function hasCarrotAvatar(username) {
    const avatar = await getUserAvatar(username);
    return avatar === '🥕';
}

async function updateRainbowName() {
    if (!currentUserName) return;
    const hasCarrot = await hasCarrotAvatar(currentUser.username);
    if (hasCarrot) {
        currentUserName.classList.add('rainbow');
    } else {
        currentUserName.classList.remove('rainbow');
    }
}

async function purchaseAvatar(username, avatar) {
    const price = shopPrices[avatar];
    if (!price) return false;
    const balance = await getUserBalance(username);
    const owned = await getUserOwnedAvatars(username);
    if (owned[avatar]) {
        await setUserAvatar(username, avatar);
        showNotification(`Аватарка ${avatar} надета!`);
        return true;
    }
    if (balance >= price) {
        await removeCoins(username, price);
        await addOwnedAvatar(username, avatar);
        await setUserAvatar(username, avatar);
        showNotification(`Вы купили и надели ${avatar} за ${price} 🥕!`);
        return true;
    } else {
        showNotification(`Недостаточно 🥕! Нужно ${price}`, true);
        return false;
    }
}
// ============ АВТОРИЗАЦИЯ ============

const tabBtns = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (tabBtns.length) {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabName = btn.dataset.tab;
            if (tabName === 'login') {
                if (loginForm) loginForm.classList.add('active');
                if (registerForm) registerForm.classList.remove('active');
            } else if (tabName === 'register') {
                if (loginForm) loginForm.classList.remove('active');
                if (registerForm) registerForm.classList.add('active');
            }
        });
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginName').value.trim();
        const password = document.getElementById('loginPass').value;
        const errorEl = document.getElementById('loginError');
        if (errorEl) errorEl.textContent = '';
        
        if (!username || !password) {
            if (errorEl) errorEl.textContent = 'Заполните все поля';
            return;
        }
        
        try {
            const snap = await get(ref(database, `users/${username}`));
            if (!snap.exists()) {
                if (errorEl) errorEl.textContent = 'Неверное имя или пароль';
                return;
            }
            if (snap.val().password !== password) {
                if (errorEl) errorEl.textContent = 'Неверное имя или пароль';
                return;
            }
            const blocked = await isUserBlocked(username);
            if (blocked) {
                if (errorEl) errorEl.textContent = '❌ Аккаунт заблокирован';
                return;
            }
            currentUser = { username, ...snap.val() };
            localStorage.setItem('currentUser', username);
            await loadMessenger();
        } catch (error) {
            if (errorEl) errorEl.textContent = 'Ошибка подключения';
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regName').value.trim();
        const password = document.getElementById('regPass').value;
        const confirm = document.getElementById('regConfirmPass').value;
        const errorEl = document.getElementById('regError');
        if (errorEl) errorEl.textContent = '';
        
        if (!username || !password) {
            if (errorEl) errorEl.textContent = 'Заполните все поля';
            return;
        }
        if (password !== confirm) {
            if (errorEl) errorEl.textContent = 'Пароли не совпадают';
            return;
        }
        if (password.length < 3) {
            if (errorEl) errorEl.textContent = 'Пароль минимум 3 символа';
            return;
        }
        
        try {
            const exists = await get(ref(database, `users/${username}`));
            if (exists.exists()) {
                if (errorEl) errorEl.textContent = 'Имя уже занято';
                return;
            }
            await set(ref(database, `users/${username}`), { 
                username, 
                password, 
                chats: { general: true }, 
                createdAt: Date.now() 
            });
            await updateUserBalance(username, 5);
            await set(ref(database, `ownedAvatars/${username}`), { '🥜': true });
            await setUserAvatar(username, '🥜');
            showNotification('Регистрация успешна! Вы получили 5 🥕 бонусом!');
            document.getElementById('regName').value = '';
            document.getElementById('regPass').value = '';
            document.getElementById('regConfirmPass').value = '';
            const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
            if (loginTab) loginTab.click();
        } catch (error) {
            if (errorEl) errorEl.textContent = 'Ошибка: ' + error.message;
        }
    });
}

async function loadMessenger() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && !currentUser) {
        const snap = await get(ref(database, `users/${savedUser}`));
        if (snap.exists()) {
            const blocked = await isUserBlocked(savedUser);
            if (blocked) {
                localStorage.removeItem('currentUser');
                showNotification('Аккаунт заблокирован', true);
                authScreen.style.display = 'flex';
                messengerScreen.style.display = 'none';
                return;
            }
            currentUser = { username: savedUser, ...snap.val() };
        }
    }
    if (!currentUser) return;
    
    await loadShopPrices();
    authScreen.style.display = 'none';
    messengerScreen.style.display = 'block';
    currentUserName.textContent = currentUser.username;
    const avatar = await getUserAvatar(currentUser.username);
    if (userAvatar) userAvatar.textContent = avatar;
    await updateRainbowName();
    await loadChats();
    await loadMessages();
    if (window.innerWidth < 768) showChats();
    
    const searchInput = document.getElementById('searchChats');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => { 
            const search = e.target.value.toLowerCase(); 
            const filtered = allChats.filter(chat => chat.name.toLowerCase().includes(search)); 
            renderChats(filtered); 
        });
    }
}

async function loadChats() {
    const snap = await get(ref(database, `users/${currentUser.username}/chats`));
    const userChats = snap.val() || { general: true };
    allChats = [{ id: 'general', name: 'Общий чат', type: 'general', icon: '🌍' }];
    
    for (const [chatId, v] of Object.entries(userChats)) {
        if (chatId !== 'general' && !chatId.startsWith('group_')) {
            if ((await get(ref(database, `users/${chatId}`))).exists()) {
                const sortedId = [currentUser.username, chatId].sort().join('_');
                allChats.push({ id: sortedId, originalId: chatId, name: chatId, type: 'private', icon: '💬', with: chatId });
            } else {
                await remove(ref(database, `users/${currentUser.username}/chats/${chatId}`));
            }
        }
    }
    
    for (const [chatId, v] of Object.entries(userChats)) {
        if (chatId.startsWith('group_')) {
            const groupSnap = await get(ref(database, `groups/${chatId}`));
            if (groupSnap.exists()) {
                allChats.push({ id: chatId, name: groupSnap.val().name, type: 'group', icon: '👥', data: groupSnap.val() });
            }
        }
    }
    renderChats();
}

async function renderChats(chats = null) {
    if (!chatsList) return;
    const list = chats || allChats;
    let items = [];
    
    for (const chat of list) {
        let avatarIcon = chat.icon;
        if (chat.type === 'private') {
            avatarIcon = await getUserAvatar(chat.originalId || chat.name);
        }
        items.push(`<div class="chat-item ${currentChat.id === chat.id ? 'active' : ''}" data-chat-id="${chat.id}" data-chat-type="${chat.type}"><div class="chat-avatar">${avatarIcon}</div><div class="chat-info"><div class="chat-name">${escapeHtml(chat.name)}</div><div class="chat-preview">${chat.type === 'general' ? 'Общий чат' : (chat.type === 'group' ? 'Группа' : 'Личный чат')}</div></div>${chat.type === 'group' ? `<button class="delete-group-btn" data-group-id="${chat.id}" style="background:none;border:none;font-size:18px;cursor:pointer;">🗑️</button>` : ''}</div>`);
    }
    chatsList.innerHTML = items.join('');
    
    document.querySelectorAll('.chat-item').forEach(el => {
        const chat = allChats.find(c => c.id === el.dataset.chatId);
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
            const group = allChats.find(c => c.id === btn.dataset.groupId);
            if (group && group.type === 'group') {
                showConfirm(`Удалить группу "${group.name}"?`, async () => await deleteGroup(group.id));
            }
        });
    });
}

async function deleteGroup(groupId) {
    const groupSnap = await get(ref(database, `groups/${groupId}`));
    if (!groupSnap.exists()) return;
    const members = groupSnap.val().members || {};
    for (const member of Object.keys(members)) {
        await remove(ref(database, `users/${member}/chats/${groupId}`));
    }
    await remove(ref(database, `messages/${groupId}`));
    await remove(ref(database, `groups/${groupId}`));
    showNotification(`Группа удалена`);
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
    messagesArea.innerHTML = '<div style="text-align:center;padding:20px;">Загрузка...</div>';
    
    let path = `messages/${currentChat.id}`;
    if (currentChat.type === 'private' && currentChat.originalId) {
        const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
        path = `messages/private_${sortedId}`;
        currentChat.id = path.replace('messages/', '');
    }
    
    try {
        const snap = await get(ref(database, path));
        const msgs = snap.val();
        if (msgs && Object.keys(msgs).length) {
            const arr = Object.entries(msgs).map(([id, msg]) => ({ id, ...msg })).sort((a,b) => a.timestamp - b.timestamp);
            await displayMessages(arr);
        } else {
            messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Нет сообщений. Напишите первым! 🥕</div>';
        }
        setupRealtimeMessages(path);
    } catch(e) {
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Ошибка загрузки</div>';
    }
}

async function displayMessages(messages) {
    if (!messagesArea || !messages?.length) {
        messagesArea.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Нет сообщений</div>';
        return;
    }
    
    let html = '';
    for (const msg of messages) {
        const isOwn = msg.sender === currentUser.username;
        const time = new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        
        // Голосовое сообщение
        if (msg.type === 'voice' && msg.data) {
            html += `
                <div class="message ${isOwn ? 'own' : 'other'} voice-message" data-voice-id="${msg.id}">
                    <div class="message-avatar">${isOwn ? '👤' : '🎤'}</div>
                    <div class="message-content">
                        <div class="message-info">${escapeHtml(msg.sender)} • ${time}</div>
                        <audio controls src="${msg.data}" style="max-width:200px; height:40px; border-radius:20px;"></audio>
                        <div style="font-size:10px; opacity:0.7;">🎤 Голосовое сообщение</div>
                    </div>
                </div>
            `;
        } 
        // Текстовое сообщение
        else if (msg.text !== undefined) {
            let avatar = '👤', nameColor = '';
            if (msg.sender !== currentUser.username) {
                avatar = await getUserAvatar(msg.sender);
                if (await hasCarrotAvatar(msg.sender)) nameColor = 'rainbow-name';
            }
            html += `<div class="message ${isOwn ? 'own' : 'other'}" data-msg-id="${msg.id}" data-msg-text="${escapeHtml(msg.text||'')}">
                <div class="message-avatar">${isOwn ? '👤' : avatar}</div>
                <div class="message-content">
                    <div class="message-info">
                        <span class="${nameColor}">${escapeHtml(msg.sender)}</span> • ${time}
                        ${msg.edited ? ' <span style="font-size:9px;">(изменено)</span>' : ''}
                    </div>
                    <div class="message-text">${escapeHtml(msg.text||'')}</div>
                </div>
            </div>`;
        }
    }
    messagesArea.innerHTML = html;
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    document.querySelectorAll('.message.own').forEach(el => {
        if (!el.querySelector('.message-text')) return;
        el.addEventListener('dblclick', () => {
            const id = el.dataset.msgId;
            const txt = el.querySelector('.message-text')?.textContent;
            if (txt) showEditModal(id, txt);
        });
    });
}

function showEditModal(msgId, txt) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content" style="max-width:350px;">
        <div class="modal-header"><h3>✏️ Редактировать</h3><span class="close">&times;</span></div>
        <div class="modal-body"><textarea id="editText" class="input-field" style="width:100%;min-height:80px;">${escapeHtml(txt)}</textarea></div>
        <div class="modal-footer">
            <button id="saveEdit" class="btn-primary">Сохранить</button>
            <button id="delMsg" class="btn-danger">Удалить</button>
            <button class="btn-secondary close-btn">Отмена</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    modal.querySelector('.close').onclick = close;
    modal.querySelector('.close-btn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
    
    document.getElementById('saveEdit').onclick = async () => {
        const newText = document.getElementById('editText').value.trim();
        if (!newText) {
            showNotification('Сообщение не может быть пустым', true);
            return;
        }
        let path = `messages/${currentChat.id}`;
        if (currentChat.type === 'private' && currentChat.originalId) {
            const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
            path = `messages/private_${sortedId}`;
        }
        await update(ref(database, `${path}/${msgId}`), { text: newText, edited: true, editedAt: Date.now() });
        close();
        showNotification('Сообщение изменено');
        await loadMessages();
    };
    
    document.getElementById('delMsg').onclick = async () => {
        close();
        showConfirm('Удалить сообщение?', async () => {
            let path = `messages/${currentChat.id}`;
            if (currentChat.type === 'private' && currentChat.originalId) {
                const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
                path = `messages/private_${sortedId}`;
            }
            await remove(ref(database, `${path}/${msgId}`));
            showNotification('Сообщение удалено');
            await loadMessages();
        });
    };
}

function setupRealtimeMessages(path) {
    if (!path) return;
    const msgRef = ref(database, path);
    
    messagesListener = onChildAdded(msgRef, async (data) => {
        const msg = data.val();
        if (document.querySelector(`.message[data-msg-id="${data.key}"]`) || document.querySelector(`.message[data-voice-id="${data.key}"]`)) return;
        
        const isOwn = msg.sender === currentUser.username;
        const time = new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        
        let messageDiv;
        if (msg.type === 'voice' && msg.data) {
            messageDiv = document.createElement('div');
            messageDiv.className = `message ${isOwn ? 'own' : 'other'} voice-message`;
            messageDiv.setAttribute('data-voice-id', data.key);
            messageDiv.innerHTML = `
                <div class="message-avatar">${isOwn ? '👤' : '🎤'}</div>
                <div class="message-content">
                    <div class="message-info">${escapeHtml(msg.sender)} • ${time}</div>
                    <audio controls src="${msg.data}" style="max-width:200px; height:40px; border-radius:20px;"></audio>
                    <div style="font-size:10px; opacity:0.7;">🎤 Голосовое сообщение</div>
                </div>
            `;
        } else if (msg.text !== undefined) {
            let avatar = '👤', nameColor = '';
            if (msg.sender !== currentUser.username) {
                avatar = await getUserAvatar(msg.sender);
                if (await hasCarrotAvatar(msg.sender)) nameColor = 'rainbow-name';
            }
            messageDiv = document.createElement('div');
            messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
            messageDiv.setAttribute('data-msg-id', data.key);
            messageDiv.setAttribute('data-msg-text', msg.text || '');
            messageDiv.innerHTML = `
                <div class="message-avatar">${isOwn ? '👤' : avatar}</div>
                <div class="message-content">
                    <div class="message-info"><span class="${nameColor}">${escapeHtml(msg.sender)}</span> • ${time}${msg.edited ? ' <span style="font-size:9px;">(изменено)</span>' : ''}</div>
                    <div class="message-text">${escapeHtml(msg.text||'')}</div>
                </div>
            `;
            if (msg.sender === currentUser.username && msg.text) {
                messageDiv.addEventListener('dblclick', () => showEditModal(data.key, msg.text));
            }
        } else return;
        
        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
    
    onChildChanged(msgRef, async (data) => {
        const msg = data.val();
        const el = document.querySelector(`.message[data-msg-id="${data.key}"]`);
        if (el && msg.text) {
            const textDiv = el.querySelector('.message-text');
            if (textDiv) textDiv.innerHTML = escapeHtml(msg.text||'');
            el.dataset.msgText = msg.text||'';
        }
    });
    
    onChildRemoved(msgRef, (data) => {
        document.querySelector(`.message[data-msg-id="${data.key}"]`)?.remove();
        document.querySelector(`.message[data-voice-id="${data.key}"]`)?.remove();
    });
}

document.getElementById('sendBtn').addEventListener('click', async () => {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChat) return;
    
    if (currentChat.type === 'private') {
        const other = currentChat.originalId || currentChat.name;
        if (await isUserBlocked(other)) {
            showNotification(`Пользователь ${other} заблокирован!`, true);
            input.value = '';
            return;
        }
    }
    
    let path = `messages/${currentChat.id}`;
    if (currentChat.type === 'private') {
        const other = currentChat.originalId || currentChat.name;
        const sortedId = [currentUser.username, other].sort().join('_');
        path = `messages/private_${sortedId}`;
    }
    
    await push(ref(database, path), { text, sender: currentUser.username, timestamp: Date.now() });
    input.value = '';
});

document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('sendBtn').click();
});

// ============ АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ ГОЛОСОВЫХ ЧЕРЕЗ 4 ДНЯ ============
const VOICE_EXPIRE_DAYS = 4;
const CLEANUP_INTERVAL = 3600000;

async function cleanupOldVoiceMessages() {
    if (!currentUser) return;
    
    const fourDaysAgo = Date.now() - (VOICE_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
    
    const chatsSnap = await get(ref(database, `users/${currentUser.username}/chats`));
    const chats = chatsSnap.val() || {};
    
    for (const chatId of Object.keys(chats)) {
        let path = `messages/${chatId}`;
        if (chatId !== 'general' && !chatId.startsWith('group_')) {
            const sortedId = [currentUser.username, chatId].sort().join('_');
            path = `messages/private_${sortedId}`;
        }
        
        const messagesSnap = await get(ref(database, path));
        const messages = messagesSnap.val();
        
        if (messages) {
            for (const [msgId, msg] of Object.entries(messages)) {
                if (msg.type === 'voice' && msg.timestamp && msg.timestamp < fourDaysAgo) {
                    await remove(ref(database, `${path}/${msgId}`));
                    console.log(`Удалено голосовое сообщение ${msgId} (старше ${VOICE_EXPIRE_DAYS} дней)`);
                }
            }
        }
    }
}

setTimeout(cleanupOldVoiceMessages, 5000);
setInterval(cleanupOldVoiceMessages, CLEANUP_INTERVAL);
// ============ МОРКОВКА+ ПРЕМИУМ СТАТУС ============
let PREMIUM_PRICE = 1500;
const PREMIUM_MONTHLY_FEE = 10;
const PREMIUM_DAILY_BONUS = 1;
const PREMIUM_DELETE_LIMIT = 5;
const PREMIUM_UNLOCK_AVATARS = ['🥔', '🍅', '🥒', '🫜', '🫛'];

let premiumData = null;
let premiumDeleteToday = 0;
let lastPremiumDate = null;

async function loadPremiumPrice() {
    const snap = await get(ref(database, 'premiumPrice'));
    if (snap.exists()) {
        PREMIUM_PRICE = snap.val();
    } else {
        await set(ref(database, 'premiumPrice'), PREMIUM_PRICE);
    }
}

async function loadPremiumStatus() {
    if (!currentUser) return;
    const snap = await get(ref(database, `premium/${currentUser.username}`));
    if (snap.exists()) {
        premiumData = snap.val();
        const today = new Date().toDateString();
        if (premiumData.expireDate && new Date(premiumData.expireDate) < new Date()) {
            await remove(ref(database, `premium/${currentUser.username}`));
            premiumData = null;
            showNotification("⚠️ Срок Морковка+ истёк!", true);
        }
    }
    const today = new Date().toDateString();
    if (lastPremiumDate !== today) {
        premiumDeleteToday = 0;
        lastPremiumDate = today;
    }
}

async function hasPremium() {
    if (!currentUser) return false;
    if (!premiumData) await loadPremiumStatus();
    return premiumData !== null;
}

async function buyPremium() {
    if (await hasPremium()) {
        showNotification("У вас уже есть Морковка+!", true);
        return false;
    }
    const balance = await getUserBalance(currentUser.username);
    if (balance >= PREMIUM_PRICE) {
        await removeCoins(currentUser.username, PREMIUM_PRICE);
        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + 1);
        await set(ref(database, `premium/${currentUser.username}`), {
            activatedAt: new Date().toISOString(),
            expireDate: expireDate.toISOString(),
            monthsLeft: 1
        });
        premiumData = { expireDate: expireDate.toISOString(), monthsLeft: 1 };
        for (const avatar of PREMIUM_UNLOCK_AVATARS) {
            await addOwnedAvatar(currentUser.username, avatar);
        }
        showNotification(`🎉 Вы купили Морковка+ за ${PREMIUM_PRICE} 🥕! Разблокировано ${PREMIUM_UNLOCK_AVATARS.length} аватарок!`);
        return true;
    } else {
        showNotification(`Недостаточно 🥕! Нужно ${PREMIUM_PRICE}`, true);
        return false;
    }
}

async function extendPremiumMonths(months) {
    if (!await hasPremium()) {
        showNotification("У вас нет Морковка+", true);
        return false;
    }
    const totalCost = PREMIUM_MONTHLY_FEE * months;
    const balance = await getUserBalance(currentUser.username);
    if (balance >= totalCost) {
        await removeCoins(currentUser.username, totalCost);
        const newExpire = new Date(premiumData.expireDate);
        newExpire.setMonth(newExpire.getMonth() + months);
        const newMonthsLeft = (premiumData.monthsLeft || 1) + months;
        await update(ref(database, `premium/${currentUser.username}`), {
            expireDate: newExpire.toISOString(),
            monthsLeft: newMonthsLeft
        });
        premiumData.expireDate = newExpire.toISOString();
        premiumData.monthsLeft = newMonthsLeft;
        showNotification(`✅ Морковка+ продлён на ${months} месяц(ев)! Снято ${totalCost} 🥕`);
        return true;
    } else {
        showNotification(`Недостаточно 🥕 для продления! Нужно ${totalCost}`, true);
        return false;
    }
}

function showExtendModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:350px;">
            <div class="modal-header"><h3>🔄 Продление Морковка+</h3><span class="close">&times;</span></div>
            <div class="modal-body" style="text-align:center;">
                <div style="margin-bottom:15px;color:#666;">Выберите срок продления:</div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button class="extend-option" data-months="1" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;cursor:pointer;">1 месяц - ${PREMIUM_MONTHLY_FEE} 🥕</button>
                    <button class="extend-option" data-months="2" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;cursor:pointer;">2 месяца - ${PREMIUM_MONTHLY_FEE*2} 🥕</button>
                    <button class="extend-option" data-months="3" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;cursor:pointer;">3 месяца - ${PREMIUM_MONTHLY_FEE*3} 🥕</button>
                    <button class="extend-option" data-months="4" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;cursor:pointer;">4 месяца - ${PREMIUM_MONTHLY_FEE*4} 🥕</button>
                    <button class="extend-option" data-months="5" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;cursor:pointer;">5 месяцев - ${PREMIUM_MONTHLY_FEE*5} 🥕</button>
                </div>
            </div>
            <div class="modal-footer"><button class="btn-secondary close-btn">Отмена</button></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    modal.querySelector('.close').onclick = closeModal;
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.querySelectorAll('.extend-option').forEach(btn => {
        btn.onclick = async () => {
            await extendPremiumMonths(parseInt(btn.dataset.months));
            closeModal();
            document.getElementById('shopModal').style.display = 'none';
            setTimeout(() => document.getElementById('shopBtn').click(), 100);
        };
    });
}
document.getElementById('shopBtn').addEventListener('click', async () => {
    await loadShopPrices();
    await loadPremiumPrice();
    const balance = await getUserBalance(currentUser.username);
    const owned = await getUserOwnedAvatars(currentUser.username);
    const currentAvatar = await getUserAvatar(currentUser.username);
    const hasPrem = await hasPremium();
    document.getElementById('shopBalance').textContent = balance;
    const items = Object.entries(shopPrices).sort((a,b) => b[1] - a[1]);
    const shopContainer = document.getElementById('shopItems');
    let html = '';
    
    const premStatus = hasPrem ? `✅ Активен до ${new Date(premiumData?.expireDate).toLocaleDateString()}` : "❌ Не куплен";
    const monthsLeft = premiumData?.monthsLeft || 0;
    
    html += `<div class="premium-block" style="margin-bottom:15px;padding:15px;background:linear-gradient(135deg,#fff8e1,#ffe0cc);border-radius:16px;text-align:center;border:2px solid #ff6b35;">
        <div style="font-size:28px;">👑 Морковка+ 👑</div>
        <div style="margin:8px 0;font-weight:bold;">🥕 Цена: ${PREMIUM_PRICE} морковок</div>
        <div style="font-size:12px;color:#666;">➕ Продление: ${PREMIUM_MONTHLY_FEE} 🥕/месяц</div>
        <div style="font-size:12px;color:#666;">✨ Бонус: +1 🥕 каждый день в 12:00</div>
        <div style="font-size:12px;color:#666;">🎨 Разблокировка ${PREMIUM_UNLOCK_AVATARS.length} аватарок</div>
        <div style="font-size:12px;color:#666;">🗑️ Удаление ${PREMIUM_DELETE_LIMIT} чужих сообщений в день</div>
        <div style="margin:10px 0;font-weight:bold;">Статус: ${premStatus}</div>
        ${monthsLeft > 0 ? `<div style="font-size:11px;color:#ff6b35;">📅 Осталось месяцев: ${monthsLeft}</div>` : ''}
        ${!hasPrem ? '<button id="buyPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">💎 Купить Морковка+</button>' : '<button id="extendPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">🔄 Продлить</button>'}
    </div>`;
    
    html += items.map(([av, price]) => {
        const isOwned = owned[av] || (hasPrem && PREMIUM_UNLOCK_AVATARS.includes(av));
        const isCurrent = currentAvatar === av;
        return `<div class="shop-item" data-avatar="${av}" data-price="${price}">
            <div class="shop-item-left">
                <div class="shop-item-emoji">${av}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${getAvatarName(av)}</div>
                    <div class="shop-item-price">🥕 ${price}</div>
                    ${isOwned ? (isCurrent ? '<div class="shop-item-owned">✅ Надета</div>' : '<div class="shop-item-owned">📦 В коллекции</div>') : ''}
                </div>
            </div>
            ${!isOwned ? '<button class="shop-item-buy">Купить</button>' : (isOwned && !isCurrent ? '<button class="shop-item-equip">Надеть</button>' : '')}
        </div>`;
    }).join('');
    
    shopContainer.innerHTML = html;
    document.getElementById('shopModal').style.display = 'flex';
    
    document.getElementById('buyPremiumBtn')?.addEventListener('click', async () => {
        await buyPremium();
        document.getElementById('shopModal').style.display = 'none';
        setTimeout(() => document.getElementById('shopBtn').click(), 100);
    });
    
    document.getElementById('extendPremiumBtn')?.addEventListener('click', () => {
        showExtendModal();
    });
    
    document.querySelectorAll('.shop-item-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const item = btn.closest('.shop-item');
            await purchaseAvatar(currentUser.username, item.dataset.avatar);
            document.getElementById('shopModal').style.display = 'none';
            const newAvatar = await getUserAvatar(currentUser.username);
            if (userAvatar) userAvatar.textContent = newAvatar;
            await updateRainbowName();
        });
    });
    
    document.querySelectorAll('.shop-item-equip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const item = btn.closest('.shop-item');
            const av = item.dataset.avatar;
            await setUserAvatar(currentUser.username, av);
            showNotification(`Аватарка ${av} надета!`);
            document.getElementById('shopModal').style.display = 'none';
            if (userAvatar) userAvatar.textContent = av;
            await updateRainbowName();
        });
    });
});

function getAvatarName(av) {
    const names = { '🥜':'Арахис','🥔':'Картошка','🍅':'Помидор','🥒':'Огурец','🫜':'Редис','🫛':'Горох','🫑':'Перец','🥕':'Морковь','🥗':'Салат','🍄‍🟫':'Гриб' };
    return names[av] || av;
}

document.getElementById('profileBtn').addEventListener('click', async () => {
    document.getElementById('profileBalance').textContent = await getUserBalance(currentUser.username);
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileAvatar').textContent = await getUserAvatar(currentUser.username);
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('profileError').textContent = '';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
});

document.getElementById('sendCoinsBtn').addEventListener('click', () => {
    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('sendCoinsModal').style.display = 'flex';
    document.getElementById('sendCoinsError').textContent = '';
    document.getElementById('recipientName').value = '';
    document.getElementById('coinsAmount').value = '';
});

document.getElementById('confirmSendCoins').addEventListener('click', async () => {
    const recipient = document.getElementById('recipientName').value.trim();
    const amount = parseInt(document.getElementById('coinsAmount').value);
    const err = document.getElementById('sendCoinsError');
    
    if (!recipient) {
        err.textContent = 'Введите имя';
        return;
    }
    if (!amount || amount <= 0) {
        err.textContent = 'Введите сумму';
        return;
    }
    if (recipient === currentUser.username) {
        err.textContent = 'Нельзя себе';
        return;
    }
    if (!(await get(ref(database, `users/${recipient}`))).exists()) {
        err.textContent = 'Пользователь не найден';
        return;
    }
    if (await transferCoins(currentUser.username, recipient, amount)) {
        showNotification(`Переведено ${amount} 🥕 пользователю ${recipient}`);
        document.getElementById('sendCoinsModal').style.display = 'none';
        document.getElementById('profileBalance').textContent = await getUserBalance(currentUser.username);
    } else {
        err.textContent = 'Недостаточно средств';
    }
});

document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const cur = document.getElementById('currentPassword').value;
    const newP = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmPassword').value;
    const err = document.getElementById('profileError');
    
    if (!cur || !newP) {
        err.textContent = 'Заполните все поля';
        return;
    }
    if (newP !== conf) {
        err.textContent = 'Пароли не совпадают';
        return;
    }
    if (newP.length < 3) {
        err.textContent = 'Пароль минимум 3 символа';
        return;
    }
    
    const snap = await get(ref(database, `users/${currentUser.username}`));
    if (snap.val().password !== cur) {
        err.textContent = 'Неверный текущий пароль';
        return;
    }
    await update(ref(database, `users/${currentUser.username}`), { password: newP });
    showNotification('Пароль изменён!');
    document.getElementById('profileModal').style.display = 'none';
});

document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    document.getElementById('profileModal').style.display = 'none';
    showConfirm('Удалить аккаунт навсегда?', async () => {
        await remove(ref(database, `users/${currentUser.username}`));
        await remove(ref(database, `balances/${currentUser.username}`));
        await remove(ref(database, `avatars/${currentUser.username}`));
        await remove(ref(database, `ownedAvatars/${currentUser.username}`));
        await remove(ref(database, `premium/${currentUser.username}`));
        localStorage.removeItem('currentUser');
        showNotification('Аккаунт удалён');
        setTimeout(() => location.reload(), 1500);
    });
});
document.getElementById('addChatBtn').addEventListener('click', () => {
    document.getElementById('addChatModal').style.display = 'flex';
    document.getElementById('addChatError').textContent = '';
    document.getElementById('chatUserName').value = '';
});

document.getElementById('confirmAddChat').addEventListener('click', async () => {
    const username = document.getElementById('chatUserName').value.trim();
    const err = document.getElementById('addChatError');
    
    if (!username) {
        err.textContent = 'Введите имя';
        return;
    }
    if (username === currentUser.username) {
        err.textContent = 'Нельзя добавить себя';
        return;
    }
    if (await isUserBlocked(username)) {
        err.textContent = 'Пользователь заблокирован';
        return;
    }
    if (!(await get(ref(database, `users/${username}`))).exists()) {
        err.textContent = 'Пользователь не найден';
        return;
    }
    await set(ref(database, `users/${currentUser.username}/chats/${username}`), true);
    await set(ref(database, `users/${username}/chats/${currentUser.username}`), true);
    document.getElementById('addChatModal').style.display = 'none';
    await loadChats();
    showNotification(`Чат с ${username} добавлен!`);
});

document.getElementById('createGroupBtn').addEventListener('click', () => {
    document.getElementById('createGroupModal').style.display = 'flex';
    document.getElementById('createGroupError').textContent = '';
    document.getElementById('groupNameInput').value = '';
});

document.getElementById('confirmCreateGroup').addEventListener('click', async () => {
    const name = document.getElementById('groupNameInput').value.trim();
    if (!name) {
        document.getElementById('createGroupError').textContent = 'Введите название';
        return;
    }
    const groupId = `group_${Date.now()}`;
    await set(ref(database, `groups/${groupId}`), {
        name: name,
        members: { [currentUser.username]: true },
        createdBy: currentUser.username,
        createdAt: Date.now()
    });
    await set(ref(database, `users/${currentUser.username}/chats/${groupId}`), true);
    document.getElementById('createGroupModal').style.display = 'none';
    await loadChats();
    showNotification(`Группа "${name}" создана!`);
});

document.getElementById('groupSettingsBtn').addEventListener('click', async () => {
    if (currentChat.type !== 'group') return;
    const snap = await get(ref(database, `groups/${currentChat.id}`));
    const members = snap.val()?.members || {};
    document.getElementById('membersList').innerHTML = Object.keys(members).map(m => `<div class="member-item">👤 ${escapeHtml(m)}</div>`).join('');
    document.getElementById('groupModal').style.display = 'flex';
});

document.getElementById('openAddMemberModal').addEventListener('click', () => {
    document.getElementById('groupModal').style.display = 'none';
    document.getElementById('addMemberModal').style.display = 'flex';
    document.getElementById('addMemberError').textContent = '';
    document.getElementById('memberName').value = '';
});

document.getElementById('confirmAddMember').addEventListener('click', async () => {
    const name = document.getElementById('memberName').value.trim();
    if (!name) {
        document.getElementById('addMemberError').textContent = 'Введите имя';
        return;
    }
    if (await isUserBlocked(name)) {
        document.getElementById('addMemberError').textContent = 'Пользователь заблокирован';
        return;
    }
    if (!(await get(ref(database, `users/${name}`))).exists()) {
        document.getElementById('addMemberError').textContent = 'Пользователь не найден';
        return;
    }
    await set(ref(database, `groups/${currentChat.id}/members/${name}`), true);
    await set(ref(database, `users/${name}/chats/${currentChat.id}`), true);
    document.getElementById('addMemberModal').style.display = 'none';
    showNotification(`${name} добавлен в группу!`);
});

const profileBody = document.querySelector('#profileModal .modal-body');
if (profileBody && !document.getElementById('logoutBtn')) {
    const section = document.createElement('div');
    section.className = 'profile-section';
    section.style.marginTop = '12px';
    section.style.borderColor = '#ff6b35';
    section.innerHTML = `<h4>🚪 Выход</h4><button id="logoutBtn" class="btn-primary" style="background:#ff6b35;width:100%;">Выйти</button>`;
    profileBody.appendChild(section);
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    showConfirm('Выйти из аккаунта?', () => {
        localStorage.removeItem('currentUser');
        currentUser = null;
        closeAllModals();
        authScreen.style.display = 'flex';
        messengerScreen.style.display = 'none';
        document.getElementById('loginName').value = '';
        document.getElementById('loginPass').value = '';
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
        showNotification('Вы вышли');
    });
});

document.addEventListener('dblclick', async (e) => {
    const msgEl = e.target.closest('.message.other');
    if (msgEl && await hasPremium()) {
        const msgId = msgEl.dataset.msgId;
        const sender = msgEl.querySelector('.message-info span')?.textContent || '';
        if (sender && sender !== currentUser.username) {
            showConfirm(`Удалить сообщение от ${sender}?`, async () => {
                let path = `messages/${currentChat.id}`;
                if (currentChat.type === 'private' && currentChat.originalId) {
                    const sortedId = [currentUser.username, currentChat.originalId].sort().join('_');
                    path = `messages/private_${sortedId}`;
                }
                if (premiumDeleteToday >= PREMIUM_DELETE_LIMIT) {
                    showNotification(`Лимит удалений на сегодня (${PREMIUM_DELETE_LIMIT}) исчерпан!`, true);
                    return;
                }
                await remove(ref(database, `${path}/${msgId}`));
                premiumDeleteToday++;
                showNotification(`🗑️ Сообщение удалено! Осталось ${PREMIUM_DELETE_LIMIT - premiumDeleteToday} удалений на сегодня`);
                await loadMessages();
            });
        }
    }
});

function escapeHtml(t) {
    const div = document.createElement('div');
    div.textContent = t;
    return div.innerHTML;
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        if (chatsPanel) chatsPanel.classList.add('active');
        if (chatPanel) chatPanel.classList.add('active');
    }
});

// ============ ЕЖЕДНЕВНАЯ ВЫДАЧА МОРКОВОК ДЛЯ ПРЕМИУМ В 12:00 ============
const DAILY_BONUS = 1;
const BONUS_TIME = 12;

async function checkDailyBonus() {
    if (!currentUser) return;
    const hasPrem = await hasPremium();
    if (!hasPrem) return;
    
    const today = new Date().toDateString();
    const lastBonusRef = ref(database, `lastBonus/${currentUser.username}`);
    const snap = await get(lastBonusRef);
    const lastBonusDate = snap.val();
    
    if (lastBonusDate !== today) {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour >= BONUS_TIME) {
            await addCoins(currentUser.username, DAILY_BONUS);
            await set(lastBonusRef, today);
            showNotification(`🥕 Премиум бонус! Вы получили ${DAILY_BONUS} морковку!`);
        }
    }
}

setInterval(async () => {
    if (currentUser) await checkDailyBonus();
}, 3600000);

const originalLoadBonus = loadMessenger;
window.loadMessenger = async function() {
    await originalLoadBonus();
    if (currentUser) await checkDailyBonus();
};

// ============ ЭКСПОРТ ============
window.currentUser = currentUser;
window.currentChat = currentChat;
window.database = database;
window.messagesArea = messagesArea;
window.displayMessages = displayMessages;
window.setupRealtimeMessages = setupRealtimeMessages;
window.getUserAvatar = getUserAvatar;
window.hasCarrotAvatar = hasCarrotAvatar;
window.showNotification = showNotification;
window.escapeHtml = escapeHtml;
window.currentUserGetter = () => currentUser;
window.getUserBalance = getUserBalance;
window.addCoins = addCoins;
window.removeCoins = removeCoins;
window.hasPremium = hasPremium;
window.buyPremium = buyPremium;
window.extendPremiumMonths = extendPremiumMonths;
window.loadPremiumStatus = loadPremiumStatus;
window.loadPremiumPrice = loadPremiumPrice;
window.cleanupOldVoiceMessages = cleanupOldVoiceMessages;
window.updateShopPrice = async (avatar, newPrice) => {
    shopPrices[avatar] = newPrice;
    await set(ref(database, `shopPrices/${avatar}`), newPrice);
    showNotification(`Цена на ${avatar} изменена на ${newPrice} 🥕`);
};
window.updatePremiumPrice = async (newPrice) => {
    PREMIUM_PRICE = newPrice;
    await set(ref(database, 'premiumPrice'), newPrice);
    showNotification(`Цена Морковка+ изменена на ${newPrice} 🥕`);
};

if (localStorage.getItem('currentUser')) loadMessenger();
