/* =========================================================
NOOK — Collection
Rich interactions: search, filters, tilt, reveal, voice
========================================================= */

const searchInput  = document.getElementById("projectSearch");
const searchBar    = document.getElementById("searchBar");
const clearSearch  = document.getElementById("clearSearch");
const showAll      = document.getElementById("showAll");
const voiceAction  = document.getElementById("voiceAction");
const voiceStatus  = document.getElementById("voiceStatus");
const noResults    = document.getElementById("noResults");
const resultCount  = document.getElementById("resultCount");
const resetFilters = document.getElementById("resetFilters");
const cycleWord    = document.getElementById("cycleWord");
const statTotal    = document.getElementById("statTotal");

const chips        = Array.from(document.querySelectorAll(".filters .chip"));
const projects     = Array.from(document.querySelectorAll(".project"));

const prefersReducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canHover =
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

let activeFilter = "all";

/* =========================================================
FILTER + SEARCH
Multi-word, plural-friendly and forgiving of filler words,
so typed and spoken queries ("show me games") both work.
========================================================= */

const FILLER_WORDS = new Set([
  "show", "me", "find", "search", "for", "open", "the", "a", "an",
  "of", "to", "please", "some", "all", "everything", "and", "i",
  "want", "looking", "look", "with", "my", "on", "in"
]);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* "Show me Games" -> ["game"] */
function getTerms(raw) {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(word => word && !FILLER_WORDS.has(word))
    .map(word =>
      word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word
    );
}

/* Each term must match the start of a word */
function termPattern(term) {
  return new RegExp("(?:^|[^\\p{L}\\p{N}])" + escapeRegExp(term), "u");
}

/* Highlight matches inside a card's title + description */
function highlightCard(project, terms) {
  const targets = project.querySelectorAll("h2, p");

  const joined = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");

  targets.forEach(el => {
    if (!el.dataset.original) {
      el.dataset.original = el.innerHTML;
    }

    el.innerHTML = el.dataset.original;

    if (!joined) return;

    const re = new RegExp("(^|[^\\p{L}\\p{N}])(" + joined + ")", "giu");

    /* Walk text nodes only, so we never break nested markup */
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      const text = node.nodeValue;
      re.lastIndex = 0;

      let match = re.exec(text);
      if (!match) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      while (match) {
        const markStart = match.index + match[1].length;

        fragment.append(
          document.createTextNode(text.slice(lastIndex, markStart))
        );

        const mark = document.createElement("mark");
        mark.textContent = match[2];
        fragment.append(mark);

        lastIndex = markStart + match[2].length;
        match = re.exec(text);
      }

      fragment.append(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(fragment, node);
    });
  });
}

function applyFilters() {
  const rawQuery = searchInput.value.trim();
  const terms = getTerms(rawQuery);
  const patterns = terms.map(termPattern);
  let visible = 0;

  projects.forEach(project => {
    const matchesFilter =
      activeFilter === "all" ||
      project.dataset.category === activeFilter;

    const searchableText =
      (project.innerText + " " + project.dataset.search).toLowerCase();

    const matchesQuery = patterns.every(p => p.test(searchableText));

    const show = matchesFilter && matchesQuery;

    project.classList.toggle("search-hidden", !matchesQuery);
    project.classList.toggle("filter-hidden", !matchesFilter);

    highlightCard(project, terms);

    if (show) visible++;
  });

  searchBar.classList.toggle("has-query", rawQuery.length > 0);
  noResults.classList.toggle("visible", visible === 0);

  const total = projects.length;
  resultCount.textContent =
    visible === total
      ? total + " projects"
      : "Showing " + visible + " of " + total;
}

/* Run the search and bring the results into view */
function showResults() {
  applyFilters();

  if (!searchInput.value.trim()) {
    searchInput.focus();
    return;
  }

  searchInput.blur();

  const target = document.querySelector(".filters");
  if (target) {
    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
  }
}

/* =========================================================
LIVE SEARCH + SUBMIT (Enter key or lens button)
========================================================= */

