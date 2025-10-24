(function(){
  function setHiddenLang(){
    const hf = document.getElementById('lang');
    if (!hf) return;
    if (window.getLanguage){ hf.value = window.getLanguage(); }
  }
  function populateApartmentSelect(){
    const sel = document.getElementById('apartment');
    if(!sel || !window.translateKey) return;
    // Remove dynamically added options (keep placeholder at index 0)
    Array.from(sel.options).forEach((opt,i)=>{ if(i>0) opt.remove(); });
  const keys = ['w03_exklusiv','w04_exklusiv_2','w01_derko_apart','w02_derko_apart_2','w05_dus_1','w06_dus_2','w07_dus_3'];
    keys.forEach(k=>{
      const title = window.translateKey('wohnungen.cards.'+k+'.title') || k;
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = title;
      sel.appendChild(opt);
    });
  }

  function toggleBookingOnlyFields(){
    const topic = document.getElementById('topic');
    const groups = document.querySelectorAll('[data-booking-only]');
    if(!topic || !groups.length) return;
    const show = topic.value === 'booking';
    groups.forEach(group => {
      // Find form controls within this group
      const controls = group.querySelectorAll('input, select, textarea');
      if(show){
        group.hidden = false;
        controls.forEach(el=>{ el.disabled = false; });
      } else {
        group.hidden = true;
        controls.forEach(el=>{
          el.disabled = true;
          if(el.tagName === 'SELECT'){
            el.selectedIndex = 0; // back to placeholder
          } else if(el.type === 'date' || el.type === 'text' || el.type === 'tel' || el.type === 'email' || el.type === 'number'){
            el.value = '';
          }
        });
      }
    });
  }

  function initTopicBehavior(){
    const topic = document.getElementById('topic');
    if(!topic) return;
    topic.addEventListener('change', toggleBookingOnlyFields);
    // Run once on load to set initial state
    toggleBookingOnlyFields();
  }

  // Lightweight bot/rate protection: set JS flag, timestamp, and disable double submit
  function initAntiBot(){
    const form = document.getElementById('contact-form');
    if(!form) return;
    const jsEnabled = form.querySelector('#js_enabled');
    const ts = form.querySelector('#form_ts');
    const csrfField = form.querySelector('#csrf_token');
    const honeypot = form.querySelector('#company');
    const alertBox = document.getElementById('form-alert');
    if (jsEnabled) jsEnabled.value = '1';
    if (ts) ts.value = String(Date.now());
    // Fetch CSRF token asynchronously
    if (csrfField){
      fetch('/api/csrf.php', { credentials:'same-origin' })
        .then(r=> r.ok ? r.json() : Promise.reject())
        .then(data=>{ if(data && data.ok && data.token){ csrfField.value = data.token; } })
        .catch(()=>{ /* silently ignore; server will reject */ });
    }
    let submitting = false;
  form.addEventListener('submit', (e)=>{
      // Client-side bot heuristics: block if honeypot filled or time since render < 1500ms (testing threshold)
      const now = Date.now();
      const start = ts ? parseInt(ts.value || '0', 10) : 0;
      const tooFast = start && (now - start < 1500);
      const isTrap = honeypot && honeypot.value && honeypot.value.trim() !== '';

      // 1) If honeypot is filled, treat as bot immediately
      if (isTrap){
        e.preventDefault();
        if (alertBox){
          const t = (window.translateKey && (window.translateKey('kontakt.validation.bot') || window.translateKey('validation.bot'))) || 'Request blocked: please try again in a few seconds.';
          alertBox.textContent = t;
          alertBox.classList.remove('d-none');
        }
        return;
      }

      // Enforce persons >= 1 for number input
      const personsEl = document.getElementById('persons');
      if (personsEl && !personsEl.disabled) {
        const val = personsEl.value !== '' ? parseInt(personsEl.value, 10) : NaN;
        if (!Number.isFinite(val) || val < 1) {
          personsEl.setCustomValidity('invalid');
        } else {
          personsEl.setCustomValidity('');
        }
      }

      // 2) If form is invalid (missing required fields), let Bootstrap validation show errors and hide bot alert
      if (!form.checkValidity()){
        e.preventDefault();
        form.classList.add('was-validated');
        if (alertBox){ alertBox.classList.add('d-none'); }
        return;
      }

      // 3) If form is valid but too fast, show bot alert and block
      if (tooFast){
        e.preventDefault();
        if (alertBox){
          const t = (window.translateKey && (window.translateKey('kontakt.validation.bot') || window.translateKey('validation.bot'))) || 'Request blocked: please try again in a few seconds.';
          alertBox.textContent = t;
          alertBox.classList.remove('d-none');
        }
        return;
      }

      // 4) All good: ensure fresh CSRF (refresh issued_at) just before submit
      // Always prevent default and manually submit after a quick refresh call
      e.preventDefault();
      if (submitting) return;
      const proceed = () => {
        if (submitting) return;
        submitting = true;
        const btn = form.querySelector('button[type="submit"]');
        if (btn){ btn.disabled = true; btn.setAttribute('aria-disabled','true'); }
        form.submit();
      };
      const refreshCsrf = () => fetch('/api/csrf.php', { credentials:'same-origin' })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data && data.ok && data.token && csrfField){ csrfField.value = data.token; } })
        .catch(()=>{/* ignore and proceed anyway */});
      // If we have a CSRF field, try to refresh first, then submit
      if (csrfField) {
        refreshCsrf().finally(proceed);
      } else {
        proceed();
      }
    }, { capture:true });
  }

  function initDatePickers(){
    if (typeof flatpickr === 'undefined') return;

    const uiLang = (document.getElementById('lang')?.value) || (window.getLanguage ? window.getLanguage() : 'de');
    const locale = uiLang && uiLang.toLowerCase().startsWith('de') ? (window.flatpickr?.l10ns?.de || 'de') : 'default';

    const fromEl = document.getElementById('date_from');
    const toEl = document.getElementById('date_to');
    if (!fromEl || !toEl) return;
    // Destroy previous instances if any (when language changes)
    if (fromEl._flatpickr) { try { fromEl._flatpickr.destroy(); } catch(e){} }
    if (toEl._flatpickr) { try { toEl._flatpickr.destroy(); } catch(e){} }

    const df = flatpickr(fromEl, {
      dateFormat: 'd.m.Y',
      allowInput: true,
      disableMobile: true,
      locale,
      monthSelectorType: 'static'
    });
    const dt = flatpickr(toEl, {
      dateFormat: 'd.m.Y',
      allowInput: true,
      disableMobile: true,
      locale,
      monthSelectorType: 'static'
    });

    const syncMin = (selectedDates) => {
      if (selectedDates && selectedDates[0]) {
        dt.set('minDate', selectedDates[0]);
        const toDate = dt.selectedDates?.[0];
        if (toDate && toDate < selectedDates[0]) dt.clear();
      } else {
        dt.set('minDate', null);
      }
    };
    df.config.onChange.push(syncMin);
    // If a from-date already exists (e.g., user typed or browser restored), enforce minDate immediately
    try { syncMin(df.selectedDates); } catch(e){}

    // Make year non-editable and display as static label
    const ensureStaticYear = (fp) => {
      try {
        const cm = fp.calendarContainer?.querySelector('.flatpickr-current-month');
        if (!cm) return;
        // Ensure internal controls have stable ids to satisfy a11y/linting tools
        const monthSel = cm.querySelector('select.flatpickr-monthDropdown-months');
        if (monthSel && !monthSel.id) {
          monthSel.id = fp.input && fp.input.id ? fp.input.id + '_month' : 'fp_month_' + Math.random().toString(36).slice(2,8);
          // These are not meant to be form fields; make them non-focusable for screen readers
          monthSel.setAttribute('aria-hidden','true');
          monthSel.setAttribute('tabindex','-1');
        }
        const yearSpin = cm.querySelector('.numInputWrapper input');
        if (yearSpin && !yearSpin.id) {
          yearSpin.id = fp.input && fp.input.id ? fp.input.id + '_year' : 'fp_year_' + Math.random().toString(36).slice(2,8);
          yearSpin.setAttribute('aria-hidden','true');
          yearSpin.setAttribute('tabindex','-1');
          // Avoid being treated as a form field by some validators
          yearSpin.setAttribute('form','');
          yearSpin.setAttribute('name','');
        }
        // add display span if not present
        let yearDisplay = cm.querySelector('.cur-year-display');
        if (!yearDisplay){
          yearDisplay = document.createElement('span');
          yearDisplay.className = 'cur-year-display';
          // insert after month
          const curMonth = cm.querySelector('.cur-month');
          if (curMonth && curMonth.nextSibling){
            curMonth.parentNode.insertBefore(yearDisplay, curMonth.nextSibling);
          } else if (curMonth){
            curMonth.parentNode.appendChild(yearDisplay);
          } else {
            cm.appendChild(yearDisplay);
          }
        }
        yearDisplay.textContent = String(fp.currentYear);
        // hide numeric input wrapper if present
        const numWrap = cm.querySelector('.numInputWrapper');
        if (numWrap){ numWrap.style.display = 'none'; }
      } catch(_){}
    };

    const updateYearDisplay = (fp) => {
      try {
        const cm = fp.calendarContainer?.querySelector('.flatpickr-current-month');
        let yearDisplay = cm?.querySelector('.cur-year-display');
        if (!yearDisplay) {
          // create if missing
          ensureStaticYear(fp);
          yearDisplay = cm?.querySelector('.cur-year-display');
        }
        if (yearDisplay) yearDisplay.textContent = String(fp.currentYear);
      } catch(_){}
    };

    df.config.onReady.push(() => ensureStaticYear(df));
    df.config.onOpen = (df.config.onOpen || []).concat([() => ensureStaticYear(df)]);
    df.config.onYearChange = (df.config.onYearChange || []).concat([() => updateYearDisplay(df)]);
    df.config.onMonthChange = (df.config.onMonthChange || []).concat([() => updateYearDisplay(df)]);
    dt.config.onReady.push(() => ensureStaticYear(dt));
    dt.config.onOpen = (dt.config.onOpen || []).concat([() => ensureStaticYear(dt)]);
    dt.config.onYearChange = (dt.config.onYearChange || []).concat([() => updateYearDisplay(dt)]);
    dt.config.onMonthChange = (dt.config.onMonthChange || []).concat([() => updateYearDisplay(dt)]);

    // Fallback: ensure after a tick (covers cases where DOM is attached slightly later)
    setTimeout(() => { ensureStaticYear(df); ensureStaticYear(dt); }, 0);
  }

  function initCaptcha(){
    const img = document.getElementById('captcha-img');
    if (!img) return;
    const btn = document.getElementById('captcha-refresh');
    const refresh = () => { img.src = '/api/captcha.php?r=' + Date.now(); };
    if (btn && !btn._wired){ btn.addEventListener('click', refresh); btn._wired = true; }
    // cache-bust on first load
    refresh();
  }

  function markRequiredLabels(){
    // Map input/select/textarea[required] to its label[for]
    const requiredControls = document.querySelectorAll('#contact-form input[required], #contact-form select[required], #contact-form textarea[required]');
    requiredControls.forEach(ctrl => {
      const id = ctrl.getAttribute('id');
      if (!id) return;
      const label = document.querySelector('label.form-label[for="'+CSS.escape(id)+'"]');
      if (label) label.classList.add('is-required-label');
    });
  }

  function linkPrivacyPolicyWord(){
    const label = document.querySelector('label[for="privacy"][data-i18n="kontakt.form.privacyConsent"]');
    if(!label) return;
    // Idempotent guard
    if(label.querySelector('a[data-privacy-link]')) return;
    const txt = label.textContent || '';
  const target = 'datenschutz.html';
    const keyword = 'Datenschutzerklärung';
    const idx = txt.indexOf(keyword);
    if(idx === -1){
      // No keyword found (likely non-DE language). Do nothing to avoid awkward phrasing.
      return;
    }
    const before = txt.slice(0, idx);
    const after = txt.slice(idx + keyword.length);
    label.textContent = '';
    label.appendChild(document.createTextNode(before));
    const a = document.createElement('a');
  a.href = target; a.textContent = keyword; a.setAttribute('data-privacy-link','');
  a.className = 'inline-link';
    a.rel = 'noopener noreferrer';
    a.target = '_blank';
    label.appendChild(a);
    label.appendChild(document.createTextNode(after));
  }

  // Schedule linking after i18n events so it runs after applyTranslations()
  function schedulePrivacyLink(){
    setTimeout(linkPrivacyPolicyWord, 0);
  }

  document.addEventListener('i18n:ready', populateApartmentSelect);
  document.addEventListener('i18n:changed', populateApartmentSelect);
  document.addEventListener('i18n:ready', schedulePrivacyLink);
  document.addEventListener('i18n:changed', schedulePrivacyLink);
  document.addEventListener('i18n:ready', setHiddenLang);
  document.addEventListener('i18n:changed', setHiddenLang);
  document.addEventListener('i18n:ready', initDatePickers);
  document.addEventListener('i18n:changed', initDatePickers);
  document.addEventListener('DOMContentLoaded', initTopicBehavior);
  document.addEventListener('DOMContentLoaded', markRequiredLabels);
  document.addEventListener('DOMContentLoaded', initAntiBot);
  document.addEventListener('DOMContentLoaded', initCaptcha);
  // In case scripts load after DOMContentLoaded (defer), run immediately
  if(document.readyState === 'interactive' || document.readyState === 'complete'){
    initTopicBehavior();
    schedulePrivacyLink();
    markRequiredLabels();
    setHiddenLang();
    initDatePickers();
    initAntiBot();
    initCaptcha();
  }
})();
