(function(){
  'use strict';
  function initPartnersSliders(){
    document.querySelectorAll('.partners-band').forEach(setupSlider);
  }

  function setupSlider(band){
    const viewport = band.querySelector('.partners-viewport');
    const track = band.querySelector('.partners-track');
    const prev = band.querySelector('.partners-prev');
    const next = band.querySelector('.partners-next');
    if(!viewport || !track || !prev || !next){ return; }

    // helper to update control visibility/state
    function updateControls(){
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      const atStart = viewport.scrollLeft <= 0;
      const atEnd = viewport.scrollLeft >= maxScroll - 1; // epsilon
      prev.disabled = atStart;
      next.disabled = atEnd;
      // If everything fits, hide controls
      band.dataset.controls = (maxScroll <= 0) ? 'hidden' : 'visible';
    }

    // scroll by one item (or viewport width / 1.2)
    const getStep = ()=>{
      const items = Array.from(track.querySelectorAll('.partners-item'));
      if(items.length){
        // compute average item width including gap
        const rects = items.slice(0, Math.min(items.length, 3)).map(el=>el.getBoundingClientRect().width);
        const avg = rects.reduce((a,b)=>a+b,0)/rects.length;
        return Math.max(avg * 2, viewport.clientWidth * 0.6);
      }
      return viewport.clientWidth * 0.6;
    };

    function smoothScrollBy(delta){
      viewport.scrollBy({ left: delta, behavior: 'smooth' });
    }

    prev.addEventListener('click', ()=> smoothScrollBy(-getStep()));
    next.addEventListener('click', ()=> smoothScrollBy(getStep()));

    // Keyboard support when viewport focused
    viewport.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowLeft'){ e.preventDefault(); smoothScrollBy(-getStep()); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); smoothScrollBy(getStep()); }
    });

    // Update on resize and on scroll
    const ro = new ResizeObserver(updateControls);
    ro.observe(viewport);
    window.addEventListener('resize', updateControls, { passive: true });
    viewport.addEventListener('scroll', ()=>{
      // throttle via rAF
      if(viewport.__raf) return;
      viewport.__raf = requestAnimationFrame(()=>{ viewport.__raf = null; updateControls(); });
    }, { passive: true });

    // Initial state
    updateControls();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initPartnersSliders);
  }else{
    initPartnersSliders();
  }
})();
