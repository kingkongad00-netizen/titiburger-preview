/* Motion is decorative: no library / reduced motion keeps all content visible. */
(function () {
  'use strict';
  function init() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', function () {
      var card = document.querySelector('.territory-card--titi');
      if (card) {
        var radius = card.querySelector('.territory-radius');
        var store = card.querySelector('.territory-store');
        var halo = card.querySelector('.territory-pulse');
        var reveal = gsap.timeline({ paused: true });
        reveal.fromTo(radius, { attr: { r: 74 }, opacity: 0 },
          { attr: { r: 112 }, opacity: 1, duration: 1, ease: 'power2.out' });
        reveal.fromTo(store, { scale: 0.6, opacity: 0, svgOrigin: '220 150' },
          { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.4)' }, 0.35);
        ScrollTrigger.batch([card], {
          start: 'top 84%', once: true,
          onEnter: function () { reveal.play(); }
        });
        var pulse = gsap.fromTo(halo, { attr: { r: 112 }, opacity: 0.38 }, {
          attr: { r: 127 }, opacity: 0, duration: 2.4, repeat: -1,
          ease: 'power1.out', paused: true, immediateRender: false
        });
        ScrollTrigger.create({
          id: 'titi-territory-pulse', trigger: card,
          start: 'top 85%', end: 'bottom top',
          onToggle: function (state) { state.isActive ? pulse.play() : pulse.pause(); }
        });
      }
      var types = document.querySelector('.opening-types');
      if (types) {
        types.querySelectorAll('.opening-type').forEach(function (article, index) {
          var photo = article.querySelector('.opening-type__circle');
          var labels = article.querySelectorAll('.opening-type__label, h3');
          var entrance = gsap.timeline({ paused: true });
          entrance.fromTo(photo, { y: 44, scale: 0.9, opacity: 0 }, {
            y: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out'
          });
          entrance.fromTo(labels, { y: 15, opacity: 0 }, {
            y: 0, opacity: 1, stagger: 0.09, duration: 0.5, ease: 'power2.out'
          }, 0.4);
          ScrollTrigger.batch([article], {
            start: 'top 80%', end: 'bottom 20%',
            onEnter: function () {
              entrance.delay(window.matchMedia('(min-width: 601px)').matches ? index * 0.15 : 0).restart(true);
            },
            onEnterBack: function () { entrance.delay(0).restart(); }
          });
        });
      }
      var perks = document.querySelector('#perks');
      if (perks) {
        var eyebrow = perks.querySelector('.eyebrow');
        var heading = perks.querySelector('.h2');
        var lead = perks.querySelector('.lead');
        var accent = perks.querySelector('.perks__accent');
        var intro = gsap.timeline({ paused: true });
        intro.fromTo(eyebrow, { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
        intro.fromTo(heading, { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0.15);
        intro.fromTo(accent, { '--perks-underline': 0 },
          { '--perks-underline': 1, duration: 0.65, ease: 'power2.out' }, 0.65);
        intro.fromTo(lead, { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65, ease: 'power2.out' }, 0.5);
        ScrollTrigger.batch([heading], {
          start: 'top 85%', end: 'bottom 20%',
          onEnter: function () { intro.restart(); },
          onEnterBack: function () { intro.restart(); }
        });
        var perkCards = perks.querySelectorAll('.perk');
        var benefitCount = perks.querySelector('.perks__count-current');
        var benefitSteps = perks.querySelectorAll('.perks__steps i');
        var seenPerks = new Set();
        var totalBenefits = perkCards.length;
        perks.querySelector('.perks__count > span').textContent = '/ ' + String(totalBenefits).padStart(2, '0');
        benefitCount.textContent = '00';
        benefitSteps.forEach(function (step) { step.classList.add('is-pending'); });
        var countPop = gsap.fromTo(benefitCount, { y: 6, opacity: 0.5 },
          { y: 0, opacity: 1, duration: 0.25, paused: true, immediateRender: false });
        var perkEntrances = new Map();
        perkCards.forEach(function (perk) {
          perkEntrances.set(perk, gsap.fromTo(perk, { y: 44, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', paused: true,
              onStart: function () {
                seenPerks.add(perk);
                benefitCount.textContent = String(seenPerks.size).padStart(2, '0');
                benefitSteps.forEach(function (step, index) {
                  step.classList.toggle('is-pending', index >= seenPerks.size);
                });
                countPop.restart();
              }
            }));
        });
        ScrollTrigger.batch(perkCards, {
          start: 'top 78%', once: true, interval: 0.1,
          onEnter: function (batch) {
            batch.forEach(function (perk, index) {
              perkEntrances.get(perk).delay(index * 0.14).play();
            });
          }
        });
      }
      return function () {
        // A delayed fromTo can leave its starting opacity after GSAP reverts.
        if (halo) {
          halo.style.removeProperty('opacity');
          halo.setAttribute('r', '112');
        }
        if (benefitCount) {
          benefitCount.textContent = String(totalBenefits).padStart(2, '0');
          benefitCount.style.removeProperty('opacity');
          benefitSteps.forEach(function (step) { step.classList.remove('is-pending'); });
        }
      };
    });
    if (document.fonts) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  // This deferred file runs after GSAP and the DOM; media must not delay reveals.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('load', function () {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }, { once: true });
})();
