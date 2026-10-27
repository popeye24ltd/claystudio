const firebaseConfig = {
  apiKey: "AIzaSyBpMFWJMuxAh7iIm9KgvU__aO6jeOdP5L8",
  authDomain: "clay-studio-b08b4.firebaseapp.com",
  projectId: "clay-studio-b08b4",
  storageBucket: "clay-studio-b08b4.firebasestorage.app",
  messagingSenderId: "373988750934",
  appId: "1:373988750934:web:999405a63657df1f56edf7"
};

let db = null;
let storage = null;
let auth = null;
let currentUserProfile = null;
let authInitialized = false;

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();

    db.collection('users').where('role', '==', 'photographer').onSnapshot(snap => {
        globalPhotographers = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        const grid = document.getElementById('photographers-grid-container');
        if(grid) {
            const activeBtn = document.querySelector('.filter-btn.active');
            // Re-render
            const filter = activeBtn ? (activeBtn.innerText === 'Todos' ? 'Todos' : activeBtn.innerText) : 'Todos';
            grid.innerHTML = renderPhotographersGrid(filter);
        }
    });

    window.addEventListener('beforeunload', () => {
        const user = auth && auth.currentUser;
        if(user && db) db.collection('users').doc(user.uid).update({ isOnline: false });
    });

    document.addEventListener('visibilitychange', () => {
        const user = auth && auth.currentUser;
        if(user && db) db.collection('users').doc(user.uid).update({ isOnline: document.visibilityState === 'visible' });
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            db.collection('users').doc(user.uid).update({ isOnline: true }).catch(()=>{});
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    currentUserProfile = { uid: user.uid, email: user.email, ...doc.data() };
                } else {
                    currentUserProfile = { uid: user.uid, email: user.email, role: 'client', name: user.displayName || 'Usuario' };
                }
            } catch(e) {
                console.error("Error leyendo perfil de usuario", e);
                currentUserProfile = { uid: user.uid, email: user.email, role: 'client', name: 'Usuario' };
            }
        } else {
            currentUserProfile = null;
        }
        
        authInitialized = true;
        window.dispatchEvent(new Event('authStateReady'));
    });
}

// --- STATE & DATABASE ---
function initDB() {
    if (!localStorage.getItem('lumina_messages')) localStorage.setItem('lumina_messages', JSON.stringify([
        { text: 'Â¡Hola! Bienvenid@ a CLAY.', type: 'received' }
    ]));
    if (!localStorage.getItem('lumina_theme')) localStorage.setItem('lumina_theme', 'dark');
}

function applyTheme() {
    if (localStorage.getItem('lumina_theme') === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
}

function toggleTheme() {
    const current = localStorage.getItem('lumina_theme');
    localStorage.setItem('lumina_theme', current === 'light' ? 'dark' : 'light');
    applyTheme();
}

function toggleThemeNavbar() {
    toggleTheme();
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = localStorage.getItem('lumina_theme') === 'light' ? 'ph ph-moon' : 'ph ph-sun';
    }
}

function exportFavorites() {
    alert("Iniciando exportaciÃ³n de galerÃ­a (Simulado)...");
}

// --- FLOATING CHAT LOGIC ---
let activeChatId = null;
let activeChatOtherUserId = null;
let chatUnsubscribe = null;
let presenceUnsubscribe = null;

function getChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

