// Açılış (preloader) için <head> içinde, ilk boyamadan önce çalışan karar betiği ve en küçük CSS.
//
// Karar (sırayla):
//   hareket azaltma tercihi, arama motoru botu  → hiç gösterilmez
//   ?intro, ?intro=short, ?intro=slow, ?intro=hold → inceleme amaçlı zorla gösterilir (aşağıya bak)
//   bu oturumda zaten görüldüyse                → hiç
//   adreste #… varsa (ör. /#siparis)            → hiç (derin bağlantı, sipariş çekmecesi açılır)
//   ilk ziyaret + ana sayfa                      → "full" (tam sürüm)
//   dönen ziyaretçi / iç sayfa / veri tasarrufu → "short" (kısa sürüm)
//
// İnceleme parametreleri (yalnızca tasarımı görmek içindir, ziyaretçiye görünmez):
//   ?intro        tam sürümü her seferinde gösterir
//   ?intro=short  kısa sürümü gösterir
//   ?intro=slow   4 kat yavaş oynatır (hareketi incelemek için)
//   ?intro=hold   %64'te bekler; ekrana dokununca devam eder (iki değer: ?intro=slow,hold)
//
// Betik ES5 yazımıdır ve her sayfaya satır içi gömülür; küçük tutulmalıdır.

export const INTRO_BOOT = String.raw`(function(){try{var d=document.documentElement,n=navigator,m=/[?&]intro(?:=([\w,]*))?(?:&|$)/.exec(location.search),f=m?(m[1]||'full'):'',mode='';if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!/bot|crawl|spider|slurp|facebookexternalhit/i.test(n.userAgent)){if(m){mode=/short/.test(f)?'short':'full'}else if(!sessionStorage.getItem('fc-intro')&&!location.hash){var c=n.connection;mode=(localStorage.getItem('fc-seen')||!/^\/(index\.html)?$/.test(location.pathname)||(c&&c.saveData))?'short':'full'}}if(mode){d.classList.add('intro-on');d.setAttribute('data-intro-mode',mode);if(/slow|hold/.test(f))d.setAttribute('data-intro-flags',f);var l=document.createElement('link');l.rel='preload';l.as='image';l.href='/assets/brand/crest-320.webp';l.setAttribute('fetchpriority','high');document.head.appendChild(l)}}catch(e){}})();`;

// İlk boyamada perde (iki orman yeşili kapı) hazır olsun diye gereken en küçük CSS.
// Geri kalan görünüm src/styles/intro.css içindedir; sayfa içeriği perdenin ARKASINDA boyanır
// (içerik gizlenmez), böylece LCP ölçümü gecikmez.
export const INTRO_CRITICAL_CSS = '.intro{display:none}'
  + 'html.intro-on{overflow:hidden;background:#173628}'
  + 'html.intro-on .intro{display:block;position:fixed;inset:0;z-index:1000}'
  + 'html.intro-on .intro__panel{position:absolute;top:0;bottom:0;width:calc(50% + 1px);overflow:hidden;background:#173628}'
  + 'html.intro-on .intro__panel--l{left:0}'
  + 'html.intro-on .intro__panel--r{right:0}'
  + 'html.intro-on .intro__panel>*{opacity:0}';
