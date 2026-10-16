/* CarHireDeals: site-specific block types (loaded by tools/build.js).
   Car hire sites and rental brands live in shmor-site.json "providers":
     { id, name, kind: "search" | "brand", color, ink?, note, group?, regions?: ["us","uk","eu"],
       url?: { us, uk, eu } (deep link templates), home: { us, uk, eu }, link? }
   url placeholders (filled by assets/site.js from the search form):
     {q} pick-up place (URL-encoded)  {qp} same, spaces → "-" (for paths)
     {in} {out} YYYY-MM-DD   {inUS} {outUS} MM/DD/YYYY   {inUK} {outUK} DD/MM/YYYY
     {t1} {t2} 12-hour time like 1000AM   {h1} {h2} hour 0–23
   "link" = a referral slug in "links": once it exists, that provider's buttons go
   through shmor.ai/go/ instead (tracked), without the prefilled trip details. */
const REGIONS = ['us', 'uk', 'eu'];
const inRegion = (p, r) => !p.regions || p.regions.includes(r);
const homeOf = (p, r) => (p.home || {})[r] || (p.home || {}).us || Object.values(p.home || {})[0] || '#';
const isAff = (p, kit) => p.link && kit.LINKS[p.link];
const provHref = (p, r, kit, src) => isAff(p, kit) ? kit.goHref(p.link, src) : homeOf(p, r);
const provRel = (p, kit) => isAff(p, kit) ? kit.AFF : 'rel="nofollow noopener" target="_blank"';
const compareHref = (q, r) => `/compare/?q=${encodeURIComponent(q)}${r ? `&region=${r}` : ''}`;
const wordmark = (p, esc) => `<span class="ch-wm" style="--pc:${esc(p.color)};--pi:${esc(p.ink || '#fff')}">${esc(p.name)}</span>`;

