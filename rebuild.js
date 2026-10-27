const fs = require('fs');

let app = fs.readFileSync('app.js', 'utf8');

// Replace email
app = app.replace(/hola@clay\.com/g, 'claystudy14@gmail.com');

// Add initLightbox before Boot
const initLightboxCode = `
function initLightbox() {
    if (!document.getElementById('lightbox')) {
        const lb = document.createElement('div');
        lb.id = 'lightbox';
        lb.className = 'lightbox';
        lb.innerHTML = \`
            <button class="lightbox-close" onclick="closeLightbox()"><i class="ph ph-x"></i></button>
            <button class="lightbox-nav lightbox-prev" onclick="lightboxPrev(event)"><i class="ph ph-caret-left"></i></button>
            <div id="lightbox-media-container" style="max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center;">
                <img id="lightbox-img" src="" alt="Fullscreen" style="display: none;">
                <video id="lightbox-video" src="" controls style="display: none; max-width: 100%; max-height: 100%;"></video>
            </div>
            <button class="lightbox-nav lightbox-next" onclick="lightboxNext(event)"><i class="ph ph-caret-right"></i></button>
            <div id="lightbox-counter" class="lightbox-counter"></div>
        \`;
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

// Boot`;

if (!app.includes('function initLightbox()')) {
    app = app.replace('// Boot', initLightboxCode);
}

fs.writeFileSync('app.js', app);
console.log('App.js correctly rebuilt with lightbox and email.');
