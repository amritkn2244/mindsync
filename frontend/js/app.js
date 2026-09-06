(function () {
  "use strict";

  const MS = window.MindSync;
  const UI = window.MindSyncUI;
  const AUTH = window.MindSyncAuth;
  const $ = UI.$;
  const $$ = UI.$$;
  const P = MS.darkPalette;

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.getAttribute("data-page");
    if (!page) return;
    switch (page) {
      case "dashboard": initDashboard(); break;
      case "mood": initMood(); break;
      case "journal": initJournal(); break;
      case "breathing": initBreathing(); break;
      case "coach": initCoach(); break;
      case "analytics": initAnalytics(); break;
      case "insights": initInsights(); break;
      case "profile": initProfile(); break;
    }
  });

  /* ==============================
     DASHBOARD
  ============================== */
  function initDashboard() {
    const d = MS.getData();
    const moods = (d.moods || []).sort(function (a, b) { return b.ts - a.ts; });
    const journals = (d.journal || []).sort(function (a, b) { return b.ts - a.ts; });
    const streak = MS.streak();

    $("#greeting").textContent = UI.greeting() + ".";
    $("#todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

    $("#statStreak").textContent = streak;
    $("#statCheckins").textContent = moods.length;
    $("#statJournal").textContent = journals.length;
    $("#statBreathing").textContent = (d.breathing || []).length;
    $("#statStreakNote").textContent = streak === 1 ? "day running" : "days running";

    const today = moods[0] && moods[0].date === MS.todayKey() ? moods[0] : null;
    const todayBox = $("#todayBox");
    if (today) {
      const meta = MS.MoodMeta[today.score];
      todayBox.innerHTML =
        '<div class="row"><span class="entry-badge" style="font-size:1.6rem">' + (meta ? meta.emoji : "😐") + "</span>" +
        "<div><div class='stat-card__label' style='font-weight:700'>" + (meta ? meta.label : "") + " day</div>" +
        '<div class="muted" style="font-size:.84rem">Energy ' + renderDots(today.energy) + "</div></div>" +
        '<a class="btn btn-secondary btn-sm" href="mood.html">Update</a></div>' +
        (today.triggers && today.triggers.length ? '<div class="chip-list mt-2">' + today.triggers.map(function (t) {
          return '<span class="chip small">' + UI.escapeHtml(t) + "</span>";
        }).join("") + "</div>" : "") +
        (today.note ? '<p class="entry-text mt-1">"' + UI.escapeHtml(today.note) + '"</p>' : "");
    } else {
      todayBox.innerHTML =
        '<div class="empty-state" style="padding:24px"><div class="empty-icon">🌸</div>' +
        '<p>No check-in yet today. A one-minute check-in keeps your streak and unlocks insights.</p>' +
        '<div class="mt-3"><a class="btn btn-primary" href="mood.html">Check in now →</a></div></div>';
    }

    const recentWrap = $("#recentEntries");
    if (!moods.length && !journals.length) {
      recentWrap.innerHTML = '<div class="glass-card card-pad empty-state"><div class="empty-icon">✨</div><p>Your recent activity will appear here once you log your first check-in or journal entry.</p></div>';
    } else {
      let html = "";
      moods.slice(0, 3).forEach(function (m) {
        const meta = MS.MoodMeta[m.score];
        html += '<div class="glass-card entry-item lift"><div class="entry-main"><div class="entry-title">' +
          (meta ? meta.emoji + " " + meta.label : "") + ' mood check-in <span class="pill">' + UI.formatDate(m.ts) + "</span></div>" +
          '<div class="entry-date">' + (m.triggers && m.triggers.length ? "Triggers: " + m.triggers.join(", ") : "No triggers noted") + "</div>" +
          (m.note ? '<p class="entry-text">"' + UI.escapeHtml(m.note) + '"</p>' : "") + "</div></div>";
      });
      journals.slice(0, 3).forEach(function (j) {
        html += '<div class="glass-card entry-item lift"><div class="entry-main"><div class="entry-title">Journal entry <span class="pill">' + UI.formatDate(j.ts) + "</span></div>" +
          '<div class="entry-date">' + UI.escapeHtml(j.prompt || "") + "</div>" +
          (j.text ? '<p class="entry-text">' + UI.escapeHtml(shorten(j.text, 120)) + "</p>" : "") + "</div></div>";
      });
      recentWrap.innerHTML = html;
    }

    const hasMoodToday = !!today;
    const activity = (moods.length ? 1 : 0) + (journals.length ? 1 : 0) + ((d.breathing || []).length ? 1 : 0) + ((d.sleep || []).length ? 1 : 0);
    const tonight = $("#todayNote");
    if (tonight) {
      const moodNote = today && today.note ? '<p class="entry-text">"' + UI.escapeHtml(today.note) + '"</p>' : "";
      if (!hasMoodToday && activity === 0) {
        tonight.innerHTML = '<div class="chip">Tip: your data stays in this browser, private by design</div><div class="entry-text mt-1"><p>No check-in yet — a tiny one keeps your streak alive.</p></div>' + moodNote;
      } else {
        tonight.innerHTML = moodNote || '<div class="pill">Data is private to this browser</div>';
      }
    }
  }

  function renderDots(n) {
    let out = "";
    for (let i = 1; i <= 5; i += 1) {
      out += '<span style="color:' + (i <= n ? P.accent2 : "rgba(255,255,255,.15)") + ';font-size:1.2rem">●</span>';
    }
    return out;
  }

  function shorten(str, n) {
    str = str || "";
    return str.length > n ? str.slice(0, n) + "…" : str;
  }

  /* ==============================
     MOOD
  ============================== */
  function initMood() {
    let selectedMood = 3;
    let energy = 3;
    let sleep = 3;
    let triggers = new Set();

    const triggerOptions = ["Work", "Sleep", "Social", "Health", "Family", "Food", "Screens", "Weather"];

    const picker = $("#moodPicker");
    Object.keys(MS.MoodMeta).forEach(function (key) {
      const meta = MS.MoodMeta[key];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "emoji-btn" + (Number(key) === selectedMood ? " selected" : "");
      btn.dataset.score = key;
      btn.innerHTML = '<span class="emoji">' + meta.emoji + "</span><span>" + meta.label + "</span>";
      btn.addEventListener("click", function () {
        selectedMood = Number(key);
        $$(".emoji-btn", picker).forEach(function (b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
        updatePreview();
      });
      picker.appendChild(btn);
    });

    bindSlider("#energySlider", "#energyValue", function (v) {
      energy = v;
      updatePreview();
    });
    bindSlider("#sleepSlider", "#sleepValue", function (v) {
      sleep = v;
      updatePreview();
    });

    const chipWrap = $("#triggerChips");
    triggerOptions.forEach(function (t) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = t;
      chip.addEventListener("click", function () {
        chip.classList.toggle("selected");
        if (chip.classList.contains("selected")) {
          triggers.add(t);
        } else {
          triggers.delete(t);
        }
      });
      chipWrap.appendChild(chip);
    });

    function updatePreview() {
      const meta = MS.MoodMeta[selectedMood];
      $("#previewEmoji").textContent = meta.emoji;
      $("#previewText").innerHTML =
        "<strong>" + meta.label + "</strong> feeling · Energy <strong>" + energy + "/5</strong> · Sleep <strong>" + sleep + "/5</strong>";
    }
    updatePreview();

    $("#saveMood").addEventListener("click", function () {
      const note = $("#moodNote").value.trim();
      MS.addMood({
        date: MS.todayKey(),
        score: selectedMood,
        energy: energy,
        sleep: sleep,
        triggers: Array.from(triggers),
        note: note
      });
      AUTH.apiFetch("/moods", {
        method: "POST",
        body: JSON.stringify({
          mood_score: selectedMood,
          energy_score: energy,
          triggers: Array.from(triggers),
          notes: note || null
        })
      }).catch(function () { /* keep local copy; backend will catch up later */ });
      UI.toast("Check-in saved. Thank you for showing up.", "success");
      $("#moodNote").value = "";
      triggers.forEach(function (t) {
        const chip = Array.from(chipWrap.children).find(function (c) { return c.textContent === t; });
        if (chip) chip.classList.remove("selected");
      });
      triggers.clear();
      renderHistory();
    });

    function renderHistory() {
      const d = MS.getData();
      const list = $("#moodHistory");
      const moods = (d.moods || []).sort(function (a, b) { return b.ts - a.ts; });
      if (!moods.length) {
        list.innerHTML = '<div class="glass-card card-pad empty-state"><div class="empty-icon">🌱</div><p>Your mood history will appear here after your first check-in.</p></div>';
        return;
      }
      list.innerHTML = moods.map(function (m) {
        const meta = MS.MoodMeta[m.score];
        return '<div class="glass-card entry-item lift"><div class="entry-main"><div class="entry-title">' +
          (meta ? meta.emoji + " " + meta.label : "") + " · Energy " + m.energy + "/5 · Sleep " + m.sleep + "/5" +
          "<span class='pill'>" + UI.formatDate(m.ts) + "</span></div>" +
          (m.triggers && m.triggers.length ? '<div class="entry-date">' + m.triggers.map(function (t) { return t; }).join(" · ") + "</div>" : "") +
          (m.note ? '<p class="entry-text">"' + UI.escapeHtml(m.note) + '"</p>' : "") + "</div>" +
          '<button class="btn btn-ghost btn-sm" data-del="' + m.id + '">Delete</button></div>';
      }).join("");

      $$("[data-del]", list).forEach(function (btn) {
        btn.addEventListener("click", function () {
          MS.removeItem("moods", btn.dataset.del);
          UI.toast("Entry removed");
          renderHistory();
          if ((window.innerWidth || 1) > 0 && window.location.hash === "#history") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        });
      });
    }

    renderHistory();
  }

  function bindSlider(sel, labelSel, cb) {
    const slider = $(sel);
    if (!slider) return;
    const label = $(labelSel);
    function update() {
      const v = Number(slider.value);
      label.textContent = v + "/5";
      cb(v);
    }
    slider.addEventListener("input", update);
  }

  /* ==============================
     JOURNAL
  ============================== */
  function initJournal() {
    const prompts = [
      "What is taking up most of your attention right now?",
      "What went well today, even in a small way?",
      "What is one thing you wish you could change about today?",
      "Describe a moment today when you felt most like yourself.",
      "What has been on your mind that you haven't said out loud?",
      "What are you looking forward to in the next 48 hours?",
      "What drained your energy today, and what refilled it?",
      "If a friend felt the way you do right now, what would you tell them?",
      "What did you learn about yourself this week?",
      "What is a kindness you received recently that you appreciated?",
      "Where in your body are you holding tension right now?",
      "What would make tomorrow noticeably better than today?"
    ];
    const dayIndex = new Date().getDate() % prompts.length;
    $("#journalPrompt").textContent = prompts[dayIndex];

    const ta = $("#journalText");
    const count = $("#wordCount");

    ta.addEventListener("input", function () {
      const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      count.textContent = words + " words · " + ta.value.length + " characters";
    });

    $("#saveJournal").addEventListener("click", function () {
      const text = ta.value.trim();
      if (!text) {
        UI.toast("Write a few lines before saving", "error");
        return;
      }
      MS.saveJournal({
        date: MS.todayKey(),
        prompt: prompts[dayIndex],
        text: text
      });
      UI.toast("Entry saved to your private journal", "success");
      ta.value = "";
      count.textContent = "0 words";
      renderJournal();
    });

    $("#exportJournal").addEventListener("click", function () {
      const d = MS.getData();
      if (!(d.journal || []).length) {
        UI.toast("Nothing to export yet", "error");
        return;
      }
      const lines = d.journal.map(function (j) {
        return "— " + UI.formatDate(j.ts) + "\n" + (j.prompt ? "Prompt: " + j.prompt + "\n" : "") + j.text + "\n";
      });
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mindsync-journal.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      UI.toast("Journal exported", "success");
    });

    function renderJournal() {
      const d = MS.getData();
      const list = $("#journalList");
      const entries = (d.journal || []).sort(function (a, b) { return b.ts - a.ts; });
      if (!entries.length) {
        list.innerHTML = '<div class="glass-card card-pad empty-state"><div class="empty-icon">🪶</div><p>Your entries are stored privately in this browser. Nothing you write is ever sent anywhere.</p></div>';
        return;
      }
      list.innerHTML = entries.map(function (j) {
        return '<div class="glass-card entry-item lift"><div class="entry-main"><div class="entry-title">Journal entry <span class="pill">' + UI.formatDate(j.ts) + '</span></div>' +
          (j.prompt ? '<div class="entry-date">' + UI.escapeHtml(j.prompt) + "</div>" : "") +
          '<p class="entry-text">' + UI.escapeHtml(j.text) + "</p></div>" +
          '<button class="btn btn-ghost btn-sm" data-del="' + j.id + '">Delete</button></div>';
      }).join("");

      $$("[data-del]", list).forEach(function (btn) {
        btn.addEventListener("click", function () {
          MS.removeItem("journal", btn.dataset.del);
          UI.toast("Entry deleted");
          renderJournal();
        });
      });
    }

    renderJournal();
  }

  /* ==============================
     BREATHING
  ============================== */
  function initBreathing() {
    const patterns = {
      box: { key: "box", name: "Box breathing", cycles: 4, phases: ["inhale", "hold", "exhale", "hold"], durs: [4, 4, 4, 4], desc: "4-4-4-4 · steady and composed" },
      "478": { key: "478", name: "478 technique", cycles: 4, phases: ["inhale", "hold", "exhale"], durs: [4, 7, 8], desc: "4-7-8 · for falling asleep" },
      coherent: { key: "coherent", name: "Coherent", cycles: 6, phases: ["inhale", "exhale"], durs: [5, 5], desc: "5-5 · calms the nervous system" }
    };

    let current = "box";
    let running = false;
    let sessionTimer = null;
    let patternRef = patterns.box;

    const patternCards = $("#patternCards");
    Object.keys(patterns).forEach(function (key) {
      const p = patterns[key];
      const card = document.createElement("div");
      card.className = "breath-pattern-card glass-card" + (key === current ? " selected" : "");
      card.innerHTML = "<h4>" + p.name + "</h4><p>" + p.desc + "</p>";
      card.addEventListener("click", function () {
        if (running) return;
        current = key;
        $$(".breath-pattern-card", patternCards).forEach(function (c) { c.classList.remove("selected"); });
        card.classList.add("selected");
      });
      patternCards.appendChild(card);
    });

    const orb = $("#breathOrb");
    const phaseLabel = $("#phaseLabel");
    const countEl = $("#breathCount");
    const cycleEl = $("#breathCycle");
    const startBtn = $("#startBreath");
    const sessionView = $("#sessionView");
    const setupView = $("#setupView");
    const summaryView = $("#summaryView");
    const orbWrap = $("#breathOrbWrap");

    function stop() {
      running = false;
      if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }
      orb.classList.remove("phase-inhale", "phase-exhale", "phase-hold");
      startBtn.removeAttribute("disabled");
    }

    function start(pKey) {
      const p = patterns[pKey];
      patternRef = p;
      startBtn.setAttribute("disabled", "disabled");
      setupView.classList.add("hide");
      sessionView.classList.remove("hide");
      summaryView.classList.add("hide");
      running = true;

      let queue = [];
      for (let c = 1; c <= p.cycles; c += 1) {
        p.phases.forEach(function (ph, i) {
          queue.push({ phase: ph, dur: p.durs[i], cycle: c });
        });
      }

      let idx = 0;
      let lastIdx = -1;
      let remaining = 0;
      cycleEl.textContent = "Cycle 1 / " + p.cycles;

      function tick() {
        if (!running || idx >= queue.length) { finish(); return; }
        const step = queue[idx];
        if (lastIdx !== idx) {
          lastIdx = idx;
          remaining = step.dur;
          phaseLabel.textContent = cap(step.phase);
          orb.className = "breath-orb phase-" + step.phase;
          orb.style.transitionDuration = step.dur + "s";
          cycleEl.textContent = "Cycle " + step.cycle + " / " + p.cycles;
        }
        countEl.textContent = remaining;
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          idx += 1;
        }
      }

      sessionTimer = setInterval(tick, 1000);
      tick();

      function finish() {
        stop();
        const minutes = (p.durs.reduce(function (a, b) { return a + b; }, 0) * p.cycles) / 60;
        MS.addBreathing({ date: MS.todayKey(), pattern: p.name, cycles: p.cycles, minutes: Math.round(minutes * 10) / 10, ts: Date.now() });
        sessionView.classList.add("hide");
        summaryView.classList.remove("hide");
        $("#summaryTitle").textContent = p.name + " complete";
        $("#summaryStats").textContent = p.cycles + " cycles · " + Math.round(minutes * 10) / 10 + " minutes";
        UI.toast("Session logged to your history", "success");
      }
    }

    function showSetup() {
      stop();
      sessionView.classList.add("hide");
      summaryView.classList.add("hide");
      setupView.classList.remove("hide");
    }

    startBtn.addEventListener("click", function () {
      start(current);
    });

    $("#endBreath").addEventListener("click", showSetup);

    $("#againBreath").addEventListener("click", function () {
      start(patternRef.key || "box");
    });

    $("#againBreath2").addEventListener("click", showSetup);

    const logWrap = $("#breathLog");
    function renderLog() {
      const d = MS.getData();
      const sessions = (d.breathing || []).sort(function (a, b) { return b.ts - a.ts; });
      if (!sessions.length) {
        logWrap.innerHTML = '<div class="glass-card card-pad empty-state"><div class="empty-icon">🌬️</div><p>Finished breathing sessions will be logged here.</p></div>';
        return;
      }
      logWrap.innerHTML = sessions.map(function (s) {
        return '<div class="glass-card entry-item lift"><div class="entry-main"><div class="entry-title">' + UI.escapeHtml(s.pattern) + "</div>" +
        '<div class="entry-date">' + UI.formatDate(s.ts) + " · " + s.cycles + " cycles · " + s.minutes + " min</div></div></div>";
      }).join("");
    }
    renderLog();
  }

  function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
  }

  /* ==============================
     COACH
  ============================== */
  function initCoach() {
    const chatBody = $("#chatBody");
    const input = $("#coachInput");
    const sendBtn = $("#sendCoach");
    const suggestions = $("#coachSuggestions");

    const d = MS.getData();
    const moodToday = (d.moods || []).find(function (m) { return m.date === MS.todayKey(); });
    const journals = (d.journal || []).sort(function (a, b) { return b.ts - a.ts; })[0];

    function addBubble(text, who) {
      const b = document.createElement("div");
      b.className = "chat-bubble " + who;
      b.innerHTML = UI.escapeHtml(text) + '<span class="chat-time">' + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</span>";
      chatBody.appendChild(b);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTyping() {
      const t = document.createElement("div");
      t.className = "chat-typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      chatBody.appendChild(t);
      chatBody.scrollTop = chatBody.scrollHeight;
      return t;
    }

    addBubble("Hi " + (UI.greeting() || "friend").toLowerCase() + " — I'm your reflective coach. I listen, ask gentle questions, and help you notice patterns. I'm not a therapist, and I keep everything here.", "coach");

    function respond(text) {
      return AUTH.apiFetch("/coach/chat", {
        method: "POST",
        body: JSON.stringify({ message: text })
      }).then(function (data) {
        return data && data.reply ? data.reply : "I'm here. Tell me more.";
      });
    }

    function send(text) {
      if (sendBtn.disabled) return;
      text = (text || "").trim();
      if (!text) return;
      addBubble(text, "user");
      input.value = "";
      sendBtn.disabled = true;
      const typing = showTyping();
      respond(text).then(function (reply) {
        typing.remove();
        addBubble(reply, "coach");
        chatBody.scrollTop = chatBody.scrollHeight;
      }).catch(function () {
        typing.remove();
        addBubble("I ran into a hiccup reaching the service. Try again in a moment.", "coach");
        chatBody.scrollTop = chatBody.scrollHeight;
      }).finally(function () {
        sendBtn.disabled = false;
      });
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    sendBtn.addEventListener("click", function () { send(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") send(input.value);
    });

    const chips = [
      "I feel a bit low today",
      "Help me calm down",
      "What should I journal about?",
      "How do my patterns look?"
    ];
    chips.forEach(function (c) {
      const s = document.createElement("button");
      s.className = "coach-suggestion";
      s.textContent = c;
      s.addEventListener("click", function () { send(c); });
      suggestions.appendChild(s);
    });

    const dWrap = $("#coachDataBox");
    if (moodToday) {
      const meta = MS.MoodMeta[moodToday.score];
      dWrap.innerHTML = "<div class='row'><span class='entry-badge' style='font-size:1.4rem'>" + meta.emoji + "</span><span class='muted' style='font-size:.9rem'>Today's check-in: <strong style='color:#fff'>" + meta.label + "</strong></span></div>";
    } else if (journals) {
      dWrap.innerHTML = "<div class='muted' style='font-size:.9rem'>Last journal entry: <strong style='color:#fff'>" + UI.escapeHtml(shorten(journals.text, 60)) + "</strong></div>";
    } else {
      dWrap.innerHTML = "<div class='muted' style='font-size:.9rem'>No data yet — a first check-in helps me reflect with you.</div>";
    }

    AUTH.apiFetch("/coach/history?limit=50").then(function (data) {
      const items = (data && data.items) || [];
      items.forEach(function (msg) {
        if (msg.role === "user" || msg.role === "assistant") {
          addBubble(msg.content, msg.role);
        }
      });
    }).catch(function () { /* history optional */ });
  }

  /* ==============================
     ANALYTICS
  ============================== */
  function initAnalytics() {
    const d = MS.getData();
    const moods = (d.moods || []).sort(function (a, b) { return a.ts - b.ts; });

    if (!moods.length) {
      $("#analyticsContent").innerHTML = '<div class="glass-card card-pad empty-state"><div class="empty-icon">📊</div><p>Log your first few mood check-ins and your analytics will appear here automatically.</p><div class="mt-3"><a class="btn btn-primary" href="mood.html">Start a check-in →</a></div></div>';
      return;
    }

    const chartColors = {
      accents: [P.accent, P.accent2, P.accent3, P.green, "#5c8aff", "#ffd166", "#8ae2ff", "#ff8c5c"]
    };

    const last14 = moods.slice(-14);
    const labels = last14.map(function (m) { return MS.todayKey(new Date(m.ts)); }).map(function (k) {
      const p = k.split("-");
      return p[1] + "/" + p[2];
    });
    const scores = last14.map(function (m) { return m.score; });
    const energies = last14.map(function (m) { return m.energy; });

    new Chart($("#moodTrendChart"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          { label: "Mood", data: scores, borderColor: P.accent, backgroundColor: "rgba(124,92,255,0.15)", fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: P.accent },
          { label: "Energy", data: energies, borderColor: P.accent2, backgroundColor: "transparent", borderDash: [5, 4], tension: 0.35, pointRadius: 3, pointBackgroundColor: P.accent2 }
        ]
      },
      options: baseChartOpts("Mood (1-5) · Energy (1-5)", [0.4, 5.6])
    });

    const byWeekday = weekdayAverages(moods);
    new Chart($("#weekdayChart"), {
      type: "bar",
      data: {
        labels: Object.keys(byWeekday),
        datasets: [{ label: "Average mood", data: Object.values(byWeekday), backgroundColor: "rgba(0,212,255,0.55)", borderRadius: 8 }]
      },
      options: baseChartOpts("Average mood by weekday", [0.4, 5.6])
    });

    const triggerCounts = {};
    moods.forEach(function (m) {
      (m.triggers || []).forEach(function (tr) {
        triggerCounts[tr] = (triggerCounts[tr] || 0) + 1;
      });
    });
    const trigLabels = Object.keys(triggerCounts);
    if (trigLabels.length) {
      new Chart($("#triggerChart"), {
        type: "doughnut",
        data: {
          labels: trigLabels,
          datasets: [{ data: trigLabels.map(function (k) { return triggerCounts[k]; }), backgroundColor: chartColors.accents, borderWidth: 2, borderColor: "#0d0a04" }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: P.muted } } }
        }
      });
    } else {
      $("#triggerChartWrap").innerHTML = '<div class="empty-state"><p>Trigger tags will appear once you start using them in check-ins.</p></div>';
    }

    const avg = moods.reduce(function (s, m) { return s + m.score; }, 0) / moods.length;
    const avgEnergy = moods.reduce(function (s, m) { return s + m.energy; }, 0) / moods.length;
    $("#statAvgMood").textContent = avg.toFixed(1) + "/5";
    $("#statAvgEnergy").textContent = avgEnergy.toFixed(1) + "/5";
    $("#statTotal").textContent = moods.length;
    $("#statRange").textContent = moods.length > 1 ? Math.round((moods[moods.length - 1].ts - moods[0].ts) / 86400000) + " days" : "Just started";
  }

  function weekdayAverages(moods) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const sums = {};
    const counts = {};
    moods.forEach(function (m) {
      const wd = new Date(m.ts).getDay();
      sums[wd] = (sums[wd] || 0) + m.score;
      counts[wd] = (counts[wd] || 0) + 1;
    });
    const out = {};
    days.forEach(function (name, i) {
      out[name] = counts[i] ? Math.round((sums[i] / counts[i]) * 10) / 10 : null;
    });
    return out;
  }

  function baseChartOpts(tooltipTitle, yRange) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { color: P.muted }, grid: { color: P.grid } },
        y: { min: yRange[0], max: yRange[1], ticks: { stepSize: 1, color: P.muted }, grid: { color: P.grid } }
      },
      plugins: {
        legend: { labels: { color: P.muted, boxWidth: 12 } },
        tooltip: { backgroundColor: "rgba(12,15,27,0.95)", titleColor: P.text, borderColor: "rgba(255,255,255,0.14)", borderWidth: 1 }
      }
    };
  }

  /* ==============================
     INSIGHTS
  ============================== */
  function initInsights() {
    const list = $("#insightsList");

    function card(emoji, label, title, text) {
      return '<div class="glass-card insight-card fade-up"><div class="insight-emoji">' + emoji + "</div>" +
        '<span class="insight-tag-label">' + label + "</span><h3>" + title + "</h3><p>" + text + "</p></div>";
    }

    list.innerHTML = '<div class="glass-card card-pad empty-state"><div class="empty-icon">✨</div><p>Looking over your patterns…</p></div>';

    AUTH.apiFetch("/insights").then(function (data) {
      const recs = (data && data.recommendations) || [];
      const pats = (data && data.trigger_patterns) || [];
      const summary = data && data.summary ? data.summary : "";
      const icons = ["🌱", "🌸", "🌿", "💡"];

      if (!recs.length) {
        list.innerHTML = card("🌱", "Getting started",
          "Your insights begin with a single check-in",
          "The more you check in, the sharper these patterns become. Try logging a mood today — it takes less than a minute.");
        return;
      }

      let html = "";
      if (summary) {
        html += card("💭", "Overview", "What your data is telling you", summary);
      }
      recs.slice(0, 4).forEach(function (rec, i) {
        html += card(icons[i % icons.length], "Recommendation", "Recommendation " + (i + 1), rec);
      });
      pats.slice(0, 3).forEach(function (pat, i) {
        html += card("🔍", "Pattern", "Pattern " + (i + 1), pat);
      });
      list.innerHTML = html;
    }).catch(function () {
      list.innerHTML = card("💭", "Summary",
        "Insights are taking a breather",
        "Couldn't reach the insights service right now. Make sure the backend is running and try again in a moment.");
    });
  }

  /* ==============================
     PROFILE
  ============================== */
  function initProfile() {
    if (!AUTH || !AUTH.isAuthenticated() || !AUTH.getUser()) return;

    const user = AUTH.getUser();
    const avatar = $("#profileAvatar");
    const nameDisplay = $("#profileNameDisplay");
    const emailEl = $("#profileEmailText");
    const joinedEl = $("#profileJoined");
    const nameInput = $("#profileName");
    const form = $("#profileNameForm");
    const saveBtn = $("#profileSaveBtn");
    const errEl = $("#profileNameError");
    const signOutBtn = $("#profileSignOutBtn");

    function initialsFor(u) {
      const name = (u.full_name || "").trim();
      if (name) {
        const parts = name.split(/\s+/);
        const first = parts[0] ? parts[0].charAt(0) : "";
        const last = parts.length > 1 ? parts[1].charAt(0) : "";
        return (first + last).toUpperCase();
      }
      if (u.email) return u.email.charAt(0).toUpperCase();
      return "?";
    }

    function renderProfile() {
      avatar.textContent = initialsFor(user);
      nameDisplay.textContent = AUTH.displayName(user);
      emailEl.textContent = user.email || "";
      if (nameInput) nameInput.value = user.full_name || "";
      if (user.created_at) {
        try {
          const d = new Date(user.created_at);
          joinedEl.textContent = d.toLocaleDateString(undefined, {
            year: "numeric", month: "long", day: "numeric"
          });
        } catch (e) {
          joinedEl.textContent = "";
        }
      }
    }

    function loadStats() {
      Promise.all([
        AUTH.apiFetch("/moods/history?limit=500").catch(function () { return { items: [] }; }),
        AUTH.apiFetch("/journal/history?limit=500").catch(function () { return { items: [] }; })
      ]).then(function (results) {
        $("#statProfileMoods").textContent = results[0].items.length;
        $("#statProfileJournal").textContent = results[1].items.length;
      });
    }

    if (form && saveBtn) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (errEl) errEl.style.display = "none";
        const next = (nameInput.value || "").trim();
        if (!next) {
          if (errEl) { errEl.textContent = "Enter a name to display."; errEl.style.display = "block"; }
          return;
        }
        saveBtn.disabled = true;
        AUTH.apiFetch("/users/me", {
          method: "PUT",
          body: JSON.stringify({ full_name: next })
        }).then(function (updated) {
          AUTH.saveUser(updated);
          user.full_name = updated.full_name;
          renderProfile();
          UI.toast("Display name updated.", "success");
        }).catch(function (error) {
          if (errEl) {
            errEl.textContent = error && error.message ? error.message : "Could not update your name.";
            errEl.style.display = "block";
          }
        }).finally(function () {
          saveBtn.disabled = false;
        });
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener("click", function () {
        AUTH.logout();
      });
    }

    AUTH.fetchCurrentUser()
      .then(function (fresh) {
        user.full_name = fresh.full_name;
        renderProfile();
      })
      .catch(function () { /* keep cached user on failure */ });

    renderProfile();
    loadStats();
  }
})();