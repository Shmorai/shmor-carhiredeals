/* Shmor site kit: menu toggle + on-site search (pages are found via /search-index.json) */
(function () {
  'use strict';
  var btn = document.querySelector('[data-menu]'), nav = document.querySelector('[data-nav]');
  if (btn && nav) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  var out = document.getElementById('search-results');
  if (!out) return;
  var q = (new URLSearchParams(location.search).get('q') || '').trim();
  var input = document.querySelector('.search input[name=q]');
  if (input) input.value = q;
  if (!q) return;
  var say = function (k, d) { return out.getAttribute('data-' + k) || d; }; // words in the site's language, set by the build
  document.getElementById('search-title').textContent = say('results', 'Results for “{q}”').replace('{q}', q);
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
  fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (pages) {
    var hits = pages.map(function (p) {
      var score = words.reduce(function (s, w) { return s + (p.terms.indexOf(w) > -1 ? 1 : 0); }, 0);
      return { p: p, score: score };
    }).filter(function (h) { return h.score > 0; }).sort(function (a, b) { return b.score - a.score; });
    out.innerHTML = hits.length
      ? hits.map(function (h) { return '<a class="card' + (h.p.img ? ' has-img' : '') + '" href="' + h.p.path + '">' + (h.p.img ? '<img class="card-img" src="' + esc(h.p.img) + '" alt="" loading="lazy" width="600" height="360">' : '') + '<h3>' + esc(h.p.title) + '</h3><p>' + esc(h.p.text) + '</p><span class="cta">' + esc(say('cta', 'Explore →')) + '</span></a>'; }).join('')
      : '<p class="empty">' + esc(say('empty', 'No pages matched. Try a broader search, or browse the guides below.')) + '</p>' +
        pages.slice(0, 6).map(function (p) { return '<a class="card" href="' + p.path + '"><h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></a>'; }).join('');
  }).catch(function () { out.innerHTML = '<p class="empty">' + esc(say('error', 'Search is unavailable right now.')) + '</p>'; });
})();

/* "specs" blocks with "tabs": filter the cards by data-tag (every card shows without JS) */
(function () {
  'use strict';
  document.querySelectorAll('[data-tabs]').forEach(function (bar) {
    var grid = bar.nextElementSibling;
    bar.hidden = false;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]');
      if (!b) return;
      var id = b.getAttribute('data-tab');
      bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      grid.querySelectorAll('[data-tag]').forEach(function (c) { c.hidden = id !== 'all' && c.getAttribute('data-tag') !== id; });
    });
  });
})();

