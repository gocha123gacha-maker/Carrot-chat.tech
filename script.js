// ⚙️ НАСТРОЙКИ GITHUB - ВСТАВЬТЕ СВОИ ДАННЫЕ ЗДЕСЬ ⚙️
const GITHUB_CONFIG = {
    TOKEN: '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',
    GIST_ID: '717322409072ab48374b33bf57d82847'
};
// 👑 ГЛАВНЫЙ АДМИН
const MAIN_ADMIN = 'Кева✓';

// Состояние приложения
let currentUser = null;
let currentChat = 'general';
let editingMessage = null;
let isLoading = false;

// Данные пользователей
let users = {};
let bannedUsers = [];
let admins = [MAIN_ADMIN];

// Сообщения
let messages = {
    general: [],
    private: {}
};

let privateChats = [];
let githubToken = GITHUB_CONFIG.TOKEN;
let gistId = GITHUB_CONFIG.GIST_ID;

// DOM элементы
const authScreen = document.getElementById('auth-screen');
const resetScreen = document.getElementById('reset-screen');
const mainScreen = document.getElementById('main-screen');
const profileScreen = document.getElementById('profile-screen');
const adminScreen = document.getElementById('admin-screen');
const chatScreen = document.getElementById('chat-screen');
const chatsListDiv = document.getElementById('chats-list');
const messagesContainer = document.getElementById('messages-container');
const chatPartnerNameSpan = document.getElementById('chat-partner-name');
const messageInput = document.getElementById('message-input');

// Загрузка данных из localStorage при старте
function loadFromLocalStorage() {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) users = JSON.parse(savedUsers);
    
    const savedGeneral = localStorage.getItem('messages_general');
    if (savedGeneral) messages.general = JSON.parse(savedGeneral);
    
    const savedPrivate = localStorage.getItem('messages_private');
    if (savedPrivate) messages.private = JSON.parse(savedPrivate);
    
    const savedPrivateChats = localStorage.getItem('privateChats');
    if (savedPrivateChats) privateChats = JSON.parse(savedPrivateChats);
    
    const savedBanned = localStorage.getItem('bannedUsers');
    if (savedBanned) bannedUsers = JSON.parse(savedBanned);
    
    const savedAdmins = localStorage.getItem('admins');
    if (savedAdmins) admins = JSON.parse(savedAdmins);
    
    if (!admins.includes(MAIN_ADMIN)) admins.push(MAIN_ADMIN);
}

loadFromLocalStorage();
// ========== GITHUB GIST СИНХРОНИЗАЦИЯ ==========
async function saveToGist() {
    if (!githubToken || !gistId || githubToken === 'ваш_github_token_здесь') {
        console.log('GitHub не настроен');
        return false;
    }

    const data = {
        users: users,
        messages: messages,
        privateChats: privateChats,
        bannedUsers: bannedUsers,
        admins: admins,
        lastUpdated: new Date().toISOString()
    };

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'carrot-chat-data.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            })
        });
        
        if (response.ok) {
            console.log('Данные сохранены в Gist');
            return true;
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
    return false;
}

