// ══════════════════════════════════════════════════════
// 🔍 نظام التتبع الاحترافي v5.0 - ثلاثة بوتات منفصلة
// ══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════
  // ⚙️ الإعدادات - 3 بوتات منفصلة
  // ══════════════════════════════════════
  const CONFIG = {
    // ────── 🤖 بوت 1: تتبع الزيارات ──────
    VISITS_BOT: {
      TOKEN: '7771956525:AAHD_99ztVRNOUFaPGFN1LGPxCaq0um5ktI',
      CHAT_ID: '7203463194'
    },

    // ────── 🤖 بوت 2: تتبع السكرول ──────
    SCROLL_BOT: {
      TOKEN: '7405291435:AAHALt-5hZS1XnG1dYvsJAPwLpI1sPh_AIY',
      CHAT_ID: '7203463194'
    },

    // ────── 🤖 بوت 3: تتبع الإيميل ──────
    EMAIL_BOT: {
      TOKEN: '8424656659:AAEbo9X2Kuw1QZDRPyu_Uy-SNg6T36vQoRg',
      CHAT_ID: '7203463194'
    },

    // ────── إعدادات عامة ──────
    SITE_NAME: 'اسم موقعك',
    SESSION_TIMEOUT: 30 * 60 * 1000,
    SCROLL_MILESTONES: [10, 25, 50, 75, 100],
    MAX_MESSAGE_LENGTH: 4000,
    MAX_PAGES_STORED: 50,
    BEACON_MAX_SIZE: 60000
  };

  // ══════════════════════════════════════
  // 🛡️ التحقق من الإعدادات
  // ══════════════════════════════════════
  function validateBot(bot, name) {
    if (!bot.TOKEN || bot.TOKEN.length < 30
      || !bot.CHAT_ID || bot.CHAT_ID.length === 0) {
      console.warn(`⚠️ Tracker: ${name} not configured`);
      return false;
    }
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(bot.TOKEN)) {
      console.warn(`⚠️ Tracker: ${name} TOKEN format invalid`);
      return false;
    }
    return true;
  }

  const BOTS_VALID = {
    visits: validateBot(CONFIG.VISITS_BOT, 'VISITS_BOT'),
    scroll: validateBot(CONFIG.SCROLL_BOT, 'SCROLL_BOT'),
    email: validateBot(CONFIG.EMAIL_BOT, 'EMAIL_BOT')
  };

  // إذا لا يوجد أي بوت صالح، لا تشغّل
  if (!BOTS_VALID.visits && !BOTS_VALID.scroll && !BOTS_VALID.email) {
    console.warn('⚠️ Tracker: No valid bots configured');
    return;
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
  const Formatter = {
    lines: {
      thick: '━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      thin: '───────────────────────────',
      dots: '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄',
      stars: '✦ ─────────────────── ✦',
      diamond: '◆━━━━━━━━━━━━━━━━━━━━━◆',
      spark: '✨━━━━━━━━━━━━━━━━━━━✨'
    },

    sectionHeader(emoji, title) {
      return `\n┌─── ${emoji} <b>${escapeHTML(title)}</b> ───┐`;
    },

    sectionFooter() {
      return `└${'─'.repeat(27)}┘`;
    },

    dataItem(emoji, label, value) {
      return `│ ${emoji} ${escapeHTML(label)}: ${value}`;
    },

    dataItemSafe(emoji, label, value) {
      return `│ ${emoji} ${escapeHTML(label)}: ${escapeHTML(value)}`;
    },

    fancyProgressBar(percentage) {
      const pct = Math.max(0, Math.min(100, Math.round(percentage || 0)));
      const total = 20;
      const filled = Math.round((pct / 100) * total);
      const empty = total - filled;
      return `⟨${'━'.repeat(filled)}${'╌'.repeat(empty)}⟩ ${pct}%`;
    },

    colorProgressBar(percentage) {
      const pct = Math.max(0, Math.min(100, Math.round(percentage || 0)));
      const blocks = 10;
      const filled = Math.round((pct / 100) * blocks);
      let bar = '';
      for (let i = 0; i < blocks; i++) {
        if (i < filled) {
          if (pct >= 75) bar += '🟢';
          else if (pct >= 50) bar += '🔵';
          else if (pct >= 25) bar += '🟡';
          else bar += '🟠';
        } else {
          bar += '⚪';
        }
      }
      return `${bar} ${pct}%`;
    },

    formatDateTime() {
      const now = new Date();
      const days = [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
      ];
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      let h = now.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return {
        date: `${days[now.getDay()]}, ${months[now.getMonth()]} ` +
          `${now.getDate()}, ${now.getFullYear()}`,
        time: `${String(h).padStart(2, '0')}:` +
          `${String(now.getMinutes()).padStart(2, '0')}:` +
          `${String(now.getSeconds()).padStart(2, '0')} ${ampm}`
      };
    },

    categoryTag(category) {
      const tags = {
        direct: '🏷 Direct', social: '🏷 Social',
        search: '🏷 Search', email: '🏷 Email',
        paid: '🏷 Paid Ads', referral: '🏷 Referral',
        campaign: '🏷 Campaign'
      };
      return tags[category] || '🏷 Other';
    },

    numberedItem(num) {
      const nums = [
        '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣',
        '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'
      ];
      return nums[num] || `#${num}`;
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
    } catch (e) {
      return true;
    }
  }

  function getVisitCount() {
    try {
      let count = parseInt(localStorage.getItem('_vc') || '0', 10);
      if (isNaN(count) || count < 0) count = 0;
      count++;
      localStorage.setItem('_vc', count.toString());
      return count;
    } catch (e) {
      return 1;
    }
  }

  function getFingerprint() {
    try {
      const parts = [
        navigator.userAgent, navigator.language,
        screen.width + 'x' + screen.height, screen.colorDepth,
        new Date().getTimezoneOffset(), navigator.hardwareConcurrency,
        navigator.platform, navigator.maxTouchPoints
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
    } catch (e) {
      return 'UNKNOWN';
    }
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent || '';
    let deviceType = 'Desktop', deviceLabel = 'PC', deviceEmoji = '💻';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
      deviceType = 'Tablet'; deviceLabel = 'Tablet'; deviceEmoji = '📟';
    } else if (
      /Mobile|iPhone|iPod|Android.*Mobile|BlackBerry|Opera Mini|IEMobile/i
        .test(ua)
    ) {
      deviceType = 'Mobile'; deviceLabel = 'Phone'; deviceEmoji = '📱';
    }

    let os = 'Unknown';
    const platform = navigator.platform || '-';
    const osPatterns = [
      [/Windows NT 10/i, 'Windows 10/11'],
      [/Windows NT 6.3/i, 'Windows 8.1'],
      [/Windows NT 6.1/i, 'Windows 7'],
      [/Windows/i, 'Windows'],
      [/Mac OS X/i, 'macOS'],
      [/CrOS/i, 'Chrome OS'],
      [/Linux/i, 'Linux']
    ];
    for (const [p, n] of osPatterns) {
      if (p.test(ua)) { os = n; break; }
    }
    const iosMatch = ua.match(/iPhone OS (\d+)/i) ||
      ua.match(/iPad.*OS (\d+)/i);
    if (iosMatch) {
      os = (ua.includes('iPad') ? 'iPadOS ' : 'iOS ') + iosMatch[1];
    }
    const androidMatch = ua.match(/Android ([\d.]+)/i);
    if (androidMatch && os === 'Unknown') {
      os = 'Android ' + androidMatch[1];
    }

    let browser = 'Unknown';
    const browserPatterns = [
      [/Edg\/([\d.]+)/i, 'Edge'],
      [/OPR\/([\d.]+)/i, 'Opera'],
      [/SamsungBrowser\/([\d.]+)/i, 'Samsung'],
      [/Firefox\/([\d.]+)/i, 'Firefox'],
      [/Chrome\/([\d.]+)/i, 'Chrome'],
      [/Version\/([\d.]+).*Safari/i, 'Safari']
    ];
    for (const [p, n] of browserPatterns) {
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
      navigator.mozConnection ||
      navigator.webkitConnection;

    let orient = '-';
    try {
      if (screen.orientation) {
        orient = screen.orientation.type.includes('landscape')
          ? 'Landscape' : 'Portrait';
      }
    } catch (e) { }

    return {
      darkMode: dark,
      touchSupport: touch,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      language: navigator.language || '-',
      cpuCores: navigator.hardwareConcurrency || '-',
      memory: navigator.deviceMemory
        ? navigator.deviceMemory + ' GB' : '-',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '-',
      orientation: orient,
      connectionType: conn ? (conn.effectiveType || '-') : '-',
      connectionSpeed: conn
        ? (conn.downlink ? conn.downlink + ' Mbps' : '-') : '-'
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
      ip: 'غير معروف', country: 'غير معروف', countryCode: '',
      city: 'غير معروف', region: '-', timezone: '-', isp: '-',
      lat: null, lon: null
    };
  }

  function flagEmoji(code) {
    if (!code || code.length !== 2) return '🏳️';
    try {
      return String.fromCodePoint(
        ...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
      );
    } catch (e) { return '🏳️'; }
  }

  // ══════════════════════════════════════
  // 📤 نظام الإرسال - يدعم 3 بوتات
  // ══════════════════════════════════════

  // ✅ إرسال لبوت محدد
  async function sendToBot(bot, message) {
    try {
      if (!message || message.trim().length === 0) return;

      if (message.length > CONFIG.MAX_MESSAGE_LENGTH) {
        const parts = [];
        let current = '';
        const lines = message.split('\n');
        for (const line of lines) {
          if ((current + '\n' + line).length > CONFIG.MAX_MESSAGE_LENGTH) {
            if (current) parts.push(current);
            current = line;
          } else {
            current = current ? current + '\n' + line : line;
          }
        }
        if (current) parts.push(current);

        for (let i = 0; i < parts.length; i++) {
          await _sendAPI(bot, parts[i]);
          if (i < parts.length - 1) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      } else {
        await _sendAPI(bot, message);
      }
    } catch (e) {
      console.error('Tracker: Send failed:', e.message);
    }
  }

  async function _sendAPI(bot, text) {
    try {
      const url =
        `https://api.telegram.org/bot${bot.TOKEN}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: bot.CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Tracker API error:', response.status,
          err.description || '');
      }
    } catch (e) {
      console.error('Tracker: Network error:', e.message);
    }
  }

  function sendBeaconToBot(bot, msg) {
    try {
      if (!msg || msg.trim().length === 0) return;
      let finalMsg = msg;
      if (finalMsg.length > CONFIG.MAX_MESSAGE_LENGTH) {
        finalMsg = finalMsg.substring(0, CONFIG.MAX_MESSAGE_LENGTH - 50) +
          '\n⚠️ <i>تم اقتصاص الرسالة</i>';
      }
      if (typeof navigator.sendBeacon !== 'function') return;

      const payload = JSON.stringify({
        chat_id: bot.CHAT_ID,
        text: finalMsg,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      if (payload.length > CONFIG.BEACON_MAX_SIZE) {
        const truncated = finalMsg.substring(0, 2000) +
          '\n⚠️ <i>تم اقتصاص الرسالة</i>';
        navigator.sendBeacon(
          `https://api.telegram.org/bot${bot.TOKEN}/sendMessage`,
          new Blob([JSON.stringify({
            chat_id: bot.CHAT_ID, text: truncated,
            parse_mode: 'HTML', disable_web_page_preview: true
          })], { type: 'application/json' })
        );
        return;
      }

      navigator.sendBeacon(
        `https://api.telegram.org/bot${bot.TOKEN}/sendMessage`,
        new Blob([payload], { type: 'application/json' })
      );
    } catch (e) {
      console.error('Tracker: Beacon error:', e.message);
    }
  }

  // ✅ اختصارات الإرسال لكل بوت
  async function sendVisits(msg) {
    if (BOTS_VALID.visits) await sendToBot(CONFIG.VISITS_BOT, msg);
  }
  async function sendScroll(msg) {
    if (BOTS_VALID.scroll) await sendToBot(CONFIG.SCROLL_BOT, msg);
  }
  async function sendEmail(msg) {
    if (BOTS_VALID.email) await sendToBot(CONFIG.EMAIL_BOT, msg);
  }

  // ══════════════════════════════════════
  // 🗂️ نظام الجلسات
  // ══════════════════════════════════════
  const SessionManager = {
    generateSessionId() {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let id = '';
      for (let i = 0; i < 15; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return 'S' + id;
    },

    getSession() {
      let session = null;
      try {
        const stored = sessionStorage.getItem('_session_data');
        if (stored) {
          session = JSON.parse(stored);
          if (!session || !session.startTime) session = null;
          else if (Date.now() - session.lastActivity >
            CONFIG.SESSION_TIMEOUT) session = null;
        }
      } catch (e) { session = null; }

      if (!session) {
        let sc = 1;
        try {
          sc = parseInt(localStorage.getItem('_sc') || '0', 10);
          if (isNaN(sc) || sc < 0) sc = 0;
          sc++;
          localStorage.setItem('_sc', sc.toString());
        } catch (e) { sc = 1; }

        session = {
          id: this.generateSessionId(),
          startTime: Date.now(),
          lastActivity: Date.now(),
          pages: [],
          totalPages: 0,
          isNew: true,
          sessionNumber: sc
        };
      } else {
        session.isNew = false;
        try {
          let sc = parseInt(localStorage.getItem('_sc') || '1', 10);
          if (isNaN(sc) || sc < 1) sc = 1;
          session.sessionNumber = sc;
        } catch (e) { session.sessionNumber = 1; }
      }

      session.lastActivity = Date.now();
      this.saveSession(session);
      return session;
    },

    saveSession(session) {
      try {
        if (session.pages &&
          session.pages.length > CONFIG.MAX_PAGES_STORED) {
          session.pages = session.pages.slice(-CONFIG.MAX_PAGES_STORED);
        }
        sessionStorage.setItem('_session_data',
          JSON.stringify(session));
      } catch (e) {
        try {
          session.pages = session.pages.slice(-10);
          sessionStorage.setItem('_session_data',
            JSON.stringify(session));
        } catch (e2) { }
      }
    },

    addPage(session, pageData) {
      const last = session.pages[session.pages.length - 1];
      if (last && last.url === pageData.url && !last.exitTime) {
        return session;
      }
      if (last && !last.exitTime) {
        last.exitTime = Date.now();
        last.timeSpent = Math.round(
          (last.exitTime - last.enterTime) / 1000);
      }
      session.pages.push(pageData);
      session.totalPages = session.pages.length;
      session.lastActivity = Date.now();
      this.saveSession(session);
      return session;
    },

    formatDuration(seconds) {
      const s = Math.max(0, Math.round(Math.abs(seconds || 0)));
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ${s % 60}s`;
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    },

    formatDurationAr(seconds) {
      const s = Math.max(0, Math.round(Math.abs(seconds || 0)));
      if (s < 60) return `${s} ثانية`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} دقيقة و ${s % 60} ثانية`;
      const h = Math.floor(m / 60);
      return `${h} ساعة و ${m % 60} دقيقة`;
    }
  };

  // ══════════════════════════════════════
  // 📜 نظام تتبع السكرول → بوت 2
  // ══════════════════════════════════════
  const ScrollTracker = {
    maxDepth: 0,
    sentMilestones: [],
    pageStartTime: Date.now(),
    session: null,
    _scrollHandler: null,

    init(session) {
      if (!BOTS_VALID.scroll) return; // ✅ لا تشغّل إذا البوت غير مهيأ

      this.maxDepth = 0;
      this.session = session;
      this.pageStartTime = Date.now();

      try {
        const key = '_scroll_sent_' + window.location.pathname;
        const saved = sessionStorage.getItem(key);
        this.sentMilestones = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(this.sentMilestones)) {
          this.sentMilestones = [];
        }
      } catch (e) { this.sentMilestones = []; }

      if (this._scrollHandler) {
        window.removeEventListener('scroll', this._scrollHandler);
      }

      let timer;
      const self = this;
      this._scrollHandler = function () {
        if (!timer) {
          timer = setTimeout(() => {
            self._track();
            timer = null;
          }, 300);
        }
      };

      window.addEventListener('scroll', this._scrollHandler,
        { passive: true });
      setTimeout(() => this._track(), 1000);
    },

    _track() {
      try {
        const scrollTop = window.pageYOffset ||
          document.documentElement.scrollTop || 0;
        const docHeight = Math.max(
          document.body.scrollHeight || 0,
          document.documentElement.scrollHeight || 0
        ) - window.innerHeight;

        if (docHeight > 0) {
          const depth = Math.min(100,
            Math.round((scrollTop / docHeight) * 100));
          this.maxDepth = Math.max(this.maxDepth, depth);

          CONFIG.SCROLL_MILESTONES.forEach(m => {
            if (depth >= m && !this.sentMilestones.includes(m)) {
              this.sentMilestones.push(m);
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
          '_scroll_sent_' + window.location.pathname,
          JSON.stringify(this.sentMilestones));
      } catch (e) { }
    },

    _notify(milestone) {
      const timeOnPage = Math.round(
        (Date.now() - this.pageStartTime) / 1000);
      const sessionStart = this.session
        ? this.session.startTime : Date.now();
      const sessionTime = Math.round(
        (Date.now() - sessionStart) / 1000);

      const milestoneData = {
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
      const data = milestoneData[milestone] || {
        emoji: '📊', label: `${milestone}%`,
        color: '⚪', level: '-'
      };

      const sorted = [...this.sentMilestones].sort((a, b) => a - b);
      const milestonesVisual = sorted.map(m => {
        const d = milestoneData[m];
        return d ? `${d.color} ${m}%` : `⚪ ${m}%`;
      }).join('  ▸  ');

      const sessionId = this.session ? this.session.id : '-';
      const pageTitle = escapeHTML(
        (document.title || '-').substring(0, 45));

      // ✅ يُرسل لبوت السكرول فقط
      const msg = `\
${data.emoji}  <b>S C R O L L    T R A C K E R</b>  ${data.emoji}
${Formatter.lines.spark}

${data.color}  <b>${milestone}%</b>  ━  ${data.label}

${Formatter.sectionHeader('📊', 'مؤشر التقدم')}
${Formatter.dataItem('📏', 'الشريط', Formatter.fancyProgressBar(milestone))}
${Formatter.dataItem('🎯', 'المستوى', data.level)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('📄', 'الصفحة')}
${Formatter.dataItem('📑', 'العنوان', pageTitle)}
${Formatter.dataItem('🔗', 'المسار', escapeHTML(window.location.pathname))}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('⏱', 'المدة الزمنية')}
${Formatter.dataItem('📄', 'في الصفحة', SessionManager.formatDurationAr(timeOnPage))}
${Formatter.dataItem('🕐', 'الجلسة', SessionManager.formatDurationAr(sessionTime))}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('📋', 'المراحل المكتملة')}
│ ${milestonesVisual}
${Formatter.sectionFooter()}

${Formatter.lines.dots}
🔖 <code>${sessionId}</code>  ┃  🆔 <code>${getVisitorId()}</code>
${Formatter.lines.dots}`;

      sendScroll(msg);
    },

    getDepth() { return this.maxDepth; },

    reset() {
      this.maxDepth = 0;
      this.sentMilestones = [];
      this.pageStartTime = Date.now();
      this._save();
    },

    destroy() {
      if (this._scrollHandler) {
        window.removeEventListener('scroll', this._scrollHandler);
        this._scrollHandler = null;
      }
    }
  };

  // ══════════════════════════════════════
  // 📧 نظام تتبع الإيميل → بوت 3
  // ══════════════════════════════════════
  const EmailTracker = {
    init() {
      if (!BOTS_VALID.email) return;

      // ✅ قراءة بارامترات التتبع من الرابط
      let params;
      try {
        params = new URLSearchParams(window.location.search);
      } catch (e) {
        params = new URLSearchParams('');
      }

      // ══ بارامترات تتبع الإيميل ══
      // الاستخدام: ?email_track=USER_NAME
      // أو: ?et=USER_NAME
      // أو: ?eid=USER_NAME
      const emailUser = params.get('email_track')
        || params.get('et')
        || params.get('eid')
        || params.get('email_user')
        || params.get('eu')
        || null;

      // ✅ إذا لا يوجد بارامتر إيميل، لا ترسل
      if (!emailUser) return;

      // التحقق من عدم الإرسال المكرر لنفس اليوزر
      const trackKey = '_email_tracked_' + emailUser;
      try {
        const lastTracked = localStorage.getItem(trackKey);
        if (lastTracked) {
          const elapsed = Date.now() - parseInt(lastTracked, 10);
          // لا ترسل إذا تم التتبع خلال آخر 5 دقائق
          if (elapsed < 5 * 60 * 1000) {
            console.log('📧 Email already tracked for:', emailUser);
            // ✅ لكن سجّل كفتح إضافي
            this._recordExtraOpen(emailUser);
            return;
          }
        }
      } catch (e) { }

      // ✅ بارامترات إضافية اختيارية
      const campaignName = params.get('campaign')
        || params.get('c')
        || params.get('email_campaign')
        || '-';
      const emailSubject = params.get('subject')
        || params.get('sub')
        || params.get('s')
        || '-';
      const emailId = params.get('mid')
        || params.get('message_id')
        || '-';

      // ✅ جمع بيانات الفتح وإرسالها
      this._trackOpen(emailUser, campaignName, emailSubject, emailId);
    },

    async _trackOpen(username, campaign, subject, messageId) {
      try {
        // حفظ وقت التتبع
        const trackKey = '_email_tracked_' + username;
        localStorage.setItem(trackKey, Date.now().toString());

        // حفظ عدد مرات الفتح
        const countKey = '_email_opens_' + username;
        let openCount = 1;
        try {
          openCount = parseInt(
            localStorage.getItem(countKey) || '0', 10);
          if (isNaN(openCount)) openCount = 0;
          openCount++;
          localStorage.setItem(countKey, openCount.toString());
        } catch (e) { }

        // حفظ أول وقت فتح
        const firstOpenKey = '_email_first_' + username;
        let firstOpen = '-';
        try {
          if (!localStorage.getItem(firstOpenKey)) {
            localStorage.setItem(firstOpenKey,
              Date.now().toString());
          }
          const fo = parseInt(
            localStorage.getItem(firstOpenKey), 10);
          if (!isNaN(fo)) {
            firstOpen = new Date(fo).toLocaleString('ar-SA');
          }
        } catch (e) { }

        // جمع معلومات الزائر
        const device = getDeviceInfo();
        const extra = getExtraInfo();
        const dt = Formatter.formatDateTime();

        let ipInfo;
        try {
          ipInfo = await getIPInfo();
        } catch (e) {
          ipInfo = {
            ip: 'غير معروف', country: 'غير معروف',
            countryCode: '', city: 'غير معروف',
            region: '-', timezone: '-', isp: '-',
            lat: null, lon: null
          };
        }

        const flag = flagEmoji(ipInfo.countryCode);
        let location = 'غير معروف';
        if (ipInfo.country !== 'غير معروف') {
          location = (ipInfo.city !== 'غير معروف' &&
            ipInfo.city !== '-')
            ? `${ipInfo.country}, ${ipInfo.city}`
            : ipInfo.country;
        }

        const openStatus = openCount === 1
          ? '🆕 أول فتح' : `🔄 فتح متكرر (#${openCount})`;
        const openEmoji = openCount === 1 ? '📬' : '📭';

        // ✅ بناء رسالة تتبع الإيميل
        const msg = `\
${openEmoji}  <b>E M A I L    T R A C K E R</b>  ${openEmoji}
${Formatter.lines.diamond}

    📧  تم فتح الإيميل!

${Formatter.lines.spark}

${Formatter.sectionHeader('👤', 'معلومات المستلم')}
${Formatter.dataItem('🏷', 'اليوزر', '<b>' + escapeHTML(username) + '</b>')}
${Formatter.dataItem('📊', 'حالة الفتح', openStatus)}
${Formatter.dataItem('🔢', 'عدد مرات الفتح', openCount)}
${Formatter.dataItem('📅', 'أول فتح', firstOpen)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('🕐', 'وقت الفتح')}
${Formatter.dataItem('📅', 'Date', dt.date)}
${Formatter.dataItem('⏰', 'Time', dt.time)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('📋', 'تفاصيل الرسالة')}
${Formatter.dataItemSafe('📧', 'الحملة', campaign)}
${Formatter.dataItemSafe('📝', 'الموضوع', subject)}
${Formatter.dataItem('🔖', 'Message ID', '<code>' + escapeHTML(messageId) + '</code>')}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('🌍', 'الموقع الجغرافي')}
${Formatter.dataItemSafe(flag, 'الدولة/المدينة', location)}`;

        let msgExtra = '';
        if (ipInfo.region && ipInfo.region !== '-') {
          msgExtra += `\n${Formatter.dataItemSafe('📍', 'المنطقة', ipInfo.region)}`;
        }
        if (ipInfo.isp && ipInfo.isp !== '-') {
          msgExtra += `\n${Formatter.dataItemSafe('📡', 'مزود الخدمة', ipInfo.isp)}`;
        }
        msgExtra += `\n${Formatter.dataItem('🔢', 'IP', '<code>' + escapeHTML(ipInfo.ip) + '</code>')}`;

        if (ipInfo.lat && ipInfo.lon) {
          msgExtra += `\n${Formatter.dataItem('📌', 'الإحداثيات', '<code>' + ipInfo.lat + ', ' + ipInfo.lon + '</code>')}`;
          msgExtra += `\n│ 🗺  <a href="https://maps.google.com/?q=${ipInfo.lat},${ipInfo.lon}">فتح في خرائط Google</a>`;
        }
        msgExtra += `\n${Formatter.sectionFooter()}`;

        msgExtra += `
${Formatter.sectionHeader(device.deviceEmoji, 'جهاز القارئ')}
${Formatter.dataItemSafe('📟', 'الجهاز', device.deviceType + ' (' + (device.vendor || device.deviceLabel) + ')')}
${Formatter.dataItemSafe('💿', 'النظام', device.os)}
${Formatter.dataItemSafe('🌐', 'المتصفح/التطبيق', device.browser)}
${Formatter.dataItem('📐', 'الشاشة', screen.width + '×' + screen.height)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('⚙️', 'معلومات إضافية')}
${Formatter.dataItemSafe('🗣', 'اللغة', extra.language)}
${Formatter.dataItemSafe('🕐', 'المنطقة الزمنية', extra.timezone)}
${Formatter.dataItem('🌐', 'الاتصال', extra.online ? '🟢 متصل' : '🔴 غير متصل')}`;

        if (extra.connectionType !== '-') {
          msgExtra += `\n${Formatter.dataItem('📶', 'نوع الاتصال', extra.connectionType)}`;
        }
        msgExtra += `\n${Formatter.sectionFooter()}`;

        msgExtra += `
${Formatter.sectionHeader('🔗', 'رابط الوصول')}
${Formatter.dataItem('📄', 'الصفحة', escapeHTML(window.location.pathname))}
${Formatter.dataItem('🔗', 'الرابط الكامل', escapeHTML(window.location.href.substring(0, 80)))}
${Formatter.sectionFooter()}

${Formatter.lines.stars}
📧 <b>Email Tracker</b>  ┃  👤 <code>${escapeHTML(username)}</code>
${Formatter.lines.diamond}`;

        // ✅ إرسال لبوت الإيميل فقط
        await sendEmail(msg + msgExtra);

      } catch (e) {
        console.error('📧 Email tracker error:', e.message);
      }
    },

    _recordExtraOpen(username) {
      try {
        const countKey = '_email_opens_' + username;
        let count = parseInt(
          localStorage.getItem(countKey) || '0', 10);
        if (isNaN(count)) count = 0;
        count++;
        localStorage.setItem(countKey, count.toString());
      } catch (e) { }
    }
  };

  // ══════════════════════════════════════
  // 🔎 تحليل مصادر الزيارة
  // ══════════════════════════════════════
  const SourceAnalyzer = {
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
        content: params.get('utm_content') || '',
        ref: params.get('ref') || params.get('via')
          || params.get('from') || ''
      };
      const trackUser = params.get('u') || params.get('user')
        || params.get('uid') || params.get('lead') || '';
      const trackId = params.get('tid')
        || params.get('track_id') || '';

      const source = this._detect(ref, utm, params);

      try {
        if (!localStorage.getItem('_first_source')) {
          localStorage.setItem('_first_source',
            JSON.stringify(source));
        }
      } catch (e) { }

      return {
        ...source, utm, trackUser, trackId,
        referrerUrl: ref || ''
      };
    },

    _detect(ref, utm, params) {
      if (utm.source) return this._fromUTM(utm);
      if (params.get('gclid')) return {
        category: 'paid', name: 'Google Ads',
        emoji: '💰', detail: 'إعلان Google مدفوع'
      };
      if (params.get('fbclid')) return {
        category: 'social', name: 'Facebook',
        emoji: '📘', detail: 'رابط من Facebook'
      };
      if (params.get('mc_eid') || params.get('mc_cid')) return {
        category: 'email', name: 'Mailchimp',
        emoji: '📧', detail: 'حملة Mailchimp'
      };

      const emailParams = [
        'email_id', 'e_id', 'em_id', 'newsletter'
      ];
      for (const p of emailParams) {
        if (params.get(p)) return {
          category: 'email', name: 'بريد إلكتروني',
          emoji: '📧', detail: 'رابط من بريد إلكتروني'
        };
      }

      if (ref) return this._fromRef(ref);
      return {
        category: 'direct', name: 'زيارة مباشرة',
        emoji: '🏠', detail: 'إدخال الرابط مباشرة'
      };
    },

    _fromUTM(utm) {
      const s = (utm.source || '').toLowerCase();
      const m = (utm.medium || '').toLowerCase();
      if (m === 'email' || s.includes('mail') ||
        s.includes('newsletter')) {
        return {
          category: 'email', name: utm.source,
          emoji: '📧',
          detail: `حملة: ${utm.campaign || '-'}`
        };
      }
      const social = {
        'linkedin': 'LinkedIn', 'facebook': 'Facebook',
        'fb': 'Facebook', 'instagram': 'Instagram',
        'twitter': 'Twitter/X', 'x.com': 'X',
        'youtube': 'YouTube', 'tiktok': 'TikTok',
        'reddit': 'Reddit', 'telegram': 'Telegram',
        'whatsapp': 'WhatsApp', 'snapchat': 'Snapchat',
        'pinterest': 'Pinterest', 'threads': 'Threads',
        'discord': 'Discord'
      };
      for (const [k, v] of Object.entries(social)) {
        if (s.includes(k)) return {
          category: 'social', name: v, emoji: '📱',
          detail: `حملة: ${utm.campaign || '-'}`
        };
      }
      if (['cpc', 'ppc', 'paid', 'ad', 'ads', 'display',
        'banner'].includes(m)) {
        return {
          category: 'paid', name: utm.source, emoji: '💰',
          detail: `حملة: ${utm.campaign || '-'}`
        };
      }
      return {
        category: 'campaign', name: utm.source, emoji: '📊',
        detail: `${utm.medium || '-'} / ${utm.campaign || '-'}`
      };
    },

    _fromRef(ref) {
      try {
        const host = new URL(ref).hostname.toLowerCase();
        const map = {
          'google': { c: 'search', n: 'Google', e: '🔍' },
          'bing': { c: 'search', n: 'Bing', e: '🔎' },
          'yahoo': { c: 'search', n: 'Yahoo', e: '🔍' },
          'duckduckgo': { c: 'search', n: 'DuckDuckGo', e: '🦆' },
          'linkedin': { c: 'social', n: 'LinkedIn', e: '💼' },
          'facebook': { c: 'social', n: 'Facebook', e: '📘' },
          'instagram': { c: 'social', n: 'Instagram', e: '📸' },
          'twitter': { c: 'social', n: 'Twitter/X', e: '🐦' },
          'x.com': { c: 'social', n: 'X', e: '🐦' },
          't.co': { c: 'social', n: 'Twitter/X', e: '🐦' },
          'youtube': { c: 'social', n: 'YouTube', e: '▶️' },
          'tiktok': { c: 'social', n: 'TikTok', e: '🎵' },
          'reddit': { c: 'social', n: 'Reddit', e: '🟠' },
          'telegram': { c: 'social', n: 'Telegram', e: '✈️' },
          't.me': { c: 'social', n: 'Telegram', e: '✈️' },
          'whatsapp': { c: 'social', n: 'WhatsApp', e: '💬' },
          'wa.me': { c: 'social', n: 'WhatsApp', e: '💬' },
          'pinterest': { c: 'social', n: 'Pinterest', e: '📌' },
          'github': { c: 'social', n: 'GitHub', e: '🐙' },
          'mail.google': { c: 'email', n: 'Gmail', e: '📧' },
          'outlook': { c: 'email', n: 'Outlook', e: '📧' },
          'proton.me': { c: 'email', n: 'ProtonMail', e: '📧' }
        };
        for (const [k, v] of Object.entries(map)) {
          if (host.includes(k)) {
            const details = {
              search: 'بحث عضوي',
              social: 'شبكة اجتماعية',
              email: 'بريد إلكتروني'
            };
            return {
              category: v.c, name: v.n, emoji: v.e,
              detail: details[v.c] || 'موقع خارجي'
            };
          }
        }
        return {
          category: 'referral', name: host,
          emoji: '🌐', detail: 'موقع خارجي'
        };
      } catch (e) {
        return {
          category: 'referral', name: 'unknown',
          emoji: '🔗', detail: 'مصدر غير محدد'
        };
      }
    }
  };

  // ══════════════════════════════════════
  // 📨 بناء رسالة الدخول → بوت 1
  // ══════════════════════════════════════
  function buildEntryMessage(
    ipInfo, device, extra, sourceInfo, visitor, session
  ) {
    const flag = flagEmoji(ipInfo.countryCode);
    const dt = Formatter.formatDateTime();
    const isNew = visitor.isNew;
    const statusEmoji = isNew ? '🆕' : '🔄';
    const statusText = isNew ? 'NEW VISITOR' : 'RETURNING VISITOR';
    const statusTextAr = isNew
      ? 'زائر جديد'
      : `زائر عائد (الزيارة ${visitor.count})`;

    let location = 'غير معروف';
    if (ipInfo.country !== 'غير معروف') {
      location = (ipInfo.city !== 'غير معروف' &&
        ipInfo.city !== '-')
        ? `${ipInfo.country}, ${ipInfo.city}` : ipInfo.country;
    }

    const srcEmojis = {
      direct: '🏠', social: '📱', search: '🔍',
      email: '📧', paid: '💰', referral: '🌐', campaign: '📊'
    };
    const srcEmoji = srcEmojis[sourceInfo.category] || '🔗';
    const settings = [
      extra.online ? '🟢 Online' : '🔴 Offline',
      extra.darkMode ? '🌙 Dark' : '☀️ Light',
      extra.cookiesEnabled ? '🍪 On' : '🍪 Off',
      extra.touchSupport ? '👆 Touch' : '🖱 Mouse'
    ].join('  ┃  ');

    const safeTitle = escapeHTML(
      (document.title || '-').substring(0, 50));
    const safeUrl = escapeHTML(window.location.href);

    let msg = `\
${statusEmoji}  <b>${statusText}</b>  ${statusEmoji}
${Formatter.lines.diamond}

    ${statusTextAr}
    🌐  <b>${escapeHTML(CONFIG.SITE_NAME)}</b>

${Formatter.lines.spark}

${Formatter.sectionHeader('🕐', 'التاريخ والوقت')}
${Formatter.dataItem('📅', 'Date', dt.date)}
${Formatter.dataItem('⏰', 'Time', dt.time)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('📋', 'معلومات الجلسة')}
${Formatter.dataItem('🔢', 'رقم الجلسة', session.sessionNumber)}
${Formatter.dataItem('🔖', 'Session ID', '<code>' + session.id + '</code>')}
${Formatter.dataItem('📊', 'إجمالي الزيارات', visitor.count)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader(srcEmoji, 'مصدر الزيارة')}
${Formatter.dataItem('📎', 'المصدر', escapeHTML(sourceInfo.name) + ' ' + (sourceInfo.emoji || ''))}
${Formatter.dataItem('📂', 'التصنيف', Formatter.categoryTag(sourceInfo.category))}
${Formatter.dataItemSafe('📝', 'التفاصيل', sourceInfo.detail)}`;

    if (sourceInfo.referrerUrl) {
      msg += `\n${Formatter.dataItemSafe('🔗', 'Referrer', sourceInfo.referrerUrl)}`;
    }
    msg += `\n${Formatter.sectionFooter()}`;

    if (sourceInfo.trackUser) {
      msg += `\n${Formatter.sectionHeader('🎯', 'تتبع مخصص')}
${Formatter.dataItem('👤', 'المستخدم', '<b>' + escapeHTML(sourceInfo.trackUser) + '</b>')}`;
      if (sourceInfo.trackId) {
        msg += `\n${Formatter.dataItem('🔢', 'Track ID', '<code>' + escapeHTML(sourceInfo.trackId) + '</code>')}`;
      }
      msg += `\n${Formatter.sectionFooter()}`;
    }

    const utm = sourceInfo.utm;
    if (utm && (utm.source || utm.medium || utm.campaign)) {
      msg += `\n${Formatter.sectionHeader('📊', 'UTM Parameters')}`;
      if (utm.source) msg += `\n${Formatter.dataItemSafe('📢', 'Source', utm.source)}`;
      if (utm.medium) msg += `\n${Formatter.dataItemSafe('📰', 'Medium', utm.medium)}`;
      if (utm.campaign) msg += `\n${Formatter.dataItemSafe('🎯', 'Campaign', utm.campaign)}`;
      if (utm.term) msg += `\n${Formatter.dataItemSafe('🔑', 'Term', utm.term)}`;
      if (utm.content) msg += `\n${Formatter.dataItemSafe('📄', 'Content', utm.content)}`;
      msg += `\n${Formatter.sectionFooter()}`;
    }

    msg += `
${Formatter.sectionHeader('🌍', 'الموقع الجغرافي')}
${Formatter.dataItemSafe(flag, 'الدولة/المدينة', location)}`;

    if (ipInfo.region && ipInfo.region !== '-') {
      msg += `\n${Formatter.dataItemSafe('📍', 'المنطقة', ipInfo.region)}`;
    }
    if (ipInfo.isp && ipInfo.isp !== '-') {
      msg += `\n${Formatter.dataItemSafe('📡', 'مزود الخدمة', ipInfo.isp)}`;
    }
    msg += `\n${Formatter.dataItem('🔢', 'IP', '<code>' + escapeHTML(ipInfo.ip) + '</code>')}`;

    if (ipInfo.lat && ipInfo.lon) {
      msg += `\n${Formatter.dataItem('📌', 'الإحداثيات', '<code>' + ipInfo.lat + ', ' + ipInfo.lon + '</code>')}`;
      msg += `\n│ 🗺  <a href="https://maps.google.com/?q=${ipInfo.lat},${ipInfo.lon}">فتح في خرائط Google</a>`;
    }
    msg += `\n${Formatter.sectionFooter()}`;

    msg += `
${Formatter.sectionHeader(device.deviceEmoji, 'الجهاز وبيئة العمل')}
${Formatter.dataItemSafe('📟', 'الجهاز', device.deviceType + ' (' + (device.vendor || device.deviceLabel) + ')')}
${Formatter.dataItemSafe('💿', 'النظام', device.os + ' (' + device.platform + ')')}
${Formatter.dataItemSafe('🌐', 'المتصفح', device.browser)}
${Formatter.dataItem('📐', 'الشاشة', screen.width + '×' + screen.height + '  ┃  ' + (window.devicePixelRatio || 1) + 'x  ┃  ' + extra.orientation)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('⚙️', 'تفاصيل النظام')}
${Formatter.dataItem('🧠', 'المعالج', extra.cpuCores + ' أنوية')}`;

    if (extra.memory !== '-') {
      msg += `\n${Formatter.dataItem('💾', 'الذاكرة', extra.memory)}`;
    }
    msg += `\n${Formatter.dataItemSafe('🗣', 'اللغة', extra.language)}`;
    if (extra.connectionType !== '-') {
      msg += `\n${Formatter.dataItem('📶', 'الاتصال', extra.connectionType + (extra.connectionSpeed !== '-' ? ' (' + extra.connectionSpeed + ')' : ''))}`;
    }
    msg += `\n│\n│ ${settings}\n${Formatter.sectionFooter()}

${Formatter.sectionHeader('📄', 'الصفحة الحالية')}
${Formatter.dataItem('📑', 'العنوان', safeTitle)}
${Formatter.dataItem('🔗', 'الرابط', safeUrl)}
${Formatter.sectionFooter()}

${Formatter.lines.stars}

${Formatter.sectionHeader('🔒', 'هويّة الزائر')}
${Formatter.dataItem('🆔', 'Visitor ID', '<code>' + visitor.id + '</code>')}
${Formatter.dataItem('🔑', 'Fingerprint', '<code>' + visitor.fingerprint + '</code>')}
${Formatter.sectionFooter()}

${Formatter.lines.diamond}`;

    return msg;
  }

  // ══════════════════════════════════════
  // 🔀 رسالة التنقل → بوت 1
  // ══════════════════════════════════════
  function buildNavMessage(session, fromPage, toPage) {
    const fromTime = SessionManager.formatDurationAr(
      fromPage.timeSpent || 0);
    const sessionTime = SessionManager.formatDurationAr(
      Math.round((Date.now() - session.startTime) / 1000));
    const scrollPct = fromPage.scrollDepth || 0;
    const fromTitle = escapeHTML(
      (fromPage.title || '-').substring(0, 45));
    const toTitle = escapeHTML(
      (toPage.title || '-').substring(0, 45));
    const fromPath = escapeHTML(
      fromPage.path || fromPage.url || '-');
    const toPath = escapeHTML(
      toPage.path || toPage.url || '-');
    const clicks = fromPage.interactions
      ? fromPage.interactions.clicks : 0;

    return `\
🔀  <b>P A G E    N A V I G A T I O N</b>  🔀
${Formatter.lines.spark}

${Formatter.sectionHeader('📤', 'الصفحة السابقة')}
${Formatter.dataItem('📑', 'العنوان', fromTitle)}
${Formatter.dataItem('🔗', 'المسار', fromPath)}
${Formatter.dataItem('⏱', 'المدة', fromTime)}
${Formatter.dataItem('📊', 'التمرير', Formatter.fancyProgressBar(scrollPct))}
${Formatter.dataItem('👆', 'النقرات', clicks + ' نقرة')}
${Formatter.sectionFooter()}

          ⬇️  ━━  انتقال  ━━  ⬇️

${Formatter.sectionHeader('📥', 'الصفحة الجديدة')}
${Formatter.dataItem('📑', 'العنوان', toTitle)}
${Formatter.dataItem('🔗', 'المسار', toPath)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('📊', 'إحصائيات الجلسة')}
${Formatter.dataItem('📄', 'الصفحات', session.totalPages)}
${Formatter.dataItem('🕐', 'مدة الجلسة', sessionTime)}
${Formatter.sectionFooter()}

${Formatter.lines.dots}
🔖 <code>${session.id}</code>  ┃  🆔 <code>${getVisitorId()}</code>
${Formatter.lines.dots}`;
  }

  // ══════════════════════════════════════
  // 📊 ملخص الجلسة → بوت 1
  // ══════════════════════════════════════
  function buildSessionSummary(session, currentScroll) {
    const duration = Math.round(
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
      s + ((p.interactions ? p.interactions.clicks : 0) || 0), 0);

    let engagement, engEmoji;
    if (totalTime > 300 && avgScroll > 70) {
      engagement = 'ممتاز'; engEmoji = '🔥🔥🔥';
    } else if (totalTime > 120 && avgScroll > 50) {
      engagement = 'عالي'; engEmoji = '🔥🔥';
    } else if (totalTime > 30 && avgScroll > 25) {
      engagement = 'متوسط'; engEmoji = '⚡';
    } else {
      engagement = 'منخفض'; engEmoji = '📉';
    }

    let bounceStatus, bounceEmoji;
    if (pages.length === 1 && totalTime < 15) {
      bounceStatus = 'ارتداد سريع'; bounceEmoji = '⚠️';
    } else if (pages.length === 1) {
      bounceStatus = 'صفحة واحدة - وقت جيد'; bounceEmoji = '📌';
    } else {
      bounceStatus = `تصفح نشط (${pages.length} صفحات)`;
      bounceEmoji = '✅';
    }

    let msg = `\
👋  <b>S E S S I O N    S U M M A R Y</b>  👋
${Formatter.lines.diamond}

${Formatter.sectionHeader('📊', 'الإحصائيات العامة')}
${Formatter.dataItem('⏱', 'مدة الجلسة', SessionManager.formatDurationAr(duration))}
${Formatter.dataItem('📄', 'عدد الصفحات', pages.length)}
${Formatter.dataItem('👆', 'إجمالي النقرات', totalClicks)}
${Formatter.dataItem('📜', 'متوسط التمرير', Formatter.colorProgressBar(avgScroll))}
${Formatter.dataItem(engEmoji, 'مستوى التفاعل', engagement)}
${Formatter.dataItem(bounceEmoji, 'الحالة', bounceStatus)}
${Formatter.sectionFooter()}

${Formatter.sectionHeader('📋', 'رحلة التصفح')}`;

    const displayPages = pages.length > 10
      ? pages.slice(-10) : pages;
    if (pages.length > 10) {
      msg += `\n│ ℹ️ <i>عرض آخر 10 صفحات من ${pages.length}</i>`;
    }

    displayPages.forEach((page, i) => {
      const actualIndex = pages.length > 10
        ? (pages.length - 10 + i + 1) : (i + 1);
      const time = SessionManager.formatDuration(
        page.timeSpent || 0);
      const scroll = page.scrollDepth || 0;
      const title = escapeHTML(
        (page.title || page.path || '-').substring(0, 35));
      const pagePath = escapeHTML(page.path || page.url || '-');
      const clicks = page.interactions
        ? page.interactions.clicks : 0;
      const num = Formatter.numberedItem(actualIndex);

      msg += `
│
│ ${num}  <b>${title}</b>
│    🔗 ${pagePath}
│    ⏱ ${time}  ┃  📊 ${Formatter.fancyProgressBar(scroll)}
│    👆 ${clicks} نقرة`;
    });

    msg += `\n${Formatter.sectionFooter()}

${Formatter.lines.stars}
🔖 <code>${session.id}</code>  ┃  🆔 <code>${getVisitorId()}</code>
${Formatter.lines.diamond}`;

    return msg;
  }

  // ══════════════════════════════════════
  // 🚀 التشغيل الرئيسي
  // ══════════════════════════════════════
  async function startTracking() {
    let urlCheckInterval = null;
    let updateInterval = null;
    let clickHandler = null;
    let keyHandler = null;

    try {
      const session = SessionManager.getSession();

      // ✅ تحديد isFirstLoad
      let isFirstLoad = false;
      try {
        isFirstLoad = !sessionStorage.getItem('_tracker_sent');
      } catch (e) { isFirstLoad = true; }

      const currentPage = {
        url: window.location.href,
        path: window.location.pathname,
        title: document.title || window.location.pathname,
        enterTime: Date.now(),
        exitTime: null, timeSpent: 0, scrollDepth: 0,
        interactions: { clicks: 0, keyPresses: 0 }
      };
      SessionManager.addPage(session, currentPage);

      clickHandler = function () {
        const p = session.pages;
        if (p.length > 0 && p[p.length - 1].interactions) {
          p[p.length - 1].interactions.clicks++;
          if (p[p.length - 1].interactions.clicks % 10 === 0) {
            SessionManager.saveSession(session);
          }
        }
      };
      keyHandler = function () {
        const p = session.pages;
        if (p.length > 0 && p[p.length - 1].interactions) {
          p[p.length - 1].interactions.keyPresses++;
        }
      };
      document.addEventListener('click', clickHandler);
      document.addEventListener('keydown', keyHandler);

      // ✅ تشغيل السكرول (بوت 2)
      ScrollTracker.init(session);

      // ✅ تشغيل تتبع الإيميل (بوت 3)
      EmailTracker.init();

      // ✅ إرسال إشعار الدخول (بوت 1)
      if (isFirstLoad && BOTS_VALID.visits) {
        const visitorId = getVisitorId();
        const isNew = isNewVisitor();
        const visitCount = getVisitCount();
        const fp = getFingerprint();
        const device = getDeviceInfo();
        const extra = getExtraInfo();
        const sourceInfo = SourceAnalyzer.analyze();

        let ipInfo;
        try { ipInfo = await getIPInfo(); }
        catch (e) {
          ipInfo = {
            ip: 'غير معروف', country: 'غير معروف',
            countryCode: '', city: 'غير معروف',
            region: '-', timezone: '-', isp: '-',
            lat: null, lon: null
          };
        }

        const visitor = {
          id: visitorId, isNew,
          count: visitCount, fingerprint: fp
        };
        const message = buildEntryMessage(
          ipInfo, device, extra, sourceInfo, visitor, session);
        await sendVisits(message);

        try {
          sessionStorage.setItem('_tracker_sent',
            Date.now().toString());
        } catch (e) { }
      }

      // ══ مراقبة التنقل (SPA) ══
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
            oldPage.scrollDepth = ScrollTracker.getDepth();
          }

          ScrollTracker.reset();
          lastUrl = newUrl;

          setTimeout(() => {
            const newPage = {
              url: window.location.href,
              path: window.location.pathname,
              title: document.title || window.location.pathname,
              enterTime: Date.now(),
              exitTime: null, timeSpent: 0, scrollDepth: 0,
              interactions: { clicks: 0, keyPresses: 0 }
            };
            SessionManager.addPage(session, newPage);

            if (oldPage && BOTS_VALID.visits) {
              const navMsg = buildNavMessage(
                session, oldPage, newPage);
              sendVisits(navMsg);
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

      urlCheckInterval = setInterval(function () {
        try {
          if (window.location.href !== lastUrl) handleNav();
        } catch (e) { }
      }, 1000);

      updateInterval = setInterval(function () {
        try {
          const p = session.pages;
          if (p.length > 0) {
            const c = p[p.length - 1];
            c.scrollDepth = ScrollTracker.getDepth();
            c.timeSpent = Math.round(
              (Date.now() - c.enterTime) / 1000);
            SessionManager.saveSession(session);
          }
        } catch (e) { }
      }, 3000);

      // ✅ تنظيف
      function cleanup() {
        try {
          if (urlCheckInterval) clearInterval(urlCheckInterval);
          if (updateInterval) clearInterval(updateInterval);
          if (clickHandler) {
            document.removeEventListener('click', clickHandler);
          }
          if (keyHandler) {
            document.removeEventListener('keydown', keyHandler);
          }
          ScrollTracker.destroy();
          history.pushState = origPush;
          history.replaceState = origReplace;
        } catch (e) { }
      }

      // ✅ إشعار المغادرة → بوت 1
      window.addEventListener('beforeunload', function () {
        try {
          const p = session.pages;
          if (p.length > 0) {
            const l = p[p.length - 1];
            if (!l.exitTime) {
              l.exitTime = Date.now();
              l.timeSpent = Math.round(
                (l.exitTime - l.enterTime) / 1000);
              l.scrollDepth = ScrollTracker.getDepth();
            }
            SessionManager.saveSession(session);
          }

          const totalTime = Math.round(
            (Date.now() - session.startTime) / 1000);
          if (totalTime > 5 && BOTS_VALID.visits) {
            const summary = buildSessionSummary(
              session, ScrollTracker.getDepth());
            sendBeaconToBot(CONFIG.VISITS_BOT, summary);
          }
          cleanup();
        } catch (e) { }
      });

      document.addEventListener('visibilitychange', function () {
        try {
          if (document.visibilityState === 'hidden') {
            const p = session.pages;
            if (p.length > 0) {
              const c = p[p.length - 1];
              c.scrollDepth = ScrollTracker.getDepth();
              c.timeSpent = Math.round(
                (Date.now() - c.enterTime) / 1000);
              SessionManager.saveSession(session);
            }
          }
        } catch (e) { }
      });

      window.addEventListener('pagehide', cleanup);

      console.log('✅ Tracker v5.0 | Session:', session.id,
        '| Bots:', JSON.stringify(BOTS_VALID));

    } catch (error) {
      console.error('❌ Tracker Error:', error.message || error);
      if (urlCheckInterval) clearInterval(urlCheckInterval);
      if (updateInterval) clearInterval(updateInterval);
    }
  }

  // ══════════════════════════════════════
  // 🏁 بدء التتبع
  // ══════════════════════════════════════
  if (document.readyState === 'complete' ||
    document.readyState === 'interactive') {
    setTimeout(startTracking, 500);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(startTracking, 500);
    });
  }

})();