/* CarHireDeals: search form defaults + /compare/ deep links (providers from shmor-site.json, embedded by tools/blocks.js) */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };
  var guessRegion = function () {
    var l = (navigator.language || 'en-US').toLowerCase();
    if (/-(gb|uk)$/.test(l)) return 'uk';
    if (/^en(-us)?$|-us$|-ca$/.test(l)) return 'us';
    return /^(fr|de|es|it|pt|nl|pl|sv|da|fi|el|cs|hu|ro|sk|sl|bg|hr|lt|lv|et|ga)|-ie$/.test(l) ? 'eu' : 'us';
  };
  var regionOk = function (r) { return r === 'us' || r === 'uk' || r === 'eu'; };

  // Every search form: dates default to a week from today for 3 days, region from the page/URL/browser
  var forms = document.querySelectorAll('form[data-compare]');
  forms.forEach(function (f) {
    var start = addDays(new Date(), 7);
    var inp = f.elements['in'], out = f.elements.out, q = f.elements.q;
    var today = iso(new Date());
    if (inp) { inp.min = today; inp.value = params.get('in') || iso(start); }
    if (out) { out.min = today; out.value = params.get('out') || iso(addDays(start, 3)); }
    ['t1', 't2', 'age'].forEach(function (k) { if (f.elements[k] && params.get(k)) f.elements[k].value = params.get(k); });
    if (q && params.get('q')) q.value = params.get('q');
    var r = params.get('region');
    r = regionOk(r) ? r : f.getAttribute('data-region') || guessRegion();
    var radio = f.querySelector('input[name=region][value=' + r + ']');
    if (radio) radio.checked = true;
    if (inp && out) inp.addEventListener('change', function () {
      if (out.value <= inp.value) out.value = iso(addDays(new Date(inp.value + 'T12:00:00'), 3));
      out.min = inp.value;
    });
  });

  var dataEl = document.getElementById('ch-providers');
  if (!dataEl) return;
  var provs = JSON.parse(dataEl.textContent);
  var form = forms[0];
  var v = { q: '', 'in': '', out: '', t1: '10', t2: '10', age: '25', region: 'us' };
  var read = function () {
    if (!form) return;
    v.q = (form.elements.q.value || '').trim();
    v['in'] = form.elements['in'].value; v.out = form.elements.out.value;
    v.t1 = form.elements.t1.value; v.t2 = form.elements.t2.value; v.age = form.elements.age.value;
    var r = form.querySelector('input[name=region]:checked'); v.region = r ? r.value : 'us';
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var us = function (d) { var p = d.split('-'); return p[1] + '/' + p[2] + '/' + p[0]; };
  var uk = function (d) { var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  var t12 = function (h) { h = +h; return (h % 12 || 12) + pad(0) + (h < 12 ? 'AM' : 'PM'); };
  var fill = function (t) {
    var map = { q: encodeURIComponent(v.q), qp: encodeURIComponent(v.q.replace(/\s+/g, '-')), 'in': v['in'], out: v.out,
      inUS: us(v['in']), outUS: us(v.out), inUK: uk(v['in']), outUK: uk(v.out), t1: t12(v.t1), t2: t12(v.t2), h1: String(+v.t1), h2: String(+v.t2) };
    return t.replace(/{(qp|q|inUS|outUS|inUK|outUK|in|out|t1|t2|h1|h2)}/g, function (m, k) { return map[k]; });
  };
  var link = function (p) {
    if (p.go) return { href: p.go, pre: false, aff: true };
    var tpl = p.url && (p.url[v.region] || p.url.us);
    if (tpl && v.q && v['in'] && v.out) return { href: fill(tpl), pre: true };
    return { href: p.home[v.region] || p.home.us || Object.keys(p.home).map(function (k) { return p.home[k]; })[0], pre: false };
  };
  var seen = {};
  var render = function () {
    read();
    var names = { us: 'the USA', uk: 'the UK', eu: 'Europe' };
    var title = document.getElementById('ch-res-title'), sub = document.getElementById('ch-res-sub');
    if (v.q && title) {
      title.textContent = 'Car hire at ' + v.q;
      var fmt = function (d, h) { try { return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + pad(+h) + ':00'; } catch (e) { return d; } };
      sub.textContent = fmt(v['in'], v.t1) + ' to ' + fmt(v.out, v.t2) + ' · sites for ' + names[v.region] + '. Open each one to compare live prices for the same trip.';
    }
    var age = document.getElementById('ch-age');
    if (age) {
      var a = +v.age;
      age.hidden = a >= 25 && a < 70;
      age.innerHTML = a < 25 ? '<b>Driver under 25:</b> most companies add a young driver surcharge, and some set a minimum age of 21 or more. Enter your age on each site so the price includes it. <a href="/young-driver-car-hire/">Age rules explained</a>.'
        : '<b>Driver 70+:</b> some companies have upper age limits or ask for extra documents in certain countries. Check the terms on the site before you book. <a href="/young-driver-car-hire/">Age rules explained</a>.';
    }
    [['search', 'ch-search'], ['brand', 'ch-brands']].forEach(function (g) {
      var ol = document.getElementById(g[1]);
      if (!ol) return;
      var list = provs.filter(function (p) { return p.kind === g[0] && (!p.regions || p.regions.indexOf(v.region) > -1); });
      list.sort(function (a, b) { return (link(b).pre ? 1 : 0) - (link(a).pre ? 1 : 0); });
      ol.innerHTML = list.map(function (p, n) {
        var l = link(p);
        var note = l.pre ? '<b>Opens with your trip filled in</b>' : v.q ? '<b class="ch-manual">Opens ' + esc(p.name) + ': enter your trip there</b>' : '';
        return '<li class="ch-row' + (seen[p.id] ? ' is-done' : '') + '" style="--pc:' + esc(p.color) + '" data-id="' + esc(p.id) + '"><span class="ch-rank">' + (n + 1) + '</span>' +
          '<span class="ch-wm" style="--pc:' + esc(p.color) + ';--pi:' + esc(p.ink || '#fff') + '">' + esc(p.name) + '</span>' +
          '<span class="ch-note">' + note + esc(p.note) + '</span>' +
          '<a class="ch-open" href="' + esc(l.href) + '" target="_blank" rel="' + (l.aff ? 'sponsored ' : '') + 'nofollow noopener">' + (l.pre ? 'See prices' : 'Visit ' + esc(p.name)) + ' ↗</a></li>';
      }).join('');
    });
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.ch-row .ch-open');
    if (!a) return;
    var row = a.closest('.ch-row');
    seen[row.getAttribute('data-id')] = true;
    row.classList.add('is-done');
  });
  // Pages with a compare block update the list in place (other pages' forms go to /compare/)
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      read();
      history.replaceState(null, '', location.pathname + '?' + new URLSearchParams(v).toString());
      render();
      document.getElementById('ch-res-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    form.addEventListener('change', render);
  }
  render();
})();

/* /search/: offer a straight car hire comparison for the search term */
(function () {
  'use strict';
  var sr = document.getElementById('search-results'), sq = (new URLSearchParams(location.search).get('q') || '').trim();
  if (!sr || !sq) return;
  var place = sq.replace(/\b(car|cars|hire|rental|rentals|rent|a|deals?|cheap|airport)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (!place) return;
  var p = document.createElement('p'), a = document.createElement('a');
  p.className = 'ch-search-cta';
  a.href = '/compare/?q=' + encodeURIComponent(place);
  a.textContent = 'Compare car hire at “' + place + '” on every site →';
  p.appendChild(a);
  sr.parentNode.insertBefore(p, sr);
})();

/* Fold the top menu into the menu button whenever it doesn't fit (any screen width) */
(function () {
  'use strict';
  var root = document.documentElement, bar = document.querySelector('.site-header .bar'), nav = document.querySelector('[data-nav]');
  if (!bar || !nav) return;
  function fit() {
    root.classList.remove('nav-compact');
    nav.classList.remove('open');
    if (getComputedStyle(nav).display === 'none') return; // phone layout already uses the menu button
    var over = bar.scrollWidth > bar.clientWidth + 1 || nav.scrollWidth > nav.clientWidth + 1 ||
      nav.getBoundingClientRect().right > bar.getBoundingClientRect().right + 1;
    if (over) root.classList.add('nav-compact');
  }
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
