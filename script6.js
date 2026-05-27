// ============ ПРОФИЛЬ ============
document.getElementById('profileBtn').addEventListener('click', async () => {
    document.getElementById('profileBalance').textContent = await getUserBalance(currentUser.username);
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileAvatar').textContent = await getUserAvatar(currentUser.username);
    document.getElementById('profileModal').style.display = 'flex';
    document.getElementById('profileError').textContent = '';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
});

document.getElementById('sendCoinsBtn').addEventListener('click', () => {
    document.getElementById('profileModal').style.display = 'none';
    document.getElementById('sendCoinsModal').style.display = 'flex';
    document.getElementById('sendCoinsError').textContent = '';
    document.getElementById('recipientName').value = '';
    document.getElementById('coinsAmount').value = '';
});

document.getElementById('confirmSendCoins').addEventListener('click', async () => {
    const recipient = document.getElementById('recipientName').value.trim();
    const amount = parseInt(document.getElementById('coinsAmount').value);
    const err = document.getElementById('sendCoinsError');
    
    if (!recipient) {
        err.textContent = 'Введите имя';
        return;
    }
    if (!amount || amount <= 0) {
        err.textContent = 'Введите сумму';
        return;
    }
    if (recipient === currentUser.username) {
        err.textContent = 'Нельзя себе';
        return;
    }
    const userExists = await database.ref(`users/${recipient}`).get();
    if (!userExists.exists()) {
        err.textContent = 'Пользователь не найден';
        return;
    }
    if (await transferCoins(currentUser.username, recipient, amount)) {
        showNotification(`Переведено ${amount} 🥕 пользователю ${recipient}`);
        document.getElementById('sendCoinsModal').style.display = 'none';
        document.getElementById('profileBalance').textContent = await getUserBalance(currentUser.username);
    } else {
        err.textContent = 'Недостаточно средств';
    }
});

document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const cur = document.getElementById('currentPassword').value;
    const newP = document.getElementById('newPassword').value;
    const conf = document.getElementById('confirmPassword').value;
    const err = document.getElementById('profileError');
    
    if (!cur || !newP) {
        err.textContent = 'Заполните все поля';
        return;
    }
    if (newP !== conf) {
        err.textContent = 'Пароли не совпадают';
        return;
    }
    if (newP.length < 3) {
        err.textContent = 'Пароль минимум 3 символа';
        return;
    }
    
    const snap = await database.ref(`users/${currentUser.username}`).get();
    if (snap.val().password !== cur) {
        err.textContent = 'Неверный текущий пароль';
        return;
    }
    await database.ref(`users/${currentUser.username}`).update({ password: newP });
    showNotification('Пароль изменён!');
    document.getElementById('profileModal').style.display = 'none';
});

document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    document.getElementById('profileModal').style.display = 'none';
    showConfirm('Удалить аккаунт навсегда?', async () => {
        await database.ref(`users/${currentUser.username}`).remove();
        await database.ref(`balances/${currentUser.username}`).remove();
        await database.ref(`avatars/${currentUser.username}`).remove();
        await database.ref(`ownedAvatars/${currentUser.username}`).remove();
        await database.ref(`premium/${currentUser.username}`).remove();
        localStorage.removeItem('currentUser');
        showNotification('Аккаунт удалён');
        setTimeout(() => location.reload(), 1500);
    });
});

// ============ ДОБАВЛЕНИЕ ЧАТА ============
document.getElementById('addChatBtn').addEventListener('click', () => {
    document.getElementById('addChatModal').style.display = 'flex';
    document.getElementById('addChatError').textContent = '';
    document.getElementById('chatUserName').value = '';
});

document.getElementById('confirmAddChat').addEventListener('click', async () => {
    const username = document.getElementById('chatUserName').value.trim();
    const err = document.getElementById('addChatError');
    
    if (!username) {
        err.textContent = 'Введите имя';
        return;
    }
    if (username === currentUser.username) {
        err.textContent = 'Нельзя добавить себя';
        return;
    }
    if (await isUserBlocked(username)) {
        err.textContent = 'Пользователь заблокирован';
        return;
    }
    const userExists = await database.ref(`users/${username}`).get();
    if (!userExists.exists()) {
        err.textContent = 'Пользователь не найден';
        return;
    }
    await database.ref(`users/${currentUser.username}/chats/${username}`).set(true);
    await database.ref(`users/${username}/chats/${currentUser.username}`).set(true);
    document.getElementById('addChatModal').style.display = 'none';
    await loadChats();
    showNotification(`Чат с ${username} добавлен!`);
});

