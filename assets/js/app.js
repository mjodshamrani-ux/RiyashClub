/* بعد اسمك · نادي رِياش — الصفحة واللقاءات */
(() => {
  'use strict';

  const C = window.RIYASH || {};
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const JOIN_GRACE_MIN = 60; // يبقى زر الدخول ظاهر ساعة بعد نهاية الوقت المعلن

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- التاريخ والوقت ---------- */
  function dateParts(dateStr) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    return { y, m, d, day: DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], month: MONTHS[m - 1] };
  }
  function to12(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return { t: `${h % 12 || 12}:${String(m || 0).padStart(2, '0')}`, pm: h >= 12 };
  }
  // "8:30 – 9:30 م" بنفس ترتيب البوسترات
  function timeRange(s) {
    const a = to12(s.start), b = to12(s.end);
    const sfx = (pm) => (pm ? 'م' : 'ص');
    return a.pm === b.pm ? `${a.t} – ${b.t} ${sfx(b.pm)}` : `${a.t} ${sfx(a.pm)} – ${b.t} ${sfx(b.pm)}`;
  }
  function offsetMs() {
    const m = /^([+-])(\d{2}):?(\d{2})$/.exec(C.utcOffset || '+03:00');
    if (!m) return 3 * 3600e3;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60e3;
  }
  function sessionTimes(s) {
    const off = C.utcOffset || '+03:00';
    return { start: new Date(`${s.date}T${s.start}:00${off}`), end: new Date(`${s.date}T${s.end}:00${off}`) };
  }
  function status(s, now = new Date()) {
    const { start, end } = sessionTimes(s);
    if (now >= end) return { k: 'done', label: 'انتهى' };
    if (now >= start) return { k: 'live', label: 'مباشر الآن' };
    const dayNum = (d) => Math.floor((d.getTime() + offsetMs()) / 864e5);
    const diff = dayNum(start) - dayNum(now);
    if (diff <= 0) { const st = to12(s.start); return { k: 'today', label: `اليوم ${st.t} ${st.pm ? 'م' : 'ص'}` }; }
    if (diff === 1) return { k: 'soon', label: 'بكرة' };
    if (diff === 2) return { k: 'soon', label: 'بعد يومين' };
    if (diff <= 10) return { k: 'soon', label: `بعد ${diff} أيام` };
    return { k: 'soon', label: `بعد ${diff} يومًا` };
  }

  // في خط Milan تتلاصق «فني» فتنقرأ «في»؛ الكشيدة بين الحروف توضّحها: «فـنـي»
  const milanFix = (t) => String(t ?? '').replace(/فن(?=[\u0620-\u064A])/g, 'فـنـ');
  const WA_ICON = '<svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg>';
  const channelUrl = () => C.whatsappChannel || '';

  // متاح لملف التذكرة
  window.RiyashUtil = { dateParts, timeRange, to12, esc, milanFix };

  /* ---------- مربعات الحروف ---------- */
  function tilesHTML(code, cls = 'tile') {
    return [...code].map((ch) => `<span class="${cls}">${esc(ch)}</span>`).join('');
  }
  function certTiles(certs) {
    return certs.map((c) => `<span class="tgroup">${tilesHTML(c)}</span>`).join('<span class="amp">&amp;</span>');
  }

  /* ---------- اللقاءات ---------- */
  const NUM_EN = ['01', '02', '03', '04', '05'];

  function guestHTML(g) {
    const media = g.photo
      ? `<div class="g-photo"><img src="${esc(g.photo)}" alt="${esc(g.name)}" loading="lazy" decoding="async"></div>`
      : `<div class="g-letters" aria-hidden="true">${tilesHTML(g.certs[0] || '')}</div>`;
    return `
      <div class="guest">
        <h4 class="g-name">${esc(g.name)}</h4>
        <div class="g-info">
          <div class="g-tiles" aria-label="${esc(g.certs.join(' و '))}">${certTiles(g.certs)}</div>
          <p class="g-role">${esc(g.role).replace(/ (\d)/g, '&nbsp;$1')}</p>
        </div>
        ${media}
      </div>`;
  }

  function mediaHTML(s) {
    return s.guests.map((g) => g.photo
      ? `<div class="g-photo"><img src="${esc(g.photo)}" alt="" loading="lazy" decoding="async"></div>`
      : `<div class="g-letters" aria-hidden="true">${tilesHTML(g.certs[0] || '')}</div>`).join('');
  }

  function sessionHTML(s, i) {
    const p = dateParts(s.date);
    const stamp = s.stamp
      ? `<div class="stamp" aria-hidden="true">${s.stamp.lines.map(esc).join('<br>')}<small>${esc(s.stamp.en)}</small></div>`
      : '';
    return `
      <article class="session reveal" id="session-${i + 1}" aria-labelledby="session-${i + 1}-title">
        ${stamp}
        <div class="s-head">
          <div class="s-num" aria-hidden="true">${i + 1}</div>
          <div class="s-when">
            <span class="s-day">${p.day}</span>
            <span class="s-date">${p.d} ${p.month}</span>
            <span class="s-time">${timeRange(s)}</span>
          </div>
        </div>
        <div class="s-main">
          <div class="s-meta"><span class="chip-slot" data-chip="${i}"></span><span class="mono label">LIVE ${NUM_EN[i]} / ${NUM_EN[C.sessions.length - 1]}</span></div>
          <h3 class="s-title" id="session-${i + 1}-title" aria-label="${esc(s.title)}">${esc(milanFix(s.title))}</h3>
          <div class="s-guests">${s.guests.map(guestHTML).join('')}</div>
          <div class="s-qs">
            <p class="s-qs-label">وش بنسأل</p>
            <ol>${s.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
          </div>
          <div class="s-foot" data-foot="${i}"></div>
        </div>
        <div class="s-media" aria-hidden="true">${mediaHTML(s)}</div>
      </article>`;
  }

  function footHTML(s, now) {
    const st = status(s, now);
    const { end } = sessionTimes(s);
    const pastGrace = now.getTime() > end.getTime() + JOIN_GRACE_MIN * 60e3;
    let action;
    if (pastGrace) action = `<span class="soon">انتهى اللقاء</span>`;
    else if (s.link) action = `<a class="btn btn-grad" href="${esc(s.link)}" target="_blank" rel="noopener">دخول اللقاء</a>`;
    else if (channelUrl()) action = `<a class="btn btn-grad btn-wa" href="${esc(channelUrl())}" target="_blank" rel="noopener">${WA_ICON}رابط اللقاء في قناة واتساب</a>`;
    else action = `<span class="soon">رابط اللقاء قريبًا</span>`;
    return action;
  }
  function chipHTML(s, now) {
    const st = status(s, now);
    return `<span class="chip is-${st.k}">${st.k === 'live' ? '<span class="pulse"></span>' : ''}${esc(st.label)}</span>`;
  }

  function renderSessions() {
    const list = $('#sessionsList');
    if (!list || !Array.isArray(C.sessions)) return;
    list.innerHTML = C.sessions.map(sessionHTML).join('');
    updateLive();
  }

  function updateLive() {
    const now = new Date();
    (C.sessions || []).forEach((s, i) => {
      const foot = document.querySelector(`[data-foot="${i}"]`);
      if (foot) foot.innerHTML = footHTML(s, now);
      const chip = document.querySelector(`[data-chip="${i}"]`);
      if (chip) chip.innerHTML = chipHTML(s, now);
      const card = document.getElementById(`session-${i + 1}`);
      if (card) card.classList.toggle('is-live', status(s, now).k === 'live');
    });
    renderNextUp(now);
  }

  function renderNextUp(now) {
    const el = $('#nextUp');
    if (!el || !C.sessions) return;
    const idx = C.sessions.findIndex((s) => sessionTimes(s).end > now);
    if (idx === -1) {
      el.innerHTML = `انتهت السلسلة. تابع <a href="${esc(channelUrl() || '#channel')}" target="_blank" rel="noopener">قناة رِياش</a> للفعاليات الجاية.`;
    } else {
      const s = C.sessions[idx];
      const st = status(s, now);
      const p = dateParts(s.date);
      el.innerHTML = st.k === 'live'
        ? `<span class="pulse"></span> مباشر الآن: <b>${esc(s.title)}</b> <a href="${esc(s.link || channelUrl() || '#session-' + (idx + 1))}" target="_blank" rel="noopener">${s.link ? 'ادخل' : 'الرابط في القناة'}</a>`
        : `اللقاء الجاي: <b>${p.day} ${p.d} ${p.month}</b> · ${timeRange(s)}`;
    }
    el.hidden = false;
  }

  /* ---------- قناة واتساب ---------- */
  function renderChannel() {
    const url = channelUrl();
    const box = $('#channelAction');
    if (box) {
      box.innerHTML = url
        ? `<a class="btn btn-grad btn-wa btn-lg" href="${esc(url)}" target="_blank" rel="noopener">${WA_ICON}تابع قناة رِياش</a>`
        : `<span class="soon">رابط القناة قريبًا</span>`;
    }
    // كل روابط «رابط اللقاء» في الصفحة تودّي للقناة
    if (url) {
      document.querySelectorAll('[data-wa]').forEach((a) => {
        a.href = url; a.target = '_blank'; a.rel = 'noopener';
      });
    }
  }

  function renderHandle() {
    const a = $('#footerHandle');
    if (a && C.xHandle) { a.href = `https://x.com/${C.xHandle}`; a.textContent = `@${C.xHandle}`; }
  }

  /* ---------- حروف المقدمة المتبدلة ---------- */
  const JITTER = [[-3, -7, -5], [4, -2, 4], [-2, -9, -2], [3, -4, 5], [-4, -6, -3]];
  function heroSlots() {
    const box = $('#heroSlots');
    if (!box) return;
    const order = ['CPA', 'SOCPA', 'CIA', 'CAT', 'VAT'];
    let i = 0;
    const build = (code) => {
      box.innerHTML = [...code].map((ch, k) => {
        const [dx, dy, dr] = JITTER[k % JITTER.length];
        return `<span class="slot"><span class="tile" style="--dx:${dx}px;--dy:${dy}px;--dr:${dr}deg;--d:${k * 70}ms">${ch}</span></span>`;
      }).join('');
    };
    build(order[0]);
    if (reduceMotion) return;
    setInterval(() => {
      if (document.hidden) return;
      box.querySelectorAll('.tile').forEach((t, k) => { t.style.setProperty('--d', `${k * 40}ms`); t.classList.add('out'); });
      setTimeout(() => { i = (i + 1) % order.length; build(order[i]); }, 420);
    }, 2800);
  }

  /* ---------- ظهور عند التمرير ---------- */
  function reveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------- الشريط المتحرك: نسخ كافية لتغطي الشاشات العريضة ---------- */
  function buildBand() {
    const track = document.querySelector('.band-track');
    if (!track) return;
    const unit = ['السبت', 'الأحد', 'الاثنين', '14 إلى 16 نوفمبر', 'عن بُعد']
      .map((t) => `<span>${t}</span><i>•</i>`).join('');
    track.innerHTML = unit.repeat(8); // نصفان متطابقان للحركة المستمرة
  }

  buildBand();
  renderSessions();
  renderChannel();
  renderHandle();
  heroSlots();
  reveal();
  setInterval(updateLive, 60e3);
})();
