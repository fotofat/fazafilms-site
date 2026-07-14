// ===== ФАЗА — интерактив сайта =====
// порядок портфолио: закреплённые (pin, по возрастанию) первыми, дальше НОВЫЕ проекты первыми (vimeo-id растёт со временем → сорт по убыванию)
// прототип страниц проекта — пока сделаны только эти 4, у них своя страница (work/<id>.html) вместо ссылки на Vimeo
const PAGES = new Set(['1144082517', '1147611345', '1193108997', '996181872']);
// ВРЕМЕННО: портфолио ограничено этими же 4 карточками, чтобы обкатать формат страницы проекта,
// прежде чем разворачивать на все 253. Убрать .slice(0, 4), когда решим делать страницы для всех.
const SEL = (window.SELECTION || []).slice().sort((a, b) => {
  const pa = a.pin ?? Infinity, pb = b.pin ?? Infinity;
  if (pa !== pb) return pa - pb;
  return Number(b.id) - Number(a.id);
}).slice(0, 4);
const grid = document.getElementById('grid');
const moreBtn = document.getElementById('moreBtn');
const filters = document.getElementById('filters');
const countEl = document.getElementById('worksCount');
const BATCH = window.innerWidth < 700 ? 9 : 24;
let curFilter = 'all', shown = 0;

const esc = t => (t || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const filtered = () => curFilter === 'all' ? SEL : SEL.filter(s => s.cat === curFilter);

function cardHTML(s) {
  const webp = s.poster.replace(/\.jpg$/, '.webp');
  const hasPage = PAGES.has(String(s.id));
  const href = hasPage ? `work/${s.id}.html` : s.vimeo;
  const linkAttrs = hasPage ? '' : ' target="_blank" rel="noopener"';
  return `<a class="card" data-cat="${s.cat}" href="${href}"${linkAttrs} title="${esc(s.title)}">
    <div class="card__media">
      <picture>
        <source srcset="${webp}" type="image/webp">
        <img class="card__img" loading="lazy" src="${s.poster}" alt="${esc(s.title)}" width="480" height="270">
      </picture>
      <video class="card__vid" muted loop playsinline preload="none" data-src="assets/previews/${s.id}.mp4"></video>
      <span class="card__play">▶</span>
    </div>
    <div class="card__body">
      <span class="card__cat">${esc(s.cat_ru)}</span>
      <h3 class="card__title">${esc(s.title)}</h3>
    </div>
  </a>`;
}

function render(reset) {
  const list = filtered();
  if (reset) { grid.innerHTML = ''; shown = 0; }
  grid.insertAdjacentHTML('beforeend', list.slice(shown, shown + BATCH).map(cardHTML).join(''));
  shown = Math.min(shown + BATCH, list.length);
  if (moreBtn) moreBtn.style.display = shown < list.length ? '' : 'none';
  if (countEl) countEl.textContent = list.length;
}

filters?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  filters.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
  btn.classList.add('is-active');
  curFilter = btn.dataset.filter;
  render(true);
});
moreBtn?.addEventListener('click', () => render(false));
if (grid) render(true);

// hover-видео на карточках (только устройства с мышью — десктоп)
if (grid && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
  grid.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.card'); if (!card) return;
    const v = card.querySelector('.card__vid'); if (!v) return;
    if (!v.src && v.dataset.src) v.src = v.dataset.src;  // лениво — только при наведении
    v.play().catch(() => {});
  });
  grid.addEventListener('mouseout', (e) => {
    const card = e.target.closest('.card'); if (!card) return;
    if (e.relatedTarget && card.contains(e.relatedTarget)) return;
    const v = card.querySelector('.card__vid');
    if (v && v.src) { try { v.pause(); v.currentTime = 0; } catch (_) {} }
  });
}

// ===== Hero: ротация шоурила (разный при каждом заходе) — НАТИВНОЕ видео на самом сайте =====
// Видео хостится у нас (assets/hero-<id>.mp4), а не на Vimeo — играет у всех,
// не зависит от доменных ограничений Vimeo и блокировок ТСПУ в РФ.
(function () {
  const bg = document.getElementById('heroBg');
  const vid = document.getElementById('heroVideo');
  if (!bg || !vid) return;

  // пул собственных веб-петель (каждый id имеет assets/hero-<id>.mp4 и постер assets/posters/<id>.webp)
  const POOL = ['1084907216', '1084907589', '1144082517'];
  // ротация по кругу через localStorage → повторный визит видит ДРУГОЙ
  let idx = 0;
  try {
    const prev = parseInt(localStorage.getItem('faza_hero_i') || '-1', 10);
    idx = (isNaN(prev) ? -1 : prev) + 1;
    if (idx >= POOL.length) idx = 0;
    localStorage.setItem('faza_hero_i', String(idx));
  } catch (e) { idx = Math.floor((Date.now() / 1000) % POOL.length); }
  const id = POOL[idx];
  bg.dataset.reel = id;

  // постер выбранного ролика (с фолбэком, чтобы не было битой картинки)
  const poster = bg.querySelector('.hero__poster');
  const img = new Image();
  img.onload = () => { if (poster) poster.src = img.src; vid.poster = img.src; };
  img.src = 'assets/posters/' + id + '.webp';

  // экономия трафика / reduce-motion / очень медленная сеть → остаёмся на лёгком постере
  const conn = navigator.connection || {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      conn.saveData || /(^|\W)(2g|slow-2g)(\W|$)/.test(conn.effectiveType || '')) return;

  // источник + воспроизведение (muted+playsinline → autoplay разрешён везде, в т.ч. на мобильных)
  vid.muted = true; vid.defaultMuted = true; vid.setAttribute('muted', '');
  vid.src = 'assets/hero-' + id + '.mp4';
  const tryplay = () => { const p = vid.play(); if (p && p.catch) p.catch(() => {}); };
  vid.addEventListener('canplay', () => { vid.style.opacity = '1'; tryplay(); }, { once: true });
  vid.addEventListener('loadeddata', tryplay, { once: true });
  if ('requestIdleCallback' in window) requestIdleCallback(tryplay, { timeout: 1500 });
  else window.addEventListener('load', () => setTimeout(tryplay, 300));
})();

