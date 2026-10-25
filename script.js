const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

// motion.js takes over reveals, the rotator and the timeline when GSAP loaded
const useGsap = !reduceMotion.matches && "gsap" in window;
document.documentElement.classList.toggle("gsap", useGsap);

// Nav: border/blur once the page scrolls, mobile menu toggle

const siteNav = document.querySelector("#site-nav");
const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector("#nav-menu");

const updateNavState = function () {
  siteNav.classList.toggle("is-scrolled", window.scrollY > 10);
};

const setMenuOpen = function (open) {
  navMenu.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
};

navToggle.addEventListener("click", function () {
  setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
});

navMenu.addEventListener("click", function (e) {
  if (e.target.closest("a")) setMenuOpen(false);
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") setMenuOpen(false);
});

// Highlight the nav item for the section currently in view

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll("main .section");

const highlightSection = function (entries) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    navItems.forEach((item) => {
      item.classList.toggle(
        "is-active",
        item.getAttribute("href") === `#${entry.target.id}`
      );
    });
  });
};

const sectionObserver = new IntersectionObserver(highlightSection, {
  root: null,
  // A thin band across the middle of the viewport decides the active section
  rootMargin: "-45% 0px -50% 0px",
});

sections.forEach((section) => {
  sectionObserver.observe(section);
});

// Reveal elements as they scroll into view

const revealObserver = new IntersectionObserver(
  function (entries, observer) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);

if (!useGsap) {
  document.querySelectorAll(".reveal").forEach((el) => {
    revealObserver.observe(el);
  });
}

// Hero: rotating, typed word

const rotatorWord = document.querySelector(".rotator-word");
// The longest word also lives in .rotator-ghost in index.html
const words = ["code", "design", "marketing"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rotateWords = async function () {
  let index = 0;

  while (true) {
    await sleep(2400);
    const current = words[index];
    index = (index + 1) % words.length;
    const next = words[index];

    for (let i = current.length; i >= 0; i--) {
      rotatorWord.textContent = current.slice(0, i);
      await sleep(45);
    }
    await sleep(250);
    for (let i = 1; i <= next.length; i++) {
      rotatorWord.textContent = next.slice(0, i);
      await sleep(85);
    }
  }
};

if (!reduceMotion.matches && !useGsap) rotateWords();

// Pointer effects: project card tilt

const projectCards = document.querySelectorAll(".project-card");

const trackPointer = function (el, onMove) {
  let frame = null;

  el.addEventListener("pointermove", function (e) {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      onMove?.(x / rect.width, y / rect.height);
      frame = null;
    });
  });
};

