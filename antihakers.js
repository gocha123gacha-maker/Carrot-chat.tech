// ANTI-DEVTOOLS - Блокировка всех способов открытия консоли
(function() {
    // Открываем магазин вместо консоли
    function openShopInstead() {
        const shopBtn = document.getElementById('shopBtn');
        if (shopBtn) {
            shopBtn.click();
        } else {
            // Если кнопки магазина нет, показываем уведомление
            alert('🛒 Добро пожаловать в магазин!');
        }
        return false;
    }
    
    // Блокировка всех F-клавиш (F1-F12)
    document.addEventListener('keydown', function(e) {
        const key = e.keyCode || e.which;
        
        // F1 - F12 (112 - 123)
        if (key >= 112 && key <= 123) {
            e.preventDefault();
            e.stopPropagation();
            openShopInstead();
            return false;
        }
        
        // Блокировка отдельных клавиш
        const blockedKeys = {
            // F12 отдельно на всякий случай
            123: true,
            // Ctrl+Shift+I (инспектор)
            'I': true,
            // Ctrl+Shift+J (консоль)
            'J': true,
            // Ctrl+Shift+C (выбор элемента)
            'C': true,
            // Ctrl+U (просмотр исходного кода)
            'U': true,
            // Ctrl+S (сохранение страницы)
            'S': true,
            // Ctrl+P (печать)
            'P': true,
            // F5 (обновление) - не блокируем полностью, только с модификаторами
            'F5': true
        };
        
        // Ctrl+Shift+...
        if (e.ctrlKey && e.shiftKey) {
            if (blockedKeys[e.key.toUpperCase()]) {
                e.preventDefault();
                e.stopPropagation();
                openShopInstead();
                return false;
            }
        }
        
        // Ctrl+...
        if (e.ctrlKey) {
            const keyUpper = e.key.toUpperCase();
            if (keyUpper === 'U' || keyUpper === 'S' || keyUpper === 'P') {
                e.preventDefault();
                e.stopPropagation();
                openShopInstead();
                return false;
            }
        }
        
        // Alt+... (некоторые сочетания)
        if (e.altKey) {
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                e.stopPropagation();
                openShopInstead();
                return false;
            }
        }
    });
    
    // Блокировка правой кнопки мыши (контекстное меню)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openShopInstead();
        return false;
    });
    
    // Блокировка выделения текста (чтобы нельзя было скопировать код)
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Блокировка Ctrl+A (выделение всего)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Блокировка Ctrl+C (копирование) - только на телефонах
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        e.clipboardData.setData('text/plain', '🔒 Копирование запрещено');
        e.clipboardData.setData('text/html', '🔒 Копирование запрещено');
        return false;
    });
    
    // Блокировка Ctrl+X (вырезание)
    document.addEventListener('cut', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Обнаружение открытых инструментов разработчика (детект консоли)
    let devtoolsOpen = false;
    const element = new Image();
    
    Object.defineProperty(element, 'id', {
        get: function() {
            devtoolsOpen = true;
            openShopInstead();
            return '';
        }
    });
    
    setInterval(function() {
        devtoolsOpen = false;
        console.log(element);
        console.clear();
        if (devtoolsOpen) {
            openShopInstead();
        }
    }, 1000);
    
    // Проверка размера окна (на ПК при открытой консоли размер меняется)
    let widthThreshold = window.outerWidth - window.innerWidth > 160;
    let heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if (widthThreshold || heightThreshold) {
        openShopInstead();
    }
    
    // Следим за изменением размера окна
    window.addEventListener('resize', function() {
        let widthDiff = window.outerWidth - window.innerWidth;
        let heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > 160 || heightDiff > 160) {
            openShopInstead();
        }
    });
    
    // Блокировка долгого нажатия на телефонах (контекстное меню)
    let touchTimer = null;
    document.addEventListener('touchstart', function(e) {
        touchTimer = setTimeout(function() {
            e.preventDefault();
            openShopInstead();
        }, 800);
    });
    
    document.addEventListener('touchend', function() {
        if (touchTimer) {
            clearTimeout(touchTimer);
        }
    });
    
    // Блокировка двух пальцев на телефонах (контекстное меню)
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        openShopInstead();
        return false;
    });
    
    console.log("🛡️ Защита активирована! Все попытки открыть консоль отправят в магазин.");
})();