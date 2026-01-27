// faq.js
// Generates JSON-LD FAQPage schema from i18n FAQ data
// Runs after translations are loaded to ensure consistent content between UI and structured data

(function(){
  'use strict';

  // FAQ item slugs (in order)
  const FAQ_SLUGS = [
    'guenstige-monteurzimmer',
    'provisionsfreie-messewohnungen',
    'handwerker-teams-duisburg',
    'entfernung-flughafen',
    'ausstattung-wlan-kueche',
    'parkmoeglichkeiten',
    'kurzfristige-buchung',
    'preise-uebernachtung',
    'rabatte-firmen',
    'bettwaesche-handtuecher'
  ];

  // Strip HTML tags from answer text for JSON-LD (plain text only)
  function stripHTML(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // Build FAQPage JSON-LD structure
  function buildFAQJsonLD() {
    // Check if translateKey function is available
    if (!window.translateKey) {
      console.warn('FAQ JSON-LD: translateKey not available yet');
      return;
    }

    // Remove any existing FAQ JSON-LD
    const existing = document.head.querySelector('script[data-generated="faq-jsonld"]');
    if (existing) existing.remove();

    // Build mainEntity array from FAQ items
    const mainEntity = FAQ_SLUGS.map(slug => {
      const keyPrefix = 'faq.items.' + slug;
      const question = window.translateKey(keyPrefix + '.q');
      const answerHTML = window.translateKey(keyPrefix + '.a');
      
      if (!question || !answerHTML) {
        console.warn('FAQ JSON-LD: Missing translation for', slug);
        return null;
      }

      // Strip HTML tags from answer for clean JSON-LD text
      const answerText = stripHTML(answerHTML);

      return {
        '@type': 'Question',
        'name': question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': answerText
        }
      };
    }).filter(item => item !== null);

    // Only generate JSON-LD if we have FAQ items
    if (mainEntity.length === 0) {
      console.warn('FAQ JSON-LD: No FAQ items found');
      return;
    }

    // Create FAQPage schema
    const jsonld = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': mainEntity
    };

    // Inject JSON-LD script into head
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.generated = 'faq-jsonld';
    script.textContent = JSON.stringify(jsonld, null, 2);
    document.head.appendChild(script);

    console.log('FAQ JSON-LD generated with', mainEntity.length, 'items');
  }

  // Generate JSON-LD when translations are ready
  document.addEventListener('i18n:ready', buildFAQJsonLD);
  
  // Regenerate when language changes
  document.addEventListener('i18n:changed', buildFAQJsonLD);

  // Fallback: try generating after a short delay if events haven't fired
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(buildFAQJsonLD, 500);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(buildFAQJsonLD, 500);
    });
  }
})();