if (finePointer.matches) {
  projectCards.forEach((card) => {
    const maxTilt = 4;

    trackPointer(card, (px, py) => {
      if (reduceMotion.matches) return;
      card.style.setProperty("--ry", `${(px - 0.5) * maxTilt * 2}deg`);
      card.style.setProperty("--rx", `${(0.5 - py) * maxTilt * 2}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
}

// Case study: the card flips over where it sits, then grows into a large
// panel. Closing runs it backwards and lands the card back in the grid

const flipEase = "cubic-bezier(0.65, 0, 0.35, 1)";
const growEase = "cubic-bezier(0.22, 1, 0.36, 1)";

const rectFrame = (r) => ({
  left: `${r.left}px`,
  top: `${r.top}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
});

const panelRect = function () {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const margin = Math.min(48, Math.max(12, vw * 0.04));
  const width = Math.min(960, vw - margin * 2);
  const height = vh - margin * 2;
  return { left: (vw - width) / 2, top: margin, width, height };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

document.querySelectorAll("[data-case-study]").forEach((trigger) => {
  const card = trigger.closest(".project-card");
  const dialog = document.getElementById(trigger.dataset.caseStudy);
  const shell = dialog.querySelector(".cs-shell");
  const flipper = dialog.querySelector(".cs-flipper");
  const front = dialog.querySelector(".cs-front");
  const scroller = dialog.querySelector(".cs-scroll");
  let busy = false;

  const place = (r) => Object.assign(shell.style, rectFrame(r));

  const lockScroll = function (lock) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = lock && gap ? `${gap}px` : "";
    document.documentElement.classList.toggle("has-modal", lock);
  };

  const open = async function () {
    if (busy || dialog.open) return;
    busy = true;

    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    const from = card.getBoundingClientRect();

    const copy = card.cloneNode(true);
    copy.removeAttribute("style");
    front.replaceChildren(copy);
    front.inert = true;

    lockScroll(true);
    place(from);
    scroller.scrollTop = 0;
    dialog.showModal();
    card.style.visibility = "hidden";
    dialog.classList.add("is-open");

    const to = panelRect();

    if (!reduceMotion.matches) {
      const flip = flipper.animate(
        [
          { transform: "rotateY(0deg)" },
          { transform: "rotateY(90deg) translateZ(80px)" },
          { transform: "rotateY(180deg)" },
        ],
        { duration: 750, easing: flipEase }
      );
      const grow = shell.animate([rectFrame(from), rectFrame(to)], {
        duration: 700,
        delay: 500,
        easing: growEase,
        fill: "backwards",
      });
      place(to);
      await Promise.all([flip.finished, grow.finished]);
    } else {
      place(to);
    }

    dialog.classList.add("is-expanded");
    dialog.querySelector(".cs-close").focus({ preventScroll: true });
    busy = false;
  };

  const close = async function () {
    if (busy || !dialog.open) return;
    busy = true;

    dialog.classList.remove("is-expanded");

    // A pointer move queued as the panel opened can re-tilt the hidden card;
    // flatten it so the copy lands squarely on it
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");

    if (!reduceMotion.matches) {
      await wait(250);
      const from = shell.getBoundingClientRect();
      const to = card.getBoundingClientRect();
      const shrink = shell.animate([rectFrame(from), rectFrame(to)], {
        duration: 600,
        easing: flipEase,
      });
      const flip = flipper.animate(
        [
          { transform: "rotateY(180deg)" },
          { transform: "rotateY(90deg) translateZ(80px)" },
          { transform: "rotateY(0deg)" },
        ],
        { duration: 750, delay: 400, easing: flipEase, fill: "forwards" }
      );
      place(to);
      setTimeout(() => dialog.classList.remove("is-open"), 400);
      await Promise.all([shrink.finished, flip.finished]);
      flip.cancel();
    }

    // Land in the copy's lit look, then let the tint fade back in
    card.classList.add("is-landing");
    card.style.visibility = "";
    dialog.classList.remove("is-open");
    dialog.close();
    lockScroll(false);
    trigger.focus({ preventScroll: true });
    setTimeout(() => card.classList.remove("is-landing"), 150);
    busy = false;
  };

  trigger.addEventListener("click", open);
  dialog.querySelectorAll(".cs-close, .cs-close-text").forEach((btn) => {
    btn.addEventListener("click", close);
  });

  // Escape and clicks outside the panel close it with the same animation
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });

  window.addEventListener("resize", () => {
    if (dialog.open && !busy) place(panelRect());
  });
});

// Hero grid: now and then a pulse of current runs along a row of dots,
// sometimes jogging up or down a cell or two once before carrying on

const gridTrace = document.querySelector(".grid-trace");

const runGridTraces = function (canvas) {
  const ctx = canvas.getContext("2d");
  const cell = 28; // matches .grid-dots background-size; dots sit mid-cell
  const speed = 400; // px per second
  const tailLength = 120;
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();

  let width = 0;
  let height = 0;
  let traces = [];
  let nextSpawn = 1.2;
  let visible = true;
  let frame = null;
  let last = 0;

  const resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const dot = (i, j) => ({ x: cell / 2 + i * cell, y: cell / 2 + j * cell });

  // Horizontal runs in one direction, with at most one short vertical jog
  const makeTrace = function () {
    const cols = Math.floor(width / cell);
    const rows = Math.floor(height / cell);
    const dir = Math.random() < 0.5 ? -1 : 1;
    let i = randInt(Math.floor(cols * 0.1), Math.floor(cols * 0.9));
    let j = randInt(Math.floor(rows * 0.15), Math.floor(rows * 0.6));
    let remaining = Math.min(randInt(16, 30), dir > 0 ? cols - 1 - i : i);
    const points = [dot(i, j)];
    let jogged = Math.random() < 0.3;

    while (remaining > 0) {
      const run = Math.min(randInt(4, 9), remaining);
      i += run * dir;
      remaining -= run;
      points.push(dot(i, j));

      if (!jogged && remaining > 2) {
        jogged = true;
        const jog = randInt(1, 2) * (Math.random() < 0.5 ? -1 : 1);
        const next = Math.min(Math.max(j + jog, 1), rows - 2);
        if (next !== j) points.push(dot(i, (j = next)));
      }
    }

    const offsets = [0];
    for (let k = 1; k < points.length; k++) {
      const a = points[k - 1];
      const b = points[k];
      offsets.push(offsets[k - 1] + Math.abs(b.x - a.x) + Math.abs(b.y - a.y));
    }
    return { points, offsets, dir, length: offsets[offsets.length - 1], dist: 0 };
  };

  const pointAt = function (trace, d) {
    const { points, offsets } = trace;
    let k = 1;
    while (k < points.length - 1 && offsets[k] < d) k++;
    const a = points[k - 1];
    const b = points[k];
    const t = (d - offsets[k - 1]) / (offsets[k] - offsets[k - 1] || 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };

  const drawTrace = function (trace) {
    const head = Math.min(trace.dist, trace.length);
    const tail = Math.max(head - tailLength, 0);
    if (head <= tail) return;

    const start = pointAt(trace, tail);
    const end = pointAt(trace, head);

    // Ease in over the first few cells, stay bright for most of the run,
    // then dim through the last stretch so it dies out while still moving
    const fadeIn = Math.min(head / (cell * 3), 1);
    const fadeOut = Math.min((trace.length - head) / (trace.length * 0.3), 1);
    const alpha = 0.6 * fadeIn * fadeOut ** 1.5;

    // Runs are mostly horizontal, so a left-to-right gradient covers the tail
    const gradientEnd = end.x === start.x ? end.x + trace.dir : end.x;
    const gradient = ctx.createLinearGradient(start.x, 0, gradientEnd, 0);
    gradient.addColorStop(0, `rgba(${accent}, 0)`);
    gradient.addColorStop(1, `rgba(${accent}, ${alpha.toFixed(3)})`);

    ctx.lineWidth = 1.25;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = `rgba(${accent}, 0.7)`;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    trace.offsets.forEach((offset, k) => {
      if (offset > tail && offset < head) ctx.lineTo(trace.points[k].x, trace.points[k].y);
    });
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  const tick = function (now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      const trace = traces.length < 2 && width > cell * 6 ? makeTrace() : null;
      if (trace?.length) traces.push(trace);
      nextSpawn = 2 + Math.random() * 3.5;
    }

    ctx.clearRect(0, 0, width, height);
    traces.forEach((trace) => {
      trace.dist += speed * dt;
      drawTrace(trace);
    });
    traces = traces.filter((trace) => trace.dist < trace.length);

    frame = requestAnimationFrame(tick);
  };

  const start = function () {
    if (frame || !visible || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const stop = function () {
    cancelAnimationFrame(frame);
    frame = null;
  };

  new ResizeObserver(resize).observe(canvas);
  resize();

  // Only animate while the hero is on screen and the tab is in front
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
};

if (gridTrace && !reduceMotion.matches) runGridTraces(gridTrace);

// Resume timeline: fill the line as it scrolls past the middle of the screen

const timeline = document.querySelector("#timeline");
const timelineItems = timeline.querySelectorAll(".timeline-item");

const updateTimeline = function () {
  const rect = timeline.getBoundingClientRect();
  const marker = window.innerHeight * 0.6;
  const progress = Math.min(Math.max((marker - rect.top) / rect.height, 0), 1);
  timeline.style.setProperty("--progress", progress.toFixed(3));

  timelineItems.forEach((item) => {
    const top = item.getBoundingClientRect().top;
    item.classList.toggle("is-reached", top < marker);
  });
};

// Scroll handling, batched into one frame

let scrollFrame = null;

const onScroll = function () {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    updateNavState();
    if (!useGsap) updateTimeline();
    scrollFrame = null;
  });
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

// Contact: send the form to the Worker at /api/contact

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const submitButton = contactForm.querySelector('button[type="submit"]');

// Turnstile tokens are single-use, so keep this widget's ID to reset it after
// every send. api.js may load before or after this script, so handle both.
const turnstileBox = document.querySelector("#contact-turnstile");
let turnstileId = null;

const renderTurnstile = function () {
  turnstileId = window.turnstile.render(turnstileBox, {
    sitekey: turnstileBox.dataset.sitekey,
    action: turnstileBox.dataset.action,
    theme: "dark",
    size: "flexible",
  });
};

if (window.turnstile) renderTurnstile();
else window.onTurnstileLoad = renderTurnstile;

const setStatus = function (message, kind) {
  formStatus.textContent = message;
  formStatus.classList.toggle("is-success", kind === "success");
  formStatus.classList.toggle("is-error", kind === "error");
};

contactForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  contactForm.classList.add("was-submitted");

  if (!contactForm.checkValidity()) {
    setStatus("Please fill in your name, a valid email and a message.", "error");
    contactForm.querySelector(":invalid").focus();
    return;
  }

  const data = new FormData(contactForm);
  if (!data.get("cf-turnstile-response")) {
    setStatus("Hang on a second while we check you’re human, then try again.", "error");
    return;
  }

  submitButton.disabled = true;
  setStatus("Sending…");

  try {
    const res = await fetch(contactForm.action, { method: "POST", body: data });
    const result = await res.json().catch(() => ({}));

    if (result.ok) {
      contactForm.reset();
      contactForm.classList.remove("was-submitted");
      setStatus("Thanks! Your message is on its way. I’ll be in touch soon.", "success");
    } else {
      setStatus(result.error || "Something went wrong. Please try again.", "error");
    }
  } catch {
    setStatus("Couldn’t reach the server. Check your connection and try again.", "error");
  } finally {
    submitButton.disabled = false;
    if (turnstileId !== null) window.turnstile.reset(turnstileId);
  }
});

document.querySelector("#year").textContent = new Date().getFullYear();
