/* ===== APP HEIGHT ===== */

const root = document.documentElement;

function setAppHeight() {
  root.style.setProperty('--app-height', `${window.innerHeight}px`);
}

function getCssDurationMs(variableName, fallback) {
  const raw = getComputedStyle(root).getPropertyValue(variableName).trim();

  if (!raw) return fallback;
  if (raw.endsWith('ms')) return Number.parseFloat(raw);
  if (raw.endsWith('s')) return Number.parseFloat(raw) * 1000;

  const numeric = Number.parseFloat(raw);
  return Number.isFinite(numeric) ? numeric : fallback;
}

setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);

/* ===== GLOBAL ELEMENTS ===== */

const screens = Array.from(document.querySelectorAll('.screen'));
const nextButton = document.getElementById('nextButton');
const calendarButton = document.getElementById('calendarButton');
const emojis = Array.from(document.querySelectorAll('.emoji'));
const rsvpRoot = document.getElementById('rsvpRoot');
const rsvpScroll = document.getElementById('rsvpScroll');

const SCREEN_TRANSITION_MS = getCssDurationMs('--motion-screen', 900);
const PARALLAX_MS = getCssDurationMs('--motion-parallax', 700);
const WHEEL_THRESHOLD = 24;
const SWIPE_THRESHOLD = 55;

let current = 0;
let locked = false;
let touchStartY = 0;

function isRsvpScreen(index = current) {
  return screens[index]?.classList.contains('rsvp-screen') || false;
}

function scrollRsvpToTop() {
  if (rsvpScroll) {
    rsvpScroll.scrollTo({ top: 0, behavior: 'auto' });
  }
}

/* ===== SCREEN NAVIGATION ===== */

function clampScreenIndex(index) {
  return Math.max(0, Math.min(index, screens.length - 1));
}

function applyEmojiParallax(direction = 1) {
  if (!emojis.length) return;

  emojis.forEach((emoji, index) => {
    const shiftX = ((index % 3) - 1) * 10;
    const shiftY = direction > 0 ? 18 + (index % 4) * 4 : -18 - (index % 4) * 4;

    emoji.style.transition = `transform ${PARALLAX_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${PARALLAX_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    emoji.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0) scale(1.08)`;
    emoji.style.opacity = '0.78';

    window.setTimeout(() => {
      emoji.style.transform = '';
      emoji.style.opacity = '';
      emoji.style.transition = '';
    }, PARALLAX_MS + 20);
  });
}

function goTo(index) {
  const targetIndex = clampScreenIndex(index);

  if (locked || targetIndex === current || !screens.length) return;

  locked = true;

  const direction = targetIndex > current ? 1 : -1;
  const currentScreen = screens[current];
  const nextScreen = screens[targetIndex];

  applyEmojiParallax(direction);

  currentScreen.classList.add('exit-up');
  currentScreen.classList.remove('active');
  nextScreen.classList.add('active');

  window.setTimeout(() => {
    currentScreen.classList.remove('exit-up');
    current = targetIndex;
    locked = false;

    if (isRsvpScreen()) {
      scrollRsvpToTop();
    }
  }, SCREEN_TRANSITION_MS);
}

/* ===== CALENDAR (.ICS) ===== */

