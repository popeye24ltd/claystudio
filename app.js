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

let globalGraphicDesigns = [];

const defaultGraphicDesigns = [
    {
        id: 'seed-1',
        title: 'Identidad Visual & Branding Lumina',
        category: 'Branding',
        client: 'Lumina Café & Roastery',
        description: 'Desarrollo integral de logotipo, paleta cromática, tipografías y manual de identidad corporativa para cafetería de especialidad con concepto artesanal contemporáneo.',
        imageUrl: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=1000&auto=format&fit=crop',
        createdAt: 1718000000000
    },
    {
        id: 'seed-2',
        title: 'Campaña Social Media "Summer Vibes"',
        category: 'Redes Sociales',
        client: 'Aura Swimwear',
        description: 'Conjunto de plantillas para Instagram Stories, carruseles de producto de alto impacto y creativos visuales para el lanzamiento de temporada estival.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop',
        createdAt: 1718100000000
    },
    {
        id: 'seed-3',
        title: 'Packaging Ecológico Botanics',
        category: 'Packaging',
        client: 'Botanics Skin Care',
        description: 'Diseño de etiquetas y empaque ecológico con acabados foil dorado y troquelado para línea exclusiva de cosmética orgánica.',
        imageUrl: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=1000&auto=format&fit=crop',
        createdAt: 1718200000000
    },
    {
        id: 'seed-4',
        title: 'Cartelería y Publicidad Exterior',
        category: 'Publicidad',
        client: 'Festival de Jazz Nocturno',
        description: 'Afiches publicitarios de gran formato para festival musical con estilo tipográfico suizo, composiciones geométricas e ilustraciones vectoriales.',
        imageUrl: 'https://images.unsplash.com/photo-1572945281869-8402a7b8e1f5?w=1000&auto=format&fit=crop',
        createdAt: 1718300000000
    },
    {
        id: 'seed-5',
        title: 'Diseño Editorial - Revista Vanguardia',
        category: 'Editorial',
        client: 'Editorial Prisma',
        description: 'Maquetación editorial, diseño de portadas y diagramación de reportajes fotográficos para edición de colección semestral.',
        imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1000&auto=format&fit=crop',
        createdAt: 1718400000000
    },
    {
        id: 'seed-6',
        title: 'Rediseño de Marca & Símbolo Minimalista',
        category: 'Branding',
        client: 'Nordic Architecture Studio',
        description: 'Isotipo arquitectónico geométrico, papelería corporativa y aplicaciones en tarjetas de presentación con acabados prémium en bajo relieve.',
        imageUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1000&auto=format&fit=crop',
        createdAt: 1718500000000
    }
];
globalGraphicDesigns = defaultGraphicDesigns;

