/* بعد اسمك · نادي رِياش — التذكرة التفاعلية
   التذكرة تنرسم على Canvas بمقاس 1080×1350، والمعاينة هي نفسها الصورة اللي تنزل.
   ما فيه أي إرسال للبيانات: الاسم يبقى في المتصفح. */
(() => {
  'use strict';

  const C = window.RIYASH || {};
  const U = window.RiyashUtil;
  const canvas = document.getElementById('ticketCanvas');
  if (!canvas || !U) return;
  const ctx = canvas.getContext('2d');

  const W = 1080, H = 1350;
  const COL = {
    black: '#000000', card: '#0A0A10', line: '#2A2A35', white: '#FFFFFF', gray: '#A9A9B8', dim: '#5D5D70',
    blue: '#2E6BFF', purple: '#8A3FFC', pink: '#FF2E93', blueL: '#3D78FF', purpleL: '#A24BFF', ink: '#0A0A10'
  };
  const F = {
    swash: '"Lifta", "Milan", "Readex", serif',
    display: '"Milan", "Readex", serif',
    serif: '"Thmanyah", "Readex", serif',
    body: '"Readex", sans-serif',
    mono: '"PlexMono", monospace'
  };
  const CERT_ORDER = Object.keys(C.certs || {});
  const MAX_CERTS = 2;

  const state = { name: '', certs: [], changedAt: -1e9 };
  const assets = {};
  let ready = false;

  /* ================= أدوات رسم ================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const font = (w, size, fam) => `${w} ${size}px ${fam}`;

  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // بطاقة التذكرة بحزّتين على الجانبين عند خط القص
  function ticketPath(c, w, h, r, ny, nr) {
    c.beginPath();
    c.moveTo(r, 0);
    c.lineTo(w - r, 0); c.arcTo(w, 0, w, r, r);
    c.lineTo(w, ny - nr); c.arc(w, ny, nr, -Math.PI / 2, Math.PI / 2, true);
    c.lineTo(w, h - r); c.arcTo(w, h, w - r, h, r);
    c.lineTo(r, h); c.arcTo(0, h, 0, h - r, r);
    c.lineTo(0, ny + nr); c.arc(0, ny, nr, Math.PI / 2, -Math.PI / 2, true);
    c.lineTo(0, r); c.arcTo(0, 0, r, 0, r);
    c.closePath();
  }

  // تدرج رِياش: أزرق أسفل اليمين ← وردي أعلى اليسار
  function brandGrad(c, x, y, w, h) {
    const g = c.createLinearGradient(x + w, y + h, x, y);
    g.addColorStop(0, COL.blue); g.addColorStop(0.55, COL.purple); g.addColorStop(1, COL.pink);
    return g;
  }

  // نص لاتيني بتباعد حروف (يدوي لضمان نفس النتيجة في كل المتصفحات)
  function spaced(c, text, x, y, spacing, align = 'left') {
    c.save();
    c.direction = 'ltr'; c.textAlign = 'left';
    const chars = [...text];
    const widths = chars.map((ch) => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
    chars.forEach((ch, i) => { c.fillText(ch, cx, y); cx += widths[i] + spacing; });
    c.restore();
    return total;
  }

  function rtlText(c, text, x, y, align = 'right') {
    c.direction = 'rtl'; c.textAlign = align;
    c.fillText(text, x, y);
  }

  function fitSize(c, text, weight, fam, maxW, maxSize, minSize) {
    c.font = font(weight, 100, fam);
    const w100 = c.measureText(text).width || 1;
    return clamp(Math.floor((maxW / w100) * 100), minSize, maxSize);
  }

  /* ================= طبقات ثابتة ================= */
  function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function buildBackground() {
    const bg = makeCanvas(W, H);
    const c = bg.getContext('2d');
    c.fillStyle = COL.black; c.fillRect(0, 0, W, H);

    // توهج خافت بعيد عن الشعار
    let g = c.createRadialGradient(260, 760, 0, 260, 760, 720);
    g.addColorStop(0, 'rgba(138,63,252,0.30)'); g.addColorStop(1, 'rgba(138,63,252,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createRadialGradient(980, 1180, 0, 980, 1180, 520);
    g.addColorStop(0, 'rgba(255,46,147,0.14)'); g.addColorStop(1, 'rgba(255,46,147,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // خطوط رفيعة بميل الشعار (≈12°) تختفي نحو الوسط
    const lines = makeCanvas(W, H);
    const lc = lines.getContext('2d');
    lc.strokeStyle = 'rgba(255,255,255,0.09)'; lc.lineWidth = 1.2;
    const slope = Math.tan((12 * Math.PI) / 180);
    for (let y = -W * slope; y < H + 40; y += 24) {
      lc.beginPath(); lc.moveTo(0, y + W * slope); lc.lineTo(W, y); lc.stroke();
    }
    lc.globalCompositeOperation = 'destination-in';
    const m = lc.createRadialGradient(W / 2, H * 0.48, 120, W / 2, H * 0.48, 820);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.55, 'rgba(0,0,0,0.35)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    lc.fillStyle = m; lc.fillRect(0, 0, W, H);
    c.drawImage(lines, 0, 0);
    return bg;
  }

  function buildGrain(size = 220) {
    const t = makeCanvas(size, size);
    const c = t.getContext('2d');
    const img = c.createImageData(size, size);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 14;
    }
    c.putImageData(img, 0, 0);
    return t;
  }

  // ختم «الحروف تحت الدراسة» بملمس حبر
  function buildStamp() {
    const w = 300, h = 168;
    const s = makeCanvas(w, h);
    const c = s.getContext('2d');
    c.strokeStyle = COL.pink; c.fillStyle = COL.pink;
    c.lineWidth = 5; rrect(c, 6, 6, w - 12, h - 12, 14); c.stroke();
    c.lineWidth = 2.5; rrect(c, 18, 18, w - 36, h - 36, 8); c.stroke();
    c.font = font(900, 38, F.display);
    rtlText(c, 'الحروف', w / 2, 66, 'center');
    rtlText(c, 'تحت الدراسة', w / 2, 112, 'center');
    c.font = font(600, 15, F.mono);
    spaced(c, 'PENDING', w / 2, 140, 7, 'center');
    // ملمس الحبر
    c.globalCompositeOperation = 'destination-out';
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      c.globalAlpha = 0.25 + rnd() * 0.75;
      c.beginPath(); c.arc(rnd() * w, rnd() * h, rnd() * 1.6 + 0.3, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 5; i++) {
      c.globalAlpha = 0.18;
      c.fillRect(rnd() * w, rnd() * h, 40 + rnd() * 90, 1.5);
    }
    return s;
  }

  function loadImage(src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  async function loadFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const list = [
      ['400 100px "Lifta"', 'اسمك بعدي، ؟'],
      ['900 100px "Milan"', 'وش بعد اسمك؟ الحروف'],
      ['500 40px "Thmanyah"', 'بعد اسمك 14 نوفمبر'],
      ['700 40px "Readex"', 'CPA SOCPA &'],
      ['400 40px "Readex"', 'نوفمبر 14'],
      ['600 40px "Readex"', '@riyashclub لقاؤك 8:30 م'],
      ['600 20px "PlexMono"', 'LIVE ANSWER 0123']
    ];
    await Promise.all(list.map(([f, t]) => document.fonts.load(f, t).catch(() => null)));
  }

  /* ================= بيانات ================= */
  const sessions = (C.sessions || []).map((s) => ({ ...s, p: U.dateParts(s.date), range: U.timeRange(s) }));

  function certCodes() { return state.certs.slice(); }
  // اسم الشهادة/الشهادتين بالعربي: «الزمالة السعودية والأمريكية»
  function certLabel(codes) {
    const names = codes.map((k) => (C.certs[k] || {}).ar).filter(Boolean);
    if (names.length < 2) return names[0] || '';
    const [a, b] = names;
    const pa = a.split(' '), pb = b.split(' ');
    if (pa.length > 1 && pa[0] === pb[0]) return `${a} و${pb.slice(1).join(' ')}`;
    return `${a} و${b}`;
  }
  const milanFix = U.milanFix;
  function activeSessions() {
    const set = new Set(state.certs.map((k) => (C.certs[k] || {}).session).filter(Boolean));
    return set;
  }

  /* ================= رسم التذكرة ================= */
  const JIT = [[-5, -9, -4.5], [6, -3, 3.5], [-3, -11, -2.5], [5, -5, 4], [-6, -7, -3], [4, -10, 2.5], [-4, -4, -4], [5, -8, 3]];

  function draw(now, final = false) {
    const t = final ? 1e9 : now - state.changedAt;
    const c = ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(assets.bg, 0, 0);

    drawHeader(c);
    drawCard(c, t);
    drawRibbon(c);
    drawFooter(c);

    // حبيبات خفيفة فوق كل شيء
    c.globalAlpha = 1;
    c.fillStyle = assets.grainPattern; c.fillRect(0, 0, W, H);
    c.restore();
  }

  function drawHeader(c) {
    // الشعار يمين — نقي على الأسود، بدون أي تأثير
    if (assets.logo) {
      const lw = 128, lh = lw * (assets.logo.height / assets.logo.width);
      c.drawImage(assets.logo, W - 64 - lw, 52, lw, lh);
    }
    // يسار: LIVE 01 / 03  ▮▮▮  بعد اسمك
    const y = 112;
    c.fillStyle = COL.pink; c.font = font(600, 19, F.mono);
    let x = 64;
    x += spaced(c, 'LIVE', x, y, 6) + 18;
    c.fillStyle = COL.gray;
    x += spaced(c, '14—16 NOV', x, y, 5) + 24;
    // الأشرطة الثلاثة المائلة
    const bars = [COL.pink, COL.purpleL, COL.blueL];
    bars.forEach((col, i) => {
      c.save(); c.translate(x + i * 17, y - 26); c.transform(1, 0, -0.26, 1, 0, 0);
      c.fillStyle = col; rrect(c, 6, 0, 12, 30, 3); c.fill(); c.restore();
    });
    x += 3 * 17 + 22;
    c.fillStyle = COL.white; c.font = font(900, 40, F.display);
    c.direction = 'rtl'; c.textAlign = 'left';
    c.fillText('بعد اسمك', x, y + 2);
  }

  /* ---------- البطاقة ---------- */
  const CARD = { x: 64, y: 196, w: 952, h: 884, r: 26, perf: 650, notch: 26, rot: -1.4 };

  function drawCard(c, t) {
    const { x, y, w, h, r, perf, notch } = CARD;
    const cx = x + w / 2, cy = y + h / 2;

    // بطاقة التدرج خلف التذكرة
    c.save();
    c.translate(cx - 16, cy + 22); c.rotate((-3.4 * Math.PI) / 180); c.translate(-w / 2, -h / 2);
    ticketPath(c, w, h, r, perf, notch);
    c.fillStyle = brandGrad(c, 0, 0, w, h); c.fill();
    c.restore();

    c.save();
    c.translate(cx, cy); c.rotate((CARD.rot * Math.PI) / 180); c.translate(-w / 2, -h / 2);

    // الجسم
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
    ticketPath(c, w, h, r, perf, notch);
    c.fillStyle = COL.card; c.fill();
    c.restore();
    ticketPath(c, w, h, r, perf, notch);
    c.save(); c.clip();
    // لمعة علوية خفيفة
    const sheen = c.createLinearGradient(0, 0, 0, 260);
    sheen.addColorStop(0, 'rgba(255,255,255,0.045)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sheen; c.fillRect(0, 0, w, 260);
    c.restore();
    c.strokeStyle = COL.line; c.lineWidth = 2; ticketPath(c, w, h, r, perf, notch); c.stroke();

    const P = 58, R = w - P, L = P;

    // رأس البطاقة
    c.fillStyle = COL.white; c.font = font(900, 36, F.display);
    rtlText(c, 'وش بعد اسمك؟', R, 82);
    c.fillStyle = COL.dim; c.font = font(600, 16, F.mono);
    spaced(c, 'ANSWER SHEET', L, 76, 6);
    c.fillStyle = COL.line; c.fillRect(L, 108, R - L, 2);

    // ---------- الاسم + الحروف + الشرح ----------
    const name = state.name || 'اسمك';
    const codes = certCodes();
    c.font = font(400, 100, F.swash);
    const commaW100 = c.measureText('،').width;
    const S = fitSize(c, name, 400, F.swash, (R - L) - commaW100 * 0.75 - 30, 196, 72);
    const commaGap = Math.round(S * 0.11);

    // الحروف: مقاس المربع حسب عددها
    const letters = codes.length ? codes.join('') : '   ';
    const groups = codes.length || 1;
    const n = [...letters].length;
    const gapR = 0.13, ampR = 0.62, qR = 0.95;
    const unitsW = n + (n - groups) * gapR + (groups - 1) * (ampR + 2 * gapR) + gapR * 2.2 + qR;
    const ts = clamp(Math.floor((R - L) / unitsW), 60, 124);

    const nameBlock = S * 0.84;
    const below = Math.max(S * 0.32, 36) + 10;
    const infoH = 36 + 54 + 44;
    const blockH = nameBlock + below + ts + infoH;
    const top = clamp(122 + (perf - 26 - 122 - blockH) / 2, 122, 260);
    const yName = top + nameBlock;
    const yTiles = yName + below;
    const yInfo = yTiles + ts + 36;

    // سطر التعبئة المنقّط تحت الاسم
    c.save();
    c.strokeStyle = 'rgba(169,169,184,0.32)'; c.lineWidth = 3; c.setLineDash([2, 12]); c.lineCap = 'round';
    c.beginPath(); c.moveTo(L, yName + S * 0.16); c.lineTo(R, yName + S * 0.16); c.stroke();
    c.restore();

    // الاسم
    c.font = font(400, S, F.swash);
    c.fillStyle = state.name ? COL.white : '#3b3b4a';
    rtlText(c, name, R, yName);
    const nameW = c.measureText(name).width;
    // الفاصلة الوردية
    c.fillStyle = COL.pink; c.font = font(400, Math.round(S * 0.75), F.swash);
    rtlText(c, '،', R - nameW - commaGap, yName);

    // صف الحروف (يمين ← يسار: مربعات ثم ؟)
    drawTiles(c, codes, ts, R, yTiles, t, gapR, ampR, qR);

    // الشرح
    const label = codes.length ? milanFix(certLabel(codes)) : 'حروفك هنا';
    const line = codes.length === 0 ? 'اختر شهادتك وتتعبى المربعات.'
      : codes.length === 1 ? (C.certs[codes[0]] || {}).line : (C.comboLine || '');
    c.fillStyle = codes.length ? COL.white : COL.dim;
    const lS = fitSize(c, label, 900, F.display, R - L, 46, 30);
    c.font = font(900, lS, F.display);
    rtlText(c, label, R, yInfo + 20);
    c.fillStyle = COL.gray;
    const wS = fitSize(c, line, 500, F.serif, R - L, 34, 24);
    c.font = font(500, wS, F.serif);
    rtlText(c, line, R, yInfo + 20 + 58);

    // ---------- خط القص ----------
    c.save();
    c.strokeStyle = '#34343f'; c.lineWidth = 2.5; c.setLineDash([12, 10]);
    c.beginPath(); c.moveTo(notch + 14, perf); c.lineTo(w - notch - 14, perf); c.stroke();
    c.restore();

    drawStub(c, w, h, perf, P);
    // الختم فوق خط القص
    drawStamp(c, t, codes.length > 0, L + 128, perf + 30, 0.86);

    c.restore();
  }

  function drawTiles(c, codes, ts, R, y, t, gapR, ampR, qR) {
    const gap = ts * gapR;
    const items = [];
    if (codes.length) {
      codes.forEach((code, gi) => {
        if (gi > 0) items.push({ type: 'amp' });
        [...code].forEach((ch) => items.push({ type: 'tile', ch }));
      });
    } else {
      items.push({ type: 'slot' }, { type: 'slot' }, { type: 'slot' });
    }
    // العرض الكلي للمربعات (من اليسار لليمين)
    const wOf = (it) => (it.type === 'amp' ? ts * ampR : ts);
    let total = 0;
    items.forEach((it, i) => { total += wOf(it) + (i ? gap : 0); });
    let x = R - total;
    const qX = x - gap * 2.2 - ts * qR;

    let tileIdx = 0;
    items.forEach((it, i) => {
      if (i) x += gap;
      const w = wOf(it);
      if (it.type === 'amp') {
        c.fillStyle = COL.gray; c.font = font(700, Math.round(ts * 0.52), F.body);
        c.direction = 'ltr'; c.textAlign = 'center';
        c.fillText('&', x + w / 2, y + ts * 0.68);
      } else {
        // الخانة المنقطة (مكان الحرف)
        c.save();
        c.strokeStyle = 'rgba(169,169,184,0.5)'; c.lineWidth = 3; c.setLineDash([9, 8]);
        rrect(c, x, y, ts, ts, ts * 0.2); c.stroke();
        c.restore();
        if (it.type === 'tile') drawTile(c, it.ch, x, y, ts, tileIdx++, t);
      }
      x += w;
    });

    // علامة الاستفهام
    const qp = clamp((t - (tileIdx * 70 + 120)) / 520, 0, 1);
    const qe = easeOutBack(qp);
    c.save();
    c.translate(qX + ts * qR * 0.5, y + ts);
    c.rotate(((-11 + (1 - qe) * 25) * Math.PI) / 180);
    c.scale(0.6 + 0.4 * qe, 0.6 + 0.4 * qe);
    c.globalAlpha = codes.length ? clamp(qp * 3, 0, 1) : 0.55;
    const qs = Math.round(ts * 1.55);
    c.font = font(900, qs, F.display);
    c.direction = 'rtl'; c.textAlign = 'center';
    const qg = c.createLinearGradient(-qs * 0.4, -qs, qs * 0.4, 0);
    qg.addColorStop(0, COL.pink); qg.addColorStop(1, COL.purpleL);
    c.fillStyle = codes.length ? qg : COL.dim;
    c.fillText('؟', 0, -ts * 0.04);
    c.restore();
    return qX;
  }

  function drawTile(c, ch, x, y, ts, i, t) {
    const [dx, dy, dr] = JIT[i % JIT.length];
    const p = clamp((t - i * 70) / 520, 0, 1);
    if (p <= 0) return;
    const e = easeOutBack(p);
    const k = ts / 110;
    c.save();
    c.translate(x + ts / 2 + dx * k, y + ts / 2 + dy * k - (1 - e) * 150);
    c.rotate(((dr + (1 - e) * -22) * Math.PI) / 180);
    c.globalAlpha = clamp(p * 2.5, 0, 1);
    // ظل
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = ts * 0.22; c.shadowOffsetY = ts * 0.1;
    rrect(c, -ts / 2, -ts / 2, ts, ts, ts * 0.2);
    c.fillStyle = brandGrad(c, -ts / 2, -ts / 2, ts, ts); c.fill();
    c.restore();
    // لمعة الحافة العليا
    c.save();
    rrect(c, -ts / 2, -ts / 2, ts, ts, ts * 0.2); c.clip();
    const hl = c.createLinearGradient(0, -ts / 2, 0, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hl; c.fillRect(-ts / 2, -ts / 2, ts, ts / 2);
    c.restore();
    // الحرف
    c.fillStyle = COL.white; c.font = font(700, Math.round(ts * 0.5), F.body);
    c.direction = 'ltr'; c.textAlign = 'center';
    const m = c.measureText(ch);
    const asc = m.actualBoundingBoxAscent || ts * 0.36;
    const desc = m.actualBoundingBoxDescent || 0;
    c.fillText(ch, 0, (asc - desc) / 2);
    c.restore();
  }

  function drawStamp(c, t, on, cx, cy, size = 1) {
    if (!on) return;
    const s = assets.stamp;
    const delay = state.certs.join('').length * 70 + 380;
    const p = clamp((t - delay) / 260, 0, 1);
    if (p <= 0) return;
    const e = easeOutCubic(p);
    c.save();
    c.translate(cx, cy);
    c.rotate((-9 * Math.PI) / 180);
    const sc = (1.45 - 0.45 * e) * size;
    c.scale(sc, sc);
    c.globalAlpha = 0.95 * e;
    c.drawImage(s, -s.width / 2, -s.height / 2);
    c.restore();
  }

  /* ---------- الجزء السفلي: اللقاءات كنموذج إجابة ---------- */
  function drawStub(c, w, h, perf, P) {
    const act = activeSessions();
    const R = w - P;
    const top = perf + 34;
    c.fillStyle = act.size ? COL.pink : COL.dim;
    c.font = font(600, 22, F.body);
    rtlText(c, act.size > 1 ? 'لقاءاتك' : act.size ? 'لقاؤك' : 'اللقاءات', R, top + 22);
    c.fillStyle = COL.dim; c.font = font(600, 14, F.mono);
    spaced(c, 'LIVE · REMOTE', R - 120, top + 18, 4, 'right');

    const cellW = 182;
    const n = sessions.length;
    sessions.forEach((s, i) => {
      const on = act.has(i + 1);
      const right = R - i * cellW;
      const y0 = top + 52;
      // فقاعة الإجابة
      const br = 25, bx = right - br, by = y0 + br;
      c.beginPath(); c.arc(bx, by, br, 0, Math.PI * 2);
      if (on) { c.fillStyle = brandGrad(c, bx - br, by - br, br * 2, br * 2); c.fill(); }
      else { c.strokeStyle = '#3a3a4a'; c.lineWidth = 3; c.stroke(); }
      c.fillStyle = on ? COL.white : COL.dim; c.font = font(700, 24, F.body);
      c.direction = 'ltr'; c.textAlign = 'center'; c.fillText(String(i + 1), bx, by + 9);

      c.fillStyle = on ? COL.white : COL.dim; c.font = font(900, 30, F.display);
      rtlText(c, s.p.day, right - br * 2 - 12, by + 10);
      c.fillStyle = on ? COL.gray : '#4a4a5a'; c.font = font(400, 22, F.body);
      rtlText(c, `${s.p.d} ${s.p.month}`, right, y0 + 92);
      c.fillStyle = on ? COL.pink : '#4a4a5a'; c.font = font(600, 21, F.body);
      rtlText(c, s.range, right, y0 + 126);

      if (i < n - 1) {
        c.fillStyle = COL.line; c.fillRect(right - cellW + 14, y0 + 4, 1.5, 128);
      }
    });
  }

  /* ---------- الشريط المائل ---------- */
  function drawRibbon(c) {
    const codes = certCodes();
    const certStr = codes.length ? `${codes.join(' & ')}؟` : 'وش حروفك؟';
    const items = [state.name || 'اسمك', certStr, 'بعد اسمك', '14 إلى 16 نوفمبر', 'عن بُعد'];
    const cy = 1176, bh = 86;
    c.save();
    c.translate(W / 2, cy); c.rotate((-3.6 * Math.PI) / 180);
    const bw = W + 260;
    const g = c.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    g.addColorStop(0, COL.blueL); g.addColorStop(0.5, COL.purpleL); g.addColorStop(1, COL.pink);
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
    c.fillStyle = g; c.fillRect(-bw / 2, -bh / 2, bw, bh);
    c.shadowColor = 'transparent';
    c.beginPath(); c.rect(-bw / 2, -bh / 2, bw, bh); c.clip();
    c.fillStyle = COL.ink; c.font = font(500, 40, F.serif);
    c.direction = 'rtl'; c.textAlign = 'right';
    // كل عنصر يُرسم لوحده عشان ما يختلط ترتيب العربي واللاتيني
    const sep = 64;
    let x = W / 2 - 70, k = 0;
    c.beginPath(); c.arc(x + sep / 2, 0, 5, 0, Math.PI * 2); c.fill();
    while (x > -bw / 2 && k < 40) {
      const it = items[k % items.length];
      c.fillText(it, x, 14);
      x -= c.measureText(it).width + sep / 2;
      c.beginPath(); c.arc(x, 0, 5, 0, Math.PI * 2); c.fill();
      x -= sep / 2;
      k++;
    }
    c.restore();
  }

  /* ---------- التذييل ---------- */
  function drawFooter(c) {
    const y = 1290;
    c.fillStyle = COL.gray; c.font = font(600, 32, F.body);
    c.direction = 'ltr'; c.textAlign = 'right';
    c.fillText(`@${C.xHandle || 'riyashclub'}`, W - 64, y + 10);

    if (assets.partners) {
      const pw = 236, ph = pw * (assets.partners.height / assets.partners.width);
      c.save(); c.translate(64 + pw / 2, y - 4); c.rotate((-1.2 * Math.PI) / 180);
      c.drawImage(assets.partners, -pw / 2, -ph / 2, pw, ph);
      c.restore();
      c.fillStyle = COL.dim; c.font = font(400, 20, F.body);
      rtlText(c, 'بالشراكة مع', 64 + pw + 24 + 104, y + 2, 'right');
    }
  }

  /* ================= الحلقة ================= */
  let raf = 0;
  function animating(now) {
    const n = state.certs.join('').length;
    return now - state.changedAt < n * 70 + 1200;
  }
  function loop(now) {
    draw(now);
    raf = animating(now) ? requestAnimationFrame(loop) : 0;
  }
  function render(animate = false) {
    if (!ready) return;
    if (animate) state.changedAt = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /* ================= الواجهة ================= */
  const nameInput = document.getElementById('nameInput');
  const picker = document.getElementById('certPicker');
  const form = document.getElementById('ticketForm');
  const btnDownload = document.getElementById('btnDownload');
  const btnShare = document.getElementById('btnShare');
  const btnX = document.getElementById('btnX');
  const btnCopy = document.getElementById('btnCopy');
  const toastEl = document.getElementById('toast');

  function cleanName(v) {
    return String(v || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 18);
  }

  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.textContent = ''; }, 4200);
  }

  function updateAria() {
    const codes = certCodes();
    const label = `تذكرة: ${state.name || 'بدون اسم'}${codes.length ? '، ' + codes.join(' و ') + '؟' : ''} — الحروف تحت الدراسة`;
    canvas.setAttribute('aria-label', label);
    form.classList.toggle('needs-input', !(state.name && codes.length));
  }

  function buildPicker() {
    picker.innerHTML = CERT_ORDER.map((k) => {
      const cfg = C.certs[k];
      return `<button type="button" class="cert-btn" data-cert="${k}" aria-pressed="false" aria-label="${k} — ${U.esc(cfg.ar)}">
        <span class="mini" aria-hidden="true">${[...k].map((ch) => `<span>${ch}</span>`).join('')}</span>
        <span class="ar">${U.esc(cfg.ar)}</span>
      </button>`;
    }).join('');
    picker.addEventListener('click', (e) => {
      const b = e.target.closest('.cert-btn');
      if (!b) return;
      const k = b.dataset.cert;
      const i = state.certs.indexOf(k);
      if (i >= 0) state.certs.splice(i, 1);
      else {
        state.certs.push(k);
        if (state.certs.length > MAX_CERTS) state.certs.shift();
      }
      syncPicker();
      updateAria();
      render(true);
    });
  }
  function syncPicker() {
    picker.querySelectorAll('.cert-btn').forEach((b) => b.setAttribute('aria-pressed', String(state.certs.includes(b.dataset.cert))));
  }

  nameInput.addEventListener('input', () => {
    state.name = cleanName(nameInput.value);
    updateAria();
    render(false);
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); nameInput.blur(); });

  /* ---------- النشر ---------- */
  function siteUrl() {
    if (C.siteUrl) return C.siteUrl;
    return location.origin && location.origin !== 'null' ? location.origin + location.pathname : '';
  }
  function tweetText() {
    const codes = certCodes();
    const handle = C.xHandle || 'riyashclub';
    return `بعد اسمي: ${codes.join(' & ')}؟ والحروف تحت الدراسة.\n«بعد اسمك» من @${handle}: 3 لقاءات مباشرة عن الشهادات المهنية، 14 إلى 16 نوفمبر.`;
  }

  function guard() {
    if (!ready) { toast('لحظة، التذكرة تتجهز…'); return false; }
    if (!state.name) { toast('اكتب اسمك أول.'); nameInput.focus(); return false; }
    if (!state.certs.length) { toast('اختر الحروف اللي ناوي عليها.'); picker.querySelector('.cert-btn')?.focus(); return false; }
    return true;
  }

  function exportBlob() {
    draw(0, true); // الحالة النهائية بدون حركة
    return new Promise((res) => canvas.toBlob((b) => { res(b); render(false); }, 'image/png'));
  }
  function fileName() { return `riyash-ba3d-ismak-${certCodes().join('-').toLowerCase()}.png`; }

  const inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|Twitter|musical_ly|Bytedance/i.test(navigator.userAgent);

  function showSaveSheet(url) {
    const wrap = document.createElement('div');
    wrap.className = 'save-sheet';
    wrap.innerHTML = `<div class="save-box" role="dialog" aria-modal="true" aria-label="حفظ التذكرة">
      <p>اضغط مطولًا على الصورة واختر «حفظ الصورة».</p>
      <img src="${url}" alt="تذكرتك">
      <button type="button" class="btn btn-ghost">إغلاق</button></div>`;
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); };
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('button')) close(); });
  }

  btnDownload.addEventListener('click', async () => {
    if (!guard()) return;
    const blob = await exportBlob();
    if (!blob) { toast('ما قدرنا نجهز الصورة، جرّب مرة ثانية.'); return; }
    if (inApp) { showSaveSheet(canvas.toDataURL('image/png')); render(false); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('نزلت التذكرة. أرفقها مع تغريدتك.');
  });

  // مشاركة الصورة عبر واجهة الجهاز (الجوال غالبًا)
  let canShareFiles = false;
  try {
    canShareFiles = !!(navigator.canShare && navigator.share &&
      navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 't.png', { type: 'image/png' })] }));
  } catch (_) { canShareFiles = false; }
  if (canShareFiles) btnShare.hidden = false;

  btnShare.addEventListener('click', async () => {
    if (!guard()) return;
    const blob = await exportBlob();
    if (!blob) return;
    const file = new File([blob], fileName(), { type: 'image/png' });
    const url = siteUrl();
    try {
      await navigator.share({ files: [file], text: url ? `${tweetText()}\n${url}` : tweetText() });
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('المشاركة ما زبطت. نزّل الصورة وانسخ النص بدالها.');
    }
  });

  btnX.addEventListener('click', () => {
    if (!guard()) return;
    const params = new URLSearchParams({ text: tweetText() });
    const url = siteUrl();
    if (url) params.set('url', url);
    window.open(`https://x.com/intent/tweet?${params.toString()}`, '_blank', 'noopener');
    toast('تذكير: X ما يرفق الصورة تلقائيًا، أرفقها بنفسك.');
  });

  btnCopy.addEventListener('click', async () => {
    if (!guard()) return;
    const url = siteUrl();
    const text = url ? `${tweetText()}\n${url}` : tweetText();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
      ta.remove();
    }
    toast(ok ? 'نسخنا النص.' : 'ما قدرنا ننسخ، انسخه يدويًا.');
  });

  /* ================= البداية ================= */
  async function init() {
    buildPicker();
    updateAria();
    const [logo, partners] = await Promise.all([
      loadImage('assets/img/logo.png'),
      loadImage('assets/img/partners.png'),
      loadFonts()
    ]);
    assets.logo = logo;
    assets.partners = partners;
    assets.bg = buildBackground();
    assets.grainPattern = ctx.createPattern(buildGrain(), 'repeat');
    assets.stamp = buildStamp();
    ready = true;
    document.getElementById('ticketLoading')?.classList.add('hide');
    draw(performance.now(), true);
  }

  // للاختبار والتطوير: window.__ticket.set('سارة', ['CPA'])
  window.__ticket = {
    set(name, certs) { nameInput.value = name; state.name = cleanName(name); state.certs = certs.slice(0, MAX_CERTS); syncPicker(); updateAria(); render(true); },
    final() { draw(0, true); }
  };

  init();
})();