async function loadFromGist() {
    if (!githubToken || !gistId || githubToken === 'ваш_github_token_здесь') {
        console.log('GitHub не настроен');
        return false;
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${githubToken}`
            }
        });

        if (response.ok) {
            const gist = await response.json();
            const content = gist.files['carrot-chat-data.json']?.content;
            
            if (content) {
                const data = JSON.parse(content);
                users = data.users || {};
                messages = data.messages || { general: [], private: {} };
                privateChats = data.privateChats || [];
                bannedUsers = data.bannedUsers || [];
                admins = data.admins || [MAIN_ADMIN];
                
                // Сохраняем в localStorage
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('messages_general', JSON.stringify(messages.general));
                localStorage.setItem('messages_private', JSON.stringify(messages.private));
                localStorage.setItem('privateChats', JSON.stringify(privateChats));
                localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
                localStorage.setItem('admins', JSON.stringify(admins));
                
                console.log('Данные загружены из Gist');
                return true;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
    return false;
}
// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    showAuthScreen();
});

function setupEventListeners() {
    // Навигация
    document.getElementById('nav-chats')?.addEventListener('click', () => showMainScreen());
    document.getElementById('nav-profile')?.addEventListener('click', () => showProfileScreen());
    document.getElementById('nav-chats-from-profile')?.addEventListener('click', () => showMainScreen());
    document.getElementById('nav-profile-from-profile')?.addEventListener('click', () => showProfileScreen());
    document.getElementById('back-to-chats-btn')?.addEventListener('click', () => showMainScreen());
    document.getElementById('add-chat-btn')?.addEventListener('click', showAddChatModal);
    document.getElementById('admin-panel-btn')?.addEventListener('click', showAdminScreen);
    document.getElementById('back-from-admin')?.addEventListener('click', () => showMainScreen());
    
    // Авторизация
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('register-btn')?.addEventListener('click', register);
    document.getElementById('show-register-btn')?.addEventListener('click', showRegisterForm);
    document.getElementById('show-reset-password-btn')?.addEventListener('click', showResetForm);
    document.getElementById('back-to-login-from-register')?.addEventListener('click', showLoginForm);
    document.getElementById('reset-password-btn')?.addEventListener('click', forgotPassword);
    document.getElementById('back-to-auth-from-reset')?.addEventListener('click', showLoginForm);
    
    // Профиль
    document.getElementById('save-email-btn')?.addEventListener('click', saveProfile);
    document.getElementById('show-change-password-btn')?.addEventListener('click', () => {
        document.getElementById('change-password-form').style.display = 'block';
    });
    document.getElementById('change-password-btn')?.addEventListener('click', changePassword);
    document.getElementById('cancel-change-password')?.addEventListener('click', () => {
        document.getElementById('change-password-form').style.display = 'none';
    });
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('show-delete-account-modal-btn')?.addEventListener('click', () => {
        document.getElementById('delete-account-modal').style.display = 'flex';
    });
    document.getElementById('delete-account-cancel')?.addEventListener('click', () => {
        document.getElementById('delete-account-modal').style.display = 'none';
    });
    document.getElementById('delete-account-confirm')?.addEventListener('click', deleteAccount);
    
    // Чат
    document.getElementById('send-message-btn')?.addEventListener('click', sendCurrentMessage);
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendCurrentMessage();
    });
    
    // Модальные окна
    document.getElementById('modal-cancel-btn')?.addEventListener('click', hideAddChatModal);
    document.getElementById('modal-add-btn')?.addEventListener('click', addPrivateChat);
    document.getElementById('close-password-modal-btn')?.addEventListener('click', () => {
        document.getElementById('new-password-modal').style.display = 'none';
    });
    document.getElementById('copy-password-btn')?.addEventListener('click', copyNewPassword);
    document.getElementById('edit-message-save')?.addEventListener('click', saveEditedMessage);
    document.getElementById('edit-message-cancel')?.addEventListener('click', () => {
        document.getElementById('edit-message-modal').style.display = 'none';
    });
    
    // Поиск в админке
    document.getElementById('admin-search')?.addEventListener('input', renderAdminUsersList);
}

// ========== НАВИГАЦИЯ ==========
function showAuthScreen() {
    hideAllScreens();
    authScreen.classList.add('active');
    showLoginForm();
}

function showMainScreen() {
    hideAllScreens();
    mainScreen.classList.add('active');
    renderChatsList();
    updateAdminButton();
}

function showProfileScreen() {
    hideAllScreens();
    profileScreen.classList.add('active');
    document.getElementById('profile-username').textContent = currentUser;
    document.getElementById('profile-email').value = users[currentUser]?.email || '';
    updateAdminButton();
}

function showAdminScreen() {
    if (!admins.includes(currentUser)) return;
    hideAllScreens();
    adminScreen.classList.add('active');
    renderAdminStats();
    renderAdminUsersList();
}

function showChatScreen(chatId, partnerName) {
    hideAllScreens();
    chatScreen.classList.add('active');
    currentChat = chatId;
    chatPartnerNameSpan.textContent = partnerName;
    loadMessagesForChat();
}

function hideAllScreens() {
    const screens = [authScreen, resetScreen, mainScreen, profileScreen, adminScreen, chatScreen];
    screens.forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showResetForm() {
    authScreen.classList.remove('active');
    resetScreen.classList.add('active');
}
// ========== АВТОРИЗАЦИЯ ==========
function register() {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;

    if (!username || !password) {
        showError('Заполните все поля');
        return;
    }

    if (password !== password2) {
        showError('Пароли не совпадают');
        return;
    }

    if (users[username]) {
        showError('Имя пользователя уже занято');
        return;
    }

    users[username] = { password, email: '' };
    localStorage.setItem('users', JSON.stringify(users));
    saveToGist();
    
    showError('Регистрация успешна! Теперь войдите.', 'success');
    showLoginForm();
    
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-password2').value = '';
}

function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showError('Заполните все поля');
        return;
    }

    if (bannedUsers.includes(username)) {
        showError('Вы заблокированы');
        return;
    }

    if (users[username] && users[username].password === password) {
        currentUser = username;
        
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        
        loadFromGist().then(() => {
            showMainScreen();
        });
    } else {
        showError('Неверное имя или пароль');
    }
}

function forgotPassword() {
    const username = document.getElementById('reset-username').value.trim();
    const email = document.getElementById('reset-email').value.trim();

    if (!username) {
        document.getElementById('reset-error').textContent = 'Введите имя пользователя';
        return;
    }

    if (!users[username]) {
        document.getElementById('reset-error').textContent = 'Пользователь не найден';
        return;
    }

    if (email && users[username].email && users[username].email !== email) {
        document.getElementById('reset-error').textContent = 'Email не совпадает';
        return;
    }

    const newPassword = generateRandomPassword();
    users[username].password = newPassword;
    localStorage.setItem('users', JSON.stringify(users));
    saveToGist();

    document.getElementById('new-password-display').textContent = newPassword;
    document.getElementById('new-password-modal').style.display = 'flex';
    
    document.getElementById('reset-username').value = '';
    document.getElementById('reset-email').value = '';
}

function showError(message, type = 'error') {
    const errorDiv = document.getElementById('auth-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.color = type === 'error' ? '#ff6b6b' : '#4caf50';
        setTimeout(() => {
            errorDiv.textContent = '';
        }, 3000);
    }
}

// ========== ПРОФИЛЬ ==========
function saveProfile() {
    const email = document.getElementById('profile-email').value.trim();
    if (email) {
        users[currentUser].email = email;
        localStorage.setItem('users', JSON.stringify(users));
        saveToGist();
        showModalMessage('Успех', 'Email сохранен');
    }
}

function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const newPassword2 = document.getElementById('new-password2').value;

    if (users[currentUser].password !== currentPassword) {
        showModalMessage('Ошибка', 'Неверный текущий пароль');
        return;
    }

    if (newPassword !== newPassword2) {
        showModalMessage('Ошибка', 'Новые пароли не совпадают');
        return;
    }

    if (!newPassword) {
        showModalMessage('Ошибка', 'Введите новый пароль');
        return;
    }

    users[currentUser].password = newPassword;
    localStorage.setItem('users', JSON.stringify(users));
    saveToGist();
    showModalMessage('Успех', 'Пароль изменен');
    
    document.getElementById('change-password-form').style.display = 'none';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-password2').value = '';
}

function deleteAccount() {
    const password = document.getElementById('delete-account-password').value;
    
    if (users[currentUser].password !== password) {
        document.getElementById('delete-account-error').textContent = 'Неверный пароль';
        return;
    }
    
    delete users[currentUser];
    localStorage.setItem('users', JSON.stringify(users));
    
    privateChats = privateChats.filter(chatId => !chatId.includes(currentUser));
    localStorage.setItem('privateChats', JSON.stringify(privateChats));
    
    if (admins.includes(currentUser)) {
        admins = admins.filter(a => a !== currentUser);
        localStorage.setItem('admins', JSON.stringify(admins));
    }
    
    saveToGist();
    document.getElementById('delete-account-modal').style.display = 'none';
    logout();
}

function logout() {
    currentUser = null;
    currentChat = 'general';
    if (messageInput) messageInput.value = '';
    showAuthScreen();
}
// ========== ЧАТЫ ==========
function renderChatsList() {
    if (!chatsListDiv) return;
    
    chatsListDiv.innerHTML = '';
    
    // Общий чат - ВСЕГДА ПЕРВЫЙ
    const generalChat = document.createElement('div');
    generalChat.className = 'chat-item';
    if (currentChat === 'general') generalChat.classList.add('active');
    generalChat.innerHTML = `
        <span># Общий чат</span>
        <span class="last-message">${getLastMessagePreview('general')}</span>
    `;
    generalChat.onclick = () => {
        showChatScreen('general', 'Общий чат');
        loadMessagesForChat();
    };
    chatsListDiv.appendChild(generalChat);
    
    // Личные чаты
    privateChats.forEach(chatId => {
        if (chatId.includes(currentUser)) {
            const otherUser = chatId.split('_').find(u => u !== currentUser);
            const isBlocked = bannedUsers.includes(otherUser);
            
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (isBlocked) chatItem.classList.add('blocked');
            if (currentChat === chatId) chatItem.classList.add('active');
            
            chatItem.innerHTML = `
                <span>💬 ${otherUser}</span>
                <span class="last-message">${getLastMessagePreview(chatId)}</span>
                ${isBlocked ? '<span class="blocked-badge">Заблокирован</span>' : ''}
            `;
            
            chatItem.onclick = () => {
                if (!isBlocked || admins.includes(currentUser)) {
                    showChatScreen(chatId, otherUser);
                    loadMessagesForChat();
                }
            };
            
            chatsListDiv.appendChild(chatItem);
        }
    });
}

function getLastMessagePreview(chatId) {
    const msgs = chatId === 'general' ? messages.general : messages.private[chatId];
    if (!msgs || msgs.length === 0) return 'Нет сообщений';
    const lastMsg = msgs[msgs.length - 1];
    const sender = lastMsg.user === currentUser ? 'Вы' : lastMsg.user;
    const text = lastMsg.text.length > 20 ? lastMsg.text.substring(0, 20) + '...' : lastMsg.text;
    return `${sender}: ${text}`;
}

function loadMessagesForChat() {
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    const msgs = currentChat === 'general' ? messages.general : messages.private[currentChat];
    if (!msgs) return;
    
    msgs.forEach(msg => displayMessage(msg));
    scrollToBottom();
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.user === currentUser ? 'own' : 'other'}`;
    messageDiv.dataset.messageId = message.id;
    
    const editedMark = message.edited ? ' <small>(ред.)</small>' : '';
    
    messageDiv.innerHTML = `
        <div class="message-sender">${message.user === currentUser ? 'Вы' : message.user}</div>
        <div class="message-text">${escapeHtml(message.text)}${editedMark}</div>
        <div class="message-time">${message.time}</div>
    `;
    
    if (message.user === currentUser) {
        messageDiv.style.position = 'relative';
        messageDiv.style.cursor = 'pointer';
        
        // Контекстное меню
        const menu = document.createElement('div');
        menu.className = 'message-actions-menu';
        menu.style.cssText = 'display: none; position: absolute; top: -30px; right: 0; background: #2a2a2a; border-radius: 15px; padding: 5px; gap: 5px;';
        menu.innerHTML = `
            <button class="message-edit-btn" style="background: none; border: none; color: #ff8c00; cursor: pointer; padding: 5px;">✏️</button>
            <button class="message-delete-btn" style="background: none; border: none; color: #ff6b6b; cursor: pointer; padding: 5px;">🗑️</button>
        `;
        messageDiv.appendChild(menu);
        
        messageDiv.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
        };
        
        menu.querySelector('.message-edit-btn').onclick = (e) => {
            e.stopPropagation();
            openEditMessageModal(message.id, message.text);
            menu.style.display = 'none';
        };
        
        menu.querySelector('.message-delete-btn').onclick = (e) => {
            e.stopPropagation();
            openDeleteMessageModal(message.id);
            menu.style.display = 'none';
        };
        
        document.onclick = () => {
            menu.style.display = 'none';
        };
    }
    
    messagesContainer.appendChild(messageDiv);
}

function sendCurrentMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        id: Date.now() + Math.random(),
        user: currentUser,
        text: text,
        time: new Date().toLocaleTimeString(),
        edited: false
    };
    
    if (currentChat === 'general') {
        messages.general.push(message);
        localStorage.setItem('messages_general', JSON.stringify(messages.general));
    } else {
        if (!messages.private[currentChat]) messages.private[currentChat] = [];
        messages.private[currentChat].push(message);
        localStorage.setItem('messages_private', JSON.stringify(messages.private));
    }
    
    displayMessage(message);
    messageInput.value = '';
    scrollToBottom();
    renderChatsList();
    saveToGist();
}

function openEditMessageModal(messageId, currentText) {
    editingMessage = messageId;
    const modal = document.getElementById('edit-message-modal');
    const input = document.getElementById('edit-message-input');
    if (input) input.value = currentText;
    if (modal) modal.style.display = 'flex';
}

function openDeleteMessageModal(messageId) {
    editingMessage = messageId;
    showModalMessageWithConfirm('Удалить сообщение?', 'Это действие нельзя отменить', () => {
        deleteMessageById(messageId);
    });
}

function deleteMessageById(messageId) {
    const msgs = currentChat === 'general' ? messages.general : messages.private[currentChat];
    const msgIndex = msgs.findIndex(m => m.id === messageId);
    
    if (msgIndex !== -1) {
        msgs.splice(msgIndex, 1);
        
        if (currentChat === 'general') {
            localStorage.setItem('messages_general', JSON.stringify(messages.general));
        } else {
            localStorage.setItem('messages_private', JSON.stringify(messages.private));
        }
        
        loadMessagesForChat();
        renderChatsList();
        saveToGist();
    }
    
    editingMessage = null;
}