function injectFloatingChat() {
    if(document.getElementById('floating-chat-bubble')) return;
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'chat_styles.css';
    document.head.appendChild(link);

    const container = document.createElement('div');
    container.innerHTML = `
        <div id="floating-chat-bubble" onclick="toggleFloatingChat()">
            <i class="ph ph-chat-centered-text"></i>
            <div class="notification-badge" id="chat-badge" style="display:none;"></div>
        </div>
        <div id="floating-chat-window">
            <div id="chat-window-header">
                <span id="chat-window-title"><i class="ph ph-chats"></i> Bandeja de Mensajes</span>
                <button onclick="toggleFloatingChat()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;"><i class="ph ph-x"></i></button>
            </div>
            <div id="chat-window-body">
                <p style="text-align:center; color: var(--text-secondary); margin-top:20px;">Cargando mensajes...</p>
            </div>
            <div id="chat-window-footer" style="display:none;">
                <input type="text" id="chat-input-text" placeholder="Escribe un mensaje..." onkeypress="if(event.key==='Enter') sendFloatingMessage()">
                <button onclick="sendFloatingMessage()"><i class="ph ph-paper-plane-right"></i></button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}

function toggleFloatingChat() {
    const win = document.getElementById('floating-chat-window');
    const isActive = win.classList.contains('active');
    
    if(isActive) {
        win.classList.remove('active');
        if(presenceUnsubscribe) presenceUnsubscribe();
    } else {
        win.classList.add('active');
        document.getElementById('chat-badge').style.display = 'none';
        loadChatInbox();
    }
}

function openFloatingChat(otherUserId, otherUserName) {
    const user = getCurrentUser();
    if(!user) return;

    const win = document.getElementById('floating-chat-window');
    if(!win.classList.contains('active')) win.classList.add('active');
    
    activeChatId = getChatId(user.uid, otherUserId);
    activeChatOtherUserId = otherUserId;
    
    document.getElementById('chat-window-title').innerHTML = `<i class="ph ph-arrow-left" style="cursor:pointer;" onclick="loadChatInbox()"></i> Chat: ${otherUserName} <span id="online-indicator" style="display:none; color: #10b981; font-size: 0.8rem; margin-left: 5px;">â—</span>`;
    document.getElementById('chat-window-footer').style.display = 'flex';
    
    // Subscribe to presence
    if(presenceUnsubscribe) presenceUnsubscribe();
    presenceUnsubscribe = db.collection('users').doc(otherUserId).onSnapshot(snap => {
        if(snap.exists && snap.data().isOnline) {
            document.getElementById('online-indicator').style.display = 'inline';
        } else {
            const ind = document.getElementById('online-indicator');
            if(ind) ind.style.display = 'none';
        }
    });

    loadChatMessages();
}

function loadChatInbox() {
    activeChatId = null;
    activeChatOtherUserId = null;
    if(chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
    if(presenceUnsubscribe) { presenceUnsubscribe(); presenceUnsubscribe = null; }
    
    document.getElementById('chat-window-title').innerHTML = `<i class="ph ph-chats"></i> Bandeja de Mensajes`;
    document.getElementById('chat-window-footer').style.display = 'none';
    const body = document.getElementById('chat-window-body');
    
    const user = getCurrentUser();
    if(!user || !db) {
        body.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No hay conexiÃ³n.</p>';
        return;
    }
    
    body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;"><i class="ph ph-spinner ph-spin"></i> Cargando directorio...</p>';
    
    // Para clientes, mostrar directorio de fotÃ³grafos
    if (user.role === 'client') {
        if (globalPhotographers.length === 0) {
            body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">No hay fotÃ³grafos disponibles aÃºn.</p>';
            return;
        }
        let html = '';
        globalPhotographers.forEach(p => {
            html += `
                <div class="chat-inbox-item" onclick="openFloatingChat('${p.uid}', '${p.name}')" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="margin: 0;">${p.name}</h4>
                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">${p.style || 'FotÃ³grafo'}</p>
                    </div>
                </div>
            `;
        });
        body.innerHTML = html;
    } else {
        // Para fotÃ³grafos, cargar chats activos
        db.collection('chats').where('participants', 'array-contains', user.uid).get().then(snap => {
            if(snap.empty) {
                body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">No tienes mensajes aÃºn.</p>';
                return;
            }
            let html = '';
            snap.forEach(doc => {
                const chatData = doc.data();
                const otherName = chatData.names[user.uid === chatData.participants[0] ? chatData.participants[1] : chatData.participants[0]];
                const otherUid = user.uid === chatData.participants[0] ? chatData.participants[1] : chatData.participants[0];
                html += `
                    <div class="chat-inbox-item" onclick="openFloatingChat('${otherUid}', '${otherName}')">
                        <h4>${otherName}</h4>
                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">Ver conversaciÃ³n</p>
                    </div>
                `;
            });
            body.innerHTML = html;
        });
    }
}

function loadChatMessages() {
    if(!db || !activeChatId) return;
    if(chatUnsubscribe) chatUnsubscribe();
    
    const body = document.getElementById('chat-window-body');
    body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;"><i class="ph ph-spinner ph-spin"></i> Conectando...</p>';
    
    const user = getCurrentUser();
    
    chatUnsubscribe = db.collection('chats').doc(activeChatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snap => {
            if(snap.empty) {
                body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">Escribe el primer mensaje.</p>';
                return;
            }
            
            let html = '';
            snap.docs.forEach(doc => {
                const msg = doc.data();
                const isMine = msg.senderId === user.uid;
                const timeStr = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
                const avatar = msg.senderAvatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent('U');
                
                // Marcar como leÃ­do si no es mÃ­o y no estaba leÃ­do
                if (!isMine && !msg.isRead) {
                    doc.ref.update({ isRead: true }).catch(()=>{});
                }
                
                const readIcon = isMine ? (msg.isRead ? '<i class="ph-fill ph-checks" style="color: #3b82f6;"></i>' : '<i class="ph ph-check" style="color: var(--text-secondary);"></i>') : '';

                html += `
                    <div class="chat-msg-wrapper ${isMine ? 'mine' : 'theirs'}" style="display: flex; gap: 8px; margin-bottom: 15px; align-items: flex-end; justify-content: ${isMine ? 'flex-end' : 'flex-start'};">
                        ${!isMine ? `<img src="${avatar}" style="width: 25px; height: 25px; border-radius: 50%; object-fit: cover;">` : ''}
                        <div class="chat-msg ${isMine ? 'sent' : 'received'}" style="margin: 0; position: relative;">
                            ${msg.text}
                            <div style="font-size: 0.6rem; text-align: right; margin-top: 5px; opacity: 0.8; display: flex; justify-content: flex-end; gap: 4px; align-items: center;">
                                <span>${timeStr}</span>
                                ${readIcon}
                            </div>
                        </div>
                    </div>
                `;
            });
            body.innerHTML = html;
            body.scrollTop = body.scrollHeight;
        });
}

async function sendFloatingMessage() {
    if(!activeChatId || !db) return;
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if(!text) return;
    
    const user = getCurrentUser();
    input.value = '';
    
    // Asegurarse de que el doc de chat exista
    const chatRef = db.collection('chats').doc(activeChatId);
    const otherUserName = document.getElementById('chat-window-title').innerText.replace('Chat: ', '').trim();
    
    await chatRef.set({
        participants: [user.uid, activeChatOtherUserId],
        names: { [user.uid]: user.name, [activeChatOtherUserId]: otherUserName },
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    await chatRef.collection('messages').add({
        text: text,
        senderId: user.uid,
        senderAvatar: user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name),
        isRead: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function getCurrentUser() {
    return currentUserProfile;
}

async function loginUser(email, password) {
    if (!auth) return false;
    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        // ExcepciÃ³n: Permitir entrar al admin sin verificar (opcional), pero exigirlo a clientes
        if (!cred.user.emailVerified) {
            // Chequear si es admin (permitir acceso si queremos, o bloquear a todos)
            // Firebase exige iniciar sesiÃ³n para leer Firestore, pero podemos bloquear.
            const doc = await db.collection('users').doc(cred.user.uid).get();
            if (doc.exists && doc.data().role !== 'admin') {
                await auth.signOut();
                throw new Error("not_verified");
            }
        }
        return true;
    } catch (e) {
        if (e.message === "not_verified") {
            console.error("Correo no verificado");
            throw e; // Lanzar para que login.html lo maneje
        }
        console.error("Error iniciando sesiÃ³n:", e);
        return false;
    }
}

async function registerUser(email, password, name, role) {
    if (!auth) return false;
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Enviar correo de verificaciÃ³n
        await user.sendEmailVerification();
        
        // Save user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            role: role,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Cerrar sesiÃ³n inmediatamente para obligar al usuario a verificar antes de entrar
        await auth.signOut();
        
        return true;
    } catch (e) {
        console.error("Error registrando usuario:", e);
        alert(e.message);
        return false;
    }
}

function changePassword(newPassword) {
    const user = auth.currentUser;
    if (user) {
        user.updatePassword(newPassword).then(() => {
            alert('ContraseÃ±a actualizada con Ã©xito');
        }).catch((e) => {
            alert('Error: ' + e.message);
        });
    }
}

function logout() {
    if (auth) {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
    }
}

// --- EMAILJS & NOTIFICATIONS (Fase 2) ---
function sendEmailNotification(type, toName, details) {
    // Simulador de EmailJS para demostraciÃ³n local.
    // Para producciÃ³n:
    /*
    emailjs.init("TU_PUBLIC_KEY");
    emailjs.send("TU_SERVICE_ID", "TU_TEMPLATE_ID", {
        to_name: toName,
        message: details,
        type: type
    }).then(() => console.log('Email sent!'));
    */

    let icon = "ph-envelope-simple";
    if (type === 'booking_new') icon = "ph-calendar-plus";
    if (type === 'booking_accepted') icon = "ph-check-circle";
    if (type === 'photos_ready') icon = "ph-image";

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <i class="ph ${icon}" style="font-size: 2rem; color: var(--accent);"></i>
        <div>
            <h4 style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">Email automÃ¡tico simulado</h4>
            <p style="margin: 0; font-size: 1rem;">Enviado a <b>${toName}</b>: ${details}</p>
        </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// --- SCROLL ANIMATIONS ---
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // observer.unobserve(entry.target); // Descomentar si solo quieres animar una vez
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));
}

// Mock Data for reference
let globalPhotographers = [];

const galleryImages = [
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1505909182942-e2f09aee3e89?w=800&auto=format&fit=crop"
];

let bookingState = { service: 'SesiÃ³n en Estudio', photographer: 1, date: null, time: null };

// --- VIEWS ---
const routes = {
    home: () => `
        <div class="hero fade-in">
            <h1 style="font-size: clamp(1.6rem, 6vw, 5.5rem); line-height: 1.15; word-break: break-word; max-width: 100%;">Capturando momentos, <br>creando eternidad.</h1>
            <p style="font-size: clamp(0.9rem, 3.5vw, 1.3rem);">Agencia de fotografÃ­a premium. Conecta con los mejores fotÃ³grafos para tus eventos y proyectos comerciales.</p>
            <button class="btn btn-primary" onclick="window.location.href='login.html'">Ingresa para Explorar Portafolios</button>
        </div>
        <div class="gallery reveal-up" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 20px; padding: 20px; max-width: 1200px; margin: 0 auto; width: 100%;">
            ${galleryImages.map((img, i) => `
                <div class="gallery-item glass" onclick="openLightbox(${i}, 'gallery')" style="height: clamp(180px, 40vw, 400px);">
                    <img src="${img}" alt="Gallery image ${i+1}">
                    <div class="gallery-overlay">
                        <h3>SesiÃ³n Premium</h3>
                        <p>Ver galerÃ­a completa</p>
                    </div>
                </div>
            `).join('')}
        </div>



        <div class="testimonials-section reveal-up">
            <h2>Lo que dicen nuestros clientes</h2>
            <div class="testimonial-card glass" style="margin-top:40px;">
                <div class="testimonial-stars"><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i></div>
                "El equipo de CLAY capturÃ³ nuestro evento de una manera mÃ¡gica. Las fotos parecen sacadas de una revista de moda. Totalmente recomendados."
                <div class="testimonial-author">- MarÃ­a y Roberto</div>
            </div>
        </div>

        ${getFooterHTML()}
    `,
    
    photographers: () => `
        <div class="fade-in" style="text-align: center; margin-top: 40px;">
            <h1 style="font-size: 3rem; margin-bottom: 10px;">Nuestros FotÃ³grafos</h1>
            <p style="color: var(--text-secondary);">Elige al artista perfecto para tu prÃ³xima sesiÃ³n.</p>
        </div>
        <div class="portfolio-filters fade-in">
            <button class="filter-btn active" onclick="filterPhotographers('Todos', this)">Todos</button>
            <button class="filter-btn" onclick="filterPhotographers('Retratos y Eventos', this)">Retratos</button>
            <button class="filter-btn" onclick="filterPhotographers('FotografÃ­a Comercial', this)">Comercial</button>
            <button class="filter-btn" onclick="filterPhotographers('Moda y Editorial', this)">Moda</button>
        </div>
        <div class="photographers-grid slide-up" id="photographers-grid-container">
            ${renderPhotographersGrid('Todos')}
        </div>
        ${getFooterHTML()}
    `,
    
    'photographer-profile': () => {
        const p = globalPhotographers.find(photo => photo.uid === currentProfileId);
        if (!p) return '<p>FotÃ³grafo no encontrado</p>';
        const portfolioUrls = p.portfolio || [];
        return `
        <div class="fade-in" style="max-width: 1000px; margin: 40px auto; padding: 20px;">
            <button class="btn btn-outline" onclick="navigateTo('photographers')" style="margin-bottom: 20px;"><i class="ph ph-arrow-left"></i> Volver a FotÃ³grafos</button>
            
            <div class="glass photographer-profile-header" style="display: flex; gap: 30px; padding: 40px; border-radius: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 40px;">
                <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" alt="${p.name}" class="photographer-avatar" style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent);">
                <div class="photographer-info" style="flex: 1; min-width: 200px;">
                    <h1 class="photographer-title" style="font-size: 3rem; margin-bottom: 10px;">${p.name}</h1>
                    <h3 style="color: var(--accent); margin-bottom: 20px;">${p.style || 'FotografÃ­a Profesional'}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px; max-width: 500px;">${p.description || 'Especialista en capturar la esencia de cada momento.'}</p>
                    <button class="btn btn-primary" onclick="goToBooking('${p.uid}')"><i class="ph ph-calendar-plus"></i> Agendar con ${p.name}</button>
                </div>
            </div>

            <h2 style="margin-bottom: 20px;"><i class="ph ph-image"></i> Portafolio de Trabajos</h2>
            <div class="gallery">
                ${portfolioUrls.map((imgUrl, i) => `
                    <div class="gallery-item glass" style="height: 300px; cursor: pointer;" onclick="openLightbox(${i}, 'portfolio')">
                        <img src="${imgUrl}" alt="Portfolio ${i}">
                    </div>
                `).join('')}
            </div>
        </div>
        ${getFooterHTML()}
        `
    },
    
    booking: () => `
        <div class="booking-container glass slide-up" style="margin-top: 40px;">
            <h2 class="step-title"><i class="ph ph-calendar-check"></i> Agendar SesiÃ³n</h2>
            
            <p style="margin-bottom: 10px; color: var(--text-secondary);">1. FotÃ³grafo Seleccionado:</p>
            <select id="booking-photographer" class="glass" style="width: 100%; padding: 15px; color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 30px; background: var(--bg-surface);" onchange="bookingState.photographer = this.value">
                ${globalPhotographers.map(p => `<option value="${p.uid}" ${bookingState.photographer == p.uid ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>

            <p style="margin-bottom: 10px; color: var(--text-secondary);">2. Selecciona el tipo de servicio:</p>
            <div class="service-options" style="display: flex; gap: 15px; margin-bottom: 30px;">
                <div class="service-card glass active" onclick="toggleService(this, 'SesiÃ³n en Estudio')" style="flex: 1; text-align: center; padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <i class="ph ph-camera" style="font-size: 2rem; color: var(--accent); margin-bottom: 10px;"></i>
                    <h3>SesiÃ³n en Estudio</h3>
                </div>
                <div class="service-card glass" onclick="toggleService(this, 'Retrato Personal')" style="flex: 1; text-align: center; padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <i class="ph ph-user-focus" style="font-size: 2rem; color: var(--accent); margin-bottom: 10px;"></i>
                    <h3>Retrato Personal</h3>
                </div>
                <div class="service-card glass" onclick="toggleService(this, 'Editorial / Moda')" style="flex: 1; text-align: center; padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <i class="ph ph-star" style="font-size: 2rem; color: var(--accent); margin-bottom: 10px;"></i>
                    <h3>Editorial / Moda</h3>
                </div>
            </div>

            <p style="margin-bottom: 10px; color: var(--text-secondary);">3. Selecciona la fecha de tu sesiÃ³n:</p>
            <div class="glass" style="padding: 20px; border-radius: 16px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <button class="btn btn-outline" style="padding: 5px 12px; border-radius: 8px;" onclick="event.preventDefault()"><i class="ph ph-caret-left"></i></button>
                    <h3 style="margin: 0; font-size: 1.1rem;">Junio 2026</h3>
                    <button class="btn btn-outline" style="padding: 5px 12px; border-radius: 8px;" onclick="event.preventDefault()"><i class="ph ph-caret-right"></i></button>
                </div>
                <div class="calendar-grid">
                    ${['Lun', 'Mar', 'MiÃ©', 'Jue', 'Vie', 'SÃ¡b', 'Dom'].map(day => `<div style="text-align: center; font-size: 0.8rem; font-weight: bold; color: var(--text-secondary); text-transform: uppercase;">${day}</div>`).join('')}
                    ${Array.from({length: 30}, (_, i) => {
                        return (i === 0 ? `<div></div>` : '') + `<div class="calendar-day fade-in" style="animation-delay: ${i * 0.01}s" onclick="selectDate(this, ${i + 1})">${i + 1}</div>`
                    }).join('')}
                </div>
            </div>

            <div id="time-selection-container" style="display: none; margin-top: 30px; animation: fadeIn 0.4s ease;">
                <p style="margin-bottom: 10px; color: var(--text-secondary);">4. Selecciona el horario:</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px;">
                    ${['09:00', '10:30', '13:00', '15:00', '16:30', '18:00'].map(time => `
                        <div class="time-slot glass" onclick="selectTime(this, '${time}')" style="padding: 12px; text-align: center; border-radius: 12px; cursor: pointer; transition: all 0.3s; font-weight: 500;">
                            <i class="ph ph-clock"></i> ${time}
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="margin-top: 40px; text-align: right;">
                <button class="btn btn-primary" onclick="confirmBooking()">Confirmar Reserva</button>
            </div>
        </div>
        ${getFooterHTML()}
    `,

    // Panels are removed from generic routing, they have their own HTML pages now.

    chat: () => {
        const messages = JSON.parse(localStorage.getItem('lumina_messages') || '[]');
        return `
        <div class="fade-in" style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
            <h2>MensajerÃ­a Directa</h2>
            <p style="color: var(--text-secondary);">ComunÃ­cate instantÃ¡neamente.</p>
        </div>
        <div class="chat-container glass slide-up">
            <div class="chat-header">
                <i class="ph ph-user-circle" style="font-size: 2.5rem;"></i>
                <div>
                    <h3>Chat General</h3>
                    <p style="font-size: 0.8rem; color: var(--accent);">En lÃ­nea</p>
                </div>
            </div>
            <div class="chat-messages" id="chat-messages">
                ${messages.map(m => `
                    <div class="message ${m.type}">
                        ${m.text}
                    </div>
                `).join('')}
            </div>
            <div class="chat-input">
                <input type="text" id="messageInput" placeholder="Escribe un mensaje..." onkeypress="handleKeyPress(event)">
                <button class="btn btn-primary" onclick="sendMessage()"><i class="ph ph-paper-plane-right"></i></button>
            </div>
        </div>
        ${getFooterHTML()}
    `},

    'client-dashboard': () => {
        const user = getCurrentUser();
        if (!user) return '<div style="padding: 100px; text-align:center;"><i class="ph ph-spinner ph-spin" style="font-size: 2rem; color: var(--accent);"></i> Cargando perfil...</div>';
        
        const bookings = window.clientBookings || [];
        let clientGallery = window.clientGallery && window.clientGallery.length > 0 ? window.clientGallery : galleryImages;

        const greeting = getGreeting();
        const firstName = user && user.name ? user.name.split(' ')[0] : 'Estrella';

        return `
        <div class="fade-in" style="max-width: 900px; margin: 40px auto; padding: 20px;">
            
            <!-- Welcome Banner -->
            <div class="glass client-dashboard-banner" style="padding: 40px 30px; border-radius: 16px; margin-bottom: 40px; text-align: center; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); position: relative; overflow: hidden; border-top: 2px solid var(--accent);">
                <div style="position: absolute; top: -30px; right: -30px; opacity: 0.1;"><i class="ph-fill ph-sparkle" style="font-size: 150px; color: var(--accent);"></i></div>
                <div style="position: absolute; bottom: -30px; left: -30px; opacity: 0.1;"><i class="ph-fill ph-camera" style="font-size: 120px; color: var(--accent);"></i></div>
                
                <div style="position: relative; width: 100px; height: 100px; margin: 0 auto 15px auto;">
                    <img src="${user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(firstName) + '&background=random'}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); cursor: pointer; transition: 0.3s;" onclick="document.getElementById('client-avatar-upload').click()" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">
                    <div style="position: absolute; bottom: 0; right: 0; background: var(--accent); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="document.getElementById('client-avatar-upload').click()"><i class="ph ph-pencil-simple"></i></div>
                </div>
                <input type="file" id="client-avatar-upload" accept="image/*" style="display: none;" onchange="uploadClientAvatar(event)">

                <h1 class="client-dashboard-title" style="font-size: 2.5rem; margin-bottom: 10px;">Â¡${greeting}, ${firstName}! <i class="ph-fill ph-hand-waving" style="color: #fbbf24; animation: wave 2.5s infinite; transform-origin: 70% 70%; display: inline-block;"></i></h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem; max-width: 600px; margin: 0 auto; line-height: 1.6;">Estamos muy felices de tenerte por aquÃ­. Desde este panel puedes administrar tus reservas, hablar directamente con tu fotÃ³grafo y visualizar el increÃ­ble resultado de tus sesiones.</p>
            </div>

            
            <h3 style="margin-bottom: 15px; color: var(--accent);">Directorio de Contactos</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Habla directamente con nuestros fotÃ³grafos en cualquier momento.</p>
            <div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 20px; margin-bottom: 30px;">
                ${globalPhotographers.length === 0 ? `
                    <div class="glass" style="width: 100%; padding: 40px; text-align: center; border-radius: 12px; border: 1px dashed var(--accent);">
                        <i class="ph ph-users" style="font-size: 3rem; color: var(--accent); margin-bottom: 15px; display: inline-block;"></i>
                        <h4>Directorio en ConstrucciÃ³n</h4>
                        <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">Estamos preparando el perfil de nuestros fotÃ³grafos. Pronto podrÃ¡s verlos y contactarlos por aquÃ­.</p>
                    </div>` : 
                    globalPhotographers.map(p => `
                        <div class="glass" style="min-width: 200px; padding: 20px; text-align: center; border-radius: 12px; cursor: pointer; transition: 0.3s;" onclick="openFloatingChat('${p.uid}', '${p.name}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--glass-border)'">
                            <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid var(--accent);">
                            <h4 style="margin-bottom: 5px;">${p.name}</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">${p.style || 'FotÃ³grafo'}</p>
                            <button class="btn btn-outline" style="width: 100%; padding: 8px; font-size: 0.9rem;"><i class="ph ph-chat-circle"></i> Escribir</button>
                        </div>
                    `).join('')
                }
            </div>

            <h3 style="margin-bottom: 15px; color: var(--accent);">Mis Reservas</h3>
            ${bookings.length === 0 ? `
                <div class="glass" style="padding: 40px; text-align: center; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.2); margin-bottom: 30px;">
                    <i class="ph ph-calendar-plus" style="font-size: 3rem; color: var(--accent); margin-bottom: 15px; display: inline-block;"></i>
                    <h4>AÃºn no tienes sesiones programadas</h4>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 20px auto;">Â¿Listo para capturar momentos inolvidables? Explora nuestros servicios y agenda tu primera sesiÃ³n fotogrÃ¡fica hoy mismo.</p>
                    <button class="btn btn-primary" onclick="navigateTo('booking')"><i class="ph ph-calendar"></i> Agendar SesiÃ³n</button>
                </div>` : 
                bookings.map(b => `
                    <div class="glass dashboard-reserva-item" style="padding: 20px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h4>${b.service} - DÃ­a ${b.date} ${b.time ? 'a las ' + b.time : ''}</h4>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">FotÃ³grafo: ${b.photographerName} | Estado: <strong style="color: ${b.status==='Aceptada'?'#22c55e':(b.status==='Rechazada'?'#ef4444':'#fbbf24')}">${b.status}</strong></p>
                        </div>
                        ${b.photographerId ? `<button class="btn btn-outline" onclick="openFloatingChat('${b.photographerId}', '${b.photographerName}')"><i class="ph ph-chat-circle"></i> Mensajes</button>` : ''}
                    </div>
                `).join('')
            }

            <h3 style="margin-bottom: 15px; color: var(--accent); margin-top: 40px;">${window.clientGallery && window.clientGallery.length > 0 ? (window.isGalleryReleased ? 'GalerÃ­a Entregada (Alta ResoluciÃ³n)' : 'GalerÃ­as de Prueba (Watermark)') : 'GalerÃ­a de InspiraciÃ³n'}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">${window.clientGallery && window.clientGallery.length > 0 ? (window.isGalleryReleased ? 'Â¡Tus fotos han sido liberadas! Ahora puedes descargarlas.' : 'Las imÃ¡genes tienen marca de agua temporalmente. Selecciona tus favoritas para solicitar la entrega.') : 'AÃºn no tienes fotos propias. Explora nuestro trabajo para inspirarte para tu futura sesiÃ³n.'}</p>
            <div class="photographers-grid" style="padding: 0; display: flex; gap: 20px; flex-wrap: wrap;">
                ${clientGallery.map((img, i) => `
                    <div class="${window.isGalleryReleased ? '' : 'watermark-container '}glass" style="flex: 1; min-width: 250px; height: 250px; border-radius: 12px; overflow: hidden; position: relative;">
                        ${isVideo(img) ? 
                            `<video src="${img}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="openLightbox(${i}, 'gallery')" ${window.isGalleryReleased ? 'controls' : 'autoplay muted loop playsinline'}></video>` 
                            : 
                            `<img src="${img}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="openLightbox(${i}, 'gallery')">`
                        }
                        ${window.isGalleryReleased ? '' : '<div class="watermark-overlay" style="pointer-events: none;"></div>'}
                        ${window.isGalleryReleased && isFavorite(img) ? 
                            `<button class="favorite-btn active" style="background:var(--accent); color:white; z-index: 10;" onclick="downloadImage('${img}')"><i class="ph ph-download-simple"></i></button>` 
                            : 
                            `<button class="favorite-btn ${isFavorite(img) ? 'active' : ''}" style="z-index: 10;" onclick="toggleFavorite(this, '${img}')"><i class="${isFavorite(img) ? 'ph-fill' : 'ph'} ph-heart"></i></button>`
                        }
                    </div>
                `).join('')}
            </div>
        </div>
        ${getFooterHTML()}
        `
    }
};

function isVideo(url) {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg)$/i) !== null || url.includes('video') || url.includes('mp4');
}

