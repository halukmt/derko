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

  document.addEventListener('i18n:ready', populateApartmentSelect);
  document.addEventListener('i18n:changed', populateApartmentSelect);
})();