function saveEditedMessage() {
    const newText = document.getElementById('edit-message-input').value.trim();
    if (!newText) {
        showModalMessage('Ошибка', 'Сообщение не может быть пустым');
        return;
    }
    
    const msgs = currentChat === 'general' ? messages.general : messages.private[currentChat];
    const msgIndex = msgs.findIndex(m => m.id === editingMessage);
    
    if (msgIndex !== -1) {
        msgs[msgIndex].text = newText;
        msgs[msgIndex].edited = true;
        
        if (currentChat === 'general') {
            localStorage.setItem('messages_general', JSON.stringify(messages.general));
        } else {
            localStorage.setItem('messages_private', JSON.stringify(messages.private));
        }
        
        loadMessagesForChat();
        renderChatsList();
        saveToGist();
    }
    
    document.getElementById('edit-message-modal').style.display = 'none';
    editingMessage = null;
}

function scrollToBottom() {
    setTimeout(() => {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, 100);
}
// ========== АДМИН ПАНЕЛЬ ==========
function updateAdminButton() {
    const adminBtn = document.getElementById('admin-panel-btn');
    if (adminBtn) {
        adminBtn.style.display = admins.includes(currentUser) ? 'flex' : 'none';
    }
}

function renderAdminStats() {
    document.getElementById('total-users').textContent = Object.keys(users).length;
    document.getElementById('blocked-users').textContent = bannedUsers.length;
    document.getElementById('admin-count').textContent = admins.length;
}

function renderAdminUsersList() {
    const searchTerm = document.getElementById('admin-search')?.value.toLowerCase() || '';
    const container = document.getElementById('admin-users-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(users).forEach(username => {
        if (searchTerm && !username.toLowerCase().includes(searchTerm)) return;
        
        const isBanned = bannedUsers.includes(username);
        const isAdmin = admins.includes(username);
        const isCurrentUser = username === currentUser;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'admin-user-item';
        if (isBanned) userDiv.classList.add('blocked');
        if (isCurrentUser) userDiv.style.border = '2px solid #ff8c00';
        
        let actionButtons = '';
        
        if (!isCurrentUser) {
            if (!isAdmin && username !== MAIN_ADMIN) {
                actionButtons += `<button class="user-action-btn" style="background:#ff8c00; color:black; margin:2px;" onclick="makeAdmin('${username}')">👑 Сделать админом</button>`;
            } else if (isAdmin && username !== MAIN_ADMIN) {
                actionButtons += `<button class="user-action-btn" style="background:#dc3545; margin:2px;" onclick="removeAdmin('${username}')">⬇️ Убрать админа</button>`;
            }
            
            if (!isBanned) {
                actionButtons += `<button class="user-action-btn" style="background:#dc3545; margin:2px;" onclick="banUser('${username}')">🚫 Заблокировать</button>`;
            } else {
                actionButtons += `<button class="user-action-btn" style="background:#28a745; margin:2px;" onclick="unbanUser('${username}')">✅ Разблокировать</button>`;
            }
        } else {
            actionButtons = `<span style="color:#ff8c00; font-weight:bold;">Вы</span>`;
        }
        
        userDiv.innerHTML = `
            <div class="user-info">
                <span class="user-name">${escapeHtml(username)}</span>
                <span class="user-email">${users[username].email || 'Email не указан'}</span>
                <div class="user-badges">
                    ${isAdmin ? '<span class="admin-badge">👑 Админ</span>' : ''}
                    ${isBanned ? '<span class="admin-badge" style="background:#dc3545;">🚫 Заблокирован</span>' : ''}
                    ${isCurrentUser ? '<span class="admin-badge" style="background:#ff8c00;">Текущий</span>' : ''}
                </div>
            </div>
            <div class="user-actions">
                ${actionButtons}
            </div>
        `;
        
        container.appendChild(userDiv);
    });
}

