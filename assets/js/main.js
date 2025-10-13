// main.js
// Responsibilities:
//  - Component injection (header/footer/cards) CSP-safe (no inline eval)
//  - Navigation link normalization (absolute URLs)
//  - Active nav highlighting
//  - Form validation (Bootstrap pattern)
//  - Feature & apartment cards rendering (data-driven)
//  - JSON-LD generation for apartment collection
//  - Language switcher flag update
(function(){
  // --- Component Injection -------------------------------------------------
  // Injects shared HTML fragments and reapplies translations.
  async function injectComponent(el, path){
    try{
      const res = await fetch(path, { credentials: 'same-origin' });
      if (!res.ok) return;
      el.innerHTML = await res.text();
      // After injecting, re-apply translations on new nodes
      if (window.applyTranslations) window.applyTranslations(el);
      document.dispatchEvent(new CustomEvent('component:loaded', { detail: { path } }));
    }catch(e){ console.error('Component load failed:', path, e); }
  }

  function setupIncludes(){
    const header = document.querySelector('[data-component="header"]');
    const footer = document.querySelector('[data-component="footer"]');
  const inPages = location.pathname.includes('/pages/');
  const compBase = inPages ? '../components/' : 'components/';
  if (header) injectComponent(header, compBase + 'header.html');
  if (footer) injectComponent(footer, compBase + 'footer.html');

  function adjustNavLinks(){
    // Brand always root
    const brandLink = document.querySelector('.navbar-brand');
    if (brandLink) brandLink.setAttribute('href','/');
    // Navigation: home = '/', others absolute /pages/...
    document.querySelectorAll('.navbar .nav-link').forEach(a=>{
      const id = a.id || '';
      const fileMap = {
        'nav-home':'index.html',
        'nav-wohnungen':'wohnungen.html',
        'nav-ueberuns':'ueber-uns.html',
        'nav-kontakt':'kontakt.html',
        'nav-agb':'agb.html',
        'nav-impressum':'impressum.html'
      };
      const file = fileMap[id];
      if (!file) return;
      if (file === 'index.html') a.setAttribute('href','/');
      else a.setAttribute('href','/pages/' + file);
    });
    // Footer links
    document.querySelectorAll('#site-footer a.nav-link').forEach(a=>{
      const href = a.getAttribute('href');
      if (!href) return;
      if (['impressum.html','agb.html','datenschutz.html'].includes(href)){
        a.setAttribute('href','/pages/' + href);
      }
    });
  }
  document.addEventListener('component:loaded', adjustNavLinks);
  document.addEventListener('DOMContentLoaded', adjustNavLinks);
  }

  // --- Form Validation ------------------------------------------------------
  function setupValidation(){
    const forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function(form){
      form.addEventListener('submit', function(event){
        if (!form.checkValidity()){
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupIncludes();
    setupValidation();
  // Highlight active navigation link
  function markActive(){
      const p = location.pathname.split('/').pop() || 'index.html';
      const map = {
        'index.html': '#nav-home',
        'wohnungen.html': '#nav-wohnungen',
        'wohnung-detail.html': '#nav-wohnungen', // Detailseite ebenfalls Wohnungen aktiv setzen
        'ueber-uns.html': '#nav-ueberuns',
        'kontakt.html': '#nav-kontakt'
      };
      const sel = map[p] || (p === '' ? '#nav-home' : null);
      if (!sel) return;
      const link = document.querySelector(sel);
      if (link){
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    }
    document.addEventListener('i18n:ready', markActive);
    document.addEventListener('component:loaded', markActive);

    // --- Reusable Card Template Loading & Rendering ---
    const IS_PAGES = location.pathname.includes('/pages/');

  // Fetch card template once and append <template> to body
  async function ensureCardTemplate(){
      if (document.getElementById('card-template')) return true;
      const base = IS_PAGES ? '../' : '';
      try{
        const res = await fetch(base + 'components/card.html', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) return false;
        const html = await res.text();
        const wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        const tpl = wrap.querySelector('#card-template');
        if (tpl) document.body.appendChild(tpl);
        return !!tpl;
      }catch(e){ console.warn('Card template load failed', e); return false; }
    }

  const translateAttr = (el, key) => el.setAttribute('data-i18n', key);

  // Render static feature benefits from config array
  function renderFeatureCards(){
      const host = document.getElementById('feature-cards');
      const tpl = document.getElementById('card-template');
      if (!host || !tpl || host.dataset.rendered) return;
      const baseImg = (IS_PAGES ? '../' : '') + 'assets/img/allgemein/';
      const data = [
        { icon: 'fa-bed', title: 'home.features.komfort.title', text: 'home.features.komfort.text', img: baseImg + 'komfort.png' },
        { icon: 'fa-location-dot', title: 'home.features.zentral.title', text: 'home.features.zentral.text', img: baseImg + 'zentral.png' },
        { icon: 'fa-euro-sign', title: 'home.features.fair.title', text: 'home.features.fair.text', img: baseImg + 'fair_2.png' }
      ];
      data.forEach(item=>{
        const variant = tpl.content.querySelector('[data-variant="feature"]').cloneNode(true);
        const iconEl = variant.querySelector('[data-icon]');
        iconEl.classList.remove('fa-circle-question');
        iconEl.classList.add(item.icon);
        const imgEl = variant.querySelector('[data-img-feature]');
        if (imgEl && item.img){
          // Build responsive <picture> with AVIF/WebP sources and PNG fallback
          const srcPng = item.img;
          const baseNoExt = srcPng.replace(/\.(png|jpe?g)$/i, '');
          const mkSrcSet = (ext) => [`${baseNoExt}-400.${ext} 400w`, `${baseNoExt}-800.${ext} 800w`, `${baseNoExt}-1200.${ext} 1200w`].join(', ');
          const picture = document.createElement('picture');
          const s1 = document.createElement('source'); s1.type = 'image/avif'; s1.setAttribute('srcset', mkSrcSet('avif'));
          const s2 = document.createElement('source'); s2.type = 'image/webp'; s2.setAttribute('srcset', mkSrcSet('webp'));
          const img = document.createElement('img');
          img.src = srcPng; // fallback
          img.loading = 'lazy';
          img.decoding = 'async';
          img.alt = '';
          img.className = 'card-img-top';
          picture.appendChild(s1); picture.appendChild(s2); picture.appendChild(img);
          imgEl.replaceWith(picture);
        }
        translateAttr(variant.querySelector('[data-title]'), item.title);
        translateAttr(variant.querySelector('[data-text]'), item.text);
        const col = document.createElement('div'); col.className='col-md-4'; col.appendChild(variant); host.appendChild(col);
      });
      host.dataset.rendered = 'true';
      if (window.applyTranslations) window.applyTranslations(host);
    }

  // Render about page benefit cards (reuse card.html template variant about-feature)
  function renderAboutCards(){
    if (!/ueber-uns\.html$/.test(location.pathname)) return; // Only on about page
    const host = document.getElementById('about-cards');
    if (!host || host.dataset.rendered) return;
    const tpl = document.getElementById('card-template');
    if (!tpl) return; // template not yet loaded
      const entries = [
        { icon: 'fa-circle-check', title: 'ueberUns.cards.vorteile.title', text: 'ueberUns.cards.vorteile.text' },
        { icon: 'fa-toolbox', title: 'ueberUns.cards.wirBieten.title', text: 'ueberUns.cards.wirBieten.text' },
        { icon: 'fa-route', title: 'ueberUns.cards.vorgehen.title', text: 'ueberUns.cards.vorgehen.text' }
      ];
      entries.forEach(item => {
        const node = tpl.content.querySelector('[data-variant="about-feature"]').cloneNode(true);
        node.classList.remove('d-none');
        const iconEl = node.querySelector('[data-icon]');
        iconEl.classList.remove('fa-circle-question');
        iconEl.classList.add(item.icon);
        translateAttr(node.querySelector('[data-title]'), item.title);
        translateAttr(node.querySelector('[data-text]'), item.text);
        const col = document.createElement('div'); col.className='col-md-4'; col.appendChild(node); host.appendChild(col);
      });
      host.dataset.rendered = 'true';
      if (window.applyTranslations) window.applyTranslations(host);
  }

  // Enriched JSON-LD builder extracting structured apartment facts (rooms, beds, area, parking)
  function buildWohnungenJSONLD(){
      const host = document.getElementById('wohnung-list');
      if (!host) return;
      // Always rebuild (remove previous) to reflect language changes
      const prev = document.head.querySelector('script[data-generated="wohnungen-jsonld"]');
      if (prev) prev.remove();
      const cards = Array.from(host.querySelectorAll('[data-variant="wohnung"]'));
      if (!cards.length) return;

      const items = cards.map(card => {
        const key = card.getAttribute('data-apartment-key') || '';
        const title = card.querySelector('[data-title]')?.textContent.trim() || '';
        const desc  = card.querySelector('[data-text]')?.textContent.trim() || '';
        const city  = card.querySelector('[data-city]')?.textContent.trim() || '';
        const roomsTxt = card.querySelector('[data-rooms]')?.textContent || '';
        const bedsTxt  = card.querySelector('[data-beds]')?.textContent || '';
        const areaTxt  = card.querySelector('[data-area]')?.textContent || '';
        const parkTxt  = card.querySelector('[data-parking]')?.textContent || '';
        const imgEl    = card.querySelector('img[data-img]');
        const img      = imgEl ? (new URL(imgEl.getAttribute('src'), location.origin)).href : undefined;

        const rooms = parseInt((roomsTxt.match(/\d+/)||[])[0]||'',10) || undefined;
        const beds  = parseInt((bedsTxt.match(/\d+/)||[])[0]||'',10) || undefined;
        const area  = parseInt((areaTxt.match(/\d+/)||[])[0]||'',10) || undefined;

        // Parking heuristic (true / on request / false)
        let parkingMode; // true | 'OnRequest' | false
        if (/anfrage|request/i.test(parkTxt)) parkingMode = 'OnRequest';
        else if (/vorhanden|verfügbar|available|yes/i.test(parkTxt)) parkingMode = true;
        else parkingMode = false;

        const amenityFeature = [];
        if (parkingMode){
          amenityFeature.push({
            "@type":"LocationFeatureSpecification",
            "name":"Parking",
            "value": parkingMode === true,
            "description": parkingMode === 'OnRequest' ? 'Parking available on request' : 'On-site parking'
          });
        }

        return {
          '@type':'Apartment',
          '@id': key ? `${location.origin}/wohnungen#${key}` : undefined,
          name: title,
          description: desc,
          address: city ? { '@type':'PostalAddress', addressLocality: city } : undefined,
          numberOfRooms: rooms,
          floorSize: area ? { '@type':'QuantitativeValue', value: area, unitCode: 'MTK' } : undefined,
          bed: beds ? { '@type':'BedDetails', numberOfBeds: beds } : undefined,
          image: img,
          amenityFeature: amenityFeature.length ? amenityFeature : undefined
        };
      });

      const jsonld = {
        '@context':'https://schema.org',
        '@type':'CollectionPage',
        '@id': `${location.origin}/wohnungen`,
        name: document.title || 'Wohnungen',
        hasPart: items
      };

      const s = document.createElement('script');
      s.type='application/ld+json';
      s.dataset.generated='wohnungen-jsonld';
      s.textContent = JSON.stringify(jsonld, null, 2);
      document.head.appendChild(s);
    }

  // Render apartment cards from data-cards JSON (or fallback single)
  function renderWohnungenCards(){
      const host = document.getElementById('wohnung-list');
      const tpl = document.getElementById('card-template');
      if (!host || !tpl || host.dataset.rendered) return;
      const base = IS_PAGES ? '../' : '';
      // Card-Konfiguration aus data-cards Attribut (JSON) oder Fallback
      let cardKeys = [];
      const raw = host.getAttribute('data-cards');
      if (raw){
        try { cardKeys = JSON.parse(raw); } catch(e){ console.warn('Invalid data-cards JSON', e); }
      }
      if (!cardKeys.length){
        cardKeys = [{ key: 'card', img: base + 'assets/img/sample.svg', alt: 'Wohnungsbild' }];
      }

      cardKeys.forEach(cfg => {
        const variant = tpl.content.querySelector('[data-variant="wohnung"]').cloneNode(true);
        variant.classList.remove('d-none');
        if (cfg.key) variant.setAttribute('data-apartment-key', cfg.key);
        const imgEl = variant.querySelector('[data-img]');
        const imgSrc = cfg.img || (base + 'assets/img/sample.svg');
        // If the image looks like /assets/img/wohnungen/<apt>/main.png
        // prefer AVIF/WEBP where available by injecting a <picture>.
        if (/\/assets\/img\/wohnungen\//.test(imgSrc) && /\/main\.(png|jpe?g)$/i.test(imgSrc)){
          const noExt = imgSrc.replace(/\.(png|jpe?g)$/i, '');
          const picture = document.createElement('picture');
          const s1 = document.createElement('source'); s1.type='image/avif'; s1.srcset = noExt + '.avif';
          const s2 = document.createElement('source'); s2.type='image/webp'; s2.srcset = noExt + '.webp';
          const img = document.createElement('img');
          img.src = imgSrc; // fallback PNG
          img.alt = cfg.alt || 'Wohnungsbild';
          img.loading = 'lazy'; img.decoding = 'async'; img.className = 'card-img-top';
          picture.appendChild(s1); picture.appendChild(s2); picture.appendChild(img);
          imgEl.replaceWith(picture);
        } else {
          // default behavior
          imgEl.src = imgSrc; imgEl.alt = cfg.alt || 'Wohnungsbild';
        }
        const prefix = 'wohnungen.' + (cfg.key ? 'cards.' + cfg.key : 'card');
        translateAttr(variant.querySelector('[data-title]'), prefix + '.title');
        translateAttr(variant.querySelector('[data-text]'), prefix + '.text');
        const btn = variant.querySelector('[data-button]');
        translateAttr(btn, prefix + '.button');
        if(cfg.key){
          btn.setAttribute('href', '/pages/wohnung-detail.html?id='+encodeURIComponent(cfg.key));
        } else {
          btn.setAttribute('href', '/pages/wohnungen.html');
        }
        // Detailfelder (city, rooms, beds, area, parking)
        const detailMap = [
          { sel: '[data-city]', key: '.city' },
          { sel: '[data-rooms]', key: '.rooms' },
            { sel: '[data-beds]', key: '.beds' },
          { sel: '[data-area]', key: '.area' },
          { sel: '[data-parking]', key: '.parking' },
          { sel: '[data-price]', key: '.price' }
        ];
        detailMap.forEach(m => {
          const el = variant.querySelector(m.sel);
          if (el) translateAttr(el, prefix + m.key);
        });
        const col = document.createElement('div'); col.className='col-md-4'; col.appendChild(variant); host.appendChild(col);
      });
      host.dataset.rendered = 'true';
      if (window.applyTranslations) {
        window.applyTranslations(host);
        // JSON-LD nach Übersetzungen (leicht verzögert, damit DOM Texte gesetzt sind)
        setTimeout(buildWohnungenJSONLD, 0);
      }
    }

  // Orchestrate card rendering
  async function renderAllCards(){
      const ok = await ensureCardTemplate();
      if (!ok) return;
      renderFeatureCards();
      renderWohnungenCards();
      // Also render about page cards after template is guaranteed to be present
      renderAboutCards();
    }
    renderAllCards();
  document.addEventListener('i18n:ready', function(){ renderAllCards(); buildWohnungenJSONLD(); });
  document.addEventListener('component:loaded', function(){ renderAllCards(); buildWohnungenJSONLD(); });
  document.addEventListener('i18n:changed', buildWohnungenJSONLD);

    // Language switcher in header
  // Update language flag & label
  function updateLangIndicator(){
      const label = document.getElementById('current-lang-label');
      const flag = document.getElementById('current-lang-flag');
      if (!flag || !window.getLanguage) return;
      const lang = window.getLanguage();
      if (label){
        const nameKey = 'site.langNames.'+lang;
        const name = (window.translateKey ? window.translateKey(nameKey) : null) || lang.toUpperCase();
        label.textContent = name;
      }
      flag.innerHTML = '';
      if (lang === 'de'){
        flag.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><mask id="flag-de-mask-current"><circle cx="12" cy="12" r="12" fill="#fff"/></mask><g mask="url(#flag-de-mask-current)"><path fill="#000" d="M0 0h24v24H0z"/><path fill="#DD0000" d="M0 8h24v16H0z"/><path fill="#FFCE00" d="M0 16h24v8H0z"/></g></svg>';
      } else {
        flag.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#01247d"/><path stroke="#fff" stroke-width="4" d="M0 12h24M12 0v24"/><path stroke="#c8102e" stroke-width="2.5" d="M0 12h24M12 0v24"/><path stroke="#fff" stroke-width="4" d="M3 3l18 18M21 3L3 21"/><path stroke="#c8102e" stroke-width="2.5" d="M3 3l18 18M21 3L3 21"/></svg>';
      }
    }

  // Attach click handler for language switching
  function setupLanguageSwitcher(){
      document.addEventListener('click', function(e){
        const btn = e.target.closest('[data-lang]');
        if (!btn) return;
        const lang = btn.getAttribute('data-lang');
        if (window.setLanguage) window.setLanguage(lang).then(updateLangIndicator);
      });
      document.addEventListener('i18n:changed', updateLangIndicator);
      updateLangIndicator();
    }

    document.addEventListener('component:loaded', setupLanguageSwitcher);
    if (document.querySelector('#current-lang-label')) setupLanguageSwitcher();

    // --- GDPR / Cookie Banner -------------------------------------------------
    (function setupCookieBanner(){
      try{
        // We only use essential cookies/storage: PHP session for CAPTCHA (contact only) and localStorage for language preference.
        const CONSENT_KEY = 'siteConsent';
        const hasConsent = localStorage.getItem(CONSENT_KEY) === 'true';
        if (hasConsent) return;
  const bar = document.createElement('div');
        bar.className = 'cookie-banner';
        bar.innerHTML = `
          <div class="cookie-inner">
            <div class="cookie-content container">
              <div class="cookie-text-wrap">
                <h2 class="h6 mb-2" data-i18n="site.cookie.title"></h2>
                <p class="cookie-text mb-2 mb-md-0" data-i18n="site.cookie.text"></p>
              </div>
              <div class="cookie-actions">
                <button type="button" class="btn btn-primary" data-action="accept" data-i18n="site.cookie.accept"></button>
                <button type="button" class="btn btn-outline-primary" data-action="privacy" data-i18n="site.cookie.privacy"></button>
              </div>
            </div>
          </div>`;
        // Add backdrop beneath banner
        const backdrop = document.createElement('div');
        backdrop.className = 'cookie-backdrop';
        document.body.appendChild(backdrop);
        document.body.appendChild(bar);
        if (window.applyTranslations) window.applyTranslations(bar);
        bar.addEventListener('click', function(e){
          const btn = e.target.closest('[data-action="accept"]');
          const more = e.target.closest('[data-action="privacy"]');
          if (btn){
            // Store consent (only essential used), remove banner
            try{ localStorage.setItem(CONSENT_KEY, 'true'); }catch(err){ /* ignore */ }
            bar.remove();
            backdrop.remove();
            return;
          }
          if (more){
            window.location.href = '/pages/datenschutz.html';
            return;
          }
        });
      }catch(err){ console.warn('Cookie banner failed', err); }
    })();
  });
})();
