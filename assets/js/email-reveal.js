// email-reveal.js — unobtrusive email obfuscation
// Converts spans like:
//   <span class="obf-email" data-user="kontakt" data-domain="derko-immobilien.de">kontakt [at] derko-immobilien.de</span>
// into a clickable, accessible mailto link at runtime. Works with i18n partials
// by listening to i18n:ready / i18n:changed events fired by lang.js.
(function(){
  function reveal(root){
    const scope = root || document;
    const nodes = scope.querySelectorAll('.obf-email');
    nodes.forEach(el => {
      const user = el.getAttribute('data-user');
      const dom = el.getAttribute('data-domain');
      if (!user || !dom) return;
      const address = `${user}@${dom}`;
      const a = document.createElement('a');
      a.href = `mailto:${address}`;
      a.textContent = address;
      a.rel = 'nofollow';
      // Prefer safe replace to avoid losing surrounding layout
      el.replaceWith(a);
    });
  }

  // Run on DOM ready (defer ensures this script is parsed before DOMContentLoaded fires)
  document.addEventListener('DOMContentLoaded', function(){ reveal(document); });
  // Re-run after i18n applies translations/partials
  document.addEventListener('i18n:ready', function(){ reveal(document); });
  document.addEventListener('i18n:changed', function(){ reveal(document); });
})();