if (typeof firebase !== 'undefined') {
    if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();
    window.db = db;
    window.storage = storage;
    window.auth = auth;
    window.firebaseConfig = firebaseConfig;

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

    db.collection('graphic_designs').orderBy('createdAt', 'desc').onSnapshot(snap => {
        if (!snap.empty) {
            globalGraphicDesigns = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            globalGraphicDesigns = defaultGraphicDesigns;
        }
        const grid = document.getElementById('graphic-design-grid');
        if (grid) {
            const activeBtn = document.querySelector('.design-filter-btn.active');
            const category = activeBtn ? activeBtn.getAttribute('data-cat') || 'Todos' : 'Todos';
            const searchInput = document.getElementById('design-search-input');
            const query = searchInput ? searchInput.value : '';
            grid.innerHTML = renderGraphicDesignGrid(category, query);
        }
    }, err => {
        console.warn("Firestore designs error, fallback to default", err);
        if (globalGraphicDesigns.length === 0) globalGraphicDesigns = defaultGraphicDesigns;
    });

    db.collection('site_settings').doc('homepage').onSnapshot(doc => {
        if (doc.exists && doc.data().galleryImages && doc.data().galleryImages.length > 0) {
            window.customGalleryImages = doc.data().galleryImages;
        } else {
            window.customGalleryImages = null;
        }
        const galleryEl = document.querySelector('.gallery');
        if (galleryEl && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) {
            const activeHome = document.querySelector('.nav-links a.active');
            if (!activeHome || (activeHome.getAttribute('onclick') && activeHome.getAttribute('onclick').includes('home'))) {
                const images = getActiveGalleryImages();
                galleryEl.innerHTML = images.map((img, i) => `
                    <div class="gallery-item glass" onclick="openLightbox(${i}, 'gallery')" style="height: clamp(180px, 40vw, 400px);">
                        <img src="${img}" alt="Gallery image ${i+1}">
                        <div class="gallery-overlay">
                            <h3>Sesión Premium</h3>
                            <p>Ver galería completa</p>
                        </div>
                    </div>
                `).join('');
            }
        }
    }, err => {
        console.warn("Homepage settings listener", err);
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
        { text: '¡Hola! Bienvenid@ a CLAY.', type: 'received' }
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
    alert("Iniciando exportación de galería (Simulado)...");
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
                <span id="chat-window-title"><i class="ph ph-chats"></i> Bandeja de mensajes</span>
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
    
    document.getElementById('chat-window-title').innerHTML = `<i class="ph ph-arrow-left" style="cursor:pointer;" onclick="loadChatInbox()"></i> Chat: ${otherUserName} <span id="online-indicator" style="display:none; color: #10b981; font-size: 0.8rem; margin-left: 5px;"></span>`;
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
    
    document.getElementById('chat-window-title').innerHTML = `<i class="ph ph-chats"></i> Bandeja de mensajes`;
    document.getElementById('chat-window-footer').style.display = 'none';
    const body = document.getElementById('chat-window-body');
    
    const user = getCurrentUser();
    if(!user || !db) {
        body.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No hay conexión.</p>';
        return;
    }
    
    body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;"><i class="ph ph-spinner ph-spin"></i> Cargando directorio...</p>';
    
    // Para clientes, mostrar directorio de fotógrafos
    if (user.role === 'client') {
        if (globalPhotographers.length === 0) {
            body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">No hay fotógrafos disponibles aún.</p>';
            return;
        }
        let html = '';
        globalPhotographers.forEach(p => {
            html += `
                <div class="chat-inbox-item" onclick="openFloatingChat('${p.uid}', '${p.name}')" style="display: flex; align-items: center; gap: 10px;">
                    <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="margin: 0;">${p.name}</h4>
                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">${p.style || 'Fotógrafo'}</p>
                    </div>
                </div>
            `;
        });
        body.innerHTML = html;
    } else {
        // Para fotógrafos, cargar chats activos
        db.collection('chats').where('participants', 'array-contains', user.uid).get().then(snap => {
            if(snap.empty) {
                body.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:20px;">No tienes mensajes aún.</p>';
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
                        <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">Ver conversación</p>
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
                
                // Marcar como leído si no es mío y no estaba leído
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
        // Excepción: Permitir entrar al admin sin verificar (opcional), pero exigirlo a clientes
        if (!cred.user.emailVerified) {
            // Chequear si es admin (permitir acceso si queremos, o bloquear a todos)
            // Firebase exige iniciar sesión para leer Firestore, pero podemos bloquear.
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
        console.error("Error iniciando sesión:", e);
        return false;
    }
}

async function registerUser(email, password, name, role) {
    if (!auth) return false;
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Enviar correo de verificación
        await user.sendEmailVerification();
        
        // Save user profile in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            role: role,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Cerrar sesión inmediatamente para obligar al usuario a verificar antes de entrar
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
            alert('Contraseña actualizada con éxito');
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
    // Simulador de EmailJS para demostración local.
    // Para producción:
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
            <h4 style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">Email automático simulado</h4>
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

function getActiveGalleryImages() {
    return (window.customGalleryImages && window.customGalleryImages.length > 0) ? window.customGalleryImages : galleryImages;
}

let bookingState = { service: 'Sesión en Estudio', photographer: 1, date: null, time: null };

// --- VIEWS ---
const routes = {
    home: () => `
        <div class="hero fade-in">
            <h1 style="font-size: clamp(1.6rem, 6vw, 5.5rem); line-height: 1.15; word-break: break-word; max-width: 100%;">Capturando momentos, <br>creando eternidad.</h1>
            <p style="font-size: clamp(0.9rem, 3.5vw, 1.3rem);">Agencia de fotografía premium. Conecta con los mejores fotógrafos para tus eventos y proyectos comerciales.</p>
            <button class="btn btn-primary" onclick="window.location.href='login.html'">Ingresa para Explorar Portafolios</button>
        </div>
        <div class="gallery reveal-up" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 20px; padding: 20px; max-width: 1200px; margin: 0 auto; width: 100%;">
            ${getActiveGalleryImages().map((img, i) => `
                <div class="gallery-item glass" onclick="openLightbox(${i}, 'gallery')" style="height: clamp(180px, 40vw, 400px);">
                    <img src="${img}" alt="Gallery image ${i+1}">
                    <div class="gallery-overlay">
                        <h3>Sesión Premium</h3>
                        <p>Ver galería completa</p>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Showcase de Diseño Gráfico en Home -->
        <div class="reveal-up" style="max-width: 1200px; margin: 60px auto 40px auto; padding: 0 20px;">
            <div class="glass" style="border-radius: 24px; padding: 40px 30px; border: 1px solid var(--glass-border); position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(20, 20, 30, 0.6) 100%);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 30px;">
                    <div>
                        <div class="design-badge-pill" style="margin-bottom: 10px;">
                            <i class="ph ph-paint-brush-broad"></i> Nuevo Servicio Creativo
                        </div>
                        <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); margin-bottom: 8px;">Estudio de Diseño Gráfico</h2>
                        <p style="color: var(--text-secondary); max-width: 600px;">
                            Creamos marcas icónicas, empaques cautivadores y piezas digitales de alto impacto. Descubre nuestros proyectos más recientes.
                        </p>
                    </div>
                    <button class="btn btn-primary" onclick="navigateTo('graphic-design')">
                        <i class="ph ph-sparkle"></i> Explorar Portafolio
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
                    ${(globalGraphicDesigns.slice(0, 3)).map(d => `
                        <div class="glass" style="border-radius: 14px; overflow: hidden; cursor: pointer; transition: transform 0.3s;" onclick="navigateTo('graphic-design')" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='none'">
                            <div style="height: 180px; overflow: hidden; position: relative;">
                                <img src="${d.imageUrl}" alt="${d.title}" style="width: 100%; height: 100%; object-fit: cover;">
                                <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); border: 1px solid var(--accent); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">
                                    ${d.category}
                                </span>
                            </div>
                            <div style="padding: 15px;">
                                <h4 style="font-size: 1rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.title}</h4>
                                <p style="color: var(--accent); font-size: 0.8rem; font-weight: 500;">${d.client || 'CLAY Studio'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="testimonials-section reveal-up">
            <h2>Lo que dicen nuestros clientes</h2>
            <div class="testimonial-card glass" style="margin-top:40px;">
                <div class="testimonial-stars"><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i></div>
                "El equipo de CLAY capturó nuestro evento de una manera mágica. Las fotos parecen sacadas de una revista de moda. Totalmente recomendados."
                <div class="testimonial-author">- María y Roberto</div>
            </div>
        </div>

        ${getFooterHTML()}
    `,

    'graphic-design': () => {
        const categories = ['Todos', 'Branding', 'Redes Sociales', 'Packaging', 'Publicidad', 'Editorial', 'Ilustración'];
        return `
        <div class="fade-in" style="max-width: 1300px; margin: 0 auto; padding: 20px 20px 60px 20px;">
            
            <!-- Hero Header -->
            <div class="design-hero">
                <div class="design-badge-pill">
                    <i class="ph ph-paint-brush-broad"></i> Estudio Creativo CLAY
                </div>
                <h1 style="font-size: clamp(2.2rem, 5vw, 3.8rem); line-height: 1.15; margin-bottom: 15px; font-weight: 700;">
                    Portafolio de Diseño Gráfico
                </h1>
                <p style="color: var(--text-secondary); font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.6; max-width: 700px; margin: 0 auto;">
                    Diseñamos identidades visuales que conectan y perduran. Explora nuestros trabajos en branding, packaging, piezas publicitarias y diseño editorial.
                </p>
            </div>

            <!-- Search & Category Filters -->
            <div class="design-filters-container">
                <div class="design-search-box">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="text" id="design-search-input" placeholder="Buscar por proyecto o cliente..." oninput="searchGraphicDesigns(this)">
                </div>

                <div class="design-filters-pills" id="design-category-filters">
                    ${categories.map((cat, idx) => `
                        <button class="design-filter-btn ${idx === 0 ? 'active' : ''}" data-cat="${cat}" onclick="filterGraphicDesigns('${cat}', this)">
                            ${cat === 'Todos' ? '<i class="ph ph-squares-four"></i>' : ''} ${cat}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Graphic Design Grid -->
            <div class="design-grid slide-up" id="graphic-design-grid">
                ${renderGraphicDesignGrid('Todos', '')}
            </div>

            <!-- Call to Action Banner -->
            <div class="design-cta-banner reveal-up">
                <div style="max-width: 650px; margin: 0 auto;">
                    <div class="design-badge-pill" style="margin-bottom: 12px;">
                        <i class="ph ph-sparkle"></i> Hazlo Realidad
                    </div>
                    <h2 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); margin-bottom: 12px;">¿Tienes un proyecto en mente?</h2>
                    <p style="color: var(--text-secondary); font-size: 1.05rem; margin-bottom: 25px; line-height: 1.6;">
                        Ya sea el lanzamiento de una nueva marca, el rediseño de tu empaque o contenido de alto impacto para redes sociales, nuestro equipo creativo está listo para colaborar contigo.
                    </p>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="requestDesignQuote('Nuevo Proyecto de Diseño Gráfico')">
                            <i class="ph ph-chat-circle-text"></i> Solicitar Cotización
                        </button>
                        <button class="btn btn-outline" onclick="window.location.href='mailto:claystudy14@gmail.com?subject=Consulta%20Diseño%20Gráfico'">
                            <i class="ph ph-envelope"></i> Contactar por Correo
                        </button>
                    </div>
                </div>
            </div>

        </div>

        ${getFooterHTML()}
        `;
    },
    
    photographers: () => `
        <div class="fade-in" style="text-align: center; margin-top: 40px;">
            <h1 style="font-size: 3rem; margin-bottom: 10px;">Nuestros Fotógrafos</h1>
            <p style="color: var(--text-secondary);">Elige al artista perfecto para tu próxima sesión.</p>
        </div>
        <div class="portfolio-filters fade-in">
            <button class="filter-btn active" onclick="filterPhotographers('Todos', this)">Todos</button>
            <button class="filter-btn" onclick="filterPhotographers('Retratos y Eventos', this)">Retratos</button>
            <button class="filter-btn" onclick="filterPhotographers('Fotografía Comercial', this)">Comercial</button>
            <button class="filter-btn" onclick="filterPhotographers('Moda y Editorial', this)">Moda</button>
        </div>
        <div class="photographers-grid slide-up" id="photographers-grid-container">
            ${renderPhotographersGrid('Todos')}
        </div>
        ${getFooterHTML()}
    `,
    
    'photographer-profile': () => {
        const p = globalPhotographers.find(photo => photo.uid === currentProfileId);
        if (!p) return '<p>Fotógrafo no encontrado</p>';
        const portfolioUrls = p.portfolio || [];
        const blocks = p.portfolioBlocks || [];
        const user = getCurrentUser();

        return `
        <div class="fade-in" style="max-width: 1100px; margin: 40px auto; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; flex-wrap: wrap; gap: 12px;">
                <button class="btn btn-outline" onclick="navigateTo('photographers')"><i class="ph ph-arrow-left"></i> Volver a Fotógrafos</button>
                ${user && user.role === 'admin' ? `
                    <a href="admin.html?open_builder=1&photographer_id=${p.uid}" class="btn btn-primary" style="padding: 7px 16px; font-size: 0.85rem; text-decoration: none;">
                        <i class="ph ph-layout"></i> Diseñar Portafolio con Bloques
                    </a>
                ` : ''}
            </div>
            
            <div class="glass photographer-profile-header" style="display: flex; gap: 30px; padding: 40px; border-radius: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 40px;">
                <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" alt="${p.name}" class="photographer-avatar" style="width: 180px; height: 180px; border-radius: 50%; object-fit: cover; border: 4px solid var(--accent);">
                <div class="photographer-info" style="flex: 1; min-width: 240px;">
                    <h1 class="photographer-title" style="font-size: 2.8rem; margin-bottom: 8px;">${p.name}</h1>
                    <h3 style="color: var(--accent); margin-bottom: 15px; font-size: 1.2rem;">${p.style || 'Fotografía Profesional'}</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 20px; max-width: 550px; line-height: 1.6;">${p.description || 'Especialista en capturar la esencia de cada momento.'}</p>
                    <button class="btn btn-primary" onclick="goToBooking('${p.uid}')"><i class="ph ph-calendar-plus"></i> Agendar con ${p.name}</button>
                </div>
            </div>

            <div class="portfolio-layout-container">
                ${renderPortfolioLayout(blocks, portfolioUrls)}
            </div>
        </div>
        ${getFooterHTML()}
        `
    },
    
    booking: () => `
        <div class="booking-container glass slide-up" style="margin-top: 40px;">
            <h2 class="step-title"><i class="ph ph-calendar-check"></i> Agendar Sesión</h2>
            
            <p style="margin-bottom: 10px; color: var(--text-secondary);">1. Fotógrafo Seleccionado:</p>
            <select id="booking-photographer" class="glass" style="width: 100%; padding: 15px; color: var(--text-primary); border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 30px; background: var(--bg-surface);" onchange="bookingState.photographer = this.value">
                ${globalPhotographers.map(p => `<option value="${p.uid}" ${bookingState.photographer == p.uid ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>

            <p style="margin-bottom: 10px; color: var(--text-secondary);">2. Selecciona el tipo de servicio:</p>
            <div class="service-options" style="display: flex; gap: 15px; margin-bottom: 30px;">
                <div class="service-card glass active" onclick="toggleService(this, 'Sesión en Estudio')" style="flex: 1; text-align: center; padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <i class="ph ph-camera" style="font-size: 2rem; color: var(--accent); margin-bottom: 10px;"></i>
                    <h3>Sesión en Estudio</h3>
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

            <p style="margin-bottom: 10px; color: var(--text-secondary);">3. Selecciona la fecha de tu sesión:</p>
            <div class="glass" style="padding: 20px; border-radius: 16px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <button class="btn btn-outline" style="padding: 5px 12px; border-radius: 8px;" onclick="event.preventDefault()"><i class="ph ph-caret-left"></i></button>
                    <h3 style="margin: 0; font-size: 1.1rem;">Junio 2026</h3>
                    <button class="btn btn-outline" style="padding: 5px 12px; border-radius: 8px;" onclick="event.preventDefault()"><i class="ph ph-caret-right"></i></button>
                </div>
                <div class="calendar-grid">
                    ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => `<div style="text-align: center; font-size: 0.8rem; font-weight: bold; color: var(--text-secondary); text-transform: uppercase;">${day}</div>`).join('')}
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
            <h2>Mensajería Directa</h2>
            <p style="color: var(--text-secondary);">Comunícate instantáneamente.</p>
        </div>
        <div class="chat-container glass slide-up">
            <div class="chat-header">
                <i class="ph ph-user-circle" style="font-size: 2.5rem;"></i>
                <div>
                    <h3>Chat General</h3>
                    <p style="font-size: 0.8rem; color: var(--accent);">En línea</p>
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

                <h1 class="client-dashboard-title" style="font-size: 2.5rem; margin-bottom: 10px;">¡${greeting}, ${firstName}! <i class="ph-fill ph-hand-waving" style="color: #fbbf24; animation: wave 2.5s infinite; transform-origin: 70% 70%; display: inline-block;"></i></h1>
                <p style="color: var(--text-secondary); font-size: 1.1rem; max-width: 600px; margin: 0 auto; line-height: 1.6;">Estamos muy felices de tenerte por aquí. Desde este panel puedes administrar tus reservas, hablar directamente con tu fotógrafo y visualizar el increíble resultado de tus sesiones.</p>
            </div>

            <!-- Acceso Rápido a Diseño Gráfico para el Cliente -->
            <div class="glass" style="padding: 25px 30px; border-radius: 16px; margin-bottom: 35px; border-left: 4px solid var(--accent); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; background: linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(20, 20, 30, 0.4) 100%);">
                <div>
                    <span style="color: var(--accent); font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="ph ph-paint-brush-broad"></i> Área Creativa CLAY
                    </span>
                    <h3 style="margin-top: 5px; font-size: 1.3rem;">Portafolio de Diseño Gráfico</h3>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; max-width: 550px; margin-top: 4px;">
                        Descubre nuestros trabajos en identidad de marca, empaques, publicidad y contenido para redes sociales. Solicita cotizaciones para tus proyectos directamente.
                    </p>
                </div>
                <button class="btn btn-primary" onclick="navigateTo('graphic-design')">
                    <i class="ph ph-sparkle"></i> Ver Portafolio de Diseños
                </button>
            </div>
            
            <h3 style="margin-bottom: 15px; color: var(--accent);">Directorio de Contactos</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">Habla directamente con nuestros fotógrafos en cualquier momento.</p>
            <div style="display: flex; gap: 15px; overflow-x: auto; padding-bottom: 20px; margin-bottom: 30px;">
                ${globalPhotographers.length === 0 ? `
                    <div class="glass" style="width: 100%; padding: 40px; text-align: center; border-radius: 12px; border: 1px dashed var(--accent);">
                        <i class="ph ph-users" style="font-size: 3rem; color: var(--accent); margin-bottom: 15px; display: inline-block;"></i>
                        <h4>Directorio en Construcción</h4>
                        <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto;">Estamos preparando el perfil de nuestros fotógrafos. Pronto podrás verlos y contactarlos por aquí.</p>
                    </div>` : 
                    globalPhotographers.map(p => `
                        <div class="glass" style="min-width: 200px; padding: 20px; text-align: center; border-radius: 12px; cursor: pointer; transition: 0.3s;" onclick="openFloatingChat('${p.uid}', '${p.name}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--glass-border)'">
                            <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 2px solid var(--accent);">
                            <h4 style="margin-bottom: 5px;">${p.name}</h4>
                            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">${p.style || 'Fotógrafo'}</p>
                            <button class="btn btn-outline" style="width: 100%; padding: 8px; font-size: 0.9rem;"><i class="ph ph-chat-circle"></i> Escribir</button>
                        </div>
                    `).join('')
                }
            </div>

            <h3 style="margin-bottom: 15px; color: var(--accent);">Mis Reservas</h3>
            ${bookings.length === 0 ? `
                <div class="glass" style="padding: 40px; text-align: center; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.2); margin-bottom: 30px;">
                    <i class="ph ph-calendar-plus" style="font-size: 3rem; color: var(--accent); margin-bottom: 15px; display: inline-block;"></i>
                    <h4>Aún no tienes sesiones programadas</h4>
                    <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 20px auto;">¿Listo para capturar momentos inolvidables? Explora nuestros servicios y agenda tu primera sesión fotográfica hoy mismo.</p>
                    <button class="btn btn-primary" onclick="navigateTo('booking')"><i class="ph ph-calendar"></i> Agendar Sesión</button>
                </div>` : 
                bookings.map(b => `
                    <div class="glass dashboard-reserva-item" style="padding: 20px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div>
                            <h4>${b.service} - Día ${b.date} ${b.time ? 'a las ' + b.time : ''}</h4>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">Fotógrafo: ${b.photographerName} | Estado: <strong style="color: ${b.status==='Aceptada'?'#22c55e':(b.status==='Rechazada'?'#ef4444':'#fbbf24')}">${b.status}</strong></p>
                        </div>
                        ${b.photographerId ? `<button class="btn btn-outline" onclick="openFloatingChat('${b.photographerId}', '${b.photographerName}')"><i class="ph ph-chat-circle"></i> Mensajes</button>` : ''}
                    </div>
                `).join('')
            }

            <h3 style="margin-bottom: 15px; color: var(--accent); margin-top: 40px;">${window.clientGallery && window.clientGallery.length > 0 ? (window.isGalleryReleased ? 'Galería Entregada (Alta Resolución)' : 'Galerías de Prueba (Watermark)') : 'Galería de Inspiración'}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">${window.clientGallery && window.clientGallery.length > 0 ? (window.isGalleryReleased ? '¡Tus fotos han sido liberadas! Ahora puedes descargarlas.' : 'Las imágenes tienen marca de agua temporalmente. Selecciona tus favoritas para solicitar la entrega.') : 'Aún no tienes fotos propias. Explora nuestro trabajo para inspirarte para tu futura sesión.'}</p>
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
    // Descarga simulada/real (abrir en nueva pestaña para que el navegador lo maneje)
    window.open(url, '_blank');
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

function getFooterHTML() {
    return `
        <footer class="footer">
            <div>
                <h3><i class="ph ph-aperture"></i> CLAY</h3>
                <p>Agencia de fotografía de clase mundial.</p>
                <div class="social-icons">
                    <a href="https://www.instagram.com/clayestudios?igsh=MnVlZTNsdXlnZmx5" target="_blank"><i class="ph ph-instagram-logo"></i></a>
                </div>
            </div>
            <div>
                <h3>Contacto Directo</h3>
                <a href="tel:+584247396851"><i class="ph ph-phone"></i> +58 424-7396851</a>
                <a href="mailto:claystudy14@gmail.com"><i class="ph ph-envelope-simple"></i> claystudy14@gmail.com</a>
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
        if (user.role === 'admin') {
            if (navActions) {
                navActions.innerHTML = `
                    ${themeBtn}
                    <a href="admin.html?open_assistant=1" class="btn" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; margin-left: 8px; text-decoration: none; padding: 7px 14px; font-size: 0.85rem; border: none; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;"><i class="ph ph-robot"></i> Asistente</a>
                    <a href="admin.html" class="btn btn-primary" style="margin-left: 8px; text-decoration: none; padding: 7px 14px; font-size: 0.85rem;"><i class="ph ph-shield-star"></i> Panel Admin</a>
                    <button class="btn btn-outline" style="margin-left: 8px;" onclick="logout()">Salir</button>
                `;
            }
            if (navLinks) {
                navLinks.innerHTML = `
                    <a href="#" onclick="navigateTo('home'); return false;">Inicio</a>
                    <a href="#" onclick="navigateTo('graphic-design'); return false;">Diseño Gráfico</a>
                    <a href="#" onclick="navigateTo('photographers'); return false;">Fotógrafos</a>
                    <a href="admin.html" style="color: var(--accent); font-weight: 600;"><i class="ph ph-shield-star"></i> Admin</a>
                    <a href="photographer.html"><i class="ph ph-camera"></i> Vista Fotógrafo</a>
                `;
            }
            injectFloatingChat();
        } else if (user.role === 'photographer') {
            if (navActions) {
                navActions.innerHTML = `
                    ${themeBtn}
                    <button class="btn btn-outline" style="margin-left: 10px;" onclick="logout()">Salir</button>
                `;
            }
            if (navLinks) {
                navLinks.innerHTML = `
                    <a href="photographer.html">Mi Agenda</a>
                    <a href="index.html">Ver Web</a>
                `;
            }
            injectFloatingChat();
        } else {
            // client or normal user
            if (navActions) {
                navActions.innerHTML = `
                    ${themeBtn}
                    <button class="btn btn-outline" style="margin-left: 10px;" onclick="logout()">Salir</button>
                `;
            }
            if (navLinks) {
                navLinks.innerHTML = `
                    <a href="#" onclick="navigateTo('client-dashboard'); return false;">Mi Resumen</a>
                    <a href="#" onclick="navigateTo('graphic-design'); return false;">Diseño Gráfico</a>
                    <a href="#" onclick="navigateTo('photographers'); return false;">Fotógrafos</a>
                    <a href="#" onclick="navigateTo('booking'); return false;">Agendar</a>
                `;
            }
            injectFloatingChat();
        }
    } else {
        if (navActions) {
            navActions.innerHTML = `
                ${themeBtn}
                <a href="login.html" class="btn btn-outline" style="text-decoration:none;">Ingresar</a>
            `;
        }
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="#" onclick="navigateTo('home'); return false;">Inicio</a>
                <a href="#" onclick="navigateTo('graphic-design'); return false;">Diseño Gráfico</a>
            `;
        }
    }
}

function navigateTo(route) {
    const container = document.getElementById('app-container');
    if(!container) return; // Si estamos en otra página

    try {
        container.innerHTML = routes[route] ? routes[route]() : routes['home']();
    } catch(err) {
        container.innerHTML = `<div style="padding: 50px; background: red; color: white; border-radius: 10px; margin-top: 50px;">
            <h2> Error Crítico Detectado</h2>
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

    setTimeout(initScrollAnimations, 50); // Inicializar observer cuando el DOM esté listo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- GRAPHIC DESIGN CONTROLLER & HELPERS ---
function renderGraphicDesignGrid(category, query) {
    let list = (globalGraphicDesigns && globalGraphicDesigns.length > 0) ? globalGraphicDesigns : defaultGraphicDesigns;
    
    if (category && category !== 'Todos') {
        list = list.filter(d => (d.category || '').toLowerCase() === category.toLowerCase());
    }

    if (query && query.trim() !== '') {
        const q = query.toLowerCase().trim();
        list = list.filter(d => 
            (d.title && d.title.toLowerCase().includes(q)) ||
            (d.client && d.client.toLowerCase().includes(q)) ||
            (d.description && d.description.toLowerCase().includes(q)) ||
            (d.category && d.category.toLowerCase().includes(q))
        );
    }

    if (list.length === 0) {
        return `
            <div class="glass" style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; border-radius: 16px; border: 1px dashed var(--glass-border);">
                <i class="ph ph-paint-brush" style="font-size: 3rem; color: var(--accent); margin-bottom: 15px; display: inline-block;"></i>
                <h3 style="margin-bottom: 8px;">No se encontraron diseños</h3>
                <p style="color: var(--text-secondary); max-width: 450px; margin: 0 auto;">No hay piezas gráficas que coincidan con la categoría o búsqueda seleccionada.</p>
            </div>
        `;
    }

    return list.map(d => `
        <div class="design-card glass" onclick="openDesignModal('${d.id}')">
            <div class="design-card-media">
                <span class="design-category-tag">${d.category || 'Diseño'}</span>
                <img src="${d.imageUrl}" alt="${d.title}" loading="lazy">
                <div class="design-card-overlay">
                    <span style="color: white; font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                        <i class="ph ph-arrows-out"></i> Ver Proyecto Detallado
                    </span>
                </div>
            </div>
            <div class="design-card-body">
                <div>
                    <h3 class="design-card-title">${d.title}</h3>
                    <div class="design-card-client">
                        <i class="ph ph-buildings"></i> ${d.client || 'Cliente CLAY'}
                    </div>
                </div>
                <p class="design-card-desc">${d.description || 'Diseño gráfico y dirección de arte prémium.'}</p>
                <div class="design-card-footer">
                    <span>${d.createdAt ? new Date(d.createdAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : 'Reciente'}</span>
                    <button class="btn btn-outline" style="border-radius: 20px;" onclick="event.stopPropagation(); openDesignModal('${d.id}')">
                        Detalles
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterGraphicDesigns(category, btnElement) {
    document.querySelectorAll('.design-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    
    const searchInput = document.getElementById('design-search-input');
    const query = searchInput ? searchInput.value : '';
    const grid = document.getElementById('graphic-design-grid');
    if (grid) {
        grid.innerHTML = renderGraphicDesignGrid(category, query);
    }
}

function searchGraphicDesigns(inputElement) {
    const activeBtn = document.querySelector('.design-filter-btn.active');
    const category = activeBtn ? activeBtn.getAttribute('data-cat') || 'Todos' : 'Todos';
    const grid = document.getElementById('graphic-design-grid');
    if (grid) {
        grid.innerHTML = renderGraphicDesignGrid(category, inputElement.value);
    }
}

function openDesignModal(designId) {
    const all = (globalGraphicDesigns && globalGraphicDesigns.length > 0) ? globalGraphicDesigns : defaultGraphicDesigns;
    const design = all.find(d => d.id === designId) || all[0];
    if (!design) return;

    let modal = document.getElementById('design-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'design-modal';
        modal.className = 'design-modal';
        document.body.appendChild(modal);
    }

    const dateFormatted = design.createdAt ? new Date(design.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Proyecto reciente';

    modal.innerHTML = `
        <div class="design-modal-dialog">
            <button class="design-modal-close" onclick="closeDesignModal()"><i class="ph ph-x"></i></button>
            <div class="design-modal-media-col">
                <img src="${design.imageUrl}" alt="${design.title}">
            </div>
            <div class="design-modal-info-col">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px;">
                        <span class="design-category-tag" style="position: static; display: inline-block;">${design.category || 'Diseño Gráfico'}</span>
                        <span style="font-size: 0.85rem; color: var(--text-secondary);"><i class="ph ph-calendar"></i> ${dateFormatted}</span>
                    </div>
                    <h2 style="font-size: 1.8rem; margin-bottom: 8px; line-height: 1.25;">${design.title}</h2>
                    <p style="color: var(--accent); font-weight: 500; font-size: 1rem; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <i class="ph ph-buildings"></i> Cliente: ${design.client || 'CLAY Studio'}
                    </p>
                    <div style="height: 1px; background: var(--glass-border); margin-bottom: 20px;"></div>
                    <h4 style="font-size: 0.95rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">Acerca del Proyecto</h4>
                    <p style="color: var(--text-primary); line-height: 1.7; font-size: 1rem; white-space: pre-line;">
                        ${design.description || 'Proyecto de diseño gráfico desarrollado con los más altos estándares de calidad visual y comunicación estratégica.'}
                    </p>
                    ${design.portfolioBlocks && design.portfolioBlocks.length > 0 ? `
                        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--glass-border);">
                            <h4 style="font-size: 0.9rem; color: var(--accent); text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px;"><i class="ph ph-layout"></i> Piezas y Disposición del Caso</h4>
                            <div class="portfolio-layout-container" style="gap: 20px; margin-top: 15px;">
                                ${renderPortfolioLayout(design.portfolioBlocks, [])}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--glass-border); display: flex; gap: 12px; flex-wrap: wrap;">
                    <button class="btn btn-primary" style="flex: 1; min-width: 180px;" onclick="requestDesignQuote('${encodeURIComponent(design.title)}')">
                        <i class="ph ph-chat-circle-text"></i> Cotizar Proyecto Similar
                    </button>
                    <button class="btn btn-outline" onclick="closeDesignModal()">
                        Cerrar
                    </button>
                </div>
                ${(function(){
                    const u = getCurrentUser();
                    if (u && u.role === 'admin') {
                        return `
                            <div style="background: rgba(99, 102, 241, 0.12); border: 1px solid var(--accent); padding: 12px 16px; border-radius: 12px; margin-top: 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                                <span style="font-size: 0.85rem; color: var(--accent); font-weight: 600;"><i class="ph ph-shield-star"></i> Opciones de Administrador</span>
                                <div style="display: flex; gap: 8px;">
                                    <a href="admin.html?open_builder=1&design_id=${design.id}" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem; text-decoration: none;"><i class="ph ph-layout"></i> Diseñar Portafolio</a>
                                    <button class="btn btn-outline" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.4); padding: 6px 12px; font-size: 0.8rem;" onclick="adminQuickDeleteDesign('${design.id}', '${(design.title || '').replace(/'/g, "\\'")}')"><i class="ph ph-trash"></i> Eliminar</button>
                                </div>
                            </div>
                        `;
                    }
                    return '';
                })()}
            </div>
        </div>
    `;

    modal.onclick = (e) => {
        if (e.target.id === 'design-modal') closeDesignModal();
    };

    modal.classList.add('active');
}

async function adminQuickDeleteDesign(id, title) {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${title}" del portafolio?`)) return;
    try {
        await db.collection('graphic_designs').doc(id).delete();
        closeDesignModal();
        alert('Proyecto de diseño eliminado con éxito.');
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

function closeDesignModal() {
    const modal = document.getElementById('design-modal');
    if (modal) modal.classList.remove('active');
}

function requestDesignQuote(designTitle) {
    closeDesignModal();
    const user = getCurrentUser();
    const decodedTitle = decodeURIComponent(designTitle);
    
    if (user) {
        toggleFloatingChat();
        const chatInput = document.getElementById('chat-input-text');
        if (chatInput) {
            chatInput.value = `¡Hola! Me gustaría cotizar un proyecto de diseño gráfico basado en "${decodedTitle}".`;
            chatInput.focus();
        }
    } else {
        if (confirm(`¿Deseas iniciar sesión para solicitar la cotización de "${decodedTitle}" a través de tu panel?`)) {
            window.location.href = 'login.html';
        } else {
            window.location.href = `mailto:claystudy14@gmail.com?subject=Cotización%20Diseño%20Gráfico:%20${encodeURIComponent(decodedTitle)}`;
        }
    }
}


// Profile logic
function renderPhotographersGrid(filter) {
    if(globalPhotographers.length === 0) return '<p style="color: var(--text-secondary);">No hay fotógrafos registrados aún.</p>';
    
    let filtered = globalPhotographers;
    if (filter === 'Retratos') filtered = globalPhotographers.filter(p => p.style && p.style.toLowerCase().includes('retrato'));
    else if (filter === 'Comercial') filtered = globalPhotographers.filter(p => p.style && p.style.toLowerCase().includes('comercial'));
    else if (filter === 'Moda') filtered = globalPhotographers.filter(p => p.style && p.style.toLowerCase().includes('moda'));
    
    return filtered.map(p => `
        <div class="photographer-card glass" onclick="viewProfile('${p.uid}')">
            <img src="${p.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name)}" alt="${p.name}">
            <h3>${p.name}</h3>
            <p>${p.style || 'Fotografía Profesional'}</p>
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
        alert("Debes iniciar sesión como Cliente para agendar.");
        window.location.href = 'login.html';
        return;
    }
    if (!bookingState.date) {
        alert("Por favor selecciona un día en el calendario.");
        return;
    }
    if (!bookingState.time) {
        alert("Por favor selecciona un horario para tu sesión.");
        return;
    }

    const photoObj = globalPhotographers.find(p => p.uid === bookingState.photographer);
    const photoName = photoObj ? photoObj.name : 'Fotógrafo';
    
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
            sendEmailNotification('booking_new', photoName, `¡Nueva reserva! ${user.name} solicitó una cita el día ${bookingState.date} a las ${bookingState.time}.`);
            setTimeout(() => {
                window.location.href = 'client.html';
            }, 2000); // Dar tiempo para ver el toast
        } catch(e) {
            console.error("Error saving booking:", e);
            alert("Hubo un error de conexión con la nube.");
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

function renderPortfolioLayout(blocks, fallbackUrls) {
    if (!blocks || blocks.length === 0) {
        if (!fallbackUrls || fallbackUrls.length === 0) {
            return `
                <div class="glass" style="padding: 50px 20px; text-align: center; border-radius: 16px; border: 1px dashed var(--glass-border);">
                    <i class="ph ph-image" style="font-size: 3rem; color: var(--accent); margin-bottom: 12px; display: inline-block;"></i>
                    <h3>Portafolio en Preparación</h3>
                    <p style="color: var(--text-secondary); margin-top: 5px;">Este artista está organizando su selección fotográfica.</p>
                </div>
            `;
        }
        return `
            <div class="portfolio-header-block text-left">
                <h2 class="portfolio-header-title"><i class="ph ph-image"></i> Portafolio de Trabajos</h2>
                <p class="portfolio-header-subtitle">Muestras destacadas de sesiones realizadas</p>
            </div>
            <div class="gallery">
                ${fallbackUrls.map((imgUrl, i) => `
                    <div class="gallery-item glass" style="height: 300px; cursor: pointer;" onclick="openLightbox(${i}, 'portfolio')">
                        <img src="${imgUrl}" alt="Portfolio ${i}">
                    </div>
                `).join('')}
            </div>
        `;
    }

    return blocks.map((block) => {
        if (block.type === 'header') {
            return `
                <div class="portfolio-header-block ${block.align === 'left' ? 'text-left' : 'text-center'}">
                    <h2 class="portfolio-header-title">${block.title || ''}</h2>
                    ${block.subtitle ? `<p class="portfolio-header-subtitle">${block.subtitle}</p>` : ''}
                </div>
            `;
        }
        if (block.type === 'text') {
            return `
                <div class="portfolio-text-block">
                    ${block.content || ''}
                </div>
            `;
        }
        if (block.type === 'banner') {
            return `
                <div class="portfolio-banner-block">
                    <img src="${block.url}" alt="${block.caption || 'Foto Destacada'}" onclick="openLightboxByUrl('${block.url}')">
                    ${block.caption ? `<p class="portfolio-caption">${block.caption}</p>` : ''}
                </div>
            `;
        }
        if (block.type === 'two_cols') {
            const imgs = block.images || [];
            return `
                <div class="portfolio-two-cols-block">
                    ${imgs.map(img => {
                        const u = typeof img === 'string' ? img : img.url;
                        const c = typeof img === 'object' ? img.caption : '';
                        return `
                            <div>
                                <div class="portfolio-col-item glass">
                                    <img src="${u}" onclick="openLightboxByUrl('${u}')">
                                </div>
                                ${c ? `<p class="portfolio-caption">${c}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        if (block.type === 'three_cols') {
            const imgs = block.images || [];
            return `
                <div class="portfolio-three-cols-block">
                    ${imgs.map(img => {
                        const u = typeof img === 'string' ? img : img.url;
                        const c = typeof img === 'object' ? img.caption : '';
                        return `
                            <div>
                                <div class="portfolio-col-item glass">
                                    <img src="${u}" onclick="openLightboxByUrl('${u}')">
                                </div>
                                ${c ? `<p class="portfolio-caption">${c}</p>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        if (block.type === 'grid') {
            const imgs = block.images || [];
            return `
                <div>
                    ${block.title ? `<h3 style="margin-bottom: 15px; color: var(--accent);"><i class="ph ph-squares-four"></i> ${block.title}</h3>` : ''}
                    <div class="portfolio-grid-block">
                        ${imgs.map(img => {
                            const u = typeof img === 'string' ? img : img.url;
                            return `
                                <div class="portfolio-col-item glass">
                                    <img src="${u}" onclick="openLightboxByUrl('${u}')">
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        return '';
    }).join('');
}

function openLightboxByUrl(url) {
    const p = globalPhotographers.find(photo => photo.uid === currentProfileId);
    let allImages = [];
    if (p) {
        if (p.portfolioBlocks && p.portfolioBlocks.length > 0) {
            p.portfolioBlocks.forEach(b => {
                if (b.url) allImages.push(b.url);
                if (b.images) {
                    b.images.forEach(img => {
                        allImages.push(typeof img === 'string' ? img : img.url);
                    });
                }
            });
        }
        if (allImages.length === 0 && p.portfolio) {
            allImages = p.portfolio;
        }
    }
    if (allImages.length === 0) allImages = [url];
    lightboxImages = allImages;
    const idx = allImages.indexOf(url);
    lightboxCurrentIndex = idx >= 0 ? idx : 0;
    updateLightboxImg();
    document.getElementById('lightbox').classList.add('active');
}

function openLightbox(index, type) {
    if (type === 'gallery') {
        lightboxImages = window.clientGallery && window.clientGallery.length > 0 ? window.clientGallery : getActiveGalleryImages();
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
    lightboxCurrentIndex = (lightboxCurrentIndex + 1) % lightboxImages.length;
    updateLightboxImg();
}

function lightboxPrev(e) {
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
    try {
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
            }, 1500); // Reducido a 1.5s para que sea ms gil
        }

        // Solo ejecutar el router SPA en index.html
        // Las pginas admin.html, client.html, photographer.html tienen su propio manejo
        const isSPAPage = document.getElementById('splash-screen') !== null ||
                          window.location.pathname === '/' ||
                          window.location.pathname.endsWith('index.html') ||
                          window.location.pathname.endsWith('/');

        if (isSPAPage && document.getElementById('app-container')) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('chat') === 'true') {
                navigateTo('chat');
            } else {
                const hash = window.location.hash.substring(1);
                if (hash && routes[hash]) {
                    navigateTo(hash);
                } else {
                    navigateTo('home');
                }
            }
        }
    } catch (e) {
        document.body.innerHTML = '<div style="color:white; background:red; padding: 20px; z-index: 999999; position: fixed; top: 0; left: 0; width: 100%; height: 100%;"><h1>ERROR CRTICO JS</h1><p>' + e.message + '</p><pre>' + e.stack + '</pre></div>';
    }
});
