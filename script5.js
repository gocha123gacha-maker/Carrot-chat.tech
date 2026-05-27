// ============ МАГАЗИН ============
document.getElementById('shopBtn').addEventListener('click', async () => {
    console.log("🛒 Открытие магазина");
    
    await loadShopPrices();
    
    const balance = await getUserBalance(currentUser.username);
    const owned = await getUserOwnedAvatars(currentUser.username);
    const currentAvatar = await getUserAvatar(currentUser.username);
    
    // Проверяем премиум статус
    let hasPrem = false;
    let premExpireDate = null;
    let premMonthsLeft = 0;
    
    try {
        const premSnap = await database.ref(`premium/${currentUser.username}`).get();
        if (premSnap.exists()) {
            const premData = premSnap.val();
            if (premData.expireDate && new Date(premData.expireDate) > new Date()) {
                hasPrem = true;
                premExpireDate = new Date(premData.expireDate);
                premMonthsLeft = premData.monthsLeft || 1;
            }
        }
    } catch(e) {
        console.log("Ошибка проверки премиума:", e);
    }
    
    document.getElementById('shopBalance').textContent = balance;
    
    const items = Object.entries(shopPrices).sort((a,b) => b[1] - a[1]);
    let html = '';
    
    // Блок 🥕+
    const premStatus = hasPrem ? `✅ Активен до ${premExpireDate.toLocaleDateString()}` : "❌ Не куплен";
    
    html += `<div class="premium-block" style="margin-bottom:15px;padding:15px;background:linear-gradient(135deg,#fff8e1,#ffe0cc);border-radius:16px;text-align:center;border:2px solid #ff6b35;">
        <div style="font-size:28px;">🥕+ Премиум</div>
        <div style="margin:8px 0;font-weight:bold;">🥕 Цена: 1500 морковок</div>
        <div style="font-size:12px;color:#666;">➕ Продление: 10 🥕/месяц</div>
        <div style="font-size:12px;color:#666;">✨ Бонус: +1 🥕 каждый день в 12:00</div>
        <div style="font-size:12px;color:#666;">🎨 Разблокировка 5 аватарок</div>
        <div style="font-size:12px;color:#666;">🗑️ Удаление 5 чужих сообщений в день</div>
        <div style="margin:10px 0;font-weight:bold;">Статус: ${premStatus}</div>
        ${premMonthsLeft > 0 ? `<div style="font-size:11px;color:#ff6b35;">📅 Осталось месяцев: ${premMonthsLeft}</div>` : ''}
        ${!hasPrem ? '<button id="buyPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">💎 Купить 🥕+</button>' : '<button id="extendPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">🔄 Продлить 🥕+</button>'}
    </div>`;
    
    // Аватарки
    for (const [av, price] of items) {
        const isOwned = owned[av];
        const isCurrent = currentAvatar === av;
        
        html += `<div class="shop-item" data-avatar="${av}" data-price="${price}">
            <div class="shop-item-left">
                <div class="shop-item-emoji">${av}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${getAvatarName(av)}</div>
                    <div class="shop-item-price">🥕 ${price}</div>
                    ${isOwned ? (isCurrent ? '<div class="shop-item-owned">✅ Надета</div>' : '<div class="shop-item-owned">📦 В коллекции</div>') : ''}
                </div>
            </div>
            ${!isOwned ? '<button class="shop-item-buy">Купить</button>' : (isOwned && !isCurrent ? '<button class="shop-item-equip">Надеть</button>' : '')}
        </div>`;
    }
    
    document.getElementById('shopItems').innerHTML = html;
    document.getElementById('shopModal').style.display = 'flex';
    
    // Кнопка покупки премиума
    const buyBtn = document.getElementById('buyPremiumBtn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            const balanceNow = await getUserBalance(currentUser.username);
            if (balanceNow >= 1500) {
                await removeCoins(currentUser.username, 1500);
                const expireDate = new Date();
                expireDate.setMonth(expireDate.getMonth() + 1);
                await database.ref(`premium/${currentUser.username}`).set({
                    activatedAt: new Date().toISOString(),
                    expireDate: expireDate.toISOString(),
                    monthsLeft: 1
                });
                showNotification(`🎉 Вы купили 🥕+ Премиум!`);
                document.getElementById('shopModal').style.display = 'none';
                setTimeout(() => document.getElementById('shopBtn').click(), 100);
            } else {
                showNotification(`❌ Недостаточно 🥕! Нужно 1500`, true);
            }
        });
    }
    
    // Кнопка продления (открывает модальное окно с выбором)
    const extendBtn = document.getElementById('extendPremiumBtn');
    if (extendBtn) {
        extendBtn.addEventListener('click', () => {
            showExtendOptionsModal();
        });
    }
    
    // Покупка аватарок
    document.querySelectorAll('.shop-item-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const item = btn.closest('.shop-item');
            const avatar = item.dataset.avatar;
            await purchaseAvatar(currentUser.username, avatar);
            document.getElementById('shopModal').style.display = 'none';
            const newAvatar = await getUserAvatar(currentUser.username);
            if (userAvatar) userAvatar.textContent = newAvatar;
            await updateRainbowName();
        });
    });
    
    // Надевание аватарок
    document.querySelectorAll('.shop-item-equip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const item = btn.closest('.shop-item');
            const av = item.dataset.avatar;
            await setUserAvatar(currentUser.username, av);
            showNotification(`Аватарка ${av} надета!`);
            document.getElementById('shopModal').style.display = 'none';
            if (userAvatar) userAvatar.textContent = av;
            await updateRainbowName();
        });
    });
});

