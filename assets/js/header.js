const GA_MEASUREMENT_ID = 'G-7FLYS8Y9BB';

const ensureAnalytics = () => {
  if (!GA_MEASUREMENT_ID) return;
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
    return;
  }
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(gtagScript);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
};

ensureAnalytics();

let header = document.getElementById('site-header');

const resolveBasePath = () => {
  const path = window.location.pathname.replace(/\\/g, '/');
  const marker = '/pages/';
  const index = path.toLowerCase().indexOf(marker);
  if (index !== -1) {
    return path.slice(0, index + 1);
  }
  return path.replace(/\/[^\/]*$/, '/');
};

const BASE = window.CC_BASE || (() => {
  const basePath = resolveBasePath();
  const baseUrl = new URL(basePath, window.location.href);
  return {
    path: basePath,
    url: baseUrl,
    resolve: (value) => resolveWithBase(value, baseUrl)
  };
})();

if (!window.CC_BASE) {
  window.CC_BASE = BASE;
}

const normalizeHrefPath = (href) => {
  if (!href || href.startsWith('#')) return '';
  try {
    const url = href.startsWith('http') || href.startsWith('file:')
      ? new URL(href)
      : new URL(href, BASE.url);
    return url.pathname.replace(/\/index\.html$/, '/');
  } catch (error) {
    return href.replace(/\/index\.html$/, '/');
  }
};

