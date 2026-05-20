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
    
    setTimeout(() => {
        addColorPickerToProfile();
    }, 100);
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

// ============ ВЫБОР ЦВЕТА ИМЕНИ (ТОЛЬКО ДЛЯ ВЛАДЕЛЬЦЕВ 🥕) ============
async function addColorPickerToProfile() {
    // Проверяем, есть ли у пользователя аватарка 🥕
    const hasCarrot = await hasCarrotAvatar(currentUser.username);
    
    if (!hasCarrot) {
        // Если нет морковки, показываем сообщение
        if (!document.getElementById('noCarrotMsg')) {
            const msg = document.createElement('div');
            msg.id = 'noCarrotMsg';
            msg.className = 'profile-section';
            msg.style.background = '#fff3cd';
            msg.style.borderColor = '#ffc107';
            msg.innerHTML = `
                <h4>🎨 Цвет имени</h4>
                <p style="font-size: 13px; color: #856404;">Купите аватарку 🥕 в магазине, чтобы менять цвет имени!</p>
            `;
            const profileBodyEl = document.querySelector('#profileModal .modal-body');
            const balanceSection = profileBodyEl.querySelector('.balance-section');
            if (balanceSection) {
                balanceSection.insertAdjacentElement('afterend', msg);
            } else {
                profileBodyEl.appendChild(msg);
            }
        }
        return;
    }
    
    // Удаляем сообщение о необходимости купить морковку, если оно было
    const noCarrotMsg = document.getElementById('noCarrotMsg');
    if (noCarrotMsg) noCarrotMsg.remove();
    
    // Если уже есть секция с цветами, не добавляем повторно
    if (document.getElementById('colorPickerSection')) return;
    
    const colorSection = document.createElement('div');
    colorSection.className = 'profile-section';
    colorSection.id = 'colorPickerSection';
    colorSection.innerHTML = `
        <h4>🎨 Цвет имени</h4>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <button class="color-option" data-color="rainbow" style="background: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet); width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;">🌈</button>
            <button class="color-option" data-color="#ff0000" style="background: #ff0000; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
            <button class="color-option" data-color="#ff7700" style="background: #ff7700; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
            <button class="color-option" data-color="#ffcc00" style="background: #ffcc00; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
            <button class="color-option" data-color="#00cc00" style="background: #00cc00; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
            <button class="color-option" data-color="#0066ff" style="background: #0066ff; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
            <button class="color-option" data-color="#aa00ff" style="background: #aa00ff; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
            <button class="color-option" data-color="#ff6b35" style="background: #ff6b35; width: 36px; height: 36px; border-radius: 50%; border: 2px solid #fff; cursor: pointer;"></button>
        </div>
        <button id="resetColorBtn" class="btn-small" style="width: 100%; margin-top: 8px;">🎨 Сбросить на радужный</button>
    `;
    
    const profileBodyEl = document.querySelector('#profileModal .modal-body');
    if (!profileBodyEl) return;
    
    const balanceSection = profileBodyEl.querySelector('.balance-section');
    if (balanceSection) {
        balanceSection.insertAdjacentElement('afterend', colorSection);
    } else {
        profileBodyEl.appendChild(colorSection);
    }
    
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', async () => {
            const color = btn.dataset.color;
            await setUserColor(currentUser.username, color);
            showNotification(`✅ Цвет имени изменён!`);
            document.getElementById('profileModal').style.display = 'none';
            
            if (color === 'rainbow') {
                currentUserName.classList.add('rainbow');
                currentUserName.style.color = '';
            } else {
                currentUserName.classList.remove('rainbow');
                currentUserName.style.color = color;
            }
            await updateRainbowName();
        });
    });
    
    const resetBtn = document.getElementById('resetColorBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            await setUserColor(currentUser.username, 'rainbow');
            showNotification(`✅ Цвет имени сброшен на радужный!`);
            document.getElementById('profileModal').style.display = 'none';
            currentUserName.classList.add('rainbow');
            currentUserName.style.color = '';
            await updateRainbowName();
        });
    }
}

console.log("✅ script6.js загружен");