// Модальное окно для выбора срока продления
function showExtendOptionsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 350px;">
            <div class="modal-header">
                <h3>🔄 Продление 🥕+</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body" style="text-align: center;">
                <div style="margin-bottom: 15px; color: #666;">Выберите срок продления:</div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="extend-option" data-months="1" style="background: #ff6b35; color: white; border: none; padding: 12px; border-radius: 12px; cursor: pointer;">1 месяц - 10 🥕</button>
                    <button class="extend-option" data-months="2" style="background: #ff6b35; color: white; border: none; padding: 12px; border-radius: 12px; cursor: pointer;">2 месяца - 20 🥕</button>
                    <button class="extend-option" data-months="3" style="background: #ff6b35; color: white; border: none; padding: 12px; border-radius: 12px; cursor: pointer;">3 месяца - 30 🥕</button>
                    <button class="extend-option" data-months="4" style="background: #ff6b35; color: white; border: none; padding: 12px; border-radius: 12px; cursor: pointer;">4 месяца - 40 🥕</button>
                    <button class="extend-option" data-months="5" style="background: #ff6b35; color: white; border: none; padding: 12px; border-radius: 12px; cursor: pointer;">5 месяцев - 50 🥕</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary close-btn">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    modal.querySelector('.close').onclick = closeModal;
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.querySelectorAll('.extend-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const months = parseInt(btn.dataset.months);
            const totalCost = months * 10;
            const balance = await getUserBalance(currentUser.username);
            
            if (balance >= totalCost) {
                await removeCoins(currentUser.username, totalCost);
                const premSnap = await database.ref(`premium/${currentUser.username}`).get();
                const premData = premSnap.val();
                const newExpire = new Date(premData.expireDate);
                newExpire.setMonth(newExpire.getMonth() + months);
                const newMonthsLeft = (premData.monthsLeft || 1) + months;
                await database.ref(`premium/${currentUser.username}`).update({
                    expireDate: newExpire.toISOString(),
                    monthsLeft: newMonthsLeft
                });
                showNotification(`✅ 🥕+ Премиум продлён на ${months} месяц(ев)!`);
                closeModal();
                document.getElementById('shopModal').style.display = 'none';
                setTimeout(() => document.getElementById('shopBtn').click(), 100);
            } else {
                showNotification(`❌ Недостаточно 🥕! Нужно ${totalCost}`, true);
            }
        });
    });
}

function getAvatarName(av) {
    const names = { 
        '🥜':'Арахис', '🥔':'Картошка', '🍅':'Помидор', '🥒':'Огурец', 
        '🫜':'Редис', '🫛':'Горох', '🫑':'Перец', '🥕':'Морковь', 
        '🥗':'Салат', '🍄‍🟫':'Гриб'
    };
    return names[av] || av;
}