const resolveWithBaseHref = (href, baseUrl = BASE.url) => {
  if (!href) return href;
  if (href.startsWith('#') || /^https?:\/\//i.test(href) || href.startsWith('file:')) return href;
  const trimmed = href.startsWith('/') ? href.slice(1) : href.replace(/^\.\//, '');
  return new URL(trimmed, baseUrl).toString();
};

const AUDIO_ENABLED = false;

const getVersion = () => window.CC_VERSION || '00.00.000';
const getLastDraw = () => String(window.CC_LAST_DRAW || '').trim();
const getVersionDisplay = () => {
  const base = getVersion();
  const draw = getLastDraw();
  return draw ? `${base}.${draw}` : base;
};
const VERSION = getVersionDisplay();

const fetchLatestDrawHeader = async () => {
  try {
    const response = await fetch(resolveWithBaseHref('archives/draws/draws.csv'), { cache: 'no-store' });
    if (!response.ok) return '';
    const raw = await response.text();
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
    if (!lines.length) return '';
    const lastLine = lines[lines.length - 1];
    const delimiter = lastLine.includes(';') ? ';' : ',';
    const parts = lastLine.split(delimiter).map((cell) => cell.trim());
    return parts[0] || '';
  } catch (error) {
    return '';
  }
};

const buildHeaderMarkup = () => `
  <header id="site-header" class="sticky top-0 z-50 relative border-b border-white/10 backdrop-blur-sm">
    <div class="header-bg absolute inset-0 opacity-0"></div>
    <div class="header-overlay absolute inset-0 bg-gradient-to-br from-midnight/80 via-midnight/60 to-midnight/40"></div>
    <div class="standing-marquee relative z-10 w-full px-6 py-2 text-xs uppercase tracking-[0.3em] text-ash">
      <div class="standing-marquee__track">
        <span>Il traffico sostiene il progetto con banner trasparenti; i dati sono curati manualmente e le previsioni restano sempre ipotesi. Nessuna promessa di vincita.</span>
        <span>Il traffico sostiene il progetto con banner trasparenti; i dati sono curati manualmente e le previsioni restano sempre ipotesi. Nessuna promessa di vincita.</span>
      </div>
    </div>
    <div class="header-container relative mx-auto w-[calc(100%-2rem)] max-w-[60rem] px-12 py-20">
      <div class="header-wrap rounded-3xl border border-white/15 bg-gradient-to-br from-midnight/90 via-midnight/80 to-neon/10 px-6 py-8 shadow-glow backdrop-blur-sm">
        <div class="header-topline">
          <p class="text-xs uppercase tracking-[0.35em] text-neon">SuperEnalotto Control Chaos</p>
          <span class="header-version" aria-label="Versione">${VERSION}</span>
        </div>
        <h1 class="header-title mt-4 text-3xl sm:text-5xl font-semibold drop-shadow-[0_0_14px_rgba(255,217,102,0.35)]">Statistiche e algoritmi per dominare il caos del <span class="superenalotto-mark" aria-label="Super-Enalotto"><span class="super-word">S<span class="super-u">u</span>per</span><span class="super-dash">-</span><span class="enalotto-word">Enalotto</span></span></h1>
        <div class="header-actions mt-10 flex flex-wrap items-center justify-between gap-4">
          <div class="header-actions__left flex flex-wrap items-center gap-4">
            <a class="home-badge home-badge--pentagon bg-neon/10 px-6 py-3 font-semibold text-neon transition hover:-translate-y-1 hover:bg-neon/20 hover:shadow-[0_0_22px_rgba(255,217,102,0.45)]" href="${resolveWithBaseHref('index.html')}#top" aria-label="Home" data-tooltip="HOME PAGE"></a>
            <a class="home-badge home-badge--icon bg-neon/10 px-6 py-3 font-semibold text-neon transition hover:-translate-y-1 hover:bg-neon/20 hover:shadow-[0_0_22px_rgba(255,217,102,0.45)]" href="${resolveWithBaseHref('pages/storico-estrazioni/')}" aria-label="Storico estrazioni" data-tooltip="Storico estrazioni">
              <svg class="home-badge__icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="icon-fill" cx="5" cy="6" r="2"></circle>
                <circle class="icon-fill" cx="12" cy="12" r="2"></circle>
                <circle class="icon-fill" cx="19" cy="18" r="2"></circle>
                <path d="M7 6h4m3 6h4" stroke-linecap="round"></path>
                <path d="M7 6l3 6 3 6" stroke-linecap="round"></path>
              </svg>
            </a>
            <a class="home-badge home-badge--icon bg-neon/10 px-6 py-3 font-semibold text-neon transition hover:-translate-y-1 hover:bg-neon/20 hover:shadow-[0_0_22px_rgba(255,217,102,0.45)]" href="${resolveWithBaseHref('pages/algoritmi/index.html')}" aria-label="Algoritmi" data-tooltip="Algoritmi">
              <svg class="home-badge__icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="6" height="4" rx="1"></rect>
                <rect x="15" y="4" width="6" height="4" rx="1"></rect>
                <rect x="9" y="16" width="6" height="4" rx="1"></rect>
                <path d="M6 8v4h12V8" stroke-linecap="round"></path>
                <path d="M12 12v4" stroke-linecap="round"></path>
              </svg>
            </a>
            <a class="home-badge home-badge--icon bg-neon/10 px-6 py-3 font-semibold text-neon transition hover:-translate-y-1 hover:bg-neon/20 hover:shadow-[0_0_22px_rgba(255,217,102,0.45)]" href="${resolveWithBaseHref('pages/analisi-statistiche/')}" aria-label="Analisi statistiche" data-tooltip="Analisi statistiche">
              <svg class="home-badge__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 18l5-6 4 3 7-9" stroke-linecap="round" stroke-linejoin="round"></path>
                <circle class="icon-fill" cx="9" cy="12" r="1.6"></circle>
                <circle class="icon-fill" cx="13" cy="15" r="1.6"></circle>
                <circle class="icon-fill" cx="20" cy="6" r="1.6"></circle>
              </svg>
            </a>
          </div>
          <div class="header-actions__right">
            <button class="home-badge home-badge--audio bg-neon/10 px-4 py-3 text-neon transition hover:-translate-y-1 hover:bg-neon/20 hover:shadow-[0_0_22px_rgba(255,217,102,0.45)]" type="button" aria-label="Audio" data-tooltip="MUSIC" data-audio-toggle${AUDIO_ENABLED ? '' : ' hidden'}>
              <svg class="audio-icon" viewBox="0 0 32 24" aria-hidden="true">
                <polygon points="3,4 15,12 3,20"></polygon>
                <rect x="18" y="5" width="4" height="14" rx="1"></rect>
                <rect x="25" y="5" width="4" height="14" rx="1"></rect>
              </svg>
              <span class="audio-track" data-audio-track>—</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
`;

if (!header && document.body) {
  document.body.insertAdjacentHTML('afterbegin', buildHeaderMarkup());
  header = document.getElementById('site-header');
}

if (header) {
  const markActiveNav = () => {
    const links = header.querySelectorAll('.home-badge[href]');
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('#')) return;
      const normalized = normalizeHrefPath(href);
      if (!normalized) return;
      const isRoot = normalized === BASE.path || normalized === '/';
      const isActive = isRoot
        ? currentPath === normalized || currentPath === '/index.html'
        : currentPath === normalized || currentPath.startsWith(normalized);
      link.classList.toggle('is-active', isActive);
    });
  };
  markActiveNav();
}

