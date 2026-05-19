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

// ============ УВЕДОМЛЕНИЯ ============
let notificationPermission = false;
let lastNotificationTime = {};

// Запрос разрешения на уведомления
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("Браузер не поддерживает уведомления");
        return false;
    }
    
    if (Notification.permission === "granted") {
        notificationPermission = true;
        return true;
    }
    
    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        notificationPermission = permission === "granted";
        return notificationPermission;
    }
    
    return false;
}

// Отправка уведомления (только для ЛС)
function sendNotification(title, body, tag = null) {
    if (!notificationPermission) return;
    
    // Не показываем уведомления для общего чата
    if (currentChat && currentChat.type === 'general') return;
    
    // Защита от дублей (1 уведомление в 5 секунд на один чат)
    const now = Date.now();
    if (tag && lastNotificationTime[tag] && now - lastNotificationTime[tag] < 5000) return;
    if (tag) lastNotificationTime[tag] = now;
    
    const options = {
        body: body,
        icon: "https://gocha123gacha-maker.github.io/Carrot-chat.tech/favicon.ico",
        silent: false,
        vibrate: [200, 100, 200]
    };
    
    const notification = new Notification(title, options);
    
    notification.onclick = function() {
        window.focus();
        notification.close();
    };
    
    setTimeout(() => notification.close(), 10000);
}

// Запрашиваем разрешение при загрузке
setTimeout(() => {
    requestNotificationPermission();
}, 1000);

console.log("✅ script1.js загружен");