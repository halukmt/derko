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
    const inPagesNow = location.pathname.includes('/pages/');
    // Header brand logo path correction
    const brandImg = document.querySelector('.navbar-brand img');
    if (brandImg){
      if (inPagesNow && brandImg.getAttribute('src') === 'assets/img/logo.svg') brandImg.setAttribute('src','../assets/img/logo.svg');
      if (!inPagesNow && brandImg.getAttribute('src') === '../assets/img/logo.svg') brandImg.setAttribute('src','assets/img/logo.svg');
    }
    // Brand link
    const brandLink = document.querySelector('.navbar-brand');
    if (brandLink){
      brandLink.setAttribute('href', inPagesNow ? '../index.html' : 'index.html');
    }
    // Nav links
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
      if (file === 'index.html'){
        a.setAttribute('href', inPagesNow ? '../index.html' : 'index.html');
      } else {
        a.setAttribute('href', inPagesNow ? file : 'pages/' + file);
      }
    });
    // Footer links
    document.querySelectorAll('#site-footer a.nav-link').forEach(a=>{
      const href = a.getAttribute('href');
      if (!href) return;
      if (['impressum.html','agb.html','datenschutz.html'].includes(href)){
        a.setAttribute('href', inPagesNow ? href : 'pages/' + href);
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
        'kontakt.html': '#nav-kontakt',
        'agb.html': '#nav-agb',
        'impressum.html': '#nav-impressum'
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

    // Render Wohnung cards (no inline script; works with CSP)
    function renderWohnungenCards(){
      const container = document.getElementById('wohnung-list');
      const tpl = document.getElementById('card-template');
      if (!container || !tpl) return;
      if (container.dataset.rendered === 'true') return;
      const count = 3;
      for (let i = 0; i < count; i++){
        const wrapper = document.createElement('div');
        wrapper.className = 'col-md-4';
        wrapper.innerHTML = tpl.innerHTML;
        container.appendChild(wrapper);
      }
      container.dataset.rendered = 'true';
      if (window.applyTranslations) window.applyTranslations(container);
    }
    // invoke once DOM/i18n are ready (order independent)
    renderWohnungenCards();
    document.addEventListener('i18n:ready', renderWohnungenCards);
    document.addEventListener('component:loaded', renderWohnungenCards);

    // Language switcher in header
    function updateLangIndicator(){
      const label = document.getElementById('current-lang-label');
      const flag = document.getElementById('current-lang-flag');
      if (!label || !flag || !window.getLanguage) return;
      const lang = window.getLanguage();
      label.textContent = lang.toUpperCase();
      flag.innerHTML = '';
      if (lang === 'de'){
        flag.innerHTML = '<svg width="18" height="12" viewBox="0 0 5 3" aria-hidden="true"><rect width="5" height="1" y="0" fill="#000"/><rect width="5" height="1" y="1" fill="#DD0000"/><rect width="5" height="1" y="2" fill="#FFCE00"/></svg>';
      } else {
        flag.innerHTML = '<svg width="18" height="12" viewBox="0 0 60 30" aria-hidden="true"><clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><path d="M0,0 v30 h60 v-30 z" fill="#01247d"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" stroke-width="4" clip-path="url(#t)"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6" clip-path="url(#t)"/></svg>';
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
