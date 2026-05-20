// ============ АДМИН ПАНЕЛЬ ============
console.log("admin.js загружен");

// Ждём появления кнопки профиля
setTimeout(function() {
    const userName = localStorage.getItem('currentUser');
    
    if (userName === "Кева✓") {
        const profileBtn = document.getElementById('profileBtn');
        const header = document.querySelector('.sidebar-header');
        
        if (!profileBtn && !header) {
            console.log("Элементы не найдены, повторяем...");
            setTimeout(arguments.callee, 500);
            return;
        }
        
        const adminBtn = document.createElement('button');
        adminBtn.id = 'adminPanelBtn';
        adminBtn.innerHTML = '👑';
        adminBtn.style.cssText = 'font-size:24px;background:rgba(255,215,0,0.3);border:none;border-radius:50%;width:44px;height:44px;margin-left:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
        adminBtn.title = 'Админ панель';
        adminBtn.onclick = showAdminPanel;
        
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
        console.log("✅ Кнопка админки добавлена");
    }
}, 3000);

async function showAdminPanel() {
    console.log("👑 Открытие админ панели");
    
    // Проверяем, что текущий пользователь - Кева✓
    const currentUserName = localStorage.getItem('currentUser');
    if (currentUserName !== "Кева✓") {
        if (window.showNotification) window.showNotification("Доступ только у Кева✓", true);
        return;
    }
    
    // Проверяем, что база данных доступна
    if (!window.database && !database) {
        console.error("❌ База данных не доступна");
        if (window.showNotification) window.showNotification("Ошибка: база данных не инициализирована", true);
        return;
    }
    
    const db = window.database || database;
    
    try {
        // Загружаем пользователей
        const usersSnap = await db.ref('users').get();
        const users = usersSnap.val() || {};
        const adminsSnap = await db.ref('admins').get();
        const admins = adminsSnap.val() || {};
        const blockedSnap = await db.ref('blocked').get();
        const blocked = blockedSnap.val() || {};
        
        // Загружаем цены
        const pricesSnap = await db.ref('shopPrices').get();
        const prices = pricesSnap.val() || { '🥔':10, '🍅':20, '🥒':36, '🫜':47, '🫛':58, '🫑':500, '🥗':100, '🍄‍🟫':120, '🥕':1000 };
        const premiumSnap = await db.ref('premiumPrice').get();
        const premiumPrice = premiumSnap.val() || 1500;
        
        let usersList = [];
        for (const [name] of Object.entries(users)) {
            let balance = 0;
            if (window.getUserBalance) {
                balance = await window.getUserBalance(name);
            }
            usersList.push({ 
                name, balance, 
                isAdmin: admins[name] === true || name === "Кева✓", 
                isBlocked: blocked[name] === true, 
                isMain: name === "Кева✓"
            });
        }
        usersList.sort((a,b) => a.isMain ? -1 : b.isMain ? 1 : 0);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:10000;';
        modal.innerHTML = `
            <div style="background:white;border-radius:24px;width:90%;max-width:500px;max-height:85vh;overflow:auto;">
                <div style="padding:16px;background:#ff6b35;color:white;display:flex;justify-content:space-between;">
                    <h3>👑 Админ панель</h3>
                    <button id="closeAdm" style="background:none;border:none;color:white;font-size:28px;">&times;</button>
                </div>
                <div style="padding:16px;">
                    <!-- Управление ценами -->
                    <div style="margin-bottom:20px;padding:12px;background:#e3f2fd;border-radius:16px;">
                        <h4>🏷️ Цена Морковка+</h4>
                        <div style="display:flex;gap:10px;margin-bottom:15px;">
                            <input type="number" id="premiumPriceInput" value="${premiumPrice}" style="flex:1;padding:8px;border-radius:8px;border:1px solid #ddd;">
                            <button id="savePremiumPrice" style="background:#4caf50;color:white;border:none;padding:8px 16px;border-radius:8px;">💾</button>
                        </div>
                        <h4>🏷️ Цены аватарок</h4>
                        <div id="avatarPricesList" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-height:200px;overflow:auto;">
                            ${Object.entries(prices).map(([av, pr]) => `
                                <div style="display:flex;align-items:center;gap:6px;background:white;padding:6px 10px;border-radius:10px;">
                                    <span style="font-size:24px;">${av}</span>
                                    <input type="number" class="avatarPrice" data-avatar="${av}" value="${pr}" style="flex:1;padding:6px;border-radius:8px;border:1px solid #ddd;">
                                    <button class="saveAvatarPrice" data-avatar="${av}" style="background:#4caf50;border:none;padding:5px 10px;border-radius:8px;color:white;">💾</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Выдача валюты -->
                    <div style="margin-bottom:20px;padding:12px;background:#e8f5e9;border-radius:16px;">
                        <h4>💰 Выдача валюты</h4>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <input type="text" id="coinUserName" placeholder="Имя пользователя" style="flex:2;padding:8px;border-radius:8px;border:1px solid #ddd;">
                            <input type="number" id="coinAmount" placeholder="Сумма" style="width:100px;padding:8px;border-radius:8px;border:1px solid #ddd;">
                            <button id="addCoinsBtn" style="background:#4caf50;color:white;border:none;padding:8px 16px;border-radius:8px;">➕ Добавить</button>
                            <button id="removeCoinsBtn" style="background:#dc3545;color:white;border:none;padding:8px 16px;border-radius:8px;">➖ Забрать</button>
                        </div>
                        <div id="coinError" style="color:red;font-size:12px;margin-top:8px;"></div>
                    </div>
                    
                    <!-- Список пользователей -->
                    <div style="margin-top:16px;padding:12px;background:#f5f5f5;border-radius:16px;">
                        <h4>👥 Пользователи</h4>
                        <input type="text" id="searchUsers" placeholder="🔍 Поиск..." style="width:100%;padding:8px;margin-bottom:8px;border-radius:8px;border:1px solid #ddd;">
                        <div id="usersList" style="max-height:300px;overflow:auto;"></div>
                    </div>
                </div>
                <div style="padding:12px;background:#f9f9f9;border-top:1px solid #ddd;text-align:right;">
                    <button id="closeAdmFooter" style="background:#999;color:white;border:none;padding:8px 20px;border-radius:12px;">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const close = () => modal.remove();
        document.getElementById('closeAdm').onclick = close;
        document.getElementById('closeAdmFooter').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };
        
        function renderUsers(search = '') {
            let filtered = usersList;
            if (search) filtered = usersList.filter(u => u.name.toLowerCase().includes(search));
            const container = document.getElementById('usersList');
            container.innerHTML = filtered.map(u => `
                <div style="padding:10px;border-bottom:1px solid #ddd;background:${u.isMain ? '#fff8e1' : (u.isBlocked ? '#ffebee' : 'white')};border-radius:10px;margin-bottom:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                        <div>
                            <strong>${u.name}</strong> 
                            ${u.isMain ? '<span style="background:gold;padding:2px 6px;border-radius:10px;font-size:10px;">👑</span>' : ''}
                            ${u.isAdmin && !u.isMain ? '<span style="background:#ff6b35;color:white;padding:2px 6px;border-radius:10px;font-size:10px;">⭐</span>' : ''}
                            ${u.isBlocked ? '<span style="background:#dc3545;color:white;padding:2px 6px;border-radius:10px;font-size:10px;">🚫</span>' : ''}
                            <div style="font-size:11px;">🥕 ${u.balance}</div>
                        </div>
                        ${!u.isMain ? `
                            <div style="display:flex;gap:5px;flex-wrap:wrap;">
                                ${u.isAdmin ? `<button class="removeAdmin" data-user="${u.name}" style="background:#ff9800;border:none;padding:3px 8px;border-radius:8px;color:white;">⭐ Забрать</button>` : `<button class="makeAdmin" data-user="${u.name}" style="background:#4caf50;border:none;padding:3px 8px;border-radius:8px;color:white;">👑 Дать</button>`}
                                ${u.isBlocked ? `<button class="unblockUser" data-user="${u.name}" style="background:#2196f3;border:none;padding:3px 8px;border-radius:8px;color:white;">🔓 Разбл.</button>` : `<button class="blockUser" data-user="${u.name}" style="background:#dc3545;border:none;padding:3px 8px;border-radius:8px;color:white;">🔒 Забл.</button>`}
                                <button class="add100Btn" data-user="${u.name}" style="background:#ff6b35;border:none;padding:3px 8px;border-radius:8px;color:white;">+100</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('.makeAdmin').forEach(btn => {
                btn.onclick = async () => { await db.ref(`admins/${btn.dataset.user}`).set(true); alert(`${btn.dataset.user} теперь админ!`); close(); showAdminPanel(); };
            });
            document.querySelectorAll('.removeAdmin').forEach(btn => {
                btn.onclick = async () => { await db.ref(`admins/${btn.dataset.user}`).remove(); alert(`У ${btn.dataset.user} отобраны права`); close(); showAdminPanel(); };
            });
            document.querySelectorAll('.blockUser').forEach(btn => {
                btn.onclick = async () => { await db.ref(`blocked/${btn.dataset.user}`).set(true); alert(`${btn.dataset.user} заблокирован`); close(); showAdminPanel(); };
            });
            document.querySelectorAll('.unblockUser').forEach(btn => {
                btn.onclick = async () => { await db.ref(`blocked/${btn.dataset.user}`).remove(); alert(`${btn.dataset.user} разблокирован`); close(); showAdminPanel(); };
            });
            document.querySelectorAll('.add100Btn').forEach(btn => {
                btn.onclick = async () => {
                    if (window.addCoins) {
                        await window.addCoins(btn.dataset.user, 100);
                        alert(`Добавлено 100 🥕 пользователю ${btn.dataset.user}`);
                        close(); showAdminPanel();
                    }
                };
            });
        }
        
        renderUsers();
        document.getElementById('searchUsers').oninput = (e) => renderUsers(e.target.value.toLowerCase());
        
        // Сохранение цены Морковка+
        document.getElementById('savePremiumPrice').onclick = async () => {
            const newPrice = parseInt(document.getElementById('premiumPriceInput').value);
            if (newPrice && newPrice > 0) {
                await db.ref('premiumPrice').set(newPrice);
                if (window.updatePremiumPrice) await window.updatePremiumPrice(newPrice);
                alert(`Цена Морковка+ изменена на ${newPrice} 🥕`);
                close(); showAdminPanel();
            } else { alert("Введите корректную цену"); }
        };
        
        // Сохранение цен аватарок
        document.querySelectorAll('.saveAvatarPrice').forEach(btn => {
            btn.onclick = async () => {
                const avatar = btn.dataset.avatar;
                const input = document.querySelector(`.avatarPrice[data-avatar="${avatar}"]`);
                const newPrice = parseInt(input.value);
                if (newPrice && newPrice > 0) {
                    await db.ref(`shopPrices/${avatar}`).set(newPrice);
                    if (window.updateShopPrice) await window.updateShopPrice(avatar, newPrice);
                    alert(`Цена на ${avatar} изменена на ${newPrice} 🥕`);
                    close(); showAdminPanel();
                } else { alert("Введите цену"); }
            };
        });
        
        // Выдача валюты
        document.getElementById('addCoinsBtn').onclick = async () => {
            const name = document.getElementById('coinUserName').value.trim();
            const amount = parseInt(document.getElementById('coinAmount').value);
            const errorEl = document.getElementById('coinError');
            if (!name) { errorEl.textContent = 'Введите имя'; return; }
            if (!amount || amount <= 0) { errorEl.textContent = 'Введите сумму'; return; }
            if (window.addCoins) {
                await window.addCoins(name, amount);
                errorEl.textContent = '';
                document.getElementById('coinUserName').value = '';
                document.getElementById('coinAmount').value = '';
                alert(`Добавлено ${amount} 🥕 пользователю ${name}`);
                close(); showAdminPanel();
            }
        };
        
        document.getElementById('removeCoinsBtn').onclick = async () => {
            const name = document.getElementById('coinUserName').value.trim();
            const amount = parseInt(document.getElementById('coinAmount').value);
            const errorEl = document.getElementById('coinError');
            if (!name) { errorEl.textContent = 'Введите имя'; return; }
            if (!amount || amount <= 0) { errorEl.textContent = 'Введите сумму'; return; }
            if (window.removeCoins) {
                const success = await window.removeCoins(name, amount);
                if (success) {
                    errorEl.textContent = '';
                    document.getElementById('coinUserName').value = '';
                    document.getElementById('coinAmount').value = '';
                    alert(`Забрано ${amount} 🥕 у пользователя ${name}`);
                    close(); showAdminPanel();
                } else {
                    errorEl.textContent = 'Недостаточно средств';
                }
            }
        };
        
    } catch(e) {
        console.error("Ошибка в админ-панели:", e);
        if (window.showNotification) window.showNotification("Ошибка загрузки админ-панели: " + e.message, true);
    }
}

console.log("✅ admin.js загружен");