(function () {
  "use strict";

  const STORE_KEY = "mindsync.data.v1";
  const TOKEN_KEY = "mindsync_token";
  const USER_KEY = "mindsync_user";

  const API_ORIGINS = {
    local: "http://127.0.0.1:8000",
    production: "https://mindsync-api.onrender.com"
  };

  function resolveApiBase() {
    if (typeof window.MINDSYNC_API_BASE === "string" && window.MINDSYNC_API_BASE) {
      return window.MINDSYNC_API_BASE.replace(/\/$/, "");
    }
    const host = window.location.hostname;
    const origin = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0"
      ? API_ORIGINS.local
      : API_ORIGINS.production;
    return origin + "/api/v1";
  }

  const API_BASE_URL = resolveApiBase();

  const Auth = {
    TOKEN_KEY: TOKEN_KEY,
    USER_KEY: USER_KEY,
    API_BASE: API_BASE_URL,

    saveToken: function (token) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch (e) {
        console.warn("mindsync: token storage write failed", e);
      }
    },

    getToken: function () {
      return localStorage.getItem(TOKEN_KEY);
    },

    clearToken: function () {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        console.warn("mindsync: token storage clear failed", e);
      }
    },

    getUser: function () {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    saveUser: function (user) {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch (e) {
        console.warn("mindsync: user storage write failed", e);
      }
    },

    clearUser: function () {
      try {
        localStorage.removeItem(USER_KEY);
      } catch (e) {
        console.warn("mindsync: user storage clear failed", e);
      }
    },

    isAuthenticated: function () {
      return !!this.getToken();
    },

    logout: function () {
      this.clearToken();
      this.clearUser();
      window.location.replace("login.html");
    },

    apiFetch: function (endpoint, options) {
      options = options || {};
      options.headers = Object.assign({}, options.headers || {});
      if (!(options.body instanceof FormData)) {
        options.headers["Content-Type"] = "application/json";
      }
      const token = this.getToken();
      if (token) {
        options.headers["Authorization"] = "Bearer " + token;
      }
      return fetch(this.API_BASE + endpoint, options).then(function (response) {
        if (response.status === 401) {
          if (this.isAuthenticated()) {
            this.logout();
          }
          const err = new Error("Your session has expired. Please log in again.");
          err.status = 401;
          return Promise.reject(err);
        }
        const contentType = response.headers.get("Content-Type") || "";
        const payload = contentType.indexOf("application/json") > -1
          ? response.json()
          : Promise.resolve(null);
        return payload.then(function (data) {
          if (!response.ok) {
            const detail =
              (data && (data.detail || data.message)) ||
              "Request failed (" + response.status + ").";
            const err = new Error(detail);
            err.status = response.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      }.bind(this));
    },

    fetchCurrentUser: function () {
      return this.apiFetch("/users/me").then(function (user) {
        this.saveUser(user);
        return user;
      }.bind(this));
    },

    displayName: function (user) {
      user = user || this.getUser();
      if (!user) return "";
      if (user.full_name && user.full_name.trim()) return user.full_name.trim();
      if (user.email) return user.email;
      return "";
    },

    initial: function (user) {
      const name = this.displayName(user);
      return name ? name.charAt(0).toUpperCase() : "?";
    }
  };

  window.MindSyncAuth = Auth;

  const MindSync = (window.MindSync || {});

  const MoodMeta = {
    1: { emoji: "😞", label: "Low" },
    2: { emoji: "😕", label: "Meh" },
    3: { emoji: "😐", label: "OK" },
    4: { emoji: "🙂", label: "Good" },
    5: { emoji: "😄", label: "Great" }
  };

  const darkPalette = {
    text: "#faf7ee",
    muted: "#b4a98c",
    accent: "#ffd83d",
    accent2: "#ffb020",
    accent3: "#ff8c1a",
    green: "#ffe08a",
    danger: "#ff6b7a",
    grid: "rgba(255, 214, 141, 0.08)"
  };

  const defaults = {
    moods: [],
    journal: [],
    breathing: [],
    sleep: []
  };

  function todayKey(d) {
    const x = d || new Date();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return x.getFullYear() + "-" + m + "-" + day;
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      const parsed = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(defaults)), parsed);
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function write(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("mindsync: storage write failed", e);
    }
  }

  const MSProto = {
    MoodMeta: MoodMeta,
    darkPalette: darkPalette,
    todayKey: todayKey,

    getData: read,

    addMood: function (entry) {
      const d = read();
      d.moods = d.moods || [];
      d.moods.push(Object.assign({ id: Date.now() + Math.random().toString(36).slice(2, 7), ts: Date.now() }, entry));
      write(d);
      return entry;
    },

    saveJournal: function (entry) {
      const d = read();
      d.journal = d.journal || [];
      d.journal = d.journal.concat([Object.assign({ id: Date.now() + Math.random().toString(36).slice(2, 7), ts: Date.now() }, entry)]);
      write(d);
      return entry;
    },

    addBreathing: function (session) {
      const d = read();
      d.breathing = d.breathing || [];
      d.breathing.push(Object.assign({ id: Date.now() + Math.random().toString(36).slice(2, 7), ts: Date.now() }, session));
      write(d);
      return session;
    },

    addSleep: function (session) {
      const d = read();
      d.sleep = d.sleep || [];
      d.sleep.push(Object.assign({ id: Date.now() + Math.random().toString(36).slice(2, 7), ts: Date.now() }, session));
      write(d);
      return session;
    },

    removeItem: function (collection, id) {
      const d = read();
      if (!d[collection]) return;
      d[collection] = d[collection].filter(function (it) {
        return String(it.id) !== String(id);
      });
      write(d);
    },

    moodsForLastDays: function (n) {
      const d = read();
      const cutoff = Date.now() - n * 86400000;
      return (d.moods || []).filter(function (m) {
        return m.ts >= cutoff;
      }).sort(function (a, b) {
        return a.ts - b.ts;
      });
    },

    streak: function () {
      const d = read();
      const keys = new Set((d.moods || []).map(function (m) {
        return m.date;
      }));
      let count = 0;
      const cursor = new Date();
      while (keys.has(todayKey(cursor))) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      return count;
    }
  };

  Object.keys(MSProto).forEach(function (key) {
    MindSync[key] = MSProto[key];
  });
  window.MindSync = MindSync;

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(msg, type) {
    let wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .3s ease, transform .3s ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 320);
    }, 2400);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const opts = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "Still awake";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }

  /* =========================================
     DYNAMIC NAVBAR (avatar + dropdown)
  ========================================= */
  const PROTECTED_PAGES = [
    "dashboard", "mood", "journal", "breathing", "coach", "analytics", "insights", "profile"
  ];

  function setupDynamicNavbar() {
    const page = document.body.getAttribute("data-page");
    const actions = $(".nav-actions");
    const cta = actions ? $(".nav-cta", actions) : null;
    const memberRow = $("#authMemberRow");

    if (!Auth.isAuthenticated()) {
      if (actions) {
        const existing = $("#navAuth", actions);
        if (existing) existing.remove();
      }
      if (cta) cta.style.removeProperty("display");
      if (memberRow) memberRow.style.display = "";
      if (PROTECTED_PAGES.indexOf(page) > -1) {
        const next = window.location.hash || "";
        window.location.replace("login.html" + next);
      }
      return;
    }

    if (cta) cta.style.display = "none";
    if (memberRow) memberRow.style.display = "none";

    if (!actions) return;

    let navAuth = $("#navAuth", actions);
    if (!navAuth) {
      navAuth = document.createElement("div");
      navAuth.className = "nav-auth";
      navAuth.id = "navAuth";

      const badge = document.createElement("button");
      badge.type = "button";
      badge.className = "profile-badge";
      badge.id = "profileBadge";
      badge.setAttribute("aria-label", "Account menu");
      badge.setAttribute("aria-haspopup", "true");
      badge.setAttribute("aria-expanded", "false");

      const letter = document.createElement("span");
      letter.className = "profile-badge-initial";
      letter.id = "profileInitial";
      letter.textContent = Auth.initial();

      badge.appendChild(letter);

      const menu = document.createElement("div");
      menu.className = "profile-menu";
      menu.id = "profileMenu";
      menu.setAttribute("role", "menu");

      const head = document.createElement("div");
      head.className = "profile-menu-head";

      const nameEl = document.createElement("div");
      nameEl.className = "profile-menu-name";
      nameEl.id = "profileMenuName";
      nameEl.textContent = Auth.displayName();

      const emailEl = document.createElement("div");
      emailEl.className = "profile-menu-email";
      emailEl.id = "profileMenuEmail";

      const user = Auth.getUser();
      emailEl.textContent = user && user.email ? user.email : "";

      head.appendChild(nameEl);
      head.appendChild(emailEl);

      const divider = document.createElement("div");
      divider.className = "profile-divider";

      const profileLink = document.createElement("a");
      profileLink.className = "profile-menu-item";
      profileLink.href = "profile.html";
      profileLink.textContent = "My Profile";

      const dashboardLink = document.createElement("a");
      dashboardLink.className = "profile-menu-item";
      dashboardLink.href = "dashboard.html";
      dashboardLink.textContent = "Dashboard";

      const divider2 = document.createElement("div");
      divider2.className = "profile-divider";

      const signoutBtn = document.createElement("button");
      signoutBtn.type = "button";
      signoutBtn.className = "profile-menu-item profile-signout";
      signoutBtn.id = "profileSignOut";
      signoutBtn.textContent = "Sign Out";

      menu.appendChild(head);
      menu.appendChild(divider);
      menu.appendChild(profileLink);
      menu.appendChild(dashboardLink);
      menu.appendChild(divider2);
      menu.appendChild(signoutBtn);

      navAuth.appendChild(badge);
      navAuth.appendChild(menu);
      actions.appendChild(navAuth);

      badge.addEventListener("click", function (event) {
        event.stopPropagation();
        const open = menu.classList.toggle("open");
        badge.setAttribute("aria-expanded", open ? "true" : "false");
      });

      signoutBtn.addEventListener("click", function () {
        Auth.logout();
      });

      document.addEventListener("click", function (event) {
        if (!navAuth.contains(event.target)) {
          menu.classList.remove("open");
          badge.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          menu.classList.remove("open");
          badge.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  function setupHomepageGreeting() {
    const page = document.body.getAttribute("data-page");
    if (page !== "index" || !Auth.isAuthenticated()) return;
    const box = $("#authMemberBox");
    if (!box) return;
    box.style.display = "";
    const greetingEl = $("#authMemberGreeting");
    if (greetingEl) {
      greetingEl.textContent = "Welcome back, " + Auth.displayName() + " 👋";
    }
  }

  /* =========================================
     BOOT
  ========================================= */
  document.addEventListener("DOMContentLoaded", function () {
    setupDynamicNavbar();
    setupHomepageGreeting();

    const page = document.body.getAttribute("data-page");
    if (page && window.MindSyncAuth && window.MindSyncAuth.apiFetch) {
      // Keep the cached user fresh so avatar + name stay correct across pages.
      if (Auth.isAuthenticated() && Auth.getUser()) {
        Auth.fetchCurrentUser().catch(function () { /* keep cache on failure */ });
      }
    }
  });

  /* Navbar scroll effect */
  const navbar = $("#navbar");
  function updateNavbar() {
    if (!navbar) return;
    if (window.scrollY > 40) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }
  window.addEventListener("scroll", updateNavbar, { passive: true });
  updateNavbar();

  /* Mobile menu */
  const hamburger = $("#hamburger");
  const mobileMenu = $("#mobileMenu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", function () {
      hamburger.classList.toggle("active");
      mobileMenu.classList.toggle("open");
      const dropdown = $("#profileMenu");
      const badge = $("#profileBadge");
      if (dropdown) dropdown.classList.remove("open");
      if (badge) badge.setAttribute("aria-expanded", "false");
    });
    $$(".mobile-menu a").forEach(function (link) {
      link.addEventListener("click", function () {
        hamburger.classList.remove("active");
        mobileMenu.classList.remove("open");
      });
    });
  }

  /* Scroll to top */
  const scrollTopButton = $("#scrollTop");
  if (scrollTopButton) {
    function updateScrollTop() {
      if (window.scrollY > 200) {
        scrollTopButton.classList.add("show");
      } else {
        scrollTopButton.classList.remove("show");
      }
    }
    window.addEventListener("scroll", updateScrollTop, { passive: true });
    window.addEventListener("resize", updateScrollTop, { passive: true });
    updateScrollTop();
    scrollTopButton.addEventListener("click", function (event) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* Card tilt */
  $$(".card-tilt").forEach(function (card) {
    card.addEventListener("mousemove", function (event) {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 40;
      const rotateY = (centerX - x) / 40;
      card.style.transform = "translateY(-6px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  });

  /* Active nav link based on current page */
  const page = document.body.getAttribute("data-page");
  if (page) {
    $$("[data-page-link]").forEach(function (link) {
      const href = link.getAttribute("href");
      if (href && href.indexOf(page + ".html") > -1) {
        link.classList.add("active");
      }
    });
  }

  /* Footer year */
  $$("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Preloader dismissal: fade out on load, hard fallback so it never hangs */
  let preloaderDone = false;
  function dismissPreloader() {
    if (preloaderDone) return;
    preloaderDone = true;
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    loader.classList.add("fade-out");
    setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 550);
  }
  window.addEventListener("load", dismissPreloader);
  setTimeout(dismissPreloader, 3500);

  /* Portfolio attribution footer */
  const GITHUB_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
  const LINKEDIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>';

  function injectAppFooter() {
    if (document.querySelector(".app-footer")) return;
    const footer = document.createElement("footer");
    footer.className = "app-footer";
    footer.innerHTML =
      '<div class="app-footer-inner">' +
      '<p class="app-footer-text">Connect with us</p>' +
      '<div class="app-footer-links">' +
      '<a href="https://github.com/amritkn2244" target="_blank" rel="noopener noreferrer" aria-label="GitHub">' + GITHUB_SVG + "</a>" +
      '<a href="https://linkedin.com/in/amritkn2244" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">' + LINKEDIN_SVG + "</a>" +
      "</div></div>";
    document.body.appendChild(footer);
  }
  injectAppFooter();

  window.MindSyncUI = {
    $: $,
    $$: $$,
    toast: toast,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    greeting: greeting,
    setupDynamicNavbar: setupDynamicNavbar,
    setupHomepageGreeting: setupHomepageGreeting
  };
})();