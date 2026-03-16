// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBHcDk_sRQ_XuDxG3ubxDLzlYFl9RTXWnQ",
    authDomain: "kravi-85626.firebaseapp.com",
    databaseURL: "https://kravi-85626-default-rtdb.firebaseio.com",
    projectId: "kravi-85626",
    storageBucket: "kravi-85626.firebasestorage.app",
    messagingSenderId: "167217474002",
    appId: "1:167217474002:web:a372a067bffd63bf37c00b"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Глобальные переменные
let currentUser = null;
let currentChatId = 'general';
let selectedMessageId = null;
let isAdmin = false;
const MAIN_ADMIN = "Кева✓";

// DOM элементы
const screens = {
    auth: document.getElementById('auth-screen'),
    main: document.getElementById('main-screen'),
    profile: document.getElementById('profile-screen'),
    chat: document.getElementById('chat-screen'),
    reset: document.getElementById('reset-screen'),
    admin: document.getElementById('admin-screen')
};

// Переключение экранов
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// Очистка ошибок
function clearErrors() {
    document.getElementById('auth-error').textContent = '';
    document.getElementById('reset-error').textContent = '';
    document.getElementById('modal-error').textContent = '';
}

// Проверка является ли пользователь админом
function checkAdminStatus(username) {
    if (username === MAIN_ADMIN) return Promise.resolve(true);
    
    return new Promise((resolve) => {
        database.ref('admins/' + username).once('value', snapshot => {
            resolve(snapshot.val() === true);
        }).catch(() => resolve(false));
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
function initializeDatabase() {
    console.log('Проверка и инициализация базы данных...');
    
    // Создаем главного админа если его нет
    database.ref('users/' + MAIN_ADMIN).once('value', snapshot => {
        if (!snapshot.exists()) {
            database.ref('users/' + MAIN_ADMIN).set({
                password: 'admin123',
                email: 'admin@carrot.chat',
                created: Date.now(),
                blocked: false
            }).then(() => {
                console.log('Главный админ создан');
                return database.ref('userChats/' + MAIN_ADMIN + '/general').set(true);
            }).catch(error => console.error('Ошибка создания админа:', error));
        }
    });

    // Создаем приветственное сообщение в общем чате
    database.ref('messages/general').once('value', snapshot => {
        if (!snapshot.exists() || !snapshot.val().welcome) {
            database.ref('messages/general/welcome').set({
                sender: 'system',
                text: 'Добро пожаловать в общий чат Carrot!',
                timestamp: Date.now()
            }).catch(error => console.error('Ошибка создания приветствия:', error));
        }
    });
}

// Вызываем инициализацию при загрузке
initializeDatabase();
// ========== НАВИГАЦИЯ МЕЖДУ ФОРМАМИ ==========
document.getElementById('show-register-btn').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('show-register-btn').style.display = 'none';
    document.getElementById('show-reset-password-btn').style.display = 'none';
    clearErrors();
});

document.getElementById('back-to-login-from-register').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('show-register-btn').style.display = 'block';
    document.getElementById('show-reset-password-btn').style.display = 'block';
    clearErrors();
});

document.getElementById('show-reset-password-btn').addEventListener('click', () => {
    showScreen('reset');
    clearErrors();
});

document.getElementById('back-to-auth-from-reset').addEventListener('click', () => {
    showScreen('auth');
    clearErrors();
});

// ========== РЕГИСТРАЦИЯ ==========
document.getElementById('register-btn').addEventListener('click', () => {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const errorEl = document.getElementById('auth-error');

    if (!username || !password || !password2) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }

    if (password !== password2) {
        errorEl.textContent = 'Пароли не совпадают';
        return;
    }

    if (username.length < 3) {
        errorEl.textContent = 'Имя должно быть не менее 3 символов';
        return;
    }

    database.ref('users/' + username).once('value', snapshot => {
        if (snapshot.exists()) {
            errorEl.textContent = 'Имя пользователя уже занято';
            return;
        }

        const userData = {
            password: password,
            email: '',
            created: Date.now(),
            blocked: false
        };

        database.ref('users/' + username).set(userData)
            .then(() => database.ref('userChats/' + username + '/general').set(true))
            .then(() => {
                currentUser = username;
                document.getElementById('profile-username').textContent = username;
                document.getElementById('profile-email').value = '';
                
                return checkAdminStatus(username);
            })
            .then(adminStatus => {
                isAdmin = adminStatus;
                if (isAdmin) {
                    document.getElementById('admin-panel-btn').style.display = 'flex';
                }
                loadUserChats();
                showScreen('main');
            })
            .catch(error => {
                errorEl.textContent = 'Ошибка: ' + error.message;
            });
    }).catch(error => {
        errorEl.textContent = 'Ошибка подключения к базе данных';
    });
});