if (header) {
  const main = document.querySelector('main');
  const isHome = document.body && document.body.id === 'top';
  const setHeaderOffsets = () => {
    const container = header.querySelector('.header-container') || header;
    const wrap = header.querySelector('.header-wrap') || container;
    const rect = container.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const safePad = isHome ? 64 : 24;
    const offset = Math.ceil(rect.bottom + safePad);
    document.documentElement.style.setProperty('--fixed-header-offset', `${offset}px`);
    document.documentElement.style.setProperty('--header-fade-height', `${Math.ceil(rect.bottom + 10)}px`);
    document.documentElement.style.setProperty('--col-x', `${Math.max(0, Math.round(wrapRect.left))}px`);
    document.documentElement.style.setProperty('--col-w', `${Math.max(0, Math.round(wrapRect.width))}px`);
    if (main) {
      main.style.paddingTop = `${offset}px`;
    }
  };
  setHeaderOffsets();
  window.addEventListener('load', setHeaderOffsets);
  window.addEventListener('resize', setHeaderOffsets);
}

const syncHeaderVersion = () => {
  const versionEl = document.querySelector('.header-version');
  if (versionEl) {
    versionEl.textContent = getVersionDisplay();
  }
};

const syncHeaderTitleVisibility = () => {
  const titleEl = document.querySelector('#site-header .header-title');
  if (!titleEl) return;
  const size = Number.parseFloat(getComputedStyle(titleEl).fontSize);
  const isTooSmall = Number.isFinite(size) && size < 14;
  titleEl.classList.toggle('is-hidden', isTooSmall);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncHeaderVersion);
  document.addEventListener('DOMContentLoaded', syncHeaderTitleVisibility);
} else {
  syncHeaderVersion();
  syncHeaderTitleVisibility();
}

fetchLatestDrawHeader().then((latestDraw) => {
  if (!latestDraw) return;
  window.CC_LAST_DRAW = latestDraw;
  syncHeaderVersion();
});

const updateAdRails = () => {
  const container = header?.querySelector('.header-container');
  const wrap = header?.querySelector('.header-wrap');
  const title = header?.querySelector('.header-title');
  if (!container && !wrap && !title) return;
  const headerRect = header?.getBoundingClientRect();
  let bottomAd = document.querySelector('[data-bottom-ad]');
  if (!bottomAd) {
    bottomAd = document.querySelector('.bottom-ad') || document.querySelector('.fixed.bottom-4.left-1\\/2');
    if (bottomAd) bottomAd.dataset.bottomAd = 'true';
  }
  const anchorRect = (container || wrap || title).getBoundingClientRect();
  const wrapRect = wrap?.getBoundingClientRect();
  const containerRect = container?.getBoundingClientRect();
  const topSource = wrapRect?.top ?? containerRect?.top ?? headerRect?.top ?? anchorRect.top;
  const top = Math.max(0, topSource);
  const getBottomPad = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--ad-rail-bottom');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 24;
  };
  const bottom = getBottomPad();
  if (bottomAd) {
    const bottomRect = bottomAd.getBoundingClientRect();
    const isHidden = bottomRect.width === 0 || bottomRect.height === 0;
    const bottomLimit = isHidden
      ? Math.max(0, window.innerHeight - bottom)
      : bottomRect.top;
    const trim = 16;
    const height = Math.max(0, bottomLimit - top - trim);
    document.documentElement.style.setProperty('--ad-rail-height', `${height}px`);
  } else {
    const trim = 16;
    const height = Math.max(0, window.innerHeight - top - bottom - trim);
    document.documentElement.style.setProperty('--ad-rail-height', `${height}px`);
  }
  document.documentElement.style.setProperty('--ad-rail-top', `${top}px`);
};

