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

let currentUser = null;
let currentChat = { id: 'general', name: 'Общий чат', type: 'general', icon: '🌍', path: 'messages/general' };
let allChats = [];

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

function sendNotification(title, body) {
    if (!notificationPermission && Notification.permission === "granted") {
        notificationPermission = true;
    }
    
    if (!notificationPermission) return;
    if (currentChat && currentChat.type === 'general') return;
    
    try {
        var notification = new Notification(title, { body: body });
        notification.onclick = function() { window.focus(); notification.close(); };
        setTimeout(function() { notification.close(); }, 8000);
    } catch(e) { console.log("Ошибка уведомления:", e); }
}

setTimeout(function() { requestNotificationPermission(); }, 2000);

// ============ БАЛАНС И МОНЕТЫ ============
async function getUserBalance(username) {
    const snap = await database.ref(`balances/${username}`).get();
    return snap.val() || 0;
}

async function updateUserBalance(username, newBalance) {
    await database.ref(`balances/${username}`).set(newBalance);
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

// ============ АВАТАРКИ ============
async function getUserAvatar(username) {
    const snap = await database.ref(`avatars/${username}`).get();
    return snap.val() || '🥜';
}

async function setUserAvatar(username, avatar) {
    await database.ref(`avatars/${username}`).set(avatar);
}

async function getUserOwnedAvatars(username) {
    const snap = await database.ref(`ownedAvatars/${username}`).get();
    return snap.val() || { '🥜': true };
}

async function addOwnedAvatar(username, avatar) {
    const owned = await getUserOwnedAvatars(username);
    owned[avatar] = true;
    await database.ref(`ownedAvatars/${username}`).set(owned);
}

async function loadShopPrices() {
    const snap = await database.ref('shopPrices').get();
    if (snap.exists()) {
        shopPrices = snap.val();
    } else {
        await database.ref('shopPrices').set(shopPrices);
    }
}

async function isUserBlocked(username) {
    const snap = await database.ref(`blocked/${username}`).get();
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

// ============ ПРОВЕРКА ПРЕМИУМ СТАТУСА ============
async function hasPremium() {
    if (!currentUser) return false;
    try {
        const snap = await database.ref(`premium/${currentUser.username}`).get();
        if (!snap.exists()) return false;
        const premData = snap.val();
        if (premData.expireDate && new Date(premData.expireDate) > new Date()) {
            return true;
        }
        return false;
    } catch(e) {
        return false;
    }
}

// ============ ЦВЕТА ИМЕНИ (ПРОСТАЯ ВЕРСИЯ) ============
async function getUserColor(username) {
    const snap = await database.ref(`userColors/${username}`).get();
    return snap.val() || null;
}

async function setUserColor(username, color) {
    await database.ref(`userColors/${username}`).set(color);
}

console.log("✅ script1.js загружен");