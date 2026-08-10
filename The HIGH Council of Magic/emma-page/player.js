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