// ============ СОЗДАНИЕ ГРУППЫ ============
document.getElementById('createGroupBtn').addEventListener('click', () => {
    document.getElementById('createGroupModal').style.display = 'flex';
    document.getElementById('createGroupError').textContent = '';
    document.getElementById('groupNameInput').value = '';
});

document.getElementById('confirmCreateGroup').addEventListener('click', async () => {
    const name = document.getElementById('groupNameInput').value.trim();
    if (!name) {
        document.getElementById('createGroupError').textContent = 'Введите название';
        return;
    }
    const groupId = `group_${Date.now()}`;
    await database.ref(`groups/${groupId}`).set({
        name: name,
        members: { [currentUser.username]: true },
        createdBy: currentUser.username,
        createdAt: Date.now()
    });
    await database.ref(`users/${currentUser.username}/chats/${groupId}`).set(true);
    document.getElementById('createGroupModal').style.display = 'none';
    await loadChats();
    showNotification(`Группа "${name}" создана!`);
});

// ============ НАСТРОЙКИ ГРУППЫ ============
document.getElementById('groupSettingsBtn').addEventListener('click', async () => {
    if (currentChat.type !== 'group') return;
    const snap = await database.ref(`groups/${currentChat.id}`).get();
    const members = snap.val()?.members || {};
    document.getElementById('membersList').innerHTML = Object.keys(members).map(m => `<div class="member-item">👤 ${escapeHtml(m)}</div>`).join('');
    document.getElementById('groupModal').style.display = 'flex';
});

document.getElementById('openAddMemberModal').addEventListener('click', () => {
    document.getElementById('groupModal').style.display = 'none';
    document.getElementById('addMemberModal').style.display = 'flex';
    document.getElementById('addMemberError').textContent = '';
    document.getElementById('memberName').value = '';
});

document.getElementById('confirmAddMember').addEventListener('click', async () => {
    const name = document.getElementById('memberName').value.trim();
    if (!name) {
        document.getElementById('addMemberError').textContent = 'Введите имя';
        return;
    }
    if (await isUserBlocked(name)) {
        document.getElementById('addMemberError').textContent = 'Пользователь заблокирован';
        return;
    }
    const userExists = await database.ref(`users/${name}`).get();
    if (!userExists.exists()) {
        document.getElementById('addMemberError').textContent = 'Пользователь не найден';
        return;
    }
    await database.ref(`groups/${currentChat.id}/members/${name}`).set(true);
    await database.ref(`users/${name}/chats/${currentChat.id}`).set(true);
    document.getElementById('addMemberModal').style.display = 'none';
    showNotification(`${name} добавлен в группу!`);
});

// ============ ВЫХОД ============
const profileBody = document.querySelector('#profileModal .modal-body');
if (profileBody && !document.getElementById('logoutBtn')) {
    const section = document.createElement('div');
    section.className = 'profile-section';
    section.style.marginTop = '12px';
    section.style.borderColor = '#ff6b35';
    section.innerHTML = `<h4>🚪 Выход</h4><button id="logoutBtn" class="btn-primary" style="background:#ff6b35;width:100%;">Выйти</button>`;
    profileBody.appendChild(section);
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    showConfirm('Выйти из аккаунта?', () => {
        localStorage.removeItem('currentUser');
        currentUser = null;
        closeAllModals();
        authScreen.style.display = 'flex';
        messengerScreen.style.display = 'none';
        document.getElementById('loginName').value = '';
        document.getElementById('loginPass').value = '';
        const loginTab = document.querySelector('.tab-btn[data-tab="login"]');
        if (loginTab) loginTab.click();
        showNotification('Вы вышли');
    });
});

// Убираем выбор цвета — только радужный для 🥕
console.log("✅ script6.js загружен (простая версия)");