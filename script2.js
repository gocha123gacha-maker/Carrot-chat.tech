// ============ РАБОТА С БАЛАНСОМ ============
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

// ============ РАБОТА С АВАТАРКАМИ ============
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
    
    // Проверка для верифицированной аватарки 🥕✔️
    if (avatar === '🥕✔️') {
        const verified = await isVerified(username);
        if (!verified) {
            showNotification('❌ Эта аватарка только для верифицированных аккаунтов!', true);
            return false;
        }
    }
    
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