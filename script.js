// Конфигурация Firebase (ваша)
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

// DOM элементы
const screens = {
    auth: document.getElementById('auth-screen'),
    main: document.getElementById('main-screen'),
    profile: document.getElementById('profile-screen'),
    chat: document.getElementById('chat-screen'),
    reset: document.getElementById('reset-screen')
};

// Переключение экранов
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// НАВИГАЦИЯ МЕЖДУ ФОРМАМИ АВТОРИЗАЦИИ
document.getElementById('show-register-btn').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('show-register-btn').style.display = 'none';
    document.getElementById('show-reset-password-btn').style.display = 'none';
    document.getElementById('auth-error').textContent = '';
});

document.getElementById('back-to-login-from-register').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('show-register-btn').style.display = 'block';
    document.getElementById('show-reset-password-btn').style.display = 'block';
    document.getElementById('auth-error').textContent = '';
});

document.getElementById('show-reset-password-btn').addEventListener('click', () => {
    showScreen('reset');
});

document.getElementById('back-to-auth-from-reset').addEventListener('click', () => {
    showScreen('auth');
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

    // Проверяем, существует ли пользователь
    database.ref('users/' + username).once('value', snapshot => {
        if (snapshot.exists()) {
            errorEl.textContent = 'Имя пользователя уже занято';
            return;
        }

        // Создаем пользователя
        const userData = {
            password: password,
            email: '',
            created: Date.now()
        };

        database.ref('users/' + username).set(userData)
            .then(() => {
                // Создаем общий чат для пользователя, если его нет
                return database.ref('userChats/' + username + '/general').set(true);
            })
            .then(() => {
                currentUser = username;
                document.getElementById('profile-username').textContent = username;
                document.getElementById('profile-email').value = '';
                loadUserChats();
                showScreen('main');
            })
            .catch(error => {
                errorEl.textContent = 'Ошибка: ' + error.message;
            });
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
        if (userData.password !== password) {
            errorEl.textContent = 'Неверный пароль';
            return;
        }

        // Успешный вход
        currentUser = username;
        document.getElementById('profile-username').textContent = username;
        document.getElementById('profile-email').value = userData.email || '';
        
        // Убедимся, что общий чат есть у пользователя
        database.ref('userChats/' + username + '/general').set(true)
            .then(() => {
                loadUserChats();
                showScreen('main');
            });
    });
});

// ========== СБРОС ПАРОЛЯ ==========
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

        // Генерируем новый пароль
        const newPassword = Math.random().toString(36).slice(-8);
        
        database.ref('users/' + username + '/password').set(newPassword)
            .then(() => {
                alert(`Новый пароль: ${newPassword}\nЗапишите его!`);
                showScreen('auth');
            })
            .catch(error => {
                errorEl.textContent = 'Ошибка: ' + error.message;
            });
    });
});

// ========== ПРОФИЛЬ ==========
document.getElementById('save-email-btn').addEventListener('click', () => {
    if (!currentUser) return;
    
    const email = document.getElementById('profile-email').value.trim();
    database.ref('users/' + currentUser + '/email').set(email)
        .then(() => {
            alert('Email сохранен');
        })
        .catch(error => {
            alert('Ошибка: ' + error.message);
        });
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    showScreen('auth');
    
    // Сбрасываем формы
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('show-register-btn').style.display = 'block';
    document.getElementById('show-reset-password-btn').style.display = 'block';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
});

// ========== НАВИГАЦИЯ ==========
document.getElementById('nav-chats').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-chats').classList.add('active');
    loadUserChats();
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
    loadUserChats();
    showScreen('main');
});

document.getElementById('nav-profile-from-profile').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');
    showScreen('profile');
});

// ========== ЗАГРУЗКА ЧАТОВ ==========
function loadUserChats() {
    if (!currentUser) return;

    database.ref('userChats/' + currentUser).once('value', snapshot => {
        const chats = snapshot.val() || {};
        const chatsList = document.getElementById('chats-list');
        chatsList.innerHTML = '';

        // Общий чат всегда первый
        const generalDiv = document.createElement('div');
        generalDiv.className = 'chat-item';
        generalDiv.dataset.chatid = 'general';
        generalDiv.textContent = '🔊 Общий чат';
        chatsList.appendChild(generalDiv);

        // Личные чаты
        Object.keys(chats).forEach(chatId => {
            if (chatId !== 'general') {
                const div = document.createElement('div');
                div.className = 'chat-item';
                div.dataset.chatid = chatId;
                div.textContent = `👤 ${chatId}`;
                chatsList.appendChild(div);
            }
        });

        // Добавляем обработчики
        document.querySelectorAll('.chat-item').forEach(el => {
            el.addEventListener('click', () => openChat(el.dataset.chatid));
        });
    });
}

// ========== ОТКРЫТЬ ЧАТ ==========
function openChat(chatId) {
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
    
    // Отписываемся от предыдущих слушателей
    messagesRef.off();
    
    messagesRef.on('value', snapshot => {
        const messages = snapshot.val() || {};
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        // Сортируем по времени
        const sortedMessages = Object.entries(messages)
            .sort((a, b) => a[1].timestamp - b[1].timestamp);

        sortedMessages.forEach(([key, msg]) => {
            const div = document.createElement('div');
            div.className = `message ${msg.sender === currentUser ? 'own' : 'other'}`;
            
            if (chatId === 'general') {
                // В общем чате показываем отправителя
                div.innerHTML = `<div class="message-sender">${msg.sender}</div>${msg.text}`;
            } else {
                // В личном чате показываем имя только для чужих сообщений
                if (msg.sender !== currentUser) {
                    div.innerHTML = `<div class="message-sender">${msg.sender}</div>${msg.text}`;
                } else {
                    div.textContent = msg.text;
                }
            }
            
            container.appendChild(div);
        });
        
        // Скролл вниз
        container.scrollTop = container.scrollHeight;
    });
}

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
        .then(() => {
            input.value = '';
        })
        .catch(error => {
            console.error('Ошибка отправки:', error);
        });
}

// ========== КНОПКА НАЗАД ИЗ ЧАТА ==========
document.getElementById('back-to-chats-btn').addEventListener('click', () => {
    if (currentChatId) {
        database.ref('messages/' + currentChatId).off();
    }
    showScreen('main');
});

// ========== МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ЧАТА ==========
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

    // Проверяем, существует ли пользователь
    database.ref('users/' + friendName).once('value', snapshot => {
        if (!snapshot.exists()) {
            errorEl.textContent = 'Пользователь не найден';
            return;
        }

        // Добавляем чат обоим пользователям
        Promise.all([
            database.ref('userChats/' + currentUser + '/' + friendName).set(true),
            database.ref('userChats/' + friendName + '/' + currentUser).set(true)
        ]).then(() => {
            modal.style.display = 'none';
            loadUserChats(); // Обновляем список чатов
        }).catch(error => {
            errorEl.textContent = 'Ошибка: ' + error.message;
        });
    });
});

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Создаем общий чат при первом запуске
database.ref('messages/general').once('value', snapshot => {
    if (!snapshot.exists()) {
        database.ref('messages/general/welcome').set({
            sender: 'system',
            text: 'Добро пожаловать в общий чат Carrot!',
            timestamp: Date.now()
        });
    }
});

console.log('Приложение Carrot готово к работе!');