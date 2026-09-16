/* Published landing integration. Static client previews deliberately have no backend flag. */
(function () {
  'use strict';
  if (!window.TITI_BACKEND) return;
  var base = window.TITI_BACKEND.apiBase || '';
  var forms = Array.from(document.querySelectorAll('form[data-lead]'));
  var site, submitting = false, pending = null, widgets = new Map();
  function status(form, text, error) {
    var el = form.querySelector('.lead-status');
    el.textContent = text; el.dataset.error = String(!!error);
    window.dispatchEvent(new Event('resize'));
  }
  async function request(path, body) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(base + path, {method: body ? 'POST' : 'GET', credentials: 'same-origin',
        headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal});
      var result = await response.json();
      if (!response.ok || result.error) {
        var err = new Error(result.error && result.error.message || '접수 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        err.status = response.status; throw err;
      }
      if (path === '/api/inquiries' && !(response.status === 201 && result.data && result.data.duplicate === false) && !(response.status === 200 && result.data && result.data.duplicate === true)) throw new Error('접수 결과를 확인하지 못했습니다. 다시 신청해 주세요.');
      return result.data;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('접수 확인이 지연되고 있습니다. 입력 내용은 유지됩니다. 다시 신청하면 중복 없이 확인합니다.');
      throw err;
    } finally { clearTimeout(timer); }
  }
  function scriptSlot(html, parent) {
    if (!html) return;
    var template = document.createElement('template'); template.innerHTML = html;
    Array.from(template.content.querySelectorAll('script')).forEach(function (old) {
      var script = document.createElement('script');
      Array.from(old.attributes).forEach(function (a) { script.setAttribute(a.name, a.value); });
      script.textContent = old.textContent; old.replaceWith(script);
    });
    parent.appendChild(template.content);
  }
  function safeUrl(url) {
    try { var parsed = new URL(url, location.href); return /^(https?:)$/.test(parsed.protocol) ? parsed.href : ''; }
    catch (_) { return ''; }
  }
  function showPopups(popups) {
    var visible = (Array.isArray(popups) ? popups : []).slice(0, 3).filter(function (popup) {
      if (!popup || !safeUrl(popup.pc_image_url)) return false;
      try { return !(Number(localStorage.getItem('titi-popup:' + popup.id + ':' + popup.version)) > Date.now()); } catch (_) { return true; }
    });
    if (!visible.length) return;
    var style = document.createElement('style');
    style.textContent = '.managed-popup{position:fixed;inset:0;z-index:1000;pointer-events:none;color:#24282e;font:14px/1.5 system-ui,sans-serif}.managed-popup__track{position:absolute;inset:0;overflow-x:auto;overflow-y:hidden;pointer-events:none;scroll-behavior:smooth;overscroll-behavior-x:contain}.managed-popup__card{position:absolute;box-sizing:border-box;pointer-events:auto;background:#fff;border:1px solid #ddd;box-shadow:0 12px 45px #0003;overflow:auto}.managed-popup__top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;position:sticky;top:0;background:#fff;z-index:1}.managed-popup__top strong{font-size:16px;min-width:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.managed-popup button{font:inherit;min-width:44px;min-height:44px;flex:none;background:#fff;border:1px solid #bbb;color:#24282e;cursor:pointer;font-weight:700}.managed-popup__foot{padding:10px 12px;background:#fff;position:sticky;bottom:0}.managed-popup__foot label{display:flex;align-items:center;gap:8px;min-height:44px;font-size:14px;font-weight:700}.managed-popup__foot input{width:20px;height:20px;flex:none}.managed-popup picture,.managed-popup__image-link{display:block}.managed-popup img{display:block;width:100%;height:auto;object-fit:contain}.managed-popup__track:focus-visible,.managed-popup button:focus-visible,.managed-popup a:focus-visible,.managed-popup input:focus-visible{outline:3px solid #225888;outline-offset:-3px}.managed-popup [hidden]{display:none!important}@media(prefers-reduced-motion:reduce){.managed-popup__track{scroll-behavior:auto}}';
    document.head.appendChild(style);
    var gallery = document.createElement('aside'); gallery.className = 'managed-popup';
    gallery.setAttribute('aria-label', '티티버거 창업 안내');
    var track = document.createElement('div'); track.className = 'managed-popup__track';
    track.tabIndex = 0; track.setAttribute('role', 'region'); track.setAttribute('aria-label', '창업 안내 팝업, 좌우로 넘기거나 방향키로 이동');
    gallery.appendChild(track); document.body.appendChild(gallery);
    var cards = [], current = 0;
    function number(value, fallback, min, max) { var n = Number(value); return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback)); }
    function remember(item) {
      if (!item.checkbox.checked) return;
      var until;
      if (Number(item.popup.hide_days) === 7) until = Date.now() + 7 * 86400000;
      else { var kst = new Date(Date.now() + 9 * 3600000); kst.setUTCHours(24, 0, 0, 0); until = kst.getTime() - 9 * 3600000; }
      try { localStorage.setItem('titi-popup:' + item.popup.id + ':' + item.popup.version, String(until)); } catch (_) {}
    }
    function finish() {
      var hadFocus = gallery.contains(document.activeElement);
      gallery.remove(); style.remove(); window.removeEventListener('resize', size); document.removeEventListener('keydown', escape);
      if (hadFocus) { var target = document.querySelector('main a, header a, button'); if (target) target.focus({preventScroll:true}); }
    }
    function closeAll() { cards.forEach(remember); finish(); }
    function escape(event) { if (event.key === 'Escape') closeAll(); }
    function move(index) {
      current = Math.max(0, Math.min(cards.length - 1, index));
      track.scrollTo({left:Math.max(0, cards[current].x - 14)});
    }
    function closeCard(item) {
      remember(item); var index = cards.indexOf(item); cards.splice(index, 1); item.card.remove();
      if (!cards.length) return finish();
      size(); move(Math.min(index, cards.length - 1)); cards[current].button.focus({preventScroll:true});
    }
    visible.forEach(function (popup) {
      var card = document.createElement('article'); card.className = 'managed-popup__card'; card.dataset.popupId = String(popup.id);
      var top = document.createElement('div'); top.className = 'managed-popup__top';
      var title = document.createElement('strong'); title.textContent = popup.title;
      var button = document.createElement('button'); button.type = 'button'; button.textContent = '닫기'; button.setAttribute('aria-label', popup.title + ' 닫기'); top.append(title, button);
      var picture = document.createElement('picture'), source = document.createElement('source'), img = document.createElement('img');
      source.media = '(max-width:640px)'; source.srcset = safeUrl(popup.mobile_image_url || popup.pc_image_url);
      img.src = safeUrl(popup.pc_image_url); img.alt = popup.title; picture.append(source, img);
      var content = picture, target = popup.link_url ? safeUrl(popup.link_url) : '';
      if (target) { content = document.createElement('a'); content.className = 'managed-popup__image-link'; content.href = target; content.appendChild(picture); content.addEventListener('click', closeAll); }
      var foot = document.createElement('div'); foot.className = 'managed-popup__foot';
      var label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox';
      label.append(checkbox, document.createTextNode(Number(popup.hide_days) === 7 ? '7일 동안 보지 않기' : '오늘 하루 보지 않기')); foot.appendChild(label);
      card.append(top, content, foot); track.appendChild(card);
      var item = {popup:popup, card:card, img:img, checkbox:checkbox, button:button}; cards.push(item);
      button.addEventListener('click', function () { closeCard(item); });
    });
    function size() {
      if (!cards.length) return;
      var mobile = matchMedia('(max-width:640px)').matches, vw = window.innerWidth, vh = window.innerHeight, placed = [];
      var dockSpace = Math.max(0, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-space')) || 0);
      cards.forEach(function (item) {
        var popup = item.popup;
        var margin = Math.min(number(popup.offset_x, 24, 0, 500), Math.max(14, (vw - 100) / 2));
        margin = Math.max(14, margin);
        var y = Math.max(14, Math.min(number(popup.offset_y, 90, 0, 500), Math.max(14, vh - dockSpace - 240)));
        var width = Math.min(vw - 2 * margin, number(mobile ? popup.mobile_width : popup.pc_width, mobile ? 320 : 420, 100, 2000));
        var height = Math.max(120, vh - dockSpace - y - 90);
        var position = popup.position || 'left';
        var x = position === 'right' ? vw - width - margin : position === 'center' ? (vw - width) / 2 : margin;
        // Keep each requested anchor until it collides; move only the colliding card to a free slot.
        placed.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (previous) { if (x < previous.x + previous.width + 16 && x + width + 16 > previous.x) x = previous.x + previous.width + 16; });
        item.x = x; item.card.style.left = x + 'px'; item.card.style.top = y + 'px';
        item.card.style.width = width + 'px'; item.card.style.maxHeight = height + 'px';
        item.img.style.maxHeight = number(mobile ? popup.mobile_height : popup.pc_height, mobile ? 600 : 720, 100, 2000) + 'px';
        placed.push({x:x,width:width});
      });
      var overflow = placed.some(function (item) { return item.x + item.width > vw; });
      current = Math.min(current, cards.length - 1);
      if (!overflow) track.scrollLeft = 0;
    }
    track.addEventListener('keydown', function (event) {
      if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); move(event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    track.addEventListener('focusin', function (event) {
      var index = cards.findIndex(function (item) { return item.card.contains(event.target); });
      if (index >= 0) move(index);
    });
    document.addEventListener('keydown', escape); window.addEventListener('resize', size); size();
  }
  var botReady;
  function loadBot() {
    if (botReady) return botReady;
    botReady = new Promise(function (resolve, reject) {
      if (window.turnstile) return resolve();
      var script = document.createElement('script'), timer = setTimeout(function () { reject(new Error('자동 입력 확인을 불러오지 못했습니다. 다시 시도해 주세요.')); }, 20000);
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true;
      script.onload = function () { clearTimeout(timer); resolve(); };
      script.onerror = function () { clearTimeout(timer); botReady = null; reject(new Error('자동 입력 확인에 연결하지 못했습니다.')); };
      document.head.appendChild(script);
    }); return botReady;
  }
  async function botToken(form) {
    if (site.development && !site.turnstile_site_key) return 'development-test-token';
    if (!site.turnstile_site_key) throw new Error('접수 서비스를 준비하고 있습니다. 1688-2629로 문의해 주세요.');
    await loadBot();
    return new Promise(function (resolve, reject) {
      var old = widgets.get(form); if (old !== undefined) window.turnstile.remove(old);
      var box = form.querySelector('.titi-bot') || form.appendChild(document.createElement('div')); box.className = 'titi-bot';
      var timer = setTimeout(function () { reject(new Error('자동 입력 확인 시간이 지났습니다. 다시 시도해 주세요.')); }, 120000);
      var id = window.turnstile.render(box, {sitekey: site.turnstile_site_key, action: 'inquiry', appearance: 'interaction-only',
        callback: function (token) { clearTimeout(timer); resolve(token); },
        'error-callback': function () { clearTimeout(timer); reject(new Error('자동 입력 확인에 실패했습니다. 다시 시도해 주세요.')); },
        'expired-callback': function () { clearTimeout(timer); reject(new Error('확인이 만료되었습니다. 다시 신청해 주세요.')); }});
      widgets.set(form, id);
    });
  }
  forms.forEach(function (form) {
    var trap = document.createElement('input'); trap.name = 'website'; trap.type = 'text'; trap.autocomplete = 'off'; trap.tabIndex = -1;
    trap.setAttribute('aria-hidden', 'true'); trap.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;'; form.appendChild(trap);
  });
  var ready = request('/api/site').then(async function (data) {
    site = data; scriptSlot(site.head_script, document.head); scriptSlot(site.body_script, document.body);
    showPopups(Array.isArray(site.popups) ? site.popups : (site.popup ? [site.popup] : []));
    // A visit failure must not disable reception; the server records it as unclassified.
    try { await request('/api/visits', {url: location.href, referrer: document.referrer}); } catch (_) {}
    return site;
  });
  // Keep the rejection handled until a user submits, then show it inside that form.
  ready.catch(function () {});
  window.TitiLeadClient = {
    submit: async function (form) {
      if (submitting) return;
      submitting = true; forms.forEach(function (f) { f.querySelector('[type=submit]').disabled = true; });
      status(form, '상담 신청을 확인하고 있습니다.', false);
      var sent = false;
      try {
        await ready;
        var data = Object.fromEntries(new FormData(form)), kind = ['신규', 'new'].includes(data.type) ? 'new' : ['업종변경', 'conversion'].includes(data.type) ? 'conversion' : '';
        if (!kind) {
          var typeField = form.querySelector('[name=type]'); if (typeField) typeField.focus();
          throw new Error('창업 형태에서 신규 창업 또는 업종 변경을 선택해 주세요.');
        }
        var payload = {name: data.name.trim(), phone: data.phone.replace(/\D/g, ''), area: data.area.trim(), type: kind,
          message: (data.message || '').trim(), agree: !!form.querySelector('[name=agree]').checked, website: data.website || ''};
        var fingerprint = JSON.stringify(payload);
        if (pending && pending.fingerprint !== fingerprint) throw new Error('이전 신청의 접수 여부를 먼저 확인해 주세요. 입력을 되돌려 다시 신청하거나 1688-2629로 문의해 주세요.');
        if (!pending) pending = {fingerprint: fingerprint, id: crypto.randomUUID(), submitted: false};
        payload.request_id = pending.id; payload.turnstile_token = await botToken(form);
        sent = true;
        pending.submitted = true;
        var result = await request('/api/inquiries', payload);
        if (!result || !result.id) throw new Error('접수 결과를 확인하지 못했습니다. 다시 신청해 주세요.');
        forms.forEach(function (f) { f.reset(); f.querySelector('[name=agree]').checked = false; status(f, '상담 신청이 접수되었습니다. 조금만 기다려 주시면 접수된 순서대로 순차적으로 연락 드립니다.', false); });
        pending = null;
        if (!result.duplicate) {
          // Tracking must never turn a committed inquiry into a reception error.
          try { scriptSlot(site.conversion_script, document.body); } catch (_) {}
        }
      } catch (err) {
        // Definitive validation/rejection means nothing was committed; network/5xx keeps its key.
        if (!pending || !pending.submitted || (sent && err.status >= 400 && err.status < 500 && err.status !== 409)) pending = null;
        status(form, err.message || '문의가 전송되지 않았습니다. 잠시 후 다시 시도하거나 1688-2629로 전화해 주세요.', true);
      } finally {
        submitting = false; forms.forEach(function (f) { f.querySelector('[type=submit]').disabled = false; });
      }
    }
  };
})();
