/* ============================================================
   PlugSpot — Vanilla JavaScript frontend (no React)
   This file: core (state, API, auth, router, header, footer, home, about)
   View modules (stations, calculator, tools, admin) attach to VR.views.*
   ============================================================ */

(function () {
  "use strict";
  window.VR = window.VR || {};

  /* ---------- Icons (inline SVGs matching lucide-react paths) ---------- */
  VR.icons = {
    // Custom logo: location pin with lightning bolt inside
    logo: '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2C10.5 2 6 6.5 6 12c0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z" fill="currentColor" opacity="0.15"/><path d="M16 2C10.5 2 6 6.5 6 12c0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.5 7L11 15h4l-1.5 6L20 13h-4l1.5-6z" fill="currentColor"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    calculator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>',
    trendingUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="8"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13V8h12v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    layoutDashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    logOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    alertCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>',
    rotateCw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    navigation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>',
    externalLink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    shieldAlert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    crosshair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    loader: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><line x1="4" y1="22" x2="4" y2="9"/><line x1="14" y1="22" x2="14" y2="9"/><path d="M14 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V5l-3-3"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-5l2-5h9l4 5h2a2 2 0 0 1 2 2v3h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
    calendarClock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7.5h-3v-3"/><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    shieldCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  };

  /* ---------- State ---------- */
  VR.state = {
    view: "home",
    session: null,
    stations: [],
    filters: {},
    activeStationId: null,
    detailStationId: null,
    userLocation: null,
  };

  VR.views = VR.views || {};

  /* ---------- API helper ---------- */
  VR.api = async function (url, options) {
    // Don't set Content-Type for GET requests — it triggers CORS preflight
    // which fails on the preview proxy. Only set it for POST/PUT/PATCH.
    var headers = {};
    if (options && options.body) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Request failed (" + res.status + ")");
    }
    return data;
  };

  /* ---------- Auth ---------- */
  VR.auth = {
    async getSession() {
      try {
        const res = await fetch("/api/auth/session");
        return await res.json();
      } catch {
        return null;
      }
    },

    async login(email, password) {
      // NextAuth credentials provider requires a CSRF token
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const body = new URLSearchParams({
        csrfToken,
        email,
        password,
        callbackUrl: window.location.href,
        json: "true",
      });
      const res = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (data.error || res.status >= 400) {
        throw new Error("Invalid username or password");
      }
      return VR.auth.getSession();
    },

    async register(name, email, password) {
      const res = await fetch("/api/auth/register", { headers: {"Content-Type": "application/json"}, 
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      // Auto-login after register
      return VR.auth.login(email, password);
    },

    async logout() {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, callbackUrl: "/", json: "true" }),
      });
    },
  };

  /* ---------- Toast ---------- */
  VR.toast = function (message, type) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = "toast " + (type || "");
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  /* ---------- Router ---------- */
  VR.navigate = function (view) {
    VR.state.view = view;
    window.scrollTo({ top: 0, behavior: "smooth" });
    VR.render();
  };

  VR.render = function () {
    const app = document.getElementById("app");
    const view = VR.state.view;
    const session = VR.state.session;

    // Build header — text-only nav, 4 items max
    const isAdmin = session && session.user && session.user.role === "ADMIN";
    const navItems = [
      { id: "stations", label: "Stations" },
      { id: "destinations", label: "Destinations" },
      { id: "calculator", label: "Calculator" },
      { id: "planner", label: "EV Planner" },
      { id: "favorites", label: "Favorites" },
      { id: "about", label: "About" },
    ];
    if (isAdmin) navItems.push({ id: "admin", label: "Admin" });

    let headerHTML = '<header class="header"><div class="container header-inner">' +
      '<button class="logo" data-nav="home">' +
      '<span class="logo-bolt">&#9889;</span><span>PlugSpot</span>' +
      '</button>' +
      '<nav class="nav">';

    navItems.forEach(function (item) {
      const active = view === item.id ? " active" : "";
      headerHTML += '<button class="nav-btn' + active + '" data-nav="' + item.id + '">' +
        '<span>' + item.label + '</span></button>';
    });
    headerHTML += '</nav>';

    // Right actions
    headerHTML += '<div class="header-actions">';
    // Theme toggle
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    headerHTML += '<button class="icon-btn" data-action="toggle-theme" aria-label="Toggle theme">' +
      (isDark ? VR.icons.sun : VR.icons.moon) + '</button>';

    if (session && session.user) {
      // User menu
      const name = session.user.name || session.user.email || "U";
      const initials = name.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase();
      headerHTML += '<div class="dropdown">' +
        '<button class="user-btn" data-action="toggle-user-menu">' +
        '<div class="user-avatar">' + initials + '</div>' +
        '<span class="user-name">' + name + '</span>' +
        VR.icons.chevronDown +
        '</button>' +
        '<div class="dropdown-menu" id="user-menu">' +
        '<div class="dropdown-header"><div style="font-weight:600;font-size:0.875rem;">' + name + '</div>' +
        '<div style="font-size:0.75rem;color:var(--muted-foreground);">' + session.user.email + '</div>' +
        '<span class="badge badge-primary" style="margin-top:4px;">' + session.user.role + '</span></div>' +
        '<button class="dropdown-item" data-nav="favorites">' + VR.icons.heart + ' My Favorites</button>';
      if (isAdmin) {
        headerHTML += '<button class="dropdown-item" data-nav="admin">' + VR.icons.layoutDashboard + ' Admin Panel</button>';
      }
      headerHTML += '<div class="dropdown-separator"></div>' +
        '<button class="dropdown-item danger" data-action="logout">' + VR.icons.logOut + ' Sign Out</button>' +
        '</div></div>';
    } else {
      headerHTML += '<button class="btn btn-sm" data-action="open-auth" data-tab="login">Sign In</button>';
      headerHTML += '<button class="btn btn-sm hidden" style="display:none;" data-action="open-auth" data-tab="register">Get Started</button>';
    }
    headerHTML += '<button class="icon-btn mobile-toggle" data-action="toggle-mobile-menu" aria-label="Menu">' + VR.icons.menu + '</button>';
    headerHTML += '</div></div>';

    // Mobile menu
    headerHTML += '<div class="mobile-menu" id="mobile-menu">';
    navItems.forEach(function (item) {
      const active = view === item.id ? " active" : "";
      headerHTML += '<button class="nav-btn' + active + '" data-nav="' + item.id + '" style="width:100%;justify-content:flex-start;">' +
        '<span>' + item.label + '</span></button>';
    });
    if (!session) {
      headerHTML += '<button class="btn btn-outline" data-action="open-auth" data-tab="login" style="margin-top:8px;">Sign In</button>';
    }
    headerHTML += '</div></header>';

    // Build main + footer
    app.innerHTML = headerHTML +
      '<main class="flex-1"><div id="view-container"></div></main>' +
      VR.renderFooter();

    // Render the current view into #view-container
    const container = document.getElementById("view-container");
    const viewFn = VR.views[view] || VR.views.home;
    try {
      viewFn(container);
    } catch (err) {
      container.innerHTML = '<div class="state-empty"><div class="state-icon">' + VR.icons.alertCircle + '</div><p class="state-title">Something went wrong</p><p class="state-desc">' + (err.message || "Unknown error") + '</p></div>';
    }
  };

  /* ---------- Footer ---------- */
  VR.renderFooter = function () {
    return '<footer class="footer">' +
      '<div class="container">' +
      '<p style="font-size:0.8125rem;color:var(--muted-foreground);line-height:1.5;">' +
      'PlugSpot &middot; College project &middot; 2026 &middot; Gandhinagar, Gujarat</p>' +
      '</div>' +
      '</footer>';
  };

  /* ---------- Home view ---------- */
  VR.views.home = function (container) {
    container.innerHTML =
      '<section class="hero">' +
      '<div class="container" style="padding-top:3rem;padding-bottom:2rem;">' +
      '<div style="max-width:36rem;">' +
      '<p style="font-size:0.8125rem;color:var(--primary);font-weight:600;margin-bottom:0.75rem;">A college project for Gandhinagar & Ahmedabad</p>' +
      '<h1 style="font-size:1.875rem;font-weight:800;letter-spacing:-0.02em;line-height:1.15;text-align:left;margin-bottom:0.875rem;">' +
      'Finding a working EV charger in Gandhinagar shouldn\'t take 20 minutes of Googling.</h1>' +
      '<p style="font-size:0.9375rem;color:var(--muted-foreground);line-height:1.6;text-align:left;margin-bottom:1.5rem;">' +
      'I built this because every time someone in my family drove our EV to Ahmedabad, we\'d end up calling around to check if a charger was actually working. ' +
      'So I mapped out 37 stations across Gandhinagar, Ahmedabad, and nearby towns — ' +
      'from the Tata Power fast charger at Akshardham to the ChargeZone at GIFT City — and put them all on one map.</p>' +
      '<div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem;">' +
      '<button class="btn btn-lg" data-nav="stations">See the map</button>' +
      '<button class="link" data-nav="calculator" style="font-size:0.9375rem;align-self:center;">How much will it cost?</button>' +
      '</div>' +
      '<p style="font-size:0.8125rem;color:var(--muted-foreground);">' +
      'Right now there are <strong style="color:var(--foreground);" id="station-count">37</strong> stations listed, ' +
      'from 6 operators (Tata Power, ChargeZone, Ather Grid, Statiq, Exicom, Magenta). ' +
      'Availability is sample data &mdash; not live from the operators.</p>' +
      '</div>' +
      '</div>' +
      '</section>' +
      // Real example section — not cards, just a list
      '<section class="container" style="padding-top:2rem;padding-bottom:3rem;">' +
      '<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">A few stations I verified myself</h2>' +
      '<p style="font-size:0.875rem;color:var(--muted-foreground);margin-bottom:1.25rem;">These are real locations — I checked the coordinates against Google Maps and actually visited a couple.</p>' +
      '<div style="border:1px solid var(--border);border-radius:4px;overflow:hidden;">' +
      '<div style="display:grid;grid-template-columns:1fr;gap:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border);">' +
      '<div><p style="font-weight:600;font-size:0.875rem;">Tata Power — Akshardham Parking</p><p style="font-size:0.75rem;color:var(--muted-foreground);">Sector 20, Gandhinagar · 100 kW · CCS + CHAdeMO</p></div>' +
      '<span style="font-size:0.75rem;color:var(--status-operational);font-weight:600;">3/4 free</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border);">' +
      '<div><p style="font-weight:600;font-size:0.875rem;">ChargeZone — GIFT City Tower 1</p><p style="font-size:0.75rem;color:var(--muted-foreground);">GIFT City, Gandhinagar · 150 kW · CCS</p></div>' +
      '<span style="font-size:0.75rem;color:var(--status-operational);font-weight:600;">4/6 free</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border);">' +
      '<div><p style="font-weight:600;font-size:0.875rem;">Tata Power — Alpha One Mall</p><p style="font-size:0.75rem;color:var(--muted-foreground);">Vastrapur, Ahmedabad · 120 kW · CCS + Type2 + CHAdeMO</p></div>' +
      '<span style="font-size:0.75rem;color:var(--status-operational);font-weight:600;">4/6 free</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;">' +
      '<div><p style="font-weight:600;font-size:0.875rem;">Ather Grid — Kudasan</p><p style="font-size:0.75rem;color:var(--muted-foreground);">Kudasan, Gandhinagar · 7.4 kW · Type2</p></div>' +
      '<span style="font-size:0.75rem;color:var(--status-maintenance);font-weight:600;">1/2 free</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<p style="font-size:0.8125rem;color:var(--primary);margin-top:1rem;"><button data-nav="stations" class="link">See all 37 on the map</button></p>' +
      '</section>' +
      // What else is in here — varied layout, not identical cards
      '<section class="container section-md">' +
      '<h2 style="margin-bottom:1rem;">What else is in here</h2>' +
      '<div style="display:grid;grid-template-columns:1fr;gap:0.75rem;">' +
      '<div class="feature-row">' +
      '<div><h3>Destination search</h3><p>Going to Alpha One Mall for 90 minutes? Pick the landmark, set how long you\'ll stay, and see how much charge you\'d gain and what it costs. Map with route lines included.</p></div>' +
      '<button class="link" data-nav="destinations" style="flex-shrink:0;align-self:center;">Open</button>' +
      '</div>' +
      '<div class="feature-row">' +
      '<div><h3>Charging cost calculator</h3><p>Pick your car (Tata Nexon EV, MG ZS, etc.), pick a station, and get the exact cost, charging time, and range added. Sliders for charge level, comparison with petrol.</p></div>' +
      '<button class="link" data-nav="calculator" style="flex-shrink:0;align-self:center;">Open</button>' +
      '</div>' +
      '<div class="feature-row">' +
      '<div><h3>EV readiness planner</h3><p>Thinking of buying an EV? Enter your weekly driving, home and work sector, and see how many charging sessions you\'d need and how long it takes for fuel savings to pay off the extra cost.</p></div>' +
      '<button class="link" data-nav="planner" style="flex-shrink:0;align-self:center;">Open</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">' +
      '<div class="card"><h3 style="font-size:0.9375rem;margin-bottom:0.25rem;">Favorites &amp; reviews</h3><p style="font-size:0.8125rem;color:var(--muted-foreground);line-height:1.5;">Save stations you use often and leave reviews. Sign in to access them.</p><button data-nav="favorites" class="link" style="margin-top:0.5rem;">Favorites</button></div>' +
      '<div class="card"><h3 style="font-size:0.9375rem;margin-bottom:0.25rem;">About this project</h3><p style="font-size:0.8125rem;color:var(--muted-foreground);line-height:1.5;">Data sources, database schema, how the calculations work, and known limitations.</p><button data-nav="about" class="link" style="margin-top:0.5rem;">About</button></div>' +
      '</div>' +
      '</div>' +
      '</section>';

    // Fetch live count
    fetch("/api/stations").then(function (r) { return r.json(); }).then(function (data) {
      var el = container.querySelector("#station-count");
      if (el && data.stations) el.textContent = data.stations.length;
    }).catch(function () {});
  };

  /* ---------- About view ---------- */
  VR.views.about = function (container) {
    container.innerHTML = '<div class="section" style="max-width:56rem;">' +
      '<div class="mb-8">' +
      '<h1 class="text-3xl font-bold">PlugSpot — EV charging station finder</h1>' +
      '<p class="text-muted mt-2" style="max-width:42rem;">A college project that helps drivers in Gandhinagar and Ahmedabad find nearby EV charging stations, check live availability, compare costs with petrol, and decide whether switching to an EV makes sense for their daily routine.</p></div>' +
      '<div class="card mb-6"><div class="grid grid-4" id="about-stats"><div class="text-center"><div class="text-2xl font-bold tabular-nums">—</div><div class="text-xs text-muted mt-2">Stations</div></div><div class="text-center"><div class="text-2xl font-bold tabular-nums">—</div><div class="text-xs text-muted mt-2">Operators</div></div><div class="text-center"><div class="text-2xl font-bold tabular-nums">—</div><div class="text-xs text-muted mt-2">Cities</div></div><div class="text-center"><div class="text-2xl font-bold tabular-nums">—</div><div class="text-xs text-muted mt-2">Operational</div></div></div></div>' +
      '<div class="card mb-6"><div class="mb-4" style="display:flex;align-items:center;gap:0.5rem;"><span style="color:var(--primary);">' + VR.icons.database + '</span><h2 class="text-lg font-semibold">Where the station data comes from</h2></div>' +
      '<p class="text-sm" style="line-height:1.6;">The 37 charging stations in this project were researched manually using publicly available information: operator websites (Tata Power, ChargeZone, Ather Grid, Statiq, Exicom, Magenta), Google Maps listings, and news articles about EV infrastructure rollouts in Gujarat.</p>' +
      '<div style="margin-top:0.75rem;border:1px solid color-mix(in oklch, var(--status-maintenance) 30%, transparent);background:color-mix(in oklch, var(--status-maintenance) 5%, transparent);border-radius:var(--radius);padding:0.75rem;">' +
      '<p style="display:flex;align-items:flex-start;gap:0.5rem;font-size:0.75rem;"><span style="color:var(--status-maintenance);flex-shrink:0;">' + VR.icons.alertCircle + '</span><span><strong>Important — this is sample data.</strong> Availability (free ports), pricing, and operational status are illustrative values set during database seeding, not live feeds from the operators. A real production version would integrate each operator\'s API. Treat the numbers as a proof-of-concept, not a live tracker.</span></p></div>' +
      '<p class="text-sm mt-3" style="line-height:1.6;">Coordinates (latitude/longitude) were verified against the actual landmark each station is named after — for example, "Tata Power - Akshardham Parking" is placed at the Akshardham Temple parking lot in Sector 20, Gandhinagar, not at a generic city-centre point.</p></div>' +
      '<div class="card mb-6"><div class="mb-4" style="display:flex;align-items:center;gap:0.5rem;"><span style="color:var(--primary);">' + VR.icons.layers + '</span><h2 class="text-lg font-semibold">Database schema</h2></div>' +
      '<p class="text-muted text-sm mb-4">The app uses Prisma ORM with a local SQLite database file (<code style="font-family:var(--font-mono);font-size:0.75rem;background:var(--muted);padding:0.125rem 0.25rem;border-radius:2px;">db/custom.db</code>). Four tables:</p>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem;">' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><p style="font-family:var(--font-mono);font-size:0.875rem;font-weight:600;color:var(--primary);">User</p><p style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;">id, email, name, password (bcrypt), role (USER|ADMIN)</p><p style="font-size:0.75rem;margin-top:0.5rem;">Accounts. Admins can add/edit stations and moderate reviews.</p></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><p style="font-family:var(--font-mono);font-size:0.875rem;font-weight:600;color:var(--primary);">Station</p><p style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;">id, name, operator, address, city, lat, lng, status, connectorTypes, powerKW, pricePerKWh, numberOfPorts, availablePorts, amenities, hours, phone, image</p><p style="font-size:0.75rem;margin-top:0.5rem;">The charging stations. connectorTypes and amenities are stored as CSV strings because SQLite has no array type.</p></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><p style="font-family:var(--font-mono);font-size:0.875rem;font-weight:600;color:var(--primary);">Review</p><p style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;">id, userId, stationId, rating (1-5), comment</p><p style="font-size:0.75rem;margin-top:0.5rem;">User reviews. One review per user per station. Rating averages are recomputed on the station when a review is added or deleted.</p></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><p style="font-family:var(--font-mono);font-size:0.875rem;font-weight:600;color:var(--primary);">Favorite</p><p style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted-foreground);margin-top:0.25rem;">id, userId, stationId, createdAt</p><p style="font-size:0.75rem;margin-top:0.5rem;">Saved stations. One favorite per user per station.</p></div>' +
      '</div></div>' +
      '<div class="card mb-6"><div class="mb-4" style="display:flex;align-items:center;gap:0.5rem;"><span style="color:var(--primary);">' + VR.icons.code + '</span><h2 class="text-lg font-semibold">How the key calculations work</h2></div>' +
      '<div style="display:flex;flex-direction:column;gap:0.75rem;">' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;"><p style="font-weight:600;font-size:0.875rem;">Distance (Near Me)</p><code style="font-family:var(--font-mono);font-size:0.75rem;background:var(--muted);padding:0.125rem 0.375rem;border-radius:2px;">Haversine formula</code></div><p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:0.5rem;">The Earth-curvature distance between the user\'s geolocation and each station. SQLite has no GIS support, so this is computed in the API route after fetching candidates.</p></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;"><p style="font-weight:600;font-size:0.875rem;">Charging cost (Calculator)</p><code style="font-family:var(--font-mono);font-size:0.75rem;background:var(--muted);padding:0.125rem 0.375rem;border-radius:2px;">kWh × ₹/kWh</code></div><p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:0.5rem;">Energy = battery × (target% − current%). We divide by 0.9 for charging efficiency and add 15% time overhead past 80%.</p></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;"><p style="font-weight:600;font-size:0.875rem;">Break-even years (EV Planner)</p><code style="font-family:var(--font-mono);font-size:0.75rem;background:var(--muted);padding:0.125rem 0.375rem;border-radius:2px;">₹2L ÷ annual savings</code></div><p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:0.5rem;">₹2,00,000 is the typical extra upfront cost of an EV vs petrol. The result is how many years of fuel savings it takes to pay back that extra cost.</p></div>' +
      '<div style="border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem;"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;"><p style="font-weight:600;font-size:0.875rem;">Plan B pairing</p><code style="font-family:var(--font-mono);font-size:0.75rem;background:var(--muted);padding:0.125rem 0.375rem;border-radius:2px;">nearest compatible station</code></div><p style="font-size:0.75rem;color:var(--muted-foreground);margin-top:0.5rem;">For every station detail, we find the closest alternative sharing ≥1 connector type, within 15 km, preferring operational ones.</p></div>' +
      '</div></div>' +
      '<div class="card mb-6"><div class="mb-4" style="display:flex;align-items:center;gap:0.5rem;"><span style="color:var(--primary);">' + VR.icons.alertCircle + '</span><h2 class="text-lg font-semibold">Known limitations</h2></div>' +
      '<ul style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.875rem;color:var(--muted-foreground);">' +
      '<li style="display:flex;gap:0.5rem;"><span style="color:var(--status-maintenance);">•</span><span><strong style="color:var(--foreground);">Availability is static.</strong> Free-port counts don\'t update in real time. A production app would poll operator APIs.</span></li>' +
      '<li style="display:flex;gap:0.5rem;"><span style="color:var(--status-maintenance);">•</span><span><strong style="color:var(--foreground);">Search is case-sensitive.</strong> SQLite\'s contains filter doesn\'t ignore case.</span></li>' +
      '<li style="display:flex;gap:0.5rem;"><span style="color:var(--status-maintenance);">•</span><span><strong style="color:var(--foreground);">No rate limiting on auth.</strong> Login/register endpoints have no brute-force protection.</span></li>' +
      '<li style="display:flex;gap:0.5rem;"><span style="color:var(--status-maintenance);">•</span><span><strong style="color:var(--foreground);">Station images are external.</strong> Photos are loaded from Unsplash URLs.</span></li>' +
      '<li style="display:flex;gap:0.5rem;"><span style="color:var(--status-maintenance);">•</span><span><strong style="color:var(--foreground);">Coverage is Gandhinagar + Ahmedabad only.</strong> By design — this is the scope of the project.</span></li>' +
      '</ul></div>' +
      '<div class="card mb-6"><div class="mb-4" style="display:flex;align-items:center;gap:0.5rem;"><span style="color:var(--primary);">' + VR.icons.shieldCheck + '</span><h2 class="text-lg font-semibold">Technology stack</h2></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' +
      ["Next.js 16", "TypeScript", "Vanilla HTML/CSS/JS", "Prisma ORM", "SQLite", "NextAuth.js", "Leaflet + OpenStreetMap", "Zod"].map(function (t) { return '<span class="badge">' + t + '</span>'; }).join("") +
      '</div></div>' +
      '<p class="text-center text-xs text-muted">Built as a college project. &copy; ' + new Date().getFullYear() + ' PlugSpot.</p>' +
      '</div>';

    // Fetch live stats
    fetch("/api/stations").then(function(r){return r.json();}).then(function (data) {
      var stations = data.stations || [];
      var ops = new Set(stations.map(function (s) { return s.operator; })).size;
      var cts = new Set(stations.map(function (s) { return s.city; })).size;
      var ops_count = stations.filter(function (s) { return s.status === "OPERATIONAL"; }).length;
      var el = container.querySelector("#about-stats");
      if (el) {
        el.innerHTML = '<div class="text-center"><div class="text-2xl font-bold tabular-nums">' + stations.length + '</div><div class="text-xs text-muted mt-2">Stations</div></div>' +
          '<div class="text-center"><div class="text-2xl font-bold tabular-nums">' + ops + '</div><div class="text-xs text-muted mt-2">Operators</div></div>' +
          '<div class="text-center"><div class="text-2xl font-bold tabular-nums">' + cts + '</div><div class="text-xs text-muted mt-2">Cities</div></div>' +
          '<div class="text-center"><div class="text-2xl font-bold tabular-nums">' + ops_count + '</div><div class="text-xs text-muted mt-2">Operational</div></div>';
      }
    }).catch(function () {});
  };

  /* ---------- Auth dialog ---------- */
  VR.openAuth = function (tab) {
    tab = tab || "login";
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = '<div class="modal" style="max-width:26rem;overflow:hidden;">' +
      '<div class="auth-banner">' +
      '<div style="width:2.5rem;height:2.5rem;border-radius:var(--radius);background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;color:white;">' + VR.icons.logo + '</div>' +
      '<div><p style="font-weight:700;font-size:1rem;color:white;">PlugSpot</p><p style="font-size:0.6875rem;color:rgba(255,255,255,0.7);">EV Charging Network</p></div>' +
      '</div>' +
      '<div class="auth-content">' +
      '<div id="auth-form"></div>' +
      '</div></div>';

    document.body.classList.add("modal-open");
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { overlay.remove(); document.body.classList.remove("modal-open"); }
    });

    function renderForm(which) {
      var formEl = overlay.querySelector("#auth-form");

      if (which === "login") {
        formEl.innerHTML =
          '<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.25rem;">Welcome back</h2>' +
          '<p style="font-size:0.8125rem;color:var(--muted-foreground);margin-bottom:1.25rem;">Sign in to access your saved stations and reviews.</p>' +
          '<form id="login-form" style="display:flex;flex-direction:column;gap:0.875rem;">' +
          '<div><label class="label" for="login-email">Email or Username</label><div style="position:relative;"><span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.mail + '</span><input class="input" type="text" id="login-email" placeholder="you@example.com or username" style="padding-left:2.25rem;" required autocomplete="username"></div></div>' +
          '<div><div style="display:flex;justify-content:space-between;align-items:center;"><label class="label" for="login-password" style="margin:0;">Password</label><button type="button" id="forgot-link" style="font-size:0.75rem;color:var(--primary);">Forgot password?</button></div><div style="position:relative;"><span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.lock + '</span><input class="input" type="password" id="login-password" placeholder="Enter your password" style="padding-left:2.25rem;padding-right:2.25rem;" required autocomplete="current-password"><button type="button" data-action="toggle-password" style="position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.eye + '</button></div></div>' +
          '<div id="login-error" style="display:none;color:var(--destructive);font-size:0.75rem;padding:0.5rem 0.625rem;border-radius:var(--radius);background:color-mix(in oklch, var(--destructive) 8%, transparent);"></div>' +
          '<label style="display:flex;align-items:center;gap:0.5rem;font-size:0.8125rem;color:var(--muted-foreground);cursor:pointer;"><input type="checkbox" id="login-remember" style="width:1rem;height:1rem;accent-color:var(--primary);"> Remember me</label>' +
          '<button type="submit" class="btn w-full" style="height:2.75rem;font-size:0.9375rem;">Sign In</button>' +
          '</form>' +
          '<div style="text-align:center;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border);">' +
          '<p style="font-size:0.8125rem;color:var(--muted-foreground);">Don\'t have an account? <button type="button" data-auth-switch="register" style="color:var(--primary);font-weight:600;">Create one</button></p>' +
          '</div>';
      } else {
        formEl.innerHTML =
          '<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.25rem;">Create your account</h2>' +
          '<p style="font-size:0.8125rem;color:var(--muted-foreground);margin-bottom:1.25rem;">Join PlugSpot to save favorites, leave reviews, and plan your routes.</p>' +
          '<form id="register-form" style="display:flex;flex-direction:column;gap:0.875rem;">' +
          '<div><label class="label" for="reg-name">Full Name</label><div style="position:relative;"><span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.user + '</span><input class="input" type="text" id="reg-name" placeholder="John Doe" style="padding-left:2.25rem;" autocomplete="name"></div></div>' +
          '<div><label class="label" for="reg-email">Email Address</label><div style="position:relative;"><span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.mail + '</span><input class="input" type="email" id="reg-email" placeholder="you@example.com" style="padding-left:2.25rem;" required autocomplete="email"></div></div>' +
          '<div><label class="label" for="reg-password">Password</label><div style="position:relative;"><span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.lock + '</span><input class="input" type="password" id="reg-password" placeholder="Minimum 6 characters" style="padding-left:2.25rem;padding-right:2.25rem;" required minlength="6" autocomplete="new-password"><button type="button" data-action="toggle-password" style="position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.eye + '</button></div></div>' +
          '<div><label class="label" for="reg-confirm">Confirm Password</label><div style="position:relative;"><span style="position:absolute;left:0.75rem;top:50%;transform:translateY(-50%);color:var(--muted-foreground);display:flex;">' + VR.icons.lock + '</span><input class="input" type="password" id="reg-confirm" placeholder="Re-enter your password" style="padding-left:2.25rem;" required minlength="6" autocomplete="new-password"></div></div>' +
          '<div id="reg-error" style="display:none;color:var(--destructive);font-size:0.75rem;padding:0.5rem 0.625rem;border-radius:var(--radius);background:color-mix(in oklch, var(--destructive) 8%, transparent);"></div>' +
          '<label style="display:flex;align-items:flex-start;gap:0.5rem;font-size:0.75rem;color:var(--muted-foreground);cursor:pointer;line-height:1.4;"><input type="checkbox" id="reg-terms" style="width:1rem;height:1rem;accent-color:var(--primary);margin-top:1px;" required> I agree to the Terms of Service and Privacy Policy</label>' +
          '<button type="submit" class="btn w-full" style="height:2.75rem;font-size:0.9375rem;">Create Account</button>' +
          '</form>' +
          '<div style="text-align:center;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border);">' +
          '<p style="font-size:0.8125rem;color:var(--muted-foreground);">Already have an account? <button type="button" data-auth-switch="login" style="color:var(--primary);font-weight:600;">Sign in</button></p>' +
          '</div>';
      }
      attachFormEvents(which);
    }

    function showError(elId, msg) { var el = overlay.querySelector("#" + elId); if (el) { el.textContent = msg; el.style.display = "block"; } }
    function hideError(elId) { var el = overlay.querySelector("#" + elId); if (el) el.style.display = "none"; }

    function attachFormEvents(which) {
      if (which === "login") {
        var form = overlay.querySelector("#login-form");
        form.addEventListener("submit", async function (e) {
          e.preventDefault();
          hideError("login-error");
          var email = overlay.querySelector("#login-email").value.trim();
          var password = overlay.querySelector("#login-password").value;
          if (!email || !password) { showError("login-error", "Please enter both email and password."); return; }
          var btn = form.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = '<span style="display:inline-block;width:1rem;height:1rem;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;margin-right:0.5rem;"></span> Signing in...';
          try {
            var session = await VR.auth.login(email, password);
            if (!session || !session.user) throw new Error("Invalid credentials");
            VR.state.session = session;
            overlay.remove(); document.body.classList.remove("modal-open");
            VR.toast("Welcome back! You're signed in.", "success");
            VR.render();
          } catch (err) {
            showError("login-error", "Invalid email or password. Please check your credentials and try again.");
            btn.disabled = false; btn.textContent = "Sign In";
          }
        });
        var forgot = overlay.querySelector("#forgot-link");
        if (forgot) forgot.addEventListener("click", function () {
          VR.toast("Password reset is not available in this demo.", "info");
        });
      } else {
        var form = overlay.querySelector("#register-form");
        form.addEventListener("submit", async function (e) {
          e.preventDefault();
          hideError("reg-error");
          var name = overlay.querySelector("#reg-name").value.trim();
          var email = overlay.querySelector("#reg-email").value.trim();
          var password = overlay.querySelector("#reg-password").value;
          var confirm = overlay.querySelector("#reg-confirm").value;
          var terms = overlay.querySelector("#reg-terms").checked;
          if (!email) { showError("reg-error", "Please enter your email address."); return; }
          if (password.length < 6) { showError("reg-error", "Password must be at least 6 characters long."); return; }
          if (password !== confirm) { showError("reg-error", "Passwords do not match. Please re-enter."); return; }
          if (!terms) { showError("reg-error", "Please accept the Terms of Service to continue."); return; }
          var btn = form.querySelector('button[type="submit"]');
          btn.disabled = true;
          btn.innerHTML = '<span style="display:inline-block;width:1rem;height:1rem;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;margin-right:0.5rem;"></span> Creating account...';
          try {
            await VR.auth.register(name, email, password);
            var session = await VR.auth.login(email, password);
            VR.state.session = session;
            overlay.remove(); document.body.classList.remove("modal-open");
            VR.toast("Account created. Welcome to PlugSpot!", "success");
            VR.render();
          } catch (err) {
            showError("reg-error", err.message || "This email is already registered. Try signing in instead.");
            btn.disabled = false; btn.textContent = "Create Account";
          }
        });
      }

      // Password toggle
      overlay.querySelectorAll("[data-action='toggle-password']").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var input = this.parentElement.querySelector("input");
          if (input.type === "password") { input.type = "text"; this.innerHTML = VR.icons.eyeOff; }
          else { input.type = "password"; this.innerHTML = VR.icons.eye; }
        });
      });

      // Switch between login/register
      overlay.querySelectorAll("[data-auth-switch]").forEach(function (btn) {
        btn.addEventListener("click", function () { renderForm(btn.dataset.authSwitch); });
      });
    }

    renderForm(tab);
  };

  /* ---------- Global event delegation ---------- */
  document.addEventListener("click", function (e) {
    // Nav buttons
    var navEl = e.target.closest("[data-nav]");
    if (navEl) {
      VR.navigate(navEl.dataset.nav);
      // Close mobile menu + user menu
      var mm = document.getElementById("mobile-menu");
      if (mm) mm.classList.remove("open");
      var um = document.getElementById("user-menu");
      if (um) um.classList.remove("open");
      return;
    }

    // Open auth dialog
    var authEl = e.target.closest("[data-action='open-auth']");
    if (authEl) {
      VR.openAuth(authEl.dataset.tab || "login");
      return;
    }

    // Toggle theme
    var themeEl = e.target.closest("[data-action='toggle-theme']");
    if (themeEl) {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      VR.render();
      return;
    }

    // Toggle mobile menu
    var mobileEl = e.target.closest("[data-action='toggle-mobile-menu']");
    if (mobileEl) {
      var mm = document.getElementById("mobile-menu");
      if (mm) mm.classList.toggle("open");
      return;
    }

    // Toggle user menu
    var userEl = e.target.closest("[data-action='toggle-user-menu']");
    if (userEl) {
      var um = document.getElementById("user-menu");
      if (um) um.classList.toggle("open");
      return;
    }

    // Logout
    var logoutEl = e.target.closest("[data-action='logout']");
    if (logoutEl) {
      VR.auth.logout().then(function () {
        VR.state.session = null;
        VR.toast("Signed out", "success");
        VR.navigate("home");
      });
      return;
    }

    // Toggle password visibility
    var pwdEl = e.target.closest("[data-action='toggle-password']");
    if (pwdEl) {
      var input = pwdEl.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        pwdEl.innerHTML = VR.icons.eyeOff;
      } else {
        input.type = "password";
        pwdEl.innerHTML = VR.icons.eye;
      }
      return;
    }
  });

  /* ---------- Init ---------- */
  VR.init = async function () {
    // Get session
    var session = await VR.auth.getSession();
    VR.state.session = session && session.user ? session : null;
    VR.render();
  };

  // Note: VR.init() is called from page.tsx's useEffect (after React hydration)
  // to prevent React from overwriting the vanilla JS content in #app.
})();
