// ============ КОНФИГУРАЦИЯ FIREBASE ============
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

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Глобальные переменные
let currentUser = null;
let currentChat = { id: 'general', name: 'Общий чат', type: 'general', icon: '🌍', path: 'messages/general' };
let allChats = [];

// Цены на аватарки
let shopPrices = { '🥔':10, '🍅':20, '🥒':36, '🫜':47, '🫛':58, '🫑':500, '🥗':100, '🍄‍🟫':120, '🥕':1000 };

// DOM элементы
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

// Вспомогательные функции
function escapeHtml(t) {
    if (!t) return '';
    const div = document.createElement('div');
    div.textContent = t;
    return div.innerHTML;
}

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

// ============ УВЕДОМЛЕНИЯ ДЛЯ ТЕЛЕФОНА ============
let notificationPermission = false;

// Запрос разрешения на уведомления
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Браузер не поддерживает уведомления");
        return;
    }
    
    if (Notification.permission === "granted") {
        notificationPermission = true;
        console.log("✅ Уведомления разрешены");
        return;
    }
    
    if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function(permission) {
            notificationPermission = permission === "granted";
            console.log("Результат запроса:", notificationPermission ? "✅ Разрешено" : "❌ Отказано");
        });
    }
}

// Отправка уведомления (упрощённая версия для телефона)
function sendNotification(title, body) {
    if (!notificationPermission && Notification.permission === "granted") {
        notificationPermission = true;
    }
    
    if (!notificationPermission) {
        console.log("Уведомления не разрешены");
        return;
    }
    
    // НЕ показываем уведомления из общего чата
    if (currentChat && currentChat.type === 'general') {
        console.log("Общий чат - уведомление не отправлено");
        return;
    }
    
    try {
        var notification = new Notification(title, { body: body });
        console.log("Уведомление отправлено:", title);
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
        
        setTimeout(function() { notification.close(); }, 8000);
    } catch(e) {
        console.log("Ошибка уведомления:", e);
    }
}

// Запрашиваем разрешение через 2 секунды после загрузки
setTimeout(function() {
    requestNotificationPermission();
}, 2000);

console.log("✅ script1.js загружен");