searchInput.addEventListener("input", applyFilters);

searchBar.addEventListener("submit", event => {
  event.preventDefault();
  showResults();
});

/* =========================================================
CATEGORY CHIPS
========================================================= */

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter;

    chips.forEach(c => {
      const on = c === chip;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    });

    applyFilters();
  });
});

/* =========================================================
RESET FILTERS (from no-results state)
========================================================= */

resetFilters.addEventListener("click", () => {
  activeFilter = "all";

  chips.forEach(c => {
    const on = c.dataset.filter === "all";
    c.classList.toggle("is-active", on);
    c.setAttribute("aria-pressed", String(on));
  });

  searchInput.value = "";
  applyFilters();
  searchInput.focus();
});

/* =========================================================
BUTTONS
========================================================= */

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  applyFilters();
  searchInput.focus();
});

showAll.addEventListener("click", () => {
  activeFilter = "all";

  chips.forEach(c => {
    const on = c.dataset.filter === "all";
    c.classList.toggle("is-active", on);
    c.setAttribute("aria-pressed", String(on));
  });

  searchInput.value = "";
  applyFilters();

  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion ? "auto" : "smooth"
  });
});

/* =========================================================
KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener("keydown", event => {

  /* "/" focuses search */
  if (
    event.key === "/" &&
    document.activeElement !== searchInput &&
    document.activeElement.tagName !== "INPUT" &&
    document.activeElement.tagName !== "TEXTAREA"
  ) {
    event.preventDefault();
    searchInput.focus();
  }

  /* Escape: stop listening, otherwise clear the search */
  if (event.key === "Escape") {
    if (listening && recognition) {
      recognition.abort();
      return;
    }

    if (document.activeElement === searchInput && searchInput.value) {
      searchInput.value = "";
      applyFilters();
    }
  }
});

/* =========================================================
VOICE SEARCH (speech to text)
Uses the Web Speech API. Words appear in the search box as
you speak and the results filter live; when you stop talking
the results scroll into view.
========================================================= */

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const DEFAULT_PLACEHOLDER = searchInput.placeholder;

let recognition = null;
let listening = false;
let heardSpeech = false;
let voiceError = "";
let placeholderTimer = null;

const VOICE_MESSAGES = {
  "not-allowed":         "Mic blocked. Allow access",
  "service-not-allowed": "Mic blocked. Allow access",
  "audio-capture":       "No microphone found",
  "network":             "Voice needs internet",
  "no-speech":           "Didn't catch that",
  "language-not-supported": "Language not supported"
};

function flashMessage(message) {
  clearTimeout(placeholderTimer);

  searchInput.placeholder = message;
  voiceStatus.textContent = message;

  placeholderTimer = setTimeout(() => {
    if (!listening) searchInput.placeholder = DEFAULT_PLACEHOLDER;
    voiceStatus.textContent = "";
  }, 3600);
}

function setListening(state) {
  listening = state;

  searchBar.classList.toggle("listening", state);

  voiceAction.setAttribute("aria-pressed", String(state));
  voiceAction.setAttribute(
    "aria-label",
    state ? "Stop voice search" : "Voice search"
  );
  voiceAction.title = state ? "Stop listening" : "Voice search";

  if (state) {
    clearTimeout(placeholderTimer);
    searchInput.placeholder = "Listening...";
    voiceStatus.textContent = "Listening";
  } else if (searchInput.placeholder === "Listening...") {
    searchInput.placeholder = DEFAULT_PLACEHOLDER;
  }
}

function cleanTranscript(text) {
  return text.replace(/\s+/g, " ").replace(/[.,!?;:]+$/, "").trim();
}

