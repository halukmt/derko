// main.js - bootstraps header/footer includes and form validation
(function(){
  // Simple include: inject components/header.html and footer.html
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
        'nav-buchen':'buchen.html',
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

  // Bootstrap form validation
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
    function markActive(){
      const p = location.pathname.split('/').pop() || 'index.html';
      const map = {
        'index.html': '#nav-home',
        'wohnungen.html': '#nav-wohnungen',
        'ueber-uns.html': '#nav-ueberuns',
        'buchen.html': '#nav-buchen',
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

    function translateAttr(el, key){ el.setAttribute('data-i18n', key); }

    function renderFeatureCards(){
      const host = document.getElementById('feature-cards');
      const tpl = document.getElementById('card-template');
      if (!host || !tpl || host.dataset.rendered) return;
      const baseImg = (IS_PAGES ? '../' : '') + 'assets/img/allgemein/';
      const data = [
        { icon: 'fa-bed', title: 'home.features.komfort.title', text: 'home.features.komfort.text', img: baseImg + 'komfort.png' },
        { icon: 'fa-location-dot', title: 'home.features.zentral.title', text: 'home.features.zentral.text', img: baseImg + 'zentral.png' },
        { icon: 'fa-euro-sign', title: 'home.features.fair.title', text: 'home.features.fair.text', img: baseImg + 'fair.png' }
      ];
      data.forEach(item=>{
        const variant = tpl.content.querySelector('[data-variant="feature"]').cloneNode(true);
        const iconEl = variant.querySelector('[data-icon]');
        iconEl.classList.remove('fa-circle-question');
        iconEl.classList.add(item.icon);
        const imgEl = variant.querySelector('[data-img-feature]');
        if (imgEl && item.img){
          imgEl.src = item.img;
          imgEl.classList.remove('d-none');
        }
        translateAttr(variant.querySelector('[data-title]'), item.title);
        translateAttr(variant.querySelector('[data-text]'), item.text);
        const col = document.createElement('div'); col.className='col-md-4'; col.appendChild(variant); host.appendChild(col);
      });
      host.dataset.rendered = 'true';
      if (window.applyTranslations) window.applyTranslations(host);
    }

    function renderWohnungenCards(){
      const host = document.getElementById('wohnung-list');
      const tpl = document.getElementById('card-template');
      if (!host || !tpl || host.dataset.rendered) return;
      const base = IS_PAGES ? '../' : '';
      const apartments = Array.from({length:3}).map(()=>({
        img: base + 'assets/img/sample.svg',
        alt: 'Wohnungsbild',
        title: 'wohnungen.card.title',
        text: 'wohnungen.card.text',
        btn: 'wohnungen.card.button'
      }));
      apartments.forEach(a=>{
        const variant = tpl.content.querySelector('[data-variant="wohnung"]').cloneNode(true);
        variant.classList.remove('d-none');
        const img = variant.querySelector('[data-img]'); img.src = a.img; img.alt = a.alt;
        translateAttr(variant.querySelector('[data-title]'), a.title);
        translateAttr(variant.querySelector('[data-text]'), a.text);
        translateAttr(variant.querySelector('[data-button]'), a.btn);
        const col = document.createElement('div'); col.className='col-md-4'; col.appendChild(variant); host.appendChild(col);
      });
      host.dataset.rendered = 'true';
      if (window.applyTranslations) window.applyTranslations(host);
    }

    async function renderAllCards(){
      const ok = await ensureCardTemplate();
      if (!ok) return;
      renderFeatureCards();
      renderWohnungenCards();
    }

    renderAllCards();
    document.addEventListener('i18n:ready', renderAllCards);
    document.addEventListener('component:loaded', renderAllCards);

    // Language switcher in header
    function updateLangIndicator(){
      const label = document.getElementById('current-lang-label');
      const flag = document.getElementById('current-lang-flag');
      if (!flag || !window.getLanguage) return;
      const lang = window.getLanguage();
      if (label) label.textContent = lang.toUpperCase(); // still updated for screen readers
      flag.innerHTML = '';
      if (lang === 'de'){
        flag.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><mask id="flag-de-mask-current"><circle cx="12" cy="12" r="12" fill="#fff"/></mask><g mask="url(#flag-de-mask-current)"><path fill="#000" d="M0 0h24v24H0z"/><path fill="#DD0000" d="M0 8h24v16H0z"/><path fill="#FFCE00" d="M0 16h24v8H0z"/></g></svg>';
      } else {
        flag.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#01247d"/><path stroke="#fff" stroke-width="4" d="M0 12h24M12 0v24"/><path stroke="#c8102e" stroke-width="2.5" d="M0 12h24M12 0v24"/><path stroke="#fff" stroke-width="4" d="M3 3l18 18M21 3L3 21"/><path stroke="#c8102e" stroke-width="2.5" d="M3 3l18 18M21 3L3 21"/></svg>';
      }
    }

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
  });
})();
