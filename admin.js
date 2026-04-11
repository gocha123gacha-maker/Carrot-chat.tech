// АДМИНКА - РАБОЧАЯ ВЕРСИЯ С УПРАВЛЕНИЕМ ЦЕНАМИ
console.log("admin.js загружен");

setTimeout(function() {
    var userName = localStorage.getItem('currentUser');
    
    if (userName === "Кева✓") {
        var profileBtn = document.getElementById('profileBtn');
        var header = document.querySelector('.sidebar-header');
        
        var adminBtn = document.createElement('button');
        adminBtn.id = 'adminPanelBtn';
        adminBtn.innerHTML = '👑';
        adminBtn.style.cssText = 'font-size:24px;background:rgba(255,215,0,0.3);border:none;border-radius:50%;width:44px;height:44px;margin-left:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
        adminBtn.title = 'Админ панель';
        adminBtn.onclick = function() {
            showAdminPanel();
        };
        
        if (profileBtn) {
            profileBtn.parentNode.insertBefore(adminBtn, profileBtn);
        } else if (header) {
            header.appendChild(adminBtn);
        } else {
            adminBtn.style.position = 'fixed';
            adminBtn.style.top = '10px';
            adminBtn.style.right = '70px';
            adminBtn.style.zIndex = '99999';
            document.body.appendChild(adminBtn);
        }
    }
}, 3000);

