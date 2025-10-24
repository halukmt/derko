// email-reveal.js — unobtrusive email obfuscation (CSP-safe)
// Progressive reveal: show a localized "show email address" pseudo-link first,
// then turn into a real mailto link only on user interaction.
// Works with i18n partials and dynamic DOM updates.
(function(){
  function getLabel(){
    try {
      if (typeof window.translateKey === 'function'){
        const t = window.translateKey('legal.revealEmail');
        if (t) return t;
      }
    } catch(_){}
    return 'E-Mail Adresse anzeigen';
  }

  function bindSpan(el){
    const user = el.getAttribute('data-user');
    const dom = el.getAttribute('data-domain');
    if (!user || !dom) return;

    // Make it look/behave like a link until revealed
    el.classList.add('inline-link');
    el.setAttribute('role', 'link');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;

    // Always update the label to current language
    el.textContent = getLabel();

    if (el.dataset.obfBound === '1') return; // listeners already attached

    function reveal(){
      const address = `${user}@${dom}`;
      const a = document.createElement('a');
      a.href = `mailto:${address}`;
      a.textContent = address;
      a.rel = 'nofollow';
      el.replaceWith(a);
    }

    el.addEventListener('click', reveal, { once: true });
    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); }
    }, { once: true });
    el.dataset.obfBound = '1';
  }

  function scan(root){
    const scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll('.obf-email').forEach(bindSpan);
  }

  function startObserver(){
    if (!document.body) return;
    const mo = new MutationObserver(mutations => {
      for (const m of mutations){
        if (m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); });
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', function(){
    scan(document);
    startObserver();
  });
  // Re-apply labels after i18n updates (and bind new nodes)
  document.addEventListener('i18n:ready',   function(){ scan(document); });
  document.addEventListener('i18n:changed', function(){ scan(document); });
})();
