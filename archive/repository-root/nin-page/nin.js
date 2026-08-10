const container = document.querySelector('.drawing-box');
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
const brushSlider = document.getElementById('brush-size');
const brushSizeVal = document.getElementById('brush-size-val');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let history = []; 
let currentLineWidth = 3; 

// Initialize brush style
ctx.strokeStyle = '#2e7d32'; 
ctx.lineCap = 'round';      
ctx.lineJoin = 'round';
ctx.lineWidth = currentLineWidth;

if (brushSlider && brushSizeVal) {
    brushSlider.addEventListener('input', (e) => {
        currentLineWidth = e.target.value;
        brushSizeVal.textContent = currentLineWidth + 'px';
        ctx.lineWidth = currentLineWidth;
    });
}

function saveState() {
    const dataURL = canvas.toDataURL();
    if (history[history.length - 1] !== dataURL) {
        history.push(dataURL);
    }
    // Save both the drawing and the current container dimensions
    localStorage.setItem('userDoodle', dataURL);
    if (container.style.width) {
        localStorage.setItem('doodleWidth', container.style.width);
        localStorage.setItem('doodleHeight', container.style.height);
    }
}

// Dynamically match canvas buffer to container size to prevent stretching and handle resets
function resizeCanvas() {
    const rect = container ? container.getBoundingClientRect() : { width: 400, height: 300 };
    if (rect.width === 0 || rect.height === 0) return;

    // Grab saved drawing before resize wipes the canvas buffer
    const saved = localStorage.getItem('userDoodle');

    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.strokeStyle = '#2e7d32'; 
    ctx.lineWidth = currentLineWidth;      
    ctx.lineCap = 'round';      
    ctx.lineJoin = 'round';

    // Restore drawing instantly so it doesn't disappear when resetting size
    if (saved) {
        let savedImg = new Image();
        savedImg.src = saved;
        savedImg.onload = () => {
            ctx.drawImage(savedImg, 0, 0);
        };
    }

    // Save the dimensions when manually resized
    if (container.style.width) {
        localStorage.setItem('doodleWidth', container.style.width);
        localStorage.setItem('doodleHeight', container.style.height);
    }
}

// Automatically handle manual box resizing and resets
let resizeTimer;
const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 30);
});
if (container) {
    resizeObserver.observe(container);
}

// Load saved doodle and custom box size on startup / page reload
window.addEventListener('load', () => {
    // Restore saved custom size if it exists
    const savedWidth = localStorage.getItem('doodleWidth');
    const savedHeight = localStorage.getItem('doodleHeight');
    if (savedWidth && savedHeight) {
        container.style.width = savedWidth;
        container.style.height = savedHeight;
    }

    const rect = container ? container.getBoundingClientRect() : { width: 400, height: 300 };
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.strokeStyle = '#2e7d32'; 
    ctx.lineWidth = currentLineWidth;          
    ctx.lineCap = 'round';      
    ctx.lineJoin = 'round';

    const saved = localStorage.getItem('userDoodle');
    if (saved) {
        let img = new Image();
        img.src = saved;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            if (!history.includes(saved)) {
                history.push(saved);
            }
        };
    }
});

function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

    return [
        clientX - rect.left,
        clientY - rect.top
    ];
}

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getPosition(e);
}

function draw(e) {
    if (!isDrawing) return;
    
    // Only prevent default behavior when actively drawing strokes with the mouse pressed down
    e.preventDefault(); 

    const [currentX, currentY] = getPosition(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    [lastX, lastY] = [currentX, currentY];
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    saveState(); 
}

if (canvas) {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', () => { if (isDrawing) stopDrawing(); });

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
}

const undoBtn = document.getElementById('undo-canvas');
if (undoBtn) {
    undoBtn.addEventListener('click', () => {
        if (history.length > 1) {
            history.pop(); 
            let img = new Image();
            img.src = history[history.length - 1];
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                localStorage.setItem('userDoodle', history[history.length - 1]);
            };
        } else if (history.length === 1) {
            history.pop();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            localStorage.removeItem('userDoodle');
        }
    });
}

const clearBtn = document.getElementById('clear-canvas');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        history = []; 
        localStorage.removeItem('userDoodle');
        localStorage.removeItem('doodleWidth');
        localStorage.removeItem('doodleHeight');
    });
}