// ========== ВХОД ==========
document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');

    if (!username || !password) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }

    database.ref('users/' + username).once('value', snapshot => {
        if (!snapshot.exists()) {
            errorEl.textContent = 'Пользователь не найден';
            return;
        }

        const userData = snapshot.val();
        
        if (userData.blocked) {
            errorEl.textContent = 'Ваш аккаунт заблокирован';
            return;
        }
        
        if (userData.password !== password) {
            errorEl.textContent = 'Неверный пароль';
            return;
        }
        
        currentUser = username;
        document.getElementById('profile-username').textContent = username;
        document.getElementById('profile-email').value = userData.email || '';
        
        checkAdminStatus(username).then(adminStatus => {
            isAdmin = adminStatus;
            if (isAdmin) {
                document.getElementById('admin-panel-btn').style.display = 'flex';
            } else {
                document.getElementById('admin-panel-btn').style.display = 'none';
            }
            
            return database.ref('userChats/' + username + '/general').set(true);
        }).then(() => {
            loadUserChats();
            showScreen('main');
        }).catch(error => {
            errorEl.textContent = 'Ошибка загрузки данных';
        });
        
    }).catch(error => {
        errorEl.textContent = 'Ошибка подключения к базе данных';
    });
});

// ========== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ==========
document.getElementById('reset-password-btn').addEventListener('click', () => {
    const username = document.getElementById('reset-username').value.trim();
    const email = document.getElementById('reset-email').value.trim();
    const errorEl = document.getElementById('reset-error');

    if (!username || !email) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }

    database.ref('users/' + username).once('value', snapshot => {
        if (!snapshot.exists()) {
            errorEl.textContent = 'Пользователь не найден';
            return;
        }

        const userData = snapshot.val();
        if (userData.email !== email) {
            errorEl.textContent = 'Email не совпадает';
            return;
        }

        const newPassword = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 100);
        
        database.ref('users/' + username + '/password').set(newPassword)
            .then(() => {
                document.getElementById('new-password-display').textContent = newPassword;
                document.getElementById('new-password-modal').style.display = 'flex';
            })
            .catch(error => {
                errorEl.textContent = 'Ошибка: ' + error.message;
            });
    }).catch(error => {
        errorEl.textContent = 'Ошибка подключения к базе данных';
    });
});

// Копирование пароля
document.getElementById('copy-password-btn').addEventListener('click', () => {
    const password = document.getElementById('new-password-display').textContent;
    navigator.clipboard.writeText(password).then(() => {
        alert('Пароль скопирован!');
    }).catch(() => {
        alert('Нажмите Ctrl+C чтобы скопировать');
    });
});

document.getElementById('close-password-modal-btn').addEventListener('click', () => {
    document.getElementById('new-password-modal').style.display = 'none';
    showScreen('auth');
});
// ========== ПРОФИЛЬ: СМЕНА ПАРОЛЯ ==========
document.getElementById('show-change-password-btn').addEventListener('click', () => {
    document.getElementById('change-password-form').style.display = 'block';
    document.getElementById('show-change-password-btn').style.display = 'none';
    clearErrors();
});

document.getElementById('cancel-change-password').addEventListener('click', () => {
    document.getElementById('change-password-form').style.display = 'none';
    document.getElementById('show-change-password-btn').style.display = 'block';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-password2').value = '';
});

document.getElementById('change-password-btn').addEventListener('click', () => {
    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const newPass2 = document.getElementById('new-password2').value;

    if (!currentPass || !newPass || !newPass2) {
        alert('Заполните все поля');
        return;
    }

    if (newPass !== newPass2) {
        alert('Новые пароли не совпадают');
        return;
    }

    database.ref('users/' + currentUser).once('value', snapshot => {
        const userData = snapshot.val();
        if (userData.password !== currentPass) {
            alert('Текущий пароль неверен');
            return;
        }

        database.ref('users/' + currentUser + '/password').set(newPass)
            .then(() => {
                alert('Пароль успешно изменен');
                document.getElementById('change-password-form').style.display = 'none';
                document.getElementById('show-change-password-btn').style.display = 'block';
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('new-password2').value = '';
            })
            .catch(error => alert('Ошибка: ' + error.message));
    });
});