let adRailTicking = false;
const onAdRailScroll = () => {
  if (adRailTicking) return;
  adRailTicking = true;
  window.requestAnimationFrame(() => {
    updateAdRails();
    adRailTicking = false;
  });
};

window.addEventListener('load', updateAdRails);
window.addEventListener('resize', updateAdRails);
window.addEventListener('resize', syncHeaderTitleVisibility);
// Ads stay standing; no scroll listener.

const homeBadges = document.querySelectorAll('.home-badge[data-tooltip]');
let homeTooltip = document.querySelector('[data-home-tooltip]');
if (homeBadges.length && !homeTooltip) {
  homeTooltip = document.createElement('div');
  homeTooltip.className = 'home-tooltip';
  homeTooltip.dataset.homeTooltip = '';
  homeTooltip.textContent = 'HOME PAGE';
  (header || document.body).appendChild(homeTooltip);
}
if (homeBadges.length && homeTooltip) {
  const offset = 14;
  const positionTooltip = (event) => {
    homeTooltip.style.left = `${event.clientX + offset}px`;
    homeTooltip.style.top = `${event.clientY + offset}px`;
  };
  const onEnter = (event) => {
    const label = event.currentTarget.getAttribute('data-tooltip') || 'HOME PAGE';
    homeTooltip.textContent = label;
    homeTooltip.classList.add('is-visible');
    positionTooltip(event);
  };
  const onLeave = () => {
    homeTooltip.classList.remove('is-visible');
  };
  homeBadges.forEach((badge) => {
    badge.addEventListener('mouseenter', onEnter);
    badge.addEventListener('mousemove', positionTooltip);
    badge.addEventListener('mouseleave', onLeave);
  });
}

