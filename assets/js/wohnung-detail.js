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
  const known = ['rahm','duisburg','bonn']; // sync with listing
  if(!key || !known.includes(key)){
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

    // Meta details list
    const metaFields = [
      { icon:'fa-location-dot', k: '.city' },
      { icon:'fa-door-closed', k: '.rooms' },
      { icon:'fa-bed', k: '.beds' },
      { icon:'fa-maximize', k: '.area' },
  { icon:'fa-square-parking', k: '.parking' },
  { icon:'fa-tag', k: '.price' }
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
  const INITIAL_LIMIT = 6; // images (excluding hero) to render initially
  let expanded = false;

  // Detect if optimized variants exist (checks one AVIF sample: main-400.avif)
  async function detectVariants(folder){
    try {
      const testUrl = folder + 'main-400.avif';
      const res = await fetch(testUrl, { method:'HEAD' });
      variantsAvailable = res.ok;
    } catch(_){ variantsAvailable = false; }
  }

  function buildPictureElement(folder, file, opts={}){
    // file: e.g. rahm_01.png or main.png
    const base = file.replace(/\.png$/,'');
    const widths = [400,800,1200];
    const title = t(prefix + '.title') || key;
    const photoWord = t('wohnungDetail.gallery.photo') || 'Foto';
    const index = galleryConfig.images.indexOf(file); // 0-based (hero maybe 0)
    const alt = `${title} – ${photoWord} ${index+1}`;
    const img = document.createElement('img');
    img.alt = alt;
    // Hero kann eager + hohe Priorität erhalten
    if(opts.hero){
      img.loading = 'eager';
      img.setAttribute('fetchpriority','high');
      // Intrinsische Maße für Stabilität (4:3) – reduziert minimale Layoutverschiebungen
      img.width = 1200; // Referenzbreite
      img.height = 900; // 4:3 Höhe
    } else {
      img.loading = 'lazy';
    }
    img.decoding='async';
    img.className='img-fluid rounded shadow-sm gallery-img';
    img.setAttribute('data-filename', file);
    // Fallback immediate src (lazy set later by IO) omitted
    if(!variantsAvailable){
      // We will lazy set src via data-src later
      img.dataset.src = folder + file;
      return img; // plain img element
    }
    const picture = document.createElement('picture');
    // Build srcset strings
    const avifSet = widths.map(w=>`${folder}${base}-${w}.avif ${w}w`).join(', ');
    const webpSet = widths.map(w=>`${folder}${base}-${w}.webp ${w}w`).join(', ');
    // PNG Set aktuell nicht zwingend benötigt – Browser nutzt <img src> als Fallback
    const sizes = opts.hero ? '100vw' : '(max-width: 576px) 50vw, (max-width: 992px) 25vw, 200px';
    const sAvif = document.createElement('source'); sAvif.type='image/avif'; sAvif.setAttribute('data-srcset', avifSet); sAvif.sizes = sizes;
    const sWebp = document.createElement('source'); sWebp.type='image/webp'; sWebp.setAttribute('data-srcset', webpSet); sWebp.sizes = sizes;
    // final <img> fallback uses PNG original (unoptimized) until lazy applied
    img.dataset.src = folder + file; // lazy actual src
    img.width=400; // hint (will adjust by browser with srcset)
    picture.appendChild(sAvif);
    picture.appendChild(sWebp);
    picture.appendChild(img);
    picture.className='gallery-picture';
    // Exponiere Sets für Preload (Hero)
    picture.dataset.avifSet = avifSet;
    picture.dataset.webpSet = webpSet;
    picture.dataset.sizes = sizes;
    return picture;
  }

  function mountShowMoreButton(total){
    if(total <= INITIAL_LIMIT+1) return; // +1 hero
    const container = document.getElementById('apt-gallery');
    const btnWrap = document.createElement('div');
    btnWrap.className='col-12';
    const btn = document.createElement('button');
    btn.type='button';
    btn.className='btn btn-outline-primary gallery-more-btn';
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
    if(!variantsAvailable) return;
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
    // Hero always first (index 0)
    const hero = images.shift();
    if(hero){
      const col = document.createElement('div'); col.className='col-12';
      const heroEl = buildPictureElement(folder, hero, { hero:true });
      if(heroEl.tagName === 'IMG'){ heroEl.classList.add('w-100','mb-2'); }
      else heroEl.querySelector('img').classList.add('w-100','mb-2');
      col.appendChild(heroEl); gallery.appendChild(col);
      // Smart Preload: nur ein Format (AVIF > WebP > PNG) vermeiden doppelte Bytes
      const preload = document.createElement('link');
      preload.rel='preload'; preload.as='image';
      if(variantsAvailable && heroEl.tagName === 'PICTURE'){
        // Verwende imagesrcset + imagesizes (Chrome Lighthouse bevorzugt)
        preload.setAttribute('imagesrcset', heroEl.dataset.avifSet + ', ' + heroEl.dataset.webpSet);
        preload.setAttribute('imagesizes', heroEl.dataset.sizes || '100vw');
        // Fallback href auf mittlere Größe (800) AVIF
        const midAvif = (heroEl.dataset.avifSet.split(',').find(s=>s.includes('800w'))||'').trim().split(' ')[0];
        if(midAvif) preload.href = midAvif; else preload.href = folder+hero;
      } else {
        preload.href=folder+hero;
      }
      document.head.appendChild(preload);
      // immediate load hero
      if(heroEl.tagName==='PICTURE'){
        applyResponsiveSources(heroEl);
        const img = heroEl.querySelector('img'); loadImage(img, heroEl);
      } else {
        loadImage(heroEl);
      }
    }
    const limit = expanded ? images.length : INITIAL_LIMIT;
    images.slice(0, limit).forEach(file => {
      const col = document.createElement('div');
      col.className='col-6 col-md-4 col-lg-3';
      const el = buildPictureElement(folder, file);
      col.appendChild(el); gallery.appendChild(col);
      const observeTarget = el.tagName==='PICTURE' ? el : el; // either
      ensureObserver().observe(observeTarget);
    });
    mountShowMoreButton(galleryConfig.images.length-1); // minus hero
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
      })()
    };
    const s = document.createElement('script'); s.type='application/ld+json'; s.dataset.generated='apartment-detail-jsonld'; s.textContent=JSON.stringify(json, null, 2); document.head.appendChild(s);
  }

  function init(){
    fillContent();
    buildGallery().then(buildJSONLD); // ensure config -> JSON-LD uses curated list
  }

  document.addEventListener('i18n:ready', init);
  document.addEventListener('i18n:changed', ()=>{ fillContent(); buildJSONLD(); });
  init();
})();
