(function () {
  "use strict";

  var AUTH = window.MindSyncAuth;
  if (!AUTH) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MIN_PASS = 8;

  AUTH.signup = function (inputs) {
    var fullName = (inputs.fullName || "").trim();
    var email = (inputs.email || "").trim();
    var password = inputs.password || "";
    var confirm = inputs.confirm || "";

    if (!fullName) {
      return Promise.reject(new Error("Please tell us your display name."));
    }
    if (!EMAIL_RE.test(email)) {
      return Promise.reject(new Error("That email address doesn't look right."));
    }
    if (password.length < MIN_PASS) {
      return Promise.reject(
        new Error("Use at least " + MIN_PASS + " characters for your password.")
      );
    }
    if (password !== confirm) {
      return Promise.reject(new Error("Passwords don't match."));
    }

    return AUTH.apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        email: email.toLowerCase(),
        password: password
      })
    });
  };

  AUTH.login = function (inputs) {
    var email = (inputs.email || "").trim();
    var password = inputs.password || "";

    if (!email || !password) {
      return Promise.reject(new Error("Enter your email and password."));
    }
    if (!EMAIL_RE.test(email)) {
      return Promise.reject(new Error("That email address doesn't look right."));
    }

    return AUTH.apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: email.toLowerCase(),
        password: password
      })
    }).then(function (data) {
      AUTH.saveToken(data.access_token);
      if (data.user) AUTH.saveUser(data.user);
      return AUTH.fetchCurrentUser();
    });
  };

  function current() {
    return AUTH.getUser() || (AUTH.getToken() ? {} : null);
  }

  function redirectToDashboard() {
    window.location.href = "dashboard.html";
  }

  function goAfter(intent) {
    window.MindSyncUI.toast(
      intent === "login" ? "Welcome back." : "Account created. Welcome.",
      "success"
    );
    setTimeout(redirectToDashboard, 700);
  }

  function showError(el, message) {
    el.textContent = message;
    el.style.display = "block";
  }

  function clearError(el) {
    el.style.display = "none";
  }

  function bindClearing(form, errEl) {
    Array.prototype.forEach.call(form.querySelectorAll("input"), function (input) {
      input.addEventListener("input", function () {
        clearError(errEl);
      });
    });
  }

  function initLogin() {
    if (AUTH.isAuthenticated()) { redirectToDashboard(); return; }
    var form = document.getElementById("loginForm");
    var err = document.getElementById("loginError");
    if (!form || !err) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError(err);
      var btn = form.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;

      AUTH.login({
        email: form.email.value,
        password: form.password.value
      }).then(function () {
        goAfter("login");
      }).catch(function (error) {
        if (btn) btn.disabled = false;
        showError(err, error && error.message ? error.message : "Something went wrong. Please try again.");
      });
    });
    bindClearing(form, err);
  }

  function initSignup() {
    if (AUTH.isAuthenticated()) { redirectToDashboard(); return; }
    var form = document.getElementById("signupForm");
    var err = document.getElementById("signupError");
    if (!form || !err) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError(err);
      var btn = form.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;

      var fullNameInput = document.getElementById("fullName");
      var fullName = fullNameInput ? fullNameInput.value : "";

      AUTH.signup({
        fullName: fullName,
        email: form.email.value,
        password: form.password.value,
        confirm: form.confirm.value
      }).then(function () {
        if (btn) btn.disabled = false;
        window.MindSyncUI.toast("Account created. Log in to continue.", "success");
        setTimeout(function () {
          window.location.href = "login.html";
        }, 700);
      }).catch(function (error) {
        if (btn) btn.disabled = false;
        showError(err, error && error.message ? error.message : "Something went wrong. Please try again.");
      });
    });
    bindClearing(form, err);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    if (page === "login") initLogin();
    else if (page === "signup") initSignup();
  });

  window.MindSyncAuth = AUTH;
})();