/* Fliesen-Licina: Navigation, Hero-Film, Reveals, Referenzen, Vorher/Nachher-Slider, Kundenvideo, FAQ, mehrstufige Anfrage, Danke-Popup, Parallaxe. */
(function () {
  'use strict';
  var d = document, html = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* Jahr im Footer */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* Header: nur Schatten/Linie einblenden, Höhe bleibt konstant */
  var nav = $('#nav');
  var wa = $('.wa');
  var formsSeen = 0;
  var onScroll = function () {
    if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);
    if (wa) wa.classList.toggle('is-on', window.scrollY > 120 && !formsSeen);
  };
  /* WhatsApp-Knopf ausblenden, solange ein Formular im Bild ist (lag sonst über Weiter/Absenden) */
  if (wa && 'IntersectionObserver' in window) {
    var fio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { x.target._seen = x.isIntersecting; });
      formsSeen = $$('form.form').filter(function (f) { return f._seen; }).length;
      onScroll();
    });
    $$('form.form').forEach(function (f) { fio.observe(f); });
  }
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  /* Aktiver Reiter: die Section, die gerade unter dem Header steht, markiert ihren Menüpunkt.
     Sections ohne eigenen Menüpunkt zählen zum passenden Nachbarn (Bewertungen zu Über uns usw.) */
  (function () {
    var links = $$('.nav__links a, .mmenu__in > a[href^="#"]');
    if (!links.length) return;
    var alias = { 'vorher-nachher': 'referenzen', bewertungen: 'ueber-uns' };
    var secs = $$('main > section[id]'), cur = null, tick = false;
    var update = function () {
      tick = false;
      var line = (nav ? nav.offsetHeight : 76) + innerHeight * 0.3, id = null;
      secs.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) id = sec.id; });
      if (id && alias[id]) id = alias[id];
      if (innerHeight + scrollY >= d.documentElement.scrollHeight - 4) id = 'kontakt';
      if (id === cur) return;
      cur = id;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  })();

  /* Mobilmenü */
  var burger = $('#burger'), mmenu = $('#mmenu');
  var menuOpen = false;
  function setMenu(open) {
    if (!burger || !mmenu || open === menuOpen) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    nav.classList.toggle('menu-open', open);
    html.style.overflow = open ? 'hidden' : '';
    if (open) { mmenu.hidden = false; void mmenu.offsetWidth; mmenu.classList.add('is-open'); }
    else { mmenu.classList.remove('is-open'); setTimeout(function () { if (!menuOpen) mmenu.hidden = true; }, 280); }
  }
  if (burger) burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  if (mmenu) mmenu.addEventListener('click', function (e) { if (e.target === mmenu || e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', function () { if (innerWidth >= 1100) setMenu(false); });

  /* Anker sanft scrollen (kein globales scroll-behavior) */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var t = d.getElementById(id.slice(1));
    if (!t) return;
    e.preventDefault();
    var y = t.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight : 0) + 1;
    window.scrollTo({ top: id === '#top' ? 0 : y, behavior: reduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* Reveals per IntersectionObserver (kein GSAP) */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
    /* Sicherheitsnetz: was beim Laden schon im Bild ist, sofort zeigen */
    requestAnimationFrame(function () {
      rv.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
    });
  } else {
    rv.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Hero-Film (Chef 07.10.: „videomäßig, hochwertig“): Kundenfotos im Trailer-Schnitt, gerendert mit _build/hero_film.py.
     Das Poster darunter ist das erste Filmbild, der Film wird erst sichtbar, wenn er wirklich läuft (playing + timeupdate, sonst Race mit defer).
     Lädt nach dem Seiten-Load, pausiert außerhalb des Bildschirms und im Hintergrund-Tab; bei reduzierter Bewegung oder Datensparmodus bleibt das Poster */
  (function (v) {
    if (!v) return;
    var nc = navigator.connection;
    if (reduce || (nc && nc.saveData)) return;
    var seen = true, started = false;
    var ready = function () { if (v.currentTime > 0 && !v.paused) v.classList.add('is-ready'); };
    v.addEventListener('playing', ready);
    v.addEventListener('timeupdate', ready);
    var run = function () {
      if (!started) return;
      if (seen && !d.hidden) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else v.pause();
    };
    var start = function () { started = true; v.preload = 'auto'; run(); };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; run(); }).observe(v);
    d.addEventListener('visibilitychange', run);
    if (d.readyState === 'complete') start(); else addEventListener('load', start);
  })($('[data-film]'));

  /* Erreichbarkeit (Mo bis Fr 7 bis 17 Uhr, Zeitzone Berlin, ohne gesetzliche Feiertage in Baden-Württemberg) */
  (function () {
    var els = $$('[data-status]');
    if (!els.length || !window.Intl) return;
    var parts = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        .formatToParts(new Date()).forEach(function (x) { parts[x.type] = x.value; });
    } catch (e) { return; }
    var today = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day)), h = (+parts.hour % 24) + (+parts.minute) / 60;
    var ostern = function (y) {   /* Gauß/Meeus */
      var a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        hh = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
      return Date.UTC(y, Math.floor((hh + l - 7 * m + 114) / 31) - 1, ((hh + l - 7 * m + 114) % 31) + 1);
    };
    var feiertag = function (t) {
      var x = new Date(t), y = x.getUTCFullYear(), md = (x.getUTCMonth() + 1) + '-' + x.getUTCDate(), o = ostern(y), tag = 864e5;
      return ['1-1', '1-6', '5-1', '10-3', '11-1', '12-25', '12-26'].indexOf(md) > -1 || [-2, 1, 39, 50, 60].some(function (n) { return t === o + n * tag; });
    };
    var arbeit = function (t) { var wd = new Date(t).getUTCDay(); return wd >= 1 && wd <= 5 && !feiertag(t); };
    var t0 = today.getTime(), work = arbeit(t0), open = work && h >= 7 && h < 17, txt;
    if (open) txt = 'Jetzt erreichbar, bis 17 Uhr';
    else if (work && h < 7) txt = 'Heute ab 7 Uhr erreichbar';
    else {
      var n = 1; while (n < 8 && !arbeit(t0 + n * 864e5)) n++;
      txt = n === 1 ? 'Morgen ab 7 Uhr erreichbar' : ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][new Date(t0 + n * 864e5).getUTCDay()] + ' ab 7 Uhr wieder erreichbar';
    }
    els.forEach(function (el) { el.classList.toggle('is-open', open); $('span', el).textContent = txt; });
  })();

  /* Referenzen */
  var gal = $('#gal');
  var items = gal ? $$('.gal__it', gal) : [];

  /* Referenzen: erst eingeklappt, „Mehr laden“ klappt auf (max-height von der eingeklappten auf die volle Höhe, danach frei) */
  var more = $('#gal-more');
  if (more && gal) more.addEventListener('click', function () {
    var from = gal.offsetHeight;
    gal.style.maxHeight = from + 'px';
    gal.classList.add('is-open', 'is-opening');
    more.parentNode.hidden = true;
    var full = gal.scrollHeight;
    if (reduce) { gal.classList.remove('is-opening'); gal.style.maxHeight = ''; return; }
    void gal.offsetHeight;
    gal.style.maxHeight = full + 'px';
    var done = function () { gal.classList.remove('is-opening'); gal.style.maxHeight = ''; gal.removeEventListener('transitionend', done); };
    gal.addEventListener('transitionend', done);
    setTimeout(done, 1000);
  });

  /* Lightbox */
  var lb = $('#lb');
  if (lb && items.length && typeof lb.showModal === 'function') {
    var lbImg = $('.lb__img', lb), lbCap = $('.lb__cap', lb), cur = 0;
    var vis = function () { return items.filter(function (it) { return !it.hidden; }); };
    var show = function (idx) {
      var list = vis(); if (!list.length) return;
      cur = (idx + list.length) % list.length;
      var it = list[cur], im = $('img', it);
      lbImg.src = it.getAttribute('data-full');
      lbImg.alt = im.alt;
      lbCap.textContent = im.alt + '  (' + (cur + 1) + ' / ' + list.length + ')';
    };
    items.forEach(function (it) {
      it.addEventListener('click', function () { show(vis().indexOf(it)); lb.showModal(); lb.focus({ preventScroll: true }); html.classList.add('lb-open'); });
    });
    $('.lb__prev', lb).addEventListener('click', function () { show(cur - 1); });
    $('.lb__next', lb).addEventListener('click', function () { show(cur + 1); });
    $('.lb__close', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('close', function () { html.classList.remove('lb-open'); lbImg.removeAttribute('src'); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  /* Vorher / Nachher-Slider */
  $$('[data-ba]').forEach(function (ba) {
    var range = $('.ba__range', ba), drag = false;
    var set = function (v) {
      v = Math.max(0, Math.min(100, v));
      ba.style.setProperty('--pos', v + '%');
      range.value = Math.round(v);
      ba.classList.toggle('hide-l', v < 16);
      ba.classList.toggle('hide-r', v > 84);
    };
    var fromX = function (x) { var r = ba.getBoundingClientRect(); set((x - r.left) / r.width * 100); };
    /* Maus: sofort ziehen. Finger: erst übernehmen, wenn waagerecht gewischt wird, sonst scrollt die Seite normal weiter */
    var start = null;
    ba.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') { drag = true; ba.classList.add('is-drag'); ba.setPointerCapture(e.pointerId); fromX(e.clientX); }
      else start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    ba.addEventListener('pointermove', function (e) {
      if (!drag && start && e.pointerId === start.id) {
        var dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
        if (dx > 6 && dx > dy) { drag = true; ba.classList.add('is-drag'); try { ba.setPointerCapture(e.pointerId); } catch (er) {} }
        else if (dy > 8) start = null;
      }
      if (drag) fromX(e.clientX);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { ba.addEventListener(ev, function () { drag = false; start = null; ba.classList.remove('is-drag'); }); });
    range.addEventListener('input', function () { set(+range.value); });
    /* einmal kurz anwackeln, wenn der Slider ins Bild kommt */
    if (!reduce && 'IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting || drag) return;
        io2.disconnect();
        var keys = [[0, 50], [450, 30], [1050, 70], [1550, 50]], t0 = performance.now();
        (function tick() {
          if (drag) return;
          var t = performance.now() - t0, k = 1;
          while (k < keys.length - 1 && t > keys[k][0]) k++;
          var a = keys[k - 1], b = keys[k], p = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
          p = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          set(a[1] + (b[1] - a[1]) * p);
          if (t < keys[keys.length - 1][0]) setTimeout(tick, 16);
        })();
      }, { threshold: 0.6 });
      io2.observe(ba);
    }
  });

  /* FAQ: eine Antwort offen, Nachbar schließt ohne Animation (kein Ruckeln) */
  $$('.faq__q').forEach(function (q) {
    q.addEventListener('click', function () {
      var it = q.closest('.faq__it'), open = !it.classList.contains('is-open');
      $$('.faq__it.is-open').forEach(function (o) {
        if (o === it) return;
        var a = $('.faq__a', o);
        a.classList.add('no-anim');
        o.classList.remove('is-open');
        $('.faq__q', o).setAttribute('aria-expanded', 'false');
        requestAnimationFrame(function () { requestAnimationFrame(function () { a.classList.remove('no-anim'); }); });
      });
      var top = q.getBoundingClientRect().top;
      it.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      var shift = q.getBoundingClientRect().top - top;
      if (Math.abs(shift) > 1) window.scrollBy(0, shift);
    });
  });

  /* Anfrage */
  var thx = $('#thx');
  var LIVE = /(^|\.)flicina\.de$/.test(location.hostname);
  var ENDPOINT = LIVE ? 'https://fliesen-licina.pages.dev/api/anfrage' : '';  // fester Endpunkt: läuft auf webhoster (statisch) und auf Cloudflare Pages
  function confetti(canvas) {
    if (reduce || !canvas.getContext) return;
    var ctx = canvas.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
    var W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
    var cols = ['#0064af', '#0064af', '#c3c8cd', '#c3c8cd', '#c3c8cd', '#111417'];
    var ps = [];
    for (var i = 0; i < 120; i++) {
      ps.push({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .42, vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 15 - 5) * dpr,
        s: (6 + Math.random() * 7) * dpr, r: Math.random() * 6.3, vr: (Math.random() - .5) * .3, c: cols[i % cols.length] });
    }
    var t0 = performance.now();
    (function tick(t) {
      var k = (t - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += .45 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 1.6) / 1.2);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        ctx.restore();
      });
      if (k < 2.9) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }
  function openThx(name, demo) {
    if (!thx || typeof thx.showModal !== 'function') { alert('Danke! Wir melden uns bei dir.'); return; }
    var first = (name || '').trim().split(/\s+/)[0];
    $('#thx-title').textContent = first ? 'Danke, ' + first + '!' : 'Danke!';
    $('.thx__demo', thx).hidden = !demo;
    thx.showModal();
    $('#thx-title').focus();
    confetti($('.thx__fx'));
  }
  if (thx) {
    $('[data-close]', thx).addEventListener('click', function () { thx.close(); });
    thx.addEventListener('close', function () {
      var f = thx._form;
      if (!f) return;
      /* nicht springen (Maxim 07.10.): nur scrollen, wenn das Formular nach dem Zurücksetzen über dem Bildschirm liegt */
      var off = (nav ? nav.offsetHeight : 76) + 12, top = f.getBoundingClientRect().top;
      if (top < off - 40) scrollTo({ top: scrollY + top - off, behavior: reduce ? 'auto' : 'smooth' });
      var q = $('.mstep.is-on .mstep__q', f) || $('input:not([type=hidden]):not([tabindex="-1"])', f);
      if (q) q.focus({ preventScroll: true });
    });
    thx.addEventListener('click', function (e) { if (e.target === thx) thx.close(); });
  }
  if (/[?&]danke\b/.test(location.search)) setTimeout(function () { openThx('Max', true); }, 400);

  /* Mehrstufiges Formular (Chef 05.10.: Karten statt Chips): Antippen wählt nur aus, weiter geht's per „Weiter“ (Maxim 07.10.), Fortschritt oben,
     Höhe ändert sich je Schritt, daher bei Bedarf sanft zum Formularanfang scrollen */
  $$('form[data-steps]').forEach(function (form) {
    var steps = $$('[data-step]', form), bars = $$('.mform__bar i', form), num = $('[data-step-num]', form);
    var back = $('[data-back]', form), next = $('[data-next]', form), nav = $('[data-nav]', form), sum = $('[data-sum]', form);
    var hdr = $('#nav'), cur = 0;
    var field = function (i) { return steps[i].getAttribute('data-field'); };
    var picked = function (i) { var f = field(i); return f ? form.querySelector('[name="' + f + '"]:checked') : true; };
    function sync() {
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); });
      bars.forEach(function (b, i) { b.classList.toggle('is-done', i <= cur); });
      num.textContent = cur + 1;
      form.setAttribute('data-cur', cur + 1);
      back.hidden = cur === 0;
      nav.hidden = cur === steps.length - 1;
      next.disabled = !picked(cur);
      if (cur !== steps.length - 1) return;
      sum.innerHTML = '';
      steps.forEach(function (s, i) {
        var el = field(i) && picked(i);
        if (!el) return;
        var t = el.closest('label').querySelector('.mcard__t, .mopt__t').firstChild.textContent.trim();
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = t; b.setAttribute('aria-label', t + ' ändern');
        b.addEventListener('click', function () { go(i); });
        sum.appendChild(b);
      });
    }
    function go(i) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      sync();
      var off = (hdr ? hdr.offsetHeight : 76) + 12, top = form.getBoundingClientRect().top;
      if (top < off || top > innerHeight * 0.55) scrollTo({ top: scrollY + top - off, behavior: reduce ? 'auto' : 'smooth' });
      var q = $('.mstep__q', steps[cur]);
      if (q) q.focus({ preventScroll: true });
    }
    form._goStep = function (el) { steps.forEach(function (s, i) { if (s.contains(el) && i !== cur) go(i); }); };
    form.addEventListener('change', function (e) {
      if (!e.target.closest('.mcard, .mopt')) return;
      $$('[name="' + e.target.name + '"]', form).forEach(function (r) { r.closest('label').classList.toggle('is-sel', r.checked); });
      steps[cur].classList.remove('is-invalid');
      next.disabled = false;
    });
    next.addEventListener('click', function () { if (picked(cur)) go(cur + 1); else steps[cur].classList.add('is-invalid'); });
    back.addEventListener('click', function () { go(cur - 1); });
    /* Enter in Schritt 1/2 sendet sonst implizit ab und überspringt den Zeitraum (QA 06.10.) */
    form.addEventListener('submit', function (e) {
      var miss = -1;
      steps.forEach(function (s, i) { if (miss < 0 && !picked(i)) miss = i; });
      if (cur < steps.length - 1 || miss >= 0) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (cur < steps.length - 1 && picked(cur)) go(cur + 1);
        else { var i = miss >= 0 ? miss : cur; go(i); steps[i].classList.add('is-invalid'); }
      }
    }, true);
    form.addEventListener('reset', function () {
      setTimeout(function () { $$('.is-sel', form).forEach(function (l) { l.classList.remove('is-sel'); }); cur = 0; sync(); }, 0);
    });
    sync();
  });

  $$('form.form').forEach(function (form) {
    var err = $('.form__err', form);
    form.addEventListener('input', function (e) { var el = e.target; if (el.classList) el.classList.remove('is-invalid'); });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'anliegen' && $('[data-field=anliegen]', form)) $('[data-field=anliegen]', form).classList.remove('is-invalid');
      if (e.target.name === 'einwilligung') $('.consent', form).classList.remove('is-invalid');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      if (form.elements.anliegen && !form.elements.anliegen.value) { $('[data-field=anliegen]', form).classList.add('is-invalid'); bad.push('Anliegen'); }
      ['name', 'telefon'].forEach(function (n) { var el = form.elements[n]; if (!el.value.trim()) { el.classList.add('is-invalid'); bad.push(n); } });
      var tel = form.elements.telefon.value.replace(/[^\d+]/g, '');
      if (form.elements.telefon.value.trim() && tel.length < 6) { form.elements.telefon.classList.add('is-invalid'); bad.push('telefon'); }
      var mail = form.elements.email.value.trim();
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { form.elements.email.classList.add('is-invalid'); bad.push('email'); }
      if (!form.elements.einwilligung.checked) { $('.consent', form).classList.add('is-invalid'); bad.push('einwilligung'); }
      if (bad.length) {
        err.textContent = 'Bitte prüfe die markierten Felder.';
        err.hidden = false;
        var firstBad = form.querySelector('[data-field].is-invalid input, [data-field].is-invalid select, input.is-invalid, .consent.is-invalid input');
        if (firstBad && form._goStep) form._goStep(firstBad);
        if (firstBad && firstBad.focus) firstBad.focus({ preventScroll: false });
        return;
      }
      err.hidden = true;
      var btn = form.querySelector('[type=submit]');
      var name = form.elements.name.value;
      if (thx) thx._form = form;
      if (!ENDPOINT) { form.reset(); openThx(name, true); return; }
      btn.disabled = true;
      var fd = new FormData(form);
      fd.append('quelle', location.href + ' (' + form.id + ')');
      fetch(ENDPOINT, { method: 'POST', body: fd })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.error || 'Fehler');
          form.reset(); openThx(name, false);
        })
        .catch(function () {
          err.textContent = 'Das hat leider nicht geklappt. Ruf uns gern direkt an: 07026 6049294.';
          err.hidden = false;
        })
        .then(function () { btn.disabled = false; });
    });
  });

  /* Kundenvideo (Terrasse): lädt kurz vor dem Sichtbereich und spielt stumm automatisch, sobald es sichtbar ist (Dustin 08.10.: immer sofort abspielen, kein Play-Button) */
  $$('[data-clip]').forEach(function (fig) {
    var v = $('video', fig);
    var load = function () { if (!v.poster) v.poster = v.getAttribute('data-poster'); if (!v.getAttribute('src')) v.src = v.getAttribute('data-src'); };
    var play = function () { load(); v.muted = true; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); };
    if (!('IntersectionObserver' in window)) { play(); return; }
    new IntersectionObserver(function (en) { if (en[0].isIntersecting) load(); }, { rootMargin: '400px 0px' }).observe(fig);
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) play(); else v.pause();
    }, { threshold: .25 }).observe(fig);
  });

  /* CTA-Banner: Parallaxe (Bild fest auf Bildschirmhöhe, Section schneidet per clip-path zu) */
  $$('[data-parallax]').forEach(function (bg) {
    var sec = bg.parentNode, loaded = false, on = false, ticking = false;
    var load = function () { if (!loaded) { loaded = true; bg.style.backgroundImage = 'url(' + bg.getAttribute('data-src') + ')'; } };
    var move = function () {
      ticking = false;
      if (reduce || !on) return;
      var r = sec.getBoundingClientRect(), p = (innerHeight - r.top) / (innerHeight + r.height);
      bg.style.transform = 'translate3d(0,' + ((0.5 - p) * 0.18 * innerHeight).toFixed(1) + 'px,0)';
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) load(); }, { rootMargin: '800px 0px' }).observe(sec);
      new IntersectionObserver(function (en) { on = en[0].isIntersecting; if (on) move(); }).observe(sec);
    } else { load(); on = true; }
    addEventListener('scroll', function () { if (on && !ticking) { ticking = true; requestAnimationFrame(move); } }, { passive: true });
    addEventListener('resize', move);
  });
})();

