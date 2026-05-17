// ============ МОРКОВКА+ ПРЕМИУМ СТАТУС ============
let PREMIUM_PRICE = 1500;
const PREMIUM_MONTHLY_FEE = 10;
const PREMIUM_DAILY_BONUS = 1;
const PREMIUM_DELETE_LIMIT = 5;
const PREMIUM_UNLOCK_AVATARS = ['🥔', '🍅', '🥒', '🫜', '🫛'];

let premiumData = null;
let premiumDeleteToday = 0;
let lastPremiumDate = null;

async function loadPremiumPrice() {
    const snap = await database.ref('premiumPrice').get();
    if (snap.exists()) PREMIUM_PRICE = snap.val();
    else await database.ref('premiumPrice').set(PREMIUM_PRICE);
}

async function loadPremiumStatus() {
    if (!currentUser) return;
    const snap = await database.ref(`premium/${currentUser.username}`).get();
    if (snap.exists()) {
        premiumData = snap.val();
        const today = new Date().toDateString();
        if (premiumData.expireDate && new Date(premiumData.expireDate) < new Date()) {
            await database.ref(`premium/${currentUser.username}`).remove();
            premiumData = null;
            showNotification("⚠️ Срок Морковка+ истёк!", true);
        }
    }
    const today = new Date().toDateString();
    if (lastPremiumDate !== today) { premiumDeleteToday = 0; lastPremiumDate = today; }
}

async function hasPremium() {
    if (!currentUser) return false;
    if (!premiumData) await loadPremiumStatus();
    return premiumData !== null;
}

async function buyPremium() {
    if (await hasPremium()) { showNotification("У вас уже есть Морковка+!", true); return false; }
    const balance = await getUserBalance(currentUser.username);
    if (balance >= PREMIUM_PRICE) {
        await removeCoins(currentUser.username, PREMIUM_PRICE);
        const expireDate = new Date();
        expireDate.setMonth(expireDate.getMonth() + 1);
        await database.ref(`premium/${currentUser.username}`).set({
            activatedAt: new Date().toISOString(),
            expireDate: expireDate.toISOString(),
            monthsLeft: 1
        });
        premiumData = { expireDate: expireDate.toISOString(), monthsLeft: 1 };
        for (const avatar of PREMIUM_UNLOCK_AVATARS) await addOwnedAvatar(currentUser.username, avatar);
        showNotification(`🎉 Вы купили Морковка+ за ${PREMIUM_PRICE} 🥕! Разблокировано ${PREMIUM_UNLOCK_AVATARS.length} аватарок!`);
        return true;
    } else {
        showNotification(`Недостаточно 🥕! Нужно ${PREMIUM_PRICE}`, true);
        return false;
    }
}

async function extendPremiumMonths(months) {
    if (!await hasPremium()) { showNotification("У вас нет Морковка+", true); return false; }
    const totalCost = PREMIUM_MONTHLY_FEE * months;
    const balance = await getUserBalance(currentUser.username);
    if (balance >= totalCost) {
        await removeCoins(currentUser.username, totalCost);
        const newExpire = new Date(premiumData.expireDate);
        newExpire.setMonth(newExpire.getMonth() + months);
        const newMonthsLeft = (premiumData.monthsLeft || 1) + months;
        await database.ref(`premium/${currentUser.username}`).update({
            expireDate: newExpire.toISOString(),
            monthsLeft: newMonthsLeft
        });
        premiumData.expireDate = newExpire.toISOString();
        premiumData.monthsLeft = newMonthsLeft;
        showNotification(`✅ Морковка+ продлён на ${months} месяц(ев)! Снято ${totalCost} 🥕`);
        return true;
    } else {
        showNotification(`Недостаточно 🥕 для продления! Нужно ${totalCost}`, true);
        return false;
    }
}

function showExtendModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `<div class="modal-content" style="max-width:350px;">
        <div class="modal-header"><h3>🔄 Продление Морковка+</h3><span class="close">&times;</span></div>
        <div class="modal-body" style="text-align:center;">
            <div style="margin-bottom:15px;color:#666;">Выберите срок продления:</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="extend-option" data-months="1" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;">1 месяц - ${PREMIUM_MONTHLY_FEE} 🥕</button>
                <button class="extend-option" data-months="2" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;">2 месяца - ${PREMIUM_MONTHLY_FEE*2} 🥕</button>
                <button class="extend-option" data-months="3" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;">3 месяца - ${PREMIUM_MONTHLY_FEE*3} 🥕</button>
                <button class="extend-option" data-months="4" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;">4 месяца - ${PREMIUM_MONTHLY_FEE*4} 🥕</button>
                <button class="extend-option" data-months="5" style="background:#ff6b35;color:white;border:none;padding:12px;border-radius:12px;">5 месяцев - ${PREMIUM_MONTHLY_FEE*5} 🥕</button>
            </div>
        </div>
        <div class="modal-footer"><button class="btn-secondary close-btn">Отмена</button></div>
    </div>`;
    document.body.appendChild(modal);
    const closeModal = () => modal.remove();
    modal.querySelector('.close').onclick = closeModal;
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    document.querySelectorAll('.extend-option').forEach(btn => {
        btn.onclick = async () => {
            await extendPremiumMonths(parseInt(btn.dataset.months));
            closeModal();
            document.getElementById('shopModal').style.display = 'none';
            setTimeout(() => document.getElementById('shopBtn').click(), 100);
        };
    });
}

// ============ МАГАЗИН ============
document.getElementById('shopBtn').addEventListener('click', async () => {
    await loadShopPrices();
    await loadPremiumPrice();
    const balance = await getUserBalance(currentUser.username);
    const owned = await getUserOwnedAvatars(currentUser.username);
    const currentAvatar = await getUserAvatar(currentUser.username);
    const hasPrem = await hasPremium();
    document.getElementById('shopBalance').textContent = balance;
    const items = Object.entries(shopPrices).sort((a,b) => b[1] - a[1]);
    let html = '';
    
    const premStatus = hasPrem ? `✅ Активен до ${new Date(premiumData?.expireDate).toLocaleDateString()}` : "❌ Не куплен";
    const monthsLeft = premiumData?.monthsLeft || 0;
    
    html += `<div class="premium-block" style="margin-bottom:15px;padding:15px;background:linear-gradient(135deg,#fff8e1,#ffe0cc);border-radius:16px;text-align:center;border:2px solid #ff6b35;">
        <div style="font-size:28px;">👑 Морковка+ 👑</div>
        <div style="margin:8px 0;font-weight:bold;">🥕 Цена: ${PREMIUM_PRICE} морковок</div>
        <div style="font-size:12px;color:#666;">➕ Продление: ${PREMIUM_MONTHLY_FEE} 🥕/месяц</div>
        <div style="font-size:12px;color:#666;">✨ Бонус: +1 🥕 каждый день в 12:00</div>
        <div style="font-size:12px;color:#666;">🎨 Разблокировка ${PREMIUM_UNLOCK_AVATARS.length} аватарок</div>
        <div style="font-size:12px;color:#666;">🗑️ Удаление ${PREMIUM_DELETE_LIMIT} чужих сообщений в день</div>
        <div style="margin:10px 0;font-weight:bold;">Статус: ${premStatus}</div>
        ${monthsLeft > 0 ? `<div style="font-size:11px;color:#ff6b35;">📅 Осталось месяцев: ${monthsLeft}</div>` : ''}
        ${!hasPrem ? '<button id="buyPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">💎 Купить Морковка+</button>' : '<button id="extendPremiumBtn" class="btn-primary" style="margin-top:8px;width:100%;">🔄 Продлить</button>'}
    </div>`;
    
    html += items.map(([av, price]) => {
        const isOwned = owned[av] || (hasPrem && PREMIUM_UNLOCK_AVATARS.includes(av));
        const isCurrent = currentAvatar === av;
        return `<div class="shop-item" data-avatar="${av}" data-price="${price}">
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
    }).join('');
    
    document.getElementById('shopItems').innerHTML = html;
    document.getElementById('shopModal').style.display = 'flex';
    
    document.getElementById('buyPremiumBtn')?.addEventListener('click', async () => {
        await buyPremium();
        document.getElementById('shopModal').style.display = 'none';
        setTimeout(() => document.getElementById('shopBtn').click(), 100);
    });
    document.getElementById('extendPremiumBtn')?.addEventListener('click', () => { showExtendModal(); });
    
    document.querySelectorAll('.shop-item-buy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const item = btn.closest('.shop-item');
            await purchaseAvatar(currentUser.username, item.dataset.avatar);
            document.getElementById('shopModal').style.display = 'none';
            const newAvatar = await getUserAvatar(currentUser.username);
            if (userAvatar) userAvatar.textContent = newAvatar;
            await updateRainbowName();
        });
    });
    
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

function getAvatarName(av) {
    const names = { '🥜':'Арахис','🥔':'Картошка','🍅':'Помидор','🥒':'Огурец','🫜':'Редис','🫛':'Горох','🫑':'Перец','🥕':'Морковь','🥗':'Салат','🍄‍🟫':'Гриб' };
    return names[av] || av;
}