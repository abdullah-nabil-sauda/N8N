// ══════════════════════════════════════════════════════════════
// 📊 Google Sheets Tracker v7.0
// ══════════════════════════════════════════════════════════════
// ✅ مستقل 100% - لا يعتمد على أي ملف آخر
// ✅ يسجل بيانات الزوار والسكرول في Google Sheets
// ✅ طابور ذكي للبيانات عند فشل الإرسال
// ✅ لا يتعارض مع telegram-tracker.js أو email-tracker.js
//
// 📄 ورقة 1: "زوار الموقع" - كل زيارة جديدة + تحديث عند المغادرة
// 📜 ورقة 2: "بيانات السكرول" - كل معلم سكرول (10,25,50,75,100)
//
// 🔑 مفاتيح التخزين: تبدأ بـ _gs_ لمنع التعارض
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════
  // ⚙️ الإعدادات
  // ══════════════════════════════════════

  var CONF = {
    SHEETS_URL: 'https://script.google.com/macros/s/AKfycbzHchoH_CC0LMGgDvKw_dx6Z4y1wIjLmV1TqZ1oGFEPRtJ3LXQ4J-XG2fkF1cdxvHHt/exec',

    SCROLL_MILESTONES: [10, 25, 50, 75, 100],
    SCROLL_DEBOUNCE: 300,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    UPDATE_INTERVAL: 60000,
    MIN_EXIT_TIME: 3,
    MAX_RETRIES: 2,
    RETRY_DELAY: 3000,
    MAX_QUEUE: 50,

    GEO_APIS: [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://freeipapi.com/api/json'
    ],

    KEY: {
      VID: '_gs_vid',
      SES: '_gs_ses',
      GEO: '_gs_geo',
      SENT: '_gs_sent',
      SC: '_gs_sc_',
      Q: '_gs_q',
      VC: '_gs_vc'
    }
  };

  // ══════════════════════════════════════
  // 🗄️ تخزين آمن
  // ══════════════════════════════════════

  var LS = {
    g: function (k, fb) { try { var v = localStorage.getItem(k); if (v === null) return fb; try { return JSON.parse(v); } catch (e) { return v; } } catch (e) { return fb; } },
    s: function (k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  var SS = {
    g: function (k, fb) { try { var v = sessionStorage.getItem(k); if (v === null) return fb; try { return JSON.parse(v); } catch (e) { return v; } } catch (e) { return fb; } },
    s: function (k, v) { try { sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  // ══════════════════════════════════════
  // 🔧 أدوات
  // ══════════════════════════════════════

  function uid(p) {
    return (p || '') + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8);
  }

  function getVid() {
    var id = LS.g(CONF.KEY.VID, null);
    if (!id) { id = uid('V_'); LS.s(CONF.KEY.VID, id); }
    return id;
  }

  function getVC() {
    var c = parseInt(LS.g(CONF.KEY.VC, '0'), 10);
    if (isNaN(c) || c < 0) c = 0;
    c++;
    LS.s(CONF.KEY.VC, c.toString());
    return c;
  }

  function getSes() {
    var s = SS.g(CONF.KEY.SES, null);
    if (s && s.id && (Date.now() - (s.la || 0)) < CONF.SESSION_TIMEOUT) {
      s.la = Date.now();
      s.pv = (s.pv || 0) + 1;
      SS.s(CONF.KEY.SES, s);
      return s;
    }
    s = { id: uid('S_'), st: Date.now(), la: Date.now(), pv: 1 };
    SS.s(CONF.KEY.SES, s);
    return s;
  }

  function getParams() {
    try {
      var p = new URLSearchParams(window.location.search);
      return {
        campaign: p.get('campaign') || p.get('c') || p.get('utm_campaign') || '-',
        source: p.get('source') || p.get('utm_source') || '-',
        medium: p.get('medium') || p.get('utm_medium') || '-'
      };
    } catch (e) { return { campaign: '-', source: '-', medium: '-' }; }
  }

  // ══════════════════════════════════════
  // 📱 الجهاز
  // ══════════════════════════════════════

  function devInfo() {
    var ua = navigator.userAgent || '';

    var type = 'Desktop';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) type = 'Tablet';
    else if (/Mobile|iPhone|iPod|Android.*Mobile/i.test(ua)) type = 'Mobile';

    var os = 'Unknown';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad/i.test(ua)) {
      var iv = ua.match(/OS (\d+)/i);
      os = (ua.includes('iPad') ? 'iPadOS ' : 'iOS ') + (iv ? iv[1] : '');
    }
    else if (/Android ([\d.]+)/i.test(ua)) {
      var av = ua.match(/Android ([\d.]+)/i);
      os = 'Android ' + (av ? av[1] : '');
    }
    else if (/CrOS/i.test(ua)) os = 'Chrome OS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    var br = 'Unknown';
    var tests = [
      [/Edg\/([\d.]+)/i, 'Edge'], [/OPR\/([\d.]+)/i, 'Opera'],
      [/SamsungBrowser\/([\d.]+)/i, 'Samsung'], [/Firefox\/([\d.]+)/i, 'Firefox'],
      [/Chrome\/([\d.]+)/i, 'Chrome'], [/Version\/([\d.]+).*Safari/i, 'Safari']
    ];
    for (var i = 0; i < tests.length; i++) {
      var m = ua.match(tests[i][0]);
      if (m) { br = tests[i][1] + ' ' + (m[1] || ''); break; }
    }

    var vd = '';
    if (/iPhone|iPad|Mac/i.test(ua)) vd = 'Apple';
    else if (/Samsung/i.test(ua)) vd = 'Samsung';
    else if (/Huawei/i.test(ua)) vd = 'Huawei';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) vd = 'Xiaomi';
    else if (/OPPO/i.test(ua)) vd = 'OPPO';
    else if (/Vivo/i.test(ua)) vd = 'Vivo';

    var dk = false;
    try { dk = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { }

    var cn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var ct = cn ? (cn.effectiveType || '-') : '-';

    return {
      type: type, os: os, browser: br, vendor: vd,
      screen: screen.width + '×' + screen.height,
      lang: navigator.language || '-',
      dark: dk ? 'داكن' : 'فاتح',
      conn: ct,
      online: navigator.onLine ? 'متصل' : 'غير متصل',
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

  function getSource() {
    var ref = document.referrer || '';
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.get('utm_source')) return p.get('utm_source') + ' / ' + (p.get('utm_medium') || '-');
      if (p.get('gclid')) return 'Google Ads';
      if (p.get('fbclid')) return 'Facebook Ads';
    } catch (e) { }
    if (ref) { try { return new URL(ref).hostname; } catch (e) { } }
    return 'مباشر';
  }

  // ══════════════════════════════════════
  // 📤 الإرسال
  // ══════════════════════════════════════

  var Q = {
    items: [],

    load: function () {
      this.items = LS.g(CONF.KEY.Q, []);
      if (!Array.isArray(this.items)) this.items = [];
      var now = Date.now();
      this.items = this.items.filter(function (x) { return (now - (x._qt || 0)) < 3600000; });
    },

    save: function () {
      if (this.items.length > CONF.MAX_QUEUE) this.items = this.items.slice(-CONF.MAX_QUEUE);
      LS.s(CONF.KEY.Q, this.items);
    },

    add: function (data) {
      data._qt = Date.now();
      this.items.push(data);
      this.save();
    },

    flush: async function () {
      if (this.items.length === 0) return;
      var keep = [];
      for (var i = 0; i < this.items.length; i++) {
        var item = this.items[i];
        delete item._qt;
        var ok = await post(item, 0);
        if (!ok) { item._qt = Date.now(); keep.push(item); }
        if (i < this.items.length - 1) await delay(500);
      }
      this.items = keep;
      this.save();
    }
  };

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function post(data, retry) {
    try {
      data.timestamp = data.timestamp || new Date().toISOString();
      await fetch(CONF.SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data)
      });
      return true;
    } catch (e) {
      if ((retry || 0) < CONF.MAX_RETRIES) {
        await delay(CONF.RETRY_DELAY);
        return post(data, (retry || 0) + 1);
      }
      return false;
    }
  }

  async function send(data) {
    var ok = await post(data, 0);
    if (!ok) Q.add(data);
    return ok;
  }

  function beacon(data) {
    data.timestamp = data.timestamp || new Date().toISOString();
    try {
      if (navigator.sendBeacon) {
        var ok = navigator.sendBeacon(CONF.SHEETS_URL, new Blob([JSON.stringify(data)], { type: 'text/plain' }));
        if (ok) return true;
      }
    } catch (e) { }
    Q.add(data);
    return false;
  }

  // ══════════════════════════════════════
  // 📜 تتبع السكرول
  // ══════════════════════════════════════

  var Scroll = {
    max: 0, sent: [], events: 0, lastY: 0, dir: 'idle',
    startTime: 0, _h: null, _t: null,
    vid: '', sid: '', geo: null, dev: null,

    init: function (vid, sid, geo, dev) {
      this.vid = vid; this.sid = sid; this.geo = geo; this.dev = dev;
      this.startTime = Date.now();

      var k = CONF.KEY.SC + window.location.pathname;
      var sv = SS.g(k, []);
      this.sent = Array.isArray(sv) ? sv : [];

      if (this._h) window.removeEventListener('scroll', this._h);
      var me = this;
      this._h = function () {
        me.events++;
        if (me._t) clearTimeout(me._t);
        me._t = setTimeout(function () { me.calc(); }, CONF.SCROLL_DEBOUNCE);
      };
      window.addEventListener('scroll', this._h, { passive: true });
      setTimeout(function () { me.calc(); }, 1000);
    },

    calc: function () {
      try {
        var y = window.pageYOffset || document.documentElement.scrollTop || 0;
        var dh = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0) - window.innerHeight;
        if (dh <= 0) return;
        var pct = Math.min(100, Math.round((y / dh) * 100));

        this.dir = y > this.lastY ? 'down' : y < this.lastY ? 'up' : 'idle';
        this.lastY = y;
        this.max = Math.max(this.max, pct);

        var me = this;
        CONF.SCROLL_MILESTONES.forEach(function (m) {
          if (pct >= m && me.sent.indexOf(m) === -1) {
            me.sent.push(m);
            SS.s(CONF.KEY.SC + window.location.pathname, me.sent);
            me.sendRow(m);
          }
        });
      } catch (e) { }
    },

    sendRow: function (milestone) {
      var t = Math.round((Date.now() - this.startTime) / 1000);
      var dh = document.documentElement.scrollHeight;
      var dpx = Math.round((dh * milestone) / 100);
      var spd = t > 0 ? Math.round(dpx / t) : 0;

      var labels = {
        10: ['بداية التصفح', '📜'], 25: ['ربع الصفحة', '📖'],
        50: ['نصف الصفحة', '📘'], 75: ['تصفح عميق', '📗'],
        100: ['نهاية الصفحة', '🏆']
      };
      var lb = labels[milestone] || [milestone + '%', '📊'];

      var filled = Math.round((milestone / 100) * 10);
      var bar = '';
      for (var i = 0; i < 10; i++) {
        if (i < filled) {
          if (milestone >= 75) bar += '🟢';
          else if (milestone >= 50) bar += '🔵';
          else if (milestone >= 25) bar += '🟡';
          else bar += '🟠';
        } else bar += '⚪';
      }

      send({
        sheet: 'بيانات السكرول',
        type: 'scroll',
        recordId: uid('SC_'),
        userId: this.vid,
        sessionId: this.sid,
        page: window.location.pathname,
        scrollPercent: milestone,
        scrollLabel: lb[0],
        scrollEmoji: lb[1],
        maxScroll: this.max,
        depthPx: dpx,
        pageHeight: dh,
        timeToReach: t,
        scrollSpeed: spd + ' px/s',
        direction: this.dir === 'down' ? 'نزول' : this.dir === 'up' ? 'صعود' : 'ثابت',
        scrollEvents: this.events,
        timeOnPage: t,
        deviceType: this.dev.type,
        os: this.dev.os,
        browser: this.dev.browser,
        screen: this.dev.screen,
        country: this.geo.co,
        ip: this.geo.ip,
        visualBar: bar + ' ' + milestone + '%',
        milestonesReached: this.sent.slice().sort(function (a, b) { return a - b; }).join(', ')
      });
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
    console.log('[GS] 📊 Sheets Tracker v7.0');

    try {
      Q.load();

      var vid = getVid();
      var vc = getVC();
      var ses = getSes();
      var dev = devInfo();
      var prm = getParams();

      var geo;
      try { geo = await fetchGeo(); }
      catch (e) { geo = { ip: '-', co: 'غير معروف', cc: '', ci: '-', rg: '-', tz: '-', isp: '-', lat: null, lon: null }; }

      var src = getSource();
      var first = !SS.g(CONF.KEY.SENT, false);

      // ── 📄 تسجيل الزيارة ──
      if (first) {
        var ml = (geo.lat && geo.lon) ? 'https://maps.google.com/?q=' + geo.lat + ',' + geo.lon : '';

        await send({
          sheet: 'زوار الموقع',
          type: 'visit',
          recordId: uid('R_'),
          userId: vid,
          sessionId: ses.id,
          page: window.location.pathname,
          source: src,
          ip: geo.ip,
          country: geo.co,
          city: geo.ci,
          region: geo.rg,
          isp: geo.isp,
          deviceType: dev.type,
          os: dev.os,
          browser: dev.browser,
          screen: dev.screen,
          language: dev.lang,
          darkMode: dev.dark,
          connType: dev.conn,
          online: dev.online,
          timezone: dev.tz,
          campaign: prm.campaign,
          scrollPercent: 0,
          timeOnPage: 0,
          vendor: dev.vendor,
          lat: geo.lat || '',
          lon: geo.lon || '',
          mapLink: ml
        });

        SS.s(CONF.KEY.SENT, true);
        console.log('[GS] ✅ Visit recorded');
      }

      // ── 📜 تتبع السكرول ──
      Scroll.init(vid, ses.id, geo, dev);

      // ── 👆 النقرات ──
      var clicks = 0;
      document.addEventListener('click', function () { clicks++; });

      // ── 🔄 تحديث دوري ──
      var updTimer = setInterval(function () {
        if (document.hidden) return;
        var t = Math.round((Date.now() - Scroll.startTime) / 1000);
        if (t < 10) return;
        send({
          sheet: 'زوار الموقع',
          type: 'visit_update',
          userId: vid,
          sessionId: ses.id,
          page: window.location.pathname,
          scrollPercent: Scroll.max,
          timeOnPage: t,
          clicks: clicks
        });
      }, CONF.UPDATE_INTERVAL);

      // ── 📦 إفراغ الطابور ──
      var qTimer = setInterval(function () { Q.flush(); }, 60000);
      if (Q.items.length > 0) setTimeout(function () { Q.flush(); }, 5000);

      // ── 👋 المغادرة ──
      var exited = false;
      function onExit() {
        if (exited) return;
        var t = Math.round((Date.now() - Scroll.startTime) / 1000);
        if (t < CONF.MIN_EXIT_TIME) return;
        exited = true;
        beacon({
          sheet: 'زوار الموقع',
          type: 'visit_exit',
          userId: vid,
          sessionId: ses.id,
          page: window.location.pathname,
          scrollPercent: Scroll.max,
          timeOnPage: t,
          clicks: clicks
        });
        clearInterval(updTimer);
        clearInterval(qTimer);
        Scroll.destroy();
      }

      window.addEventListener('beforeunload', onExit);
      window.addEventListener('pagehide', onExit);

      console.log('[GS] ✅ Ready | Session:', ses.id, '| Visitor:', vid);

    } catch (e) {
      console.error('[GS] ❌ Error:', e.message || e);
    }
  }

  // ── البدء ──
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(main, 300);
  } else {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(main, 300); });
  }

})();