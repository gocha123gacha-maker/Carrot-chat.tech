// Админ панель для пользователя "Кева✓"

const ADMIN_NAME = "Кева✓";
let database = null;

// Получение database из глобального объекта
function getDatabase() {
    if (database) return database;
    if (window.database) {
        database = window.database;
        return database;
    }
    return null;
}

// Получение текущего пользователя
function getCurrentUser() {
    if (window.currentUser) return window.currentUser;
    if (window.currentUserGetter) return window.currentUserGetter();
    return null;
}

// Проверка, является ли текущий пользователь админом
function isAdmin() {
    const user = getCurrentUser();
    const result = user && user.username === ADMIN_NAME;
    if (result) console.log("✅ Админ подтверждён:", user.username);
    return result;
}

// Создание кнопки админ-панели (коронка)
function createAdminButton() {
    if (!isAdmin()) {
        console.log("Не админ, кнопка не создаётся");
        return;
    }
    
    console.log("Создаём кнопку админки...");
    
    let attempts = 0;
    const maxAttempts = 50;
    
    const tryCreate = () => {
        const sidebarHeader = document.querySelector('.sidebar-header');
        const existingBtn = document.getElementById('adminPanelBtn');
        
        if (sidebarHeader && !existingBtn) {
            console.log("Нашли sidebar-header, создаём кнопку");
            const adminBtn = document.createElement('button');
            adminBtn.id = 'adminPanelBtn';
            adminBtn.className = 'icon-btn';
            adminBtn.innerHTML = '👑';
            adminBtn.style.fontSize = '22px';
            adminBtn.style.background = 'rgba(255,215,0,0.3)';
            adminBtn.style.borderRadius = '50%';
            adminBtn.style.width = '40px';
            adminBtn.style.height = '40px';
            adminBtn.style.display = 'flex';
            adminBtn.style.alignItems = 'center';
            adminBtn.style.justifyContent = 'center';
            adminBtn.style.cursor = 'pointer';
            adminBtn.style.transition = 'all 0.2s';
            adminBtn.title = 'Админ панель';
            
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) {
                sidebarHeader.insertBefore(adminBtn, profileBtn);
            } else {
                sidebarHeader.appendChild(adminBtn);
            }
            
            adminBtn.addEventListener('click', showAdminPanel);
            return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
            setTimeout(tryCreate, 200);
        } else {
            console.log("Не удалось найти sidebar-header");
        }
    };
    
    tryCreate();
}

// Показать админ панель
async function showAdminPanel() {
    const oldModal = document.getElementById('adminPanelModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'adminPanelModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header" style="padding: 12px 16px; background: #ff6b35;">
                <span class="modal-icon">👑</span>
                <h3 style="font-size: 18px; color: white;">Админ панель</h3>
                <span class="close" style="font-size: 24px; color: white; cursor: pointer;">&times;</span>
            </div>
            <div class="modal-body" style="padding: 14px;">
                <input type="text" id="adminSearchInput" placeholder="🔍 Поиск пользователя..." class="input-field" style="margin-bottom: 12px; padding: 10px 14px; width: 100%; border-radius: 12px; border: 1px solid #ddd;">
                <div id="adminUsersList" style="max-height: 400px; overflow-y: auto;">
                    <div style="text-align:center;padding:20px;">Загрузка пользователей...</div>
                </div>
            </div>
            <div class="modal-footer" style="padding: 10px 14px;">
                <button class="btn-secondary close-btn" style="padding: 8px 16px; border-radius: 12px;">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    modal.querySelector('.close').onclick = closeModal;
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    await loadAdminUsersList();
    
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
        searchInput.oninput = (e) => loadAdminUsersList(e.target.value.toLowerCase());
    }
}

