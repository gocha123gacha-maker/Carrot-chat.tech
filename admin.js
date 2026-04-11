// АДМИН ПАНЕЛЬ - ПРОВЕРКА В БАЗЕ ДАННЫХ
(function() {
    let database = null;
    
    // Получаем database из глобального объекта
    function getDatabase() {
        if (database) return database;
        if (window.database) {
            database = window.database;
            return database;
        }
        return null;
    }
    
    // Проверка, является ли пользователь админом (из БД)
    async function isUserAdminFromDB(username) {
        const db = getDatabase();
        if (!db) return false;
        if (username === "Кева✓") return true; // Главный админ всегда админ
        
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
            const adminRef = ref(db, `admins/${username}`);
            const snapshot = await get(adminRef);
            return snapshot.val() === true;
        } catch (e) {
            console.error("Ошибка проверки админа:", e);
            return false;
        }
    }
    
    // Получение текущего пользователя
    async function getCurrentUserFromDB() {
        let username = localStorage.getItem('currentUser');
        if (!username && window.currentUser) username = window.currentUser.username;
        if (!username && window.currentUserGetter) {
            const u = window.currentUserGetter();
            if (u) username = u.username;
        }
        if (!username) return null;
        
        const isAdmin = await isUserAdminFromDB(username);
        return { username, isAdmin };
    }
    
    // Добавление кнопки в профиль
    async function addAdminButtonToProfile() {
        const user = await getCurrentUserFromDB();
        if (!user || !user.isAdmin) return;
        
        let checkInterval = setInterval(function() {
            let profileModal = document.getElementById('profileModal');
            if (profileModal) {
                let modalBody = profileModal.querySelector('.modal-body');
                if (modalBody && !document.getElementById('adminInProfileBtn')) {
                    let adminSection = document.createElement('div');
                    adminSection.className = 'profile-section';
                    adminSection.style.cssText = 'margin-top:12px; border-color:#ff6b35; background:#fff8e1;';
                    adminSection.innerHTML = `
                        <h4>👑 Админ панель</h4>
                        <button id="adminInProfileBtn" style="background:#ff6b35; color:white; border:none; padding:10px; border-radius:12px; width:100%; font-size:14px; cursor:pointer;">🔧 Открыть админ панель</button>
                    `;
                    
                    let logoutSection = modalBody.querySelector('.profile-section:last-child');
                    if (logoutSection) {
                        modalBody.insertBefore(adminSection, logoutSection);
                    } else {
                        modalBody.appendChild(adminSection);
                    }
                    
                    document.getElementById('adminInProfileBtn').onclick = function() {
                        document.getElementById('profileModal').style.display = 'none';
                        showAdminPanel();
                    };
                }
                clearInterval(checkInterval);
            }
        }, 500);
        
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    // Функция админ панели
    window.showAdminPanel = async function() {
        const user = await getCurrentUserFromDB();
        if (!user || !user.isAdmin) {
            alert("У вас нет прав администратора!");
            return;
        }
        
        const db = getDatabase();
        if (!db) {
            alert("Ошибка подключения к базе данных");
            return;
        }
        
        const { ref, get, set, remove } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
        
        // Получаем список пользователей с их статусами
        const usersSnap = await get(ref(db, 'users'));
        const users = usersSnap.val() || {};
        
        const adminsSnap = await get(ref(db, 'admins'));
        const admins = adminsSnap.val() || {};
        
        const blockedSnap = await get(ref(db, 'blocked'));
        const blocked = blockedSnap.val() || {};
        
        let usersList = [];
        for (let name in users) {
            let balance = window.getUserBalance ? await window.getUserBalance(name) : 0;
            usersList.push({
                name: name,
                balance: balance,
                isAdmin: admins[name] === true || name === "Кева✓",
                isBlocked: blocked[name] === true,
                isMainAdmin: name === "Кева✓"
            });
        }
        
        // Создаём модальное окно
        let modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100000;';
        modal.innerHTML = `
            <div style="background:white;border-radius:20px;width:90%;max-width:450px;max-height:85vh;overflow:auto;padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                    <h2 style="margin:0;">👑 Админ панель</h2>
                    <button id="closeAdmBtn" style="background:none;border:none;font-size:28px;cursor:pointer;">&times;</button>
                </div>
                
                <div style="margin-bottom:20px;padding:15px;background:#fff8e1;border-radius:12px;">
                    <h4>💰 Выдача валюты</h4>
                    <input type="text" id="admUserName" placeholder="Имя пользователя" style="width:100%;padding:10px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;box-sizing:border-box;">
                    <input type="number" id="admAmount" placeholder="Сумма" style="width:100%;padding:10px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;box-sizing:border-box;">
                    <button id="admAddCoins" style="background:#4caf50;color:white;border:none;padding:12px;border-radius:10px;width:100%;cursor:pointer;">➕ Добавить монеты</button>
                </div>
                
                <div style="margin-bottom:20px;padding:15px;background:#f5f5f5;border-radius:12px;">
                    <h4>🏷️ Управление ценами</h4>
                    <div id="admPriceList" style="max-height:200px;overflow:auto;"></div>
                </div>
                
                <div style="padding:15px;background:#e8f5e9;border-radius:12px;">
                    <h4>👥 Управление пользователями</h4>
                    <input type="text" id="admSearchUser" placeholder="🔍 Поиск..." style="width:100%;padding:8px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;box-sizing:border-box;">
                    <div id="admUsersList" style="max-height:280px;overflow:auto;"></div>
                </div>
                
                <button id="closeAdmFooter" style="background:#999;color:white;border:none;padding:12px;border-radius:10px;width:100%;margin-top:15px;cursor:pointer;">Закрыть</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Закрытие
        let closeModal = () => modal.remove();
        document.getElementById('closeAdmBtn').onclick = closeModal;
        document.getElementById('closeAdmFooter').onclick = closeModal;
        modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        
        // Загружаем цены и пользователей
        await loadPrices();
        renderUsersList(usersList, '');
        
        // Поиск пользователей
        document.getElementById('admSearchUser').oninput = function() {
            let search = this.value.toLowerCase();
            let filtered = usersList.filter(u => u.name.toLowerCase().includes(search));
            renderUsersList(filtered, search);
        };
        
        // Добавление монет
        document.getElementById('admAddCoins').onclick = async () => {
            let name = document.getElementById('admUserName').value.trim();
            let amount = parseInt(document.getElementById('admAmount').value);
            if (!name) { alert("Введите имя пользователя"); return; }
            if (!amount || amount <= 0) { alert("Введите сумму"); return; }
            if (window.addCoins) {
                await window.addCoins(name, amount);
                alert(`✅ Добавлено ${amount} 🥕 пользователю ${name}`);
                document.getElementById('admUserName').value = '';
                document.getElementById('admAmount').value = '';
                // Обновляем список
                location.reload();
            }
        };
        
        async function loadPrices() {
            let container = document.getElementById('admPriceList');
            if (!container) return;
            
            let pricesRef = ref(db, 'shopPrices');
            let snap = await get(pricesRef);
            let prices = snap.val() || { '🥔':10, '🍅':20, '🥒':36, '🫜':47, '🫛':58, '🫑':64, '🥗':100, '🍄‍🟫':120, '🥕':1000 };
            
            container.innerHTML = Object.entries(prices).map(([av, pr]) => `
                <div style="display:flex;align-items:center;gap:8px;background:white;padding:8px;border-radius:10px;margin-bottom:5px;">
                    <span style="font-size:28px;">${av}</span>
                    <input type="number" id="price_${av.replace(/[^a-z]/gi,'')}" value="${pr}" style="flex:1;padding:6px;border-radius:8px;border:1px solid #ddd;">
                    <button class="savePriceBtn" data-av="${av}" style="background:#ff6b35;border:none;padding:6px 12px;border-radius:8px;color:white;cursor:pointer;">💾</button>
                </div>
            `).join('');
            
            document.querySelectorAll('.savePriceBtn').forEach(btn => {
                btn.onclick = async () => {
                    let av = btn.dataset.av;
                    let inp = document.getElementById(`price_${av.replace(/[^a-z]/gi,'')}`);
                    let newPrice = parseInt(inp.value);
                    if (newPrice > 0) {
                        await set(ref(db, `shopPrices/${av}`), newPrice);
                        alert(`Цена на ${av} изменена на ${newPrice} 🥕`);
                    }
                };
            });
        }
        
        function renderUsersList(list, search) {
            let container = document.getElementById('admUsersList');
            if (!container) return;
            
            container.innerHTML = list.map(u => `
                <div style="padding:10px;border-bottom:1px solid #ddd;background:${u.isMainAdmin ? '#fff8e1' : (u.isBlocked ? '#ffebee' : 'white')};border-radius:10px;margin-bottom:5px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                        <div>
                            <strong>${u.name}</strong>
                            ${u.isMainAdmin ? '<span style="background:gold;padding:2px 8px;border-radius:10px;font-size:11px;">👑 Главный</span>' : ''}
                            ${u.isAdmin && !u.isMainAdmin ? '<span style="background:#ff6b35;color:white;padding:2px 8px;border-radius:10px;font-size:11px;">⭐ Админ</span>' : ''}
                            ${u.isBlocked ? '<span style="background:#dc3545;color:white;padding:2px 8px;border-radius:10px;font-size:11px;">🚫 Заблокирован</span>' : ''}
                            <div style="font-size:12px;color:#666;">🥕 ${u.balance}</div>
                        </div>
                        ${!u.isMainAdmin ? `
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                ${u.isAdmin ? 
                                    `<button class="removeAdminBtn" data-name="${u.name}" style="background:#ff9800;border:none;padding:5px 12px;border-radius:8px;color:white;cursor:pointer;">⭐ Забрать админку</button>` :
                                    `<button class="makeAdminBtn" data-name="${u.name}" style="background:#4caf50;border:none;padding:5px 12px;border-radius:8px;color:white;cursor:pointer;">👑 Дать админку</button>`
                                }
                                ${u.isBlocked ?
                                    `<button class="unblockUserBtn" data-name="${u.name}" style="background:#2196f3;border:none;padding:5px 12px;border-radius:8px;color:white;cursor:pointer;">🔓 Разблокировать</button>` :
                                    `<button class="blockUserBtn" data-name="${u.name}" style="background:#dc3545;border:none;padding:5px 12px;border-radius:8px;color:white;cursor:pointer;">🔒 Заблокировать</button>`
                                }
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
            
            // Дать админку
            document.querySelectorAll('.makeAdminBtn').forEach(btn => {
                btn.onclick = async () => {
                    let name = btn.dataset.name;
                    await set(ref(db, `admins/${name}`), true);
                    alert(`✅ ${name} теперь администратор!`);
                    location.reload();
                };
            });
            
            // Забрать админку
            document.querySelectorAll('.removeAdminBtn').forEach(btn => {
                btn.onclick = async () => {
                    let name = btn.dataset.name;
                    await remove(ref(db, `admins/${name}`));
                    alert(`❌ У ${name} отобраны права администратора`);
                    location.reload();
                };
            });
            
            // Заблокировать
            document.querySelectorAll('.blockUserBtn').forEach(btn => {
                btn.onclick = async () => {
                    let name = btn.dataset.name;
                    await set(ref(db, `blocked/${name}`), true);
                    alert(`🚫 Пользователь ${name} заблокирован`);
                    // Если заблокирован текущий пользователь - выкидываем
                    let currentName = localStorage.getItem('currentUser');
                    if (currentName === name) {
                        localStorage.removeItem('currentUser');
                        alert("Ваш аккаунт заблокирован! Вы будете выведены из системы.");
                        setTimeout(() => location.reload(), 2000);
                    } else {
                        location.reload();
                    }
                };
            });
            
            // Разблокировать
            document.querySelectorAll('.unblockUserBtn').forEach(btn => {
                btn.onclick = async () => {
                    let name = btn.dataset.name;
                    await remove(ref(db, `blocked/${name}`));
                    alert(`✅ Пользователь ${name} разблокирован`);
                    location.reload();
                };
            });
        }
    };
    
    // Проверка при входе в аккаунт - если заблокирован, выкидываем
    async function checkBlockedOnLogin() {
        let username = localStorage.getItem('currentUser');
        if (!username) return;
        
        const db = getDatabase();
        if (!db) return;
        
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
            const blockedRef = ref(db, `blocked/${username}`);
            const snapshot = await get(blockedRef);
            if (snapshot.val() === true) {
                localStorage.removeItem('currentUser');
                alert("❌ Ваш аккаунт был заблокирован администратором!");
                location.reload();
            }
        } catch(e) {}
    }
    
    // Запускаем проверку блокировки и добавление кнопки
    setTimeout(checkBlockedOnLogin, 1000);
    setTimeout(addAdminButtonToProfile, 2000);
    setTimeout(addAdminButtonToProfile, 4000);
    
    // Проверка каждые 5 секунд
    setInterval(checkBlockedOnLogin, 5000);
})();