function isFavorite(url) {
    const favs = JSON.parse(localStorage.getItem('lumina_favorites') || '[]');
    return favs.includes(url);
}

async function toggleFavorite(btn, url) {
    let favs = JSON.parse(localStorage.getItem('lumina_favorites') || '[]');
    const icon = btn.querySelector('i');
    
    if (favs.includes(url)) {
        favs = favs.filter(f => f !== url);
        btn.classList.remove('active');
        icon.className = 'ph ph-heart';
    } else {
        favs.push(url);
        btn.classList.add('active');
        icon.className = 'ph-fill ph-heart';
    }
    
    localStorage.setItem('lumina_favorites', JSON.stringify(favs));

    if (typeof db !== 'undefined' && db) {
        const user = getCurrentUser();
        // Preservar isReleased si ya existe
        db.collection('favorites').doc(user.name).set({ photos: favs }, { merge: true });
    }
}

function downloadImage(url) {
    // Descarga simulada/real (abrir en nueva pestaÃ±a para que el navegador lo maneje)
    window.open(url, '_blank');
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos dÃ­as';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

function getFooterHTML() {
    return `
        <footer class="footer">
            <div>
                <h3><i class="ph ph-aperture"></i> CLAY</h3>
                <p>Agencia de fotografÃ­a de clase mundial.</p>
                <div class="social-icons">
                    <a href="#"><i class="ph ph-instagram-logo"></i></a>
                    <a href="#"><i class="ph ph-twitter-logo"></i></a>
                    <a href="#"><i class="ph ph-facebook-logo"></i></a>
                </div>
            </div>
            <div>
                <h3>Contacto Directo</h3>
                <a href="tel:+1234567890"><i class="ph ph-phone"></i> +1 (234) 567-890</a>
                <a href="mailto:hola@clay.com"><i class="ph ph-envelope-simple"></i> hola@clay.com</a>
                <p><i class="ph ph-map-pin"></i> 123 Avenida Luz, Ciudad Creativa</p>
            </div>
        </footer>
    `;
}

// --- CONTROLLERS ---

function updateNavbar() {
    const user = getCurrentUser();
    const navActions = document.querySelector('.nav-actions');
    const navLinks = document.querySelector('.nav-links');
    
    const themeIcon = localStorage.getItem('lumina_theme') === 'light' ? 'ph-moon' : 'ph-sun';
    const themeBtn = `<button class="theme-toggle-btn" onclick="toggleThemeNavbar()"><i class="ph ${themeIcon}" id="theme-icon"></i></button>`;

    if (user) {
        if (navActions) {
            navActions.innerHTML = `
                ${themeBtn}
                <button class="btn btn-outline" style="margin-left: 10px;" onclick="logout()">Salir</button>
            `;
        }
        if (navLinks && user.role === 'client') {
            navLinks.innerHTML = `
                <a href="#" onclick="navigateTo('client-dashboard'); return false;">Mi Resumen</a>
                <a href="#" onclick="navigateTo('photographers'); return false;">FotÃ³grafos</a>
                <a href="#" onclick="navigateTo('booking'); return false;">Agendar</a>
            `;
        }
        
        if(user.role === 'client' || user.role === 'photographer') {
            injectFloatingChat();
        }
    } else {
        if (navActions) {
            navActions.innerHTML = `
                ${themeBtn}
                <a href="login.html" class="btn btn-outline" style="text-decoration:none;">Ingresar</a>
            `;
        }
    }
}

function navigateTo(route) {
    const container = document.getElementById('app-container');
    if(!container) return; // Si estamos en otra pÃ¡gina

    try {
        container.innerHTML = routes[route] ? routes[route]() : routes['home']();
    } catch(err) {
        container.innerHTML = `<div style="padding: 50px; background: red; color: white; border-radius: 10px; margin-top: 50px;">
            <h2>ðŸš¨ Error CrÃ­tico Detectado</h2>
            <p><strong>Mensaje:</strong> ${err.message}</p>
            <p><strong>Stack:</strong> ${err.stack}</p>
        </div>`;
        console.error("Navigation error:", err);
    }
    
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('onclick') && a.getAttribute('onclick').includes(route)) a.classList.add('active');
    });

    if (route === 'chat') {
        const msgs = document.getElementById('chat-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    setTimeout(initScrollAnimations, 50); // Inicializar observer cuando el DOM estÃ© listo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Profile logic
function renderPhotographersGrid(filter) {
    if(globalPhotographers.length === 0) return '<p style="color: var(--text-secondary);">No hay fotÃ³grafos registrados aÃºn.</p>';
    
    let filtered = globalPhotographers;
    if (filter === 'Retratos') filtered = globalPhotographers.filter(p => p.style && p.style.toLowerCase().includes('retrato'));
    else if (filter === 'Comercial') filtered = globalPhotographers.filter(p => p.style && p.style.toLowerCase().includes('comercial'));
    else if (filter === 'Moda') filtered = globalPhotographers.filter(p => p.style && p.style.toLowerCase().includes('moda'));
    
    return filtered.map(p => `
        <div class="photographer-card glass" onclick="viewProfile('${p.uid}')">
            <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p>${p.style || 'FotografÃ­a Profesional'}</p>
            <button class="btn btn-outline" style="width: 100%">Ver Portafolio</button>
        </div>
    `).join('');
}

function filterPhotographers(filter, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('photographers-grid-container').innerHTML = renderPhotographersGrid(filter);
}

function viewProfile(id) {
    currentProfileId = id;
    navigateTo('photographer-profile');
}

// Booking logic
function goToBooking(photographerId) {
    bookingState.photographer = photographerId;
    navigateTo('booking');
}

function toggleService(element, serviceName) {
    document.querySelectorAll('.service-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    bookingState.service = serviceName;
}

function selectDate(element, day) {
    document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    bookingState.date = day;
    const timeContainer = document.getElementById('time-selection-container');
    if (timeContainer) timeContainer.style.display = 'block';
}

function selectTime(element, time) {
    document.querySelectorAll('.time-slot').forEach(el => {
        el.style.background = 'var(--bg-surface)';
        el.style.color = 'var(--text-primary)';
        el.style.borderColor = 'var(--glass-border)';
    });
    element.style.background = 'var(--accent)';
    element.style.color = 'white';
    element.style.borderColor = 'var(--accent)';
    bookingState.time = time;
}

async function confirmBooking() {
    const user = getCurrentUser();
    if (!user || user.role !== 'client') {
        alert("Debes iniciar sesiÃ³n como Cliente para agendar.");
        window.location.href = 'login.html';
        return;
    }
    if (!bookingState.date) {
        alert("Por favor selecciona un dÃ­a en el calendario.");
        return;
    }
    if (!bookingState.time) {
        alert("Por favor selecciona un horario para tu sesiÃ³n.");
        return;
    }

    const photoObj = globalPhotographers.find(p => p.uid === bookingState.photographer);
    const photoName = photoObj ? photoObj.name : 'FotÃ³grafo';
    
    const newBooking = {
        id: Date.now().toString(),
        clientName: user.name,
        photographerName: photoName,
        photographerId: bookingState.photographer,
        service: bookingState.service,
        date: bookingState.date,
        time: bookingState.time,
        status: 'Pendiente',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (db) {
        try {
            await db.collection('bookings').doc(newBooking.id).set(newBooking);
            sendEmailNotification('booking_new', photoName, `Â¡Nueva reserva! ${user.name} solicitÃ³ una cita el dÃ­a ${bookingState.date} a las ${bookingState.time}.`);
            setTimeout(() => {
                window.location.href = 'client.html';
            }, 2000); // Dar tiempo para ver el toast
        } catch(e) {
            console.error("Error saving booking:", e);
            alert("Hubo un error de conexiÃ³n con la nube.");
        }
    }
}

function updateBooking(id, newStatus) {
    if (db) {
        db.collection('bookings').doc(id).update({ status: newStatus });
    }
}

// Chat logic
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    const messages = JSON.parse(localStorage.getItem('lumina_messages'));
    messages.push({ text, type: 'sent' });
    localStorage.setItem('lumina_messages', JSON.stringify(messages));
    
    input.value = '';
    navigateTo('chat'); // Refresh to show message

    // Simulate auto reply if client sends message
    setTimeout(() => {
        const msgs = JSON.parse(localStorage.getItem('lumina_messages'));
        msgs.push({ text: 'Recibido. En un momento te atiendo.', type: 'received' });
        localStorage.setItem('lumina_messages', JSON.stringify(msgs));
        if (document.getElementById('chat-messages')) navigateTo('chat'); // Refresh only if still in chat
    }, 2000);
}

function handleKeyPress(e) {
    if (e.key === 'Enter') sendMessage();
}

// Lightbox logic
let lightboxImages = [];
let lightboxCurrentIndex = 0;

function initLightbox() {
    if (!document.getElementById('lightbox')) {
        const lb = document.createElement('div');
        lb.id = 'lightbox';
        lb.className = 'lightbox';
        lb.innerHTML = `
            <button class="lightbox-close" onclick="closeLightbox()"><i class="ph ph-x"></i></button>
            <button class="lightbox-nav lightbox-prev" onclick="lightboxPrev(event)"><i class="ph ph-caret-left"></i></button>
            <div id="lightbox-media-container" style="max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center;">
                <img id="lightbox-img" src="" alt="Fullscreen" style="display: none;">
                <video id="lightbox-video" src="" controls style="display: none; max-width: 100%; max-height: 100%;"></video>
            </div>
            <button class="lightbox-nav lightbox-next" onclick="lightboxNext(event)"><i class="ph ph-caret-right"></i></button>
            <div id="lightbox-counter" class="lightbox-counter"></div>
        `;
        lb.onclick = (e) => {
            if (e.target.id === 'lightbox') closeLightbox();
        };
        document.body.appendChild(lb);
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('lightbox').classList.contains('active')) return;
            if (e.key === 'ArrowRight') lightboxNext({stopPropagation: ()=>{}});
            if (e.key === 'ArrowLeft') lightboxPrev({stopPropagation: ()=>{}});
            if (e.key === 'Escape') closeLightbox();
        });
    }
}

