// ══════════════════════════════════════════════════════════════
// 📨 Telegram Tracker v7.0
// ══════════════════════════════════════════════════════════════
// ✅ مستقل 100% - لا يعتمد على أي ملف آخر
// ✅ بوتان منفصلان:
//    🟢 بوت الزيارات - إشعار لكل زائر جديد + ملخص المغادرة
//    🔵 بوت السكرول - إشعار لكل معلم سكرول
//
// 🔑 مفاتيح التخزين: تبدأ بـ _tg_ لمنع التعارض
// ❌ لا يتتبع الإيميلات (ملف email-tracker.js المنفصل)
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════
  // ⚙️ الإعدادات
  // ══════════════════════════════════════

  var CONF = {
    // 🟢 بوت الزيارات
    VISIT: {
      TOKEN: '7771956525:AAHD_99ztVRNOUFaPGFN1LGPxCaq0um5ktI',
      CHAT: '7203463194'
    },
    // 🔵 بوت السكرول
    SCROLL: {
      TOKEN: '7771956525:AAHD_99ztVRNOUFaPGFN1LGPxCaq0um5ktI',
      CHAT: '7203463194'
    },

    SITE: 'N8N Platform',
    SESSION_TIMEOUT: 30 * 60 * 1000,
    SCROLL_MILESTONES: [10, 25, 50, 75, 100],
    SCROLL_DEBOUNCE: 300,

    GEO_APIS: [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://freeipapi.com/api/json'
    ],

    KEY: {
      VID: '_tg_vid',
      SES: '_tg_ses',
      GEO: '_tg_geo',
      SENT: '_tg_sent',
      SC: '_tg_sc_',
      VC: '_tg_vc',
      FV: '_tg_fv'
    }
  };

  // ══════════════════════════════════════
  // 🗄️ تخزين
  // ══════════════════════════════════════

  var LS = {
    g: function (k, fb) { try { var v = localStorage.getItem(k); if (v === null) return fb; try { return JSON.parse(v); } catch (e) { return v; } } catch (e) { return fb; } },
    s: function (k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { } }
  };
  var SS = {
    g: function (k, fb) { try { var v = sessionStorage.getItem(k); if (v === null) return fb; try { return JSON.parse(v); } catch (e) { return v; } } catch (e) { return fb; } },
    s: function (k, v) { try { sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { } }
  };

  // ══════════════════════════════════════
  // 🔧 أدوات
  // ══════════════════════════════════════

  function uid(p) { return (p || '') + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8); }
  function esc(t) { if (!t) return ''; return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function flag(c) { if (!c || c.length !== 2) return '🏳️'; try { return String.fromCodePoint(127397 + c.toUpperCase().charCodeAt(0), 127397 + c.toUpperCase().charCodeAt(1)); } catch (e) { return '🏳️'; } }
  function durAr(s) { s = Math.max(0, Math.round(s || 0)); if (s < 60) return s + ' ثانية'; var m = Math.floor(s / 60), r = s % 60; if (m < 60) return m + ' دقيقة' + (r ? ' و ' + r + ' ثانية' : ''); var h = Math.floor(m / 60); return h + ' ساعة' + (m % 60 ? ' و ' + (m % 60) + ' دقيقة' : ''); }
  function pBar(p) { p = Math.max(0, Math.min(100, Math.round(p || 0))); var f = Math.round((p / 100) * 20); return '⟨' + '━'.repeat(f) + '╌'.repeat(20 - f) + '⟩ ' + p + '%'; }
  function cDots(p) { p = Math.max(0, Math.min(100, Math.round(p || 0))); var f = Math.round((p / 100) * 10), b = ''; for (var i = 0; i < 10; i++) { if (i < f) { if (p >= 75) b += '🟢'; else if (p >= 50) b += '🔵'; else if (p >= 25) b += '🟡'; else b += '🟠'; } else b += '⚪'; } return b + ' ' + p + '%'; }

  function getVid() { var id = LS.g(CONF.KEY.VID, null); if (!id) { id = uid('V_'); LS.s(CONF.KEY.VID, id); } return id; }
  function getVC() { var c = parseInt(LS.g(CONF.KEY.VC, '0'), 10); if (isNaN(c) || c < 0) c = 0; c++; LS.s(CONF.KEY.VC, c.toString()); return c; }
  function isNewV() { var f = LS.g(CONF.KEY.FV, null); if (!f) { LS.s(CONF.KEY.FV, Date.now().toString()); return true; } return false; }
  function getSes() { var s = SS.g(CONF.KEY.SES, null); if (s && s.id && (Date.now() - (s.la || 0)) < CONF.SESSION_TIMEOUT) { s.la = Date.now(); s.pv = (s.pv || 0) + 1; SS.s(CONF.KEY.SES, s); return s; } s = { id: uid('S_'), st: Date.now(), la: Date.now(), pv: 1 }; SS.s(CONF.KEY.SES, s); return s; }

  function getFP() {
    try {
      var parts = [navigator.userAgent, navigator.language, screen.width + 'x' + screen.height, screen.colorDepth, new Date().getTimezoneOffset(), navigator.hardwareConcurrency, navigator.platform];
      var str = parts.join('|'), h = 0;
      for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h = h & h; }
      return Math.abs(h).toString(36).toUpperCase();
    } catch (e) { return 'UNK'; }
  }

  function getDateTime() {
    var n = new Date(), d = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    var h = n.getHours(), ap = h >= 12 ? 'مساءً' : 'صباحاً'; h = h % 12 || 12;
    return {
      date: d[n.getDay()] + '، ' + n.getDate() + '/' + (n.getMonth() + 1) + '/' + n.getFullYear(),
      time: String(h).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0') + ':' + String(n.getSeconds()).padStart(2, '0') + ' ' + ap
    };
  }

  function getIdUser() {
    try {
      var p = new URLSearchParams(window.location.search);
      var id = p.get('et') || p.get('email_track') || p.get('eid') || p.get('u') || null;
      if (id) { try { sessionStorage.setItem('_tg_idu', id); localStorage.setItem('_tg_idu_l', id); } catch (e) { } return id; }
      try { return sessionStorage.getItem('_tg_idu') || localStorage.getItem('_tg_idu_l') || null; } catch (e) { return null; }
    } catch (e) { return null; }
  }

  // ══════════════════════════════════════
  // 📱 الجهاز
  // ══════════════════════════════════════

  function devInfo() {
    var ua = navigator.userAgent || '';
    var type = 'Desktop', emoji = '💻', label = 'PC';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) { type = 'Tablet'; emoji = '📟'; label = 'Tablet'; }
    else if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(ua)) { type = 'Mobile'; emoji = '📱'; label = 'Phone'; }

    var os = 'Unknown';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11'; else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad/i.test(ua)) { var iv = ua.match(/OS (\d+)/i); os = (ua.includes('iPad') ? 'iPadOS ' : 'iOS ') + (iv ? iv[1] : ''); }
    else if (/Android ([\d.]+)/i.test(ua)) { var av = ua.match(/Android ([\d.]+)/i); os = 'Android ' + (av ? av[1] : ''); }
    else if (/CrOS/i.test(ua)) os = 'Chrome OS'; else if (/Linux/i.test(ua)) os = 'Linux';

    var br = 'Unknown';
    var bts = [[/Edg\/([\d.]+)/i, 'Edge'], [/OPR\/([\d.]+)/i, 'Opera'], [/SamsungBrowser\/([\d.]+)/i, 'Samsung'], [/Firefox\/([\d.]+)/i, 'Firefox'], [/Chrome\/([\d.]+)/i, 'Chrome'], [/Version\/([\d.]+).*Safari/i, 'Safari']];
    for (var i = 0; i < bts.length; i++) { var m = ua.match(bts[i][0]); if (m) { br = bts[i][1] + ' ' + (m[1] || ''); break; } }

    var vd = '';
    if (/iPhone|iPad|Mac/i.test(ua)) vd = 'Apple'; else if (/Samsung/i.test(ua)) vd = 'Samsung';
    else if (/Huawei/i.test(ua)) vd = 'Huawei'; else if (/Xiaomi|Redmi|POCO/i.test(ua)) vd = 'Xiaomi';

    var dk = false; try { dk = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { }
    var cn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var ct = cn ? (cn.effectiveType || '-') : '-';
    var cs = cn ? (cn.downlink ? cn.downlink + ' Mbps' : '-') : '-';
    var or = '-'; try { if (screen.orientation) or = screen.orientation.type.includes('landscape') ? 'Landscape' : 'Portrait'; } catch (e) { }

    return {
      type: type, emoji: emoji, label: label, os: os, platform: navigator.platform || '-',
      browser: br, vendor: vd,
      screen: screen.width + '×' + screen.height, pr: window.devicePixelRatio || 1,
      lang: navigator.language || '-', dark: dk, orient: or,
      ct: ct, cs: cs, online: navigator.onLine, cookies: navigator.cookieEnabled,
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      cores: navigator.hardwareConcurrency || '-',
      mem: navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '-',
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return '-'; } })()
    };
  }

  // ══════════════════════════════════════
  // 🌍 الجغرافيا
  // ══════════════════════════════════════

  async function fetchGeo() {
    var c = SS.g(CONF.KEY.GEO, null);
    if (c && c._t && (Date.now() - c._t) < 600000) return c;
    for (var i = 0; i < CONF.GEO_APIS.length; i++) {
      try {
        var ctrl = new AbortController();
        var tm = setTimeout(function () { ctrl.abort(); }, 5000);
        var r = await fetch(CONF.GEO_APIS[i], { signal: ctrl.signal });
        clearTimeout(tm);
        if (!r.ok) continue;
        var d = await r.json(), res = null;
        if (d.country_name) res = { ip: d.ip || '-', co: d.country_name, cc: d.country_code || '', ci: d.city || '-', rg: d.region || '-', tz: d.timezone || '-', isp: d.org || '-', lat: d.latitude, lon: d.longitude };
        else if (d.country) res = { ip: d.ip || '-', co: d.country, cc: d.country_code || '', ci: d.city || '-', rg: d.region || '-', tz: (d.timezone && d.timezone.id) || '-', isp: (d.connection && d.connection.isp) || '-', lat: d.latitude, lon: d.longitude };
        else if (d.countryName) res = { ip: d.ipAddress || '-', co: d.countryName, cc: d.countryCode || '', ci: d.cityName || '-', rg: d.regionName || '-', tz: d.timeZone || '-', isp: '-', lat: d.latitude, lon: d.longitude };
        if (res) { res._t = Date.now(); SS.s(CONF.KEY.GEO, res); return res; }
      } catch (e) { continue; }
    }
    return { ip: '-', co: 'غير معروف', cc: '', ci: '-', rg: '-', tz: '-', isp: '-', lat: null, lon: null };
  }

  // ══════════════════════════════════════
  // 🔎 المصدر
  // ══════════════════════════════════════

  function analyzeSource() {
    var ref = document.referrer || '', p;
    try { p = new URLSearchParams(window.location.search); } catch (e) { p = new URLSearchParams(''); }
    var utm = { s: p.get('utm_source') || '', m: p.get('utm_medium') || '', c: p.get('utm_campaign') || '' };

    if (utm.s) {
      var sl = utm.s.toLowerCase(), ml = utm.m.toLowerCase();
      if (ml === 'email' || sl.includes('mail')) return { cat: 'email', name: utm.s, e: '📧', det: 'حملة: ' + (utm.c || '-'), utm: utm, ref: ref };
      var socs = { linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', twitter: 'Twitter/X', youtube: 'YouTube', tiktok: 'TikTok', telegram: 'Telegram', whatsapp: 'WhatsApp' };
      for (var k in socs) { if (sl.includes(k)) return { cat: 'social', name: socs[k], e: '📱', det: 'حملة: ' + (utm.c || '-'), utm: utm, ref: ref }; }
      if (['cpc', 'ppc', 'paid', 'ads'].indexOf(ml) !== -1) return { cat: 'paid', name: utm.s, e: '💰', det: 'إعلان مدفوع', utm: utm, ref: ref };
      return { cat: 'campaign', name: utm.s, e: '📊', det: ml + ' / ' + (utm.c || '-'), utm: utm, ref: ref };
    }
    if (p.get('gclid')) return { cat: 'paid', name: 'Google Ads', e: '💰', det: 'إعلان Google', utm: utm, ref: ref };
    if (p.get('fbclid')) return { cat: 'social', name: 'Facebook', e: '📘', det: 'رابط Facebook', utm: utm, ref: ref };
    if (ref) {
      try {
        var host = new URL(ref).hostname.toLowerCase();
        var mp = { google: { c: 'search', n: 'Google', e: '🔍' }, bing: { c: 'search', n: 'Bing', e: '🔎' }, facebook: { c: 'social', n: 'Facebook', e: '📘' }, instagram: { c: 'social', n: 'Instagram', e: '📸' }, twitter: { c: 'social', n: 'Twitter/X', e: '🐦' }, 'x.com': { c: 'social', n: 'X', e: '🐦' }, 't.co': { c: 'social', n: 'Twitter/X', e: '🐦' }, youtube: { c: 'social', n: 'YouTube', e: '▶️' }, linkedin: { c: 'social', n: 'LinkedIn', e: '💼' }, 't.me': { c: 'social', n: 'Telegram', e: '✈️' }, 'wa.me': { c: 'social', n: 'WhatsApp', e: '💬' } };
        for (var mk in mp) { if (host.includes(mk)) return { cat: mp[mk].c, name: mp[mk].n, e: mp[mk].e, det: mp[mk].c === 'search' ? 'بحث عضوي' : 'شبكة اجتماعية', utm: utm, ref: ref }; }
        return { cat: 'referral', name: host, e: '🌐', det: 'موقع خارجي', utm: utm, ref: ref };
      } catch (e) { }
    }
    return { cat: 'direct', name: 'زيارة مباشرة', e: '🏠', det: 'إدخال مباشر', utm: utm, ref: '' };
  }

  // ══════════════════════════════════════
  // 📤 الإرسال
  // ══════════════════════════════════════

  async function tgSend(bot, msg) {
    if (!msg || !msg.trim()) return;
    try {
      if (msg.length > 4000) msg = msg.substring(0, 3970) + '\n⚠️ <i>تم اقتصاص الرسالة</i>';
      await fetch('https://api.telegram.org/bot' + bot.TOKEN + '/sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: bot.CHAT, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
      });
    } catch (e) { console.error('[TG] Send error:', e.message); }
  }

  function tgBeacon(bot, msg) {
    try {
      if (!msg || !msg.trim()) return;
      if (msg.length > 4000) msg = msg.substring(0, 3970) + '\n⚠️';
      if (navigator.sendBeacon) {
        navigator.sendBeacon('https://api.telegram.org/bot' + bot.TOKEN + '/sendMessage',
          new Blob([JSON.stringify({ chat_id: bot.CHAT, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })], { type: 'application/json' }));
      }
    } catch (e) { }
  }

  // ══════════════════════════════════════
  // 🟢 رسالة الزيارة
  // ══════════════════════════════════════

  function visitMsg(geo, dev, src, visitor, ses, idu) {
    var f = flag(geo.cc), dt = getDateTime();
    var isN = visitor.isNew;
    var se = isN ? '🆕' : '🔄';
    var st = isN ? 'N E W    V I S I T O R' : 'R E T U R N I N G    V I S I T O R';
    var sa = isN ? 'زائر جديد' : 'زائر عائد (الزيارة #' + visitor.vc + ')';
    var loc = geo.co !== 'غير معروف' ? (geo.ci !== '-' ? geo.co + '، ' + geo.ci : geo.co) : 'غير معروف';
    var catT = { direct: '🏷 Direct', social: '🏷 Social', search: '🏷 Search', email: '🏷 Email', paid: '🏷 Paid Ads', referral: '🏷 Referral', campaign: '🏷 Campaign' };
    var srcIco = { direct: '🏠', social: '📱', search: '🔍', email: '📧', paid: '💰', referral: '🌐', campaign: '📊' };
    var sett = [(dev.online ? '🟢 Online' : '🔴 Offline'), (dev.dark ? '🌙 Dark' : '☀️ Light'), (dev.cookies ? '🍪 On' : '🍪 Off'), (dev.touch ? '👆 Touch' : '🖱 Mouse')].join('  ┃  ');

    var m = se + '  <b>' + st + '</b>  ' + se + '\n◆━━━━━━━━━━━━━━━━━━━━━◆\n\n    ' + sa + '\n    🌐  <b>' + esc(CONF.SITE) + '</b>\n';
    if (idu) m += '    👤  <b>ID User: ' + esc(idu) + '</b>  ✅\n';
    m += '\n✨━━━━━━━━━━━━━━━━━━━✨\n\n';

    m += '┌─── 🕐 <b>التاريخ والوقت</b> ───┐\n│ 📅 ' + dt.date + '\n│ ⏰ ' + dt.time + '\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── 📋 <b>الجلسة</b> ───┐\n│ 🔖 <code>' + ses.id + '</code>\n│ 📊 إجمالي: ' + visitor.vc + '\n│ 📄 صفحات: ' + ses.pv + '\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── ' + (srcIco[src.cat] || '🔗') + ' <b>المصدر</b> ───┐\n│ 📎 ' + esc(src.name) + ' ' + (src.e || '') + '\n│ 📂 ' + (catT[src.cat] || '🏷 Other') + '\n│ 📝 ' + esc(src.det) + '\n';
    if (src.ref) m += '│ 🔗 ' + esc(src.ref.substring(0, 60)) + '\n';
    m += '└' + '─'.repeat(27) + '┘\n\n';

    if (src.utm && (src.utm.s || src.utm.m || src.utm.c)) {
      m += '┌─── 📊 <b>UTM</b> ───┐\n';
      if (src.utm.s) m += '│ 📢 Source: ' + esc(src.utm.s) + '\n';
      if (src.utm.m) m += '│ 📰 Medium: ' + esc(src.utm.m) + '\n';
      if (src.utm.c) m += '│ 🎯 Campaign: ' + esc(src.utm.c) + '\n';
      m += '└' + '─'.repeat(27) + '┘\n\n';
    }

    m += '┌─── 🌍 <b>الموقع</b> ───┐\n│ ' + f + ' <b>' + esc(loc) + '</b>\n';
    if (geo.rg && geo.rg !== '-') m += '│ 📍 ' + esc(geo.rg) + '\n';
    if (geo.isp && geo.isp !== '-') m += '│ 📡 ' + esc(geo.isp) + '\n';
    m += '│ 🔢 <code>' + esc(geo.ip) + '</code>\n';
    if (geo.lat && geo.lon) m += '│ 🗺 <a href="https://maps.google.com/?q=' + geo.lat + ',' + geo.lon + '">خرائط Google</a>\n';
    m += '└' + '─'.repeat(27) + '┘\n\n';

    m += '┌─── ' + dev.emoji + ' <b>الجهاز</b> ───┐\n│ 📟 ' + dev.type + (dev.vendor ? ' (' + dev.vendor + ')' : '') + '\n│ 💿 ' + dev.os + '\n│ 🌐 ' + dev.browser + '\n│ 📐 ' + dev.screen + '  ┃  ' + dev.pr + 'x  ┃  ' + dev.orient + '\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── ⚙️ <b>النظام</b> ───┐\n│ 🧠 ' + dev.cores + ' أنوية\n';
    if (dev.mem !== '-') m += '│ 💾 ' + dev.mem + '\n';
    m += '│ 🗣 ' + esc(dev.lang) + '\n│ 🌐 ' + esc(dev.tz) + '\n';
    if (dev.ct !== '-') m += '│ 📶 ' + dev.ct + (dev.cs !== '-' ? ' (' + dev.cs + ')' : '') + '\n';
    m += '│\n│ ' + sett + '\n└' + '─'.repeat(27) + '┘\n\n';

    m += '┌─── 📄 <b>الصفحة</b> ───┐\n│ 📑 ' + esc((document.title || '-').substring(0, 50)) + '\n│ 🔗 ' + esc(window.location.href) + '\n└' + '─'.repeat(27) + '┘\n\n';

    m += '✦ ─────────────────── ✦\n\n';
    m += '┌─── 🔒 <b>الهوية</b> ───┐\n│ 🆔 <code>' + visitor.id + '</code>\n│ 🔑 <code>' + visitor.fp + '</code>\n';
    if (idu) m += '│ 👤 <b>🟢 ' + esc(idu) + '</b>\n│ 📌 <b>زائر معرّف</b>\n';
    else m += '│ 👤 ⚪ لا يوجد\n│ 📌 زائر عام\n';
    m += '└' + '─'.repeat(27) + '┘\n\n◆━━━━━━━━━━━━━━━━━━━━━◆';

    return m;
  }

  // ══════════════════════════════════════
  // 🔵 رسالة السكرول
  // ══════════════════════════════════════

  function scrollMsg(milestone, state, ses, idu) {
    var md = { 10: { e: '📜', l: 'بداية التصفح', c: '🟠', lv: 'مبتدئ' }, 25: { e: '📖', l: 'ربع الصفحة', c: '🟡', lv: 'مهتم' }, 50: { e: '📘', l: 'نصف الصفحة', c: '🔵', lv: 'متفاعل' }, 75: { e: '📗', l: 'تصفح عميق', c: '🟢', lv: 'مهتم جداً' }, 100: { e: '🏆', l: 'نهاية الصفحة', c: '💎', lv: 'ممتاز!' } };
    var d = md[milestone] || { e: '📊', l: milestone + '%', c: '⚪', lv: '-' };
    var sorted = state.sent.slice().sort(function (a, b) { return a - b; });
    var visual = sorted.map(function (m) { var x = md[m]; return x ? x.c + ' ' + m + '%' : '⚪ ' + m + '%'; }).join('  ▸  ');

    var m = d.e + '  <b>S C R O L L    T R A C K E R</b>  ' + d.e + '\n✨━━━━━━━━━━━━━━━━━━━✨\n\n';
    m += d.c + '  <b>' + milestone + '%</b>  ━  ' + d.l + '\n\n';
    m += '┌─── 📊 <b>التقدم</b> ───┐\n│ 📏 ' + pBar(milestone) + '\n│ 🎨 ' + cDots(milestone) + '\n│ 🎯 ' + d.lv + '\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── 📄 <b>الصفحة</b> ───┐\n│ 📑 ' + esc((document.title || '-').substring(0, 45)) + '\n│ 🔗 ' + esc(window.location.pathname) + '\n│ 📐 ' + document.documentElement.scrollHeight + 'px\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── ⏱ <b>الزمن</b> ───┐\n│ 📄 ' + durAr(state.tp) + '\n│ 🕐 ' + durAr(Math.round((Date.now() - ses.st) / 1000)) + '\n│ ⚡ ' + state.spd + ' px/s\n│ 🔄 ' + (state.dir === 'down' ? '⬇️ نزول' : state.dir === 'up' ? '⬆️ صعود' : '⏸ ثابت') + '\n│ 📊 ' + state.ev + ' حدث\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── 📋 <b>المراحل</b> ───┐\n│ ' + visual + '\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── 🔒 <b>الهوية</b> ───┐\n│ 🆔 <code>' + state.vid + '</code>\n';
    if (idu) m += '│ 👤 <b>🟢 ' + esc(idu) + '</b>\n';
    m += '└' + '─'.repeat(27) + '┘\n\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n🔖 <code>' + ses.id + '</code>\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';
    return m;
  }

  // ══════════════════════════════════════
  // 👋 رسالة المغادرة
  // ══════════════════════════════════════

  function exitMsg(ses, sMax, tp, clk, idu) {
    var eng, ee;
    if (tp > 300 && sMax > 70) { eng = 'ممتاز'; ee = '🔥🔥🔥'; }
    else if (tp > 120 && sMax > 50) { eng = 'عالي'; ee = '🔥🔥'; }
    else if (tp > 30 && sMax > 25) { eng = 'متوسط'; ee = '⚡'; }
    else { eng = 'منخفض'; ee = '📉'; }

    var m = '👋  <b>S E S S I O N    E N D</b>  👋\n◆━━━━━━━━━━━━━━━━━━━━━◆\n\n';
    m += '┌─── 📊 <b>الإحصائيات</b> ───┐\n│ ⏱ ' + durAr(tp) + '\n│ 📄 ' + (ses.pv || 1) + ' صفحة\n│ 👆 ' + clk + ' نقرة\n│ 📜 ' + cDots(sMax) + '\n│ ' + ee + ' ' + eng + '\n└' + '─'.repeat(27) + '┘\n\n';
    m += '┌─── 📄 <b>الصفحة</b> ───┐\n│ 📑 ' + esc((document.title || '-').substring(0, 45)) + '\n│ 🔗 ' + esc(window.location.pathname) + '\n└' + '─'.repeat(27) + '┘\n\n';
    if (idu) m += '👤 <b>' + esc(idu) + '</b>\n';
    m += '🔖 <code>' + ses.id + '</code>\n◆━━━━━━━━━━━━━━━━━━━━━◆';
    return m;
  }

  // ══════════════════════════════════════
  // 🔵 السكرول
  // ══════════════════════════════════════

  var SC = {
    max: 0, sent: [], ev: 0, ly: 0, dir: 'idle',
    st: 0, _h: null, _t: null, ses: null, vid: '', idu: null,

    init: function (ses, vid, idu) {
      this.ses = ses; this.vid = vid; this.idu = idu; this.st = Date.now();
      var k = CONF.KEY.SC + window.location.pathname;
      var sv = SS.g(k, []); this.sent = Array.isArray(sv) ? sv : [];
      if (this._h) window.removeEventListener('scroll', this._h);
      var me = this;
      this._h = function () { me.ev++; if (me._t) clearTimeout(me._t); me._t = setTimeout(function () { me.calc(); }, CONF.SCROLL_DEBOUNCE); };
      window.addEventListener('scroll', this._h, { passive: true });
      setTimeout(function () { me.calc(); }, 1000);
    },

    calc: function () {
      try {
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        var dh = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0) - window.innerHeight;
        if (dh <= 0) return;
        var pct = Math.min(100, Math.round((y / dh) * 100));
        this.dir = y > this.ly ? 'down' : y < this.ly ? 'up' : 'idle';
        this.ly = y; this.max = Math.max(this.max, pct);
        var me = this;
        CONF.SCROLL_MILESTONES.forEach(function (m) {
          if (pct >= m && me.sent.indexOf(m) === -1) {
            me.sent.push(m);
            SS.s(CONF.KEY.SC + window.location.pathname, me.sent);
            me.notify(m);
          }
        });
      } catch (e) { }
    },

    notify: function (milestone) {
      var tp = Math.round((Date.now() - this.st) / 1000);
      var dh = document.documentElement.scrollHeight;
      var spd = tp > 0 ? Math.round((dh * milestone / 100) / tp) : 0;
      var state = { sent: this.sent, tp: tp, spd: spd, dir: this.dir, ev: this.ev, vid: this.vid };
      tgSend(CONF.SCROLL, scrollMsg(milestone, state, this.ses, this.idu));
    },

    destroy: function () {
      if (this._h) { window.removeEventListener('scroll', this._h); this._h = null; }
      if (this._t) { clearTimeout(this._t); this._t = null; }
    }
  };

  // ══════════════════════════════════════
  // 🚀 التشغيل
  // ══════════════════════════════════════

  async function main() {
    console.log('[TG] 📨 Telegram Tracker v7.0');
    try {
      var idu = getIdUser();
      var ses = getSes();
      var vid = getVid();
      var vc = getVC();
      var isN = isNewV();
      var fp = getFP();
      var dev = devInfo();
      var first = !SS.g(CONF.KEY.SENT, false);

      var geo;
      try { geo = await fetchGeo(); }
      catch (e) { geo = { ip: '-', co: 'غير معروف', cc: '', ci: '-', rg: '-', tz: '-', isp: '-', lat: null, lon: null }; }

      // 🟢 إشعار الزيارة
      if (first) {
        var visitor = { id: vid, isNew: isN, vc: vc, fp: fp };
        var src = analyzeSource();
        await tgSend(CONF.VISIT, visitMsg(geo, dev, src, visitor, ses, idu));
        SS.s(CONF.KEY.SENT, true);
        console.log('[TG] 🟢 Visit sent');
      }

      // 🔵 السكرول
      SC.init(ses, vid, idu);
      console.log('[TG] 🔵 Scroll active');

      // 👆 النقرات
      var clk = 0;
      document.addEventListener('click', function () { clk++; });

      // 👋 المغادرة
      var exited = false;
      window.addEventListener('beforeunload', function () {
        if (exited) return;
        var tp = Math.round((Date.now() - SC.st) / 1000);
        if (tp > 5) { exited = true; tgBeacon(CONF.VISIT, exitMsg(ses, SC.max, tp, clk, idu)); }
        SC.destroy();
      });

      console.log('[TG] ✅ Ready | Session:', ses.id);
    } catch (e) { console.error('[TG] ❌', e.message || e); }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(main, 200);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(main, 200); });

})();