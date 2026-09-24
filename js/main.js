const player = document.querySelector('.demo-reel__player');
const reel = document.querySelector('.demo-reel__video');
const playButton = document.querySelector('.demo-reel__play');
const soundButton = document.querySelector('.demo-reel__sound');
const fullscreenButton = document.querySelector('.demo-reel__fullscreen');
const timeline = document.querySelector('.demo-reel__timeline');
const currentLabel = document.querySelector('.demo-reel__current');
const durationLabel = document.querySelector('.demo-reel__duration');
const statusRegion = document.querySelector('[data-reel-status]');

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

if (reel) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let userPaused = false;
  let isSeeking = false;

  const announce = (message) => {
    statusRegion.textContent = message;
  };

  const updateProgress = () => {
    const progress = reel.duration ? (reel.currentTime / reel.duration) * 100 : 0;
    const current = formatTime(reel.currentTime);
    timeline.style.setProperty('--progress', `${progress}%`);
    timeline.setAttribute('aria-valuetext', `${current} of ${formatTime(reel.duration || 0)}`);
    currentLabel.textContent = current;
  };

  const onMetadata = () => {
    timeline.max = reel.duration;
    durationLabel.textContent = formatTime(reel.duration);
    updateProgress();
  };

  const play = () => {
    userPaused = false;
    reel.play().catch(() => {});
  };

  const togglePlay = () => {
    if (reel.paused) {
      play();
    } else {
      userPaused = true;
      reel.pause();
    }
  };

  const toggleMute = () => {
    reel.muted = !reel.muted;
    soundButton.setAttribute('aria-pressed', String(!reel.muted));
    announce(reel.muted ? 'Sound off' : 'Sound on');
    if (!reel.muted) play();
  };

  const seekTo = (seconds) => {
    if (!reel.duration) return;
    reel.currentTime = Math.min(Math.max(seconds, 0), reel.duration);
    timeline.value = reel.currentTime;
    updateProgress();
    announce(formatTime(reel.currentTime));
  };

  const isFullscreen = () => document.fullscreenElement === player || document.webkitFullscreenElement === player;

  const toggleFullscreen = () => {
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (player.requestFullscreen) {
      player.requestFullscreen().catch(() => {});
    } else if (player.webkitRequestFullscreen) {
      player.webkitRequestFullscreen();
    } else if (reel.webkitEnterFullscreen) {
      reel.webkitEnterFullscreen();
    }
  };

  const onFullscreenChange = () => {
    const active = isFullscreen();
    fullscreenButton.dataset.fullscreen = String(active);
    const label = active ? 'Exit fullscreen (F)' : 'Fullscreen (F)';
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.title = label;
  };

  if (reel.readyState >= 1) onMetadata();
  reel.addEventListener('loadedmetadata', onMetadata);

  reel.addEventListener('timeupdate', () => {
    if (isSeeking) return;
    timeline.value = reel.currentTime;
    updateProgress();
  });

  reel.addEventListener('play', () => {
    playButton.dataset.playing = 'true';
    playButton.setAttribute('aria-label', 'Pause (K)');
    playButton.title = 'Pause (K)';
  });

  reel.addEventListener('pause', () => {
    playButton.dataset.playing = 'false';
    playButton.setAttribute('aria-label', 'Play (K)');
    playButton.title = 'Play (K)';
  });

  reel.addEventListener('click', togglePlay);
  playButton.addEventListener('click', () => {
    togglePlay();
    announce(reel.paused ? 'Paused' : 'Playing');
  });
  soundButton.addEventListener('click', toggleMute);
  fullscreenButton.addEventListener('click', toggleFullscreen);

  timeline.addEventListener('input', () => {
    isSeeking = true;
    reel.currentTime = Number(timeline.value);
    updateProgress();
  });

  timeline.addEventListener('change', () => { isSeeking = false; });

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  player.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const onButton = event.target.closest('button');
    if (onButton && (event.key === ' ' || event.key === 'Enter')) return;

    const key = event.key.toLowerCase();
    let handled = true;

    if (key === ' ' || key === 'k') {
      togglePlay();
      announce(reel.paused ? 'Paused' : 'Playing');
    } else if (key === 'm') {
      toggleMute();
    } else if (key === 'f') {
      toggleFullscreen();
    } else if (key === 'arrowleft') {
      seekTo(reel.currentTime - 5);
    } else if (key === 'arrowright') {
      seekTo(reel.currentTime + 5);
    } else if (key === 'j') {
      seekTo(reel.currentTime - 10);
    } else if (key === 'l') {
      seekTo(reel.currentTime + 10);
    } else if (key === 'home') {
      seekTo(0);
    } else if (key === 'end') {
      seekTo(reel.duration);
    } else if (/^[0-9]$/.test(key)) {
      seekTo((reel.duration * Number(key)) / 10);
    } else {
      handled = false;
    }

    if (handled) event.preventDefault();
  });

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) {
      if (!isFullscreen()) reel.pause();
    } else if (!userPaused && (!reduceMotion || !reel.muted)) {
      reel.play().catch(() => {});
    }
  }, { threshold: 0.25 });

  observer.observe(reel);
}
