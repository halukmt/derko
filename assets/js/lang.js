// lang.js - simple i18n loader for static site
// Loads /lang/de.json and applies [data-i18n] and [data-i18n-meta] attributes.
(function(){
  const STATE = { dict: null };

  async function loadJSON(url){
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Failed to load lang file: '+res.status);
    return res.json();
  }

  function getByPath(obj, path){
    return path.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, obj);
  }

  function setText(el, text){
    if (el.tagName === 'META') {
      el.setAttribute('content', text);
    } else if ('textContent' in el) {
      el.textContent = text;
    }
  }

  function applyTranslations(root=document){
    if (!STATE.dict) return;
    const textNodes = root.querySelectorAll('[data-i18n]');
    textNodes.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = getByPath(STATE.dict, key);
      if (typeof val === 'string') setText(el, val);
    });
    const metaNodes = root.querySelectorAll('[data-i18n-meta]');
    metaNodes.forEach(el => {
      const key = el.getAttribute('data-i18n-meta');
      const val = getByPath(STATE.dict, key);
      if (typeof val === 'string') setText(el, val);
    });
    // Navigation labels on header component
    const navMap = {
      '#nav-home': 'navigation.home',
      '#nav-wohnungen': 'navigation.wohnungen',
      '#nav-ueberuns': 'navigation.ueberUns',
      '#nav-buchen': 'navigation.buchen',
      '#nav-kontakt': 'navigation.kontakt',
      '#nav-agb': 'navigation.agb',
      '#nav-impressum': 'navigation.impressum'
    };
    Object.entries(navMap).forEach(([sel,key])=>{
      const el = document.querySelector(sel);
      const val = getByPath(STATE.dict, key);
      if (el && val) el.textContent = val;
    });
    // Footer
    const footerMap = {
      '#ft-impressum': 'footer.impressum',
      '#ft-agb': 'footer.agb',
      '#ft-privacy': 'footer.privacy'
    };
    Object.entries(footerMap).forEach(([sel,key])=>{
      const el = document.querySelector(sel);
      const val = getByPath(STATE.dict, key);
      if (el && val) el.textContent = val;
    });
    const copyright = document.querySelector('#ft-copyright');
    if (copyright) {
      const val = getByPath(STATE.dict, 'footer.copyright');
      if (val) copyright.textContent = val;
    }
  }

  async function init(){
    try{
  STATE.dict = await loadJSON('lang/de.json');
      document.dispatchEvent(new CustomEvent('i18n:ready'));
      applyTranslations();
    }catch(err){
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.applyTranslations = applyTranslations;
})();
