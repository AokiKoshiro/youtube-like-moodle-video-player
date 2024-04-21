if (sessionStorage.getItem('isVideoTransition') === 'true') {
    Eviry.Player.ready(player => {
        const playbackRate = sessionStorage.getItem('playbackRate') || 1;
        player.setPlaybackRate(playbackRate);
        sessionStorage.setItem('isVideoTransition', 'false');
    });
}

function adjustSpeed(video, increment) {
    const newRate = Math.max(0.6, Math.min(video.playbackRate + increment, 2));
    const player = Eviry.Player.getPlayer();
    player.setPlaybackRate(newRate);
}

document.addEventListener('keydown', event => {
    const video = document.querySelector('video');
    const focusElement = document.activeElement;
    const tagName = focusElement.tagName.toLowerCase();

    if (['input', 'textarea'].includes(tagName) || focusElement.isContentEditable) {
        return;
    }
    
    if (event.key === '>') {
        adjustSpeed(video, 0.2);
    } else if (event.key === '<') {
        adjustSpeed(video, -0.2);
    }
});