// Destination / airport photo cards: code badge, place, tags, "check on" quick links and a compare button
function places(b, page, kit) {
  const { esc, icon, imgSrc, imgOf, pagePath, bySlug, site } = kit;
  const all = site.providers || [];
  const cards = (b.items || []).map(it => {
    const r = it.region || 'us', q = it.q || it.place || it.title;
    const im = imgOf(it.image || (it.slug !== undefined && bySlug.get(it.slug)?.image));
    if (it.slug !== undefined && !bySlug.get(it.slug)) kit.errors.push(`${page._file}: places block links to missing page "${it.slug}"`);
    const guide = it.slug !== undefined && bySlug.get(it.slug) ? pagePath(bySlug.get(it.slug)) : '';
    const main = guide || compareHref(q, r);
    const total = all.filter(p => inRegion(p, r)).length;
    const quick = all.filter(p => p.kind === 'brand' && inRegion(p, r)).slice(0, b.quick ?? 3);
    const img = im ? `<img src="${esc(imgSrc(im, 640, 400))}" width="640" height="400" alt="${esc(im.alt || '')}" loading="lazy" decoding="async">` : '';
    return `<article class="ch-card">
  <a class="ch-photo" href="${esc(main)}" tabindex="-1" aria-hidden="true">${img}${it.code ? `<span class="ch-code">${icon('plane')}${esc(it.code)}</span>` : ''}${it.badge ? `<span class="ch-badge">${esc(it.badge)}</span>` : ''}</a>
  <div class="ch-body">
    ${it.place ? `<p class="ch-place">${icon('pin')}${esc(it.place)}</p>` : ''}
    <h3><a href="${esc(main)}">${esc(it.title)}</a></h3>
    ${it.text ? `<p class="ch-text">${esc(it.text)}</p>` : ''}
    ${(it.tags || []).length ? `<ul class="ch-tags">${it.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="ch-quick"><span>Try</span>${quick.map(p => `<a href="${esc(provHref(p, r, kit, page.slug || 'home'))}" ${provRel(p, kit)} style="--pc:${esc(p.color)}">${esc(p.name)}</a>`).join('')}</div>
    <a class="ch-go" href="${esc(compareHref(q, r))}">Compare ${total} sites &amp; brands <span aria-hidden="true">→</span></a>
  </div>
</article>`;
  }).join('\n');
  const head = b.title ? `<div class="block-head"><h2>${esc(b.title)}</h2>${b.intro ? `<p>${b.intro}</p>` : ''}${b.more ? `<a class="block-more" href="${esc(b.more.href || pagePath(bySlug.get(b.more.slug) || { slug: b.more.slug }))}">${esc(b.more.title)} →</a>` : ''}</div>` : '';
  return `<section class="blocks blocks-places${b.class ? ` ${esc(b.class)}` : ''}"><div class="wrap">${head}<div class="ch-grid">${cards}</div></div></section>`;
}

// Two rows of wordmarks: comparison sites and rental brands
function providers(b, page, kit) {
  const { esc } = kit;
  const list = kit.site.providers || [];
  const row = (kind, label) => `<div class="ch-logo-row"><p class="ch-we">${esc(label)}</p><ul class="ch-logos">${list.filter(p => p.kind === kind).map(p => `<li>${wordmark(p, esc)}</li>`).join('')}</ul></div>`;
  return `<section class="blocks blocks-providers${b.class ? ` ${esc(b.class)}` : ''}"><div class="wrap">${row('search', b.searchTitle || 'We search')}${row('brand', b.brandTitle || 'Rental brands')}</div></section>`;
}

// Rental brand cards: group, note, regions, visit links per region
function brands(b, page, kit) {
  const { esc } = kit;
  const flags = { us: 'USA', uk: 'UK', eu: 'Europe' };
  const list = (kit.site.providers || []).filter(p => p.kind === (b.kind || 'brand'));
  const head = b.title ? `<div class="block-head"><h2>${esc(b.title)}</h2>${b.intro ? `<p>${b.intro}</p>` : ''}</div>` : '';
  return `<section class="blocks blocks-brands"><div class="wrap">${head}<div class="ch-brands">${list.map(p => {
    const regs = REGIONS.filter(r => inRegion(p, r) && (p.home || {})[r]);
    return `<article class="ch-brand">
  <div class="ch-brand-top">${wordmark(p, esc)}${p.group && p.group !== p.name ? `<span class="ch-group">${esc(p.group)}</span>` : ''}</div>
  <p>${esc(p.note || '')}</p>
  <div class="ch-visit">${regs.map(r => `<a href="${esc(provHref(p, r, kit, page.slug || 'home'))}" ${provRel(p, kit)}>${flags[r]} site ↗</a>`).join('')}</div>
</article>`;
  }).join('')}</div></div></section>`;
}

// /compare/ results: assets/site.js fills the lists from the query; the static lists work without JavaScript
function compare(b, page, kit) {
  const { esc } = kit;
  const list = kit.site.providers || [];
  const data = list.map(p => ({ id: p.id, name: p.name, kind: p.kind, color: p.color, ink: p.ink || '', note: p.note || '', regions: p.regions || null,
    url: isAff(p, kit) ? null : p.url || null, home: p.home || {}, go: isAff(p, kit) ? kit.goHref(p.link, 'compare') : '' }));
  const row = (p, n) => `<li class="ch-row" style="--pc:${esc(p.color)}"><span class="ch-rank">${n + 1}</span>${wordmark(p, esc)}<span class="ch-note">${esc(p.note || '')}</span><a class="ch-open" href="${esc(provHref(p, 'us', kit, 'compare'))}" ${provRel(p, kit)}>Visit ${esc(p.name)} ↗</a></li>`;
  return `<section class="blocks blocks-compare"><div class="wrap">
  <div class="ch-res-head"><h2 id="ch-res-title">${esc(b.title || 'Compare car hire on every site')}</h2><p id="ch-res-sub">${b.intro || 'Enter where and when you want to pick up above, then open each site to see its live prices for the same trip.'}</p></div>
  <div class="ch-age" id="ch-age" hidden></div>
  <h3 class="ch-list-title">Comparison sites <small>search many suppliers at once</small></h3>
  <ol class="ch-results" id="ch-search">${list.filter(p => p.kind === 'search').map(row).join('')}</ol>
  <h3 class="ch-list-title">Rental companies <small>book direct with the brand</small></h3>
  <ol class="ch-results" id="ch-brands">${list.filter(p => p.kind === 'brand').map(row).join('')}</ol>
  <p class="aff-note">Prices are set by each site and change often. Compare the total price for the same car class, including taxes, fees, insurance excess, fuel policy and mileage limits. Some links may be affiliate links, at no extra cost to you. <a href="https://shmor.ai/affiliate-disclosure/">How we make money</a>.</p>
  <script type="application/json" id="ch-providers">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
</div></section>`;
}

module.exports = { places, providers, brands, compare };