function openLightbox(index, type) {
    if (type === 'gallery') {
        lightboxImages = window.clientGallery && window.clientGallery.length > 0 ? window.clientGallery : galleryImages;
    } else if (type === 'portfolio') {
        const p = globalPhotographers.find(photo => photo.uid === currentProfileId);
        lightboxImages = p ? (p.portfolio || []) : [];
    }
    lightboxCurrentIndex = index;
    updateLightboxImg();
    document.getElementById('lightbox').classList.add('active');
}

function updateLightboxImg() {
    const url = lightboxImages[lightboxCurrentIndex];
    const imgEl = document.getElementById('lightbox-img');
    const vidEl = document.getElementById('lightbox-video');
    
    // Pausar video anterior si existe
    vidEl.pause();
    
    if (isVideo(url)) {
        imgEl.style.display = 'none';
        vidEl.style.display = 'block';
        vidEl.src = url;
    } else {
        vidEl.style.display = 'none';
        imgEl.style.display = 'block';
        imgEl.src = url;
    }
    
    document.getElementById('lightbox-counter').innerText = `${lightboxCurrentIndex + 1} / ${lightboxImages.length}`;
}

function lightboxNext(e) {
    e.stopPropagation();
    lightboxfunction lightboxPrev(e) {
    e.stopPropagation();
    lightboxCurrentIndex = (lightboxCurrentIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxImg();
}

function closeLightbox() {
    const vidEl = document.getElementById('lightbox-video');
    if (vidEl) vidEl.pause();
    document.getElementById('lightbox').classList.remove('active');
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    initDB();
    applyTheme();
    initLightbox();
    updateNavbar();
    
    // Quitar splash screen con seguridad
    const splash = document.getElementById('splash-screen');
    if(splash) {
        setTimeout(() => {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 800);
        }, 1500); // Reducido a 1.5s para que sea mÃ¡s Ã¡gil
    }