/* Premium-Hero: Diashow aus ganzen Kundenfotos. Bild 1 lädt sofort (LCP), die anderen nach dem Seiten-Load.
   Weiche Überblendung alle 5,5 s, pausiert außerhalb des Bildschirms und im Hintergrund-Tab; bei reduzierter Bewegung bleibt Bild 1 */
(function () {
  var box = document.querySelector('[data-show]');
  if (!box) return;
  var slides = Array.prototype.slice.call(box.querySelectorAll('.ph__slide'));
  var num = box.querySelector('[data-show-n]'), bar = box.querySelector('[data-show-bar]');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var i = 0, timer = null, seen = true, DUR = 5500;
  if (slides.length < 2) return;
  var load = function () {
    slides.forEach(function (f) {
      var img = f.querySelector('img');
      if (img.getAttribute('data-src')) { img.srcset = img.getAttribute('data-srcset'); img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); img.removeAttribute('data-srcset'); }
    });
  };
  var restartBar = function () {
    if (!bar) return;
    bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
  };
  var go = function (n) {
    var next = slides[n].querySelector('img');
    var show = function () {
      slides[i].classList.remove('is-on'); i = n; slides[i].classList.add('is-on');
      if (num) num.textContent = (i < 9 ? '0' : '') + (i + 1);
      restartBar();
    };
    if (next.complete && next.naturalWidth) show(); else next.addEventListener('load', show, { once: true });
  };
  var tick = function () { go((i + 1) % slides.length); };
  var run = function () {
    clearInterval(timer); timer = null;
    box.classList.toggle('is-paused', !(seen && !document.hidden));
    if (seen && !document.hidden) { restartBar(); timer = setInterval(tick, DUR); }
  };
  if (reduce) { box.classList.add('is-static'); return; }
  var start = function () {
    load();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; run(); }).observe(box);
    document.addEventListener('visibilitychange', run);
    run();
  };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();

