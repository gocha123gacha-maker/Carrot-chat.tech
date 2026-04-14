// ============ ГОЛОСОВЫЕ СООБЩЕНИЯ ============
console.log("voice.js загружен");

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentStream = null;

function addVoiceButton() {
    var inputDiv = document.querySelector('.message-input');
    if (!inputDiv || document.getElementById('voiceRecordBtn')) return;
    
    var btn = document.createElement('button');
    btn.id = 'voiceRecordBtn';
    btn.innerHTML = '🎤';
    btn.style.cssText = 'background:none;border:none;font-size:24px;cursor:pointer;padding:8px 12px;border-radius:50%;';
    btn.title = 'Голосовое сообщение';
    
    var status = document.createElement('div');
    status.id = 'voiceStatus';
    status.style.cssText = 'display:none;padding:5px;background:#ffeb3b;text-align:center;font-size:12px;border-radius:8px;margin-top:5px;';
    status.innerHTML = '🔴 Запись...';
    
    var input = document.getElementById('messageInput');
    if (input) {
        inputDiv.insertBefore(btn, input);
    } else {
        inputDiv.appendChild(btn);
    }
    inputDiv.parentNode.insertBefore(status, inputDiv.nextSibling);
    
    btn.onclick = toggleRecording;
    console.log("Кнопка микрофона добавлена");
}

async function toggleRecording() {
    var btn = document.getElementById('voiceRecordBtn');
    var status = document.getElementById('voiceStatus');
    
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (currentStream) {
            currentStream.getTracks().forEach(function(t) { t.stop(); });
            currentStream = null;
        }
        btn.innerHTML = '🎤';
        btn.style.background = '';
        status.style.display = 'none';
        isRecording = false;
    } else {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(currentStream, { mimeType: 'audio/webm' });
            audioChunks = [];
            
            mediaRecorder.ondataavailable = function(e) {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };
            
            mediaRecorder.onstop = async function() {
                if (audioChunks.length === 0) return;
                var blob = new Blob(audioChunks, { type: 'audio/webm' });
                await sendVoice(blob);
                audioChunks = [];
            };
            
            mediaRecorder.start(100);
            btn.innerHTML = '⏹️';
            btn.style.background = '#dc3545';
            status.style.display = 'block';
            isRecording = true;
            
            setTimeout(function() {
                if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 20000);
            
        } catch(e) {
            alert("Нет доступа к микрофону");
        }
    }
}

function blobToBase64(blob) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function() { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function sendVoice(blob) {
    var user = localStorage.getItem('currentUser');
    var chat = window.currentChat;
    
    if (!user) { alert("Не авторизован"); return; }
    if (!chat) { alert("Выберите чат"); return; }
    
    if (window.showNotification) window.showNotification("Отправка голосового...");
    
    try {
        var base64 = await blobToBase64(blob);
        
        var path = "messages/" + chat.id;
        if (chat.type === 'private' && chat.originalId) {
            var sorted = [user, chat.originalId].sort().join('_');
            path = "messages/private_" + sorted;
        }
        
        await window.database.ref(path).push({
            type: 'voice',
            data: base64,
            sender: user,
            timestamp: Date.now()
        });
        
        if (window.showNotification) window.showNotification("Голосовое отправлено!");
        if (window.loadMessages) setTimeout(window.loadMessages, 500);
        
    } catch(e) {
        console.error("Ошибка:", e);
        alert("Ошибка: " + e.message);
    }
}

setTimeout(addVoiceButton, 2000);
console.log("voice.js инициализирован");