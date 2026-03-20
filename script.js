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

// Данные пользователей
let users = JSON.parse(localStorage.getItem('users')) || {};
let bannedUsers = JSON.parse(localStorage.getItem('bannedUsers')) || [];
let admins = JSON.parse(localStorage.getItem('admins')) || [MAIN_ADMIN];

// Сообщения
let messages = {
    general: JSON.parse(localStorage.getItem('messages_general')) || [],
    private: JSON.parse(localStorage.getItem('messages_private')) || {}
};

let privateChats = JSON.parse(localStorage.getItem('privateChats')) || [];
let githubToken = GITHUB_CONFIG.TOKEN;
let gistId = GITHUB_CONFIG.GIST_ID;

// DOM элементы для экранов
const authScreen = document.getElementById('auth-screen');
const resetScreen = document.getElementById('reset-screen');
const mainScreen = document.getElementById('main-screen');
const profileScreen = document.getElementById('profile-screen');
const adminScreen = document.getElementById('admin-screen');
const chatScreen = document.getElementById('chat-screen');

// DOM элементы для чата
const chatsListDiv = document.getElementById('chats-list');
const messagesContainer = document.getElementById('messages-container');
const chatPartnerNameSpan = document.getElementById('chat-partner-name');
const messageInput = document.getElementById('message-input');
// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
});

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Setup event listeners started');
    
    // Кнопки навигации
    const navChats = document.getElementById('nav-chats');
    const navProfile = document.getElementById('nav-profile');
    const navChatsFromProfile = document.getElementById('nav-chats-from-profile');
    const navProfileFromProfile = document.getElementById('nav-profile-from-profile');
    const backToChatsBtn = document.getElementById('back-to-chats-btn');
    const addChatBtn = document.getElementById('add-chat-btn');
    const adminPanelBtn = document.getElementById('admin-panel-btn');
    const backFromAdmin = document.getElementById('back-from-admin');
    
    if (navChats) navChats.addEventListener('click', () => showMainScreen());
    if (navProfile) navProfile.addEventListener('click', () => showProfileScreen());
    if (navChatsFromProfile) navChatsFromProfile.addEventListener('click', () => showMainScreen());
    if (navProfileFromProfile) navProfileFromProfile.addEventListener('click', () => showProfileScreen());
    if (backToChatsBtn) backToChatsBtn.addEventListener('click', () => showMainScreen());
    if (addChatBtn) addChatBtn.addEventListener('click', showAddChatModal);
    if (adminPanelBtn) adminPanelBtn.addEventListener('click', showAdminScreen);
    if (backFromAdmin) backFromAdmin.addEventListener('click', () => showMainScreen());
    
    // Авторизация
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showResetPasswordBtn = document.getElementById('show-reset-password-btn');
    const backToLoginFromRegister = document.getElementById('back-to-login-from-register');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const backToAuthFromReset = document.getElementById('back-to-auth-from-reset');
    
    if (loginBtn) loginBtn.addEventListener('click', login);
    if (registerBtn) registerBtn.addEventListener('click', register);
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', showRegisterForm);
    if (showResetPasswordBtn) showResetPasswordBtn.addEventListener('click', showResetForm);
    if (backToLoginFromRegister) backToLoginFromRegister.addEventListener('click', showLoginForm);
    if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', forgotPassword);
    if (backToAuthFromReset) backToAuthFromReset.addEventListener('click', showLoginForm);
    
    // Профиль
    const saveEmailBtn = document.getElementById('save-email-btn');
    const showChangePasswordBtn = document.getElementById('show-change-password-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const cancelChangePassword = document.getElementById('cancel-change-password');
    const logoutBtn = document.getElementById('logout-btn');
    const showDeleteAccountModalBtn = document.getElementById('show-delete-account-modal-btn');
    const deleteAccountCancel = document.getElementById('delete-account-cancel');
    const deleteAccountConfirm = document.getElementById('delete-account-confirm');
    
    if (saveEmailBtn) saveEmailBtn.addEventListener('click', saveProfile);
    if (showChangePasswordBtn) showChangePasswordBtn.addEventListener('click', showChangePasswordForm);
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', changePassword);
    if (cancelChangePassword) cancelChangePassword.addEventListener('click', hideChangePasswordForm);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (showDeleteAccountModalBtn) showDeleteAccountModalBtn.addEventListener('click', showDeleteAccountModal);
    if (deleteAccountCancel) deleteAccountCancel.addEventListener('click', hideDeleteAccountModal);
    if (deleteAccountConfirm) deleteAccountConfirm.addEventListener('click', deleteAccount);
    
    // Чат
    const sendMessageBtn = document.getElementById('send-message-btn');
    if (sendMessageBtn) sendMessageBtn.addEventListener('click', sendCurrentMessage);
    if (messageInput) messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendCurrentMessage();
    });
    
    // Модальные окна
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalAddBtn = document.getElementById('modal-add-btn');
    const closePasswordModal = document.getElementById('close-password-modal-btn');
    const copyPasswordBtn = document.getElementById('copy-password-btn');
    const editMessageSave = document.getElementById('edit-message-save');
    const editMessageCancel = document.getElementById('edit-message-cancel');
    
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', hideAddChatModal);
    if (modalAddBtn) modalAddBtn.addEventListener('click', addPrivateChat);
    if (closePasswordModal) closePasswordModal.addEventListener('click', hideNewPasswordModal);
    if (copyPasswordBtn) copyPasswordBtn.addEventListener('click', copyNewPassword);
    if (editMessageSave) editMessageSave.addEventListener('click', saveEditedMessage);
    if (editMessageCancel) editMessageCancel.addEventListener('click', hideEditMessageModal);
    
    // Поиск в админке
    const adminSearch = document.getElementById('admin-search');
    if (adminSearch) adminSearch.addEventListener('input', renderAdminUsersList);
}