function formatDateForICS(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');

  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

function downloadCalendarEvent() {
  const startDate = new Date('2026-06-27T17:00:00+03:00');
  const endDate = new Date('2026-06-27T23:00:00+03:00');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//RU',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@wedding-invitation`,
    `DTSTAMP:${formatDateForICS(new Date())}`,
    `DTSTART:${formatDateForICS(startDate)}`,
    `DTEND:${formatDateForICS(endDate)}`,
    'SUMMARY:Свадьба Дмитрия и Валерии',
    'DESCRIPTION:Будем счастливы разделить этот день вместе с вами.',
    'LOCATION:Ресторан "КАРС", г. Козельск, ул. Колхозная, 19А',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'wedding-invitation.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* ===== TIMER ===== */

const weddingDate = new Date('2026-06-27T17:00:00+03:00');

function updateValue(id, value) {
  const element = document.getElementById(id);
  const nextValue = String(value).padStart(2, '0');

  if (!element || element.textContent === nextValue) return;

  element.textContent = nextValue;
  element.classList.remove('tick');

  requestAnimationFrame(() => {
    element.classList.add('tick');
  });
}

function updateTimer() {
  const diff = weddingDate - new Date();

  if (diff <= 0) {
    updateValue('days', 0);
    updateValue('hours', 0);
    updateValue('minutes', 0);
    updateValue('seconds', 0);
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  updateValue('days', days);
  updateValue('hours', hours);
  updateValue('minutes', minutes);
  updateValue('seconds', seconds);
}

/* ===== GLOBAL EVENTS ===== */

if (nextButton) {
  nextButton.addEventListener('click', () => goTo(current + 1));
}

if (calendarButton) {
  calendarButton.addEventListener('click', downloadCalendarEvent);
}

window.addEventListener(
  'wheel',
  (event) => {
    if (locked || Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

    if (isRsvpScreen()) {
      if (!rsvpScroll) return;

      const atTop = rsvpScroll.scrollTop <= 4;
      const goingUp = event.deltaY < 0;

      if (atTop && goingUp) {
        goTo(current - 1);
      }

      return;
    }

    goTo(current + (event.deltaY > 0 ? 1 : -1));
  },
  { passive: true }
);

window.addEventListener(
  'touchstart',
  (event) => {
    touchStartY = event.changedTouches[0].clientY;
  },
  { passive: true }
);

window.addEventListener(
  'touchend',
  (event) => {
    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = touchStartY - touchEndY;

    if (locked || Math.abs(deltaY) < SWIPE_THRESHOLD) return;

    if (isRsvpScreen()) {
      if (!rsvpScroll) return;

      const atTop = rsvpScroll.scrollTop <= 4;
      const swipeDown = deltaY < 0;

      if (atTop && swipeDown) {
        goTo(current - 1);
      }

      return;
    }

    goTo(current + (deltaY > 0 ? 1 : -1));
  },
  { passive: true }
);

window.addEventListener('keydown', (event) => {
  if (locked) return;

  if (isRsvpScreen()) {
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      if (rsvpScroll && rsvpScroll.scrollTop <= 8) {
        event.preventDefault();
        goTo(current - 1);
      }
    }
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
    event.preventDefault();
    goTo(current + 1);
    return;
  }

  if (event.key === 'ArrowUp' || event.key === 'PageUp') {
    event.preventDefault();
    goTo(current - 1);
  }
});

updateTimer();
window.setInterval(updateTimer, 1000);

/* ===== DRESSCODE SCREEN ===== */

function initDresscodeScreen() {
  const image = document.getElementById('dressImage');
  const bgBase = document.getElementById('dressBgBase');
  const bgOverlay = document.getElementById('dressBgOverlay');
  const genderTrack = document.getElementById('genderTrack');
  const genderMaleButton = document.getElementById('genderMaleButton');
  const genderFemaleButton = document.getElementById('genderFemaleButton');
  const paletteThumb = document.getElementById('paletteThumb');
  const paletteSegments = Array.from(document.querySelectorAll('.dresscode-palette-segment'));

  if (
    !image ||
    !bgBase ||
    !bgOverlay ||
    !genderTrack ||
    !genderMaleButton ||
    !genderFemaleButton ||
    !paletteThumb ||
    !paletteSegments.length
  ) {
    return;
  }

  const colorOrder = ['rose', 'beige', 'olive', 'brown'];

  const colorThemes = {
    rose: {
      background: `
        radial-gradient(circle at 16% 14%, rgba(255,255,255,0.36), transparent 24%),
        radial-gradient(circle at 84% 18%, rgba(255,255,255,0.22), transparent 22%),
        radial-gradient(circle at 54% 78%, rgba(255,255,255,0.1), transparent 28%),
        linear-gradient(160deg, #f3dcd6 0%, #ebcbc4 34%, #dfb4ad 100%)
      `
    },
    beige: {
      background: `
        linear-gradient(160deg, #ebdfd0 0%, #dfcfbb 36%, #ceb79d 100%)
      `
    },
    olive: {
      background: `
        linear-gradient(160deg, #b9c5aa 0%, #a5b28f 34%, #87956f 100%)
      `
    },
    brown: {
      background: `
        linear-gradient(160deg, #9a7a67 0%, #86634e 36%, #694836 100%)
      `
    }
  };

  let currentColor = 'rose';
  let currentGender = 'female';
  let isAnimating = false;
  let activeBgLayer = bgBase;
  const imageCache = new Map();

  function getImagePath() {
    return `images/dresscode/${currentGender}-${currentColor}.jpg`;
  }

  function preloadDressImage(src) {
    if (imageCache.has(src)) return imageCache.get(src);

    const preloadPromise = new Promise((resolve, reject) => {
      const preloadImage = new Image();
      preloadImage.onload = () => resolve(src);
      preloadImage.onerror = reject;
      preloadImage.src = src;
    });

    imageCache.set(src, preloadPromise);
    return preloadPromise;
  }

  function preloadAllDressImages() {
    const genders = ['female', 'male'];
    genders.forEach((gender) => {
      colorOrder.forEach((color) => {
        preloadDressImage(`images/dresscode/${gender}-${color}.jpg`).catch(() => {});
      });
    });
  }

  function updateGenderUI() {
    const isMale = currentGender === 'male';

    genderTrack.classList.toggle('is-male', isMale);
    genderTrack.classList.toggle('is-female', !isMale);

    genderMaleButton.classList.toggle('is-active', isMale);
    genderFemaleButton.classList.toggle('is-active', !isMale);
  }

  function updatePaletteUI() {
    paletteSegments.forEach((segment) => {
      segment.classList.toggle('is-active', segment.dataset.color === currentColor);
    });
  }

  function movePaletteThumb() {
    const index = colorOrder.indexOf(currentColor);
    paletteThumb.style.transform = `translateX(${Math.max(index, 0) * 100}%)`;
  }

  function crossfadeBackground() {
    const theme = colorThemes[currentColor];
    if (!theme) return;

    const nextLayer = activeBgLayer === bgBase ? bgOverlay : bgBase;

    nextLayer.style.background = theme.background;
    nextLayer.classList.add('is-active');
    activeBgLayer.classList.remove('is-active');
    activeBgLayer = nextLayer;
  }

  function showImage(nextSrc) {
    image.src = nextSrc;

    const reveal = () => {
      image.classList.add('is-visible');
      isAnimating = false;
    };

    if (typeof image.decode === 'function') {
      image.decode().then(reveal).catch(reveal);
      return;
    }

    image.onload = reveal;
    image.onerror = () => {
      isAnimating = false;
    };
  }

  function swapImage() {
    if (isAnimating) return;

    isAnimating = true;
    const nextSrc = getImagePath();

    preloadDressImage(nextSrc)
      .then(() => {
        image.classList.remove('is-visible');

        window.setTimeout(() => {
          showImage(nextSrc);
        }, 120);
      })
      .catch(() => {
        isAnimating = false;
      });
  }

  function applyState() {
    updateGenderUI();
    updatePaletteUI();
    movePaletteThumb();
    crossfadeBackground();
    swapImage();
  }

  function setGender(nextGender) {
    if (nextGender === currentGender) return;
    currentGender = nextGender;
    applyState();
  }

  function setColor(nextColor) {
    if (nextColor === currentColor) return;
    currentColor = nextColor;
    applyState();
  }

  genderMaleButton.addEventListener('click', () => setGender('male'));
  genderFemaleButton.addEventListener('click', () => setGender('female'));

  paletteSegments.forEach((segment) => {
    segment.addEventListener('click', () => {
      const { color } = segment.dataset;
      if (color) setColor(color);
    });
  });

  image.onload = () => {
    image.classList.add('is-visible');
  };

  preloadAllDressImages();
  applyState();
}

initDresscodeScreen();

/* ===== RSVP SCREEN ===== */

function initRsvpScreen() {
  if (!rsvpRoot) return;

  const ALCOHOL_OPTIONS = [
    'Вино',
    'Шампанское',
    'Виски',
    'Коньяк',
    'Коктейли',
    'Другое',
    'Принесу с собой',
    'Не употребляю'
  ];

  const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw0kKIYXQh9jBvAepABXCVWJRXwS64TGt10DcxhcKwMv77ZYRAPbv6CtFZXuSmqalyd2w/exec';
  const shownSteps = new Set();

  const state = {
    name: '',
    nameConfirmed: false,

    attendance: null,

    restrictedAcknowledged: false,

    fillingType: null,
    guests: '',
    guestsCommitted: false,

    alcohol: {
      self: [],
      selfOtherText: '',
      guests: [],
      guestsOtherText: '',
      confirmed: false
    },

    music: {
      mode: null,
      value: '',
      confirmed: false
    },

    activity: null,

    comment: {
      mode: null,
      value: '',
      confirmed: false
    },

    submitting: false,
    submitted: false,
    submittedAttendance: null
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeName(value) {
    return value
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-zа-я\s-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getFirstName(value) {
    return normalizeName(value).split(/[\s-]+/).filter(Boolean)[0] || '';
  }

  function isBlacklistedName(value) {
    const firstName = getFirstName(value);
    return ['олеся', 'олесян', 'olesya', 'olesia', 'alesya', 'алеся'].some(
      (item) => firstName === item || firstName.startsWith(item)
    );
  }

  function isRestrictedGuest(value) {
    const firstName = getFirstName(value);
    return firstName.startsWith('андре') || firstName === 'денис';
  }

  function hasName() {
    return state.nameConfirmed && state.name.trim().length > 0;
  }

  function hasGuests() {
    return state.fillingType === 'withGuests' && state.guestsCommitted && state.guests.trim().length > 0;
  }

  function isBlocked() {
    return hasName() && isBlacklistedName(state.name);
  }

  function isRestricted() {
    return hasName() && isRestrictedGuest(state.name) && !isBlocked();
  }

  function restrictedGatePassed() {
    return !isRestricted() || state.restrictedAcknowledged;
  }

  function alcoholStepVisible() {
    if (state.attendance !== 'yes') return false;
    if (!restrictedGatePassed()) return false;

    if (isRestricted()) return true;
    if (state.fillingType === 'self') return true;
    if (state.fillingType === 'withGuests') return state.guestsCommitted;
    return false;
  }

  function musicStepVisible() {
    return alcoholStepVisible() && state.alcohol.confirmed;
  }

  function activityStepVisible() {
    return musicConfirmed();
  }

  function commentStepVisible() {
    return activityConfirmed();
  }

  function submitVisible() {
    if (state.attendance === 'no') return true;
    return commentConfirmed();
  }

  function selectedListWithOther(selected, otherText) {
    const values = selected.filter((item) => item !== 'Другое');

    if (selected.includes('Другое') && otherText.trim()) {
      values.push(otherText.trim());
    }

    return values;
  }

  function musicConfirmed() {
    if (!musicStepVisible()) return false;

    if (state.music.mode === 'playlist') {
      return true;
    }

    if (state.music.mode === 'song') {
      return state.music.confirmed && state.music.value.trim().length > 0;
    }

    return false;
  }

  function activityConfirmed() {
    return state.activity !== null;
  }

  function commentConfirmed() {
    if (!commentStepVisible()) return false;

    if (state.comment.mode === 'no') return true;
    if (state.comment.mode === 'yes') {
      return state.comment.confirmed && state.comment.value.trim().length > 0;
    }

    return false;
  }

  function alcoholSelectionValid(target) {
    const selected = state.alcohol[target];
    const otherText = target === 'self' ? state.alcohol.selfOtherText : state.alcohol.guestsOtherText;

    if (!selected.length) return false;
    if (selected.includes('Другое') && !otherText.trim()) return false;
    return true;
  }

  function commitAlcoholSelection() {
    if (!alcoholSelectionValid('self')) return false;
    if (hasGuests() && !alcoholSelectionValid('guests')) return false;

    state.alcohol.confirmed = true;
    return true;
  }

  function resetAfterName() {
    state.restrictedAcknowledged = false;
    state.attendance = null;
    resetAfterAttendance();
  }

  function resetAfterAttendance() {
    state.fillingType = null;
    resetGuestsBranch();
    resetAfterAlcohol();
  }

  function resetGuestsBranch() {
    state.guests = '';
    state.guestsCommitted = false;
    state.alcohol.guests = [];
    state.alcohol.guestsOtherText = '';

    if (state.activity && state.activity.startsWith('group:')) {
      state.activity = null;
    }
  }

  function resetAfterAlcohol() {
    state.alcohol.confirmed = false;

    state.music.mode = null;
    state.music.value = '';
    state.music.confirmed = false;

    resetAfterMusic();
  }

  function resetAfterMusic() {
    state.activity = null;
    resetAfterActivity();
  }

  function resetAfterActivity() {
    state.comment.mode = null;
    state.comment.value = '';
    state.comment.confirmed = false;
  }

  function syncGuestDependencies() {
    if (!hasGuests()) {
      state.alcohol.guests = [];
      state.alcohol.guestsOtherText = '';

      if (state.activity && state.activity.startsWith('group:')) {
        state.activity = null;
      }
    }
  }

  function toggleAlcoholChoice(target, option) {
    const selected = state.alcohol[target];
    const index = selected.indexOf(option);

    if (option === 'Не употребляю') {
      state.alcohol[target] = index === -1 ? ['Не употребляю'] : [];
    } else {
      const next = selected.filter((item) => item !== 'Не употребляю');

      if (index === -1) {
        next.push(option);
      } else {
        const removeIndex = next.indexOf(option);
        if (removeIndex !== -1) next.splice(removeIndex, 1);
      }

      state.alcohol[target] = next;
    }

    if (!state.alcohol[target].includes('Другое')) {
      if (target === 'self') state.alcohol.selfOtherText = '';
      if (target === 'guests') state.alcohol.guestsOtherText = '';
    }
  }

  function autoResizeTextarea(element) {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  function scrollToBottom() {
    if (!rsvpScroll) return;

    window.requestAnimationFrame(() => {
      rsvpScroll.scrollTo({ top: rsvpScroll.scrollHeight, behavior: 'smooth' });
    });
  }

  function getStepClass(stepId) {
    if (shownSteps.has(stepId)) return '';
    shownSteps.add(stepId);
    return 'rsvp-step';
  }

  function compactBlock(message, value, editAction, stepId) {
    return `
      <div class="rsvp-compact ${getStepClass(stepId)}">
        <div class="rsvp-compact-copy">
          <p class="rsvp-compact-title">${escapeHtml(message)}</p>
          ${value ? `<p class="rsvp-compact-value">${escapeHtml(value)}</p>` : ''}
        </div>
        <button class="rsvp-text-button" type="button" data-action="${editAction}">Изменить</button>
      </div>
    `;
  }

  function renderChoiceButton({ label, value, action, selected, muted = false }) {
    return `
      <button
        class="rsvp-option${selected ? ' is-selected' : ''}${muted ? ' rsvp-option--muted' : ''}"
        type="button"
        data-action="${action}"
        data-value="${escapeHtml(value)}"
      >
        <span class="rsvp-option-label">${escapeHtml(label)}</span>
      </button>
    `;
  }

  function renderAlcoholSection(title, target, otherText) {
    return `
      <div class="rsvp-block ${getStepClass(`alcohol-${target}`)}">
        ${title ? `<h4 class="rsvp-block-title">${escapeHtml(title)}</h4>` : ''}

        <div class="rsvp-grid-alcohol">
          ${ALCOHOL_OPTIONS.map((option) => renderChoiceButton({
            label: option,
            value: option,
            action: `toggleAlcohol:${target}`,
            selected: state.alcohol[target].includes(option),
            muted: option === 'Не употребляю'
          })).join('')}
        </div>

        ${state.alcohol[target].includes('Другое') ? `
          <input
            class="rsvp-input"
            type="text"
            data-field="${target === 'self' ? 'selfOtherAlcohol' : 'guestsOtherAlcohol'}"
            placeholder="Напишите ваш вариант"
            value="${escapeHtml(otherText)}"
          />
        ` : ''}
      </div>
    `;
  }

  function renderMusicBlock() {
    if (!musicStepVisible()) return '';

    if (musicConfirmed()) {
      const value =
        state.music.mode === 'song'
          ? state.music.value
          : 'Доверяюсь плейлисту';

      return `
        <div class="rsvp-block ${getStepClass('musicCompact')}">
          <h3 class="rsvp-block-title">Музыка</h3>
          ${compactBlock('Музыкальные пожелания сохранены ✨', value, 'editMusic', 'musicCompactInner')}
        </div>
      `;
    }

    return `
      <div class="rsvp-block ${getStepClass('music')}">
        <h3 class="rsvp-block-title">Музыка</h3>
        <div class="rsvp-card rsvp-stack">
          <div class="rsvp-grid-2">
            ${renderChoiceButton({
              label: 'Указать песню',
              value: 'song',
              action: 'setMusicMode',
              selected: state.music.mode === 'song'
            })}
            ${renderChoiceButton({
              label: 'Доверяюсь плейлисту',
              value: 'playlist',
              action: 'setMusicMode',
              selected: state.music.mode === 'playlist'
            })}
          </div>

          ${state.music.mode === 'song' ? `
            <div class="rsvp-stack">
              <textarea
                class="rsvp-textarea"
                data-field="musicValue"
                placeholder="Напишите исполнителя и название песни"
              >${escapeHtml(state.music.value)}</textarea>
              <button class="rsvp-submit" type="button" data-action="confirmMusic">Подтвердить</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderActivityBlock() {
    if (!activityStepVisible()) return '';

    const labels = {
      join: hasGuests() ? 'Мы с удовольствием поучаствуем' : 'С удовольствием поучаствую',
      watch: hasGuests() ? 'Мы предпочитаем наблюдать' : 'Предпочитаю наблюдать',
      mood: hasGuests() ? 'Мы посмотрим по настроению' : 'Посмотрю по настроению'
    };

    if (state.activity) {
      return `
        <div class="rsvp-block ${getStepClass('activityCompact')}">
          <h3 class="rsvp-block-title">Активности</h3>
          ${compactBlock(labels[state.activity] || 'Выбор сохранён', '', 'editActivity', 'activityCompactInner')}
        </div>
      `;
    }

    return `
      <div class="rsvp-block ${getStepClass('activity')}">
        <h3 class="rsvp-block-title">Активности</h3>
        <div class="rsvp-card">
          <div class="rsvp-stack">
            ${renderChoiceButton({
              label: labels.join,
              value: 'join',
              action: 'setActivity',
              selected: state.activity === 'join'
            })}
            ${renderChoiceButton({
              label: labels.watch,
              value: 'watch',
              action: 'setActivity',
              selected: state.activity === 'watch'
            })}
            ${renderChoiceButton({
              label: labels.mood,
              value: 'mood',
              action: 'setActivity',
              selected: state.activity === 'mood'
            })}
          </div>
        </div>
      </div>
    `;
  }

  function renderCommentBlock() {
    if (!commentStepVisible()) return '';

    if (state.comment.confirmed) {
      const title =
        state.comment.mode === 'yes'
          ? 'Мы учтём ваш комментарий ✨'
          : 'Больше ничего не добавляю';

      const value = state.comment.mode === 'yes' ? state.comment.value : '';

      return `
        <div class="rsvp-block ${getStepClass('commentCompact')}">
          <h3 class="rsvp-block-title">Хотите что-то добавить?</h3>
          ${compactBlock(title, value, 'editComment', 'commentCompactInner')}
        </div>
      `;
    }

    return `
      <div class="rsvp-block ${getStepClass('comment')}">
        <h3 class="rsvp-block-title">Хотите что-то добавить?</h3>
        <div class="rsvp-card rsvp-stack">
          <div class="rsvp-grid-2">
            ${renderChoiceButton({
              label: 'Да, хочу добавить',
              value: 'yes',
              action: 'setCommentMode',
              selected: state.comment.mode === 'yes'
            })}
            ${renderChoiceButton({
              label: 'Нет, всё указано',
              value: 'no',
              action: 'setCommentMode',
              selected: state.comment.mode === 'no'
            })}
          </div>

          ${state.comment.mode === 'yes' ? `
            <div class="rsvp-stack">
              <textarea
                class="rsvp-textarea"
                data-field="commentValue"
                placeholder="Напишите, что хотите добавить"
              >${escapeHtml(state.comment.value)}</textarea>
              <button class="rsvp-submit" type="button" data-action="confirmComment">Подтвердить</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderSubmitBlock() {
    if (!submitVisible()) return '';

    return `
      <div class="rsvp-submit-wrap ${getStepClass('submit')}">
        <button class="rsvp-submit" type="button" data-action="submitRsvp" ${state.submitting ? 'disabled' : ''}>
          ${state.submitting ? 'Отправляем…' : 'Отправить'}
        </button>
      </div>
    `;
  }

  function renderFinal() {
    if (!state.submitted) return '';

    const title =
      state.submittedAttendance === 'no'
        ? 'Нам будет вас не хватать 🤍'
        : 'Мы будем вас ждать 🤍';

    return `
      <div class="rsvp-final-wrap">
        <div class="rsvp-final-card">
          <h2 class="rsvp-final-title rsvp-final-title--full">${escapeHtml(title)}</h2>
          <p class="rsvp-final-text">Спасибо, что нашли время ответить. Мы всё сохранили ✨</p>

          <div class="rsvp-restart-block">
            <button class="rsvp-restart-card" type="button" data-action="restartRsvp">
              Заполнить от другого имени
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderRsvp() {
    if (state.submitted) {
      rsvpRoot.innerHTML = renderFinal();
      return;
    }

    const pieces = [];

    pieces.push(`
      <div class="rsvp-flow">
        <div class="rsvp-intro-shell ${getStepClass('intro')}">
          <div class="rsvp-intro">
            <h2 class="rsvp-intro-title">Нам важно знать, сможете ли вы присутствовать 🤍</h2>

            <div class="rsvp-divider-line"></div>

            <p class="rsvp-intro-text">Пожалуйста, заполните форму ниже до 15 мая ✨</p>

            <div class="rsvp-divider-line rsvp-divider-line--soft"></div>

            <div class="rsvp-note-inline">Если удобнее, форму можно заполнить отдельно для каждого гостя</div>
          </div>
        </div>

        <div class="rsvp-block ${getStepClass('name')}">
          <h3 class="rsvp-block-title">Ваше имя</h3>

          ${state.nameConfirmed
            ? compactBlock('Так и запишем', state.name, 'editName', 'nameCompact')
            : `
              <div class="rsvp-input-wrap">
                <input
                  id="rsvpNameInput"
                  class="rsvp-input rsvp-input--with-action"
                  type="text"
                  data-field="name"
                  placeholder="Введите имя"
                  autocomplete="name"
                  value="${escapeHtml(state.name)}"
                />

                <button
                  class="rsvp-input-action${state.name.trim() ? ' is-visible' : ''}"
                  type="button"
                  data-action="confirmName"
                  aria-label="Подтвердить имя"
                  ${state.name.trim() ? '' : 'tabindex="-1"'}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h12"></path>
                    <path d="M13 6l6 6-6 6"></path>
                  </svg>
                </button>
              </div>
            `}
        </div>
    `);

    if (isBlocked()) {
      pieces.push(`
        <div class="rsvp-block ${getStepClass('blocked')}">
          <div class="rsvp-banner rsvp-banner--blocked">
            Вы не приглашены
          </div>
        </div>
      `);
    } else if (hasName()) {
      if (isRestricted() && !state.restrictedAcknowledged) {
        pieces.push(`
          <div class="rsvp-block ${getStepClass('restricted')}">
            <div class="rsvp-banner ${getStepClass('restrictedBanner')}">Приглашены только вы 🤍</div>

            <div class="rsvp-submit-wrap ${getStepClass('restrictedContinue')}">
              <button class="rsvp-submit" type="button" data-action="acknowledgeRestricted">
                Продолжить
              </button>
            </div>
          </div>
        `);
      }

      if (restrictedGatePassed()) {
        pieces.push(`
          <div class="rsvp-block ${getStepClass('attendance')}">
            <h3 class="rsvp-block-title">Сможете ли вы присутствовать?</h3>

            <div class="rsvp-grid-2">
              ${renderChoiceButton({
                label: 'Да, обязательно буду',
                value: 'yes',
                action: 'setAttendance',
                selected: state.attendance === 'yes'
              })}
              ${renderChoiceButton({
                label: 'К сожалению, не смогу',
                value: 'no',
                action: 'setAttendance',
                selected: state.attendance === 'no'
              })}
            </div>
          </div>
        `);

        if (state.attendance === 'yes') {
          if (!isRestricted()) {
            pieces.push(`
              <div class="rsvp-block ${getStepClass('fillingType')}">
                <h3 class="rsvp-block-title">За кого вы заполняете форму?</h3>

                <div class="rsvp-grid-2">
                  ${renderChoiceButton({
                    label: 'Только за себя',
                    value: 'self',
                    action: 'setFillingType',
                    selected: state.fillingType === 'self'
                  })}
                  ${renderChoiceButton({
                    label: 'За себя и спутника(ов)',
                    value: 'withGuests',
                    action: 'setFillingType',
                    selected: state.fillingType === 'withGuests'
                  })}
                </div>
              </div>
            `);

            if (state.fillingType === 'withGuests') {
              pieces.push(`
                <div class="rsvp-block ${getStepClass('guests')}">
                  <h3 class="rsvp-block-title">Кого ожидать вместе с вами 👥</h3>

                  <div class="rsvp-input-wrap">
                    <textarea
                      id="rsvpGuestsInput"
                      class="rsvp-textarea rsvp-input--with-action"
                      data-field="guests"
                      placeholder="Укажите имена гостей"
                    >${escapeHtml(state.guests)}</textarea>

                    <button
                      class="rsvp-input-action${state.guests.trim() ? ' is-visible' : ''}"
                      type="button"
                      data-action="confirmGuests"
                      aria-label="Подтвердить гостей"
                      ${state.guests.trim() ? '' : 'tabindex="-1"'}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h12"></path>
                        <path d="M13 6l6 6-6 6"></path>
                      </svg>
                    </button>
                  </div>

                  <div class="rsvp-helper">Например: Анна, Сергей, Мария</div>
                </div>
              `);
            }
          }
        }

        if (alcoholStepVisible()) {
          if (state.alcohol.confirmed) {
            pieces.push(`
              <div class="rsvp-block ${getStepClass('alcoholCompact')}">
                <h3 class="rsvp-block-title">Предпочтения в алкоголе</h3>
                ${compactBlock(
                  hasGuests()
                    ? 'Мы учтём ваши предпочтения и пожелания гостей ✨'
                    : 'Мы учтём ваши предпочтения ✨',
                  '',
                  'editAlcohol',
                  'alcoholCompactInner'
                )}
              </div>
            `);
          } else {
            pieces.push(`
              <div class="rsvp-block ${getStepClass('alcoholMain')}">
                <h3 class="rsvp-block-title">Предпочтения в алкоголе</h3>
                ${renderAlcoholSection('', 'self', state.alcohol.selfOtherText)}
                ${hasGuests() ? `
                  <hr class="rsvp-divider" />
                  ${renderAlcoholSection('Предпочтения спутников', 'guests', state.alcohol.guestsOtherText)}
                ` : ''}

                <div class="rsvp-submit-wrap">
                  <button class="rsvp-submit" type="button" data-action="confirmAlcohol">
                    Подтвердить
                  </button>
                </div>
              </div>
            `);
          }
        }

        pieces.push(renderMusicBlock());
        pieces.push(renderActivityBlock());
        pieces.push(renderCommentBlock());
        pieces.push(renderSubmitBlock());
      }
    }

    pieces.push('</div>');

    rsvpRoot.innerHTML = pieces.join('');

    const textareas = rsvpRoot.querySelectorAll('textarea');
    textareas.forEach(autoResizeTextarea);
  }

  async function submitRsvp() {
    if (state.submitting || !submitVisible()) return;

    state.submitting = true;
    renderRsvp();

const alcoholSelfList = selectedListWithOther(
  state.alcohol.self,
  state.alcohol.selfOtherText
);

const alcoholGuestsList = hasGuests()
  ? selectedListWithOther(state.alcohol.guests, state.alcohol.guestsOtherText)
  : [];

const alcoholText = hasGuests()
  ? `Я: ${alcoholSelfList.join(', ') || '—'}; Гости: ${alcoholGuestsList.join(', ') || '—'}`
  : `Я: ${alcoholSelfList.join(', ') || '—'}`;

const payload = {
  name: state.name.trim(),
  attending: state.attendance === 'yes' ? 'Да' : 'Нет',
  formType: state.attendance === 'yes'
    ? (hasGuests() ? 'С гостями' : 'Только за себя')
    : '—',
  guests: state.attendance === 'yes'
    ? (hasGuests() ? state.guests.trim() : '—')
    : '—',
  alcohol: state.attendance === 'yes' ? alcoholText : '—',
  music: state.attendance === 'yes'
    ? (
        state.music.mode === 'playlist'
          ? 'Наш плейлист'
          : (state.music.value.trim() || '—')
      )
    : '—',
  activities: state.attendance === 'yes'
    ? (
        state.activity === 'join'
          ? 'Буду участвовать'
          : state.activity === 'watch'
            ? 'Буду наблюдать'
            : state.activity === 'mood'
              ? 'По настроению'
              : '—'
      )
    : '—',
  comment: state.attendance === 'yes'
    ? (
        state.comment.mode === 'yes'
          ? (state.comment.value.trim() || '—')
          : '—'
      )
    : '—'
};

    try {
if (RSVP_ENDPOINT) {
  await fetch(RSVP_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload)
  });
}
      else {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 900);
        });
        console.info('RSVP payload', payload);
      }

      state.submittedAttendance = state.attendance;
      state.submitted = true;
      renderRsvp();
    } catch (error) {
      console.error('RSVP submit failed:', error);
      state.submitting = false;
      renderRsvp();
      alert('Не удалось отправить форму. Попробуйте ещё раз.');
    }
  }

  function resetState() {
    state.name = '';
    state.nameConfirmed = false;
    state.attendance = null;
    state.restrictedAcknowledged = false;
    state.fillingType = null;
    state.guests = '';
    state.guestsCommitted = false;

    state.alcohol.self = [];
    state.alcohol.selfOtherText = '';
    state.alcohol.guests = [];
    state.alcohol.guestsOtherText = '';
    state.alcohol.confirmed = false;

    state.music.mode = null;
    state.music.value = '';
    state.music.confirmed = false;

    state.activity = null;

    state.comment.mode = null;
    state.comment.value = '';
    state.comment.confirmed = false;

    state.submitting = false;
    state.submitted = false;
    state.submittedAttendance = null;
  }

  function focusNameInput() {
    const nameInput = document.getElementById('rsvpNameInput');
    if (!nameInput) return;

    nameInput.focus();
    const len = nameInput.value.length;
    nameInput.setSelectionRange(len, len);
  }

  function restartRsvp() {
    shownSteps.clear();
    resetState();
    renderRsvp();
    scrollRsvpToTop();

    window.requestAnimationFrame(() => {
      focusNameInput();
    });
  }

  function commitName() {
    if (!state.name.trim()) return;

    state.name = state.name.trim();
    state.nameConfirmed = true;
    resetAfterName();
    renderRsvp();
    scrollToBottom();
  }

  function commitGuests() {
    if (!state.guests.trim()) return;

    state.guests = state.guests.trim();
    state.guestsCommitted = true;
    syncGuestDependencies();
    resetAfterAlcohol();
    renderRsvp();
    scrollToBottom();
  }

  rsvpRoot.addEventListener('input', (event) => {
    const field = event.target.dataset.field;
    if (!field) return;

    if (field === 'name') {
      state.name = event.target.value;

      const action = rsvpRoot.querySelector('[data-action="confirmName"]');
      if (action) {
        const hasValue = state.name.trim().length > 0;
        action.classList.toggle('is-visible', hasValue);

        if (hasValue) {
          action.removeAttribute('tabindex');
        } else {
          action.setAttribute('tabindex', '-1');
        }
      }

      return;
    }

    if (field === 'guests') {
      state.guests = event.target.value;
      autoResizeTextarea(event.target);

      const action = rsvpRoot.querySelector('[data-action="confirmGuests"]');
      if (action) {
        const hasValue = state.guests.trim().length > 0;
        action.classList.toggle('is-visible', hasValue);

        if (hasValue) {
          action.removeAttribute('tabindex');
        } else {
          action.setAttribute('tabindex', '-1');
        }
      }

      return;
    }

    if (field === 'selfOtherAlcohol') {
      state.alcohol.selfOtherText = event.target.value;
      return;
    }

    if (field === 'guestsOtherAlcohol') {
      state.alcohol.guestsOtherText = event.target.value;
      return;
    }

    if (field === 'musicValue') {
      state.music.value = event.target.value;
      autoResizeTextarea(event.target);
      return;
    }

    if (field === 'commentValue') {
      state.comment.value = event.target.value;
      autoResizeTextarea(event.target);
    }
  });

  rsvpRoot.addEventListener('keydown', (event) => {
    const field = event.target.dataset.field;

    if (field === 'name' && event.key === 'Enter') {
      event.preventDefault();
      commitName();
      return;
    }

    if (field === 'guests' && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      commitGuests();
    }
  });

  rsvpRoot.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) return;

    const { action, value } = trigger.dataset;

    if (action === 'confirmName') {
      commitName();
      return;
    }

    if (action === 'editName') {
      state.nameConfirmed = false;
      resetAfterName();
      renderRsvp();

      window.requestAnimationFrame(() => {
        focusNameInput();
      });
      return;
    }

    if (action === 'acknowledgeRestricted') {
      state.restrictedAcknowledged = true;
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'setAttendance') {
      if (state.attendance !== value) {
        state.attendance = value;
        resetAfterAttendance();
      }

      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'setFillingType') {
      if (state.fillingType !== value) {
        state.fillingType = value;
        resetGuestsBranch();
        resetAfterAlcohol();
      }

      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'confirmGuests') {
      commitGuests();
      return;
    }

    if (action === 'toggleAlcohol:self') {
      toggleAlcoholChoice('self', value);
      resetAfterAlcohol();
      renderRsvp();
      return;
    }

    if (action === 'toggleAlcohol:guests') {
      toggleAlcoholChoice('guests', value);
      resetAfterAlcohol();
      renderRsvp();
      return;
    }

    if (action === 'confirmAlcohol') {
      if (!commitAlcoholSelection()) return;
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'editAlcohol') {
      state.alcohol.confirmed = false;
      resetAfterMusic();
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'setMusicMode') {
      state.music.mode = value;
      state.music.confirmed = value === 'playlist';

      if (value !== 'song') {
        state.music.value = '';
      }

      resetAfterMusic();
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'confirmMusic') {
      if (!state.music.value.trim()) return;

      state.music.value = state.music.value.trim();
      state.music.confirmed = true;
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'editMusic') {
      state.music.confirmed = false;
      resetAfterMusic();
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'setActivity') {
      state.activity = value;
      resetAfterActivity();
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'editActivity') {
      state.activity = null;
      resetAfterActivity();
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'setCommentMode') {
      state.comment.mode = value;
      state.comment.confirmed = value === 'no';

      if (value === 'no') {
        state.comment.value = '';
      }

      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'confirmComment') {
      if (state.comment.mode === 'yes' && !state.comment.value.trim()) return;

      if (state.comment.mode === 'yes') {
        state.comment.value = state.comment.value.trim();
      }

      state.comment.confirmed = true;
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'editComment') {
      state.comment.confirmed = false;
      renderRsvp();
      scrollToBottom();
      return;
    }

    if (action === 'submitRsvp') {
      submitRsvp();
      return;
    }

    if (action === 'restartRsvp') {
      restartRsvp();
    }
  });

  renderRsvp();
}

initRsvpScreen();