// Сохранение email
document.getElementById('save-email-btn').addEventListener('click', () => {
    if (!currentUser) return;
    
    const email = document.getElementById('profile-email').value.trim();
    database.ref('users/' + currentUser + '/email').set(email)
        .then(() => alert('Email сохранен'))
        .catch(error => alert('Ошибка: ' + error.message));
});

// Выход
document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    isAdmin = false;
    document.getElementById('admin-panel-btn').style.display = 'none';
    showScreen('auth');
    
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('show-register-btn').style.display = 'block';
    document.getElementById('show-reset-password-btn').style.display = 'block';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    clearErrors();
});

// ========== НАВИГАЦИЯ ==========
document.getElementById('nav-chats').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-chats').classList.add('active');
    if (currentUser) {
        loadUserChats();
    }
    showScreen('main');
});

document.getElementById('nav-profile').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');
    showScreen('profile');
});

document.getElementById('nav-chats-from-profile').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-chats').classList.add('active');
    if (currentUser) {
        loadUserChats();
    }
    showScreen('main');
});

document.getElementById('nav-profile-from-profile').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');
    showScreen('profile');
});

// ========== АДМИН-ПАНЕЛЬ ==========
document.getElementById('admin-panel-btn').addEventListener('click', () => {
    if (isAdmin) {
        loadAdminPanel();
        showScreen('admin');
    }
});

document.getElementById('back-from-admin').addEventListener('click', () => {
    showScreen('main');
});