async function showAdminPanel() {
    if (!window.database) {
        if (window.showNotification) window.showNotification("Ошибка: база данных не инициализирована", true);
        return;
    }
    
    const { ref, get, set, remove } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
    
    // Загружаем пользователей
    const usersSnap = await get(ref(window.database, 'users'));
    const users = usersSnap.val() || {};
    const adminsSnap = await get(ref(window.database, 'admins'));
    const admins = adminsSnap.val() || {};
    const blockedSnap = await get(ref(window.database, 'blocked'));
    const blocked = blockedSnap.val() || {};
    
    // Загружаем цены
    const pricesSnap = await get(ref(window.database, 'shopPrices'));
    const prices = pricesSnap.val() || { '🥔':10, '🍅':20, '🥒':36, '🫜':47, '🫛':58, '🫑':500, '🥗':100, '🍄‍🟫':120, '🥕':1000 };
    const premiumSnap = await get(ref(window.database, 'premiumPrice'));
    const premiumPrice = premiumSnap.val() || 1500;
    
    let usersList = [];
    for (const [name] of Object.entries(users)) {
        let balance = 0;
        if (window.getUserBalance) balance = await window.getUserBalance(name);
        usersList.push({ name, balance, isAdmin: admins[name] === true || name === "Кева✓", isBlocked: blocked[name] === true, isMain: name === "Кева✓" });
    }
    usersList.sort((a,b) => a.isMain ? -1 : b.isMain ? 1 : 0);
    
    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;';
    modal.innerHTML = `
        <div style="background:white;border-radius:20px;width:90%;max-width:500px;max-height:85vh;overflow:auto;padding:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
                <h2>👑 Админ панель</h2>
                <button id="closeAdmBtn" style="background:none;border:none;font-size:28px;cursor:pointer;">&times;</button>
            </div>
            
            <!-- Управление ценами -->
            <div style="margin-bottom:15px;padding:10px;background:#e3f2fd;border-radius:12px;">
                <h4>🏷️ Управление ценами</h4>
                
                <div style="margin-bottom:12px;padding:8px;background:#fff8e1;border-radius:10px;">
                    <div style="font-weight:bold;margin-bottom:5px;">👑 Морковка+</div>
                    <div style="display:flex;gap:8px;">
                        <input type="number" id="premiumPriceInput" value="${premiumPrice}" style="flex:1;padding:8px;border-radius:8px;border:1px solid #ddd;" min="1">
                        <button id="savePremiumPriceBtn" style="background:#4caf50;color:white;border:none;padding:8px 16px;border-radius:8px;">💾 Сохранить</button>
                    </div>
                </div>
                
                <div style="font-weight:bold;margin-bottom:8px;">🥕 Аватарки</div>
                <div id="avatarPricesList" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-height:200px;overflow:auto;">
                    ${Object.entries(prices).map(([av, pr]) => `
                        <div style="display:flex;align-items:center;gap:6px;background:white;padding:6px 10px;border-radius:10px;">
                            <span style="font-size:24px;">${av}</span>
                            <input type="number" class="avatarPriceInput" data-avatar="${av}" value="${pr}" style="flex:1;padding:6px;border-radius:8px;border:1px solid #ddd;" min="1">
                            <button class="saveAvatarPriceBtn" data-avatar="${av}" style="background:#4caf50;border:none;padding:5px 10px;border-radius:8px;color:white;">💾</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Выдача валюты -->
            <div style="margin-bottom:15px;padding:10px;background:#e8f5e9;border-radius:12px;">
                <h4>💰 Выдача валюты</h4>
                <input type="text" id="coinUserName" placeholder="Имя пользователя" style="width:100%;padding:8px;margin-bottom:8px;border-radius:8px;border:1px solid #ddd;">
                <input type="number" id="coinAmount" placeholder="Сумма" style="width:100%;padding:8px;margin-bottom:8px;border-radius:8px;border:1px solid #ddd;">
                <button id="addCoinsBtn" style="background:#4caf50;color:white;border:none;padding:10px;border-radius:8px;width:100%;">➕ Добавить монеты</button>
            </div>
            
            <!-- Пользователи -->
            <div style="padding:10px;background:#f5f5f5;border-radius:12px;">
                <h4>👥 Пользователи</h4>
                <input type="text" id="searchUsersInput" placeholder="🔍 Поиск..." style="width:100%;padding:8px;margin-bottom:8px;border-radius:8px;border:1px solid #ddd;">
                <div id="usersListContainer" style="max-height:250px;overflow:auto;"></div>
            </div>
            
            <button id="closeAdmFooter" style="background:#999;color:white;border:none;padding:10px;border-radius:8px;width:100%;margin-top:15px;">Закрыть</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    document.getElementById('closeAdmBtn').onclick = closeModal;
    document.getElementById('closeAdmFooter').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    // Сохранение цены Морковка+
    document.getElementById('savePremiumPriceBtn').onclick = async () => {
        const newPrice = parseInt(document.getElementById('premiumPriceInput').value);
        if (newPrice && newPrice > 0) {
            await set(ref(window.database, 'premiumPrice'), newPrice);
            if (window.updatePremiumPrice) await window.updatePremiumPrice(newPrice);
            if (window.showNotification) window.showNotification(`Цена Морковка+ изменена на ${newPrice} 🥕`);
            closeModal();
            showAdminPanel();
        } else {
            if (window.showNotification) window.showNotification("Введите корректную цену", true);
        }
    };
    
    // Сохранение цен аватарок
    document.querySelectorAll('.saveAvatarPriceBtn').forEach(btn => {
        btn.onclick = async () => {
            const avatar = btn.dataset.avatar;
            const input = document.querySelector(`.avatarPriceInput[data-avatar="${avatar}"]`);
            const newPrice = parseInt(input.value);
            if (newPrice && newPrice > 0) {
                await set(ref(window.database, `shopPrices/${avatar}`), newPrice);
                if (window.updateShopPrice) await window.updateShopPrice(avatar, newPrice);
                if (window.showNotification) window.showNotification(`Цена на ${avatar} изменена на ${newPrice} 🥕`);
                closeModal();
                showAdminPanel();
            } else {
                if (window.showNotification) window.showNotification("Введите корректную цену", true);
            }
        };
    });
    
    // Отображаем пользователей
    const container = document.getElementById('usersListContainer');
    function renderUsers(search = '') {
        let filtered = usersList;
        if (search) filtered = usersList.filter(u => u.name.toLowerCase().includes(search));
        container.innerHTML = filtered.map(u => `
            <div style="padding:8px;border-bottom:1px solid #ddd;background:${u.isMain ? '#fff8e1' : (u.isBlocked ? '#ffebee' : 'white')};border-radius:8px;margin-bottom:5px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                    <div><strong>${u.name}</strong> ${u.isMain ? '<span style="background:gold;padding:2px 6px;border-radius:10px;font-size:10px;">👑</span>' : ''} ${u.isAdmin && !u.isMain ? '<span style="background:#ff6b35;color:white;padding:2px 6px;border-radius:10px;font-size:10px;">⭐</span>' : ''} ${u.isBlocked ? '<span style="background:#dc3545;color:white;padding:2px 6px;border-radius:10px;font-size:10px;">🚫</span>' : ''}<div style="font-size:10px;">🥕 ${u.balance}</div></div>
                    ${!u.isMain ? `
                        <div style="display:flex;gap:5px;margin-top:5px;">
                            ${u.isAdmin ? `<button class="removeAdmin" data-user="${u.name}" style="background:#ff9800;border:none;padding:3px 8px;border-radius:6px;color:white;">⭐ Забрать</button>` : `<button class="makeAdmin" data-user="${u.name}" style="background:#4caf50;border:none;padding:3px 8px;border-radius:6px;color:white;">👑 Дать</button>`}
                            ${u.isBlocked ? `<button class="unblockUser" data-user="${u.name}" style="background:#2196f3;border:none;padding:3px 8px;border-radius:6px;color:white;">🔓 Разбл.</button>` : `<button class="blockUser" data-user="${u.name}" style="background:#dc3545;border:none;padding:3px 8px;border-radius:6px;color:white;">🔒 Забл.</button>`}
                            <button class="add100Btn" data-user="${u.name}" style="background:#ff6b35;border:none;padding:3px 8px;border-radius:6px;color:white;">+100</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.makeAdmin').forEach(btn => {
            btn.onclick = async () => { await set(ref(window.database, `admins/${btn.dataset.user}`), true); if (window.showNotification) window.showNotification(`${btn.dataset.user} теперь админ!`); closeModal(); showAdminPanel(); };
        });
        document.querySelectorAll('.removeAdmin').forEach(btn => {
            btn.onclick = async () => { await remove(ref(window.database, `admins/${btn.dataset.user}`)); if (window.showNotification) window.showNotification(`У ${btn.dataset.user} отобраны права`); closeModal(); showAdminPanel(); };
        });
        document.querySelectorAll('.blockUser').forEach(btn => {
            btn.onclick = async () => { await set(ref(window.database, `blocked/${btn.dataset.user}`), true); if (window.showNotification) window.showNotification(`${btn.dataset.user} заблокирован`); closeModal(); showAdminPanel(); };
        });
        document.querySelectorAll('.unblockUser').forEach(btn => {
            btn.onclick = async () => { await remove(ref(window.database, `blocked/${btn.dataset.user}`)); if (window.showNotification) window.showNotification(`${btn.dataset.user} разблокирован`); closeModal(); showAdminPanel(); };
        });
        document.querySelectorAll('.add100Btn').forEach(btn => {
            btn.onclick = async () => {
                if (window.addCoins) {
                    await window.addCoins(btn.dataset.user, 100);
                    if (window.showNotification) window.showNotification(`Добавлено 100 🥕 пользователю ${btn.dataset.user}`);
                    closeModal();
                    showAdminPanel();
                }
            };
        });
    }
    
    renderUsers();
    document.getElementById('searchUsersInput').oninput = (e) => renderUsers(e.target.value.toLowerCase());
    
    // Добавление монет
    document.getElementById('addCoinsBtn').onclick = async () => {
        const name = document.getElementById('coinUserName').value.trim();
        const amount = parseInt(document.getElementById('coinAmount').value);
        if (!name) { if (window.showNotification) window.showNotification("Введите имя", true); return; }
        if (!amount || amount <= 0) { if (window.showNotification) window.showNotification("Введите сумму", true); return; }
        if (window.addCoins) {
            await window.addCoins(name, amount);
            if (window.showNotification) window.showNotification(`Добавлено ${amount} 🥕 пользователю ${name}`);
            document.getElementById('coinUserName').value = '';
            document.getElementById('coinAmount').value = '';
            closeModal();
            showAdminPanel();
        }
    };
}