// Загрузка списка пользователей
async function loadAdminUsersList(searchTerm = '') {
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:20px;">Загрузка пользователей...</div>';
    
    const db = getDatabase();
    if (!db) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#dc3545;">Ошибка: База данных не инициализирована</div>';
        return;
    }
    
    try {
        const { ref, get } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
        
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();
        
        if (!users || Object.keys(users).length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;">Нет пользователей</div>';
            return;
        }
        
        const adminsSnapshot = await get(ref(db, 'admins'));
        const admins = adminsSnapshot.val() || {};
        
        const blockedSnapshot = await get(ref(db, 'blocked'));
        const blocked = blockedSnapshot.val() || {};
        
        let usersList = Object.keys(users).map(username => ({
            username: username,
            isAdmin: admins[username] === true || username === ADMIN_NAME,
            isBlocked: blocked[username] === true,
            isMainAdmin: username === ADMIN_NAME
        }));
        
        if (searchTerm) {
            usersList = usersList.filter(u => u.username.toLowerCase().includes(searchTerm));
        }
        
        usersList.sort((a, b) => {
            if (a.isMainAdmin) return -1;
            if (b.isMainAdmin) return 1;
            if (a.isAdmin && !b.isAdmin) return -1;
            if (!a.isAdmin && b.isAdmin) return 1;
            return a.username.localeCompare(b.username);
        });
        
        if (usersList.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;">Пользователи не найдены</div>';
            return;
        }
        
        container.innerHTML = usersList.map(user => `
            <div class="admin-user-item" style="
                padding: 10px 12px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 8px;
                background: ${user.isMainAdmin ? '#fff8e1' : (user.isBlocked ? '#ffebee' : 'white')};
                border-radius: 10px;
                margin-bottom: 6px;
            ">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        ${escapeHtml(user.username)}
                        ${user.isMainAdmin ? '<span style="background: gold; color: #333; padding: 2px 6px; border-radius: 10px; font-size: 10px;">👑 Главный</span>' : ''}
                        ${user.isAdmin && !user.isMainAdmin ? '<span style="background: #ff6b35; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">⭐ Админ</span>' : ''}
                        ${user.isBlocked ? '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">🚫 Заблокирован</span>' : ''}
                    </div>
                </div>
                ${!user.isMainAdmin ? `
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        ${user.isAdmin ? `
                            <button class="admin-remove-admin" data-user="${user.username}" style="background: #ff9800; border: none; padding: 4px 10px; border-radius: 8px; color: white; cursor: pointer; font-size: 11px;">
                                ⭐ Забрать
                            </button>
                        ` : `
                            <button class="admin-make-admin" data-user="${user.username}" style="background: #4caf50; border: none; padding: 4px 10px; border-radius: 8px; color: white; cursor: pointer; font-size: 11px;">
                                👑 Дать
                            </button>
                        `}
                        ${user.isBlocked ? `
                            <button class="admin-unblock" data-user="${user.username}" style="background: #2196f3; border: none; padding: 4px 10px; border-radius: 8px; color: white; cursor: pointer; font-size: 11px;">
                                🔓 Разбл.
                            </button>
                        ` : `
                            <button class="admin-block" data-user="${user.username}" style="background: #dc3545; border: none; padding: 4px 10px; border-radius: 8px; color: white; cursor: pointer; font-size: 11px;">
                                🔒 Забл.
                            </button>
                        `}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        // Обработчики для кнопок
        document.querySelectorAll('.admin-make-admin').forEach(btn => {
            btn.onclick = async () => {
                await setAdminStatus(btn.dataset.user, true);
                await loadAdminUsersList(searchTerm);
            };
        });
        
        document.querySelectorAll('.admin-remove-admin').forEach(btn => {
            btn.onclick = async () => {
                await setAdminStatus(btn.dataset.user, false);
                await loadAdminUsersList(searchTerm);
            };
        });
        
        document.querySelectorAll('.admin-block').forEach(btn => {
            btn.onclick = async () => {
                await setUserBlocked(btn.dataset.user, true);
                await loadAdminUsersList(searchTerm);
            };
        });
        
        document.querySelectorAll('.admin-unblock').forEach(btn => {
            btn.onclick = async () => {
                await setUserBlocked(btn.dataset.user, false);
                await loadAdminUsersList(searchTerm);
            };
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#dc3545;">Ошибка загрузки пользователей</div>';
    }
}

// Установка статуса админа
async function setAdminStatus(username, makeAdmin) {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.username !== ADMIN_NAME) {
        if (window.showNotification) {
            window.showNotification("Только главный администратор может управлять админами!", true);
        }
        return;
    }
    
    if (username === ADMIN_NAME) return;
    
    const db = getDatabase();
    if (!db) return;
    
    const { ref, set, remove } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
    
    if (makeAdmin) {
        await set(ref(db, `admins/${username}`), true);
        if (window.showNotification) window.showNotification(`${username} теперь администратор!`);
    } else {
        await remove(ref(db, `admins/${username}`));
        if (window.showNotification) window.showNotification(`У ${username} отобраны права администратора`);
    }
}

// Блокировка/разблокировка пользователя
async function setUserBlocked(username, isBlocked) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    if (username === ADMIN_NAME) {
        if (window.showNotification) window.showNotification("Нельзя заблокировать главного администратора!", true);
        return;
    }
    
    const db = getDatabase();
    if (!db) return;
    
    const { ref, set, remove } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
    
    if (isBlocked) {
        await set(ref(db, `blocked/${username}`), true);
        if (window.showNotification) window.showNotification(`${username} заблокирован`);
    } else {
        await remove(ref(db, `blocked/${username}`));
        if (window.showNotification) window.showNotification(`${username} разблокирован`);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("admin.js загружен, проверка админа...");
    setTimeout(() => {
        const user = getCurrentUser();
        console.log("Текущий пользователь:", user);
        if (user && user.username === ADMIN_NAME) {
            console.log("Админ найден, создаём кнопку");
            createAdminButton();
        } else {
            console.log("Админ не найден, username:", user?.username);
        }
    }, 1500);
});

// Также пробуем через интервал
let checkInterval = setInterval(() => {
    const user = getCurrentUser();
    if (user && user.username === ADMIN_NAME) {
        createAdminButton();
        clearInterval(checkInterval);
    }
}, 500);

// Через 5 секунд очищаем интервал
setTimeout(() => clearInterval(checkInterval), 10000);