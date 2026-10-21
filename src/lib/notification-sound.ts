const MUTE_KEY = 'pconnect.notificationSound.muted';
const SOUND_SRC = '/sounds/notification.mp3';

let unlocked = false;
let audioElement: HTMLAudioElement | null = null;

function getAudioElement() {
  if (typeof window === 'undefined') return null;
  if (!audioElement) {
    audioElement = new Audio(SOUND_SRC);
    audioElement.preload = 'auto';
    audioElement.volume = 0.7;
  }
  return audioElement;
}

export function isNotificationSoundMuted() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(MUTE_KEY) === '1';
}

export function setNotificationSoundMuted(muted: boolean) {
  window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

export function unlockNotificationSound() {
  if (typeof window === 'undefined') return;
  unlocked = true;
  const audio = getAudioElement();
  if (!audio) return;

  // Browser autoplay policy: unlock with a silent play/pause on first gesture.
  const previousVolume = audio.volume;
  audio.volume = 0;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = previousVolume;
    })
    .catch(() => {
      audio.volume = previousVolume;
    });
}

export function playNotificationSound() {
  if (!unlocked || isNotificationSoundMuted()) return;
  const audio = getAudioElement();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  } catch {
    // Ignore playback failures (tab muted, missing file, etc.).
  }
}

export function shouldPlayForNotification(notification: {
  type: string;
  linkUrl?: string | null;
}) {
  if (typeof window === 'undefined') return true;
  if (notification.type !== 'message.new' || !notification.linkUrl) return true;
  try {
    const link = new URL(notification.linkUrl, window.location.origin);
    const current = new URL(window.location.href);
    if (link.pathname !== current.pathname) return true;
    const channel = link.searchParams.get('channel');
    return !channel || channel !== current.searchParams.get('channel');
  } catch {
    return true;
  }
}
