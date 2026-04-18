# PROBLEMA — Marketplace for Problems

A curated marketplace MVP for seven-, eight-, and nine-figure quandaries that companies can't solve in-house. Solvers — labs, freelancers, syndicates — bid, build, and claim the bounty. Funded via dominant assurance contracts.

> **v0.1 — MVP** · Static frontend only. Pledge flow, intake form, and solver registration are stubbed for v0.2.

---

## Quick start

### Option A — open directly (zero setup)

Just double-click `index.html`. The page will open in your default browser. Everything works.

### Option B — Live Server in VS Code (recommended for development)

1. Open this folder in VS Code: `File → Open Folder…` → select `problema-mvp`
2. Install the recommended extensions when prompted (or manually install **Live Server** by Ritwick Dey)
3. Right-click `index.html` → **"Open with Live Server"**
4. The site will open at `http://127.0.0.1:5500` and auto-reload on save

---

## File structure

```
problema-mvp/
├── index.html          # markup — semantic, no inline styles or scripts
├── styles.css          # all styling — CSS variables, responsive, scroll reveals
├── script.js           # behavior — modal, filters, intersection observers
├── README.md           # this file
└── .vscode/
    └── extensions.json # recommends Live Server when you open the folder
```

---

## What's in the MVP

- **Editorial-style landing page** (cream / ink / signal-red palette, Fraunces + Newsreader + JetBrains Mono)
- **Live "lead case" treatment** with dossier sidebar showing dominant-assurance pool fill
- **Browse docket** of 8 cards across `OPEN` / `FUNDED` / `DISPATCHED` states
- **Filter & sort chips** (visual toggling — wiring to real data is v0.2)
- **Case detail modal** with prereg'd success criteria, what's been ruled out, what sponsors provide
- **Four-step mechanism explainer** with a dedicated dominant-assurance-contract block
- **Ledger / stats section**, pull quote, CTA strip, footer
- **Fully responsive** (1100px and 700px breakpoints)
- **Scroll-triggered reveals** via IntersectionObserver
- **Animated bounty progress bars** that fill on scroll into view

---

## What's stubbed (alert-only) for v0.2

| Action                  | Trigger                                | Status      |
|-------------------------|----------------------------------------|-------------|
| Pledge to a case        | "Pledge" / "Add to pledge pool"        | `alert()`   |
| Submit a new problem    | "Submit a problem" CTA                 | `alert()`   |
| Apply / register solver | "Apply as a solver" / "Register"       | `alert()`   |
| Per-card modal routing  | Clicking any card                      | All open Case 042 |
| Filter / sort wiring    | Chip clicks                            | Visual only |

---

## Editing notes

### Adding a new problem to the docket
Each card is an `<article class="problem-card">` inside `.problem-grid` in `index.html`. Pattern:

```html
<article class="problem-card reveal">
  <div class="card-head">
    <span class="case-no">Nº 046</span>
    <span class="stamp">OPEN</span>          <!-- or .funded / .dispatched -->
  </div>
  <h3>Your problem statement here.</h3>
  <p class="sponsor">Sponsor name · validation context.</p>
  <div class="card-foot">
    <div class="bounty"><span class="c">$</span>X.XM</div>
    <div class="right">N solvers<br/><strong>N days left</strong></div>
  </div>
</article>
```

### Changing the brand color
Edit `--signal` and `--signal-deep` in the `:root` block at the top of `styles.css`. Everything that uses the hot/active color cascades from there.

### Changing the typography
The page loads three Google fonts: **Fraunces** (display), **Newsreader** (body), **JetBrains Mono** (data). Swap the `<link>` in `index.html` and update the `font-family` declarations in `styles.css`.

---

## v0.2 roadmap (suggested)

1. Move the eight problems to a `data/cases.json` file and render the grid dynamically
2. Per-card modal routing (each card opens its own case)
3. Real intake form (`submit-problem`) — minimum: name, company, problem statement, expected bounty range
4. Solver registration form (`register-solver`)
5. Pledge-pool simulator showing the DAC math live (refunds + bonus if threshold fails)
6. Backend: Supabase or similar for case storage, escrow integration via Stripe Connect
7. Editorial admin panel for the curation team

---

## Tech notes

- **No build step.** Pure HTML/CSS/JS. Open in any browser.
- **No dependencies.** Fonts loaded from Google Fonts CDN. No JS frameworks.
- **Browser support:** modern evergreen browsers. Uses CSS variables, IntersectionObserver, modern flex/grid. No IE11.

---

## License

Private prototype. © 2026 Peter — placeholder, swap before any external release.