// ===== Бургер-меню (мобильное) =====
const burger = document.getElementById('burger');
const menu = document.querySelector('.nav__menu');
burger?.addEventListener('click', () => {
  const open = menu.style.display === 'flex';
  menu.style.display = open ? '' : 'flex';
  Object.assign(menu.style, open ? {} : {
    position: 'absolute', top: '64px', left: '0', right: '0',
    flexDirection: 'column', background: 'rgba(11,11,13,.97)',
    padding: '20px 28px', borderBottom: '1px solid #26262d'
  });
});
menu?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => { if (window.innerWidth <= 900) menu.style.display = ''; })
);

// ===== Плавное появление секций =====
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.style.opacity = 1; en.target.style.transform = 'none';
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.1 });
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.section').forEach(el => {
    el.style.opacity = 0; el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .7s ease, transform .7s ease';
    io.observe(el);
  });
}

// ===== Форма «Расскажите о задаче»: текст + голос → бриф, капча, анти-спам =====
(function () {
  const form = document.getElementById('briefForm');
  if (!form) return;
  const API = 'https://panel.fazafilms.ru';
  const note = document.getElementById('briefNote');
  const aState = document.getElementById('audioState');
  const recBtn = document.getElementById('recBtn');
  let capToken = '', audioBlob = null, mediaRec = null, chunks = [];

  async function loadCap() {
    try { const c = await (await fetch(API + '/api/captcha')).json();
      document.getElementById('capQ').textContent = c.q + ' ='; capToken = c.token;
    } catch (e) { document.getElementById('capQ').textContent = 'не загрузилось'; capToken = ''; }
  }
  loadCap();

  recBtn.addEventListener('click', async () => {
    if (mediaRec && mediaRec.state === 'recording') { mediaRec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mediaRec.onstop = () => {
        audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        recBtn.textContent = '🎤 Записать заново'; recBtn.classList.remove('rec');
        aState.textContent = '🎙 запись прикреплена (' + Math.round(audioBlob.size / 1024) + ' КБ)';
      };
      mediaRec.start(); recBtn.textContent = '⏹ Остановить'; recBtn.classList.add('rec');
      aState.textContent = '● идёт запись…';
    } catch (e) { aState.textContent = 'Микрофон недоступен — прикрепите файл'; }
  });

  document.getElementById('audioInput').addEventListener('change', e => {
    const f = e.target.files[0]; if (f) { audioBlob = f; aState.textContent = '📎 ' + f.name; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('briefSubmit');
    if (!form.contact.value.trim() || (!form.text.value.trim() && !audioBlob)) {
      note.textContent = 'Укажите контакт и задачу — текстом или голосом.'; return;
    }
    const fd = new FormData();
    fd.append('name', form.name.value || '');
    fd.append('contact', form.contact.value || '');
    fd.append('text', form.text.value || '');
    fd.append('captcha', form.captcha.value || '');
    fd.append('captcha_token', capToken);
    fd.append('website', document.getElementById('hpField').value || '');
    if (audioBlob) fd.append('audio', audioBlob, audioBlob.name || 'voice.webm');
    btn.disabled = true; note.textContent = 'Отправляем…';
    try {
      const r = await fetch(API + '/api/brief', { method: 'POST', body: fd });
      if (r.ok) {
        note.textContent = '✅ Спасибо! Заявка получена — свяжемся в течение рабочего дня.';
        form.reset(); audioBlob = null; aState.textContent = '';
        recBtn.textContent = '🎤 Записать голосом'; loadCap();
      } else {
        note.textContent = r.status === 400 ? '⚠️ Проверьте ответ на пример и заполните контакт.'
          : (r.status === 429 ? '⚠️ Слишком много заявок — попробуйте позже.' : '⚠️ Не удалось отправить, попробуйте ещё раз.');
        loadCap();
      }
    } catch (e) { note.textContent = '⚠️ Нет связи. Напишите на project@fazafilms.ru'; }
    btn.disabled = false;
  });
})();
