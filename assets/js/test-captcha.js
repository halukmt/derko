(function(){
  function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function pick(arr){ return arr[randInt(0, arr.length-1)]; }

  function makeCode(len){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i=0;i<len;i++) out += chars[randInt(0, chars.length-1)];
    return out;
  }

  function buildSvg(code){
    const w = 120, h = 40;
    const letters = code.split('');
    const colors = ['#0b2239', '#B69B5C', '#6c757d'];
    let x = 10;

    const noise = Array.from({length:8}).map(()=>
      `<circle cx="${randInt(0,w)}" cy="${randInt(0,h)}" r="${randInt(1,3)}" fill="${pick(colors)}" opacity=".25"/>`
    ).join('');

    const glyphs = letters.map((ch)=>{
      const y = 26 + randInt(-3,3);
      const rx = x + randInt(-2,2);
      const rot = randInt(-12,12);
      const col = pick(colors);
      x += 20 + randInt(0,4);
      return `<g transform="translate(${rx},${y}) rotate(${rot})">
        <text x="0" y="0" font-family="Inter,Arial,Helvetica,sans-serif" font-size="22" font-weight="700" fill="${col}">${ch}</text>
      </g>`;
    }).join('');

    const line = `<line x1="${randInt(0,w/2)}" y1="${randInt(0,h)}" x2="${randInt(w/2,w)}" y2="${randInt(0,h)}" stroke="#B69B5C" stroke-opacity=".35"/>`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#f7f8f9"/>
  ${noise}
  ${glyphs}
  ${line}
</svg>`;
    return svg;
  }

  function render(){
    const box = document.getElementById('captcha-box');
    if (!box) return;
    const code = makeCode(5);
    const svg = buildSvg(code);
    // Use data URL to avoid inline SVG in DOM (keeps it simple under CSP img-src data: allowed)
    const data = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    box.innerHTML = `<img src="${data}" alt="CAPTCHA" width="120" height="40" class="rounded border">`;
  }

  function init(){
    render();
    const btn = document.getElementById('btn-refresh');
    if (btn) btn.addEventListener('click', render);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