function startListening() {
  if (!SpeechRecognition) {
    flashMessage("Voice isn't supported here");
    return;
  }

  heardSpeech = false;
  voiceError = "";

  const rec = new SpeechRecognition();
  recognition = rec;

  rec.lang = /^en/i.test(navigator.language || "")
    ? navigator.language
    : "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.addEventListener("result", event => {
    const transcript = cleanTranscript(
      Array.from(event.results)
        .map(result => result[0].transcript)
        .join(" ")
    );

    if (!transcript) return;

    heardSpeech = true;
    searchInput.value = transcript;
    applyFilters();
  });

  rec.addEventListener("error", event => {
    voiceError = event.error || "error";

    /* "aborted" means we stopped it ourselves, so stay quiet */
    if (voiceError !== "aborted") {
      flashMessage(
        VOICE_MESSAGES[voiceError] || "Voice stopped. Try again"
      );
    }
  });

  rec.addEventListener("end", () => {
    if (recognition === rec) recognition = null;

    setListening(false);

    if (heardSpeech && !voiceError) {
      showResults();
    } else if (!heardSpeech && !voiceError) {
      flashMessage(VOICE_MESSAGES["no-speech"]);
    }
  });

  try {
    setListening(true);
    rec.start();
  } catch (err) {
    recognition = null;
    setListening(false);
    flashMessage("Couldn't start voice");
  }
}

voiceAction.addEventListener("click", () => {
  if (listening && recognition) {
    recognition.stop();   /* finish and use what was heard */
  } else {
    startListening();
  }
});

/* Cards for projects that aren't deployed yet don't navigate */
projects.filter(p => p.classList.contains("soon")).forEach(p => {
  p.addEventListener("click", event => event.preventDefault());
});

/* =========================================================
CURSOR TILT + GLOW
========================================================= */

if (canHover && !prefersReducedMotion) {

  projects.forEach(project => {

    let rafId = null;
    let rect = null;

    project.addEventListener("pointerenter", () => {
      rect = project.getBoundingClientRect();
    });

    project.addEventListener("pointermove", event => {
      if (rafId) return;

      const x = event.clientX;
      const y = event.clientY;

      rafId = requestAnimationFrame(() => {
        rafId = null;

        const px = (x - rect.left) / rect.width;
        const py = (y - rect.top) / rect.height;

        const rotateX = (0.5 - py) * 6;
        const rotateY = (px - 0.5) * 8;

        project.style.transform =
          "translateY(-6px)" +
          " perspective(900px)" +
          " rotateX(" + rotateX + "deg)" +
          " rotateY(" + rotateY + "deg)";

        project.style.setProperty("--mx", (px * 100) + "%");
        project.style.setProperty("--my", (py * 100) + "%");
      });
    });

    project.addEventListener("pointerleave", () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      project.style.transform = "";
    });
  });
}

/* =========================================================
SCROLL REVEAL (staggered)
========================================================= */

if ("IntersectionObserver" in window && !prefersReducedMotion) {

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });

  projects.forEach((project, index) => {
    project.style.setProperty(
      "--stagger",
      ((index % 3) * 70) + "ms"
    );
    observer.observe(project);
  });
} else {
  projects.forEach(p => p.classList.add("in"));
}

/* =========================================================
CYCLING HERO WORD
========================================================= */

(function cycleWords() {
  if (!cycleWord) return;

  const words = ["games", "tools", "experiments", "software", "small joys"];
  let index = 0;

  setInterval(() => {
    index = (index + 1) % words.length;

    cycleWord.style.opacity = "0";
    cycleWord.style.transition = "opacity 220ms ease";

    setTimeout(() => {
      cycleWord.textContent = words[index];
      cycleWord.style.opacity = "1";
    }, 220);
  }, 2400);
})();

/* =========================================================
STAT COUNT-UP
========================================================= */

(function countUp() {
  if (!statTotal) return;

  const target = projects.length;
  const duration = prefersReducedMotion ? 0 : 900;
  const start = performance.now();

  function tick(now) {
    const progress =
      duration === 0
        ? 1
        : Math.min((now - start) / duration, 1);

    const eased = 1 - Math.pow(1 - progress, 3);

    statTotal.textContent =
      Math.round(eased * target).toString().padStart(2, "0");

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();

/* =========================================================
INITIALIZE
========================================================= */

applyFilters();
