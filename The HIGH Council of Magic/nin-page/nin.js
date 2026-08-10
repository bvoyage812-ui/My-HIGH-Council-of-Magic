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

            brushSlider.addEventListener('input', (e) => {
                currentLineWidth = e.target.value;
                brushSizeVal.textContent = currentLineWidth + 'px';
                ctx.lineWidth = currentLineWidth;
            });

            function getCanvasImage(callback) {
                const dataURL = canvas.toDataURL();
                if (canvas.width === 0 || canvas.height === 0) {
                    callback(null);
                    return;
                }
                let img = new Image();
                img.src = dataURL;
                img.onload = () => callback(img);
                img.onerror = () => callback(null);
            }

            function resizeCanvas() {
                getCanvasImage((oldImg) => {
                    const rect = container.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return;

                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    
                    ctx.strokeStyle = '#2e7d32'; // Garden dark-green ink tint
                    ctx.lineWidth = currentLineWidth; 
                    ctx.lineCap = 'round';      
                    ctx.lineJoin = 'round';

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    if (oldImg && oldImg.width > 0) {
                        ctx.drawImage(oldImg, 0, 0, oldImg.width, oldImg.height, 0, 0, canvas.width, canvas.height);
                    } else {
                        const saved = localStorage.getItem('userDoodle');
                        if (saved) {
                            let savedImg = new Image();
                            savedImg.src = saved;
                            savedImg.onload = () => {
                                ctx.drawImage(savedImg, 0, 0, canvas.width, canvas.height);
                            };
                        }
                    }
                });
            }

            let resizeTimer;
            const resizeObserver = new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(resizeCanvas, 50);
            });
            resizeObserver.observe(container);

            window.addEventListener('load', () => {
                const saved = localStorage.getItem('userDoodle');
                if (saved) {
                    let img = new Image();
                    img.src = saved;
                    img.onload = () => {
                        const rect = container.getBoundingClientRect();
                        canvas.width = rect.width;
                        canvas.height = rect.height;
                        ctx.strokeStyle = '#2e7d32'; 
                        ctx.lineWidth = currentLineWidth;          
                        ctx.lineCap = 'round';      
                        ctx.lineJoin = 'round';
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        history.push(saved);
                    };
                } else {
                    resizeCanvas();
                }
            });

            function saveState() {
                const dataURL = canvas.toDataURL();
                history.push(dataURL);
                localStorage.setItem('userDoodle', dataURL);
            }

            function getPosition(e) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;

                const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
                const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

                return [
                    (clientX - rect.left) * scaleX,
                    (clientY - rect.top) * scaleY
                ];
            }

            function startDrawing(e) {
                isDrawing = true;
                [lastX, lastY] = getPosition(e);
            }

            function draw(e) {
                if (!isDrawing) return;
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

            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseleave', () => { if (isDrawing) stopDrawing(); });

            canvas.addEventListener('touchstart', startDrawing);
            canvas.addEventListener('touchmove', draw);
            canvas.addEventListener('touchend', stopDrawing);

            document.getElementById('undo-canvas').addEventListener('click', () => {
                if (history.length > 1) {
                    history.pop(); 
                    let img = new Image();
                    img.src = history[history.length - 1];
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        localStorage.setItem('userDoodle', history[history.length - 1]);
                    };
                } else if (history.length === 1) {
                    history.pop();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    localStorage.removeItem('userDoodle');
                }
            });

            document.getElementById('clear-canvas').addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                history = []; 
                localStorage.removeItem('userDoodle');
            });

         function setupStickerDragging() {
    const stickers = document.querySelectorAll('.sticker');
    
    stickers.forEach((sticker, index) => {
        // Ensure absolute positioning and initial coordinates
        sticker.style.position = 'absolute';
        
        if (!sticker.style.left || sticker.style.left === '') {
            sticker.style.left = `${100 + (index * 120)}px`;
        }
        if (!sticker.style.top || sticker.style.top === '') {
            sticker.style.top = `${150 + (index * 50)}px`;
        }

        sticker.style.touchAction = 'none';
        sticker.style.userSelect = 'none';

        // Prevent duplicate event binding by checking a custom flag
        if (sticker.dataset.dragInitialized === 'true') return;
        sticker.dataset.dragInitialized = 'true';

        let clickOffsetX = 0;
        let clickOffsetY = 0;

        sticker.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            sticker.setPointerCapture(event.pointerId);
            sticker.classList.add('dragging');

            // Calculate exact grab offset from the top-left of the sticker
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
var hugBtn = document.getElementById('hug-btn');
var hugCountEl = document.getElementById('hug-count');
var hugCount = 0;

if (hugBtn && hugCountEl) {
    hugBtn.addEventListener('click', () => {
        hugCount++;
        hugCountEl.textContent = hugCount;
        launchHug(hugBtn);
    });
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

    // Rises above the button once it's on its way out
    setTimeout(() => {
        hug.style.zIndex = '10001';
    }, 280); // roughly matches the 18% mark of the 1.6s animation

    hug.addEventListener('animationend', () => hug.remove());
}

function clickedBox(element) {} // placeholder safety

function toggleBox(boxElement) {
    // Optional: Close other boxes when clicking a new one, or leave open. 
    // This code toggles only the clicked box:
    boxElement.classList.toggle('expanded');
}
document.addEventListener("DOMContentLoaded", () => {
    // Automatically wrap words for titles and descriptions
    const targets = document.querySelectorAll('.partner-box h3, .partner-content');
    
    targets.forEach(el => {
        // Keeps line breaks (<br>) intact while splitting text into words
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(el.innerHTML, 'text/html');
        
        // Helper recursive function to wrap text nodes word-by-word
        function wrapWords(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const words = node.textContent.split(/(\s+)/); // Keeps spaces intact
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


// Profile photo pulse effect
 window.addEventListener('DOMContentLoaded', (event) => {
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

            // Inline photo expand (replaces old full-screen preview modal)
            var expandablePhotos = document.querySelectorAll('.polaroid-card, .mini-photo-slot');
            expandablePhotos.forEach((item) => {
                item.addEventListener('click', () => {
                    item.classList.toggle('photo-expanded');
                });
            });
        });
        //highlights every word
        document.addEventListener("DOMContentLoaded", () => {
    const targets = document.querySelectorAll('.partner-box h3, .partner-content p, .partner-content li');
    
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
