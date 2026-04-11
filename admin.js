// АДМИНКА - КНОПКА В ПРОФИЛЕ
(function() {
    // Функция добавления кнопки в профиль
    function addAdminButtonToProfile() {
        let userName = localStorage.getItem('currentUser');
        if (userName !== "Кева✓") return;
        
        // Ждём появления модалки профиля
        let checkInterval = setInterval(function() {
            let profileModal = document.getElementById('profileModal');
            if (profileModal) {
                let modalBody = profileModal.querySelector('.modal-body');
                if (modalBody && !document.getElementById('adminInProfileBtn')) {
                    // Создаём секцию с админкой
                    let adminSection = document.createElement('div');
                    adminSection.className = 'profile-section';
                    adminSection.style.cssText = 'margin-top:12px; border-color:#ff6b35; background:#fff8e1;';
                    adminSection.innerHTML = `
                        <h4>👑 Админ панель</h4>
                        <button id="adminInProfileBtn" style="background:#ff6b35; color:white; border:none; padding:10px; border-radius:12px; width:100%; font-size:14px; cursor:pointer;">🔧 Открыть админ панель</button>
                    `;
                    
                    // Вставляем перед выходом или в конец
                    let logoutSection = modalBody.querySelector('.profile-section:last-child');
                    if (logoutSection) {
                        modalBody.insertBefore(adminSection, logoutSection);
                    } else {
                        modalBody.appendChild(adminSection);
                    }
                    
                    document.getElementById('adminInProfileBtn').onclick = function() {
                        // Закрываем профиль и открываем админку
                        document.getElementById('profileModal').style.display = 'none';
                        showAdminPanel();
                    };
                }
            }
        }, 500);
        
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    // Функция админ панели
    window.showAdminPanel = async function() {
        let userName = localStorage.getItem('currentUser');
        if (userName !== "Кева✓") {
            alert("Нет прав администратора");
            return;
        }
        
        // Создаём модальное окно админки
        let modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100000;';
        modal.innerHTML = `
            <div style="background:white;border-radius:20px;width:90%;max-width:400px;max-height:85vh;overflow:auto;padding:20px;">
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
                    <h4>👥 Пользователи</h4>
                    <input type="text" id="admSearchUser" placeholder="🔍 Поиск..." style="width:100%;padding:8px;margin-bottom:10px;border-radius:10px;border:1px solid #ddd;box-sizing:border-box;">
                    <div id="admUsersList" style="max-height:250px;overflow:auto;"></div>
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
        
        // Загружаем данные
        await loadPrices();
        await loadUsersList();
        
        // Поиск пользователей
        document.getElementById('admSearchUser').oninput = function() {
            loadUsersList(this.value.toLowerCase());
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
                await loadUsersList();
            }
        };
    };
    
    async function loadPrices() {
        let container = document.getElementById('admPriceList');
        if (!container) return;
        if (!window.database) { container.innerHTML = '<div>Ошибка БД</div>'; return; }
        
        try {
            const { ref, get, set } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
            let pricesRef = ref(window.database, 'shopPrices');
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
                        const { ref, set } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
                        await set(ref(window.database, `shopPrices/${av}`), newPrice);
                        alert(`Цена на ${av} изменена на ${newPrice} 🥕`);
                    }
                };
            });
        } catch(e) { console.error(e); }
    }
    
    async function loadUsersList(search = '') {
        let container = document.getElementById('admUsersList');
        if (!container) return;
        if (!window.database) { container.innerHTML = '<div>Ошибка БД</div>'; return; }
        
        try {
            const { ref, get } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
            let usersSnap = await get(ref(window.database, 'users'));
            let users = usersSnap.val() || {};
            
            let usersList = [];
            for (let name in users) {
                let balance = window.getUserBalance ? await window.getUserBalance(name) : 0;
                usersList.push({ name, balance });
            }
            
            if (search) {
                usersList = usersList.filter(u => u.name.toLowerCase().includes(search));
            }
            
            container.innerHTML = usersList.map(u => `
                <div style="padding:10px;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong>${u.name}</strong>
                        <div style="font-size:11px;color:#666;">🥕 ${u.balance}</div>
                    </div>
                    <div style="display:flex;gap:5px;">
                        <button class="add100Btn" data-name="${u.name}" style="background:#4caf50;border:none;padding:5px 10px;border-radius:8px;color:white;cursor:pointer;">+100</button>
                        <button class="blockUserBtn" data-name="${u.name}" style="background:#dc3545;border:none;padding:5px 10px;border-radius:8px;color:white;cursor:pointer;">🔒</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('.add100Btn').forEach(btn => {
                btn.onclick = async () => {
                    let name = btn.dataset.name;
                    if (window.addCoins) {
                        await window.addCoins(name, 100);
                        alert(`✅ Добавлено 100 🥕 пользователю ${name}`);
                        await loadUsersList(search);
                    }
                };
            });
            
            document.querySelectorAll('.blockUserBtn').forEach(btn => {
                btn.onclick = async () => {
                    let name = btn.dataset.name;
                    if (name === "Кева✓") { alert("Нельзя заблокировать главного админа"); return; }
                    const { ref, set } = await import("https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js");
                    await set(ref(window.database, `blocked/${name}`), true);
                    alert(`🚫 Пользователь ${name} заблокирован`);
                };
            });
            
        } catch(e) { console.error(e); }
    }
    
    // Запускаем добавление кнопки в профиль
    setTimeout(addAdminButtonToProfile, 1000);
    setTimeout(addAdminButtonToProfile, 3000);
    setTimeout(addAdminButtonToProfile, 5000);
})();