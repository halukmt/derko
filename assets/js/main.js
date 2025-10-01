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
  if (header) injectComponent(header, 'components/header.html');
  if (footer) injectComponent(footer, 'components/footer.html');
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
  });
})();
