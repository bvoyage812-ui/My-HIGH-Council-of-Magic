const audioPlayer = document.getElementById('audio-player');
const trackName = document.getElementById('track-name');
const trackTitleText = document.getElementById('track-title-text');
const trackCount = document.getElementById('track-count');
const previousButton = document.getElementById('previous-track');
const playButton = document.getElementById('toggle-play');
const nextButton = document.getElementById('next-track');
const coverArt = document.getElementById('cover-art');
const coverFallback = document.getElementById('cover-fallback');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

const tracks = Array.isArray(window.SONG_CATALOG)
    ? window.SONG_CATALOG
    : [];

let currentTrackIndex = 0;
let autoplayWasBlocked = false;
let trackTitleAnimation = null;

audioPlayer.volume = 0.05;

function showCover(url) {
    if (url) {
        coverArt.src = url;
        coverArt.hidden = false;
        coverFallback.hidden = true;
    } else {
        coverArt.removeAttribute('src');
        coverArt.hidden = true;
        coverFallback.hidden = false;
    }
}

function updateTrackOverflow() {
    if (trackTitleAnimation) {
        trackTitleAnimation.cancel();
        trackTitleAnimation = null;
    }

    trackTitleText.style.transform = 'translateX(0)';
    const overflowDistance = trackTitleText.offsetWidth - trackName.clientWidth;

    if (overflowDistance > 2) {
        const duration = Math.min(22000, Math.max(10000, overflowDistance * 24 + 8000));
        trackTitleAnimation = trackTitleText.animate(
            [
                { transform: 'translateX(0)', offset: 0 },
                { transform: 'translateX(0)', offset: 0.12 },
                { transform: `translateX(-${overflowDistance}px)`, offset: 0.42 },
                { transform: `translateX(-${overflowDistance}px)`, offset: 0.58 },
                { transform: 'translateX(0)', offset: 0.88 },
                { transform: 'translateX(0)', offset: 1 }
            ],
            {
                duration,
                easing: 'ease-in-out',
                iterations: Infinity
            }
        );
    }
}

function setTrackTitle(title) {
    trackTitleText.textContent = title;
    requestAnimationFrame(updateTrackOverflow);
}

function loadTrack(index) {
    currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];

    audioPlayer.src = track.file;
    setTrackTitle(track.title);
    trackCount.textContent = `${currentTrackIndex + 1} / ${tracks.length}`;
    showCover(track.cover);
}

async function playCurrentTrack() {
    try {
        await audioPlayer.play();
        autoplayWasBlocked = false;
        playButton.removeAttribute('title');
        document.removeEventListener('pointerdown', resumeAfterInteraction);
        document.removeEventListener('keydown', resumeAfterInteraction);
    } catch (error) {
        autoplayWasBlocked = true;
        playButton.title = 'Press play to begin';
        document.addEventListener('pointerdown', resumeAfterInteraction);
        document.addEventListener('keydown', resumeAfterInteraction);
    }
}

function resumeAfterInteraction(event) {
    const interactiveElement = event.target.closest?.('button, input, a');
    if (!autoplayWasBlocked || interactiveElement) {
        return;
    }

    playCurrentTrack();
}

function changeTrack(step) {
    const wasPlaying = !audioPlayer.paused;
    loadTrack(currentTrackIndex + step);

    if (wasPlaying) {
        playCurrentTrack();
    }
}

previousButton.addEventListener('click', () => changeTrack(-1));
nextButton.addEventListener('click', () => changeTrack(1));

volumeSlider.addEventListener('input', () => {
    const volume = Number(volumeSlider.value);
    audioPlayer.volume = volume;
    volumeValue.textContent = `${Math.round(volume * 100)}%`;
});

playButton.addEventListener('click', () => {
    if (audioPlayer.paused) {
        playCurrentTrack();
    } else {
        audioPlayer.pause();
    }
});

audioPlayer.addEventListener('play', () => {
    playButton.innerHTML = '&#10074;&#10074;';
    playButton.setAttribute('aria-label', 'Pause');
});

audioPlayer.addEventListener('pause', () => {
    playButton.innerHTML = '&#9654;';
    playButton.setAttribute('aria-label', 'Play');
});

audioPlayer.addEventListener('ended', () => {
    loadTrack(currentTrackIndex + 1);
    playCurrentTrack();
});

coverArt.addEventListener('error', () => showCover(null));

if (tracks.length === 0) {
    setTrackTitle('No songs found');
} else {
    previousButton.disabled = false;
    playButton.disabled = false;
    nextButton.disabled = false;
    loadTrack(0);
    playCurrentTrack();
}

if ('ResizeObserver' in window) {
    new ResizeObserver(updateTrackOverflow).observe(trackName);
} else {
    window.addEventListener('resize', updateTrackOverflow);
}

function launchHug(btn) {
    const rect = btn.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const endX = -120;
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
function launchIncomingHug() {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const startX = -120; // starts just off the right edge
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
