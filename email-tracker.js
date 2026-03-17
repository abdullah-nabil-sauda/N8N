// ══════════════════════════════════════════════════════════════
// 📧 Email Tracker v7.0
// ══════════════════════════════════════════════════════════════
// ✅ مستقل 100% - لا يعتمد على أي ملف آخر
// ✅ يعمل فقط عندما يكون هناك user parameter في الرابط
// ✅ يرسل إشعار لبوت تيليجرام + يسجل في Google Sheets
// ✅ يُستخدم فقط في pixel.html
//
// 🔑 مفاتيح التخزين: تبدأ بـ _em_ لمنع التعارض
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════
  // ⚙️ الإعدادات
  // ══════════════════════════════════════

  var CONF = {
    // 🟣 بوت الإيميل
    BOT: {
      TOKEN: '7771956525:AAHD_99ztVRNOUFaPGFN1LGPxCaq0um5ktI',
      CHAT: '7203463194'
    },

    // 📊 Google Sheets
    SHEETS_URL: 'https://script.google.com/macros/s/AKfycby1d_tE85H03EDhj6VX841tJyvC_3xKjbuiNEeyqBjxPPbUbKjIPBJb93fZaLw_bs1x/exec',

    GEO_APIS: [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://freeipapi.com/api/json'
    ],

    KEY: {
      SENT: '_em_sent_',
      COUNT: '_em_cnt_',
      FIRST: '_em_fst_',
      LAST: '_em_lst_'
    }
  };

  // ══════════════════════════════════════
  // 🗄️ تخزين
  // ══════════════════════════════════════

  var LS = {
    g: function (k, fb) { try { var v = localStorage.getItem(k); if (v === null) return fb; return v; } catch (e) { return fb; } },
    s: function (k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { } }
  };

  // ══════════════════════════════════════
  // 🔧 أدوات
  // ══════════════════════════════════════

  function uid(p) { return (p || '') + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8); }
  function esc(t) { if (!t) return ''; return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function flag(c) { if (!c || c.length !== 2) return '🏳️'; try { return String.fromCodePoint(127397 + c.toUpperCase().charCodeAt(0), 127397 + c.toUpperCase().charCodeAt(1)); } catch (e) { return '🏳️'; } }

  function getParams() {
    try {
      var p = new URLSearchParams(window.location.search);
      return {
        user: p.get('et') || p.get('email_track') || p.get('eid') || p.get('u') || null,
        campaign: p.get('campaign') || p.get('c') || '-',
        subject: p.get('subject') || p.get('sub') || p.get('s') || '-',
        messageId: p.get('mid') || p.get('message_id') || p.get('id') || '-',
        template: p.get('template') || p.get('tpl') || '-',
        group: p.get('group') || p.get('g') || '-'
      };
    } catch (e) { return { user: null, campaign: '-', subject: '-', messageId: '-', template: '-', group: '-' }; }
  }

  // ══════════════════════════════════════
  // 📱 الجهاز
  // ══════════════════════════════════════

  function devInfo() {
    var ua = navigator.userAgent || '';
    var type = 'Desktop', emoji = '💻';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) { type = 'Tablet'; emoji = '📟'; }
    else if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(ua)) { type = 'Mobile'; emoji = '📱'; }

    var os = 'Unknown';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11'; else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad/i.test(ua)) { var iv = ua.match(/OS (\d+)/i); os = (ua.includes('iPad') ? 'iPadOS ' : 'iOS ') + (iv ? iv[1] : ''); }
    else if (/Android ([\d.]+)/i.test(ua)) { var av = ua.match(/Android ([\d.]+)/i); os = 'Android ' + (av ? av[1] : ''); }
    else if (/Linux/i.test(ua)) os = 'Linux';

    var br = 'Unknown';
    var bts = [[/Edg\/([\d.]+)/i, 'Edge'], [/OPR\/([\d.]+)/i, 'Opera'], [/Firefox\/([\d.]+)/i, 'Firefox'], [/Chrome\/([\d.]+)/i, 'Chrome'], [/Version\/([\d.]+).*Safari/i, 'Safari']];
    for (var i = 0; i < bts.length; i++) { var m = ua.match(bts[i][0]); if (m) { br = bts[i][1] + ' ' + (m[1] || ''); break; } }

    var vd = '';
    if (/iPhone|iPad|Mac/i.test(ua)) vd = 'Apple'; else if (/Samsung/i.test(ua)) vd = 'Samsung';
    else if (/Huawei/i.test(ua)) vd = 'Huawei'; else if (/Xiaomi|Redmi|POCO/i.test(ua)) vd = 'Xiaomi';

    var ec = '';
    if (/Thunderbird/i.test(ua)) ec = 'Thunderbird';
    else if (/Outlook/i.test(ua)) ec = 'Outlook';
    else if (/GoogleImageProxy/i.test(ua)) ec = 'Gmail Proxy';

    var dk = false;
    try { dk = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { }

    return {
      type: type, emoji: emoji, os: os, browser: br, vendor: vd, emailClient: ec,
      screen: screen.width + '×' + screen.height,
      lang: navigator.language || '-',
      dark: dk ? 'داكن' : 'فاتح',
      tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return '-'; } })()
    };
  }

  // ══════════════════════════════════════
  // 🌍 الجغرافيا
  // ══════════════════════════════════════

  async function fetchGeo() {
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
        if (res) return res;
      } catch (e) { continue; }
    }
    return { ip: '-', co: 'غير معروف', cc: '', ci: '-', rg: '-', tz: '-', isp: '-', lat: null, lon: null };
  }

  // ══════════════════════════════════════
  // 📊 إحصائيات الفتح
  // ══════════════════════════════════════

  function getOpenStats(user) {
    // العدد
    var ck = CONF.KEY.COUNT + user;
    var cnt = parseInt(LS.g(ck, '0'), 10);
    if (isNaN(cnt)) cnt = 0;
    cnt++;
    LS.s(ck, cnt.toString());

    // أول فتح
    var fk = CONF.KEY.FIRST + user;
    var first = LS.g(fk, null);
    if (!first) { LS.s(fk, Date.now().toString()); first = Date.now().toString(); }
    var firstDate = '';
    try { firstDate = new Date(parseInt(first, 10)).toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'medium' }); } catch (e) { firstDate = '-'; }

    // منذ أول فتح
    var since = '';
    try {
      var diff = Math.round((Date.now() - parseInt(first, 10)) / 1000);
      if (diff < 60) since = diff + ' ثانية';
      else if (diff < 3600) since = Math.floor(diff / 60) + ' دقيقة';
      else if (diff < 86400) since = Math.floor(diff / 3600) + ' ساعة';
      else since = Math.floor(diff / 86400) + ' يوم';
    } catch (e) { }

    // آخر فتح
    var lk = CONF.KEY.LAST + user;
    var prev = LS.g(lk, null);
    var lastOpen = null;
    if (prev) { try { lastOpen = new Date(parseInt(prev, 10)).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { } }
    LS.s(lk, Date.now().toString());

    // مستوى التفاعل
    var engLevel, engBar;
    if (cnt >= 10) { engLevel = 'عميل مخلص'; engBar = '██████████'; }
    else if (cnt >= 5) { engLevel = 'تفاعل ممتاز'; engBar = '████████░░'; }
    else if (cnt >= 3) { engLevel = 'تفاعل عالي'; engBar = '██████░░░░'; }
    else if (cnt >= 2) { engLevel = 'مهتم'; engBar = '████░░░░░░'; }
    else { engLevel = 'فتح أولي'; engBar = '██░░░░░░░░'; }

    return {
      count: cnt,
      firstOpen: firstDate,
      since: since,
      lastOpen: lastOpen,
      isFirst: cnt === 1,
      engLevel: engLevel,
      engBar: engBar
    };
  }

  // ══════════════════════════════════════
  // 📨 رسالة تيليجرام
  // ══════════════════════════════════════

  function buildTelegramMsg(params, stats, geo, dev) {
    var f = flag(geo.cc);
    var loc = geo.co !== 'غير معروف' ? (geo.ci !== '-' ? geo.co + '، ' + geo.ci : geo.co) : 'غير معروف';

    var now = new Date();
    var days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    var h = now.getHours(), ap = h >= 12 ? 'مساءً' : 'صباحاً'; h = h % 12 || 12;
    var dt = days[now.getDay()] + '، ' + now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
    var tm = String(h).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0') + ' ' + ap;

    var he = stats.isFirst ? '🔔' : '🔁';
    var ht = stats.isFirst ? '📧 EMAIL OPENED — FIRST TIME!' : '📧 EMAIL RE-OPENED (#' + stats.count + ')';
    var os = stats.isFirst ? '🆕 أول فتح!' : '🔄 فتح متكرر (#' + stats.count + ')';

    var dots = '';
    var mx = Math.min(stats.count, 15);
    for (var i = 0; i < mx; i++) dots += '🟢';
    for (var j = mx; j < 15; j++) dots += '⚪';

    var m = he + '  <b>' + ht + '</b>\n◆━━━━━━━━━━━━━━━━━━━━━━━━━━◆\n\n';

    m += '┌─── 👤 <b>المستلم</b> ───┐\n│\n';
    m += '│ 🏷 اليوزر: <b>' + esc(params.user) + '</b>\n';
    m += '│ 📊 الحالة: ' + os + '\n';
    m += '│ 🔢 الفتحات: <b>' + stats.count + '</b> مرة\n';
    if (stats.firstOpen) m += '│ 📅 أول فتح: ' + esc(stats.firstOpen) + '\n';
    if (stats.since && !stats.isFirst) m += '│ ⏳ منذ أول فتح: <b>' + stats.since + '</b>\n';
    if (stats.lastOpen) m += '│ 🕐 آخر فتح سابق: ' + esc(stats.lastOpen) + '\n';
    if (params.group !== '-') m += '│ 👥 المجموعة: <b>' + esc(params.group) + '</b>\n';
    m += '│\n└' + '─'.repeat(30) + '┘\n\n';

    m += '┌─── 🕐 <b>وقت الفتح</b> ───┐\n│\n│ 📅 ' + dt + '\n│ ⏰ ' + tm + '\n';
    if (geo.tz && geo.tz !== '-') m += '│ 🌐 ' + esc(geo.tz) + '\n';
    m += '│\n└' + '─'.repeat(30) + '┘\n\n';

    m += '┌─── 📋 <b>الرسالة</b> ───┐\n│\n';
    m += '│ 📧 الحملة: <b>' + esc(params.campaign) + '</b>\n';
    m += '│ 📝 الموضوع: ' + esc(params.subject) + '\n';
    m += '│ 🔖 ID: <code>' + esc(params.messageId) + '</code>\n';
    if (params.template !== '-') m += '│ 📄 القالب: ' + esc(params.template) + '\n';
    m += '│\n└' + '─'.repeat(30) + '┘\n\n';

    m += '┌─── 🌍 <b>الموقع</b> ───┐\n│\n│ ' + f + ' <b>' + esc(loc) + '</b>\n';
    if (geo.rg && geo.rg !== '-') m += '│ 📍 ' + esc(geo.rg) + '\n';
    if (geo.isp && geo.isp !== '-') m += '│ 📡 ' + esc(geo.isp) + '\n';
    m += '│ 🔢 <code>' + esc(geo.ip) + '</code>\n';
    if (geo.lat && geo.lon) m += '│ 🗺 <a href="https://maps.google.com/?q=' + geo.lat + ',' + geo.lon + '">خرائط Google</a>\n';
    m += '│\n└' + '─'.repeat(30) + '┘\n\n';

    m += '┌─── ' + dev.emoji + ' <b>الجهاز</b> ───┐\n│\n';
    m += '│ 📟 ' + dev.type + (dev.vendor ? ' (' + dev.vendor + ')' : '') + '\n';
    m += '│ 💿 ' + dev.os + '\n│ 🌐 ' + dev.browser + '\n│ 📐 ' + dev.screen + '\n│ 🗣 ' + esc(dev.lang) + '\n';
    if (dev.emailClient) m += '│ 📨 <b>' + dev.emailClient + '</b>\n';
    m += '│ ' + (dev.dark === 'داكن' ? '🌙 داكن' : '☀️ فاتح') + '\n';
    m += '│\n└' + '─'.repeat(30) + '┘\n\n';

    m += '┌─── 📊 <b>التفاعل</b> ───┐\n│\n│ 📈 ' + stats.engLevel + '\n│ 📊 ' + dots + '\n│ ⟨' + stats.engBar + '⟩ ' + Math.min(stats.count * 10, 100) + '%\n│\n└' + '─'.repeat(30) + '┘\n\n';
    m += '◆━━━━━━━━━━━━━━━━━━━━━━━━━━◆';

    return m;
  }

  // ══════════════════════════════════════
  // 🚀 التشغيل
  // ══════════════════════════════════════

  async function main() {
    var params = getParams();

    // ❌ لا يوزر = لا تتبع
    if (!params.user) {
      console.log('[EM] No user parameter - skip');
      return;
    }

    console.log('[EM] 📧 Email Tracker v7.0 | User:', params.user);

    // منع التكرار (3 دقائق)
    var sk = CONF.KEY.SENT + params.user + '_' + params.messageId;
    var last = LS.g(sk, null);
    if (last) {
      var elapsed = Date.now() - parseInt(last, 10);
      if (elapsed < 180000) {
        console.log('[EM] Recently tracked, skip');
        return;
      }
    }
    LS.s(sk, Date.now().toString());

    try {
      var stats = getOpenStats(params.user);
      var dev = devInfo();
      var geo;
      try { geo = await fetchGeo(); }
      catch (e) { geo = { ip: '-', co: 'غير معروف', cc: '', ci: '-', rg: '-', tz: '-', isp: '-', lat: null, lon: null }; }

      // ── 📨 إرسال لتيليجرام ──
      var tgMsg = buildTelegramMsg(params, stats, geo, dev);
      try {
        if (tgMsg.length > 4000) tgMsg = tgMsg.substring(0, 3970) + '\n⚠️ <i>اقتصاص</i>';
        await fetch('https://api.telegram.org/bot' + CONF.BOT.TOKEN + '/sendMessage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CONF.BOT.CHAT, text: tgMsg, parse_mode: 'HTML', disable_web_page_preview: true })
        });
        console.log('[EM] 📨 Telegram sent');
      } catch (e) { console.error('[EM] Telegram error:', e.message); }

      // ── 📊 إرسال لـ Google Sheets ──
      var ml = (geo.lat && geo.lon) ? 'https://maps.google.com/?q=' + geo.lat + ',' + geo.lon : '';
      var sheetData = {
        sheet: 'تتبع الإيميلات',
        type: 'email_open',
        recordId: uid('E_'),
        openTime: new Date().toISOString(),
        recipient: params.user,
        campaign: params.campaign,
        subject: params.subject,
        messageId: params.messageId,
        template: params.template,
        group: params.group,
        openNumber: stats.count,
        openStatus: stats.isFirst ? 'أول فتح' : 'فتح متكرر #' + stats.count,
        ip: geo.ip,
        country: geo.co,
        city: geo.ci,
        region: geo.rg,
        deviceType: dev.type,
        os: dev.os,
        browser: dev.browser,
        emailClient: dev.emailClient || '-',
        vendor: dev.vendor,
        screen: dev.screen,
        language: dev.lang,
        darkMode: dev.dark,
        timezone: dev.tz,
        isp: geo.isp,
        lat: geo.lat || '',
        lon: geo.lon || '',
        mapLink: ml,
        engagementLevel: stats.engLevel,
        engagementBar: stats.engBar
      };

      try {
        await fetch(CONF.SHEETS_URL, {
          method: 'POST', mode: 'no-cors', cache: 'no-cache',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(sheetData)
        });
        console.log('[EM] 📊 Sheets sent');
      } catch (e) { console.error('[EM] Sheets error:', e.message); }

      console.log('[EM] ✅ Done | User:', params.user, '| Opens:', stats.count);

    } catch (e) {
      console.error('[EM] ❌ Error:', e.message || e);
    }
  }

  // ── البدء ──
  main();

})();