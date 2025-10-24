(function(){
  var params = new URLSearchParams(location.search);
  var wait = params.get('wait');
  function update(){
    if(!wait) return; // default i18n text is fine
    var el = document.getElementById('msg');
    if(!el) return;
    var tmpl = (typeof window.translateKey === 'function') ? window.translateKey('error.rate.messageWithWait') : '';
    var text = (tmpl && tmpl.indexOf('{seconds}') !== -1) ? tmpl.replace('{seconds}', wait) : el.textContent;
    el.textContent = text;
  }
  document.addEventListener('i18n:ready', update);
  document.addEventListener('i18n:changed', update);
  document.addEventListener('DOMContentLoaded', update);
})();
