// ══════════════════════════════════════════════════════════════
// 📊 Analytics Bridge v5.0
// 🔗 ملف الربط بين الموقع و Google Sheets
// ══════════════════════════════════════════════════════════════
// 📋 يجمع كل بيانات الزائر ويرسلها لـ Google Sheets
// 📧 يتتبع فتح الإيميلات
// 📜 يتتبع السكرول بدقة
// 📈 يقيس التفاعل الكامل
// ══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ═══════════════════════════════════════
  // ⚙️ الإعدادات - عدّل هنا فقط
  // ═══════════════════════════════════════

  const CONFIG = {

    // 🔗 رابط Google Sheets Web App
    // (تحصل عليه بعد Deploy من Apps Script)
    SHEETS_URL: 'https://script.google.com/macros/s/AKfycby1d_tE85H03EDhj6VX841tJyvC_3xKjbuiNEeyqBjxPPbUbKjIPBJb93fZaLw_bs1x/exec',

    // 🤖 بوت تيليجرام (اختياري - إذا تبي إشعارات فورية)
    TELEGRAM: {
      ENABLED: true,
      BOT_TOKEN: '7771956525:AAHD_99ztVRNOUFaPGFN1LGPxCaq0um5ktI',
      CHAT_ID: '7203463194'
    },

    // 🌐 اسم الموقع
    SITE_NAME: 'N8N Platform',

    // ⏱️ إعدادات التتبع
    TRACKING: {
      SCROLL_INTERVAL: 2000,          // تحديث السكرول كل 2 ثانية
      SESSION_TIMEOUT: 30 * 60 * 1000, // 30 دقيقة
      ENGAGEMENT_INTERVAL: 10000,     // إرسال التفاعل كل 10 ثوانٍ
      SCROLL_MILESTONES: [25, 50, 75, 90, 100], // معالم السكرول
      MIN_TIME_ON_PAGE: 3,            // أقل وقت للتسجيل (ثوانٍ)
      DEBOUNCE_SCROLL: 200            // تأخير حساب السكرول
    },

    // 🔕 صفحات مستثناة من التتبع
    EXCLUDED_PAGES: [
      '/admin',
      '/login',
      '/privacy'
    ],

    // 🌍 APIs لجلب الموقع الجغرافي
    GEO_APIS: [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://freeipapi.com/api/json'
    ]
  };


  // ═══════════════════════════════════════
  // 🏗️ متغيرات النظام الداخلية
  // ═══════════════════════════════════════

  const STATE = {
    sessionId: null,
    visitorId: null,
    startTime: Date.now(),
    lastActivity: Date.now(),
    scrollMax: 0,
    scrollPercent: 0,
    pageViews: 0,
    clicks: 0,
    mouseMovements: 0,
    keystrokes: 0,
    focusTime: 0,
    blurCount: 0,
    focusStart: Date.now(),
    isFocused: true,
    scrollEvents: 0,
    scrollMilestones: [],
    geoData: null,
    deviceData: null,
    isTracking: true,
    dataSentToSheets: false,
    engagementSent: false,
    scrollDirection: 'down',
    lastScrollTop: 0
  };


  // ═══════════════════════════════════════
  // 🔧 دوال المساعدة الأساسية
  // ═══════════════════════════════════════

  // ── توليد Session ID ──
  function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'S';
    const segments = [2, 7, 3, 8, 3];
    segments.forEach(function (len, idx) {
      for (let i = 0; i < len; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    });
    return id;
  }

  // ── توليد Visitor ID ──
  function getVisitorId() {
    try {
      let id = localStorage.getItem('_vid');
      if (!id) {
        id = 'V_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('_vid', id);
      }
      return id;
    } catch (e) {
      return 'V_' + Date.now();
    }
  }

  // ── إدارة الجلسة ──
  function getOrCreateSession() {
    try {
      const stored = sessionStorage.getItem('_session');
      if (stored) {
        const session = JSON.parse(stored);
        const elapsed = Date.now() - session.lastActivity;

        if (elapsed < CONFIG.TRACKING.SESSION_TIMEOUT) {
          session.lastActivity = Date.now();
          session.pageViews = (session.pageViews || 0) + 1;
          sessionStorage.setItem('_session', JSON.stringify(session));
          return session;
        }
      }
    } catch (e) { }

    // جلسة جديدة
    const session = {
      id: generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 1
    };

    try {
      sessionStorage.setItem('_session', JSON.stringify(session));
    } catch (e) { }

    return session;
  }

  // ── قراءة بارامترات URL ──
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      user: params.get('et')
        || params.get('email_track')
        || params.get('eid')
        || params.get('u')
        || null,
      campaign: params.get('campaign')
        || params.get('c')
        || params.get('utm_campaign')
        || '-',
      source: params.get('source')
        || params.get('utm_source')
        || '-',
      medium: params.get('medium')
        || params.get('utm_medium')
        || '-',
      subject: params.get('subject')
        || params.get('sub')
        || params.get('s')
        || '-',
      messageId: params.get('mid')
        || params.get('message_id')
        || params.get('id')
        || '-',
      template: params.get('template')
        || params.get('tpl')
        || '-',
      group: params.get('group')
        || params.get('g')
        || '-'
    };
  }

  // ── هل الصفحة مستثناة؟ ──
  function isExcludedPage() {
    const path = window.location.pathname;
    return CONFIG.EXCLUDED_PAGES.some(function (excluded) {
      return path.startsWith(excluded);
    });
  }

  // ── تنظيف HTML ──
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── علم الدولة ──
  function getCountryFlag(code) {
    if (!code || code.length !== 2) return '🏳️';
    try {
      return String.fromCodePoint(
        ...code.toUpperCase().split('').map(function (c) {
          return 127397 + c.charCodeAt(0);
        })
      );
    } catch (e) { return '🏳️'; }
  }


  // ═══════════════════════════════════════
  // 📱 تحليل الجهاز والمتصفح
  // ═══════════════════════════════════════

  function analyzeDevice() {
    const ua = navigator.userAgent || '';

    // نوع الجهاز
    let deviceType = '💻 Desktop';
    let deviceShort = 'Desktop';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
      deviceType = '📟 Tablet';
      deviceShort = 'Tablet';
    } else if (/Mobile|iPhone|iPod/i.test(ua)) {
      deviceType = '📱 Mobile';
      deviceShort = 'Mobile';
    }

    // نظام التشغيل
    let os = 'Unknown';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad/i.test(ua)) {
      const v = ua.match(/OS (\d+)/i);
      os = 'iOS' + (v ? ' ' + v[1] : '');
    }
    else if (/Android ([\d.]+)/i.test(ua)) {
      const v = ua.match(/Android ([\d.]+)/i);
      os = 'Android' + (v ? ' ' + v[1] : '');
    }
    else if (/Linux/i.test(ua)) os = 'Linux';

    // المتصفح
    let browser = 'Unknown';
    if (/Edg\/([\d.]+)/i.test(ua))
      browser = 'Edge ' + (ua.match(/Edg\/([\d.]+)/i) || ['', ''])[1];
    else if (/OPR\/([\d.]+)/i.test(ua))
      browser = 'Opera ' + (ua.match(/OPR\/([\d.]+)/i) || ['', ''])[1];
    else if (/Firefox\/([\d.]+)/i.test(ua))
      browser = 'Firefox ' + (ua.match(/Firefox\/([\d.]+)/i) || ['', ''])[1];
    else if (/Chrome\/([\d.]+)/i.test(ua))
      browser = 'Chrome ' + (ua.match(/Chrome\/([\d.]+)/i) || ['', ''])[1];
    else if (/Version\/([\d.]+).*Safari/i.test(ua))
      browser = 'Safari ' + (ua.match(/Version\/([\d.]+)/i) || ['', ''])[1];

    // عميل البريد
    let emailClient = '';
    if (/Thunderbird/i.test(ua)) emailClient = 'Thunderbird';
    else if (/Outlook/i.test(ua)) emailClient = 'Outlook';
    else if (/YMail/i.test(ua)) emailClient = 'Yahoo Mail';
    else if (/GoogleImageProxy/i.test(ua)) emailClient = 'Gmail Proxy';

    // الشركة المصنعة
    let vendor = '';
    if (/iPhone|iPad|Mac/i.test(ua)) vendor = 'Apple';
    else if (/Samsung/i.test(ua)) vendor = 'Samsung';
    else if (/Huawei/i.test(ua)) vendor = 'Huawei';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) vendor = 'Xiaomi';
    else if (/OPPO/i.test(ua)) vendor = 'OPPO';
    else if (/Vivo/i.test(ua)) vendor = 'Vivo';

    // الوضع الداكن
    let darkMode = false;
    try {
      darkMode = window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) { }

    // نوع الاتصال
    let connection = '-';
    const conn = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
      connection = conn.effectiveType;
    }

    return {
      type: deviceType,
      typeShort: deviceShort,
      os: os,
      browser: browser,
      emailClient: emailClient,
      vendor: vendor,
      screenRes: screen.width + '×' + screen.height,
      pixelRatio: window.devicePixelRatio || 1,
      language: navigator.language || '-',
      darkMode: darkMode,
      connection: connection,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      touchSupport: 'ontouchstart' in window
    };
  }


  // ═══════════════════════════════════════
  // 🌍 جلب الموقع الجغرافي
  // ═══════════════════════════════════════

  async function fetchGeoData() {
    // تحقق من الكاش أولاً
    try {
      const cached = sessionStorage.getItem('_geo');
      if (cached) {
        const geo = JSON.parse(cached);
        if (Date.now() - geo._timestamp < 10 * 60 * 1000) {
          return geo;
        }
      }
    } catch (e) { }

    for (const api of CONFIG.GEO_APIS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(function () {
          controller.abort();
        }, 5000);

        const response = await fetch(api, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) continue;
        const data = await response.json();

        let result = null;

        if (data.country_name) {
          result = {
            ip: data.ip || '-',
            country: data.country_name,
            countryCode: data.country_code || '',
            city: data.city || '-',
            region: data.region || '-',
            timezone: data.timezone || '-',
            isp: data.org || '-',
            lat: data.latitude,
            lon: data.longitude
          };
        } else if (data.country) {
          result = {
            ip: data.ip || '-',
            country: data.country,
            countryCode: data.country_code || '',
            city: data.city || '-',
            region: data.region || '-',
            timezone: (data.timezone && data.timezone.id) || '-',
            isp: (data.connection && data.connection.isp) || '-',
            lat: data.latitude,
            lon: data.longitude
          };
        } else if (data.countryName) {
          result = {
            ip: data.ipAddress || '-',
            country: data.countryName,
            countryCode: data.countryCode || '',
            city: data.cityName || '-',
            region: data.regionName || '-',
            timezone: data.timeZone || '-',
            isp: '-',
            lat: data.latitude,
            lon: data.longitude
          };
        }

        if (result) {
          result._timestamp = Date.now();
          try {
            sessionStorage.setItem('_geo', JSON.stringify(result));
          } catch (e) { }
          return result;
        }
      } catch (e) { continue; }
    }

    return {
      ip: '-', country: 'غير معروف', countryCode: '',
      city: '-', region: '-', timezone: '-',
      isp: '-', lat: null, lon: null
    };
  }


  // ═══════════════════════════════════════
  // 📜 نظام تتبع السكرول المتقدم
  // ═══════════════════════════════════════

  function setupScrollTracking() {
    let scrollTimer = null;

    function calculateScroll() {
      const scrollTop = window.pageYOffset
        || document.documentElement.scrollTop
        || document.body.scrollTop || 0;

      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );

      const winHeight = window.innerHeight
        || document.documentElement.clientHeight;

      const scrollable = docHeight - winHeight;
      if (scrollable <= 0) return;

      const percent = Math.min(
        Math.round((scrollTop / scrollable) * 100),
        100
      );

      // اتجاه السكرول
      if (scrollTop > STATE.lastScrollTop) {
        STATE.scrollDirection = 'down';
      } else if (scrollTop < STATE.lastScrollTop) {
        STATE.scrollDirection = 'up';
      }
      STATE.lastScrollTop = scrollTop;

      // تحديث الحالة
      STATE.scrollPercent = percent;
      STATE.scrollEvents++;

      if (percent > STATE.scrollMax) {
        STATE.scrollMax = percent;
      }

      // فحص المعالم
      CONFIG.TRACKING.SCROLL_MILESTONES.forEach(function (milestone) {
        if (percent >= milestone
          && STATE.scrollMilestones.indexOf(milestone) === -1) {

          STATE.scrollMilestones.push(milestone);

          // إرسال حدث المعلم
          sendScrollMilestone(milestone);
        }
      });
    }

    // Debounced scroll listener
    window.addEventListener('scroll', function () {
      STATE.scrollEvents++;

      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(
        calculateScroll,
        CONFIG.TRACKING.DEBOUNCE_SCROLL
      );
    }, { passive: true });

    // حساب أولي
    setTimeout(calculateScroll, 1000);
  }

  function sendScrollMilestone(milestone) {
    const timeOnPage = Math.round((Date.now() - STATE.startTime) / 1000);

    console.log('📜 Scroll milestone reached: ' + milestone + '%');

    // إرسال للشيت
    sendToSheets({
      type: 'scroll',
      userId: STATE.visitorId,
      sessionId: STATE.sessionId,
      page: window.location.pathname,
      url: window.location.href,
      scrollPercent: milestone,
      maxScroll: STATE.scrollMax,
      scrollDepthPx: Math.round(
        (document.documentElement.scrollHeight * milestone) / 100
      ),
      pageHeight: document.documentElement.scrollHeight,
      timeToScroll: timeOnPage,
      scrollSpeed: Math.round(
        (document.documentElement.scrollHeight * milestone / 100) / Math.max(timeOnPage, 1)
      ),
      scrollDirection: STATE.scrollDirection,
      scrollEvents: STATE.scrollEvents,
      timeOnPage: timeOnPage,
      milestones: STATE.scrollMilestones.join(', '),
      device: STATE.deviceData.typeShort,
      os: STATE.deviceData.os,
      browser: STATE.deviceData.browser,
      screenRes: STATE.deviceData.screenRes,
      country: STATE.geoData ? STATE.geoData.country : '-',
      ip: STATE.geoData ? STATE.geoData.ip : '-'
    });
  }


  // ═══════════════════════════════════════
  // 👆 تتبع التفاعل (النقرات، الماوس، المفاتيح)
  // ═══════════════════════════════════════

  function setupInteractionTracking() {

    // تتبع النقرات
    document.addEventListener('click', function (e) {
      STATE.clicks++;
      STATE.lastActivity = Date.now();
    });

    // تتبع حركة الماوس (كل 100 بكسل)
    let lastMouseX = 0;
    let lastMouseY = 0;

    document.addEventListener('mousemove', function (e) {
      const dist = Math.sqrt(
        Math.pow(e.clientX - lastMouseX, 2)
        + Math.pow(e.clientY - lastMouseY, 2)
      );

      if (dist > 100) {
        STATE.mouseMovements++;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    }, { passive: true });

    // تتبع ضغطات المفاتيح
    document.addEventListener('keydown', function () {
      STATE.keystrokes++;
      STATE.lastActivity = Date.now();
    });

    // تتبع التركيز
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        // فقد التركيز
        STATE.blurCount++;
        if (STATE.isFocused) {
          STATE.focusTime += Math.round(
            (Date.now() - STATE.focusStart) / 1000
          );
          STATE.isFocused = false;
        }
      } else {
        // عاد التركيز
        STATE.focusStart = Date.now();
        STATE.isFocused = true;
      }
    });

    // عند مغادرة الصفحة
    window.addEventListener('beforeunload', function () {
      if (STATE.isFocused) {
        STATE.focusTime += Math.round(
          (Date.now() - STATE.focusStart) / 1000
        );
      }
      sendFinalData();
    });
  }


  // ═══════════════════════════════════════
  // 📤 إرسال البيانات إلى Google Sheets
  // ═══════════════════════════════════════

  async function sendToSheets(data) {
    try {
      const response = await fetch(CONFIG.SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        mode: 'no-cors'    // مطلوب لـ Google Apps Script
      });

      console.log('📊 Data sent to Sheets:', data.type);
      return true;
    } catch (error) {
      console.error('📊 Sheets error:', error.message);

      // إعادة المحاولة مرة واحدة
      try {
        await new Promise(function (r) { setTimeout(r, 2000); });
        await fetch(CONFIG.SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          mode: 'no-cors'
        });
        console.log('📊 Retry succeeded');
        return true;
      } catch (retryErr) {
        console.error('📊 Retry failed:', retryErr.message);
        return false;
      }
    }
  }


  // ═══════════════════════════════════════
  // 📨 إرسال إشعار تيليجرام (اختياري)
  // ═══════════════════════════════════════

  async function sendTelegramNotification(message) {
    if (!CONFIG.TELEGRAM.ENABLED) return;

    try {
      await fetch(
        'https://api.telegram.org/bot'
        + CONFIG.TELEGRAM.BOT_TOKEN
        + '/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CONFIG.TELEGRAM.CHAT_ID,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        }
      );
    } catch (e) {
      console.error('📨 Telegram error:', e.message);
    }
  }


  // ═══════════════════════════════════════
  // 🚀 إرسال بيانات الزيارة الأولى
  // ═══════════════════════════════════════

  async function sendVisitData() {
    const urlParams = getUrlParams();
    const timeOnPage = Math.round((Date.now() - STATE.startTime) / 1000);

    const visitData = {
      type: 'visit',
      userId: urlParams.user || STATE.visitorId,
      sessionId: STATE.sessionId,
      page: window.location.pathname,
      url: window.location.href,
      referrer: document.referrer || '-',
      title: document.title || '-',

      // بيانات جغرافية
      ip: STATE.geoData.ip,
      country: STATE.geoData.country,
      countryCode: STATE.geoData.countryCode,
      city: STATE.geoData.city,
      region: STATE.geoData.region,
      timezone: STATE.geoData.timezone,
      isp: STATE.geoData.isp,
      lat: STATE.geoData.lat,
      lon: STATE.geoData.lon,

      // بيانات الجهاز
      device: STATE.deviceData.typeShort,
      os: STATE.deviceData.os,
      browser: STATE.deviceData.browser,
      vendor: STATE.deviceData.vendor,
      screenRes: STATE.deviceData.screenRes,
      language: STATE.deviceData.language,
      darkMode: STATE.deviceData.darkMode,
      connection: STATE.deviceData.connection,
      online: STATE.deviceData.online,

      // بيانات الحملة
      campaign: urlParams.campaign,
      source: urlParams.source,
      medium: urlParams.medium,

      // بيانات التفاعل الأولية
      scrollPercent: STATE.scrollMax,
      timeOnPage: timeOnPage
    };

    await sendToSheets(visitData);
    STATE.dataSentToSheets = true;

    console.log('📊 ✅ Visit tracked:', STATE.sessionId);
  }


  // ═══════════════════════════════════════
  // 📧 إرسال بيانات فتح الإيميل
  // ═══════════════════════════════════════

  async function sendEmailOpenData() {
    const urlParams = getUrlParams();

    if (!urlParams.user) return; // لا يوزر = لا تتبع إيميل

    // فحص التكرار
    try {
      const key = '_eo_' + urlParams.user + '_' + urlParams.messageId;
      const last = localStorage.getItem(key);
      if (last) {
        const elapsed = Date.now() - parseInt(last, 10);
        if (elapsed < 3 * 60 * 1000) {
          console.log('📧 Recently tracked, skipping');
          return;
        }
      }
      localStorage.setItem(key, Date.now().toString());
    } catch (e) { }

    const emailData = {
      type: 'email_open',
      user: urlParams.user,
      campaign: urlParams.campaign,
      subject: urlParams.subject,
      messageId: urlParams.messageId,
      template: urlParams.template,
      group: urlParams.group,

      // بيانات جغرافية
      ip: STATE.geoData.ip,
      country: STATE.geoData.country,
      city: STATE.geoData.city,
      region: STATE.geoData.region,
      timezone: STATE.geoData.timezone,
      isp: STATE.geoData.isp,
      lat: STATE.geoData.lat,
      lon: STATE.geoData.lon,

      // بيانات الجهاز
      device: STATE.deviceData.typeShort,
      os: STATE.deviceData.os,
      browser: STATE.deviceData.browser,
      emailClient: STATE.deviceData.emailClient,
      vendor: STATE.deviceData.vendor,
      screenRes: STATE.deviceData.screenRes,
      language: STATE.deviceData.language,
      darkMode: STATE.deviceData.darkMode
    };

    // إرسال للشيت
    await sendToSheets(emailData);

    // إرسال إشعار تيليجرام
    await sendEmailTelegramNotification(emailData);

    console.log('📧 ✅ Email open tracked:', urlParams.user);
  }


  // ═══════════════════════════════════════
  // 📨 بناء إشعار تيليجرام لفتح الإيميل
  // ═══════════════════════════════════════

  async function sendEmailTelegramNotification(data) {
    if (!CONFIG.TELEGRAM.ENABLED) return;

    const f = getCountryFlag(STATE.geoData.countryCode);
    let location = 'غير معروف';
    if (STATE.geoData.country !== 'غير معروف') {
      location = STATE.geoData.city !== '-'
        ? STATE.geoData.country + '، ' + STATE.geoData.city
        : STATE.geoData.country;
    }

    const now = new Date();
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let h = now.getHours();
    const ampm = h >= 12 ? 'مساءً' : 'صباحاً';
    h = h % 12 || 12;

    const msg =
      '🔔  <b>📧 EMAIL OPENED!</b>\n'
      + '◆━━━━━━━━━━━━━━━━━━━━◆\n\n'
      + '👤 المستلم: <b>' + escapeHtml(data.user) + '</b>\n'
      + '📧 الحملة: <b>' + escapeHtml(data.campaign) + '</b>\n'
      + '📝 الموضوع: ' + escapeHtml(data.subject) + '\n'
      + '🔖 Message ID: <code>' + escapeHtml(data.messageId) + '</code>\n\n'
      + '🕐 الوقت: ' + days[now.getDay()] + '، '
      + String(h).padStart(2, '0') + ':'
      + String(now.getMinutes()).padStart(2, '0') + ' '
      + ampm + '\n\n'
      + f + ' الموقع: <b>' + escapeHtml(location) + '</b>\n'
      + '🔢 IP: <code>' + escapeHtml(data.ip) + '</code>\n'
      + (STATE.geoData.lat ? '🗺 <a href="https://maps.google.com/?q='
        + STATE.geoData.lat + ',' + STATE.geoData.lon
        + '">فتح في الخريطة</a>\n' : '')
      + '\n'
      + STATE.deviceData.type + ' ' + data.os + '\n'
      + '🌐 ' + data.browser + '\n'
      + (data.emailClient ? '📨 ' + data.emailClient + '\n' : '')
      + '\n◆━━━━━━━━━━━━━━━━━━━━◆\n'
      + '📊 Tracked by Analytics v5.0';

    await sendTelegramNotification(msg);
  }


  // ═══════════════════════════════════════
  // 📈 إرسال بيانات التفاعل الدورية
  // ═══════════════════════════════════════

  function setupPeriodicEngagement() {
    setInterval(function () {
      const timeOnPage = Math.round(
        (Date.now() - STATE.startTime) / 1000
      );

      // لا ترسل إذا أقل من الحد الأدنى
      if (timeOnPage < CONFIG.TRACKING.MIN_TIME_ON_PAGE) return;

      // حدّث الجلسة
      sendToSheets({
        type: 'session_update',
        sessionId: STATE.sessionId,
        userId: STATE.visitorId,
        page: window.location.pathname,
        scrollPercent: STATE.scrollMax,
        timeOnPage: timeOnPage,
        campaign: getUrlParams().campaign
      });

    }, CONFIG.TRACKING.ENGAGEMENT_INTERVAL);
  }


  // ═══════════════════════════════════════
  // 🏁 إرسال البيانات النهائية عند المغادرة
  // ═══════════════════════════════════════

  function sendFinalData() {
    const timeOnPage = Math.round(
      (Date.now() - STATE.startTime) / 1000
    );

    if (timeOnPage < CONFIG.TRACKING.MIN_TIME_ON_PAGE) return;

    // حساب وقت التركيز النهائي
    if (STATE.isFocused) {
      STATE.focusTime += Math.round(
        (Date.now() - STATE.focusStart) / 1000
      );
    }

    const finalData = {
      type: 'engagement',
      userId: STATE.visitorId,
      sessionId: STATE.sessionId,
      page: window.location.pathname,
      eventType: 'page_leave',
      eventDetail: 'Final engagement data',
      scrollPercent: STATE.scrollMax,
      timeOnPage: timeOnPage,
      clicks: STATE.clicks,
      mouseMovements: STATE.mouseMovements,
      keystrokes: STATE.keystrokes,
      focusTime: STATE.focusTime,
      blurCount: STATE.blurCount,
      device: STATE.deviceData.typeShort,
      country: STATE.geoData ? STATE.geoData.country : '-'
    };

    // استخدام sendBeacon للضمان
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        CONFIG.SHEETS_URL,
        JSON.stringify(finalData)
      );
      console.log('📊 Final data sent via beacon');
    } else {
      sendToSheets(finalData);
    }
  }


  // ═══════════════════════════════════════
  // 🚀 التشغيل الرئيسي
  // ═══════════════════════════════════════

  async function initialize() {
    console.log('📊 Analytics v5.0 initializing...');

    // فحص الاستثناءات
    if (isExcludedPage()) {
      console.log('📊 Page excluded from tracking');
      return;
    }

    // إعداد المعرفات
    const session = getOrCreateSession();
    STATE.sessionId = session.id;
    STATE.visitorId = getVisitorId();
    STATE.pageViews = session.pageViews;

    // تحليل الجهاز (فوري)
    STATE.deviceData = analyzeDevice();

    // بدء تتبع السكرول والتفاعل فوراً
    setupScrollTracking();
    setupInteractionTracking();

    // جلب البيانات الجغرافية (async)
    try {
      STATE.geoData = await fetchGeoData();
    } catch (e) {
      STATE.geoData = {
        ip: '-', country: 'غير معروف', countryCode: '',
        city: '-', region: '-', timezone: '-',
        isp: '-', lat: null, lon: null
      };
    }

    // إرسال بيانات الزيارة
    await sendVisitData();

    // تتبع فتح الإيميل (إذا موجود)
    await sendEmailOpenData();

    // بدء الإرسال الدوري
    setupPeriodicEngagement();

    console.log('📊 ✅ Analytics ready!');
    console.log('📊 Session:', STATE.sessionId);
    console.log('📊 Visitor:', STATE.visitorId);
  }


  // ═══════════════════════════════════════
  // 🎯 API عام (اختياري)
  // ═══════════════════════════════════════

  window.SiteAnalytics = {

    // إرسال حدث مخصص
    trackEvent: function (eventName, eventData) {
      sendToSheets({
        type: 'engagement',
        userId: STATE.visitorId,
        sessionId: STATE.sessionId,
        page: window.location.pathname,
        eventType: eventName,
        eventDetail: JSON.stringify(eventData),
        scrollPercent: STATE.scrollMax,
        timeOnPage: Math.round((Date.now() - STATE.startTime) / 1000),
        clicks: STATE.clicks,
        device: STATE.deviceData ? STATE.deviceData.typeShort : '-',
        country: STATE.geoData ? STATE.geoData.country : '-'
      });
    },

    // الحصول على بيانات الجلسة الحالية
    getSession: function () {
      return {
        sessionId: STATE.sessionId,
        visitorId: STATE.visitorId,
        scrollMax: STATE.scrollMax,
        timeOnPage: Math.round((Date.now() - STATE.startTime) / 1000),
        clicks: STATE.clicks,
        pageViews: STATE.pageViews
      };
    },

    // تتبع نقرة على زر معين
    trackClick: function (buttonName) {
      this.trackEvent('button_click', { button: buttonName });
    },

    // تتبع مشاهدة عنصر
    trackView: function (elementName) {
      this.trackEvent('element_view', { element: elementName });
    }
  };


  // ═══════════════════════════════════════
  // 🏁 بدء التشغيل
  // ═══════════════════════════════════════

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
