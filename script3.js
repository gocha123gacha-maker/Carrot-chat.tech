// ============ АВТОРИЗАЦИЯ ============
console.log("script3.js загружен");

// Переключение между вкладками
const tabBtns = document.querySelectorAll('.tab-btn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (tabBtns.length) {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const tabName = this.getAttribute('data-tab');
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

// Вход
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("🔑 Вход...");
        
        const username = document.getElementById('loginName').value.trim();
        const password = document.getElementById('loginPass').value;
        const errorEl = document.getElementById('loginError');
        if (errorEl) errorEl.textContent = '';
        
        if (!username || !password) {
            if (errorEl) errorEl.textContent = 'Заполните все поля';
            return;
        }
        
        try {
            const snap = await database.ref(`users/${username}`).get();
            
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
            
            console.log("✅ Вход выполнен, загружаем мессенджер");
            await loadMessenger();
            
        } catch (error) {
            console.error("Ошибка входа:", error);
            if (errorEl) errorEl.textContent = 'Ошибка подключения';
        }
    });
}

// Регистрация
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("📝 Регистрация...");
        
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
            const exists = await database.ref(`users/${username}`).get();
            
            if (exists.exists()) {
                if (errorEl) errorEl.textContent = 'Имя уже занято';
                return;
            }
            
            await database.ref(`users/${username}`).set({ 
                username: username, 
                password: password, 
                chats: { general: true }, 
                createdAt: Date.now() 
            });
            
            await updateUserBalance(username, 5);
            await database.ref(`ownedAvatars/${username}`).set({ '🥜': true });
            await setUserAvatar(username, '🥜');
            
            showNotification('✅ Регистрация успешна! Вы получили 5 🥕 бонусом!');
            console.log("✅ Регистрация завершена");
            
            // Очищаем поля
            document.getElementById('regName').value = '';
            document.getElementById('regPass').value = '';
            document.getElementById('regConfirmPass').value = '';
            
            // Переключаем на вкладку входа
            const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
            if (loginTab) loginTab.click();
            
        } catch (error) {
            console.error("Ошибка регистрации:", error);
            if (errorEl) errorEl.textContent = 'Ошибка: ' + error.message;
        }
    });
}

// Загрузка основного мессенджера
async function loadMessenger() {
    console.log("loadMessenger вызван, currentUser:", currentUser);
    
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser && !currentUser) {
        const snap = await database.ref(`users/${savedUser}`).get();
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
    
    if (!currentUser) {
        console.log("❌ Нет пользователя");
        return;
    }
    
    console.log("✅ Загрузка мессенджера для:", currentUser.username);
    
    // Загружаем цены
    await loadShopPrices();
    
    // Переключаем экраны
    authScreen.style.display = 'none';
    messengerScreen.style.display = 'block';
    
    // Отображаем имя пользователя
    currentUserName.textContent = currentUser.username;
    
    // Загружаем аватарку
    const avatar = await getUserAvatar(currentUser.username);
    if (userAvatar) userAvatar.textContent = avatar;
    
    // Обновляем разноцветное имя
    await updateRainbowName();
    
    // Загружаем чаты и сообщения
    await loadChats();
    await loadMessages();
    
    // Мобильная навигация
    if (window.innerWidth < 768) showChats();
    
    // Поиск чатов
    const searchInput = document.getElementById('searchChats');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => { 
            const search = e.target.value.toLowerCase(); 
            const filtered = allChats.filter(chat => chat.name.toLowerCase().includes(search)); 
            renderChats(filtered); 
        });
    }
}

// Экспортируем loadMessenger в глобальную область
window.loadMessenger = loadMessenger;

console.log("✅ script3.js готов");