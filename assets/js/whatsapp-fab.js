// whatsapp-fab.js
// Dynamically injects the WhatsApp Floating Action Button on all pages
(function(){
  function injectWhatsAppFab(){
    const inPages = location.pathname.includes('/pages/');
    const compBase = inPages ? '../components/' : 'components/';
    if (!document.getElementById('wa-fab-btn')) {
      fetch(compBase + 'whatsapp-button.html', { credentials: 'same-origin' })
        .then(res => res.ok ? res.text() : null)
        .then(html => {
          if (!html) return;
          const wrap = document.createElement('div');
          wrap.innerHTML = html.trim();
          const btn = wrap.firstElementChild;
          if (btn) document.body.appendChild(btn);
          if (window.applyTranslations) window.applyTranslations(btn);
        })
        .catch(()=>{});
    }
  }
  document.addEventListener('DOMContentLoaded', injectWhatsAppFab);
})();
