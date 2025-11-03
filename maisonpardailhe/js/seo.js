(async function(){
  try {
    // Fetch server config to get appUrl if available
    let appUrl = window.location.origin;
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        if (cfg && cfg.appUrl) appUrl = cfg.appUrl.replace(/\/$/, '');
      }
    } catch (e) {
      // ignore, fallback to window.location.origin
    }

    // Resolve canonical: if meta exists, make absolute, otherwise create from location
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement('link');
    canonical.setAttribute('rel','canonical');
    const rawHref = canonical.getAttribute('href') || window.location.pathname || '/';
    let hrefAbs = rawHref;
    try {
      const parsed = new URL(rawHref, appUrl + '/');
      hrefAbs = parsed.href;
    } catch (e) {
      // fallback
      hrefAbs = appUrl + (rawHref.startsWith('/') ? rawHref : '/' + rawHref);
    }
    canonical.setAttribute('href', hrefAbs);
    if (!document.head.contains(canonical)) document.head.appendChild(canonical);

    // Build JSON-LD LocalBusiness
    const ld = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": appUrl + '/#company',
      "name": "Maison Pardailhé",
      "url": appUrl,
      "image": appUrl + '/img/logo.png',
      "description": "Maison Pardailhé — artisan charcutier-traiteur à Roquettes & Toulouse. Pâté en croûte médaillé et traiteur sur-mesure.",
      "telephone": "+33562480229",
      "email": "maisonpardailhe@gmail.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Centre Commercial le Château",
        "addressLocality": "Roquettes",
        "postalCode": "31120",
        "addressRegion": "Occitanie",
        "addressCountry": "FR"
      },
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "09:00", "closes": "13:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Tuesday","Wednesday","Thursday","Friday","Saturday"], "opens": "16:00", "closes": "19:30" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Sunday"], "opens": "08:30", "closes": "13:00" }
      ],
      "sameAs": [
        appUrl + '/'
      ]
    };

    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  } catch (err) {
    console.warn('seo.js error', err);
  }
})();
