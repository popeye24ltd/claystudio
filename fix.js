const fs = require('fs');
const content = fs.readFileSync('./app.js', 'utf8');
const lines = content.split('\n');
const goodLines = lines.slice(0, 1061); // 0 to 1060
const correctEnding = `
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
        }, 1500); // Reducido a 1.5s para que sea más ágil
    }

    // Solo ejecutar el router SPA en index.html
    // Las páginas admin.html, client.html, photographer.html tienen su propio manejo
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
});
`;

fs.writeFileSync('./app.js', goodLines.join('\n') + correctEnding);
console.log('Fixed app.js');