const audioToggle = document.querySelector('[data-audio-toggle]');
if (audioToggle && AUDIO_ENABLED) {
  const audio = new Audio();
  audio.preload = 'none';
  const targetVolume = 0.35;
  audio.volume = 0;
  let playlist = null;
  let playlistPromise = null;
  const storageKey = 'cc-audio-enabled';
  const trackKey = 'cc-audio-track';
  const timeKey = 'cc-audio-time';
  const defaultEnabled = 'on';
  let resumeTime = 0;
  const history = [];
  let suppressToggle = false;
  let holdTimer = null;
  let audioMenu = null;
  let hideTimer = null;

  const loadPlaylist = async () => {
    if (playlist) return playlist;
    if (!playlistPromise) {
      const cacheBust = Date.now();
      const playlistUrl = resolveWithBaseHref(`assets/audio/playlist.json?v=${cacheBust}`);
      playlistPromise = fetch(playlistUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`playlist ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          playlist = Array.isArray(data)
            ? data.filter(Boolean).map((item) => resolveWithBase(item))
            : [];
          return playlist;
        })
        .catch(() => {
          playlist = [];
          return playlist;
        });
    }
    return playlistPromise;
  };

  const pickRandom = (list, current) => {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    let next = list[Math.floor(Math.random() * list.length)];
    while (next === current) {
      next = list[Math.floor(Math.random() * list.length)];
    }
    return next;
  };

  const clampVolume = (value) => Math.min(1, Math.max(0, value));
  const fadeTo = (value, duration = 800) => new Promise((resolve) => {
    const start = audio.volume;
    const delta = value - start;
    if (delta === 0) {
      resolve();
      return;
    }
    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      audio.volume = clampVolume(start + delta * t);
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    window.requestAnimationFrame(step);
  });

  const setTrack = async (next) => {
    if (!next) return;
    if (!audio.paused && audio.currentTime > 0) {
      await fadeTo(0, 500);
    }
    audio.src = next;
    localStorage.setItem(trackKey, next);
    const trackLabel = audioToggle.querySelector('[data-audio-track]');
    if (trackLabel) {
      const fileName = (next.split('/').pop() || '').split('?')[0];
      const cleanName = decodeURIComponent(fileName)
        .replace(/\\.mp3$/i, '')
        .replace(/\\.[^.]+$/, '');
      trackLabel.classList.remove('is-visible');
      window.setTimeout(() => {
        trackLabel.textContent = cleanName;
        if (audioToggle.classList.contains('is-playing')) {
          trackLabel.classList.add('is-visible');
        }
      }, 220);
    }
    if (history[history.length - 1] !== next) {
      history.push(next);
      if (history.length > 20) history.shift();
    }
    resumeTime = Number.parseFloat(localStorage.getItem(timeKey) || '0') || 0;
    try {
      audio.volume = 0;
      await audio.play();
      fadeTo(targetVolume, 900);
      if (resumeTime > 0 && audio.duration) {
        audio.currentTime = Math.min(resumeTime, Math.max(audio.duration - 1, 0));
      }
    } catch (error) {
      audioToggle.classList.remove('is-playing');
      audioToggle.setAttribute('aria-pressed', 'false');
    }
  };

  const playNext = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    const storedTrack = localStorage.getItem(trackKey);
    const next = storedTrack && list.includes(storedTrack) ? storedTrack : pickRandom(list, audio.src);
    await setTrack(next);
  };

  const playNextRandom = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    const next = pickRandom(list, audio.src);
    await setTrack(next);
  };

  audio.addEventListener('ended', () => {
    if (!audioToggle.classList.contains('is-playing')) return;
    localStorage.removeItem(timeKey);
    playNextRandom();
  });

  audio.addEventListener('timeupdate', () => {
    if (!audioToggle.classList.contains('is-playing')) return;
    if (audio.currentTime > 0) {
      localStorage.setItem(timeKey, String(audio.currentTime));
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    if (resumeTime > 0) {
      audio.currentTime = Math.min(resumeTime, Math.max(audio.duration - 1, 0));
    }
  });

  const setEnabledState = (enabled) => {
    audioToggle.classList.toggle('is-playing', enabled);
    audioToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    localStorage.setItem(storageKey, enabled ? 'on' : 'off');
    const trackLabel = audioToggle.querySelector('[data-audio-track]');
    if (trackLabel) {
      trackLabel.classList.toggle('is-visible', enabled);
    }
  };

  const ensurePlayback = async () => {
    if (!audioToggle.classList.contains('is-playing')) return;
    await playNext();
  };

  const tryAutoplay = async () => {
    await ensurePlayback();
  };

  const interactionResume = () => {
    document.removeEventListener('click', interactionResume);
    document.removeEventListener('keydown', interactionResume);
    document.removeEventListener('touchstart', interactionResume);
    document.removeEventListener('mousemove', interactionResume);
    ensurePlayback();
  };

  audioToggle.addEventListener('click', async () => {
    if (suppressToggle) return;
    const isPlaying = audioToggle.classList.contains('is-playing');
    if (isPlaying) {
      setEnabledState(false);
      audio.pause();
      return;
    }
    setEnabledState(true);
    await playNext();
  });

  const stored = localStorage.getItem(storageKey);
  const shouldPlay = stored ? stored === 'on' : defaultEnabled === 'on';
  setEnabledState(shouldPlay);
  if (shouldPlay) {
    tryAutoplay();
    document.addEventListener('click', interactionResume, { once: true });
    document.addEventListener('keydown', interactionResume, { once: true });
    document.addEventListener('touchstart', interactionResume, { once: true, passive: true });
    document.addEventListener('mousemove', interactionResume, { once: true });
  }

  const buildAudioMenu = () => {
    if (audioMenu) return audioMenu;
    audioMenu = document.createElement('div');
    audioMenu.className = 'audio-menu';
    audioMenu.innerHTML = `
      <button type="button" data-audio-prev aria-label="Brano precedente">Prev</button>
      <button type="button" data-audio-next aria-label="Brano successivo">Next</button>
      <button type="button" data-audio-random aria-label="Brano random">Rnd</button>
      <button type="button" data-audio-vol-down aria-label="Volume giù">Vol-</button>
      <button type="button" data-audio-vol-up aria-label="Volume su">Vol+</button>
    `;
    (header || document.body).appendChild(audioMenu);
    audioMenu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    audioMenu.querySelector('[data-audio-prev]')?.addEventListener('click', async () => {
      await playPrevious();
    });
    audioMenu.querySelector('[data-audio-next]')?.addEventListener('click', async () => {
      await playRandom();
    });
    audioMenu.querySelector('[data-audio-random]')?.addEventListener('click', async () => {
      await playRandom();
    });
    audioMenu.querySelector('[data-audio-vol-down]')?.addEventListener('click', () => changeVolume(-0.1));
    audioMenu.querySelector('[data-audio-vol-up]')?.addEventListener('click', () => changeVolume(0.1));
    audioMenu.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
    });
    audioMenu.addEventListener('mouseleave', () => {
      scheduleHideMenu();
    });
    return audioMenu;
  };

  const positionMenu = () => {
    if (!audioMenu) return;
    const rect = audioToggle.getBoundingClientRect();
    const menuRect = audioMenu.getBoundingClientRect();
    const left = Math.max(12, rect.left - menuRect.width - 12);
    const top = Math.max(12, Math.min(window.innerHeight - menuRect.height - 12, rect.top + rect.height / 2 - menuRect.height / 2));
    audioMenu.style.left = `${left}px`;
    audioMenu.style.top = `${top}px`;
  };

  const showMenu = () => {
    buildAudioMenu();
    positionMenu();
    audioMenu.classList.add('is-visible');
  };

  const hideMenu = () => {
    if (!audioMenu) return;
    audioMenu.classList.remove('is-visible');
  };

  const scheduleHideMenu = () => {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hideMenu();
    }, 1500);
  };

  const changeVolume = (delta) => {
    audio.volume = clampVolume(audio.volume + delta);
  };

  const playRandom = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    const next = pickRandom(list, audio.src);
    await setTrack(next);
  };

  const playPrevious = async () => {
    const list = await loadPlaylist();
    if (!list.length) return;
    if (history.length > 1) {
      history.pop();
      const prev = history.pop();
      if (prev) {
        await setTrack(prev);
        return;
      }
    }
    await playRandom();
  };

  audioToggle.addEventListener('mouseenter', () => {
    suppressToggle = false;
    clearTimeout(holdTimer);
    clearTimeout(hideTimer);
    holdTimer = window.setTimeout(() => {
      suppressToggle = true;
      showMenu();
    }, 700);
  });
  audioToggle.addEventListener('mouseleave', () => {
    clearTimeout(holdTimer);
    scheduleHideMenu();
  });


  document.addEventListener('click', (event) => {
    if (audioMenu && !audioMenu.contains(event.target) && event.target !== audioToggle) {
      hideMenu();
    }
  });

  window.addEventListener('resize', positionMenu);
  window.addEventListener('scroll', () => {
    if (audioMenu && audioMenu.classList.contains('is-visible')) positionMenu();
  }, { passive: true });

const smoothScrollToTop = (duration = 600) => {
  const start = window.scrollY || window.pageYOffset;
  if (start <= 0) return;
  const startTime = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(t);
    const nextY = Math.round(start * (1 - eased));
    window.scrollTo(0, nextY);
    if (t < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
};

document.querySelectorAll('[data-scroll-top]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    smoothScrollToTop();
  });
});

document.querySelectorAll('a[href="#top"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    smoothScrollToTop();
  });
});
}