// Загрузка админ-панели
function loadAdminPanel() {
    if (!isAdmin) return;
    
    database.ref('users').once('value', snapshot => {
        const users = snapshot.val() || {};
        const usersList = document.getElementById('admin-users-list');
        const searchInput = document.getElementById('admin-search');
        
        const adminPromises = Object.keys(users).map(username => 
            checkAdminStatus(username).then(isUserAdmin => ({ username, isUserAdmin }))
        );
        
        Promise.all(adminPromises).then(adminStatuses => {
            const adminMap = {};
            adminStatuses.forEach(({ username, isUserAdmin }) => {
                adminMap[username] = isUserAdmin;
            });
            
            const totalUsers = Object.keys(users).length;
            const blockedCount = Object.values(users).filter(u => u.blocked).length;
            const adminCount = adminStatuses.filter(a => a.isUserAdmin).length;
            
            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('blocked-users').textContent = blockedCount;
            document.getElementById('admin-count').textContent = adminCount;
            
            function displayUsers(filterText = '') {
                const filteredUsers = Object.entries(users)
                    .filter(([username]) => 
                        username.toLowerCase().includes(filterText.toLowerCase())
                    )
                    .sort(([a], [b]) => a.localeCompare(b));
                
                usersList.innerHTML = filteredUsers.map(([username, userData]) => {
                    const isUserAdmin = adminMap[username] || username === MAIN_ADMIN;
                    const isMainAdmin = username === MAIN_ADMIN;
                    
                    return `
                        <div class="admin-user-item ${userData.blocked ? 'blocked' : ''}">
                            <div class="user-info">
                                <span class="user-name">${username} ${isMainAdmin ? '👑' : ''}</span>
                                <span class="user-email">${userData.email || 'email не указан'}</span>
                                <div class="user-badges">
                                    ${isUserAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
                                    ${userData.blocked ? '<span class="blocked-badge">ЗАБЛОКИРОВАН</span>' : ''}
                                </div>
                            </div>
                            <div class="user-actions">
                                ${!isMainAdmin ? `
                                    <button class="user-action-btn ${userData.blocked ? 'btn-success' : 'btn-danger'}" 
                                            onclick="toggleBlockUser('${username}', ${!userData.blocked})">
                                        ${userData.blocked ? '🔓 Разблокировать' : '🔒 Заблокировать'}
                                    </button>
                                    <button class="user-action-btn ${isUserAdmin ? 'btn-danger' : 'btn-success'}"
                                            onclick="toggleAdmin('${username}', ${!isUserAdmin})">
                                        ${isUserAdmin ? '👑 Убрать админа' : '👑 Сделать админом'}
                                    </button>
                                ` : '<span style="color: #ffd700;">Главный админ</span>'}
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            displayUsers();
            searchInput.oninput = (e) => displayUsers(e.target.value);
        });
    }).catch(error => {
        console.error('Ошибка загрузки админ-панели:', error);
    });
}

// Блокировка/разблокировка пользователя
window.toggleBlockUser = function(username, block) {
    if (!isAdmin || username === MAIN_ADMIN) return;
    
    database.ref('users/' + username + '/blocked').set(block)
        .then(() => {
            loadAdminPanel();
            if (currentUser) {
                loadUserChats();
            }
        })
        .catch(error => console.error('Ошибка блокировки:', error));
}

// Назначение/снятие админа
window.toggleAdmin = function(username, makeAdmin) {
    if (!isAdmin || username === MAIN_ADMIN) return;
    
    const ref = database.ref('admins/' + username);
    if (makeAdmin) {
        ref.set(true).then(() => loadAdminPanel());
    } else {
        ref.remove().then(() => loadAdminPanel());
    }
}
// ========== ЗАГРУЗКА ЧАТОВ ==========
function loadUserChats() {
    if (!currentUser) return;

    database.ref('userChats/' + currentUser).once('value', snapshot => {
        const chats = snapshot.val() || {};
        const chatsList = document.getElementById('chats-list');
        chatsList.innerHTML = '';

        const chatPromises = Object.keys(chats).map(async (chatId) => {
            if (chatId === 'general') {
                return { id: 'general', name: '🔊 Общий чат', blocked: false };
            } else {
                try {
                    const userSnapshot = await database.ref('users/' + chatId).once('value');
                    const userData = userSnapshot.val() || {};
                    return { 
                        id: chatId, 
                        name: `👤 ${chatId}`,
                        blocked: userData.blocked || false
                    };
                } catch (error) {
                    return { id: chatId, name: `👤 ${chatId}`, blocked: false };
                }
            }
        });

        Promise.all(chatPromises).then(chatItems => {
            chatItems.sort((a, b) => a.name.localeCompare(b.name));
            
            chatItems.forEach(chat => {
                const div = document.createElement('div');
                div.className = `chat-item ${chat.blocked ? 'blocked' : ''}`;
                div.dataset.chatid = chat.id;
                
                if (chat.blocked) {
                    div.innerHTML = `
                        ${chat.name}
                        <span class="blocked-badge">ЗАБЛОКИРОВАН</span>
                    `;
                } else {
                    div.textContent = chat.name;
                }
                
                if (!chat.blocked || chat.id === 'general') {
                    div.addEventListener('click', () => openChat(chat.id));
                }
                
                chatsList.appendChild(div);
            });
        });
    }).catch(error => {
        console.error('Ошибка загрузки чатов:', error);
    });
}

// ========== ОТКРЫТЬ ЧАТ ==========
function openChat(chatId) {
    if (chatId !== 'general') {
        database.ref('users/' + chatId).once('value', snapshot => {
            const userData = snapshot.val();
            if (userData && userData.blocked) {
                alert('Этот пользователь заблокирован администратором');
                return;
            }
            proceedToChat(chatId);
        });
    } else {
        proceedToChat(chatId);
    }
}

function proceedToChat(chatId) {
    currentChatId = chatId;
    
    if (chatId === 'general') {
        document.getElementById('chat-partner-name').textContent = 'Общий чат';
    } else {
        document.getElementById('chat-partner-name').textContent = chatId;
    }
    
    showScreen('chat');
    loadMessages(chatId);
}

// ========== ЗАГРУЗКА СООБЩЕНИЙ ==========
function loadMessages(chatId) {
    const messagesRef = database.ref('messages/' + chatId);
    
    messagesRef.off();
    
    messagesRef.on('value', snapshot => {
        const messages = snapshot.val() || {};
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        const sortedMessages = Object.entries(messages)
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        sortedMessages.forEach(([messageId, msg]) => {
            const div = document.createElement('div');
            div.className = `message ${msg.sender === currentUser ? 'own' : 'other'}`;
            div.dataset.messageId = messageId;
            div.dataset.sender = msg.sender;
            div.dataset.text = msg.text;
            
            if (chatId === 'general') {
                div.innerHTML = `<div class="message-sender">${msg.sender}</div>${msg.text}`;
            } else {
                if (msg.sender !== currentUser) {
                    div.innerHTML = `<div class="message-sender">${msg.sender}</div>${msg.text}`;
                } else {
                    div.textContent = msg.text;
                }
            }
            
            if (msg.sender === currentUser) {
                div.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    showMessageActions(messageId, msg.text);
                });
            }
            
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    }, error => {
        console.error('Ошибка загрузки сообщений:', error);
    });
}

// ========== ДЕЙСТВИЯ С СООБЩЕНИЯМИ ==========
function showMessageActions(messageId, currentText) {
    const existingMenu = document.querySelector('.message-actions');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'message-actions';
    menu.innerHTML = `
        <button class="message-action-btn" onclick="editMessage('${messageId}')">✏️ Изменить</button>
        <button class="message-action-btn" onclick="deleteMessage('${messageId}')">🗑️ Удалить</button>
    `;

    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
        messageElement.style.position = 'relative';
        messageElement.appendChild(menu);

        setTimeout(() => {
            if (menu.parentNode) menu.remove();
        }, 3000);
    }
}

window.deleteMessage = function(messageId) {
    if (!currentUser || !currentChatId) return;
    
    if (confirm('Удалить сообщение?')) {
        database.ref('messages/' + currentChatId + '/' + messageId).remove()
            .catch(error => console.error('Ошибка удаления:', error));
    }
    
    const menu = document.querySelector('.message-actions');
    if (menu) menu.remove();
}

window.editMessage = function(messageId) {
    selectedMessageId = messageId;
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (messageElement) {
        document.getElementById('edit-message-input').value = messageElement.dataset.text;
        document.getElementById('edit-message-modal').style.display = 'flex';
    }
    
    const menu = document.querySelector('.message-actions');
    if (menu) menu.remove();
}

document.getElementById('edit-message-save').addEventListener('click', () => {
    const newText = document.getElementById('edit-message-input').value.trim();
    
    if (!newText || !selectedMessageId || !currentChatId) {
        document.getElementById('edit-message-modal').style.display = 'none';
        return;
    }

    database.ref('messages/' + currentChatId + '/' + selectedMessageId).update({
        text: newText,
        edited: true
    }).then(() => {
        document.getElementById('edit-message-modal').style.display = 'none';
        selectedMessageId = null;
    }).catch(error => {
        console.error('Ошибка редактирования:', error);
        alert('Ошибка при редактировании');
    });
});

document.getElementById('edit-message-cancel').addEventListener('click', () => {
    document.getElementById('edit-message-modal').style.display = 'none';
    selectedMessageId = null;
});

// ========== ОТПРАВКА СООБЩЕНИЙ ==========
document.getElementById('send-message-btn').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text || !currentUser || !currentChatId) return;

    const messageId = Date.now().toString();
    const message = {
        sender: currentUser,
        text: text,
        timestamp: Date.now()
    };

    database.ref('messages/' + currentChatId + '/' + messageId).set(message)
        .then(() => input.value = '')
        .catch(error => console.error('Ошибка отправки:', error));
}

// ========== КНОПКА НАЗАД ИЗ ЧАТА ==========
document.getElementById('back-to-chats-btn').addEventListener('click', () => {
    if (currentChatId) {
        database.ref('messages/' + currentChatId).off();
    }
    showScreen('main');
});

// ========== ДОБАВЛЕНИЕ ЧАТА ==========
const modal = document.getElementById('add-chat-modal');

document.getElementById('add-chat-btn').addEventListener('click', () => {
    document.getElementById('new-chat-username').value = '';
    document.getElementById('modal-error').textContent = '';
    modal.style.display = 'flex';
});

document.getElementById('modal-cancel-btn').addEventListener('click', () => {
    modal.style.display = 'none';
});

document.getElementById('modal-add-btn').addEventListener('click', () => {
    const friendName = document.getElementById('new-chat-username').value.trim();
    const errorEl = document.getElementById('modal-error');

    if (!friendName) {
        errorEl.textContent = 'Введите имя пользователя';
        return;
    }

    if (friendName === currentUser) {
        errorEl.textContent = 'Нельзя добавить самого себя';
        return;
    }

    database.ref('users/' + friendName).once('value', snapshot => {
        if (!snapshot.exists()) {
            errorEl.textContent = 'Пользователь не найден';
            return;
        }

        const userData = snapshot.val();
        if (userData.blocked) {
            errorEl.textContent = 'Этот пользователь заблокирован';
            return;
        }

        Promise.all([
            database.ref('userChats/' + currentUser + '/' + friendName).set(true),
            database.ref('userChats/' + friendName + '/' + currentUser).set(true)
        ]).then(() => {
            modal.style.display = 'none';
            loadUserChats();
        }).catch(error => {
            errorEl.textContent = 'Ошибка: ' + error.message;
        });
    }).catch(error => {
        errorEl.textContent = 'Ошибка подключения к базе данных';
    });
});

// Закрытие модальных окон
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ========== НОВОЕ: УДАЛЕНИЕ АККАУНТА ЧЕРЕЗ МОДАЛЬНОЕ ОКНО ==========
const deleteModal = document.getElementById('delete-account-modal');
const deletePassword = document.getElementById('delete-account-password');
const deleteError = document.getElementById('delete-account-error');

// Показать модальное окно удаления
document.getElementById('show-delete-account-modal-btn').addEventListener('click', () => {
    if (!currentUser) return;
    
    if (currentUser === MAIN_ADMIN) {
        alert('Главный администратор не может удалить свой аккаунт');
        return;
    }
    
    deletePassword.value = '';
    deleteError.textContent = '';
    deleteModal.style.display = 'flex';
});

// Отмена удаления
document.getElementById('delete-account-cancel').addEventListener('click', () => {
    deleteModal.style.display = 'none';
    deletePassword.value = '';
    deleteError.textContent = '';
});

// Подтверждение удаления
document.getElementById('delete-account-confirm').addEventListener('click', () => {
    const password = deletePassword.value.trim();
    
    if (!password) {
        deleteError.textContent = 'Введите пароль';
        return;
    }
    
    // Проверяем пароль
    database.ref('users/' + currentUser).once('value', snapshot => {
        const userData = snapshot.val();
        
        if (!userData) {
            deleteError.textContent = 'Ошибка загрузки данных';
            return;
        }
        
        if (userData.password !== password) {
            deleteError.textContent = 'Неверный пароль';
            return;
        }
        
        // Финальное подтверждение
        const finalConfirm = confirm('⚠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ!\n\nВсе ваши сообщения, чаты и данные будут безвозвратно удалены. Продолжить?');
        
        if (!finalConfirm) return;
        
        // Показываем статус удаления
        deleteError.style.color = '#ff8c00';
        deleteError.textContent = 'Удаление аккаунта...';
        
        // Собираем все промисы для удаления
        const deletePromises = [
            database.ref('users/' + currentUser).remove(),
            database.ref('userChats/' + currentUser).remove(),
            database.ref('admins/' + currentUser).remove()
        ];
        
        // Удаляем все личные чаты с этим пользователем у других людей
        database.ref('userChats').once('value', snapshot => {
            const allChats = snapshot.val() || {};
            
            Object.entries(allChats).forEach(([userId, chats]) => {
                if (chats && chats[currentUser] === true) {
                    deletePromises.push(
                        database.ref('userChats/' + userId + '/' + currentUser).remove()
                    );
                }
            });
            
            // Выполняем все удаления
            Promise.all(deletePromises)
                .then(() => {
                    console.log('Аккаунт успешно удален:', currentUser);
                    
                    deleteModal.style.display = 'none';
                    alert('✅ Аккаунт успешно удален');
                    
                    // Выходим из аккаунта
                    currentUser = null;
                    isAdmin = false;
                    document.getElementById('admin-panel-btn').style.display = 'none';
                    showScreen('auth');
                    
                    // Сбрасываем формы
                    document.getElementById('login-form').style.display = 'block';
                    document.getElementById('register-form').style.display = 'none';
                    document.getElementById('show-register-btn').style.display = 'block';
                    document.getElementById('show-reset-password-btn').style.display = 'block';
                    document.getElementById('login-username').value = '';
                    document.getElementById('login-password').value = '';
                    
                    // Очищаем список чатов
                    document.getElementById('chats-list').innerHTML = '';
                })
                .catch(error => {
                    console.error('Ошибка при удалении:', error);
                    deleteError.style.color = '#dc3545';
                    deleteError.textContent = 'Ошибка: ' + error.message;
                });
        }).catch(error => {
            console.error('Ошибка при загрузке чатов:', error);
            deleteError.style.color = '#dc3545';
            deleteError.textContent = 'Ошибка загрузки данных';
        });
        
    }).catch(error => {
        console.error('Ошибка при проверке пароля:', error);
        deleteError.style.color = '#dc3545';
        deleteError.textContent = 'Ошибка подключения к базе данных';
    });
});

// Закрытие по клику вне модального окна
window.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        deleteModal.style.display = 'none';
        deletePassword.value = '';
        deleteError.textContent = '';
    }
});

// Закрытие по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && deleteModal.style.display === 'flex') {
        deleteModal.style.display = 'none';
        deletePassword.value = '';
        deleteError.textContent = '';
    }
});

// Очистка ошибки при вводе
deletePassword.addEventListener('input', () => {
    deleteError.textContent = '';
    deleteError.style.color = '#dc3545';
});

console.log('✅ Приложение Carrot полностью загружено');