// ========== НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ ==========
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

// ========== ФОРМЫ АВТОРИЗАЦИИ ==========
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-error').textContent = '';
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-error').textContent = '';
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

    users[username] = { password, email: '', role: 'user' };
    localStorage.setItem('users', JSON.stringify(users));
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
        showMainScreen();
        
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
            loadFromGist();
        }
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
        showModalMessage('Успех', 'Email сохранен');
    }
}

function showChangePasswordForm() {
    document.getElementById('change-password-form').style.display = 'block';
}

function hideChangePasswordForm() {
    document.getElementById('change-password-form').style.display = 'none';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-password2').value = '';
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
    showModalMessage('Успех', 'Пароль изменен');
    hideChangePasswordForm();
}

function showDeleteAccountModal() {
    document.getElementById('delete-account-modal').style.display = 'flex';
    document.getElementById('delete-account-password').value = '';
    document.getElementById('delete-account-error').textContent = '';
}

function hideDeleteAccountModal() {
    document.getElementById('delete-account-modal').style.display = 'none';
}

function deleteAccount() {
    const password = document.getElementById('delete-account-password').value;
    
    if (users[currentUser].password !== password) {
        document.getElementById('delete-account-error').textContent = 'Неверный пароль';
        return;
    }
    
    delete users[currentUser];
    localStorage.setItem('users', JSON.stringify(users));
    
    // Удаляем все чаты с этим пользователем
    privateChats = privateChats.filter(chatId => !chatId.includes(currentUser));
    localStorage.setItem('privateChats', JSON.stringify(privateChats));
    
    hideDeleteAccountModal();
    logout();
}