function setupStickerDragging() {
    const stickers = document.querySelectorAll('.sticker');
    
    stickers.forEach((sticker, index) => {
        sticker.style.position = 'absolute';
        
        if (!sticker.style.left || sticker.style.left === '') {
            sticker.style.left = `${100 + (index * 120)}px`;
        }
        if (!sticker.style.top || sticker.style.top === '') {
            sticker.style.top = `${150 + (index * 50)}px`;
        }

        sticker.style.touchAction = 'none';
        sticker.style.userSelect = 'none';

        if (sticker.dataset.dragInitialized === 'true') return;
        sticker.dataset.dragInitialized = 'true';

        let clickOffsetX = 0;
        let clickOffsetY = 0;

        sticker.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            sticker.setPointerCapture(event.pointerId);
            sticker.classList.add('dragging');

            const rect = sticker.getBoundingClientRect();
            clickOffsetX = event.clientX - rect.left;
            clickOffsetY = event.clientY - rect.top;

            const moveHandler = (moveEvent) => {
                const parentRect = sticker.offsetParent?.getBoundingClientRect() || { left: 0, top: 0 };
                const currentX = moveEvent.clientX - clickOffsetX - parentRect.left;
                const currentY = moveEvent.clientY - clickOffsetY - parentRect.top;
                
                sticker.style.left = `${currentX}px`;
                sticker.style.top = `${currentY}px`;
            };

            const endHandler = (upEvent) => {
                sticker.classList.remove('dragging');
                try {
                    sticker.releasePointerCapture(upEvent.pointerId);
                } catch (e) {}
                
                window.removeEventListener('pointermove', moveHandler);
                window.removeEventListener('pointerup', endHandler);
                window.removeEventListener('pointercancel', endHandler);
            };

            window.addEventListener('pointermove', moveHandler);
            window.addEventListener('pointerup', endHandler);
            window.addEventListener('pointercancel', endHandler);
        });
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupStickerDragging);
} else {
    setupStickerDragging();
}

function launchHug(btn) {
    const rect = btn.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const endX = window.innerWidth + 120;
    const endY = centerY;

    const hug = document.createElement('div');
    hug.className = 'flying-hug';
    hug.innerHTML = `
        <svg viewBox="0 0 32 29" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 29 C16 29 0 18.5 0 8.8 C0 3.4 4 0 8.3 0 C11.4 0 14 1.7 16 4.6 C18 1.7 20.6 0 23.7 0 C28 0 32 3.4 32 8.8 C32 18.5 16 29 16 29 Z" fill="#be0b0b"/>
        </svg>
    `;
    hug.style.left = startX + 'px';
    hug.style.top = startY + 'px';
    hug.style.setProperty('--mid-x', (centerX - startX) + 'px');
    hug.style.setProperty('--mid-y', (centerY - startY) + 'px');
    hug.style.setProperty('--end-x', (endX - startX) + 'px');
    hug.style.setProperty('--end-y', (endY - startY) + 'px');

    document.body.appendChild(hug);

    setTimeout(() => {
        hug.style.zIndex = '10001';
    }, 280); 

    hug.addEventListener('animationend', () => hug.remove());
}

function clickedBox(element) {} 

function toggleBox(boxElement) {
    boxElement.classList.toggle('expanded');
}

document.addEventListener("DOMContentLoaded", () => {
    const targets = document.querySelectorAll('.partner-box h3, .partner-content, .partner-content p, .partner-content li');
    
    targets.forEach(el => {
        function wrapWords(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const words = node.textContent.split(/(\s+)/); 
                const fragment = document.createDocumentFragment();
                
                words.forEach(word => {
                    if (word.trim() === "") {
                        fragment.appendChild(document.createTextNode(word));
                    } else {
                        const span = document.createElement('span');
                        span.textContent = word;
                        fragment.appendChild(span);
                    }
                });
                node.replaceWith(fragment);
            } else {
                node.childNodes.forEach(child => wrapWords(child));
            }
        }
        
        el.childNodes.forEach(child => wrapWords(child));
    });
});

window.addEventListener('DOMContentLoaded', (event) => {
    var audio = document.getElementById('bg-music');
    if(audio) audio.volume = 0.1;

    var frame = document.querySelector('.profile-photo-frame');
    var overlay = document.querySelector('.magic-pulse-overlay');

    if(frame && overlay) {
        const triggerPulse = (x, y) => {
            overlay.style.setProperty('--pulse-x', `${x}px`);
            overlay.style.setProperty('--pulse-y', `${y}px`);
            overlay.classList.remove('active');
            void overlay.offsetWidth;
            overlay.classList.add('active');
            window.setTimeout(() => overlay.classList.remove('active'), 900);
        };

        frame.addEventListener('click', (event) => {
            const x = event.clientX || window.innerWidth / 2;
            const y = event.clientY || window.innerHeight / 2;
            triggerPulse(x, y);
        });

        frame.addEventListener('keydown', (event) => {
            if(event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const rect = frame.getBoundingClientRect();
                triggerPulse(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        });
    }

    var expandablePhotos = document.querySelectorAll('.polaroid-card, .mini-photo-slot');
    expandablePhotos.forEach((item) => {
        item.addEventListener('click', () => {
            item.classList.toggle('photo-expanded');
        });
    });
});

function launchIncomingHug() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const startX = window.innerWidth + 120; // starts just off the right edge
    const startY = centerY;

    const hug = document.createElement('div');
    hug.className = 'flying-hug-incoming';
    hug.innerHTML = `
        <svg viewBox="0 0 32 29" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 29 C16 29 0 18.5 0 8.8 C0 3.4 4 0 8.3 0 C11.4 0 14 1.7 16 4.6 C18 1.7 20.6 0 23.7 0 C28 0 32 3.4 32 8.8 C32 18.5 16 29 16 29 Z" fill="#be0b0b"/>
        </svg>
    `;
    hug.style.left = startX + 'px';
    hug.style.top = startY + 'px';
    hug.style.setProperty('--center-x', (centerX - startX) + 'px');
    hug.style.setProperty('--center-y', (centerY - startY) + 'px');

    document.body.appendChild(hug);
    hug.addEventListener('animationend', () => hug.remove());
}