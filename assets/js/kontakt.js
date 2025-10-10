(function(){
  function populateApartmentSelect(){
    const sel = document.getElementById('apartment');
    if(!sel || !window.translateKey) return;
    // Remove dynamically added options (keep placeholder at index 0)
    Array.from(sel.options).forEach((opt,i)=>{ if(i>0) opt.remove(); });
  const keys = ['rahm','bonn','dus_airport'];
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

  document.addEventListener('i18n:ready', populateApartmentSelect);
  document.addEventListener('i18n:changed', populateApartmentSelect);
  document.addEventListener('DOMContentLoaded', initTopicBehavior);
  // In case scripts load after DOMContentLoaded (defer), run immediately
  if(document.readyState === 'interactive' || document.readyState === 'complete'){
    initTopicBehavior();
  }
})();
