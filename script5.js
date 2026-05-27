// ============ МАГАЗИН С МОРКОВКА+ ============
document.getElementById('shopBtn').addEventListener('click', async () => {
    console.log("🛒 Открытие магазина");
    
    try {
        // Загружаем данные
        await loadShopPrices();
        
        const balance = await getUserBalance(currentUser.username);
        const owned = await getUserOwnedAvatars(currentUser.username);
        const currentAvatar = await getUserAvatar(currentUser.username);
        
        document.getElementById('shopBalance').textContent = balance;
        
        let html = '';
        
        // Блок Морковка+ (проверяем наличие переменных)
        let hasPrem = false;
        let premStatus = "❌ Не куплен";
        let monthsLeft = 0;
        let premPrice = 1500;
        
        // Проверяем, есть ли функция hasPremium
        if (typeof hasPremium === 'function') {
            hasPrem = await hasPremium();
            if (hasPrem && premiumData) {
                premStatus = `✅ Активен до ${new Date(premiumData.expireDate).toLocaleDateString()}`;
                monthsLeft = premiumData.monthsLeft || 0;
            }
        }
        
        // Получаем цену Морковка+
        if (typeof PREMIUM_PRICE !== 'undefined') {
            premPrice = PREMIUM_PRICE;
        }
        
        html += `<div class="premium-block" style="margin-bottom:15px;padding:15px;background:linear-gradient(135deg,#fff8e1,#ffe0cc);border-radius:16px;text-align:center;border:2px solid #ff6b35;">
            <div style="font-size:28px;">👑 Морковка+ 👑</div>
            <div style="margin:8px 0;font-weight:bold;">🥕 Цена: ${premPrice} морковок</div>
            <div style="font-size:12px;color:#666;">➕ Продление: 10 🥕/месяц</div>
            <div style="font-size:12px;color:#666;">✨ Бонус: +1 🥕 каждый день в 12:00</div>
            <div style="font-size:12px;color:#666;">🎨 Разблокировка 5 аватарок</div>
            <div style="font-size:12px;color:#666;">🗑️ Удаление 5 чужих сообщений в день</div>
            <div style="margin:10px 0;font-weight:bold;">Статус: ${premStatus}</div>
            ${monthsLeft > 0 ? `<div style="font-size:11px;color:#ff6b35;">📅 Осталось месяцев: ${monthsLeft}</div>` : ''}
            ${!hasPrem ? '<button id="buyPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">💎 Купить Морковка+</button>' : '<button id="extendPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">🔄 Продлить</button>'}
        </div>`;
        
        // Аватарки
        const items = Object.entries(shopPrices).sort((a,b) => b[1] - a[1]);
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
        if (buyBtn && typeof buyPremium === 'function') {
            buyBtn.addEventListener('click', async () => {
                await buyPremium();
                document.getElementById('shopModal').style.display = 'none';
                setTimeout(() => document.getElementById('shopBtn').click(), 100);
            });
        }
        
        // Кнопка продления
        const extendBtn = document.getElementById('extendPremiumBtn');
        if (extendBtn && typeof showExtendModal === 'function') {
            extendBtn.addEventListener('click', () => {
                showExtendModal();
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
        
    } catch(e) {
        console.error("Ошибка:", e);
        showNotification("Ошибка загрузки магазина", true);
    }
});

function getAvatarName(av) {
    const names = { 
        '🥜':'Арахис', '🥔':'Картошка', '🍅':'Помидор', '🥒':'Огурец', 
        '🫜':'Редис', '🫛':'Горох', '🫑':'Перец', '🥕':'Морковь', 
        '🥗':'Салат', '🍄‍🟫':'Гриб'
    };
    return names[av] || av;
}