function makeAdmin(username) {
    if (username === MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Нельзя изменить права главного администратора');
        return;
    }
    if (!admins.includes(username)) {
        admins.push(username);
        localStorage.setItem('admins', JSON.stringify(admins));
        saveToGist();
        renderAdminUsersList();
        renderAdminStats();
        showModalMessage('Успех', `${username} теперь администратор`);
    }
}

function removeAdmin(username) {
    if (username === MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Нельзя изменить права главного администратора');
        return;
    }
    if (admins.includes(username)) {
        admins = admins.filter(a => a !== username);
        localStorage.setItem('admins', JSON.stringify(admins));
        saveToGist();
        renderAdminUsersList();
        renderAdminStats();
        showModalMessage('Успех', `У ${username} удалены права администратора`);
    }
}

function banUser(username) {
    if (username === MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Нельзя заблокировать главного администратора');
        return;
    }
    if (!bannedUsers.includes(username)) {
        bannedUsers.push(username);
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
        privateChats = privateChats.filter(chatId => !chatId.includes(username));
        localStorage.setItem('privateChats', JSON.stringify(privateChats));
        saveToGist();
        renderAdminUsersList();
        renderChatsList();
        renderAdminStats();
        showModalMessage('Успех', `Пользователь ${username} заблокирован`);
    }
}