function logout() {
    currentUser = null;
    showAuthScreen();
}
// ========== ЧАТЫ ==========
function renderChatsList() {
    if (!chatsListDiv) return;
    
    chatsListDiv.innerHTML = '';
    
    // Общий чат
    const generalChat = document.createElement('div');
    generalChat.className = 'chat-item';
    if (currentChat === 'general') generalChat.classList.add('active');
    generalChat.innerHTML = `
        <span># Общий чат</span>
        <span class="last-message">${getLastMessagePreview('general')}</span>
    `;
    generalChat.addEventListener('click', () => {
        showChatScreen('general', 'Общий чат');
        loadMessagesForChat();
    });
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
            
            chatItem.addEventListener('click', () => {
                if (!isBlocked || admins.includes(currentUser)) {
                    showChatScreen(chatId, otherUser);
                    loadMessagesForChat();
                }
            });
            
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
    messageDiv.dataset.messageText = message.text;
    
    const editedMark = message.edited ? ' <small>(ред.)</small>' : '';
    
    messageDiv.innerHTML = `
        <div class="message-sender">${message.user === currentUser ? 'Вы' : message.user}</div>
        <div class="message-text">${escapeHtml(message.text)}${editedMark}</div>
        <div class="message-time">${message.time}</div>
        <div class="message-actions-menu" style="display: none; position: absolute; top: -30px; right: 0; background: #2a2a2a; border-radius: 15px; padding: 5px; gap: 5px;">
            <button class="message-edit-btn" style="background: none; border: none; color: #ff8c00; cursor: pointer; padding: 5px;">✏️</button>
            <button class="message-delete-btn" style="background: none; border: none; color: #ff6b6b; cursor: pointer; padding: 5px;">🗑️</button>
        </div>
    `;
    
    // Добавляем контекстное меню для своих сообщений
    if (message.user === currentUser) {
        messageDiv.style.position = 'relative';
        messageDiv.style.cursor = 'pointer';
        
        let timeoutId;
        
        messageDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            // Закрываем все другие меню
            document.querySelectorAll('.message-actions-menu').forEach(menu => {
                if (menu !== messageDiv.querySelector('.message-actions-menu')) {
                    menu.style.display = 'none';
                }
            });
            
            const menu = messageDiv.querySelector('.message-actions-menu');
            if (menu) {
                menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }
        });
        
        // Кнопка редактирования
        const editBtn = messageDiv.querySelector('.message-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditMessageModal(message.id, message.text);
                messageDiv.querySelector('.message-actions-menu').style.display = 'none';
            });
        }
        
        // Кнопка удаления
        const deleteBtn = messageDiv.querySelector('.message-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteMessageModal(message.id);
                messageDiv.querySelector('.message-actions-menu').style.display = 'none';
            });
        }
        
        // Закрываем меню при клике вне сообщения
        document.addEventListener('click', () => {
            const menu = messageDiv.querySelector('.message-actions-menu');
            if (menu) menu.style.display = 'none';
        });
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
    
    if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
        saveToGist();
    }
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
        
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
            saveToGist();
        }
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
        
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
            saveToGist();
        }
    }
    
    hideEditMessageModal();
}

function hideEditMessageModal() {
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
    const totalUsers = Object.keys(users).length;
    const blockedCount = bannedUsers.length;
    const adminCount = admins.length;
    
    const totalUsersEl = document.getElementById('total-users');
    const blockedUsersEl = document.getElementById('blocked-users');
    const adminCountEl = document.getElementById('admin-count');
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (blockedUsersEl) blockedUsersEl.textContent = blockedCount;
    if (adminCountEl) adminCountEl.textContent = adminCount;
}

