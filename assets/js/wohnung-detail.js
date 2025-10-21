// wohnung-detail.js
// Apartment Detail Page Performance & UX Enhancements
//  - Reuses translation keys: wohnungen.cards.<key>.*
//  - Curated gallery (assets/data/apartments.json)
//  - Lazy loading via IntersectionObserver (no immediate network flood)
//  - Progressive enhancement for responsive AVIF/WebP variants (only if generated)
//  - Limited initial render + "show more" toggle
//  - JSON-LD uses curated image list (not speculative pattern)
//  - Dynamic hero <link rel="preload"> injection
(function(){
  const params = new URLSearchParams(location.search);
  const key = params.get('id');
  const root = document.querySelector('[data-apartment-root]');
  if(!root) return;

  const basePath = '/assets/img/wohnungen/';
  const configPath = '/assets/data/apartments.json';
  const known = ['w03_exklusiv','w04_exklusiv_2','w01_derko_apart','w02_derko_apart_2','w05_dus_1','w06_dus_2','w07_dus_3']; // sync with listing
  if(!key || !known.includes(key)){
    // Redirect to the dedicated 404 page for unknown/removed apartments
    // Use replace() so the invalid URL doesn't stay in history
    try {
      const fourOhFour = '/404.html';
      if(location.pathname !== fourOhFour){
        location.replace(fourOhFour);
        return;
      }
    } catch(_) { /* ignore and fall back to inline message */ }
    // Fallback: inline warning if redirect isn't possible
    root.innerHTML = '<div class="alert alert-warning" role="status" data-i18n="notFound.description">Apartment nicht gefunden.</div>';
    return;
  }

  // Translation helper
  function t(k){
    if(window.translateKey) return window.translateKey(k) || '';
    return '';
  }

  const prefix = 'wohnungen.cards.' + key;

  function fillContent(){
    const titleEl = document.getElementById('apt-title');
    const textEl = document.getElementById('apt-text');
    const metaEl = document.getElementById('apt-meta');
    const amenitiesSection = document.getElementById('apt-amenities');
    const amenitiesListEl = document.getElementById('apt-amenities-list');
  const descSection = document.getElementById('apt-description');
  const descBody = document.getElementById('apt-description-body');
    const bcEl = document.getElementById('breadcrumb-current');
    const title = t(prefix + '.title') || key;
    const desc = t(prefix + '.text') || '';
    if(titleEl) titleEl.textContent = title;
    if(textEl) textEl.textContent = desc;
    if(bcEl) bcEl.textContent = title;
    document.title = title + ' – DERKO';
    // Update meta description & OG tags dynamically for Lighthouse (late hydration fallback already present in HTML)
    const metaDesc = document.querySelector('meta[name="description"][data-i18n-meta]');
    if(metaDesc){
      const longDesc = t(prefix + '.text') || desc || ('Informationen zur Wohnung ' + title);
      metaDesc.setAttribute('content', longDesc);
    }
    const ogTitle = document.querySelector('meta[property="og:title"][data-i18n-meta]');
    if(ogTitle){ ogTitle.setAttribute('content', title); }
    const ogDesc = document.querySelector('meta[property="og:description"][data-i18n-meta]');
    if(ogDesc){
      const ogd = t(prefix + '.text') || desc || ('Details zu ' + title);
      ogDesc.setAttribute('content', ogd);
    }
    // Canonical: include id parameter for distinct apartment pages
    const canonical = document.querySelector('link[rel="canonical"]');
    if(canonical){
      const url = '/wohnung?id=' + encodeURIComponent(key);
      canonical.setAttribute('href', url);
    }
    // Hreflang alternates: adapt to parameter
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
      const lang = link.getAttribute('hreflang');
      if(!lang) return;
      let base = '/wohnung';
      if(lang === 'en') base = '/en/wohnung';
      // Use same id parameter for canonical separation
      link.setAttribute('href', base + '?id=' + encodeURIComponent(key));
    });

    // Meta details list
    const metaFields = [
      { icon:'fa-location-dot', k: '.city' },
      { icon:'fa-door-closed', k: '.rooms' },
      { icon:'fa-bed', k: '.beds' },
      { icon:'fa-maximize', k: '.area' },
  { icon:'fa-square-parking', k: '.parking' },
  { icon:'fa-euro-sign', k: '.price' }
    ];
    metaEl.innerHTML='';
    metaFields.forEach(f=>{
      const val = t(prefix+f.k);
      if(!val) return;
  const li = document.createElement('li');
  // Einheitliches Layout über globales CSS ([data-details]) – keine Bootstrap Utility Klassen nötig
      li.innerHTML = '<i class="fa-solid '+f.icon+'" aria-hidden="true"></i><span></span>';
      li.querySelector('span').textContent = val;
      metaEl.appendChild(li);
    });

    // Amenities (array)
    if(amenitiesSection && amenitiesListEl){
      const raw = (window.translateRaw ? window.translateRaw(prefix + '.amenities') : undefined);
      if(Array.isArray(raw) && raw.length){
        amenitiesListEl.innerHTML='';
        raw.forEach(entry => {
          const li = document.createElement('li');
          li.className='amenity-item';
          li.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i><span></span>';
          li.querySelector('span').textContent = typeof entry === 'string' ? entry : String(entry);
          amenitiesListEl.appendChild(li);
        });
        amenitiesSection.hidden = false;
      } else {
        amenitiesSection.hidden = true;
      }
    }

    // Long Description (HTML paragraphs) – taken from translation key .longDescription
    if(descSection && descBody){
      const rawDesc = window.translateRaw ? window.translateRaw(prefix + '.longDescription') : '';
      if(typeof rawDesc === 'string' && rawDesc.trim()){
        // Basic safety: strip script tags (should not exist in controlled JSON)
        const cleaned = rawDesc.replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'');
        descBody.innerHTML = cleaned; // lang.js sanitizer already applied only to data-i18n; here we trust controlled content
        descSection.hidden = false;
      } else {
        descSection.hidden = true;
      }
    }
  }

  // State
  let galleryConfig = null; // { images: [...] }
  let variantsAvailable = false; // determined once
  const INITIAL_LIMIT = 4; // initial images to render before "Weitere Bilder anzeigen"
  let expanded = false;

  // Detect if optimized variants exist
  // 1) Try variants.json map (authoritative, no network noise)
  // 2) Fallback: HEAD probe for one AVIF sample (maintains backward compatibility)
  async function detectVariants(folder){
    variantsAvailable = false;
    try {
      const mapRes = await fetch('/assets/data/variants.json', { cache:'no-store' });
      if(mapRes.ok){
        const map = await mapRes.json();
        if(Object.prototype.hasOwnProperty.call(map, key)){
          variantsAvailable = !!map[key];
          return; // authoritative
        }
      }
    } catch(_) { /* ignore and fallback */ }
    try {
      const testUrl = folder + 'main-400.avif';
      const res = await fetch(testUrl, { method:'HEAD' });
      variantsAvailable = res.ok;
    } catch(_) { variantsAvailable = false; }
  }

  function buildPictureElement(folder, file){
    // Einheitliches Bild: kein Hero, alle gleich groß
    const base = file.replace(/\.(png|webp|avif)$/,'');
    const widths = [400,800,1200];
    const title = t(prefix + '.title') || key;
    const photoWord = t('wohnungDetail.gallery.photo') || 'Foto';
    const index = galleryConfig.images.indexOf(file); // 0-based
    const alt = `${title} – ${photoWord} ${index+1}`;
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding='async';
    img.className='img-fluid rounded shadow-sm gallery-img';
    img.setAttribute('data-filename', file);
    // If sized variants exist, use responsive srcset; otherwise prefer base AVIF/WEBP and fall back to PNG
    if(variantsAvailable){
      const picture = document.createElement('picture');
      const avifSet = widths.map(w=>`${encodeURI(folder + base + '-' + w + '.avif')} ${w}w`).join(', ');
      const webpSet = widths.map(w=>`${encodeURI(folder + base + '-' + w + '.webp')} ${w}w`).join(', ');
      const sizes = '(max-width: 576px) 50vw, (max-width: 992px) 25vw, 200px';
      const sAvif = document.createElement('source'); sAvif.type='image/avif'; sAvif.setAttribute('data-srcset', avifSet); sAvif.sizes = sizes;
      const sWebp = document.createElement('source'); sWebp.type='image/webp'; sWebp.setAttribute('data-srcset', webpSet); sWebp.sizes = sizes;
      img.dataset.src = encodeURI(folder + file);
      img.width=400; // Basisbreite für Layout-Stabilität
      picture.appendChild(sAvif);
      picture.appendChild(sWebp);
      picture.appendChild(img);
      picture.className='gallery-picture';
      return picture;
    } else {
      const picture = document.createElement('picture');
      const sAvif = document.createElement('source'); sAvif.type='image/avif'; sAvif.setAttribute('data-srcset', encodeURI(`${folder}${base}.avif`));
      const sWebp = document.createElement('source'); sWebp.type='image/webp'; sWebp.setAttribute('data-srcset', encodeURI(`${folder}${base}.webp`));
      img.dataset.src = encodeURI(folder + `${base}.png`);
      img.width=400;
      picture.appendChild(sAvif);
      picture.appendChild(sWebp);
      picture.appendChild(img);
      picture.className='gallery-picture';
      return picture;
    }
  }

  function mountShowMoreButton(total){
    if(total <= INITIAL_LIMIT) return; // keine Hero-Kompensation mehr
    const container = document.getElementById('apt-gallery');
    const btnWrap = document.createElement('div');
    btnWrap.className='col-12';
  const btn = document.createElement('button');
  btn.type='button';
  btn.className='link-button gallery-more-btn';
    function syncLabel(){
      btn.textContent = expanded ? (t('wohnungDetail.gallery.showLess') || 'Weniger anzeigen') : (t('wohnungDetail.gallery.showMore') || 'Weitere Bilder anzeigen');
    }
    syncLabel();
    btn.addEventListener('click', ()=>{
      expanded = !expanded;
      renderImages();
      syncLabel();
    });
    btnWrap.appendChild(btn);
    container.appendChild(btnWrap);
  }

  let io = null;
  function ensureObserver(){
    if(io) return io;
    io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          const target = entry.target;
          if(target.tagName === 'IMG'){
            loadImage(target);
          } else if(target.tagName === 'PICTURE'){
            const img = target.querySelector('img');
            loadImage(img, target);
          }
          io.unobserve(target);
        }
      });
    }, { rootMargin: '200px 0px 200px 0px', threshold: 0.01 });
    return io;
  }

  function applyResponsiveSources(picture){
    picture.querySelectorAll('source').forEach(srcEl => {
      const ds = srcEl.getAttribute('data-srcset');
      if(ds) srcEl.setAttribute('srcset', ds);
    });
  }

  function loadImage(img, picture){
    if(!img || img.dataset.loaded) return;
    const src = img.dataset.src;
    if(!src) return;
    img.dataset.state='loading';
    if(picture) applyResponsiveSources(picture);
    img.src = src;
    img.addEventListener('load', ()=>{
      img.dataset.loaded='true';
      img.dataset.state='loaded';
    }, { once:true });
  }

  function clearGallery(){
    const g = document.getElementById('apt-gallery');
    if(g) g.innerHTML='';
  }

  function renderImages(){
    const gallery = document.getElementById('apt-gallery');
    if(!gallery || !galleryConfig) return;
    clearGallery();
    const folder = basePath + key + '/';
    const images = galleryConfig.images.slice();
    const limit = expanded ? images.length : INITIAL_LIMIT;
    images.slice(0, limit).forEach(file => {
      const col = document.createElement('div');
      col.className='col-6 col-md-4 col-lg-3';
      const el = buildPictureElement(folder, file);
      col.appendChild(el); gallery.appendChild(col);
      ensureObserver().observe(el); // Bild oder Picture beobachten
    });
    mountShowMoreButton(galleryConfig.images.length);
  }

  async function buildGallery(){
    try {
      const res = await fetch(configPath, { cache:'no-store' });
      if(!res.ok) throw new Error('config fetch failed');
      const full = await res.json();
      galleryConfig = full[key];
      if(!galleryConfig || !Array.isArray(galleryConfig.images) || !galleryConfig.images.length) return;
      const folder = basePath + key + '/';
      await detectVariants(folder);
      renderImages();
    } catch(e){ console.warn('Gallery config error', e); }
  }

  function buildJSONLD(){
    const existing = document.head.querySelector('script[data-generated="apartment-detail-jsonld"]');
    if(existing) existing.remove();
    const name = t(prefix + '.title') || key;
    const desc = t(prefix + '.text') || '';
    const city = t(prefix + '.city');
    const rooms = (t(prefix + '.rooms').match(/\d+/)||[])[0];
    const beds = (t(prefix + '.beds').match(/\d+/)||[])[0];
    const area = (t(prefix + '.area').match(/\d+/)||[])[0];
    const priceRaw = t(prefix + '.price') || '';
    // Extract numeric price (first number) and normalize to Offer if found
    const priceNumber = (priceRaw.match(/\d+[\.,]?\d*/)||[])[0];
    let offerObj = undefined;
    if(priceNumber){
      const normalized = parseFloat(priceNumber.replace(',','.'));
      if(!isNaN(normalized)){
        offerObj = [{
          '@type':'Offer',
          priceCurrency:'EUR',
          price: normalized,
          availability:'https://schema.org/InStock'
        }];
      }
    }
    const folderAbs = location.origin + basePath + key + '/';
    const imageUrls = (galleryConfig?.images||[]).map(f=>folderAbs+f);
    const json = {
      '@context':'https://schema.org',
      '@type':'Apartment',
      '@id': location.origin + '/wohnungen#'+key,
      name, description: desc,
      address: city ? { '@type':'PostalAddress', addressLocality: city } : undefined,
      numberOfRooms: rooms ? parseInt(rooms,10) : undefined,
      floorSize: area ? { '@type':'QuantitativeValue', value: parseInt(area,10), unitCode:'MTK' } : undefined,
      bed: beds ? { '@type':'BedDetails', numberOfBeds: parseInt(beds,10) } : undefined,
      image: imageUrls,
      amenityFeature: (function(){
        const a = (window.translateRaw ? window.translateRaw(prefix + '.amenities') : undefined);
        if(!Array.isArray(a) || !a.length) return undefined;
        return a.map(txt => ({ '@type':'LocationFeatureSpecification', name: txt }));
      })(),
      offers: offerObj
    };
    // Add BreadcrumbList for detail page (static 3 item trail)
    const breadcrumb = {
      '@context':'https://schema.org',
      '@type':'BreadcrumbList',
      itemListElement: [
        { '@type':'ListItem', position:1, name: 'Start', item: location.origin + '/' },
        { '@type':'ListItem', position:2, name: t('wohnungen.headline') || 'Wohnungen', item: location.origin + '/wohnungen' },
        { '@type':'ListItem', position:3, name }
      ]
    };
    const container = { '@graph':[ json, breadcrumb ] };
    const s = document.createElement('script'); s.type='application/ld+json'; s.dataset.generated='apartment-detail-jsonld'; s.textContent=JSON.stringify(container, null, 2); document.head.appendChild(s);
  }

  function init(){
    fillContent();
    buildGallery().then(buildJSONLD); // ensure config -> JSON-LD uses curated list
  }

  document.addEventListener('i18n:ready', init);
  document.addEventListener('i18n:changed', ()=>{ fillContent(); buildJSONLD(); });
  init();
})();
