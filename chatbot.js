/* AttendEase Chatbot widget
   Frontend-only assistant: uses local FAQ/intent matching and reads AttendEase LocalStorage.
   A real generative AI connection requires a secure backend/API; never put a private API key here.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "attendEaseData";
  const CHATBOT_CSS = "chatbot.css";

  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = CHATBOT_CSS;
  document.head.appendChild(styleLink);

  const icon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2c-4.8 0-8.7 3.2-8.7 7.2 0 2.2 1.2 4.2 3.2 5.5l-.7 3.1 3.5-1.7c.9.2 1.8.3 2.7.3 4.8 0 8.7-3.2 8.7-7.2S16.8 3.2 12 3.2Z"/>
      <path d="M8.1 10.5h.1m3.8 0h.1m3.8 0h.1" class="bot-dots"/>
    </svg>`;

  const widget = document.createElement("div");
  widget.id = "attendease-chatbot";
  widget.innerHTML = `
    <button class="ae-chat-launcher" id="aeChatLauncher" aria-label="Open AttendEase assistant" aria-expanded="false">
      ${icon}<span class="ae-launcher-pulse"></span>
    </button>

    <section class="ae-chat-panel" id="aeChatPanel" aria-label="AttendEase assistant" aria-hidden="true">
      <header class="ae-chat-header">
        <div class="ae-bot-avatar">${icon}</div>
        <div class="ae-chat-heading">
          <strong>AttendEase Assistant</strong>
          <span><i></i> Here to help you</span>
        </div>
        <button class="ae-chat-close" id="aeChatClose" aria-label="Close chat">×</button>
      </header>

      <div class="ae-chat-messages" id="aeChatMessages" aria-live="polite">
        <div class="ae-message ae-bot-message">
          <div class="ae-message-avatar">A</div>
          <div class="ae-message-content">
            <div class="ae-message-bubble">Hi! 👋 I'm your AttendEase assistant. Ask me about attendance, safe bunks, subjects, or how to use the website.</div>
            <span class="ae-message-time">Just now</span>
          </div>
        </div>
      </div>

      <div class="ae-chat-suggestions" id="aeChatSuggestions">
        <button type="button" data-prompt="How is my overall attendance calculated?">Attendance formula</button>
        <button type="button" data-prompt="How many classes can I bunk?">Safe bunks</button>
        <button type="button" data-prompt="How do I mark attendance?">How to mark attendance</button>
      </div>

      <form class="ae-chat-input-area" id="aeChatForm">
        <input id="aeChatInput" type="text" maxlength="500" autocomplete="off" placeholder="Type your question..." aria-label="Type your question">
        <button type="submit" id="aeChatSend" aria-label="Send message">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14"/></svg>
        </button>
      </form>
      <div class="ae-chat-disclaimer">AttendEase helper · Demo assistant, not a live AI service</div>
    </section>
  `;
  document.body.appendChild(widget);

  const launcher = document.getElementById("aeChatLauncher");
  const panel = document.getElementById("aeChatPanel");
  const close = document.getElementById("aeChatClose");
  const messages = document.getElementById("aeChatMessages");
  const form = document.getElementById("aeChatForm");
  const input = document.getElementById("aeChatInput");
  const suggestions = document.getElementById("aeChatSuggestions");

  function openChat() {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    launcher.classList.add("is-hidden");
    window.setTimeout(() => input.focus(), 180);
  }

  function closeChat() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.classList.remove("is-hidden");
    launcher.focus();
  }

  launcher.addEventListener("click", openChat);
  close.addEventListener("click", closeChat);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) closeChat();
  });

  function getData() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!value || typeof value !== "object") return null;
      return {
        profile: value.profile || {},
        subjects: Array.isArray(value.subjects) ? value.subjects : [],
        attendance: Array.isArray(value.attendance) ? value.attendance : [],
        timetable: Array.isArray(value.timetable) ? value.timetable : [],
        settings: value.settings || {}
      };
    } catch (_) {
      return null;
    }
  }

  function getOverall(data) {
    const records = data.attendance.filter(item => item.status !== "Cancelled");
    const attended = records.filter(item => item.status === "Present").length;
    const total = records.length;
    return { attended, total, absent: total - attended, percent: total ? attended / total * 100 : 0 };
  }

  function getSubjectStats(data, subject) {
    const records = data.attendance.filter(item => item.subjectId === subject.id && item.status !== "Cancelled");
    const attended = records.filter(item => item.status === "Present").length;
    const total = records.length;
    return { attended, total, percent: total ? attended / total * 100 : 0 };
  }

  function safeBunks(attended, total, target) {
    const fraction = Number(target || 75) / 100;
    if (!total || fraction <= 0 || fraction > 1 || attended / total < fraction - 1e-10) return 0;
    return Math.max(0, Math.floor(attended / fraction - total + 1e-10));
  }

  function recoveryClasses(attended, total, target) {
    const fraction = Number(target || 75) / 100;
    if (fraction <= 0 || fraction >= 1 || !total || attended / total >= fraction) return 0;
    return Math.ceil((fraction * total - attended) / (1 - fraction) - 1e-10);
  }

  function answerQuestion(raw) {
    const q = raw.toLowerCase().trim();
    const data = getData();
    const name = data?.profile?.name?.trim().split(/\s+/)[0] || "there";

    if (/^(hi|hello|hey|hii|good morning|good evening)\b/.test(q)) {
      return `Hey ${name}! 😊 What would you like to know about AttendEase?`;
    }

    if (/(my name|change name|edit profile|profile)/.test(q)) {
      return "You can update your name, college, and course by clicking your circular profile button at the top-right of the dashboard.";
    }

    if (/(formula|calculate|calculated|percentage|attendance.*how)/.test(q)) {
      return "AttendEase calculates attendance as: (Present classes ÷ Conducted classes) × 100. Absent classes count as conducted, while Cancelled classes are excluded.";
    }

    if (/(bunk|skip|miss class|safe leave)/.test(q)) {
      if (!data) return "Add your subjects and mark attendance first. Then open Bunk Calculator to see your overall and subject-wise safe bunks.";
      const st = getOverall(data);
      const target = Number(data.settings.overallTarget || 75);
      if (!st.total) return "You haven't recorded any classes yet. Mark a few classes first, then I can help explain your bunk calculation.";
      const bunks = safeBunks(st.attended, st.total, target);
      const needed = recoveryClasses(st.attended, st.total, target);
      if (st.percent < target) return `Your current overall attendance is ${st.percent.toFixed(1)}%, below your ${target}% target. You need to attend approximately ${needed} consecutive classes to reach the target.`;
      return `Your current overall attendance is ${st.percent.toFixed(1)}%. Based on your ${target}% target, you can miss up to ${bunks} consecutive class(es) before falling below it. This is a mathematical estimate—check your college's attendance rules too.`;
    }

    if (/(overall|my attendance|attendance status|attendance summary)/.test(q)) {
      if (!data) return "I can't find your AttendEase data yet. Add your name and start recording classes on the dashboard.";
      const st = getOverall(data);
      if (!st.total) return "No classes have been recorded yet. Use Mark Attendance to add your first class.";
      return `${name}, your overall attendance is ${st.percent.toFixed(1)}% (${st.attended} present out of ${st.total} conducted classes). You have ${st.absent} absences.`;
    }

    if (/(subject|subjects|course list)/.test(q)) {
      if (!data?.subjects?.length) return "You haven't added any subjects yet. Open My Subjects → Add Subject to get started.";
      const lines = data.subjects.map(s => {
        const st = getSubjectStats(data, s);
        return `${s.name}: ${st.percent.toFixed(1)}% (${st.attended}/${st.total}), target ${s.target || 75}%`;
      });
      return `Here is your subject summary:\n${lines.join("\n")}`;
    }

    if (/(mark|record|add attendance|present|absent)/.test(q)) {
      return "To record a class: open Dashboard and click Mark Attendance, or go to My Subjects and choose Mark Class. Select the subject, date, and Present, Absent, or Cancelled status, then save.";
    }

    if (/(cancelled|canceled)/.test(q)) {
      return "Use the Cancelled status when a class did not take place. Cancelled classes are excluded from both the attended and conducted class totals.";
    }

    if (/(timetable|schedule|class time)/.test(q)) {
      return "Open Timetable from the left menu, choose Add Class, select a subject and day, enter start/end times and an optional room, then save.";
    }

    if (/(calendar|date|history)/.test(q)) {
      return "Open Attendance Calendar from the left menu. Use the arrows to change month and select a date to see the attendance records for that day.";
    }

    if (/(chart|analytics|graph|report|pdf|download)/.test(q)) {
      return "Open Analytics to see your subject performance, attendance distribution, and recent trend charts. Use Print report / Save PDF to print or save a report as a PDF.";
    }

    if (/(dark|theme|mode)/.test(q)) {
      return "Use the Dark mode / Light mode control near the bottom of the left sidebar to switch the website appearance.";
    }

    if (/(save|saved|refresh|localstorage|local storage|data.*store)/.test(q)) {
      return "AttendEase automatically saves your profile, subjects, attendance, timetable, and theme in this browser's LocalStorage. Your data remains after refresh on the same browser and device, but it does not sync to other devices. Clearing browser site data can erase it.";
    }

    if (/(backup|other device|another device|transfer|export data)/.test(q)) {
      return "This version stores data only in the current browser and does not yet include a data backup/import tool. Avoid clearing browser data if you need to keep your records.";
    }

    if (/(login|sign in|register|account)/.test(q)) {
      return "AttendEase is designed without login or registration. You enter a student name and use a local profile in this browser. It is not a secure account system.";
    }

    if (/(thank|thanks|thx)/.test(q)) {
      return "You're welcome! 😊 Keep your attendance on track. Let me know if you need help with another AttendEase feature.";
    }

    return "I can help with attendance percentage, safe bunks, subject records, marking attendance, timetable, calendar, analytics, dark mode, and LocalStorage. Try asking one of those topics.";
  }

  function addMessage(text, sender) {
    const row = document.createElement("div");
    row.className = `ae-message ${sender === "user" ? "ae-user-message" : "ae-bot-message"}`;
    const avatar = document.createElement("div");
    avatar.className = "ae-message-avatar";
    avatar.textContent = sender === "user" ? "You" : "A";
    const content = document.createElement("div");
    content.className = "ae-message-content";
    const bubble = document.createElement("div");
    bubble.className = "ae-message-bubble";
    // textContent prevents user input from being interpreted as HTML.
    bubble.textContent = text;
    const time = document.createElement("span");
    time.className = "ae-message-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    content.append(bubble, time);
    row.append(avatar, content);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "ae-typing";
    typing.id = "aeTyping";
    typing.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function sendMessage(text) {
    const clean = text.trim();
    if (!clean) return;
    addMessage(clean, "user");
    input.value = "";
    suggestions.classList.add("ae-suggestions-hidden");
    showTyping();
    window.setTimeout(() => {
      document.getElementById("aeTyping")?.remove();
      addMessage(answerQuestion(clean), "bot");
    }, 420);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage(input.value);
  });

  suggestions.addEventListener("click", event => {
    const button = event.target.closest("[data-prompt]");
    if (button) sendMessage(button.dataset.prompt);
  });
})();
