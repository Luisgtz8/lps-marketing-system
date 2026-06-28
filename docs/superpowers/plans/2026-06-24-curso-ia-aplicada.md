# Curso "IA Aplicada" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `docs/curso.html` as the new "IA Aplicada" course — 7 modules covering the 4-part syllabus (LLMs, tools incl. Claude Code install guide, PDF→data, real-data analysis, public-company case study), reusing the existing visual design language but with a clean engine and no auth gate.

**Architecture:** Single self-contained `docs/curso.html` (inline `<style>` + `<script>`, no build step — matches the rest of `docs/`). We build it FRESH rather than surgically excising the old file, because the old engine is tightly coupled to old content (puzzles, skills, agents, server sync, magic-link gate). We preserve the design system (CSS variables, fonts, theme, layout, quiz/copy-block visuals) and a simplified engine (nav, quizzes, copy-paste exercises, /100 score, localStorage progress).

**Tech Stack:** Plain HTML/CSS/vanilla JS. No framework, no bundler. `localStorage` for progress + theme. No backend, no `/api/*` calls.

## Global Constraints

- File stays a SINGLE self-contained `docs/curso.html` with inline `<style>` and `<script>`. No build step. (CLAUDE.md: "No bundler, no framework.")
- All user-facing copy in **Spanish**. (CLAUDE.md)
- Brand color is `--amber: #F59E0B` (the var is amber despite any "green" naming elsewhere — do not change it). (CLAUDE.md)
- NO embedded anon keys, NO `/api/*` calls, NO reintroduction of the auth gate. (CLAUDE.md + spec)
- Theme persists in `localStorage['lps-theme']` (same key as rest of site, so theme is shared). Course progress persists in a NEW key `localStorage['lps-curso-ia-aplicada-v1']` (must NOT collide with the old `lps-progress-v1`). (spec)
- Fonts: Inter (body) + Space Grotesk (headings) via Google Fonts, same `<link>` as today. (existing)
- Audience: profesional curioso, cero código. Code shown as copyable demos, not as code-along. (spec)
- 7 modules mapped from 4 parts per the spec table. (spec)
- Verification is manual (no test framework for static front-end). Each task lists exact manual checks. (spec)

## File Structure

- **Modify (full rewrite):** `docs/curso.html` — the entire course.
- No other files created or modified. Datasets already exist under `docs/recursos/` and are referenced by the exercises (no need to create them).

The single file has three internal regions, built in this order:
1. `<head>`: meta, title, theme bootstrap script, font links, `<style>` (design system + new components).
2. `<body>`: `#course-screen` → top-bar, mobile-tabs, sidebar (`#nav-items`), 7 `.module` sections, footer.
3. `<script>`: `MODULES`, `ANSWERS`, engine (nav, quiz, copy, exercise, score, persistence, OS-tab autodetect), init.

Because it is one file, tasks are sequenced so the file is **always openable in a browser** after each commit (we never leave it in a broken half-state). We snapshot the old file first, then build the new one top-to-bottom.

---

## Task 1: Snapshot old file, scaffold the new shell

**Files:**
- Modify (replace): `docs/curso.html`
- Create (backup, untracked): `docs/superpowers/_old-curso.html.bak`

**Interfaces:**
- Produces: a minimal but valid `curso.html` with `<head>` (theme bootstrap, fonts), the full `<style>` design system copied from the old file MINUS gate/puzzle/boveda/skill-builder styles, an empty `#course-screen` body shell (top-bar + mobile-tabs + sidebar + `.content-area` with no modules yet), and a footer. No `<script>` engine yet beyond the inline theme bootstrap. Later tasks add MODULES, modules markup, and the engine.

- [ ] **Step 1: Back up the current file**

```bash
cp docs/curso.html docs/superpowers/_old-curso.html.bak
```

The `.bak` lives under `docs/superpowers/` which is already untracked (see git status). This is our reference copy for lifting CSS and copy.

- [ ] **Step 2: Write the new `docs/curso.html` shell**

Replace the ENTIRE file with the shell below. The `<style>` block must contain the design-system CSS lifted verbatim from the old file (lines ~216–1180 of the backup) EXCEPT the rule groups for: registration gate (`#reg-gate`, `.reg-*`), puzzles (`.puzzle-*`, `.classify-*`, `.order-*`, `.lm-*`, connect), bóveda (`.boveda-*`, `.sg-*`), skill-builder (`.sb-*`), admin panel (`#admin-panel`, `.admin-*`), and the quiz-gate/content-reveal (`.quiz-gate`, `.content-reveal-btn`, `.content-collapsed`). Keep: `:root` vars, light-mode overrides, `.top-bar`, `.sidebar`, `.nav-item`, `.module`, `.module-*`, `.content-area`, `.mobile-tabs`, `.mobile-tab`, `.theme-toggle`, `.quiz-*`, `.copy-block`, `pre`, `details`/accordion, footer.

