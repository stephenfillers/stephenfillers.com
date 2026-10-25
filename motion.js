// GSAP layer: takes over the reveals, rotator and timeline from script.js and
// adds an intro, scroll-driven effects and magnetic buttons on top. script.js
// sets the .gsap class only when GSAP loaded and reduced motion is off.

if (document.documentElement.classList.contains("gsap")) {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

  // Plays once on the way in. If the element is already scrolled past (a reload
  // partway down, or a jump from the nav) it finishes instantly instead of
  // animating out of sight. No `once: true`: on a reload partway down, those
  // triggers kill themselves mid-refresh and crash ScrollTrigger, leaving
  // every element set up after that point hidden. The default toggleActions
  // never reverse, so leaving them alive changes nothing visible.
  const onScreen = (trigger, start = "top 85%") => ({
    trigger,
    start,
    onEnter: (self) => {
      if (self.scroll() > self.end) self.animation.progress(1);
    },
  });

  // Reveal helpers: GSAP runs the motion, then hands the element back to the
  // CSS so hover transitions and the card tilt work as before

  const prep = (targets) => gsap.set(targets, { transition: "none" });

  const showNow = function (el) {
    el.style.transition = "none";
    el.classList.add("is-visible");
  };

  const handBack = function () {
    const targets = this.targets();
    targets.forEach((el) => {
      el.style.transition = "none";
      el.classList.add("is-visible");
      gsap.set(el, { clearProps: "opacity,visibility,transform,clipPath" });
    });
    // Restore the CSS transitions a frame later, so a skipped animation
    // doesn't replay the CSS reveal fade
    requestAnimationFrame(() => gsap.set(targets, { clearProps: "transition" }));
  };

  // Hero: intro timeline

  const hero = document.querySelector(".hero");
  const introButtons = ".hero-actions .btn, .site-nav .btn";

  hero.querySelectorAll(".reveal").forEach(showNow);
  prep(introButtons);

  const intro = gsap
    .timeline({ defaults: { ease: "expo.out", duration: 1.3 } })
    .from(".hero-bg", { autoAlpha: 0, duration: 2.2, ease: "power2.out" }, 0)
    .from(
      ".site-nav .logo, .nav-toggle, .nav-menu > *",
      { y: -16, autoAlpha: 0, stagger: 0.05, duration: 0.9, onComplete: handBack },
      0.1
    )
    .from(".eyebrow", { y: 16, autoAlpha: 0, scale: 0.96 }, 0.2)
    .from(
      ".hero-title .line-inner",
      { yPercent: 110, rotate: 3, transformOrigin: "0% 100%", stagger: 0.12 },
      0.3
    )
    .from(".hero-lead", { y: 24, autoAlpha: 0 }, 0.7)
    .from(
      ".hero-actions .btn",
      { y: 24, autoAlpha: 0, stagger: 0.08, onComplete: handBack },
      0.8
    )
    .from(".scroll-cue", { autoAlpha: 0, y: -10 }, 1.2);

  // Skip the intro when the page loads already scrolled
  document.addEventListener("DOMContentLoaded", () => {
    if (window.scrollY > 0) intro.progress(1);
  });

  // Hero: content drifts up while the background lags behind

  gsap
    .timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    })
    .to(".hero-inner", { yPercent: -25, ease: "none" }, 0)
    .to(".hero-bg", { y: 160, ease: "none" }, 0)
    .to(".grid-dots", { scale: 1.2, ease: "none" }, 0);

  // Hero: rotating word, letters flip out and in while the width eases

  const rotatorWord = document.querySelector(".rotator-word");
  // The longest word also lives in .rotator-ghost in index.html
  const words = ["code", "design", "marketing"];
  let wordIndex = 0;

  const setChars = function (word) {
    rotatorWord.innerHTML = [...word]
      .map((c) => `<span class="rotator-char">${c}</span>`)
      .join("");
    return rotatorWord.children;
  };

  const nextWord = function () {
    wordIndex = (wordIndex + 1) % words.length;
    const fromWidth = rotatorWord.offsetWidth;

    gsap
      // A plain timer rather than gsap.delayedCall, which would keep GSAP's
      // ticker (and so the page) rendering every frame during the pause
      .timeline({ onComplete: () => setTimeout(nextWord, 2400) })
      .to(rotatorWord.children, {
        yPercent: -60,
        rotateX: 90,
        autoAlpha: 0,
        stagger: 0.03,
        duration: 0.35,
        ease: "power2.in",
      })
      .add(() => {
        const chars = setChars(words[wordIndex]);
        gsap.fromTo(
          rotatorWord,
          { width: fromWidth },
          { width: rotatorWord.offsetWidth, duration: 0.5, ease: "power3.inOut", clearProps: "width" }
        );
        gsap.from(chars, {
          yPercent: 60,
          rotateX: -90,
          autoAlpha: 0,
          stagger: 0.04,
          duration: 0.6,
          ease: "back.out(2)",
        });
      });
  };

  setChars(words[0]);
  setTimeout(nextWord, 3200);

  // Section labels decode, titles rise word by word out of masked lines

  gsap.utils.toArray(".section-label").forEach((label) => {
    const text = label.textContent;
    if (label.classList.contains("reveal")) showNow(label);
    label.textContent = "";

    gsap.to(label, {
      duration: 1.1,
      scrambleText: { text, chars: "0123456789/", speed: 0.6 },
      scrollTrigger: onScreen(label),
    });
  });

  gsap.utils.toArray(".section-title, .contact-title").forEach((title) => {
    if (title.classList.contains("reveal")) showNow(title);

    SplitText.create(title, {
      type: "lines,words",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.words, {
          yPercent: 110,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.04,
          scrollTrigger: onScreen(title),
        }),
    });
  });

  // About: paragraphs, stat cards slide in and the numbers count up

  gsap.fromTo(
    ".about-grid p.reveal:not(.section-label)",
    { autoAlpha: 0, y: 30 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 1,
      ease: "expo.out",
      stagger: 0.12,
      onComplete: handBack,
      scrollTrigger: onScreen(".about-grid p.reveal:not(.section-label)", "top 88%"),
    }
  );

  gsap.fromTo(
    ".stat",
    { autoAlpha: 0, x: 48, y: 0 },
    {
      autoAlpha: 1,
      x: 0,
      y: 0,
      duration: 1,
      ease: "expo.out",
      stagger: 0.12,
      onComplete: handBack,
      scrollTrigger: onScreen(".stats"),
    }
  );

  document.querySelectorAll(".stat dd:not(.stat-text)").forEach((dd) => {
    const node = dd.firstChild;
    const end = parseInt(node.textContent, 10);
    // Years count up from a quarter century back, small numbers from zero
    const counter = { value: end > 1000 ? end - 25 : 0 };
    node.textContent = counter.value;

    gsap.to(counter, {
      value: end,
      duration: 1.8,
      ease: "power3.out",
      snap: { value: 1 },
      onUpdate: () => (node.textContent = counter.value),
      scrollTrigger: onScreen(dd),
    });
  });

  // Projects: card rises, screenshot wipes in, its window rises as you scroll

  gsap.utils.toArray(".project-card").forEach((card) => {
    const media = card.querySelector(".project-media");
    const details = card.querySelectorAll(
      ".project-meta, .project-title, .project-desc, .tags li, .project-actions .btn"
    );

    prep(details);

    const intro = gsap
      .timeline({ scrollTrigger: onScreen(card, "top 80%") })
      .fromTo(
        card,
        { autoAlpha: 0, y: 70, transition: "none" },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: "expo.out", onComplete: handBack }
      )
      .from(
        details,
        { y: 18, autoAlpha: 0, stagger: 0.04, duration: 0.8, ease: "power3.out", onComplete: handBack },
        0.35
      );

    // Compact cards have no screenshot to wipe in or parallax
    if (!media) return;

    const frame = media.querySelector(".project-frame");

    intro.from(media, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.3, ease: "expo.inOut" }, 0);

    // The whole window rises into place from just below its resting spot.
    // Stacked cards frame the window on all sides, so it stays put there
    const stacked = window.matchMedia("(max-width: 860px)");

    gsap.fromTo(
      frame,
      { y: () => (stacked.matches ? 0 : 48) },
      {
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "center center",
          scrub: true,
          invalidateOnRefresh: true,
        },
      }
    );
  });

  // Skills: groups rise in sequence, chips pop with a little overshoot

  gsap.utils.toArray(".skill-group").forEach((group, i) => {
    const chips = group.querySelectorAll(".chips li");
    prep(chips);

    gsap
      .timeline({ delay: i * 0.12, scrollTrigger: onScreen(group) })
      .fromTo(
        group,
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", onComplete: handBack }
      )
      .from(
        chips,
        { scale: 0.5, y: 12, autoAlpha: 0, duration: 0.6, ease: "back.out(2.5)", stagger: 0.05, onComplete: handBack },
        0.25
      );
  });

  // Resume: line fill is scrubbed to scroll, entries slide in and light up

  const timeline = document.querySelector("#timeline");

  gsap.to(timeline, {
    "--progress": 1,
    ease: "none",
    scrollTrigger: { trigger: timeline, start: "top 60%", end: "bottom 60%", scrub: 0.6 },
  });

  timeline.querySelectorAll(".timeline-item").forEach((item) => {
    // Only the text slides in. The dot stays solid on the track: if the whole
    // entry faded, the line would show through its half-transparent dot
    showNow(item);
    gsap.fromTo(
      item.children,
      { autoAlpha: 0, x: -30 },
      { autoAlpha: 1, x: 0, duration: 1, ease: "expo.out", stagger: 0.05, onComplete: handBack, scrollTrigger: onScreen(item) }
    );

    ScrollTrigger.create({
      trigger: item,
      start: "top 60%",
      onEnter: () => item.classList.add("is-reached"),
      onLeaveBack: () => item.classList.remove("is-reached"),
    });
  });

  // Contact: card opens out from a smaller rounded frame

  const contactCard = document.querySelector(".contact-card");
  const contactRest = contactCard.querySelectorAll(".contact-lead, .contact-form, .socials a");
  prep(contactRest);

  gsap
    .timeline({ scrollTrigger: onScreen(contactCard, "top 80%") })
    .fromTo(
      contactCard,
      { autoAlpha: 0, y: 50, clipPath: "inset(8% 6% 8% 6% round 1.25rem)" },
      {
        autoAlpha: 1,
        y: 0,
        clipPath: "inset(0% 0% 0% 0% round 1.25rem)",
        duration: 1.3,
        ease: "expo.out",
        onComplete: handBack,
      }
    )
    .from(
      contactRest,
      { y: 20, autoAlpha: 0, stagger: 0.06, duration: 0.8, ease: "power3.out", onComplete: handBack },
      0.4
    );

  // Magnetic buttons: pulled toward the cursor, spring back on leave

  if (finePointer.matches) {
    document
      .querySelectorAll(".hero-actions .btn, .contact-form .btn, .site-nav .btn")
      .forEach((btn) => {
        btn.classList.add("magnetic");
        const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "elastic.out(1, 0.5)" });
        const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "elastic.out(1, 0.5)" });

        btn.addEventListener("pointermove", (e) => {
          const rect = btn.getBoundingClientRect();
          xTo((e.clientX - rect.left - rect.width / 2) * 0.3);
          yTo((e.clientY - rect.top - rect.height / 2) * 0.4);
        });

        btn.addEventListener("pointerleave", () => {
          xTo(0);
          yTo(0);
        });
      });
  }
}
