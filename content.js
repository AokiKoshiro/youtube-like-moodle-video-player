async function isUrlValid(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

function getNextVideoUrl(step = 1) {
    const url = new URL(window.location);
    const id = Number(url.searchParams.get('id'));
    url.searchParams.set('id', id + step);
    return url.href;
}

async function moveToVideo(step = 1) {
    const url = getNextVideoUrl(step);
    if (await isUrlValid(url)) {
        sessionStorage.setItem('isVideoTransition', 'true');
        window.location.href = url;
    }
}

function autoPlayVideo() {
    const video = document.querySelector('video');
    video.play().catch(() => {});
    video.addEventListener('ended', () => {
        const autoplayButton = document.querySelector('.btn-autoplay');
        const checked = autoplayButton.getAttribute('aria-checked') === 'true';
        if (checked) {
            moveToVideo();
        }
    });
}

function toggleAutoPlay() {
    const autoplayButton = document.querySelector('.btn-autoplay');
    const checked = autoplayButton.getAttribute('aria-checked') === 'true';
    autoplayButton.setAttribute('aria-checked', checked ? 'false' : 'true');
}

function createButton(className, onClick) {
    const button = document.createElement('div');
    button.className = className;
    button.onclick = onClick;
    return button;
}

async function setupButtonVisibility(button, direction) {
    if (!await isUrlValid(getNextVideoUrl(direction))) {
        button.style.display = 'none';
    }
}

function setupButtonImage(imageName) {
    const imageUri = chrome.runtime.getURL(`images/${imageName}.png`);
    document.documentElement.style.setProperty(`--image-${imageName.replace('_', '-')}`, `url(${imageUri})`);
}

function initializePlayerButtons() {
    const player = document.querySelector('.html5-player-wrap');
    const autoplayButton = createButton('btn-autoplay miovip-btn', () => toggleAutoPlay());
    player.appendChild(autoplayButton);

    const playButton = document.querySelector('.btn-play');
    const nextButton = createButton('btn-next miovip-btn', () => moveToVideo());
    const previousButton = createButton('btn-previous miovip-btn', () => moveToVideo(-1));
    playButton.parentNode.insertBefore(previousButton, playButton);
    playButton.parentNode.insertBefore(nextButton, playButton.nextSibling);
    setupButtonVisibility(previousButton, -1);
    setupButtonVisibility(nextButton, 1);

    const imageNames = ['autoplay_on', 'autoplay_off', 'next_button', 'previous_button'];
    imageNames.forEach(setupButtonImage);
}

function createNotificationElement(video) {
    let notificationElement = document.querySelector('.video-notification');
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.className = 'video-notification';
        video.parentNode.appendChild(notificationElement);
    }
    return notificationElement;
}

function showNotification(video, message) {
    const notificationElement = createNotificationElement(video);
    notificationElement.textContent = message;
    notificationElement.style.opacity = '1';
    setTimeout(() => {
        notificationElement.style.opacity = '0';
    }, 500);
}

function toggleMute(video) {
    video.muted = !video.muted;
    showNotification(video, video.muted ? 'Muted' : 'Unmuted');
}

function adjustPlayback(video, time, message) {
    video.currentTime += time;
    showNotification(video, message);
}

function adjustSpeed(video, increment) {
    const newRate = Math.max(0.6, Math.min(video.playbackRate + increment, 2));
    showNotification(video, `${newRate.toFixed(1)}x`);
}

function adjustVolume(video, increment) {
    const newVolume = Math.max(0, Math.min(video.volume + increment, 1));
    video.volume = newVolume;
    showNotification(video, `${Math.round(newVolume * 100)}%`);
}

function togglePictureInPicture(video) {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else {
        video.requestPictureInPicture();
    }
}

function handleKeyboardShortcuts(event) {
    const video = document.querySelector('video');
    const focusElement = document.activeElement;
    const tagName = focusElement.tagName.toLowerCase();

    if (['input', 'textarea'].includes(tagName) || focusElement.isContentEditable) {
        return;
    }

    const keyActionMap = {
        ' ': () => video.paused ? video.play() : video.pause(),
        'k': () => video.paused ? video.play() : video.pause(),
        'm': () => toggleMute(video),
        'MediaPlayPause': () => video.paused ? video.play() : video.pause(),
        'MediaStop': () => video.pause(),
        'MediaTrackPrevious': () => moveToVideo(-1),
        'MediaTrackNext': () => moveToVideo(),
        'ArrowLeft': () => adjustPlayback(video, -5, '5s◀◀'),
        'ArrowRight': () => adjustPlayback(video, 5, '▶▶5s'),
        'j': () => adjustPlayback(video, -10, '10s◀◀'),
        'l': () => adjustPlayback(video, 10, '▶▶10s'),
        '.': () => { if (video.paused) video.currentTime += 1 / 30; },
        ',': () => { if (video.paused) video.currentTime -= 1 / 30; },
        '>': () => adjustSpeed(video, 0.2),
        '<': () => adjustSpeed(video, -0.2),
        'Home': () => video.currentTime = 0,
        'End': () => video.currentTime = video.duration,
        'ArrowUp': () => adjustVolume(video, 0.05),
        'ArrowDown': () => adjustVolume(video, -0.05),
        'f': () => document.querySelector('.btn-fullscreen').click(),
        'i': () => togglePictureInPicture(video),
    };

    if (keyActionMap[event.key]) {
        keyActionMap[event.key]();
        event.preventDefault();
    } else if (event.shiftKey && (event.key === 'N' || event.key === 'P')) {
        moveToVideo(event.key === 'N' ? 1 : -1);
        event.preventDefault();
    } else if (!isNaN(parseInt(event.key, 10))) {
        video.currentTime = video.duration * parseInt(event.key, 10) / 10;
        event.preventDefault();
    }
}

function applySettings() {
    const video = document.querySelector('video');
    const autoplayButton = document.querySelector('.btn-autoplay');
    const settings = {
        volume: sessionStorage.getItem('volume') || 1,
        muted: sessionStorage.getItem('muted') === 'true',
        autoplay: sessionStorage.getItem('autoplay') === 'true',
    };
    autoplayButton.setAttribute('aria-checked', settings.autoplay ? 'true' : 'false');
    if (sessionStorage.getItem('isVideoTransition') === 'true') {
        video.volume = settings.volume;
        video.muted = settings.muted;
    }

    video.addEventListener('volumechange', () => sessionStorage.setItem('volume', video.volume));
    video.addEventListener('ratechange', () => {
        if (!video.paused) {
            sessionStorage.setItem('playbackRate', video.playbackRate);
        }
    });
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('muted', video.muted);
        sessionStorage.setItem('autoplay', autoplayButton.getAttribute('aria-checked') === 'true');
    });
}

window.addEventListener('load', () => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = chrome.runtime.getURL('speed.js');
    document.head.appendChild(script);
    initializePlayerButtons();
    autoPlayVideo();
    applySettings();
});
document.addEventListener('dblclick', event => {
    if (event.target.tagName.toLowerCase() === 'video') {
        document.querySelector('.btn-fullscreen').click();
    }
});
document.addEventListener('keydown', handleKeyboardShortcuts);