function unbanUser(username) {
    const index = bannedUsers.indexOf(username);
    if (index !== -1) {
        bannedUsers.splice(index, 1);
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
        saveToGist();
        renderAdminUsersList();
        renderChatsList();
        renderAdminStats();
        showModalMessage('Успех', `Пользователь ${username} разблокирован`);
    }
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function showAddChatModal() {
    const modal = document.getElementById('add-chat-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('new-chat-username').value = '';
        document.getElementById('modal-error').textContent = '';
    }
}

function hideAddChatModal() {
    document.getElementById('add-chat-modal').style.display = 'none';
}

function addPrivateChat() {
    const username = document.getElementById('new-chat-username').value.trim();
    const errorDiv = document.getElementById('modal-error');
    
    if (!username || username === currentUser) {
        errorDiv.textContent = 'Введите имя пользователя';
        return;
    }
    
    if (!users[username]) {
        errorDiv.textContent = 'Пользователь не найден';
        return;
    }
    
    if (bannedUsers.includes(username)) {
        errorDiv.textContent = 'Этот пользователь заблокирован';
        return;
    }
    
    const chatId = [currentUser, username].sort().join('_');
    
    if (!privateChats.includes(chatId)) {
        privateChats.push(chatId);
        if (!messages.private[chatId]) messages.private[chatId] = [];
        localStorage.setItem('privateChats', JSON.stringify(privateChats));
        localStorage.setItem('messages_private', JSON.stringify(messages.private));
        saveToGist();
        renderChatsList();
    }
    
    hideAddChatModal();
    showChatScreen(chatId, username);
    loadMessagesForChat();
}

function showModalMessage(title, message) {
    const modal = document.getElementById('new-password-modal');
    document.getElementById('new-password-display').textContent = message;
    modal.querySelector('h3').textContent = title;
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 2000);
}

function showModalMessageWithConfirm(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="border-color: #ff8c00;">
            <h3 style="color: #ff8c00;">${title}</h3>
            <p style="color: #e0e0e0; margin-bottom: 1rem;">${message}</p>
            <div class="modal-buttons">
                <button id="confirm-yes" class="btn-danger" style="background:#ff8c00; color:black;">Да</button>
                <button id="confirm-no" class="btn-secondary">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#confirm-yes').onclick = () => {
        onConfirm();
        modal.remove();
    };
    modal.querySelector('#confirm-no').onclick = () => modal.remove();
}

function copyNewPassword() {
    const password = document.getElementById('new-password-display').textContent;
    navigator.clipboard.writeText(password);
    showModalMessage('Успех', 'Пароль скопирован');
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Автосохранение
setInterval(() => {
    if (currentUser && githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
        saveToGist();
    }
}, 30000);