function renderAdminUsersList() {
    const searchTerm = document.getElementById('admin-search')?.value.toLowerCase() || '';
    const container = document.getElementById('admin-users-list');
    if (!container) {
        console.log('Admin users list container not found');
        return;
    }
    
    console.log('Rendering admin users list, users count:', Object.keys(users).length);
    container.innerHTML = '';
    
    // Показываем всех пользователей
    Object.keys(users).forEach(username => {
        // Фильтрация по поиску
        if (searchTerm && !username.toLowerCase().includes(searchTerm)) return;
        
        const isBanned = bannedUsers.includes(username);
        const isAdmin = admins.includes(username);
        const isCurrentUser = username === currentUser;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'admin-user-item';
        if (isBanned) userDiv.classList.add('blocked');
        if (isCurrentUser) userDiv.style.border = '2px solid #ff8c00';
        
        // Формируем кнопки действий
        let actionButtons = '';
        
        if (!isCurrentUser) {
            // Кнопка админа
            if (!isAdmin && username !== MAIN_ADMIN) {
                actionButtons += `<button class="user-action-btn" style="background:#ff8c00; color:black; margin:2px;" onclick="window.makeAdmin('${username.replace(/'/g, "\\'")}')">👑 Сделать админом</button>`;
            } else if (isAdmin && username !== MAIN_ADMIN) {
                actionButtons += `<button class="user-action-btn" style="background:#dc3545; margin:2px;" onclick="window.removeAdmin('${username.replace(/'/g, "\\'")}')">⬇️ Убрать админа</button>`;
            }
            
            // Кнопка бана/разбана
            if (!isBanned) {
                actionButtons += `<button class="user-action-btn" style="background:#dc3545; margin:2px;" onclick="window.banUser('${username.replace(/'/g, "\\'")}')">🚫 Заблокировать</button>`;
            } else {
                actionButtons += `<button class="user-action-btn" style="background:#28a745; margin:2px;" onclick="window.unbanUser('${username.replace(/'/g, "\\'")}')">✅ Разблокировать</button>`;
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
    
    console.log('Admin users list rendered, items:', container.children.length);
}

// Создаем глобальные функции для доступа из onclick
window.makeAdmin = function(username) {
    console.log('makeAdmin called for:', username);
    if (username === MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Нельзя изменить права главного администратора');
        return;
    }
    
    if (!admins.includes(username)) {
        admins.push(username);
        localStorage.setItem('admins', JSON.stringify(admins));
        renderAdminUsersList();
        renderAdminStats();
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') saveToGist();
        showModalMessage('Успех', `${username} теперь администратор`);
    } else {
        showModalMessage('Инфо', `${username} уже администратор`);
    }
};

window.removeAdmin = function(username) {
    console.log('removeAdmin called for:', username);
    if (username === MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Нельзя изменить права главного администратора');
        return;
    }
    
    if (admins.includes(username)) {
        admins = admins.filter(a => a !== username);
        localStorage.setItem('admins', JSON.stringify(admins));
        renderAdminUsersList();
        renderAdminStats();
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') saveToGist();
        showModalMessage('Успех', `У ${username} удалены права администратора`);
    }
};

window.banUser = function(username) {
    console.log('banUser called for:', username);
    if (username === MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Нельзя заблокировать главного администратора');
        return;
    }
    
    if (admins.includes(username) && currentUser !== MAIN_ADMIN) {
        showModalMessage('Ошибка', 'Только главный админ может блокировать других админов');
        return;
    }
    
    if (!bannedUsers.includes(username)) {
        bannedUsers.push(username);
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
        
        // Удаляем чаты с заблокированным пользователем
        privateChats = privateChats.filter(chatId => !chatId.includes(username));
        localStorage.setItem('privateChats', JSON.stringify(privateChats));
        
        renderAdminUsersList();
        renderChatsList();
        renderAdminStats();
        
        // Если текущий чат с заблокированным пользователем - возвращаемся в главное меню
        if (currentChat !== 'general' && currentChat.includes(username)) {
            showMainScreen();
        }
        
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') saveToGist();
        showModalMessage('Успех', `Пользователь ${username} заблокирован`);
    }
};

window.unbanUser = function(username) {
    console.log('unbanUser called for:', username);
    const index = bannedUsers.indexOf(username);
    if (index !== -1) {
        bannedUsers.splice(index, 1);
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
        
        renderAdminUsersList();
        renderChatsList();
        renderAdminStats();
        
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') saveToGist();
        showModalMessage('Успех', `Пользователь ${username} разблокирован`);
    }
};

// ========== МОДАЛЬНЫЕ ОКНА ==========
function showAddChatModal() {
    const modal = document.getElementById('add-chat-modal');
    if (modal) {
        modal.style.display = 'flex';
        const input = document.getElementById('new-chat-username');
        if (input) input.value = '';
        const errorDiv = document.getElementById('modal-error');
        if (errorDiv) errorDiv.textContent = '';
    }
}

function hideAddChatModal() {
    const modal = document.getElementById('add-chat-modal');
    if (modal) modal.style.display = 'none';
}

function addPrivateChat() {
    const username = document.getElementById('new-chat-username').value.trim();
    const errorDiv = document.getElementById('modal-error');
    
    if (!username || username === currentUser) {
        if (errorDiv) errorDiv.textContent = 'Введите имя пользователя';
        return;
    }
    
    if (!users[username]) {
        if (errorDiv) errorDiv.textContent = 'Пользователь не найден';
        return;
    }
    
    if (bannedUsers.includes(username)) {
        if (errorDiv) errorDiv.textContent = 'Этот пользователь заблокирован';
        return;
    }
    
    const chatId = [currentUser, username].sort().join('_');
    
    if (!privateChats.includes(chatId)) {
        privateChats.push(chatId);
        if (!messages.private[chatId]) messages.private[chatId] = [];
        localStorage.setItem('privateChats', JSON.stringify(privateChats));
        localStorage.setItem('messages_private', JSON.stringify(messages.private));
        
        renderChatsList();
        
        if (githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
            saveToGist();
        }
    }
    
    hideAddChatModal();
    showChatScreen(chatId, username);
    loadMessagesForChat();
}

function showModalMessage(title, message) {
    const modal = document.getElementById('new-password-modal');
    if (!modal) return;
    
    const titleEl = modal.querySelector('h3');
    const displayEl = document.getElementById('new-password-display');
    
    if (titleEl) titleEl.textContent = title;
    if (displayEl) displayEl.textContent = message;
    
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
                <button id="confirm-yes" class="btn-danger" style="background:#ff8c00; color:black;">Да, удалить</button>
                <button id="confirm-no" class="btn-secondary">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const yesBtn = modal.querySelector('#confirm-yes');
    const noBtn = modal.querySelector('#confirm-no');
    
    yesBtn.addEventListener('click', () => {
        if (onConfirm) onConfirm();
        modal.remove();
    });
    
    noBtn.addEventListener('click', () => {
        modal.remove();
    });
}

function hideNewPasswordModal() {
    const modal = document.getElementById('new-password-modal');
    if (modal) modal.style.display = 'none';
}

function copyNewPassword() {
    const password = document.getElementById('new-password-display')?.textContent;
    if (password) {
        navigator.clipboard.writeText(password);
        showModalMessage('Успех', 'Пароль скопирован');
    }
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

function initTheme() {
    // Тема уже задана в CSS (темная)
}

// ========== GITHUB GIST ==========
async function saveToGist() {
    if (!githubToken || !gistId || githubToken === 'ваш_github_token_здесь') return;

    const data = {
        users: users,
        messages: messages,
        privateChats: privateChats,
        bannedUsers: bannedUsers,
        admins: admins
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
        
        if (!response.ok) {
            console.error('Failed to save to Gist');
        }
    } catch (error) {
        console.error('Error saving to Gist:', error);
    }
}

async function loadFromGist() {
    if (!githubToken || !gistId || githubToken === 'ваш_github_token_здесь') return;

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
                
                users = data.users || users;
                messages = data.messages || messages;
                privateChats = data.privateChats || privateChats;
                bannedUsers = data.bannedUsers || bannedUsers;
                admins = data.admins || [MAIN_ADMIN];
                
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('messages_general', JSON.stringify(messages.general));
                localStorage.setItem('messages_private', JSON.stringify(messages.private));
                localStorage.setItem('privateChats', JSON.stringify(privateChats));
                localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
                localStorage.setItem('admins', JSON.stringify(admins));
                
                if (currentUser) {
                    renderChatsList();
                }
            }
        }
    } catch (error) {
        console.error('Error loading from Gist:', error);
    }
}

// Автосохранение
setInterval(() => {
    if (currentUser && githubToken && gistId && githubToken !== 'ваш_github_token_здесь') {
        saveToGist();
    }
}, 30000);

// Показываем экран авторизации при загрузке
showAuthScreen();