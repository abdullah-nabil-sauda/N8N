// ══════════════════════════════════════════════════════
// 🔍 نظام التتبع الاحترافي v6.0
// بوت الزيارات + السكرول (منفصل عن بوت الإيميل)
// ══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════
  // ⚙️ الإعدادات
  // ══════════════════════════════════════
  const CONFIG = {
    // ── 🤖 بوت الزيارات والسكرول (بوت واحد) ──
    BOT_TOKEN: '7771956525:AAHD_99ztVRNOUFaPGFN1LGPxCaq0um5ktI',
    CHAT_ID: '7203463194',

    // ── إعدادات عامة ──
    SITE_NAME: 'N8N Platform',
    SESSION_TIMEOUT: 30 * 60 * 1000,
    SCROLL_MILESTONES: [10, 25, 50, 75, 100],
    MAX_MESSAGE_LENGTH: 4000,
    MAX_PAGES_STORED: 50,
    BEACON_MAX_SIZE: 60000
  };

  // ══════════════════════════════════════
  // 🛡️ التحقق
  // ══════════════════════════════════════
  if (!CONFIG.BOT_TOKEN ||
    !/^\d+:[A-Za-z0-9_-]+$/.test(CONFIG.BOT_TOKEN) ||
    !CONFIG.CHAT_ID) {
    console.warn('⚠️ Tracker: Invalid config');
    return;
  }

  // ══════════════════════════════════════
  // 👤 استخراج ID User من الرابط
  // ══════════════════════════════════════
  function getIDUser() {
    try {
      const params = new URLSearchParams(window.location.search);
      const idUser = params.get('et')
        || params.get('email_track')
        || params.get('uid')
        || params.get('user')
        || params.get('u')
        || null;
      return idUser ? idUser.trim() : null;
    } catch (e) {
      return null;
    }
  }

  // ✅ حفظ ID User في الجلسة
  function saveIDUser(idUser) {
    if (!idUser) return;
    try {
      sessionStorage.setItem('_id_user', idUser);
      // حفظ في localStorage أيضاً لتتبع العودة
      localStorage.setItem('_last_id_user', idUser);
      localStorage.setItem('_id_user_time',
        Date.now().toString());
    } catch (e) { }
  }

  function getSavedIDUser() {
    try {
      return sessionStorage.getItem('_id_user')
        || localStorage.getItem('_last_id_user')
        || null;
    } catch (e) {
      return null;
    }
  }

  // ══════════════════════════════════════
  // 🧹 أدوات مساعدة
  // ══════════════════════════════════════
  function escapeHTML(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ══════════════════════════════════════
  // 🎨 محرك التنسيق
  // ══════════════════════════════════════
  const F = {
    lines: {
      diamond: '◆━━━━━━━━━━━━━━━━━━━━━◆',
      spark: '✨━━━━━━━━━━━━━━━━━━━✨',
      dots: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
      stars: '✦ ─────────────────── ✦'
    },

    head(emoji, title) {
      return `\n┌─── ${emoji} <b>${escapeHTML(title)}</b> ───┐`;
    },

    foot() {
      return `└${'─'.repeat(27)}┘`;
    },

    item(emoji, label, value) {
      return `│ ${emoji} ${escapeHTML(label)}: ${value}`;
    },

    itemSafe(emoji, label, value) {
      return `│ ${emoji} ${escapeHTML(label)}: ${escapeHTML(value)}`;
    },

    progressBar(pct) {
      const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
      const filled = Math.round((p / 100) * 20);
      return `⟨${'━'.repeat(filled)}${'╌'.repeat(20 - filled)}⟩ ${p}%`;
    },

    colorBar(pct) {
      const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
      const filled = Math.round((p / 100) * 10);
      let bar = '';
      for (let i = 0; i < 10; i++) {
        if (i < filled) {
          if (p >= 75) bar += '🟢';
          else if (p >= 50) bar += '🔵';
          else if (p >= 25) bar += '🟡';
          else bar += '🟠';
        } else bar += '⚪';
      }
      return `${bar} ${p}%`;
    },

    dateTime() {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday',
        'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December'];
      let h = now.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return {
        date: `${days[now.getDay()]}, ` +
          `${months[now.getMonth()]} ${now.getDate()}, ` +
          `${now.getFullYear()}`,
        time: `${String(h).padStart(2, '0')}:` +
          `${String(now.getMinutes()).padStart(2, '0')}:` +
          `${String(now.getSeconds()).padStart(2, '0')} ${ampm}`
      };
    },

    catTag(cat) {
      const t = {
        direct: '🏷 Direct', social: '🏷 Social',
        search: '🏷 Search', email: '🏷 Email',
        paid: '🏷 Paid Ads', referral: '🏷 Referral',
        campaign: '🏷 Campaign'
      };
      return t[cat] || '🏷 Other';
    },

    numItem(n) {
      const nums = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣',
        '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      return nums[n] || `#${n}`;
    },

    // ✅ بناء قسم هوية الزائر مع ID User
    identitySection(visitorId, fingerprint, idUser) {
      let section = `
${this.head('🔒', 'هويّة الزائر')}
${this.item('🆔', 'Visitor ID', '<code>' + visitorId + '</code>')}
${this.item('🔑', 'Fingerprint', '<code>' + fingerprint + '</code>')}`;

      if (idUser) {
        section += `\n${this.item('👤', 'ID User', '<b>🟢 ' + escapeHTML(idUser) + '</b>')}`;
        section += `\n│ 📌 الحالة: <b>زائر معرّف (من رابط تتبع)</b>`;
      } else {
        section += `\n${this.item('👤', 'ID User', '⚪ لا يوجد')}`;
        section += `\n│ 📌 الحالة: زائر عام (بدون رابط تتبع)`;
      }

      section += `\n${this.foot()}`;
      return section;
    }
  };

  // ══════════════════════════════════════
  // 🔧 الوظائف الأساسية
  // ══════════════════════════════════════
  function getVisitorId() {
    try {
      let vid = localStorage.getItem('_vid');
      if (!vid) {
        vid = 'v_' + Date.now().toString(36) + '_' +
          Math.random().toString(36).substring(2, 10);
        localStorage.setItem('_vid', vid);
      }
      return vid;
    } catch (e) {
      return 'v_' + Date.now().toString(36) + '_temp';
    }
  }

  function isNewVisitor() {
    try {
      const visited = localStorage.getItem('_visited');
      if (!visited) {
        localStorage.setItem('_visited', Date.now().toString());
        return true;
      }
      return false;
    } catch (e) { return true; }
  }

  function getVisitCount() {
    try {
      let c = parseInt(localStorage.getItem('_vc') || '0', 10);
      if (isNaN(c) || c < 0) c = 0;
      c++;
      localStorage.setItem('_vc', c.toString());
      return c;
    } catch (e) { return 1; }
  }

  function getFingerprint() {
    try {
      const parts = [
        navigator.userAgent, navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth, new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency, navigator.platform,
        navigator.maxTouchPoints
      ];
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '16px Arial';
          ctx.fillText('fp', 0, 0);
          parts.push(c.toDataURL().slice(-50));
        }
      } catch (e) { }
      let hash = 0;
      const str = parts.join('|');
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36).toUpperCase();
    } catch (e) { return 'UNKNOWN'; }
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent || '';
    let deviceType = 'Desktop', deviceLabel = 'PC',
      deviceEmoji = '💻';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
      deviceType = 'Tablet'; deviceLabel = 'Tablet';
      deviceEmoji = '📟';
    } else if (
      /Mobile|iPhone|iPod|Android.*Mobile|BlackBerry|Opera Mini|IEMobile/i
        .test(ua)) {
      deviceType = 'Mobile'; deviceLabel = 'Phone';
      deviceEmoji = '📱';
    }

    let os = 'Unknown';
    const platform = navigator.platform || '-';
    const osList = [
      [/Windows NT 10/i, 'Windows 10/11'],
      [/Windows NT 6.3/i, 'Windows 8.1'],
      [/Windows NT 6.1/i, 'Windows 7'],
      [/Windows/i, 'Windows'],
      [/Mac OS X/i, 'macOS'],
      [/CrOS/i, 'Chrome OS'],
      [/Linux/i, 'Linux']
    ];
    for (const [p, n] of osList) {
      if (p.test(ua)) { os = n; break; }
    }
    const ios = ua.match(/iPhone OS (\d+)/i) ||
      ua.match(/iPad.*OS (\d+)/i);
    if (ios) os = (ua.includes('iPad') ? 'iPadOS ' :
      'iOS ') + ios[1];
    const android = ua.match(/Android ([\d.]+)/i);
    if (android && os === 'Unknown') os = 'Android ' + android[1];

    let browser = 'Unknown';
    const bList = [
      [/Edg\/([\d.]+)/i, 'Edge'],
      [/OPR\/([\d.]+)/i, 'Opera'],
      [/SamsungBrowser\/([\d.]+)/i, 'Samsung'],
      [/Firefox\/([\d.]+)/i, 'Firefox'],
      [/Chrome\/([\d.]+)/i, 'Chrome'],
      [/Version\/([\d.]+).*Safari/i, 'Safari']
    ];
    for (const [p, n] of bList) {
      const m = ua.match(p);
      if (m) { browser = n + ' ' + (m[1] || ''); break; }
    }

    let vendor = '';
    if (/iPhone|iPad|Mac/i.test(ua)) vendor = 'Apple';
    else if (/Samsung/i.test(ua)) vendor = 'Samsung';
    else if (/Huawei/i.test(ua)) vendor = 'Huawei';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) vendor = 'Xiaomi';

    return {
      deviceType, deviceLabel, deviceEmoji,
      os, platform, browser, vendor
    };
  }

  function getExtraInfo() {
    let dark = false;
    try {
      dark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) { }
    const touch = 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    const conn = navigator.connection ||
      navigator.mozConnection || navigator.webkitConnection;
    let orient = '-';
    try {
      if (screen.orientation)
        orient = screen.orientation.type.includes('landscape')
          ? 'Landscape' : 'Portrait';
    } catch (e) { }

    return {
      darkMode: dark, touchSupport: touch,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      language: navigator.language || '-',
      cpuCores: navigator.hardwareConcurrency || '-',
      memory: navigator.deviceMemory
        ? navigator.deviceMemory + ' GB' : '-',
      timezone: Intl.DateTimeFormat().resolvedOptions()
        .timeZone || '-',
      orientation: orient,
      connectionType: conn
        ? (conn.effectiveType || '-') : '-',
      connectionSpeed: conn
        ? (conn.downlink ? conn.downlink + ' Mbps' : '-')
        : '-'
    };
  }

  async function getIPInfo() {
    const apis = [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://freeipapi.com/api/json'
    ];
    for (const api of apis) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(api, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) continue;
        const d = await r.json();
        if (d.country_name) return {
          ip: d.ip || '-', country: d.country_name,
          countryCode: d.country_code || '',
          city: d.city || '-', region: d.region || '-',
          timezone: d.timezone || '-', isp: d.org || '-',
          lat: d.latitude, lon: d.longitude
        };
        if (d.country) return {
          ip: d.ip || '-', country: d.country,
          countryCode: d.country_code || '',
          city: d.city || '-', region: d.region || '-',
          timezone: (d.timezone && d.timezone.id) || '-',
          isp: (d.connection && d.connection.isp) || '-',
          lat: d.latitude, lon: d.longitude
        };
        if (d.countryName) return {
          ip: d.ipAddress || '-', country: d.countryName,
          countryCode: d.countryCode || '',
          city: d.cityName || '-', region: d.regionName || '-',
          timezone: d.timeZone || '-', isp: '-',
          lat: d.latitude, lon: d.longitude
        };
      } catch (e) { continue; }
    }
    return {
      ip: '-', country: 'غير معروف', countryCode: '',
      city: '-', region: '-', timezone: '-', isp: '-',
      lat: null, lon: null
    };
  }

  function flagEmoji(code) {
    if (!code || code.length !== 2) return '🏳️';
    try {
      return String.fromCodePoint(
        ...code.toUpperCase().split('')
          .map(c => 127397 + c.charCodeAt(0)));
    } catch (e) { return '🏳️'; }
  }

  // ══════════════════════════════════════
  // 📤 الإرسال - بوت الزيارات فقط
  // ══════════════════════════════════════
  async function send(message) {
    try {
      if (!message || message.trim().length === 0) return;
      if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
        const parts = [];
        let current = '';
        for (const line of message.split('\n')) {
          if ((current + '\n' + line).length >
            CONFIG.MAX_MESSAGE_LENGTH) {
            if (current) parts.push(current);
            current = line;
          } else {
            current = current ? current + '\n' + line : line;
          }
        }
        if (current) parts.push(current);
        for (let i = 0; i < parts.length; i++) {
          await _api(parts[i]);
          if (i < parts.length - 1)
            await new Promise(r => setTimeout(r, 500));
        }
      } else {
        await _api(message);
      }
    } catch (e) { }
  }

  async function _api(text) {
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CONFIG.CHAT_ID,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error('Tracker:', r.status,
          err.description || '');
      }
    } catch (e) { }
  }

  function sendBeacon(msg) {
    try {
      if (!msg || msg.trim().length === 0) return;
      let m = msg;
      if (m.length > CONFIG.MAX_MESSAGE_LENGTH)
        m = m.substring(0, CONFIG.MAX_MESSAGE_LENGTH - 50) +
          '\n⚠️ <i>تم اقتصاص الرسالة</i>';
      if (typeof navigator.sendBeacon !== 'function') return;
      const payload = JSON.stringify({
        chat_id: CONFIG.CHAT_ID, text: m,
        parse_mode: 'HTML', disable_web_page_preview: true
      });
      if (payload.length > CONFIG.BEACON_MAX_SIZE) {
        m = m.substring(0, 2000) +
          '\n⚠️ <i>تم اقتصاص الرسالة</i>';
      }
      navigator.sendBeacon(
        `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}/sendMessage`,
        new Blob([JSON.stringify({
          chat_id: CONFIG.CHAT_ID, text: m,
          parse_mode: 'HTML', disable_web_page_preview: true
        })], { type: 'application/json' }));
    } catch (e) { }
  }

  // ══════════════════════════════════════
  // 🗂️ الجلسات
  // ══════════════════════════════════════
  const Session = {
    genId() {
      const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let id = '';
      for (let i = 0; i < 15; i++)
        id += c.charAt(Math.floor(Math.random() * c.length));
      return 'S' + id;
    },

    get() {
      let s = null;
      try {
        const stored = sessionStorage.getItem('_sd');
        if (stored) {
          s = JSON.parse(stored);
          if (!s || !s.startTime) s = null;
          else if (Date.now() - s.lastActivity >
            CONFIG.SESSION_TIMEOUT) s = null;
        }
      } catch (e) { s = null; }

      if (!s) {
        let sc = 1;
        try {
          sc = parseInt(
            localStorage.getItem('_sc') || '0', 10);
          if (isNaN(sc) || sc < 0) sc = 0;
          sc++;
          localStorage.setItem('_sc', sc.toString());
        } catch (e) { sc = 1; }
        s = {
          id: this.genId(), startTime: Date.now(),
          lastActivity: Date.now(), pages: [],
          totalPages: 0, isNew: true, sessionNumber: sc
        };
      } else {
        s.isNew = false;
        try {
          let sc = parseInt(
            localStorage.getItem('_sc') || '1', 10);
          if (isNaN(sc) || sc < 1) sc = 1;
          s.sessionNumber = sc;
        } catch (e) { s.sessionNumber = 1; }
      }
      s.lastActivity = Date.now();
      this.save(s);
      return s;
    },

    save(s) {
      try {
        if (s.pages && s.pages.length > CONFIG.MAX_PAGES_STORED)
          s.pages = s.pages.slice(-CONFIG.MAX_PAGES_STORED);
        sessionStorage.setItem('_sd', JSON.stringify(s));
      } catch (e) {
        try {
          s.pages = s.pages.slice(-10);
          sessionStorage.setItem('_sd', JSON.stringify(s));
        } catch (e2) { }
      }
    },

    addPage(s, page) {
      const last = s.pages[s.pages.length - 1];
      if (last && last.url === page.url && !last.exitTime)
        return s;
      if (last && !last.exitTime) {
        last.exitTime = Date.now();
        last.timeSpent = Math.round(
          (last.exitTime - last.enterTime) / 1000);
      }
      s.pages.push(page);
      s.totalPages = s.pages.length;
      s.lastActivity = Date.now();
      this.save(s);
      return s;
    },

    dur(sec) {
      const s = Math.max(0,
        Math.round(Math.abs(sec || 0)));
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ${s % 60}s`;
      return `${Math.floor(m / 60)}h ${m % 60}m`;
    },

    durAr(sec) {
      const s = Math.max(0,
        Math.round(Math.abs(sec || 0)));
      if (s < 60) return `${s} ثانية`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} دقيقة و ${s % 60} ثانية`;
      return `${Math.floor(m / 60)} ساعة و ${m % 60} دقيقة`;
    }
  };

  // ══════════════════════════════════════
  // 📜 تتبع السكرول → نفس البوت
  // ══════════════════════════════════════
  const Scroll = {
    max: 0,
    sent: [],
    startTime: Date.now(),
    session: null,
    _handler: null,

    init(session) {
      this.max = 0;
      this.session = session;
      this.startTime = Date.now();
      try {
        const key = '_ss_' + window.location.pathname;
        const saved = sessionStorage.getItem(key);
        this.sent = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(this.sent)) this.sent = [];
      } catch (e) { this.sent = []; }

      if (this._handler)
        window.removeEventListener('scroll', this._handler);

      let timer;
      const self = this;
      this._handler = function () {
        if (!timer) {
          timer = setTimeout(() => {
            self._track();
            timer = null;
          }, 300);
        }
      };
      window.addEventListener('scroll', this._handler,
        { passive: true });
      setTimeout(() => this._track(), 1000);
    },

    _track() {
      try {
        const scrollTop = window.pageYOffset ||
          document.documentElement.scrollTop || 0;
        const docH = Math.max(
          document.body.scrollHeight || 0,
          document.documentElement.scrollHeight || 0
        ) - window.innerHeight;
        if (docH > 0) {
          const depth = Math.min(100,
            Math.round((scrollTop / docH) * 100));
          this.max = Math.max(this.max, depth);
          CONFIG.SCROLL_MILESTONES.forEach(m => {
            if (depth >= m && !this.sent.includes(m)) {
              this.sent.push(m);
              this._save();
              this._notify(m);
            }
          });
        }
      } catch (e) { }
    },

    _save() {
      try {
        sessionStorage.setItem(
          '_ss_' + window.location.pathname,
          JSON.stringify(this.sent));
      } catch (e) { }
    },

    _notify(milestone) {
      const timeOnPage = Math.round(
        (Date.now() - this.startTime) / 1000);
      const sessionTime = Math.round(
        (Date.now() - (this.session
          ? this.session.startTime : Date.now())) / 1000);

      const mData = {
        10: { emoji: '📜', label: 'بداية التصفح',
          color: '🟠', level: 'مبتدئ' },
        25: { emoji: '📖', label: 'ربع الصفحة',
          color: '🟡', level: 'مهتم' },
        50: { emoji: '📘', label: 'نصف الصفحة',
          color: '🔵', level: 'متفاعل' },
        75: { emoji: '📗', label: 'تصفح عميق',
          color: '🟢', level: 'مهتم جداً' },
        100: { emoji: '🏆', label: 'نهاية الصفحة',
          color: '💎', level: 'ممتاز!' }
      };
      const d = mData[milestone] || {
        emoji: '📊', label: `${milestone}%`,
        color: '⚪', level: '-'
      };

      const sorted = [...this.sent].sort((a, b) => a - b);
      const visual = sorted.map(m => {
        const x = mData[m];
        return x ? `${x.color} ${m}%` : `⚪ ${m}%`;
      }).join('  ▸  ');

      const idUser = getSavedIDUser();
      const visitorId = getVisitorId();
      const fp = getFingerprint();

      const msg = `\
${d.emoji}  <b>S C R O L L    T R A C K E R</b>  ${d.emoji}
${F.lines.spark}

${d.color}  <b>${milestone}%</b>  ━  ${d.label}

${F.head('📊', 'مؤشر التقدم')}
${F.item('📏', 'الشريط', F.progressBar(milestone))}
${F.item('🎯', 'المستوى', d.level)}
${F.foot()}

${F.head('📄', 'الصفحة')}
${F.item('📑', 'العنوان', escapeHTML((document.title || '-').substring(0, 45)))}
${F.item('🔗', 'المسار', escapeHTML(window.location.pathname))}
${F.foot()}

${F.head('⏱', 'المدة الزمنية')}
${F.item('📄', 'في الصفحة', Session.durAr(timeOnPage))}
${F.item('🕐', 'الجلسة', Session.durAr(sessionTime))}
${F.foot()}

${F.head('📋', 'المراحل المكتملة')}
│ ${visual}
${F.foot()}

${F.identitySection(visitorId, fp, idUser)}

${F.lines.dots}
🔖 <code>${this.session ? this.session.id : '-'}</code>
${F.lines.dots}`;

      send(msg);
    },

    getDepth() { return this.max; },

    reset() {
      this.max = 0;
      this.sent = [];
      this.startTime = Date.now();
      this._save();
    },

    destroy() {
      if (this._handler) {
        window.removeEventListener('scroll', this._handler);
        this._handler = null;
      }
    }
  };

  // ══════════════════════════════════════
  // 🔎 مصادر الزيارة
  // ══════════════════════════════════════
  const Source = {
    analyze() {
      const ref = document.referrer || '';
      let params;
      try {
        params = new URLSearchParams(window.location.search);
      } catch (e) {
        params = new URLSearchParams('');
      }
      const utm = {
        source: params.get('utm_source') || '',
        medium: params.get('utm_medium') || '',
        campaign: params.get('utm_campaign') || '',
        term: params.get('utm_term') || '',
        content: params.get('utm_content') || ''
      };
      const src = this._detect(ref, utm, params);
      try {
        if (!localStorage.getItem('_fs'))
          localStorage.setItem('_fs', JSON.stringify(src));
      } catch (e) { }
      return { ...src, utm, referrerUrl: ref || '' };
    },

    _detect(ref, utm, params) {
      if (utm.source) return this._utm(utm);
      if (params.get('gclid')) return {
        category: 'paid', name: 'Google Ads',
        emoji: '💰', detail: 'إعلان مدفوع'
      };
      if (params.get('fbclid')) return {
        category: 'social', name: 'Facebook',
        emoji: '📘', detail: 'رابط Facebook'
      };
      if (ref) return this._ref(ref);
      return {
        category: 'direct', name: 'زيارة مباشرة',
        emoji: '🏠', detail: 'إدخال مباشر'
      };
    },

    _utm(utm) {
      const s = (utm.source || '').toLowerCase();
      const m = (utm.medium || '').toLowerCase();
      if (m === 'email' || s.includes('mail')) return {
        category: 'email', name: utm.source,
        emoji: '📧', detail: `حملة: ${utm.campaign || '-'}`
      };
      const social = {
        'linkedin': 'LinkedIn', 'facebook': 'Facebook',
        'instagram': 'Instagram', 'twitter': 'Twitter/X',
        'youtube': 'YouTube', 'tiktok': 'TikTok',
        'telegram': 'Telegram', 'whatsapp': 'WhatsApp'
      };
      for (const [k, v] of Object.entries(social)) {
        if (s.includes(k)) return {
          category: 'social', name: v, emoji: '📱',
          detail: `حملة: ${utm.campaign || '-'}`
        };
      }
      if (['cpc', 'ppc', 'paid', 'ads'].includes(m)) return {
        category: 'paid', name: utm.source, emoji: '💰',
        detail: `حملة: ${utm.campaign || '-'}`
      };
      return {
        category: 'campaign', name: utm.source,
        emoji: '📊',
        detail: `${utm.medium || '-'} / ${utm.campaign || '-'}`
      };
    },

    _ref(ref) {
      try {
        const host = new URL(ref).hostname.toLowerCase();
        const map = {
          'google': { c: 'search', n: 'Google', e: '🔍' },
          'bing': { c: 'search', n: 'Bing', e: '🔎' },
          'facebook': { c: 'social', n: 'Facebook', e: '📘' },
          'instagram': { c: 'social', n: 'Instagram', e: '📸' },
          'twitter': { c: 'social', n: 'Twitter/X', e: '🐦' },
          'x.com': { c: 'social', n: 'X', e: '🐦' },
          't.co': { c: 'social', n: 'Twitter/X', e: '🐦' },
          'youtube': { c: 'social', n: 'YouTube', e: '▶️' },
          'linkedin': { c: 'social', n: 'LinkedIn', e: '💼' },
          't.me': { c: 'social', n: 'Telegram', e: '✈️' },
          'wa.me': { c: 'social', n: 'WhatsApp', e: '💬' },
          'github': { c: 'social', n: 'GitHub', e: '🐙' }
        };
        for (const [k, v] of Object.entries(map)) {
          if (host.includes(k)) return {
            category: v.c, name: v.n, emoji: v.e,
            detail: v.c === 'search' ? 'بحث عضوي' :
              'شبكة اجتماعية'
          };
        }
        return {
          category: 'referral', name: host,
          emoji: '🌐', detail: 'موقع خارجي'
        };
      } catch (e) {
        return {
          category: 'referral', name: 'unknown',
          emoji: '🔗', detail: 'غير محدد'
        };
      }
    }
  };

  // ══════════════════════════════════════
  // 📨 رسالة الدخول
  // ══════════════════════════════════════
  function buildEntry(ip, dev, extra, src, visitor, session,
    idUser) {
    const flag = flagEmoji(ip.countryCode);
    const dt = F.dateTime();
    const isNew = visitor.isNew;
    const statusEmoji = isNew ? '🆕' : '🔄';
    const statusText = isNew
      ? 'NEW VISITOR' : 'RETURNING VISITOR';
    const statusTextAr = isNew
      ? 'زائر جديد'
      : `زائر عائد (الزيارة ${visitor.count})`;

    let location = 'غير معروف';
    if (ip.country !== 'غير معروف') {
      location = (ip.city !== '-' && ip.city !== 'غير معروف')
        ? `${ip.country}, ${ip.city}` : ip.country;
    }

    const srcEmojis = {
      direct: '🏠', social: '📱', search: '🔍',
      email: '📧', paid: '💰', referral: '🌐',
      campaign: '📊'
    };
    const srcE = srcEmojis[src.category] || '🔗';

    const settings = [
      extra.online ? '🟢 Online' : '🔴 Offline',
      extra.darkMode ? '🌙 Dark' : '☀️ Light',
      extra.cookiesEnabled ? '🍪 On' : '🍪 Off',
      extra.touchSupport ? '👆 Touch' : '🖱 Mouse'
    ].join('  ┃  ');

    // ✅ تحديد نوع الزائر بناءً على ID User
    let userBadge = '';
    if (idUser) {
      userBadge = `\n    👤  <b>ID User: ${escapeHTML(idUser)}</b>  ✅ زائر معرّف`;
    } else {
      userBadge = `\n    👤  ID User: لا يوجد  ⚪ زائر عام`;
    }

    let msg = `\
${statusEmoji}  <b>${statusText}</b>  ${statusEmoji}
${F.lines.diamond}

    ${statusTextAr}
    🌐  <b>${escapeHTML(CONFIG.SITE_NAME)}</b>${userBadge}

${F.lines.spark}

${F.head('🕐', 'التاريخ والوقت')}
${F.item('📅', 'Date', dt.date)}
${F.item('⏰', 'Time', dt.time)}
${F.foot()}

${F.head('📋', 'معلومات الجلسة')}
${F.item('🔢', 'رقم الجلسة', session.sessionNumber)}
${F.item('🔖', 'Session ID', '<code>' + session.id + '</code>')}
${F.item('📊', 'إجمالي الزيارات', visitor.count)}
${F.foot()}

${F.head(srcE, 'مصدر الزيارة')}
${F.item('📎', 'المصدر', escapeHTML(src.name) + ' ' + (src.emoji || ''))}
${F.item('📂', 'التصنيف', F.catTag(src.category))}
${F.itemSafe('📝', 'التفاصيل', src.detail)}`;

    if (src.referrerUrl)
      msg += `\n${F.itemSafe('🔗', 'Referrer', src.referrerUrl)}`;
    msg += `\n${F.foot()}`;

    const utm = src.utm;
    if (utm && (utm.source || utm.medium || utm.campaign)) {
      msg += `\n${F.head('📊', 'UTM Parameters')}`;
      if (utm.source)
        msg += `\n${F.itemSafe('📢', 'Source', utm.source)}`;
      if (utm.medium)
        msg += `\n${F.itemSafe('📰', 'Medium', utm.medium)}`;
      if (utm.campaign)
        msg += `\n${F.itemSafe('🎯', 'Campaign', utm.campaign)}`;
      if (utm.term)
        msg += `\n${F.itemSafe('🔑', 'Term', utm.term)}`;
      if (utm.content)
        msg += `\n${F.itemSafe('📄', 'Content', utm.content)}`;
      msg += `\n${F.foot()}`;
    }

    msg += `
${F.head('🌍', 'الموقع الجغرافي')}
${F.itemSafe(flag, 'الدولة/المدينة', location)}`;
    if (ip.region && ip.region !== '-')
      msg += `\n${F.itemSafe('📍', 'المنطقة', ip.region)}`;
    if (ip.isp && ip.isp !== '-')
      msg += `\n${F.itemSafe('📡', 'مزود الخدمة', ip.isp)}`;
    msg += `\n${F.item('🔢', 'IP', '<code>' + escapeHTML(ip.ip) + '</code>')}`;
    if (ip.lat && ip.lon) {
      msg += `\n${F.item('📌', 'الإحداثيات', '<code>' + ip.lat + ', ' + ip.lon + '</code>')}`;
      msg += `\n│ 🗺  <a href="https://maps.google.com/?q=${ip.lat},${ip.lon}">خرائط Google</a>`;
    }
    msg += `\n${F.foot()}`;

    msg += `
${F.head(dev.deviceEmoji, 'الجهاز')}
${F.itemSafe('📟', 'الجهاز', dev.deviceType + ' (' + (dev.vendor || dev.deviceLabel) + ')')}
${F.itemSafe('💿', 'النظام', dev.os + ' (' + dev.platform + ')')}
${F.itemSafe('🌐', 'المتصفح', dev.browser)}
${F.item('📐', 'الشاشة', screen.width + '×' + screen.height + '  ┃  ' + (window.devicePixelRatio || 1) + 'x  ┃  ' + extra.orientation)}
${F.foot()}

${F.head('⚙️', 'تفاصيل النظام')}
${F.item('🧠', 'المعالج', extra.cpuCores + ' أنوية')}`;
    if (extra.memory !== '-')
      msg += `\n${F.item('💾', 'الذاكرة', extra.memory)}`;
    msg += `\n${F.itemSafe('🗣', 'اللغة', extra.language)}`;
    if (extra.connectionType !== '-')
      msg += `\n${F.item('📶', 'الاتصال', extra.connectionType + (extra.connectionSpeed !== '-' ? ' (' + extra.connectionSpeed + ')' : ''))}`;
    msg += `\n│\n│ ${settings}\n${F.foot()}

${F.head('📄', 'الصفحة')}
${F.item('📑', 'العنوان', escapeHTML((document.title || '-').substring(0, 50)))}
${F.item('🔗', 'الرابط', escapeHTML(window.location.href))}
${F.foot()}

${F.lines.stars}

${F.identitySection(visitor.id, visitor.fingerprint, idUser)}

${F.lines.diamond}`;

    return msg;
  }

  // ══════════════════════════════════════
  // 🔀 رسالة التنقل
  // ══════════════════════════════════════
  function buildNav(session, from, to, idUser) {
    const fromTime = Session.durAr(from.timeSpent || 0);
    const sessionTime = Session.durAr(
      Math.round((Date.now() - session.startTime) / 1000));
    const clicks = from.interactions
      ? from.interactions.clicks : 0;

    return `\
🔀  <b>P A G E    N A V I G A T I O N</b>  🔀
${F.lines.spark}

${F.head('📤', 'الصفحة السابقة')}
${F.item('📑', 'العنوان', escapeHTML((from.title || '-').substring(0, 45)))}
${F.item('🔗', 'المسار', escapeHTML(from.path || '-'))}
${F.item('⏱', 'المدة', fromTime)}
${F.item('📊', 'التمرير', F.progressBar(from.scrollDepth || 0))}
${F.item('👆', 'النقرات', clicks + ' نقرة')}
${F.foot()}

          ⬇️  ━━  انتقال  ━━  ⬇️

${F.head('📥', 'الصفحة الجديدة')}
${F.item('📑', 'العنوان', escapeHTML((to.title || '-').substring(0, 45)))}
${F.item('🔗', 'المسار', escapeHTML(to.path || '-'))}
${F.foot()}

${F.head('📊', 'الجلسة')}
${F.item('📄', 'الصفحات', session.totalPages)}
${F.item('🕐', 'المدة', sessionTime)}
${F.foot()}

${F.identitySection(getVisitorId(), getFingerprint(), idUser)}

${F.lines.dots}
🔖 <code>${session.id}</code>
${F.lines.dots}`;
  }

  // ══════════════════════════════════════
  // 📊 ملخص الجلسة
  // ══════════════════════════════════════
  function buildSummary(session, currentScroll, idUser) {
    const dur = Math.round(
      (Date.now() - session.startTime) / 1000);
    const pages = session.pages || [];

    if (pages.length > 0) {
      const last = pages[pages.length - 1];
      if (last && !last.exitTime) {
        last.exitTime = Date.now();
        last.timeSpent = Math.round(
          (last.exitTime - last.enterTime) / 1000);
        last.scrollDepth = currentScroll;
      }
    }

    const avgScroll = pages.length > 0
      ? Math.round(pages.reduce((s, p) =>
        s + (p.scrollDepth || 0), 0) / pages.length)
      : 0;
    const totalTime = pages.reduce((s, p) =>
      s + (p.timeSpent || 0), 0);
    const totalClicks = pages.reduce((s, p) =>
      s + ((p.interactions ? p.interactions.clicks : 0)
        || 0), 0);

    let engagement, engE;
    if (totalTime > 300 && avgScroll > 70) {
      engagement = 'ممتاز'; engE = '🔥🔥🔥';
    } else if (totalTime > 120 && avgScroll > 50) {
      engagement = 'عالي'; engE = '🔥🔥';
    } else if (totalTime > 30 && avgScroll > 25) {
      engagement = 'متوسط'; engE = '⚡';
    } else {
      engagement = 'منخفض'; engE = '📉';
    }

    let bounce, bounceE;
    if (pages.length === 1 && totalTime < 15) {
      bounce = 'ارتداد سريع'; bounceE = '⚠️';
    } else if (pages.length === 1) {
      bounce = 'صفحة واحدة - وقت جيد'; bounceE = '📌';
    } else {
      bounce = `تصفح نشط (${pages.length} صفحات)`;
      bounceE = '✅';
    }

    let msg = `\
👋  <b>S E S S I O N    S U M M A R Y</b>  👋
${F.lines.diamond}

${F.head('📊', 'الإحصائيات')}
${F.item('⏱', 'مدة الجلسة', Session.durAr(dur))}
${F.item('📄', 'الصفحات', pages.length)}
${F.item('👆', 'النقرات', totalClicks)}
${F.item('📜', 'متوسط التمرير', F.colorBar(avgScroll))}
${F.item(engE, 'التفاعل', engagement)}
${F.item(bounceE, 'الحالة', bounce)}
${F.foot()}

${F.head('📋', 'رحلة التصفح')}`;

    const display = pages.length > 10
      ? pages.slice(-10) : pages;
    if (pages.length > 10)
      msg += `\n│ ℹ️ <i>آخر 10 من ${pages.length}</i>`;

    display.forEach((page, i) => {
      const idx = pages.length > 10
        ? (pages.length - 10 + i + 1) : (i + 1);
      msg += `
│
│ ${F.numItem(idx)}  <b>${escapeHTML((page.title || page.path || '-').substring(0, 35))}</b>
│    🔗 ${escapeHTML(page.path || '-')}
│    ⏱ ${Session.dur(page.timeSpent || 0)}  ┃  📊 ${F.progressBar(page.scrollDepth || 0)}
│    👆 ${page.interactions ? page.interactions.clicks : 0} نقرة`;
    });

    msg += `\n${F.foot()}

${F.lines.stars}

${F.identitySection(getVisitorId(), getFingerprint(), idUser)}

${F.lines.dots}
🔖 <code>${session.id}</code>
${F.lines.diamond}`;

    return msg;
  }

  // ══════════════════════════════════════
  // 🚀 التشغيل الرئيسي
  // ══════════════════════════════════════
  async function start() {
    let urlCheck = null, updateCheck = null;
    let clickH = null, keyH = null;

    try {
      // ✅ استخراج وحفظ ID User
      const idUser = getIDUser();
      if (idUser) saveIDUser(idUser);
      const currentIDUser = idUser || getSavedIDUser();

      const session = Session.get();

      let isFirstLoad = false;
      try {
        isFirstLoad = !sessionStorage.getItem('_ts');
      } catch (e) { isFirstLoad = true; }

      const currentPage = {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title || window.location.pathname,
        enterTime: Date.now(), exitTime: null,
        timeSpent: 0, scrollDepth: 0,
        interactions: { clicks: 0, keyPresses: 0 }
      };
      Session.addPage(session, currentPage);

      clickH = function () {
        const p = session.pages;
        if (p.length > 0 && p[p.length - 1].interactions) {
          p[p.length - 1].interactions.clicks++;
          if (p[p.length - 1].interactions.clicks % 10 === 0)
            Session.save(session);
        }
      };
      keyH = function () {
        const p = session.pages;
        if (p.length > 0 && p[p.length - 1].interactions)
          p[p.length - 1].interactions.keyPresses++;
      };
      document.addEventListener('click', clickH);
      document.addEventListener('keydown', keyH);

      Scroll.init(session);

      // ✅ إرسال إشعار الدخول
      if (isFirstLoad) {
        const visitorId = getVisitorId();
        const isNew = isNewVisitor();
        const visitCount = getVisitCount();
        const fp = getFingerprint();
        const device = getDeviceInfo();
        const extra = getExtraInfo();
        const sourceInfo = Source.analyze();

        let ipInfo;
        try { ipInfo = await getIPInfo(); }
        catch (e) {
          ipInfo = {
            ip: '-', country: 'غير معروف', countryCode: '',
            city: '-', region: '-', timezone: '-', isp: '-',
            lat: null, lon: null
          };
        }

        const visitor = {
          id: visitorId, isNew,
          count: visitCount, fingerprint: fp
        };

        const message = buildEntry(
          ipInfo, device, extra, sourceInfo,
          visitor, session, currentIDUser
        );
        await send(message);

        try {
          sessionStorage.setItem('_ts', Date.now().toString());
        } catch (e) { }
      }

      // ══ مراقبة SPA ══
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      let lastUrl = window.location.href;

      function handleNav() {
        try {
          const newUrl = window.location.href;
          if (newUrl === lastUrl) return;
          const pages = session.pages;
          const oldPage = pages.length > 0
            ? pages[pages.length - 1] : null;
          if (oldPage && !oldPage.exitTime) {
            oldPage.exitTime = Date.now();
            oldPage.timeSpent = Math.round(
              (oldPage.exitTime - oldPage.enterTime) / 1000);
            oldPage.scrollDepth = Scroll.getDepth();
          }
          Scroll.reset();
          lastUrl = newUrl;

          setTimeout(() => {
            const newPage = {
              url: window.location.href,
              path: window.location.pathname,
              title: document.title ||
                window.location.pathname,
              enterTime: Date.now(), exitTime: null,
              timeSpent: 0, scrollDepth: 0,
              interactions: { clicks: 0, keyPresses: 0 }
            };
            Session.addPage(session, newPage);
            if (oldPage) {
              const navMsg = buildNav(
                session, oldPage, newPage, currentIDUser);
              send(navMsg);
            }
          }, 200);
        } catch (e) { }
      }

      history.pushState = function () {
        origPush.apply(this, arguments);
        setTimeout(handleNav, 100);
      };
      history.replaceState = function () {
        origReplace.apply(this, arguments);
        setTimeout(handleNav, 100);
      };
      window.addEventListener('popstate', () =>
        setTimeout(handleNav, 100));
      window.addEventListener('hashchange', () =>
        setTimeout(handleNav, 100));

      urlCheck = setInterval(() => {
        try {
          if (window.location.href !== lastUrl) handleNav();
        } catch (e) { }
      }, 1000);

      updateCheck = setInterval(() => {
        try {
          const p = session.pages;
          if (p.length > 0) {
            const c = p[p.length - 1];
            c.scrollDepth = Scroll.getDepth();
            c.timeSpent = Math.round(
              (Date.now() - c.enterTime) / 1000);
            Session.save(session);
          }
        } catch (e) { }
      }, 3000);

      function cleanup() {
        try {
          if (urlCheck) clearInterval(urlCheck);
          if (updateCheck) clearInterval(updateCheck);
          if (clickH)
            document.removeEventListener('click', clickH);
          if (keyH)
            document.removeEventListener('keydown', keyH);
          Scroll.destroy();
          history.pushState = origPush;
          history.replaceState = origReplace;
        } catch (e) { }
      }

      window.addEventListener('beforeunload', function () {
        try {
          const p = session.pages;
          if (p.length > 0) {
            const l = p[p.length - 1];
            if (!l.exitTime) {
              l.exitTime = Date.now();
              l.timeSpent = Math.round(
                (l.exitTime - l.enterTime) / 1000);
              l.scrollDepth = Scroll.getDepth();
            }
            Session.save(session);
          }
          const totalTime = Math.round(
            (Date.now() - session.startTime) / 1000);
          if (totalTime > 5) {
            const summary = buildSummary(
              session, Scroll.getDepth(), currentIDUser);
            sendBeacon(summary);
          }
          cleanup();
        } catch (e) { }
      });

      document.addEventListener('visibilitychange', () => {
        try {
          if (document.visibilityState === 'hidden') {
            const p = session.pages;
            if (p.length > 0) {
              const c = p[p.length - 1];
              c.scrollDepth = Scroll.getDepth();
              c.timeSpent = Math.round(
                (Date.now() - c.enterTime) / 1000);
              Session.save(session);
            }
          }
        } catch (e) { }
      });

      window.addEventListener('pagehide', cleanup);

      console.log('✅ Tracker v6.0 | Session:', session.id,
        '| ID User:', currentIDUser || 'none');

    } catch (error) {
      console.error('❌ Tracker:', error.message || error);
      if (urlCheck) clearInterval(urlCheck);
      if (updateCheck) clearInterval(updateCheck);
    }
  }

  // ══════════════════════════════════════
  // 🏁 البدء
  // ══════════════════════════════════════
  if (document.readyState === 'complete' ||
    document.readyState === 'interactive') {
    setTimeout(start, 500);
  } else {
    document.addEventListener('DOMContentLoaded', () =>
      setTimeout(start, 500));
  }

})();