Use this exact head + body skeleton (paste the lifted CSS where marked):

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IA Aplicada — Curso en línea · Lightning Pro Solutions</title>
  <script>(function(){var t=localStorage.getItem('lps-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
  /* ===== PASTE lifted design-system CSS here (see Step 2 description) ===== */
  </style>
</head>
<body>
<div id="course-screen">
  <div class="top-bar">
    <span class="top-bar-logo">Lightning Pro</span>
    <div class="progress-bar-wrap"><div class="progress-bar-fill" id="progress-fill"></div></div>
    <div style="display:flex;align-items:center;gap:12px;">
      <span class="progress-label" id="progress-label">Módulo 1 de 7</span>
      <button class="theme-toggle" id="courseThemeToggle" aria-label="Cambiar modo de color"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg></button>
    </div>
  </div>
  <div class="mobile-tabs" id="mobile-tabs"></div>
  <div class="course-layout">
    <nav class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Módulos</div>
        <div id="nav-items"></div>
      </div>
    </nav>
    <main class="content-area">
      <!-- modules inserted by later tasks -->
      <footer style="margin-top:64px;padding-top:24px;border-top:1px solid var(--border);color:var(--muted);font-size:13px;">
        Lightning Pro Solutions · Curso IA Aplicada
      </footer>
    </main>
  </div>
</div>
<script>
/* engine added in later tasks */
</script>
</body>
</html>
```

NOTE: if `.course-layout`, `.content-area`, `.sidebar-section`, `.sidebar-label`, `.top-bar-logo`, `.progress-bar-wrap`, `.progress-bar-fill`, `.progress-label` are not all present in the lifted CSS, copy their rules from the backup too (they exist in the old file's layout section). The shell must render with a visible top bar, empty sidebar, and footer.

- [ ] **Step 3: Verify it opens cleanly**

Open `docs/curso.html` in a browser (double-click or `start docs/curso.html`).
Expected: top bar with "Lightning Pro" + progress label + theme toggle; empty sidebar labeled "Módulos"; footer line. No JS console errors. Toggle button does nothing yet (wired in Task 6) — that's fine.

- [ ] **Step 4: Verify no gate/api/puzzle residue**

Run: `grep -nE "reg-gate|/api/|puzzlesCompleted|boveda|classify\(" docs/curso.html`
Expected: NO output (empty). If anything matches, remove it.

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "curso: scaffold new IA Aplicada shell (design system, empty modules)"
```

---

## Task 2: Engine core — MODULES, nav, progress bar, theme toggle, persistence

**Files:**
- Modify: `docs/curso.html` (the `<script>` block)

**Interfaces:**
- Consumes: the body shell ids from Task 1 (`#nav-items`, `#mobile-tabs`, `#progress-fill`, `#progress-label`, `#courseThemeToggle`).
- Produces, for later tasks:
  - `const MODULES` — array of `{id:number, label:string, time:string}`, length 7.
  - `function goTo(n)` — activates module `n` (shows `#mod-n`, marks nav active/done, updates progress, scrolls top). Safe to call before module markup exists (guards on missing elements).
  - `function saveProgress()` / `function loadProgress()` — persist/restore the progress sets to `localStorage['lps-curso-ia-aplicada-v1']`.
  - State sets: `answeredQuestions`, `correctAnswers`, `quizAnswers`, `exercisesDone`, `completedModules` (used by Tasks 4, 5, 8).
  - `function restoreUI()` — re-applies persisted quiz/exercise state to the DOM (extended in Tasks 4 & 5; in this task it is an empty-safe stub that just updates score if present).

- [ ] **Step 1: Add the engine core to the `<script>` block**

Replace the `/* engine added in later tasks */` comment with:

```javascript
  // ─── MODULE DEFINITIONS ───
  const MODULES = [
    { id: 1, label: '¿Qué es un LLM?',              time: '8 min' },
    { id: 2, label: 'El dinero y la disrupción',     time: '10 min' },
    { id: 3, label: 'Prompts, contexto y tokens',    time: '10 min' },
    { id: 4, label: 'Las herramientas',              time: '20 min' },
    { id: 5, label: 'De PDF a datos',                time: '15 min' },
    { id: 6, label: 'Análisis con datos reales',     time: '20 min' },
    { id: 7, label: 'Case study financiero',         time: '15 min' }
  ];

  // ANSWERS filled in Task 4 (quizzes). Declared here so restoreUI can read it.
  var ANSWERS = {};

  // ─── STATE ───
  let currentModule = 1;
  let completedModules  = new Set();
  let answeredQuestions = new Set();
  let correctAnswers    = new Set();
  let quizAnswers       = {};            // { qid: chosenOptionIndex }
  let exercisesDone     = new Set();     // exercise ids

  var PROGRESS_KEY = 'lps-curso-ia-aplicada-v1';

  function progressBlob() {
    return {
      correctAnswers:    Array.from(correctAnswers),
      answeredQuestions: Array.from(answeredQuestions),
      quizAnswers:       quizAnswers,
      exercisesDone:     Array.from(exercisesDone),
      completedModules:  Array.from(completedModules)
    };
  }
  function saveProgress() {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressBlob())); } catch (e) {}
  }
  function loadProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.correctAnswers)    d.correctAnswers.forEach(function(id){ correctAnswers.add(id); });
      if (d.answeredQuestions) d.answeredQuestions.forEach(function(id){ answeredQuestions.add(id); });
      if (d.quizAnswers)       quizAnswers = d.quizAnswers;
      if (d.exercisesDone)     d.exercisesDone.forEach(function(id){ exercisesDone.add(id); });
      if (d.completedModules)  d.completedModules.forEach(function(id){ completedModules.add(id); });
    } catch (e) {}
  }

  // ─── NAV ───
  function buildNav() {
    var nav  = document.getElementById('nav-items');
    var tabs = document.getElementById('mobile-tabs');
    nav.innerHTML = ''; tabs.innerHTML = '';
    MODULES.forEach(function(m) {
      var btn = document.createElement('button');
      btn.className = 'nav-item'; btn.id = 'nav-' + m.id;
      btn.innerHTML = '<span class="nav-dot"></span><span style="flex:1">' + m.label + '</span><span style="font-size:11px;color:#555;flex-shrink:0">' + m.time + '</span>';
      btn.onclick = function(){ goTo(m.id); };
      nav.appendChild(btn);
      var tab = document.createElement('button');
      tab.className = 'mobile-tab'; tab.id = 'tab-' + m.id;
      tab.textContent = m.id;
      tab.onclick = function(){ goTo(m.id); };
      tabs.appendChild(tab);
    });
  }

  function goTo(n) {
    if (n === 7 && typeof buildResults === 'function') buildResults();
    if (currentModule !== n) { completedModules.add(currentModule); saveProgress(); }
    document.querySelectorAll('.module').forEach(function(m){ m.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(b){ b.classList.remove('active','done'); });
    document.querySelectorAll('.mobile-tab').forEach(function(t){ t.classList.remove('active'); });
    var mod = document.getElementById('mod-' + n);
    var navB = document.getElementById('nav-' + n);
    var tabB = document.getElementById('tab-' + n);
    if (mod)  mod.classList.add('active');
    if (navB) navB.classList.add('active');
    if (tabB) tabB.classList.add('active');
    completedModules.forEach(function(id){
      var el = document.getElementById('nav-' + id);
      if (el && id !== n) el.classList.add('done');
    });
    currentModule = n;
    updateProgress(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateProgress(n) {
    var pct = Math.round(((n - 1) / MODULES.length) * 100);
    var fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = pct + '%';
    var lbl = document.getElementById('progress-label');
    if (lbl) lbl.textContent = 'Módulo ' + n + ' de ' + MODULES.length;
  }

  // ─── THEME TOGGLE ───
  (function(){
    var btn = document.getElementById('courseThemeToggle');
    if (!btn) return;
    btn.addEventListener('click', function(){
      var root = document.documentElement;
      var isLight = root.getAttribute('data-theme') === 'light';
      if (isLight) { root.removeAttribute('data-theme'); localStorage.setItem('lps-theme','dark'); }
      else { root.setAttribute('data-theme','light'); localStorage.setItem('lps-theme','light'); }
    });
  })();

  // restoreUI is extended in Tasks 4 & 5. Stub here keeps init safe.
  function restoreUI() {
    if (typeof updateScore === 'function') updateScore();
  }

  // ─── INIT ───
  loadProgress();
  buildNav();
  goTo(1);
  document.addEventListener('DOMContentLoaded', function(){ restoreUI(); });
```

- [ ] **Step 2: Verify nav renders and navigation works**

Open `docs/curso.html`. Expected: sidebar now lists all 7 module labels with times; mobile tabs (numbers 1–7) appear under the bar at narrow widths. Module 1 nav item is highlighted. Clicking a nav item updates the progress label ("Módulo N de 7") and the progress bar fill width. No console errors (modules don't exist yet, so the content area shows only the footer — expected).

- [ ] **Step 3: Verify theme toggle + persistence**

Click the theme toggle: page switches light/dark. Reload: theme persists. In DevTools Application → Local Storage, confirm key `lps-theme` updates and that navigating sets `lps-curso-ia-aplicada-v1` (NOT `lps-progress-v1`).

Run: `grep -n "lps-progress-v1" docs/curso.html`
Expected: NO output.

- [ ] **Step 4: Commit**

```bash
git add docs/curso.html
git commit -m "curso: engine core — MODULES, nav, progress, theme, localStorage"
```

---

## Task 3: Reusable content components — quiz block + copy-block + exercise + score helpers

**Files:**
- Modify: `docs/curso.html` (the `<script>` block, append after the engine core)

**Interfaces:**
- Consumes: state sets from Task 2 (`answeredQuestions`, `correctAnswers`, `quizAnswers`, `exercisesDone`), `ANSWERS`, `saveProgress`.
- Produces, for module markup (Tasks 4,5,7,8) to call from inline `onclick`:
  - `function answer(qid, btn, isCorrect)` — handles a quiz click; locks options, shows feedback from `ANSWERS[qid]`, records correctness, saves, updates score.
  - `function copyCode(btn)` — copies the text of the `.copy-block-code` inside the button's nearest `.copy-block`; shows "✓ Copiado" briefly.
  - `function markEx(id, btn)` — marks exercise `id` done, flips the button to a done state, saves, updates score.
  - `function updateScore()` — recomputes the /100 score and updates `#score-display` if present.
  - Constants: `const EX_IDS` (list of all exercise ids, defined in Task 5/7 — declared empty here and reassigned), `const QUIZ_IDS` (declared empty here, reassigned in Task 4).
- The quiz/copy CSS already exists from Task 1's lifted styles (`.quiz-*`, `.copy-block`). This task adds ONLY the small CSS for `.copy-block-bar`/button and exercise done-state if not already present.

- [ ] **Step 1: Add component CSS (only what the lifted styles lack)**

Append inside the `<style>` block (before `</style>`). If a selector already exists from the lift, skip it.

```css
    /* ─── COPY BLOCK ─── */
    .copy-block { position: relative; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; margin: 16px 0; overflow: hidden; }
    .copy-block-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 12px; color: var(--muted); }
    .copy-block-code { margin: 0; padding: 14px 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: var(--text); }
    .copy-btn { background: none; border: 1px solid var(--border); color: var(--muted); border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
    .copy-btn:hover { color: var(--text); border-color: var(--muted); }
    /* ─── EXERCISE ─── */
    .exercise { border: 1px solid var(--amber-border); background: var(--amber-dim); border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .exercise-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; color: var(--text); margin-bottom: 8px; }
    .ex-done-btn { margin-top: 12px; background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
    .ex-done-btn.done { background: var(--success-dim); border-color: var(--success); color: var(--success); cursor: default; }
    /* ─── SCORE ─── */
    .score-pill { display:inline-flex; align-items:center; gap:8px; font-family:'Space Grotesk',sans-serif; font-weight:600; }
```

- [ ] **Step 2: Add component JS**

Append at the end of the `<script>` block (after the engine core, before the INIT section if not already — if INIT already ran, move INIT to the very bottom in this step so all functions are defined first). Concretely: cut the `// ─── INIT ───` block from Task 2 and re-paste it AFTER this new code.

```javascript
  // Reassigned by content tasks:
  var QUIZ_IDS = [];   // set in Task 4
  var EX_IDS   = [];   // set in Tasks 5 & 7

  // ─── QUIZ ───
  function answer(qid, btn, isCorrect) {
    if (answeredQuestions.has(qid)) return;
    answeredQuestions.add(qid);
    var container = document.getElementById(qid);
    var options = container.querySelectorAll('.quiz-option');
    var feedback = document.getElementById(qid + '-feedback');
    var data = ANSWERS[qid];
    options.forEach(function(opt){ opt.disabled = true; opt.classList.add('disabled'); });
    if (isCorrect) {
      btn.classList.remove('disabled'); btn.classList.add('correct');
      correctAnswers.add(qid);
    } else {
      btn.classList.remove('disabled'); btn.classList.add('wrong');
      var correctBtn = options[data.correct];
      if (correctBtn) { correctBtn.classList.remove('disabled'); correctBtn.classList.add('correct'); }
    }
    if (isCorrect) {
      feedback.className = 'quiz-feedback correct';
      feedback.textContent = '✓ ' + data.feedback.ok;
    } else {
      feedback.className = 'quiz-feedback wrong';
      feedback.innerHTML = '✗ ' + data.feedback.err + '<br><span style="display:block;margin-top:8px;color:var(--success);">✓ ' + data.feedback.ok + '</span>';
    }
    quizAnswers[qid] = Array.from(options).indexOf(btn);
    saveProgress();
    updateScore();
  }

  // ─── COPY BLOCK ───
  function copyCode(btn) {
    var block = btn.closest('.copy-block');
    if (!block) return;
    var code = block.querySelector('.copy-block-code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent).then(function(){
      var orig = btn.textContent;
      btn.textContent = '✓ Copiado';
      setTimeout(function(){ btn.textContent = orig; }, 1600);
    });
  }

  // ─── EXERCISE ───
  function markEx(id, btn) {
    exercisesDone.add(id);
    if (btn) { btn.classList.add('done'); btn.textContent = '✓ Hecho'; btn.disabled = true; }
    saveProgress();
    updateScore();
  }

  // ─── SCORE (/100) ───
  // Quizzes and exercises split the 100 points evenly across however many exist.
  function updateScore() {
    var totalItems = QUIZ_IDS.length + EX_IDS.length;
    var done = correctAnswers.size + exercisesDone.size;
    var score = totalItems ? Math.round((done / totalItems) * 100) : 0;
    var el = document.getElementById('score-display');
    if (el) el.textContent = score + ' / 100';
    var fill = document.getElementById('results-bar');
    if (fill) fill.style.width = score + '%';
    return score;
  }
```

- [ ] **Step 3: Extend `restoreUI` to re-apply quiz + exercise state**

Replace the `restoreUI` stub from Task 2 with:

```javascript
  function restoreUI() {
    // Quizzes
    QUIZ_IDS.forEach(function(qid){
      if (!answeredQuestions.has(qid)) return;
      var container = document.getElementById(qid);
      if (!container) return;
      var options = Array.from(container.querySelectorAll('.quiz-option'));
      options.forEach(function(opt){ opt.disabled = true; opt.classList.add('disabled'); });
      var isCorrect = correctAnswers.has(qid);
      var data = ANSWERS[qid];
      if (options[data.correct]) options[data.correct].classList.add('correct');
      var chosen = quizAnswers[qid];
      if (!isCorrect && chosen !== undefined && options[chosen]) options[chosen].classList.add('wrong');
      var feedback = document.getElementById(qid + '-feedback');
      if (feedback) {
        feedback.className = 'quiz-feedback ' + (isCorrect ? 'correct' : 'wrong');
        if (isCorrect) feedback.textContent = '✓ ' + data.feedback.ok;
        else feedback.innerHTML = '✗ ' + data.feedback.err + '<br><span style="display:block;margin-top:8px;color:var(--success);">✓ ' + data.feedback.ok + '</span>';
      }
    });
    // Exercises
    EX_IDS.forEach(function(id){
      if (!exercisesDone.has(id)) return;
      var btn = document.getElementById('ex-btn-' + id);
      if (btn) { btn.classList.add('done'); btn.textContent = '✓ Hecho'; btn.disabled = true; }
    });
    updateScore();
  }
```

- [ ] **Step 4: Verify nothing breaks**

Open `docs/curso.html`. Expected: identical to Task 2 (nav, theme work; no modules yet). No console errors. The new functions exist but aren't called yet.

Run: `grep -nc "function answer\|function copyCode\|function markEx\|function updateScore" docs/curso.html`
Expected: `4`.

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "curso: reusable quiz / copy-block / exercise / score engine"
```

---

## Task 4: Modules 1–3 content (LLMs, money & disruption, prompts/context/tokens) + their quizzes

**Files:**
- Modify: `docs/curso.html` (insert module markup in `.content-area`; set `ANSWERS` + `QUIZ_IDS` for q1–q3)

**Interfaces:**
- Consumes: `.module`/`.module-eyebrow`/`.module-title`/`.module-desc` CSS (Task 1), `answer()` + quiz CSS (Task 3), `goTo` (Task 2).
- Produces: `#mod-1`, `#mod-2`, `#mod-3` sections each ending with a quiz (`q1`,`q2`,`q3`); `ANSWERS` entries for q1–q3; `QUIZ_IDS` includes `q1,q2,q3` (extended in Tasks 5,7).
- Each module ends with a `.module-nav` row containing a "Siguiente módulo →" button calling `goTo(next)`.

- [ ] **Step 1: Insert Modules 1–3 markup**

Inside `.content-area`, BEFORE the `<footer>`, insert the three modules. Module 1 is `active` by default. Use this exact pattern (content copy in Spanish, audience = cero código). The quiz markup pattern is fixed; only the copy varies.

Quiz block pattern (reused for every quiz — `data.correct` is the 0-based index of the correct `.quiz-option`):

```html
<div class="quiz-block">
  <h3 class="quiz-q">Pregunta</h3>
  <div class="quiz-options" id="q1">
    <button class="quiz-option" onclick="answer('q1', this, false)">Opción A</button>
    <button class="quiz-option" onclick="answer('q1', this, true)">Opción B (correcta)</button>
    <button class="quiz-option" onclick="answer('q1', this, false)">Opción C</button>
  </div>
  <div class="quiz-feedback" id="q1-feedback"></div>
</div>
```

Insert:

```html
<section class="module active" id="mod-1">
  <div class="module-eyebrow">Parte I · Módulo 1</div>
  <h1 class="module-title">¿Qué es un LLM?</h1>
  <p class="module-desc">La versión sin tecnicismos: qué hace por dentro un modelo de lenguaje y por qué eso explica tanto sus aciertos como sus errores.</p>
  <p>Un <strong>LLM</strong> (modelo grande de lenguaje, como ChatGPT o Claude) hace una sola cosa, muy bien: <strong>predice la siguiente palabra</strong>. Leyó cantidades enormes de texto y aprendió qué palabra suele seguir a otra. Cuando le escribes, va eligiendo palabra por palabra la continuación más probable.</p>
  <p>Piensa en el autocompletado de tu teléfono — pero con esteroides. No "entiende" como una persona; reconoce patrones a una escala gigantesca. Por eso suena tan natural… y por eso a veces <strong>inventa</strong> con total seguridad datos, fechas o citas que no existen (a esto se le llama "alucinar").</p>
  <p>La conclusión práctica para tu negocio: la IA es una herramienta que <strong>propone</strong>. Tú revisas y decides. Nunca uses una respuesta sin revisarla.</p>
  <div class="quiz-block">
    <h3 class="quiz-q">¿Por qué la IA puede dar información incorrecta con tanta seguridad?</h3>
    <div class="quiz-options" id="q1">
      <button class="quiz-option" onclick="answer('q1', this, false)">Porque está conectada a internet y copia páginas con errores.</button>
      <button class="quiz-option" onclick="answer('q1', this, false)">Porque a veces se le acaba la memoria.</button>
      <button class="quiz-option" onclick="answer('q1', this, true)">Porque predice la palabra más probable, no verifica si es verdad.</button>
    </div>
    <div class="quiz-feedback" id="q1-feedback"></div>
  </div>
  <div class="module-nav"><button class="next-btn" onclick="goTo(2)">Siguiente módulo →</button></div>
</section>

<section class="module" id="mod-2">
  <div class="module-eyebrow">Parte I · Módulo 2</div>
  <h1 class="module-title">El dinero y la disrupción</h1>
  <p class="module-desc">Por qué esto no es una moda pasajera — y qué significa para tu trabajo y el de tu equipo.</p>
  <p>Detrás de la IA hay una de las mayores olas de inversión de la historia reciente: cientos de miles de millones de dólares de las empresas más grandes del mundo. Cuando entra ese dinero, el mercado se mueve rápido.</p>
  <p>Ya estamos viendo el efecto: <strong>despidos y reestructuraciones</strong> en áreas donde la IA automatiza tareas repetitivas, y al mismo tiempo una demanda enorme de gente que <strong>sabe usarla</strong>. No es que "la IA reemplace personas" — es que <strong>las personas que usan IA reemplazan a las que no</strong>.</p>
  <p>La habilidad del futuro no es programar. Es saberle <strong>pedir bien las cosas</strong> a la IA y revisar su trabajo con criterio. Eso es exactamente lo que aprendes en este curso. Quien lo domina se vuelve indispensable; quien lo ignora se queda atrás.</p>
  <div class="quiz-block">
    <h3 class="quiz-q">¿Cuál es la habilidad más valiosa frente a la IA, según este módulo?</h3>
    <div class="quiz-options" id="q2">
      <button class="quiz-option" onclick="answer('q2', this, false)">Aprender a programar lo antes posible.</button>
      <button class="quiz-option" onclick="answer('q2', this, true)">Saber pedirle bien las cosas y revisar su trabajo con criterio.</button>
      <button class="quiz-option" onclick="answer('q2', this, false)">Comprar la herramienta de IA más cara del mercado.</button>
    </div>
    <div class="quiz-feedback" id="q2-feedback"></div>
  </div>
  <div class="module-nav"><button class="next-btn" onclick="goTo(3)">Siguiente módulo →</button></div>
</section>

<section class="module" id="mod-3">
  <div class="module-eyebrow">Parte II · Módulo 3</div>
  <h1 class="module-title">Prompts, contexto y tokens</h1>
  <p class="module-desc">Tres palabras que vas a escuchar siempre. En cuanto las entiendes, todo lo demás se vuelve fácil.</p>
  <p><strong>Prompt</strong> es simplemente <em>lo que le pides</em> a la IA: tu instrucción. Un buen prompt es claro y específico.</p>
  <p><strong>Contexto</strong> es todo lo que la IA "tiene presente" mientras te responde: tu pregunta, los mensajes anteriores de la conversación y los documentos que le pegaste. Si no está en el contexto, la IA no lo sabe. Por eso, mientras más contexto útil le das, mejor responde.</p>
  <p><strong>Tokens</strong> son las piezas en que la IA parte el texto (más o menos, trozos de palabras). Importan por dos razones: hay un <strong>límite</strong> de cuánto contexto cabe, y el costo se mide en tokens. No necesitas contarlos — solo saber que textos enormes pueden no caber completos.</p>
  <div class="quiz-block">
    <h3 class="quiz-q">Le pegas un contrato de 80 páginas y la IA "olvida" el principio. ¿Por qué?</h3>
    <div class="quiz-options" id="q3">
      <button class="quiz-option" onclick="answer('q3', this, false)">Porque los prompts solo aceptan preguntas cortas.</button>
      <button class="quiz-option" onclick="answer('q3', this, true)">Porque hay un límite de tokens y un texto tan largo puede no caber completo en el contexto.</button>
      <button class="quiz-option" onclick="answer('q3', this, false)">Porque la IA no puede leer documentos, solo texto que escribes a mano.</button>
    </div>
    <div class="quiz-feedback" id="q3-feedback"></div>
  </div>
  <div class="module-nav"><button class="next-btn" onclick="goTo(4)">Siguiente módulo →</button></div>
</section>
```

- [ ] **Step 2: Add `.module-nav` / `.next-btn` / `.quiz-block` / `.quiz-q` CSS if missing**

Check the lifted styles. If `.quiz-block`, `.quiz-q`, `.quiz-options`, `.module-nav`, `.next-btn` are not all present, append:

```css
    .quiz-block { margin: 28px 0; padding: 20px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
    .quiz-q { font-size: 16px; margin-bottom: 14px; }
    .quiz-options { display: flex; flex-direction: column; gap: 10px; }
    .module-nav { margin-top: 36px; display: flex; justify-content: flex-end; }
    .next-btn { background: var(--amber); border: none; color: #000; font-weight: 700; border-radius: 8px; padding: 11px 20px; font-size: 14px; cursor: pointer; }
    .next-btn:hover { opacity: 0.9; }
```

- [ ] **Step 3: Set `ANSWERS` and `QUIZ_IDS` for q1–q3**

In the `<script>`, replace `var ANSWERS = {};` with the populated object, and replace `var QUIZ_IDS = [];` with the q1–q3 list. (Tasks 5 & 7 will append more entries.)

```javascript
  var ANSWERS = {
    q1: { correct: 2, feedback: { ok: 'La IA predice la palabra más probable según patrones — no comprueba si es cierto. Por eso siempre revisas antes de usar.', err: 'No es por internet ni por memoria: la IA predice texto probable, no verifica la verdad. Por eso puede inventar con seguridad.' } },
    q2: { correct: 1, feedback: { ok: 'Exacto. El valor está en pedir bien y revisar con criterio — eso es lo que este curso te enseña.', err: 'No. No necesitas programar ni comprar lo más caro: la habilidad clave es pedir bien y revisar con criterio.' } },
    q3: { correct: 1, feedback: { ok: 'Correcto. Hay un límite de tokens (contexto); un texto enorme puede no caber completo y la IA "pierde" partes.', err: 'No. La IA sí lee documentos largos; el problema es el límite de tokens: un texto enorme puede no caber completo en el contexto.' } }
  };
```
```javascript
  var QUIZ_IDS = ['q1','q2','q3'];
```

- [ ] **Step 4: Verify Modules 1–3**

Open `docs/curso.html`. Expected: Module 1 visible with copy + quiz. Click each quiz option in M1/M2/M3 → correct shows green ✓ feedback, wrong shows red ✗ + the correct answer highlighted; options lock after answering. "Siguiente módulo →" advances. Reload after answering q1 correctly → restoreUI re-shows the answered/locked state. No console errors.

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "curso: Modules 1-3 (LLMs, disruption, prompts/context/tokens) + quizzes"
```

---

## Task 5: Module 4 — Las herramientas, with the Claude Code install guide (OS tabs)

**Files:**
- Modify: `docs/curso.html` (insert `#mod-4`; add OS-tab + terminal-mock + key-combo + install-step CSS; add OS autodetect + tab-switch JS; add exercise `ex-tools`)

**Interfaces:**
- Consumes: `copyCode()`, `markEx()` (Task 3); `.module-*` CSS (Task 1).
- Produces: `#mod-4` with the tools content and a copy-paste exercise (`ex-tools`); `EX_IDS` includes `'ex-tools'` (extended in Task 7); `function showOS(os)` for tab switching; an OS autodetect IIFE.

- [ ] **Step 1: Add Module 4 component CSS**

Append to `<style>`:

```css
    /* ─── OS TABS ─── */
    .os-tabs { display: flex; gap: 8px; margin: 20px 0 0; }
    .os-tab { flex: 1; background: var(--surface2); border: 1px solid var(--border); color: var(--muted); border-radius: 10px 10px 0 0; padding: 12px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .os-tab.active { background: var(--surface); border-bottom-color: var(--surface); color: var(--text); border-top: 2px solid var(--amber); }
    .os-panel { display: none; border: 1px solid var(--border); border-top: none; border-radius: 0 0 12px 12px; padding: 22px; background: var(--surface); }
    .os-panel.active { display: block; }
    /* ─── INSTALL STEP ─── */
    .install-step { display: flex; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); }
    .install-step:last-child { border-bottom: none; }
    .install-num { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; background: var(--amber); color: #000; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .install-body { flex: 1; }
    .install-body h4 { font-size: 15px; margin-bottom: 6px; }
    /* ─── KEY COMBO ─── */
    .key-combo { display: inline-flex; align-items: center; gap: 6px; margin: 8px 0; }
    .key-combo kbd { font-family: ui-monospace, monospace; font-size: 13px; background: var(--surface2); border: 1px solid var(--border); border-bottom-width: 3px; border-radius: 6px; padding: 4px 10px; color: var(--text); }
    .key-combo .plus { color: var(--muted); font-weight: 700; }
    /* ─── TERMINAL MOCK ─── */
    .terminal-mock { background: #0c0c0c; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin: 10px 0; }
    [data-theme="light"] .terminal-mock { background: #1e1e1e; }
    .terminal-bar { display: flex; gap: 6px; padding: 8px 12px; background: #1a1a1a; }
    .terminal-bar span { width: 11px; height: 11px; border-radius: 50%; }
    .terminal-bar .r { background: #ff5f57; } .terminal-bar .y { background: #febc2e; } .terminal-bar .g { background: #28c840; }
    .terminal-body { padding: 14px 16px; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.6; color: #d6d6d6; white-space: pre-wrap; }
    .terminal-body .prompt { color: #28c840; }
    .terminal-body .comment { color: #777; }
    .install-warning { margin-top: 10px; border-left: 3px solid var(--amber); background: var(--amber-dim); padding: 10px 14px; border-radius: 0 8px 8px 0; font-size: 13px; }
```

- [ ] **Step 2: Insert Module 4 markup**

Insert `#mod-4` after `#mod-3`, before the footer. The three OS panels share the same step structure; commands differ per OS. Use copy-blocks (Task 3 pattern) for every command so each is copyable.

```html
<section class="module" id="mod-4">
  <div class="module-eyebrow">Parte II · Módulo 4</div>
  <h1 class="module-title">Las herramientas</h1>
  <p class="module-desc">Cuatro herramientas que vas a usar. La estrella es Claude Code — aquí está cómo instalarla, paso a paso, en tu sistema.</p>

  <h2 style="margin:24px 0 6px;">1. Claude Code (modo pro)</h2>
  <p>Es la versión más potente: la IA trabaja en tu computadora desde la <strong>terminal</strong> (esa ventana de texto donde se escriben comandos). Suena técnico, pero la instalación es copiar y pegar. Elige tu sistema:</p>

  <div class="os-tabs">
    <button class="os-tab" id="ostab-win"   onclick="showOS('win')">🪟 Windows</button>
    <button class="os-tab" id="ostab-mac"   onclick="showOS('mac')">🍎 Mac</button>
    <button class="os-tab" id="ostab-linux" onclick="showOS('linux')">🐧 Linux</button>
  </div>

  <!-- WINDOWS -->
  <div class="os-panel" id="ospanel-win">
    <div class="install-step"><div class="install-num">1</div><div class="install-body">
      <h4>Abre la terminal</h4>
      <p>Presiona estas dos teclas juntas, escribe <code>cmd</code> y pulsa Enter:</p>
      <div class="key-combo"><kbd>⊞ Win</kbd><span class="plus">+</span><kbd>R</kbd></div>
      <p>Se abre una ventana negra: esa es la terminal. (También puedes usar la app "Terminal de Windows" desde el menú Inicio.)</p>
    </div></div>
    <div class="install-step"><div class="install-num">2</div><div class="install-body">
      <h4>Instala Node.js (lo necesita Claude Code)</h4>
      <p>Ve a <strong>nodejs.org</strong>, descarga la versión <strong>LTS</strong> para Windows y abre el instalador. Dale "Siguiente" en todo y "Finalizar" — los valores por defecto están bien.</p>
      <div class="install-warning">⚠️ Cuando termine de instalar Node.js, <strong>cierra y vuelve a abrir la terminal</strong> para que reconozca los comandos nuevos.</div>
    </div></div>
    <div class="install-step"><div class="install-num">3</div><div class="install-body">
      <h4>Verifica que Node quedó instalado</h4>
      <p>Escribe esto y pulsa Enter. Debe responder con un número de versión (algo como <code>v24.x.x</code>):</p>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">node --version</pre></div>
    </div></div>
    <div class="install-step"><div class="install-num">4</div><div class="install-body">
      <h4>Instala Claude Code</h4>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">npm install -g @anthropic-ai/claude-code</pre></div>
    </div></div>
    <div class="install-step"><div class="install-num">5</div><div class="install-body">
      <h4>Arráncalo</h4>
      <p>Escribe <code>claude</code> y pulsa Enter. La primera vez te pedirá iniciar sesión con tu cuenta.</p>
      <div class="terminal-mock"><div class="terminal-bar"><span class="r"></span><span class="y"></span><span class="g"></span></div><div class="terminal-body"><span class="prompt">C:\Users\tu-usuario></span> claude
<span class="comment"># ¡Listo! Claude Code abre y te pide iniciar sesión.</span></div></div>
    </div></div>
  </div>

  <!-- MAC -->
  <div class="os-panel" id="ospanel-mac">
    <div class="install-step"><div class="install-num">1</div><div class="install-body">
      <h4>Abre la terminal</h4>
      <p>Presiona estas dos teclas, escribe <code>Terminal</code> y pulsa Enter:</p>
      <div class="key-combo"><kbd>⌘ Cmd</kbd><span class="plus">+</span><kbd>Espacio</kbd></div>
      <p>Eso abre el buscador Spotlight; al escribir "Terminal" aparece la app. Ábrela.</p>
    </div></div>
    <div class="install-step"><div class="install-num">2</div><div class="install-body">
      <h4>Instala Node.js (lo necesita Claude Code)</h4>
      <p>Ve a <strong>nodejs.org</strong>, descarga la versión <strong>LTS</strong> para macOS y abre el instalador (<code>.pkg</code>). Dale "Continuar" en todo.</p>
      <div class="install-warning">⚠️ Al terminar, <strong>cierra y vuelve a abrir la terminal</strong>.</div>
    </div></div>
    <div class="install-step"><div class="install-num">3</div><div class="install-body">
      <h4>Verifica Node</h4>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">node --version</pre></div>
    </div></div>
    <div class="install-step"><div class="install-num">4</div><div class="install-body">
      <h4>Instala Claude Code</h4>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">npm install -g @anthropic-ai/claude-code</pre></div>
      <div class="install-warning">Si ves un error de permisos, antepón <code>sudo</code> y te pedirá tu contraseña de Mac.</div>
    </div></div>
    <div class="install-step"><div class="install-num">5</div><div class="install-body">
      <h4>Arráncalo</h4>
      <div class="terminal-mock"><div class="terminal-bar"><span class="r"></span><span class="y"></span><span class="g"></span></div><div class="terminal-body"><span class="prompt">tu-mac:~ usuario$</span> claude
<span class="comment"># ¡Listo! Inicia sesión cuando lo pida.</span></div></div>
    </div></div>
  </div>

  <!-- LINUX -->
  <div class="os-panel" id="ospanel-linux">
    <div class="install-step"><div class="install-num">1</div><div class="install-body">
      <h4>Abre la terminal</h4>
      <div class="key-combo"><kbd>Ctrl</kbd><span class="plus">+</span><kbd>Alt</kbd><span class="plus">+</span><kbd>T</kbd></div>
      <p>En la mayoría de las distribuciones esto abre la terminal directamente.</p>
    </div></div>
    <div class="install-step"><div class="install-num">2</div><div class="install-body">
      <h4>Instala Node.js</h4>
      <p>En distribuciones basadas en Debian/Ubuntu:</p>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">sudo apt update && sudo apt install -y nodejs npm</pre></div>
      <div class="install-warning">⚠️ Otras distros usan otro gestor (<code>dnf</code>, <code>pacman</code>). Si la versión de Node es vieja, instala la LTS con <strong>nvm</strong> (nodejs.org explica cómo).</div>
    </div></div>
    <div class="install-step"><div class="install-num">3</div><div class="install-body">
      <h4>Verifica Node</h4>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">node --version</pre></div>
    </div></div>
    <div class="install-step"><div class="install-num">4</div><div class="install-body">
      <h4>Instala Claude Code</h4>
      <div class="copy-block"><div class="copy-block-bar"><span>terminal</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">sudo npm install -g @anthropic-ai/claude-code</pre></div>
    </div></div>
    <div class="install-step"><div class="install-num">5</div><div class="install-body">
      <h4>Arráncalo</h4>
      <div class="terminal-mock"><div class="terminal-bar"><span class="r"></span><span class="y"></span><span class="g"></span></div><div class="terminal-body"><span class="prompt">usuario@equipo:~$</span> claude
<span class="comment"># ¡Listo! Inicia sesión cuando lo pida.</span></div></div>
    </div></div>
  </div>

  <h3 style="margin:26px 0 6px;">El archivo CLAUDE.md (en 30 segundos)</h3>
  <p>Dentro de tu proyecto puedes crear un archivo llamado <code>CLAUDE.md</code>. Ahí escribes, en español normal, las reglas de tu negocio: cómo se llama tu empresa, qué tono usar, qué nunca hacer. Claude Code lo lee solo en cada sesión, así no repites el contexto cada vez.</p>

  <h3 style="margin:22px 0 6px;">Agentes y skills (panorama)</h3>
  <p>Una <strong>skill</strong> es un prompt que guardaste y reutilizas (ej. "resume así mis reportes de ventas"). Un <strong>agente</strong> es la IA configurada para una tarea específica con sus propias instrucciones. No los construimos a fondo hoy — solo que sepas que existen y que es a donde lleva este camino.</p>

  <h2 style="margin:30px 0 6px;">2. ChatGPT (rápido)</h2>
  <p>El más conocido. Excelente para redactar, resumir y conversar. Lo usas en el navegador o su app. Para análisis de documentos largos y trabajo cuidadoso, Claude suele ir un paso adelante.</p>

  <h2 style="margin:24px 0 6px;">3. Las apps nativas de Claude</h2>
  <p>La app de Claude puede conectarse a herramientas que ya usas y actuar sobre ellas:</p>
  <ul style="margin:8px 0 8px 20px;">
    <li><strong>Gmail</strong> — redactar correos y dejarlos <em>en borrador</em> para que tú los revises antes de enviar.</li>
    <li><strong>Google Calendar</strong> — consultar tu agenda y crear eventos.</li>
  </ul>
  <p>La idea es siempre la misma: la IA prepara, tú apruebas.</p>

  <div class="exercise">
    <div class="exercise-title">✋ Ejercicio: tu primer borrador en Gmail</div>
    <p>Copia este prompt, pégalo en la app de Claude (con Gmail conectado) y revisa el borrador que deja. Ajusta los datos entre corchetes.</p>
    <div class="copy-block"><div class="copy-block-bar"><span>prompt</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">Redacta un correo breve y profesional para [nombre del cliente] recordándole el pago pendiente de [monto] con fecha límite [fecha]. Tono cordial pero firme, máximo 120 palabras. Déjalo en borrador, no lo envíes.</pre></div>
    <button class="ex-done-btn" id="ex-btn-ex-tools" onclick="markEx('ex-tools', this)">Marcar como hecho</button>
  </div>

  <div class="module-nav"><button class="next-btn" onclick="goTo(5)">Siguiente módulo →</button></div>
</section>
```

- [ ] **Step 3: Add OS-tab JS (autodetect + switch) and register the exercise**

In the `<script>`, set `EX_IDS` to include the tools exercise, and add the OS functions. Replace `var EX_IDS   = [];` with:

```javascript
  var EX_IDS = ['ex-tools'];   // extended in Task 7
```

Add (near the other UI functions):

```javascript
  // ─── OS TABS (Module 4) ───
  function showOS(os) {
    ['win','mac','linux'].forEach(function(k){
      var tab = document.getElementById('ostab-' + k);
      var pan = document.getElementById('ospanel-' + k);
      var on = (k === os);
      if (tab) tab.classList.toggle('active', on);
      if (pan) pan.classList.toggle('active', on);
    });
  }
  function detectOS() {
    var p = (navigator.userAgent + ' ' + (navigator.platform || '')).toLowerCase();
    if (p.indexOf('win') !== -1) return 'win';
    if (p.indexOf('mac') !== -1 || p.indexOf('iphone') !== -1 || p.indexOf('ipad') !== -1) return 'mac';
    if (p.indexOf('linux') !== -1 || p.indexOf('android') !== -1) return 'linux';
    return 'win';
  }
```

Add the autodetect call inside the existing init (right after `goTo(1);`):

```javascript
  showOS(detectOS());
```

- [ ] **Step 4: Verify Module 4**

Open `docs/curso.html`, go to Module 4. Expected: the OS tab matching your system is open by default (on Windows, the Windows panel). Clicking each tab swaps panels. Every "Copiar" button copies its command (paste somewhere to confirm). Terminal mocks render with colored dots + green prompt. Key combos render as physical-looking keys. The exercise "Marcar como hecho" flips to "✓ Hecho" and locks; reload → it stays done (restoreUI).

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "curso: Module 4 — herramientas + Claude Code install guide (OS tabs)"
```

---

## Task 6: Modules 5 & 6 — PDF→data and real-data analysis (with datasets) + quizzes/exercises

**Files:**
- Modify: `docs/curso.html` (insert `#mod-5`, `#mod-6`; append `ANSWERS` q4–q5; extend `QUIZ_IDS`, `EX_IDS`)

**Interfaces:**
- Consumes: `copyCode`, `markEx`, `answer`, quiz/exercise CSS.
- Produces: `#mod-5` (quiz `q4`, exercise `ex-pdf`), `#mod-6` (quiz `q5`, exercise `ex-kpi`); `ANSWERS` gains q4,q5; `QUIZ_IDS` gains q4,q5; `EX_IDS` gains ex-pdf, ex-kpi.
- References real files under `docs/recursos/`: `contrato_arcoiris.pdf`, `ventas_lineas_2t_2026.csv`, `egresos_2t_2026.csv`.

- [ ] **Step 1: Insert Modules 5 & 6 markup**

Insert after `#mod-4`, before footer:

```html
<section class="module" id="mod-5">
  <div class="module-eyebrow">Parte III · Módulo 5</div>
  <h1 class="module-title">De PDF a datos</h1>
  <p class="module-desc">Los PDFs son cárceles de información: ves los números pero no puedes usarlos. La IA los libera.</p>
  <p>Hay tres formas de meterle un PDF a la IA, de menos a más técnica:</p>
  <h3 style="margin:18px 0 6px;">a) Pegarle el texto o subir el archivo</h3>
  <p>Lo más simple: subes el PDF a Claude y le preguntas. Funciona perfecto para contratos, facturas y reportes de tamaño normal. La IA lee el texto y responde sobre su contenido.</p>
  <h3 style="margin:18px 0 6px;">b) Visión (para PDFs escaneados)</h3>
  <p>Si el PDF es una <em>foto</em> (escaneado, sin texto seleccionable), la IA puede "verlo" con visión y leer lo que aparece en la imagen. Sujeto al tamaño: páginas sueltas funcionan muy bien.</p>
  <h3 style="margin:18px 0 6px;">c) Scripts, cuando son muchos (demo)</h3>
  <p>Cuando tienes <strong>cientos</strong> de PDFs iguales (todas tus facturas del año), conviene un pequeño script que extrae los datos automáticamente. Una herramienta común es <code>pdfplumber</code>. No tienes que escribirlo tú — la IA te lo arma. Así se ve la idea:</p>
  <div class="copy-block"><div class="copy-block-bar"><span>ejemplo · python</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">import pdfplumber

with pdfplumber.open("factura.pdf") as pdf:
    texto = pdf.pages[0].extract_text()
    print(texto)   # ahora el texto es datos que puedes procesar</pre></div>
  <p style="color:var(--muted);font-size:14px;">No te preocupes por entender cada línea. El punto es: lo que estaba atrapado en el PDF ahora es información que puedes analizar.</p>
  <p>¿Y un libro entero en PDF? Se puede, pero choca con el límite de tokens (Módulo 3). Para eso existen técnicas más avanzadas — es la puerta a la que llegas después de este curso.</p>

  <div class="exercise">
    <div class="exercise-title">✋ Ejercicio: extrae datos de un contrato real</div>
    <p>Descarga este contrato de ejemplo, súbelo a Claude y pídele lo de abajo.</p>
    <p><a href="recursos/contrato_arcoiris.pdf" target="_blank" rel="noopener" style="color:var(--amber);">📄 Descargar contrato_arcoiris.pdf</a></p>
    <div class="copy-block"><div class="copy-block-bar"><span>prompt</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">Te adjunto un contrato. Extrae en una tabla: las partes involucradas, el objeto del contrato, el monto, la vigencia y cualquier penalización o fecha límite. Si algo no aparece, escribe "no especificado".</pre></div>
    <button class="ex-done-btn" id="ex-btn-ex-pdf" onclick="markEx('ex-pdf', this)">Marcar como hecho</button>
  </div>

  <div class="quiz-block">
    <h3 class="quiz-q">Tienes 300 facturas en PDF, todas con el mismo formato. ¿Cuál es el mejor enfoque?</h3>
    <div class="quiz-options" id="q4">
      <button class="quiz-option" onclick="answer('q4', this, false)">Subirlas una por una y copiar los datos a mano.</button>
      <button class="quiz-option" onclick="answer('q4', this, true)">Pedirle a la IA un script (tipo pdfplumber) que extraiga los datos de todas automáticamente.</button>
      <button class="quiz-option" onclick="answer('q4', this, false)">No se puede; los PDFs no se pueden procesar en masa.</button>
    </div>
    <div class="quiz-feedback" id="q4-feedback"></div>
  </div>
  <div class="module-nav"><button class="next-btn" onclick="goTo(6)">Siguiente módulo →</button></div>
</section>

<section class="module" id="mod-6">
  <div class="module-eyebrow">Parte III · Módulo 6</div>
  <h1 class="module-title">Análisis con datos reales</h1>
  <p class="module-desc">Ya tienes los datos sueltos. Ahora los conviertes en decisiones: KPIs, tendencias y un Excel ordenado.</p>
  <p>Vamos a trabajar con un caso real: una <strong>distribuidora de autopartes en Hermosillo</strong>. Tiene sus ventas por línea de producto y sus egresos del trimestre. El reto típico: "tengo los números pero no sé qué me están diciendo".</p>
  <p>Descarga los dos archivos y dáselos a la IA:</p>
  <p>
    <a href="recursos/ventas_lineas_2t_2026.csv" target="_blank" rel="noopener" style="color:var(--amber);">📊 ventas_lineas_2t_2026.csv</a> &nbsp;·&nbsp;
    <a href="recursos/egresos_2t_2026.csv" target="_blank" rel="noopener" style="color:var(--amber);">💸 egresos_2t_2026.csv</a>
  </p>
  <p>Un <strong>KPI</strong> es un número que resume cómo va el negocio: margen por línea, línea más rentable, gasto más grande. La IA los saca en segundos — tú decides cuáles importan.</p>

  <div class="exercise">
    <div class="exercise-title">✋ Ejercicio: saca KPIs y arma el Excel</div>
    <div class="copy-block"><div class="copy-block-bar"><span>prompt</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">Te adjunto las ventas por línea y los egresos de mi distribuidora (segundo trimestre). Quiero que:
1. Calcules el margen por línea de producto y me digas cuál es la más y la menos rentable.
2. Identifiques mis 3 gastos más grandes y qué porcentaje son del total.
3. Me des 3 conclusiones accionables en lenguaje sencillo.
4. Organices todo en una tabla lista para pegar en Excel.</pre></div>
    <button class="ex-done-btn" id="ex-btn-ex-kpi" onclick="markEx('ex-kpi', this)">Marcar como hecho</button>
  </div>

  <div class="quiz-block">
    <h3 class="quiz-q">¿Para qué sirve un KPI?</h3>
    <div class="quiz-options" id="q5">
      <button class="quiz-option" onclick="answer('q5', this, false)">Para guardar los archivos en la nube.</button>
      <button class="quiz-option" onclick="answer('q5', this, true)">Para resumir en un número clave cómo va el negocio y poder decidir.</button>
      <button class="quiz-option" onclick="answer('q5', this, false)">Es un formato de archivo de Excel.</button>
    </div>
    <div class="quiz-feedback" id="q5-feedback"></div>
  </div>
  <div class="module-nav"><button class="next-btn" onclick="goTo(7)">Siguiente módulo →</button></div>
</section>
```

- [ ] **Step 2: Append q4, q5 to `ANSWERS`; extend `QUIZ_IDS` and `EX_IDS`**

Add q4 and q5 inside the `ANSWERS` object:

```javascript
    q4: { correct: 1, feedback: { ok: 'Correcto. Con muchos PDFs iguales, un script (como pdfplumber) extrae todo automáticamente — y la IA te lo arma.', err: 'No. A mano es lentísimo y sí se puede en masa: la IA te arma un script que extrae los datos de todos los PDFs.' } },
    q5: { correct: 1, feedback: { ok: 'Exacto. Un KPI resume en un número clave cómo va el negocio para poder decidir.', err: 'No. Un KPI no es almacenamiento ni un formato: es un número clave que resume el desempeño del negocio.' } }
```

Update the id arrays:

```javascript
  var QUIZ_IDS = ['q1','q2','q3','q4','q5'];
```
```javascript
  var EX_IDS = ['ex-tools','ex-pdf','ex-kpi'];   // extended in Task 7
```

- [ ] **Step 3: Verify Modules 5 & 6 + dataset links**

Open `docs/curso.html`. Go to M5 and M6. Expected: copy of both modules renders; the download links point to the real files. Click each download link → the CSV/PDF opens or downloads (files exist in `docs/recursos/`). Quizzes q4/q5 behave correctly. Exercises ex-pdf and ex-kpi mark done and persist.

Run: `ls docs/recursos/contrato_arcoiris.pdf docs/recursos/ventas_lineas_2t_2026.csv docs/recursos/egresos_2t_2026.csv`
Expected: all three paths exist.

- [ ] **Step 4: Commit**

```bash
git add docs/curso.html
git commit -m "curso: Modules 5-6 — PDF→data + real-data analysis with datasets"
```

---

## Task 7: Module 7 — Case study (public company) + results screen

**Files:**
- Modify: `docs/curso.html` (insert `#mod-7` with content, exercise `ex-case`, and the results screen; add `buildResults`; extend `EX_IDS`)

**Interfaces:**
- Consumes: `copyCode`, `markEx`, `updateScore`, `correctAnswers`, `exercisesDone`, `QUIZ_IDS`, `EX_IDS`.
- Produces: `#mod-7` with case-study content, exercise `ex-case`, and a `#results` block (score + breakdown); `function buildResults()` (called by `goTo(7)` from Task 2); `EX_IDS` final list includes `ex-case`.
- References `docs/recursos/competencia_por_linea.csv`.

- [ ] **Step 1: Insert Module 7 markup (content + exercise + results)**

Insert after `#mod-6`, before footer:

```html
<section class="module" id="mod-7">
  <div class="module-eyebrow">Parte IV · Módulo 7</div>
  <h1 class="module-title">Case study: análisis financiero de una empresa pública</h1>
  <p class="module-desc">El nivel jefe: entender a un competidor grande que cotiza en bolsa — y al mercado entero — con IA.</p>
  <p>Las empresas que cotizan en bolsa están <strong>obligadas a publicar</strong> sus números: ventas, utilidades, deudas. Es información pública y gratuita. La IA puede leer esos estados financieros y explicártelos en español sencillo.</p>
  <h3 style="margin:18px 0 6px;">Leer estados financieros con IA</h3>
  <p>Le das el reporte (o el enlace) y preguntas lo que un dueño querría saber: ¿están creciendo? ¿de dónde sale su dinero? ¿qué línea les funciona? La IA traduce la jerga contable a decisiones.</p>
  <h3 style="margin:18px 0 6px;">Un mini-modelo con scrapers (demo)</h3>
  <p>Para seguir a un competidor de forma continua, se puede armar un pequeño <strong>scraper</strong>: un script que entra a una página pública y baja los datos solo (por ejemplo, las ventas reportadas trimestre a trimestre). La IA te lo construye; tú lo corres cuando quieras una actualización. La idea, en concepto:</p>
  <div class="copy-block"><div class="copy-block-bar"><span>concepto · scraper</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code"># Idea general (la IA arma el script real por ti):
# 1. Entrar a la página pública de resultados del competidor
# 2. Bajar la tabla de ventas por trimestre
# 3. Guardarla en un archivo para compararla con la tuya</pre></div>
  <p>Con eso entiendes el <strong>mercado</strong>, no solo tu negocio: cómo se mueve el grande, a qué precio, en qué líneas. Aterricémoslo en tu caso local.</p>

  <div class="exercise">
    <div class="exercise-title">✋ Ejercicio: entiende a tu competencia</div>
    <p>Descarga el comparativo por línea contra tus competidores y pídele a la IA un diagnóstico.</p>
    <p><a href="recursos/competencia_por_linea.csv" target="_blank" rel="noopener" style="color:var(--amber);">📈 competencia_por_linea.csv</a></p>
    <div class="copy-block"><div class="copy-block-bar"><span>prompt</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div><pre class="copy-block-code">Te adjunto un comparativo de mis precios y participación de mercado contra mis competidores, por línea de producto. Dime:
1. En qué líneas estoy ganando y en cuáles me están desplazando.
2. Dónde mi precio me hace vulnerable frente al producto chino o la cadena nacional.
3. Tres movimientos concretos para defender o recuperar participación.</pre></div>
    <button class="ex-done-btn" id="ex-btn-ex-case" onclick="markEx('ex-case', this)">Marcar como hecho</button>
  </div>

  <!-- RESULTS -->
  <div id="results" style="margin-top:40px;padding:26px;border:1px solid var(--amber-border);border-radius:14px;background:var(--surface);">
    <h2 style="margin-bottom:6px;">Tu progreso</h2>
    <p class="score-pill" style="font-size:28px;color:var(--amber);"><span id="score-display">0 / 100</span></p>
    <div style="height:10px;background:var(--surface2);border-radius:6px;overflow:hidden;margin:12px 0;">
      <div id="results-bar" style="height:100%;width:0;background:var(--amber);transition:width .4s;"></div>
    </div>
    <div id="results-breakdown" style="color:var(--muted);font-size:14px;"></div>
    <p style="margin-top:16px;">Terminaste el curso <strong>IA Aplicada</strong>. Ahora la IA no es magia: es una herramienta que entiendes, sabes pedirle y revisas con criterio. Eso es exactamente lo que te vuelve indispensable.</p>
  </div>
  <div class="module-nav"><button class="next-btn" onclick="goTo(1)">Volver al inicio ↑</button></div>
</section>
```

- [ ] **Step 2: Finalize `EX_IDS` and add `buildResults`**

Update the final exercise list:

```javascript
  var EX_IDS = ['ex-tools','ex-pdf','ex-kpi','ex-case'];
```

Add `buildResults` (it is referenced by `goTo`):

```javascript
  function buildResults() {
    updateScore();
    var bd = document.getElementById('results-breakdown');
    if (bd) {
      bd.innerHTML =
        'Quizzes correctos: <strong>' + correctAnswers.size + ' / ' + QUIZ_IDS.length + '</strong><br>' +
        'Ejercicios completados: <strong>' + exercisesDone.size + ' / ' + EX_IDS.length + '</strong>';
    }
  }
```

- [ ] **Step 3: Verify Module 7 + results**

Open `docs/curso.html`. Answer some quizzes and mark some exercises across modules, then navigate to Module 7. Expected: results block shows a /100 score consistent with what you completed (e.g., all 5 quizzes + 4 exercises = 9/9 = 100), the bar fills, and the breakdown shows the correct counts. The competencia CSV link works. Exercise ex-case persists.

Run: `ls docs/recursos/competencia_por_linea.csv`
Expected: path exists.

- [ ] **Step 4: Commit**

```bash
git add docs/curso.html
git commit -m "curso: Module 7 — public-company case study + results screen"
```

---

## Task 8: Final pass — full walkthrough, residue check, links from other pages

**Files:**
- Modify: `docs/curso.html` (only if the checks below surface issues)
- Inspect: `docs/index.html`, `docs/admin.html`, `docs/boveda.html`, `docs/preview.html` for links/JS that referenced the old gate or old course structure.

**Interfaces:**
- Consumes: the complete course from Tasks 1–7.
- Produces: a verified, residue-free `curso.html` and a short note of any external references that now point at removed behavior.

- [ ] **Step 1: Residue + integrity grep**

Run:
```bash
grep -nE "reg-gate|reg-form|submitReg|/api/|API_BASE|puzzlesCompleted|classify\(|boveda-section|admin-panel|skill-ej|agente-|lps-progress-v1|lps-session|lps-admin" docs/curso.html
```
Expected: NO output. If anything matches, remove the offending markup/JS (it is leftover from the old course and must not exist in the new one).

- [ ] **Step 2: Confirm all engine ids referenced by markup exist**

Run:
```bash
grep -nE "id=\"(mod-[1-7]|q[1-5]|q[1-5]-feedback|ex-btn-ex-(tools|pdf|kpi|case)|ospanel-(win|mac|linux)|ostab-(win|mac|linux)|nav-items|mobile-tabs|progress-fill|progress-label|score-display|results-bar|results-breakdown)\"" docs/curso.html | wc -l
```
Expected: a count of at least 25 (the core ids). Spot-check there are 7 `mod-N`, 5 `qN`, 4 `ex-btn-*`, 3 `ospanel-*`, 3 `ostab-*`.

- [ ] **Step 3: Full manual walkthrough (light + dark)**

Open `docs/curso.html`. Do a complete pass:
- All 7 modules reachable via sidebar AND mobile tabs (resize narrow to see tabs).
- Theme toggle works and persists across reload.
- Every quiz (q1–q5): correct → green feedback; wrong → red + correct highlighted; locks.
- Module 4: OS autodetect opens the right tab; all 3 tabs switch; all "Copiar" buttons copy.
- Every exercise (4) marks done + persists across reload.
- Module 7 results: score reflects completion; reaching all 9 items shows 100/100.
- Reload mid-course: progress (quizzes, exercises, current module visuals via restoreUI) is restored.
- DevTools: progress saved under `lps-curso-ia-aplicada-v1`, theme under `lps-theme`; NO `lps-progress-v1` writes.
- No console errors at any point.

- [ ] **Step 4: Check cross-page references to the old course**

Run:
```bash
grep -rnE "curso\.html|curso_registros|reg-gate" docs/index.html docs/admin.html docs/boveda.html docs/preview.html docs/privacidad.html
```
For each hit: links to `curso.html` are fine (the page still exists). If any page contains JS that expected the OLD gate (e.g., admin granting access via the old flow), note it in the commit message — do NOT silently change admin behavior; the gate removal is intentional and temporary (see memory `curso-paywall-gate-removed`). Only fix obviously broken links (e.g., anchors to removed sections like `#boveda-section` inside curso.html).

- [ ] **Step 5: Commit**

```bash
git add docs/curso.html
git commit -m "curso: final verification pass — residue check + walkthrough"
```

---

## Self-Review (completed by plan author)

**Spec coverage:**
- Reuse skeleton/engine, remove gate/puzzles/boveda → Tasks 1–3. ✓
- Save paywall to memory → already done before planning (`curso-paywall-gate-removed.md`). ✓
- 7 modules mapping 4 parts → Tasks 4 (M1-3), 5 (M4), 6 (M5-6), 7 (M7). ✓
- M1 LLM simplified, M2 money/disruption/skills (reformulated with tact), M3 prompt/context/tokens → Task 4. ✓
- M4 Claude Code OS-tab install guide (Node.js step-by-step, open terminal, key combos, terminal mocks, CLAUDE.md, agents/skills overview), ChatGPT brief, native apps Gmail/Calendar → Task 5. ✓
- M5 pdfplumber/vision/feed-a-book demo + real contract exercise → Task 6. ✓
- M6 KPIs + Excel with real ventas/egresos datasets, Hermosillo narrative → Task 6. ✓
- M7 public-company financials + scraper mini-model + competencia dataset → Task 7. ✓
- Quizzes + copy-paste exercises + /100 score → Tasks 3,4,6,7. ✓
- New localStorage key, no backend, no anon keys, Spanish copy, amber brand → Global Constraints + enforced in Tasks 1,2,8. ✓
- Mockups in HTML/CSS (no fake screenshots) → Task 5 terminal-mock/key-combo. ✓

**Placeholder scan:** No "TBD/TODO"; every code step shows full code. ✓

**Type/name consistency:** `answer(qid,btn,isCorrect)`, `copyCode(btn)`, `markEx(id,btn)`, `updateScore()`, `buildResults()`, `showOS(os)`, `detectOS()`, `goTo(n)`, `restoreUI()`, `saveProgress()/loadProgress()`, sets `correctAnswers/answeredQuestions/exercisesDone/completedModules`, `QUIZ_IDS/EX_IDS/ANSWERS` — used consistently across tasks. Exercise button ids follow `ex-btn-<id>` everywhere. Quiz feedback ids follow `<qid>-feedback`. ✓
