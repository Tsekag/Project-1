(function () {
  "use strict";

  const CAROUSEL_SLIDES = [
    {
      image:
        "https://www.gstatic.com/meet/user_edu_get_a_link_light_90698cd7b4ca04d3005c962a3756c42d.svg",
      title: "Get a link you can share",
      html: 'Click <strong>New meeting</strong> to get a link you can send to people you want to meet with',
    },
    {
      image:
        "https://www.gstatic.com/meet/user_edu_scheduling_light_b352efa017e4f8f1ffda43e847820322.svg",
      title: "Plan ahead",
      html: "Click <strong>New meeting</strong> to schedule meetings in Google Calendar and send invites",
    },
    {
      image:
        "https://www.gstatic.com/meet/user_edu_safety_light_e04a2bbb449524ef7e49ea36d5f25b65.svg",
      title: "Your meeting is safe",
      html: "No one can join a meeting unless invited or admitted by the host",
    },
  ];

  const MEET_CODE_PATTERN = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;
  const MEET_URL_PATTERN =
    /(?:https?:\/\/)?(?:meet\.google\.com\/)([a-z]{3}-[a-z]{4}-[a-z]{3})/i;

  let carouselIndex = 0;
  let meetingLink = "";
  let activeNavTrigger = null;

  const SETTINGS_KEY = "meet-landing-settings";
  const ACCOUNT_KEY = "meet-landing-account";

  const DEFAULT_SETTINGS = {
    defaultMic: true,
    defaultCamera: true,
    noiseCancellation: false,
  };

  const DEFAULT_ACCOUNT = {
    name: "Example User",
    email: "example@gmail.com",
  };

  const SUPPORT_LINKS = [
    {
      label: "Help center",
      url: "https://support.google.com/meet",
    },
    {
      label: "Join a meeting",
      url: "https://support.google.com/meet/answer/9303069",
    },
    {
      label: "Start or schedule meetings",
      url: "https://support.google.com/meet/answer/9302740",
    },
    {
      label: "Troubleshoot audio & video",
      url: "https://support.google.com/meet/answer/9302964",
    },
  ];

  const GOOGLE_APPS = [
    { name: "Account", url: "https://myaccount.google.com/" },
    { name: "Gmail", url: "https://mail.google.com/" },
    { name: "Drive", url: "https://drive.google.com/" },
    { name: "Calendar", url: "https://calendar.google.com/" },
    { name: "Meet", url: "https://meet.google.com/" },
    { name: "Chat", url: "https://chat.google.com/" },
    { name: "Docs", url: "https://docs.google.com/" },
    { name: "Sheets", url: "https://sheets.google.com/" },
    { name: "Slides", url: "https://slides.google.com/" },
  ];

  const timeEl = document.querySelector(".time");
  const logoBtn = document.querySelector(".logo-btn");
  const meetingInput = document.querySelector(".join-container input");
  const newMeetingBtn = document.querySelector(".new-meeting");
  const joinBtn = document.querySelector(".join-btn");
  const keyboardBtn = document.querySelector(".keyboard-icon");
  const carouselImg = document.querySelector(".carousel-container img");
  const carouselTitle = document.querySelector(".carousel-text h2");
  const carouselDesc = document.querySelector(".carousel-text p");
  const prevBtn = document.querySelector(".nav-btn.prev");
  const nextBtn = document.querySelector(".nav-btn.next");
  const dots = document.querySelectorAll(".dots .dot");
  const learnMore = document.querySelector(".learn-more");

  function formatHeaderTime(date) {
    const time = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const weekday = date.toLocaleDateString(undefined, {
      weekday: "short",
    });
    const monthDay = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${time} • ${weekday}, ${monthDay}`;
  }

  function updateClock() {
    if (!timeEl) return;
    const now = new Date();
    timeEl.textContent = formatHeaderTime(now);
    timeEl.dateTime = now.toISOString();
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadAccount() {
    try {
      const raw = localStorage.getItem(ACCOUNT_KEY);
      if (!raw) return { ...DEFAULT_ACCOUNT };
      return { ...DEFAULT_ACCOUNT, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_ACCOUNT };
    }
  }

  function updateProfileInitial() {
    const profileBtn = document.querySelector('.nav-trigger[data-nav="account"]');
    const account = loadAccount();
    if (profileBtn && account.email) {
      profileBtn.textContent = account.email.charAt(0).toUpperCase();
      profileBtn.title = `${account.name} (${account.email})`;
    }
  }

  function generateMeetingCode() {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const segment = (len) =>
      Array.from({ length: len }, () =>
        alphabet[Math.floor(Math.random() * alphabet.length)]
      ).join("");
    return `${segment(3)}-${segment(4)}-${segment(3)}`;
  }

  function normalizeJoinInput(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const urlMatch = trimmed.match(MEET_URL_PATTERN);
    if (urlMatch) return urlMatch[1].toLowerCase();

    const codeOnly = trimmed.replace(/\s+/g, "");
    if (MEET_CODE_PATTERN.test(codeOnly)) {
      return codeOnly.toLowerCase();
    }
    return null;
  }

  function showToast(message, type) {
    let toast = document.querySelector(".app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "app-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.type = type || "info";
    toast.classList.add("visible");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("visible"), 3200);
  }

  function closeModal() {
    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
  }

  function closeNavPopover() {
    const popover = document.querySelector(".nav-popover");
    if (popover) popover.remove();
    if (activeNavTrigger) {
      activeNavTrigger.setAttribute("aria-expanded", "false");
      activeNavTrigger = null;
    }
  }

  function positionPopover(popover, trigger) {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    popover.style.top = `${rect.bottom + margin}px`;
    popover.style.left = `${Math.max(12, rect.right - popover.offsetWidth)}px`;
  }

  function openNavPopover(trigger, renderContent) {
    const sameTrigger = activeNavTrigger === trigger;
    closeNavPopover();
    if (sameTrigger) return;

    const popover = document.createElement("div");
    popover.className = "nav-popover";
    popover.setAttribute("role", "menu");
    renderContent(popover);
    document.body.appendChild(popover);
    positionPopover(popover, trigger);

    activeNavTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");

    const onDocClick = (e) => {
      if (
        popover.contains(e.target) ||
        trigger.contains(e.target)
      ) {
        return;
      }
      closeNavPopover();
      document.removeEventListener("click", onDocClick);
    };
    setTimeout(() => document.addEventListener("click", onDocClick), 0);
  }

  function openMeetingModal(link, code) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-labelledby="modal-title">
        <h2 id="modal-title">Here's your meeting link</h2>
        <p>Send this to people you want to meet with. Make sure you save it so you can use it later, too.</p>
        <div class="modal-link-row">
          <input type="text" readonly value="${link}" class="modal-link-input" />
          <button type="button" class="modal-copy-btn">Copy</button>
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-join-now">Join now</button>
          <button type="button" class="modal-close">Dismiss</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const copyBtn = backdrop.querySelector(".modal-copy-btn");
    const linkInput = backdrop.querySelector(".modal-link-input");
    const joinNow = backdrop.querySelector(".modal-join-now");
    const dismiss = backdrop.querySelector(".modal-close");

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link);
        showToast("Meeting link copied", "success");
      } catch {
        linkInput.select();
        document.execCommand("copy");
        showToast("Meeting link copied", "success");
      }
    });

    joinNow.addEventListener("click", () => {
      window.open(link, "_blank", "noopener,noreferrer");
    });

    dismiss.addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
  }

  function handleNewMeeting() {
    const code = generateMeetingCode();
    meetingLink = `https://meet.google.com/${code}`;
    if (meetingInput) {
      meetingInput.value = code;
    }
    openMeetingModal(meetingLink, code);
    updateCarousel(0);
  }

  function handleJoin() {
    if (!meetingInput) return;
    const code = normalizeJoinInput(meetingInput.value);
    if (!code) {
      meetingInput.classList.add("input-error");
      showToast("Enter a valid meeting code (e.g. abc-defg-hij) or link", "error");
      meetingInput.focus();
      return;
    }
    meetingInput.classList.remove("input-error");
    const url = `https://meet.google.com/${code}`;
    showToast("Opening Google Meet…", "info");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function updateCarousel(index) {
    carouselIndex = (index + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length;
    const slide = CAROUSEL_SLIDES[carouselIndex];
    if (carouselImg) carouselImg.src = slide.image;
    if (carouselTitle) carouselTitle.textContent = slide.title;
    if (carouselDesc) carouselDesc.innerHTML = slide.html;
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === carouselIndex);
    });
  }

  function openExternal(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openSupportMenu(trigger) {
    openNavPopover(trigger, (popover) => {
      popover.innerHTML = `
        <p class="nav-popover-title">Help & resources</p>
        <ul class="nav-menu-list"></ul>
      `;
      const list = popover.querySelector(".nav-menu-list");
      SUPPORT_LINKS.forEach((item) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "nav-menu-item";
        btn.textContent = item.label;
        btn.addEventListener("click", () => {
          closeNavPopover();
          openExternal(item.url);
        });
        li.appendChild(btn);
        list.appendChild(li);
      });
    });
  }

  function openAppsMenu(trigger) {
    openNavPopover(trigger, (popover) => {
      popover.classList.add("nav-popover-apps");
      popover.innerHTML = `<p class="nav-popover-title">Google apps</p><div class="apps-grid"></div>`;
      const grid = popover.querySelector(".apps-grid");
      GOOGLE_APPS.forEach((app) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "app-tile";
        btn.innerHTML = `<span class="app-tile-icon">${app.name.charAt(0)}</span><span>${app.name}</span>`;
        btn.addEventListener("click", () => {
          closeNavPopover();
          openExternal(app.url);
        });
        grid.appendChild(btn);
      });
      requestAnimationFrame(() => positionPopover(popover, trigger));
    });
  }

  function openAccountMenu(trigger) {
    const account = loadAccount();
    openNavPopover(trigger, (popover) => {
      popover.innerHTML = `
        <div class="account-header">
          <div class="account-avatar">${account.email.charAt(0).toUpperCase()}</div>
          <div>
            <p class="account-name">${account.name}</p>
            <p class="account-email">${account.email}</p>
          </div>
        </div>
        <ul class="nav-menu-list">
          <li><button type="button" class="nav-menu-item" data-action="manage">Manage your Google Account</button></li>
          <li><button type="button" class="nav-menu-item" data-action="add-account">Add another account</button></li>
          <li><button type="button" class="nav-menu-item nav-menu-danger" data-action="sign-out">Sign out</button></li>
        </ul>
      `;
      popover.querySelector('[data-action="manage"]').addEventListener("click", () => {
        closeNavPopover();
        openExternal("https://myaccount.google.com/");
      });
      popover.querySelector('[data-action="add-account"]').addEventListener("click", () => {
        closeNavPopover();
        openExternal("https://accounts.google.com/AddSession");
      });
      popover.querySelector('[data-action="sign-out"]').addEventListener("click", () => {
        closeNavPopover();
        localStorage.removeItem(ACCOUNT_KEY);
        updateProfileInitial();
        showToast("Signed out (demo)", "success");
      });
      requestAnimationFrame(() => positionPopover(popover, trigger));
    });
  }

  function openFeedbackModal() {
    closeModal();
    closeNavPopover();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal modal-form" role="dialog" aria-labelledby="feedback-title">
        <h2 id="feedback-title">Report a problem</h2>
        <p>Tell us what went wrong. This demo saves feedback locally in your browser.</p>
        <form class="nav-form" id="feedback-form">
          <label>
            Category
            <select name="category" required>
              <option value="">Select one</option>
              <option value="join">Can't join a meeting</option>
              <option value="audio">Audio or video</option>
              <option value="ui">Something looks wrong</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Description
            <textarea name="description" rows="4" required placeholder="Describe the issue"></textarea>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" name="includeScreenshot" />
            Include screenshot (simulated)
          </label>
          <div class="modal-actions">
            <button type="button" class="modal-close">Cancel</button>
            <button type="submit" class="modal-join-now">Send feedback</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.querySelector(".modal-close").addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    backdrop.querySelector("#feedback-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        category: form.category.value,
        description: form.description.value.trim(),
        includeScreenshot: form.includeScreenshot.checked,
        at: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("meet-feedback") || "[]");
      existing.push(data);
      localStorage.setItem("meet-feedback", JSON.stringify(existing));
      closeModal();
      showToast("Thanks — your feedback was saved", "success");
    });
  }

  function openSettingsModal() {
    closeModal();
    closeNavPopover();
    const settings = loadSettings();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal modal-form" role="dialog" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>
        <p>Choose defaults for when you join meetings from this device.</p>
        <form class="nav-form" id="settings-form">
          <label class="checkbox-row">
            <input type="checkbox" name="defaultMic" ${settings.defaultMic ? "checked" : ""} />
            Microphone on when joining
          </label>
          <label class="checkbox-row">
            <input type="checkbox" name="defaultCamera" ${settings.defaultCamera ? "checked" : ""} />
            Camera on when joining
          </label>
          <label class="checkbox-row">
            <input type="checkbox" name="noiseCancellation" ${settings.noiseCancellation ? "checked" : ""} />
            Noise cancellation
          </label>
          <div class="modal-actions">
            <button type="button" class="modal-close">Cancel</button>
            <button type="submit" class="modal-join-now">Save</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.querySelector(".modal-close").addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    backdrop.querySelector("#settings-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.target;
      saveSettings({
        defaultMic: form.defaultMic.checked,
        defaultCamera: form.defaultCamera.checked,
        noiseCancellation: form.noiseCancellation.checked,
      });
      closeModal();
      showToast("Settings saved", "success");
    });
  }

  function resetHomeState() {
    closeModal();
    closeNavPopover();
    if (meetingInput) {
      meetingInput.value = "";
      meetingInput.classList.remove("input-error");
    }
    updateCarousel(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Home", "info");
  }

  function initNavbar() {
    document.querySelectorAll(".nav-trigger").forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const nav = trigger.dataset.nav;
        if (nav === "support") openSupportMenu(trigger);
        else if (nav === "apps") openAppsMenu(trigger);
        else if (nav === "account") openAccountMenu(trigger);
        else if (nav === "feedback") openFeedbackModal();
        else if (nav === "settings") openSettingsModal();
      });
    });

    if (logoBtn) {
      logoBtn.addEventListener("click", resetHomeState);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeNavPopover();
        closeModal();
      }
    });

    window.addEventListener(
      "resize",
      () => {
        const popover = document.querySelector(".nav-popover");
        if (popover && activeNavTrigger) {
          positionPopover(popover, activeNavTrigger);
        }
      },
      { passive: true }
    );

    updateProfileInitial();
  }

  updateClock();
  setInterval(updateClock, 30000);

  if (newMeetingBtn) {
    newMeetingBtn.addEventListener("click", handleNewMeeting);
  }

  if (joinBtn) {
    joinBtn.addEventListener("click", handleJoin);
  }

  if (meetingInput) {
    meetingInput.addEventListener("input", () => {
      meetingInput.classList.remove("input-error");
    });
    meetingInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleJoin();
      }
    });
  }

  if (keyboardBtn && meetingInput) {
    keyboardBtn.addEventListener("click", () => {
      meetingInput.focus();
      showToast("Type your meeting code or paste a meet.google.com link", "info");
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => updateCarousel(carouselIndex - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", () => updateCarousel(carouselIndex + 1));
  }

  dots.forEach((dot, i) => {
    dot.style.cursor = "pointer";
    dot.addEventListener("click", () => updateCarousel(i));
  });

  if (learnMore) {
    learnMore.addEventListener("click", (e) => {
      e.preventDefault();
      window.open(
        "https://support.google.com/meet/answer/9302740",
        "_blank",
        "noopener,noreferrer"
      );
    });
  }

  initNavbar();
  updateCarousel(0);
})();
