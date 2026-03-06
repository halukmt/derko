// lang.js - simple i18n loader for static site
// Loads /lang/de.json and applies [data-i18n] and [data-i18n-meta] attributes.
(function(){
  const STATE = { dict: null };
  let CURRENT_LANG = 'de';

  async function loadJSON(url, throwOnError = true){
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok){
      if (throwOnError) throw new Error('Failed to load lang file: '+res.status);
      return null;
    }
    return res.json();
  }

  function getByPath(obj, path){
    return path.split('.').reduce((o,k)=> (o && k in o) ? o[k] : undefined, obj);
  }

  // Public helper for other scripts (e.g., wohnung-detail.js) to synchronously
  // fetch a translation string by key. Returns '' if not loaded or not a string.
  window.translateKey = function(key){
    if(!STATE.dict || !key) return '';
    const val = getByPath(STATE.dict, key);
    return (typeof val === 'string') ? val : '';
  };
  // Raw access (arrays / objects) -- used for amenities etc.
  window.translateRaw = function(key){
    if(!STATE.dict || !key) return undefined;
    return getByPath(STATE.dict, key);
  };

  // Very small sanitizer: allow a limited set of inline / simple block tags so that
  // translations can contain <br>, emphasis, simple lists, links etc. without risking XSS.
  // You control the JSON files, so this is mostly defensive against accidents.
  const ALLOWED_TAGS = new Set(['br','strong','b','em','i','u','span','a','ul','ol','li','p','h1','h2','h3','h4','h5','h6','section','div']);
  const ALLOWED_ATTR = {
    'a': new Set(['href','title','rel','target']),
    'span': new Set(['class'])
  };

  function sanitizeHtml(html){
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    (function walk(node){
      const children = Array.from(node.children);
      for (const child of children){
        const tag = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tag)){
          // Replace disallowed tag with its text / allowed children
            child.replaceWith(...child.childNodes);
            continue;
        }
        // Clean attributes
        for (const attr of Array.from(child.attributes)){
          const name = attr.name.toLowerCase();
          if (name.startsWith('on')) { child.removeAttribute(attr.name); continue; }
          // Always allow safe aria-* and data-* attributes for any tag (used by components and obfuscation)
          if (name.startsWith('aria-') || name.startsWith('data-')) { continue; }
          const allowedForTag = ALLOWED_ATTR[tag];
          if (allowedForTag){
            if (!allowedForTag.has(name)) child.removeAttribute(attr.name);
          } else {
            // no attributes allowed for this tag (beyond aria-/data- handled above)
            child.removeAttribute(attr.name);
          }
          // For anchor ensure safe rel when target=_blank
          if (tag === 'a' && child.getAttribute('target') === '_blank'){
            const rel = child.getAttribute('rel') || '';
            if (!/noopener/i.test(rel)) child.setAttribute('rel', (rel+' noopener noreferrer').trim());
          }
        }
        walk(child);
      }
    })(tpl.content || tpl);
    return tpl.innerHTML;
  }

  function setText(el, text){
    if (el.tagName === 'META') {
      // Strip any HTML tags for meta content to avoid broken metadata
      el.setAttribute('content', text.replace(/<[^>]*>/g,''));
      return;
    }
    if (typeof text !== 'string'){
      el.textContent = text == null ? '' : String(text);
      return;
    }
    if (text.indexOf('<') !== -1 && text.indexOf('>') !== -1){
      // Contains potential markup -> sanitize and inject as HTML
      el.innerHTML = sanitizeHtml(text);
    } else {
      el.textContent = text;
    }
  }

  const HTML_PARTIAL_CACHE = {};

  async function injectHtmlPartial(el, path){
    try{
      if (HTML_PARTIAL_CACHE[path]){ el.innerHTML = sanitizeHtml(HTML_PARTIAL_CACHE[path]); return; }
      const inPages = location.pathname.includes('/pages/');
      // If path starts with 'lang/' we need correct relative base from /pages/
      let fetchPath = path;
      if (path.startsWith('lang/')) fetchPath = inPages ? '../'+path : path;
      const res = await fetch(fetchPath, { credentials:'same-origin' });
      if (!res.ok) { console.warn('Partial not found:', path); return; }
      const txt = await res.text();
      HTML_PARTIAL_CACHE[path] = txt;
      el.innerHTML = sanitizeHtml(txt);
    }catch(err){ console.error('Partial load failed', path, err); }
  }

  async function applyTranslations(root=document){
    if (!STATE.dict) return;
    const textNodes = root.querySelectorAll('[data-i18n]');
    textNodes.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = getByPath(STATE.dict, key);
      if (typeof val === 'string') {
        setText(el, val);
      } else if (Array.isArray(val)) {
        // Render arrays as bullet lists (<ul><li>)
        while (el.firstChild) el.removeChild(el.firstChild); // clear
        const isAboutFeature = !!el.closest('[data-variant="about-feature"]');
        const ul = document.createElement('ul');
        if (isAboutFeature){
          ul.className = 'about-feature-list';
        } else {
          ul.className = 'mb-0 ps-3';
        }
        val.forEach(entry => {
          const li = document.createElement('li');
          if (isAboutFeature){
            // Add icon for about-feature variant
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-check';
            icon.setAttribute('aria-hidden','true');
            li.appendChild(icon);
            const span = document.createElement('span');
            if (typeof entry === 'string') {
              if (entry.indexOf('<') !== -1 && entry.indexOf('>') !== -1){
                span.innerHTML = sanitizeHtml(entry);
              } else {
                span.textContent = entry;
              }
            } else {
              span.textContent = String(entry);
            }
            li.appendChild(span);
          } else {
            if (typeof entry === 'string') {
              if (entry.indexOf('<') !== -1 && entry.indexOf('>') !== -1){
                li.innerHTML = sanitizeHtml(entry);
              } else {
                li.textContent = entry;
              }
            } else {
              li.textContent = String(entry);
            }
          }
          ul.appendChild(li);
        });
        el.appendChild(ul);
      }
    });
    // Rich HTML (block-level) content placeholders
    const htmlNodes = root.querySelectorAll('[data-i18n-html]');
    htmlNodes.forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = getByPath(STATE.dict, key);
      if (typeof val === 'string'){
        if (/\.html?$/i.test(val)) {
          injectHtmlPartial(el, val);
        } else {
            // treat as direct HTML string
            el.innerHTML = sanitizeHtml(val);
        }
      }
    });
    const metaNodes = root.querySelectorAll('[data-i18n-meta]');
    metaNodes.forEach(el => {
      const key = el.getAttribute('data-i18n-meta');
      const val = getByPath(STATE.dict, key);
      if (typeof val === 'string') setText(el, val);
    });
    // Alt attribute translations (e.g., founders image)
    const altNodes = root.querySelectorAll('[data-i18n-alt]');
    altNodes.forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      const val = getByPath(STATE.dict, key);
      if (typeof val === 'string') el.setAttribute('alt', val.replace(/<[^>]*>/g,''));
    });
    // Navigation labels on header component
    const navMap = {
      '#nav-home': 'navigation.home',
      '#nav-wohnungen': 'navigation.wohnungen',
      '#nav-ueberuns': 'navigation.ueberUns',
      '#nav-kontakt': 'navigation.kontakt',
      '#nav-agb': 'navigation.agb',
      '#nav-impressum': 'navigation.impressum'
    };
    Object.entries(navMap).forEach(([sel,key])=>{
      const el = document.querySelector(sel);
      const val = getByPath(STATE.dict, key);
      if (!el || !val) return;
      // If a nested label placeholder exists, populate that to preserve any icons
      const childLabel = el.querySelector('[data-nav-label]');
      if (childLabel){
        childLabel.textContent = val;
      } else {
        el.textContent = val;
      }
    });
    // Footer
    const footerMap = {
      '#ft-impressum': 'footer.impressum',
      '#ft-agb': 'footer.agb',
      '#ft-privacy': 'footer.privacy',
      '#ft-kontakt': 'footer.kontakt'
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
    const credit = document.querySelector('#ft-credit');
    if (credit) {
      const html = getByPath(STATE.dict, 'footer.creditHtml');
      if (typeof html === 'string') credit.innerHTML = sanitizeHtml(html);
    }
  }

  async function setLanguage(lang){
    try{
      CURRENT_LANG = lang || 'de';
      localStorage.setItem('lang', CURRENT_LANG);
      const isLocalHost = /^localhost$|^127\.0\.0\.1$|^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(location.hostname);
      const hasPort = !!location.port; // dev servers often use a port
      const isDev = isLocalHost || hasPort;
      const cacheBuster = isDev ? `?v=${Date.now()}` : '';
  const inPages = location.pathname.includes('/pages/');
  const langBase = inPages ? '../lang/' : 'lang/';
      // Determine preferred structure (cached)
      const structurePrefKey = 'i18nStructure'; // 'nested' | 'flat'
      let pref = localStorage.getItem(structurePrefKey);
      // Build candidate list depending on preference (avoid 404s where possible)
      let candidates;
      if (pref === 'nested') {
        candidates = [
          `${langBase}${CURRENT_LANG}/${CURRENT_LANG}.json${cacheBuster}`,
          `${langBase}${CURRENT_LANG}.json${cacheBuster}`,
          (location.pathname.includes('/pages/') ? '../' : '') + `${CURRENT_LANG}.json${cacheBuster}`
        ];
      } else if (pref === 'flat') {
        candidates = [
          `${langBase}${CURRENT_LANG}.json${cacheBuster}`,
          `${langBase}${CURRENT_LANG}/${CURRENT_LANG}.json${cacheBuster}`,
          (location.pathname.includes('/pages/') ? '../' : '') + `${CURRENT_LANG}.json${cacheBuster}`
        ];
      } else {
        // Unknown -> optimistically try nested first (if exists no 404), then flat, then root fallback
        candidates = [
          `${langBase}${CURRENT_LANG}/${CURRENT_LANG}.json${cacheBuster}`,
          `${langBase}${CURRENT_LANG}.json${cacheBuster}`,
          (location.pathname.includes('/pages/') ? '../' : '') + `${CURRENT_LANG}.json${cacheBuster}`
        ];
      }
      let loaded = null;
      for (const url of candidates){
        const data = await loadJSON(url, false);
        if (data){
          loaded = data;
          console.info('[i18n] loaded', url);
          // store preference if not already known
          if (!pref){
            if (url.includes(`/${CURRENT_LANG}/${CURRENT_LANG}.json`)) {
              localStorage.setItem(structurePrefKey, 'nested');
            } else if (url.endsWith(`${CURRENT_LANG}.json${cacheBuster}`) && url.includes(`${langBase}${CURRENT_LANG}.json`)) {
              localStorage.setItem(structurePrefKey, 'flat');
            }
          }
          break;
        }
      }
      if (!loaded) throw new Error('No language JSON found for '+CURRENT_LANG+' (tried: '+candidates.join(', ')+')');
      STATE.dict = loaded;
      if (!window.__i18nReady) {
        window.__i18nReady = true;
        document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: CURRENT_LANG } }));
      }
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: CURRENT_LANG } }));
      applyTranslations();
      updateCanonical(CURRENT_LANG);
      updateOgLocale(CURRENT_LANG);
    }catch(err){
      console.error(err);
    }
  }

  const SUPPORTED_LANGS = ['de','en','pl','hu','sk','cs','it','bg','ro'];
  const LOCALE_MAP = {
    de:'de_DE', en:'en_GB', pl:'pl_PL', hu:'hu_HU',
    sk:'sk_SK', cs:'cs_CZ', it:'it_IT', bg:'bg_BG', ro:'ro_RO'
  };

  function detectLangFromUrl(){
    const m = location.pathname.match(/^\/(en|pl|hu|sk|cs|it|bg|ro)(\/|$)/);
    return m ? m[1] : null;
  }

  function updateCanonical(lang){
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) return;
    const baseUrl = 'https://www.derko-immobilien.de';
    // Strip any existing lang prefix from the path
    const path = location.pathname.replace(/^\/(en|pl|hu|sk|cs|it|bg|ro)(\/|$)/, '/');
    const langPrefix = (lang && lang !== 'de') ? '/' + lang : '';
    // Normalize trailing slash: keep it only for root
    const normPath = path === '/' ? '/' : path.replace(/\/$/, '');
    canonical.href = baseUrl + langPrefix + normPath;
  }

  function updateOgLocale(lang){
    const primary = document.querySelector('meta[property="og:locale"]');
    if (primary) primary.setAttribute('content', LOCALE_MAP[lang] || LOCALE_MAP['de']);
  }

  async function init(){
    const urlLang = detectLangFromUrl();
    const stored = localStorage.getItem('lang');
    CURRENT_LANG = urlLang || stored || 'de';
    await setLanguage(CURRENT_LANG);
  }

  document.addEventListener('DOMContentLoaded', init);
  window.applyTranslations = applyTranslations;
  window.setLanguage = setLanguage;
  window.getLanguage = () => CURRENT_LANG;
})();
