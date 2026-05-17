/* ============================================================
   PROBLEMA — Marketplace for Problems
   Behavior · v0.2
   ============================================================ */

(() => {
  'use strict';

  /* ----------------------------------------------------------
     Number counter animation
     ---------------------------------------------------------- */
  function runCounter(el) {
    const target   = parseFloat(el.dataset.countTo);
    const prefix   = el.dataset.prefix  || '';
    const suffix   = el.dataset.suffix  || '';
    const decimals = parseInt(el.dataset.decimals) || 0;
    const useComma = el.dataset.format === 'comma';
    const delay    = parseInt(el.dataset.delay)    || 0;
    const duration = target >= 500 ? 4800 : target >= 50 ? 3200 : 2200;

    function fmt(n) {
      if (useComma) return prefix + Math.round(n).toLocaleString('en-US') + suffix;
      return prefix + (decimals ? n.toFixed(decimals) : Math.round(n)) + suffix;
    }

    setTimeout(() => {
      el.textContent = fmt(0);
      const t0 = performance.now();
      function tick(now) {
        const p = Math.min((now - t0) / duration, 1);
        // Phase 1 (0–18%): linear burst to 60% of value — fast, visible brrrr
        // Phase 2 (18–55%): easeOutQuad crawl to 90%
        // Phase 3 (55–100%): easeOutSeptic — giga slow landing
        const ease = p >= 1 ? 1 : p < 0.18
          ? p * 3.33
          : p < 0.55
            ? 0.60 + 0.30 * (1 - Math.pow(1 - (p - 0.18) / 0.37, 2))
            : 0.90 + 0.10 * (1 - Math.pow(1 - (p - 0.55) / 0.45, 7));
        el.textContent = fmt(target * ease);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = fmt(target);
      }
      requestAnimationFrame(tick);
    }, delay);
  }

  // Hero stats — fire on page load (they're above the fold)
  document.querySelectorAll('.count-num:not(.count-viewport)').forEach(runCounter);

  // Ledger stats — fire when section enters viewport
  const countViewportObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.querySelectorAll('.count-viewport').forEach(runCounter);
      countViewportObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });

  const numbersSection = document.querySelector('.numbers');
  if (numbersSection) countViewportObserver.observe(numbersSection);

  /* ----------------------------------------------------------
     Animate bounty progress bars on scroll
     ---------------------------------------------------------- */
  const fills = document.querySelectorAll('.progress-fill');
  const fillObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const fill = entry.target.dataset.fill;
        entry.target.style.width = fill + '%';
        if (parseInt(fill) >= 75) entry.target.classList.add('hot');
        fillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  fills.forEach((f) => fillObserver.observe(f));

  /* ----------------------------------------------------------
     Generic scroll reveals
     ---------------------------------------------------------- */
  const reveals = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  reveals.forEach((r) => revealObserver.observe(r));

  /* ----------------------------------------------------------
     Filter + sort chips — live card filtering
     ---------------------------------------------------------- */
  const grid = document.querySelector('.problem-grid');
  const allCards = Array.from(grid.querySelectorAll('.problem-card'));

  function applyFilterSort() {
    const filterVal = document.querySelector('.chip[data-group="filter"].active').textContent.trim().toLowerCase();
    const sortVal   = document.querySelector('.chip[data-group="sort"].active').textContent.trim().toLowerCase();

    let visible = allCards.filter(card => filterVal === 'all cases' || card.dataset.status === filterVal);

    visible.sort((a, b) => {
      if (sortVal.includes('bounty'))  return parseFloat(b.dataset.bounty)  - parseFloat(a.dataset.bounty);
      if (sortVal.includes('posted'))  return parseInt(b.dataset.case)      - parseInt(a.dataset.case);
      if (sortVal.includes('solvers')) return parseInt(b.dataset.solvers)   - parseInt(a.dataset.solvers);
      return 0;
    });

    allCards.forEach(c => c.remove());
    visible.forEach(c => grid.appendChild(c));

    let empty = grid.querySelector('.no-results');
    if (visible.length === 0 && !empty) {
      const msg = document.createElement('p');
      msg.className = 'no-results';
      msg.textContent = 'No cases match this filter.';
      grid.appendChild(msg);
    } else if (visible.length > 0 && empty) {
      empty.remove();
    }
  }

  document.querySelectorAll('.filter-bar .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll(`.filter-bar .chip[data-group="${chip.dataset.group}"]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilterSort();
    });
  });

  /* ----------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------- */
  const hamburger  = document.querySelector('.hamburger');
  const mobileNav  = document.getElementById('mobile-nav');

  function openMobileNav() {
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    syncBodyScroll();
  }

  hamburger.addEventListener('click', openMobileNav);
  document.querySelector('.mobile-nav-close').addEventListener('click', closeMobileNav);
  document.querySelectorAll('.mobile-nav-link').forEach(l => l.addEventListener('click', closeMobileNav));

  /* ----------------------------------------------------------
     Body scroll lock helper — unlock only if no overlays open
     ---------------------------------------------------------- */
  function syncBodyScroll() {
    const anyOpen = document.querySelector('.page-modal-bg.open, .modal-bg.open, .waitlist-bg.open');
    document.body.style.overflow = anyOpen ? 'hidden' : '';
  }

  /* ----------------------------------------------------------
     Case detail modal (Case 042)
     ---------------------------------------------------------- */
  const caseModal = document.getElementById('modal');

  function openCaseModal() {
    activeCaseId = '042';
    caseModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCaseModal() {
    caseModal.classList.remove('open');
    syncBodyScroll();
  }

  caseModal.addEventListener('click', (e) => { if (e.target.id === 'modal') closeCaseModal(); });
  document.getElementById('open-case-modal').addEventListener('click', openCaseModal);
  document.getElementById('close-case-modal').addEventListener('click', closeCaseModal);

  /* ----------------------------------------------------------
     Active case tracking (for contextual pledge modal)
     ---------------------------------------------------------- */
  let activeCaseId = '042';

  /* ----------------------------------------------------------
     Docket card dynamic modal
     ---------------------------------------------------------- */
  const cardModal   = document.getElementById('card-modal');
  const cmNo        = document.getElementById('cm-no');
  const cmOpened    = document.getElementById('cm-opened');
  const cmStamp     = document.getElementById('cm-stamp');
  const cmTitle     = document.getElementById('cm-title');
  const cmSponsor   = document.getElementById('cm-sponsor');
  const cmBody      = document.getElementById('cm-body');
  const cmBounty    = document.getElementById('cm-bounty');
  const cmBountyMeta= document.getElementById('cm-bounty-meta');
  const cmStatusV   = document.getElementById('cm-status-v');
  const cmSolvers   = document.getElementById('cm-solvers');
  const cmDeadline  = document.getElementById('cm-deadline');
  const cmCtaWrap   = document.getElementById('cm-cta-wrap');
  const cmFooter    = document.getElementById('cm-footer');
  const cmFooterLabel = document.getElementById('cm-footer-label');

  const cases = {
    '042': {
      no: 'CASE Nº 042', poolCurrent: 8900000, poolTarget: 12000000, poolDeadline: '2027.04.08',
    },
    '037': {
      no: 'CASE Nº 037', opened: 'OPENED 2026.02.14', status: 'OPEN',
      poolCurrent: 3100000, poolTarget: 5000000, poolDeadline: '2026.08.01',
      title: 'Design a single-lane autonomous tunnel system that undercuts metro rail cost by 90%.',
      sponsor: 'Urban Mobility Consortium · 6 city governments · cost benchmark against London Crossrail per km.',
      bounty: '6.2M', bountyMeta: 'published in escrow',
      solvers: '34 active · 2 syndicates', deadline: '2026.09.01',
      problem: 'Urban transit expansion is bottlenecked by cost. Metro rail runs $200M–$1B per km in most cities, which means most cities don\'t build it. Single-lane autonomous tunnels — small diameter, electric, point-to-point — could change the unit economics of underground mobility entirely. The question is whether a complete system design can hit the cost and safety thresholds required for real deployment.',
      won: 'A complete engineering specification for a single-lane autonomous tunnel system: structural design, vehicle spec, ventilation, egress, and control architecture — demonstrating a fully-loaded cost of ≤$20M per km in at least two geological contexts, with independent cost verification by a tier-1 civil engineering firm.',
      criteria: ['≤$20M per km fully-loaded construction cost in ≥2 geological contexts','Autonomous operation at 30-second headways with zero-collision safety case','Emergency egress design meeting or exceeding EN 45545 rail standard','Independent cost verification by a recognised civil engineering consultancy','Permitting pathway identified for at least one pilot jurisdiction'],
      ruledOut: ['Standard TBM boring at conventional metro diameter (cost floor too high)','Shared-lane systems with mixed autonomous/human vehicles','Surface-level or elevated alternatives (out of scope)'],
      provides: ['Traffic flow and demand data from 6 cities','Geological survey access for 3 proposed pilot corridors','Introductions to city planning departments and transport authorities','Funding for independent cost verification process'],
    },
    '038': {
      no: 'CASE Nº 038', opened: 'OPENED 2026.01.20', status: 'OPEN',
      title: 'Produce a reproducible 4-day workweek transition methodology with no output loss.',
      sponsor: 'Future of Work Coalition · 14 participating employers across 6 sectors · validated against pre-agreed output KPIs.',
      bounty: '3.4M', bountyMeta: 'published in escrow',
      solvers: '112 active · 8 syndicates', deadline: '2026.10.15',
      problem: 'The 4-day workweek has been trialled in Iceland, Japan, the UK, and elsewhere. Results are promising but inconsistent — and no reproducible methodology exists that works across organisation types, sizes, and sectors. Every new trial reinvents the wheel. The sponsors want a tested, documented system that any 250+ person organisation can follow without a consultant.',
      won: 'A documented transition methodology validated across ≥5 organisations of 250+ employees each, in ≥3 different sectors, showing output variance of ≤5% against pre-agreed KPIs over a minimum 6-month follow-up period. The methodology must be published openly and replicable without proprietary tools.',
      criteria: ['Tested in ≥5 orgs of 250+ employees across ≥3 sectors','Output variance ≤5% vs baseline on pre-agreed KPIs','Minimum 6-month follow-up period with monthly measurement','Methodology documented to ISO process standard equivalent','Replicable without proprietary software or paid consultancy'],
      ruledOut: ['Single-company case studies without cross-org validation','Remote-only or knowledge-work-only implementations','Methodologies requiring >12 months transition period'],
      provides: ['Access to 14 willing employer organisations across 6 sectors','Pre-agreed baseline KPI measurement frameworks','HR and productivity data for the transition period','Publication and dissemination support'],
      poolCurrent: 1700000, poolTarget: 3000000, poolDeadline: '2026.09.15',
    },
    '039': {
      no: 'CASE Nº 039', opened: '025.11.03', status: 'FUNDED',
      title: 'Design a UBI model that is fiscally self-sustaining in a mid-sized OECD economy.',
      sponsor: 'Economic Policy Research Consortium · modelled against 5 OECD member economies · independent fiscal review required.',
      bounty: '7.1M', bountyMeta: '+ activation pool closed · in escrow',
      solvers: '19 active · 3 syndicates', deadline: '2027.02.28',
      problem: 'Every serious UBI proposal either doesn\'t pay enough to be meaningful or costs more than the economy can absorb. The fiscal gap is the problem no one has closed. The sponsors want a model that is genuinely self-sustaining — not dependent on one-off wealth transfers, not requiring a >15% increase in GDP tax take — and that demonstrably doesn\'t worsen income inequality.',
      won: 'A full fiscal model for a UBI programme in a mid-sized OECD economy (GDP $500B–$2T), peer-reviewed by ≥3 independent economists, showing fiscal sustainability over a 10-year horizon, Gini coefficient neutral or improved, and implementable without constitutional change in the target jurisdiction.',
      criteria: ['Fiscal sustainability demonstrated over 10-year model horizon','Gini coefficient neutral or improved vs baseline','GDP tax increase requirement ≤15%','Peer-reviewed by ≥3 independent economists from different institutions','Implementable without constitutional change · political pathway identified'],
      ruledOut: ['Pilot programmes without full-economy fiscal scaling models','Models dependent on one-off asset transfers or windfalls','Cryptocurrency or non-sovereign currency funding mechanisms','Models that require >15% increase in GDP tax take'],
      provides: ['Economic modelling infrastructure and datasets for 5 OECD economies','Access to senior policy advisors in 3 OECD member governments','Independent fiscal review funding','Publication in a leading economics journal upon completion'],
      poolCurrent: 7100000, poolTarget: 7100000, poolDeadline: '2027.02.28',
    },
    '040': {
      no: 'CASE Nº 040', opened: 'OPENED 2026.03.01', status: 'OPEN',
      title: 'Forecast AI\'s net employment effect across five industries to ≥80% accuracy over 5 years.',
      sponsor: 'Global Labour Economics Institute · industries: legal, logistics, healthcare admin, media, finance.',
      bounty: '4.5M', bountyMeta: 'published in escrow',
      solvers: '67 active · 5 syndicates', deadline: '2027.06.01',
      problem: 'Every forecast of AI\'s employment impact is either catastrophist or dismissive, and none has been validated against observed reality. The error bars are so wide as to be useless for policy. Governments, unions, and companies are making trillion-dollar decisions based on speculation. A rigorous, falsifiable forecasting methodology — validated retrospectively against 2020–2025 data and applied prospectively — is the missing input.',
      won: 'A validated forecasting methodology for net employment effects of AI deployment, tested retrospectively against 2020–2025 employment data across the five target industries, achieving ≥80% directional accuracy at 24-month intervals, and producing a prospective forecast for 2025–2030 with explicit confidence intervals and falsifiable claims.',
      criteria: ['≥80% directional accuracy on retrospective 2020–2025 validation set','Prospective forecast for 2025–2030 with explicit confidence intervals','Falsifiable claims with pre-registered measurement methodology','Covers all 5 target industries at sub-sector granularity','Peer-reviewed and published in a labour economics or AI policy journal'],
      ruledOut: ['Survey-based methodology without observed employment data','Single-country models without cross-national validation','Forecasts without falsifiable, pre-registered claims','Models that treat "AI" as a monolithic variable without deployment disaggregation'],
      provides: ['Historical employment datasets across 5 industries from 12 countries','Access to AI model deployment records from 3 major technology companies','Economic modelling infrastructure','Policy dissemination support across G20 labour ministries'],
      poolCurrent: 2000000, poolTarget: 4000000, poolDeadline: '2027.05.01',
    },
    '041': {
      no: 'CASE Nº 041', opened: 'OPENED 2025.12.01', status: 'FUNDED',
      title: 'Explain Norway\'s 20% prison recidivism rate and produce a transplant model for anglophone jurisdictions.',
      sponsor: 'Criminal Justice Reform Fund · benchmarked against UK, US, and Australia · one willing anglophone pilot jurisdiction confirmed.',
      bounty: '3.3M', bountyMeta: '+ activation pool closed · in escrow',
      solvers: '88 active · 6 syndicates', deadline: '2026.12.15',
      problem: 'Norway\'s two-year reoffending rate sits at 20%. The US rate is 68%, the UK 62%, Australia 55%. The surface-level explanation — humane prisons, rehabilitation focus, social support — is well known. The causal structure underneath it is not. Without identifying which variables are causally primary versus incidental, no anglophone jurisdiction can meaningfully replicate the outcome.',
      won: 'A causal analysis identifying ≥3 primary drivers of Norway\'s recidivism rate differential, a policy transplant package adapted for one confirmed anglophone jurisdiction, a 5-year cost model, and a pilot implementation plan ready for government approval.',
      criteria: ['Causal identification of ≥3 primary drivers (not just correlation)','Policy transplant package adapted for at least one anglophone jurisdiction','5-year cost model with sensitivity analysis','Pilot implementation plan endorsed by a government official in the target jurisdiction','Peer-reviewed causal analysis published in criminology or public policy journal'],
      ruledOut: ['Pure descriptive comparisons without causal identification','Proposals requiring constitutional change in anglophone target jurisdictions','Models that require full prison system rebuilds within 5-year horizon'],
      provides: ['Access to Norwegian Correctional Service (Kriminalomsorgen) data','Introductions to senior officials in Norwegian Ministry of Justice','Partnership with one confirmed willing anglophone jurisdiction','Translation and legal review support'],
      poolCurrent: 3300000, poolTarget: 3300000, poolDeadline: '2026.12.15',
    },
    '043': {
      no: 'CASE Nº 043', opened: 'OPENED 2026.04.01', status: 'OPEN',
      title: 'Build an interpretability framework that predicts frontier AI model outputs in novel domains before deployment.',
      sponsor: 'AI Safety Research Consortium · ≥85% accuracy threshold · independent red-team validation required.',
      bounty: '8.4M', bountyMeta: 'published in escrow',
      solvers: '31 active · 4 syndicates', deadline: '2027.10.01',
      problem: 'Frontier AI models are deployed into critical applications — medicine, law, infrastructure — without reliable prediction of how they behave in domains outside their training distribution. Post-hoc explanation methods (LIME, SHAP) describe what happened; they don\'t predict what will happen. A pre-deployment framework that can predict novel-domain behaviour with meaningful accuracy would change the risk calculus for every serious AI deployment.',
      won: 'A pre-deployment interpretability framework validated against ≥3 frontier models, achieving ≥85% accuracy on held-out novel-domain task sets, open-sourced under a permissive licence, surviving adversarial red-team evaluation by an independent security research group.',
      criteria: ['≥85% accuracy on held-out novel-domain tasks across ≥3 frontier models','Works as pre-deployment analysis (not post-hoc explanation)','Open-sourced under MIT or Apache 2.0 licence','Survives adversarial red-team evaluation by independent security group','Does not require access to model weights — API-level access only'],
      ruledOut: ['Post-hoc explanation methods (LIME, SHAP, and derivatives)','Single-modality frameworks (text-only or image-only)','Approaches requiring proprietary model weight access','Frameworks validated only on in-distribution tasks'],
      provides: ['API access to frontier models from 3 consortium members','Curated novel-domain test sets across 12 application areas','Red-team infrastructure and independent evaluation budget','Fast-track publication support in a top ML venue'],
      poolCurrent: 4200000, poolTarget: 7500000, poolDeadline: '2027.09.01',
    },
    '044': {
      no: 'CASE Nº 044', opened: 'OPENED 2026.02.28', status: 'OPEN',
      title: 'Reduce pedestrian fatalities in mixed-traffic urban environments by 70% without restricting vehicle access.',
      sponsor: 'Global Road Safety Foundation · 8 pilot cities across 4 continents · infrastructure cost cap $2M per km.',
      bounty: '5.1M', bountyMeta: 'published in escrow',
      solvers: '23 active · 1 syndicate', deadline: '2027.03.01',
      problem: '1.35 million people die on roads annually. Pedestrians account for 23% of those deaths. Existing interventions — speed cameras, raised crossings, signage — produce marginal, localised gains. A step-change solution that achieves a 70% fatality reduction without restricting vehicle flow or requiring prohibitive infrastructure spend hasn\'t been demonstrated at scale across diverse urban contexts.',
      won: 'A deployable intervention system achieving ≥70% pedestrian fatality reduction in ≥3 pilot cities over a 24-month measurement period, with vehicle throughput maintained within 10% of baseline, infrastructure cost ≤$2M per km, and a replication guide that city engineers can implement without proprietary systems.',
      criteria: ['≥70% pedestrian fatality reduction in ≥3 cities over 24 months','Vehicle throughput maintained within 10% of pre-intervention baseline','Infrastructure cost ≤$2M per km of treated corridor','Replication guide operable by city engineers without proprietary systems','Independent verification by road safety research institution'],
      ruledOut: ['Full vehicle exclusion zones (out of scope by design)','Autonomous vehicle mandates (too slow for the deployment timeline)','Solutions requiring >5 years to implement at city scale','Technology requiring per-vehicle hardware installation'],
      provides: ['Traffic and fatality datasets from 8 pilot cities','City engineering liaison in each pilot city','Regulatory fast-track access in 3 jurisdictions','Pilot deployment sites confirmed and available'],
      poolCurrent: 2500000, poolTarget: 5000000, poolDeadline: '2027.02.01',
    },
    '045': {
      no: 'CASE Nº 045', opened: 'OPENED 2025.09.01', status: 'DISPATCHED',
      title: 'Real-time AI-generated content detection across text, image, and audio with ≤1% false positive rate.',
      sponsor: 'Media Integrity Coalition · 14 news organisations, 3 platform companies · awarded February 2026.',
      bounty: '6.7M', bountyMeta: 'dispatched · February 2026',
      solvers: 'Awarded · 7-person syndicate', deadline: 'Closed 2026.02.11',
      problem: 'As AI-generated content became indistinguishable from human-produced content across modalities, the coalition needed a detection system that could operate at publication speed with a false positive rate low enough to be used in editorial workflows — without flagging real human work as synthetic.',
      won: 'The winning syndicate delivered a multi-modal detection system operating at ≤0.8% false positive rate across text, image, and audio, with sub-200ms latency per asset, integrated via API into 11 of the 14 coalition newsrooms within 60 days of award. The system is now in production.',
      criteria: ['≤1% false positive rate across all three modalities','Sub-500ms latency per asset at publication scale','API integration requiring <40 hours of engineering per newsroom','Performance maintained on content generated by models not in training set','Independently validated by digital forensics research group'],
      ruledOut: [],
      provides: [],
      dispatched: true,
    },
  };

  function openCardModal(caseId) {
    const c = cases[caseId];
    if (!c) return;
    activeCaseId = caseId;

    cmNo.textContent     = c.no;
    cmOpened.textContent = c.opened;
    cmStamp.textContent  = c.status;
    cmStamp.className    = 'stamp' + (c.status === 'FUNDED' ? ' funded' : c.status === 'DISPATCHED' ? ' dispatched' : '');
    cmTitle.innerHTML    = c.title;
    cmSponsor.textContent = c.sponsor;
    cmBounty.textContent  = c.bounty;
    cmBountyMeta.textContent = c.bountyMeta;
    cmStatusV.textContent = c.status;
    cmSolvers.textContent = c.solvers;
    cmDeadline.textContent = c.deadline;

    const ruledOutHTML = c.ruledOut.length ? `
      <h4>What's already been ruled out</h4>
      <ul>${c.ruledOut.map(x => `<li>${x}</li>`).join('')}</ul>` : '';

    const providesHTML = c.provides.length ? `
      <h4>What sponsors will provide</h4>
      <ul>${c.provides.map(x => `<li>${x}</li>`).join('')}</ul>` : '';

    const wonLabel = c.dispatched ? 'What the winning solution delivered' : 'What "won" looks like';

    cmBody.innerHTML = `
      <p><strong>The problem.</strong> ${c.problem}</p>
      <p><strong>${wonLabel}.</strong> ${c.won}</p>
      <h4>Success criteria, prereg'd</h4>
      <ul>${c.criteria.map(x => `<li>${x}</li>`).join('')}</ul>
      ${ruledOutHTML}
      ${providesHTML}
    `;

    if (c.dispatched) {
      cmCtaWrap.style.display = 'none';
      cmFooter.style.display  = 'none';
    } else {
      cmCtaWrap.style.display = '';
      cmFooter.style.display  = '';
      cmFooterLabel.textContent = `Ready to work on ${c.no}?`;
    }

    cardModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCardModal() {
    cardModal.classList.remove('open');
    syncBodyScroll();
    setTimeout(resetFollowForm, 300);
  }

  document.getElementById('close-card-modal').addEventListener('click', closeCardModal);
  cardModal.addEventListener('click', (e) => { if (e.target === cardModal) closeCardModal(); });

  // Cmd/Ctrl+click on a card opens its dedicated shareable page in a new tab.
  // Plain click still opens the in-page modal so nothing about the current UX changes.
  document.querySelectorAll('.problem-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.button === 1) {
        const caseNo = card.dataset.caseId || (card.dataset.case || '').padStart(3, '0');
        if (caseNo) { window.open('/cases/' + caseNo, '_blank'); return; }
      }
    });
    // Add a small "open in own page →" link below each card for the non-power-user path.
    if (!card.querySelector('.card-permalink')) {
      const caseNo = card.dataset.caseId || (card.dataset.case || '').padStart(3, '0');
      if (caseNo) {
        const link = document.createElement('a');
        link.className = 'card-permalink';
        link.href = '/cases/' + caseNo;
        link.textContent = 'Open Case ' + caseNo + ' →';
        link.style.cssText = 'display:block;margin-top:10px;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--signal);text-decoration:none;';
        link.addEventListener('click', (ev) => ev.stopPropagation()); // don't open the modal too
        card.appendChild(link);
      }
    }
  });
  // Legacy modal binding retained below for backwards compat with existing card-modal behavior.
  document.querySelectorAll('.problem-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.caseId;
      if (id) openCardModal(id);
    });
  });

  /* ----------------------------------------------------------
     Page modals (submit problem, apply solver, handbook, about, pledge)
     ---------------------------------------------------------- */
  function populatePledgeModal(caseId) {
    const c = cases[caseId];
    if (!c || !c.poolCurrent) return;
    POOL_CURRENT = c.poolCurrent;
    POOL_TARGET  = c.poolTarget;
    const pct = Math.round((POOL_CURRENT / POOL_TARGET) * 100);
    const targetLabel = formatMoney(POOL_TARGET);

    const caseLabelEl  = document.getElementById('pledge-case-label');
    const targetLabelEl= document.getElementById('pledge-target-label');
    const deadlineEl   = document.getElementById('pledge-deadline-label');
    const currentBar   = document.getElementById('pledge-impact-current');
    const termDrawn    = document.getElementById('pledge-term-drawn');

    if (caseLabelEl)   caseLabelEl.textContent  = c.no || ('CASE Nº ' + caseId);
    if (targetLabelEl) targetLabelEl.textContent = targetLabel;
    if (deadlineEl)    deadlineEl.textContent    = c.poolDeadline;
    if (currentBar)    currentBar.style.width    = pct + '%';
    if (termDrawn)     termDrawn.textContent     = 'Pool reaches ' + targetLabel + ' by ' + c.poolDeadline;

    const afterEl = document.getElementById('pledge-pool-after');
    const pctEl   = document.getElementById('pledge-pct-after');
    const defaultAmt = parseInt(document.getElementById('pledge-amount-input')?.value) || 100000;
    if (afterEl) afterEl.textContent = formatMoney(POOL_CURRENT + defaultAmt) + ' / ' + targetLabel;
    if (pctEl)   pctEl.textContent   = Math.min(((POOL_CURRENT + defaultAmt) / POOL_TARGET) * 100, 100).toFixed(1) + '%';
    updatePledgeImpact(defaultAmt);
  }

  function openPageModal(id) {
    document.querySelectorAll('.page-modal-bg.open').forEach(bg => {
      if (bg.id !== id) bg.classList.remove('open');
    });
    const bg = document.getElementById(id);
    if (!bg) return;
    if (id === 'page-modal-pledge') populatePledgeModal(activeCaseId);
    bg.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePageModal(id) {
    const bg = document.getElementById(id);
    if (!bg) return;
    bg.classList.remove('open');
    syncBodyScroll();
  }

  document.querySelectorAll('[data-open]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openPageModal(el.dataset.open);
    });
  });

  document.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', () => closePageModal(el.dataset.close));
  });

  document.querySelectorAll('.page-modal-bg').forEach(bg => {
    bg.addEventListener('click', (e) => { if (e.target === bg) closePageModal(bg.id); });
  });

  /* ----------------------------------------------------------
     Waitlist modal (fallback for generic actions)
     ---------------------------------------------------------- */
  const waitlistBg     = document.getElementById('waitlist-modal');
  const waitlistTitle  = document.getElementById('waitlist-title');
  const waitlistDesc   = document.getElementById('waitlist-desc');
  const waitlistType   = document.getElementById('waitlist-type');
  const waitlistForm   = document.getElementById('waitlist-form');
  const waitlistEmail  = document.getElementById('waitlist-email');
  const waitlistSuccess = document.getElementById('waitlist-success');

  const waitlistContent = {
    'apply-solver':    { type: 'SOLVER',  title: 'Apply as a solver',       desc: 'Enter your email and we\'ll send registration details when the flow launches.' },
    'register-solver': { type: 'SOLVER',  title: 'Register as a solver',    desc: 'Enter your email and we\'ll send registration details when the flow launches.' },
  };

  function openWaitlist(action) {
    const c = waitlistContent[action] || { type: 'NOTIFY', title: 'Get notified', desc: 'Enter your email to stay updated.' };
    waitlistType.textContent  = c.type;
    waitlistTitle.textContent = c.title;
    waitlistDesc.textContent  = c.desc;
    waitlistEmail.value = '';
    waitlistForm.style.display    = '';
    waitlistSuccess.style.display = 'none';
    waitlistBg.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => waitlistEmail.focus(), 80);
  }

  function closeWaitlist() {
    waitlistBg.classList.remove('open');
    syncBodyScroll();
  }

  document.getElementById('waitlist-close').addEventListener('click', closeWaitlist);
  waitlistBg.addEventListener('click', (e) => { if (e.target === waitlistBg) closeWaitlist(); });

  waitlistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!waitlistEmail.validity.valid) return;
    // Read current modal type (set by the openers above): "WAITLIST", "CAREERS", etc.
    const kindRaw = (waitlistType && waitlistType.textContent || 'WAITLIST').trim().toLowerCase();
    const kind = kindRaw === 'careers' ? 'careers' : 'launch';
    const role = kind === 'careers' ? (waitlistTitle && waitlistTitle.textContent || '').replace(/^Apply\s*—\s*/, '').trim() || null : null;
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.value.trim(), kind, role }),
      });
    } catch (_) { /* surface success regardless — the email is logged in db / function logs */ }
    waitlistForm.style.display    = 'none';
    waitlistSuccess.style.display = '';
  });

  /* ----------------------------------------------------------
     Careers apply buttons
     ---------------------------------------------------------- */
  document.querySelectorAll('.careers-apply').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role || 'this role';
      waitlistType.textContent  = 'CAREERS';
      waitlistTitle.textContent = role === 'General' ? 'Write to us.' : `Apply — ${role}`;
      waitlistDesc.textContent  = role === 'General'
        ? 'Send a short letter and relevant evidence to work@problema.com. No recruiters.'
        : `Enter your email and we'll send you the full application brief for the ${role} role.`;
      waitlistEmail.value = '';
      waitlistForm.style.display    = '';
      waitlistSuccess.style.display = 'none';
      waitlistBg.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => waitlistEmail.focus(), 80);
    });
  });

  /* ----------------------------------------------------------
     Shared: capture UTM params once so all submissions tag their source.
     ---------------------------------------------------------- */
  const __utm = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const out = {};
      ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref'].forEach(k => {
        const v = p.get(k); if (v) out[k] = v;
      });
      return out;
    } catch (_) { return {}; }
  })();

  function __setSubmitting(form, btnLabel) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return () => {};
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = btnLabel;
    return () => { btn.disabled = false; btn.innerHTML = orig; };
  }

  function __showInlineError(form, msg) {
    let n = form.querySelector('.api-error');
    if (!n) {
      n = document.createElement('p');
      n.className = 'api-error';
      n.style.color = 'var(--signal)';
      n.style.marginTop = '12px';
      n.style.fontSize  = '13px';
      form.appendChild(n);
    }
    n.textContent = msg;
  }

  /* ----------------------------------------------------------
     Intake form (submit a problem)  →  POST /api/intake
     Field order in HTML: name, organisation, email, problem statement, estimated value
     ---------------------------------------------------------- */
  const intakeForm = document.getElementById('intake-form');
  if (intakeForm) {
    intakeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = intakeForm.querySelectorAll('.intake-input');
      const payload = {
        full_name:         (inputs[0] && inputs[0].value || '').trim(),
        organisation:      (inputs[1] && inputs[1].value || '').trim(),
        email:             (inputs[2] && inputs[2].value || '').trim(),
        problem_statement: (inputs[3] && inputs[3].value || '').trim(),
        estimated_value:   (inputs[4] && inputs[4].value || '').trim() || null,
        utm: __utm,
      };
      if (!payload.full_name || !payload.organisation || !payload.email || payload.problem_statement.length < 10) {
        __showInlineError(intakeForm, 'Please complete every field. Problem statement must be at least 10 characters.');
        return;
      }
      const restore = __setSubmitting(intakeForm, 'Submitting…');
      try {
        const res = await fetch('/api/intake', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'submission_failed');
        }
        intakeForm.style.display = 'none';
        document.getElementById('intake-success').style.display = '';
      } catch (err) {
        restore();
        __showInlineError(intakeForm, 'Something broke on our end. Email hello@problema.com and we will pick it up directly.');
      }
    });
  }

  /* ----------------------------------------------------------
     Solver form  →  POST /api/solver
     Field order: name, email, primary_domain, entity_type (select), credentials
     ---------------------------------------------------------- */
  const solverForm = document.getElementById('solver-form');
  if (solverForm) {
    solverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = solverForm.querySelectorAll('.intake-input');
      const entityRaw = (inputs[3] && inputs[3].value || '').toLowerCase();
      const entity_type = entityRaw.startsWith('syndicate') ? 'syndicate'
                        : entityRaw.startsWith('lab')       ? 'lab'
                        : 'individual';
      const payload = {
        full_name:      (inputs[0] && inputs[0].value || '').trim(),
        email:          (inputs[1] && inputs[1].value || '').trim(),
        primary_domain: (inputs[2] && inputs[2].value || '').trim(),
        entity_type,
        credentials_md: (inputs[4] && inputs[4].value || '').trim(),
        utm: __utm,
      };
      if (!payload.full_name || !payload.email || !payload.primary_domain || payload.credentials_md.length < 10) {
        __showInlineError(solverForm, 'Please complete every field. Credentials note must be at least 10 characters.');
        return;
      }
      const restore = __setSubmitting(solverForm, 'Submitting…');
      try {
        const res = await fetch('/api/solver', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'submission_failed');
        }
        solverForm.style.display = 'none';
        document.getElementById('solver-success').style.display = '';
      } catch (err) {
        restore();
        __showInlineError(solverForm, 'Submission failed. Try again, or write to solvers@problema.com.');
      }
    });
  }

  /* ----------------------------------------------------------
     Follow case capture
     ---------------------------------------------------------- */
  function wireFollowForm(submitId, emailId, formId, successId, source, caseNo) {
    const btn = document.getElementById(submitId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const email = document.getElementById(emailId);
      if (!email || !email.value || !email.validity.valid) {
        if (email) { email.focus(); email.style.borderColor = 'var(--signal)'; setTimeout(() => (email.style.borderColor = ''), 1200); }
        return;
      }
      btn.disabled = true;
      try {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: email.value.trim(), source, case_no: caseNo }),
        });
      } catch (_) { /* show success even on network failure — email is logged */ }
      document.getElementById(formId).style.display    = 'none';
      document.getElementById(successId).style.display = '';
    });
  }

  // case_no is hardcoded "042" for the featured case the static HTML ships with.
  wireFollowForm('cm-follow-submit', 'cm-follow-email', 'cm-follow-form', 'cm-follow-success', 'card-modal', '042');
  wireFollowForm('modal-042-follow-submit', 'modal-042-follow-email', 'modal-042-follow-form', 'modal-042-follow-success', 'case-modal-042', '042');

  // Reset follow form when card modal closes
  function resetFollowForm() {
    const form = document.getElementById('cm-follow-form');
    const success = document.getElementById('cm-follow-success');
    const email = document.getElementById('cm-follow-email');
    if (form) form.style.display = '';
    if (success) success.style.display = 'none';
    if (email) email.value = '';
  }

  /* ----------------------------------------------------------
     Pledge flow
     ---------------------------------------------------------- */
  let POOL_CURRENT = 8900000;
  let POOL_TARGET  = 12000000;

  const pledgeInput       = document.getElementById('pledge-amount-input');
  const pledgeImpactNew   = document.getElementById('pledge-impact-new');
  const pledgePoolAfter   = document.getElementById('pledge-pool-after');
  const pledgePctAfter    = document.getElementById('pledge-pct-after');
  const pledgeConfirmedAmount = document.getElementById('pledge-confirmed-amount');
  const pledgeConfirmedPool   = document.getElementById('pledge-confirmed-pool');
  const pledgeConfirmedPct    = document.getElementById('pledge-confirmed-pct');

  function formatMoney(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
    return '$' + n.toLocaleString();
  }

  function updatePledgeImpact(amount) {
    const after = Math.min(POOL_CURRENT + amount, POOL_TARGET);
    const addedPct = Math.min((amount / POOL_TARGET) * 100, 26); // cap visual at 26% new
    const afterPct = Math.min(((POOL_CURRENT + amount) / POOL_TARGET) * 100, 100);

    if (pledgeImpactNew)  pledgeImpactNew.style.width = addedPct.toFixed(2) + '%';
    if (pledgePoolAfter)  pledgePoolAfter.textContent = formatMoney(POOL_CURRENT + amount) + ' / ' + formatMoney(POOL_TARGET);
    if (pledgePctAfter)   pledgePctAfter.textContent  = afterPct.toFixed(1) + '%';
  }

  if (pledgeInput) {
    pledgeInput.addEventListener('input', () => {
      const amt = Math.max(0, parseInt(pledgeInput.value) || 0);
      updatePledgeImpact(amt);
      document.querySelectorAll('.pledge-tier').forEach(t => t.classList.remove('active'));
      const match = Array.from(document.querySelectorAll('.pledge-tier')).find(t => parseInt(t.dataset.amount) === amt);
      if (match) match.classList.add('active');
    });

    document.querySelectorAll('.pledge-tier').forEach(tier => {
      tier.addEventListener('click', () => {
        document.querySelectorAll('.pledge-tier').forEach(t => t.classList.remove('active'));
        tier.classList.add('active');
        const amt = parseInt(tier.dataset.amount);
        pledgeInput.value = amt;
        updatePledgeImpact(amt);
      });
    });

    updatePledgeImpact(parseInt(pledgeInput.value) || 100000);
  }

  const pledgeStep1Next = document.getElementById('pledge-step1-next');
  const pledgeBack      = document.getElementById('pledge-back');
  const pledgeForm      = document.getElementById('pledge-form');

  function showPledgeStep(n) {
    [1, 2, 3].forEach(i => {
      const el = document.getElementById('pledge-step-' + i);
      if (el) el.style.display = (i === n) ? '' : 'none';
    });
  }

  if (pledgeStep1Next) {
    pledgeStep1Next.addEventListener('click', () => {
      const amt = parseInt(pledgeInput.value) || 0;
      if (amt < 5000) {
        pledgeInput.focus();
        pledgeInput.style.borderColor = 'var(--signal)';
        setTimeout(() => (pledgeInput.style.borderColor = ''), 1200);
        return;
      }
      showPledgeStep(2);
    });
  }

  if (pledgeBack) pledgeBack.addEventListener('click', () => showPledgeStep(1));

  if (pledgeForm) {
    pledgeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const amt   = parseInt(pledgeInput.value) || 100000;
      const name  = (document.getElementById('pledge-name')  || {}).value || '';
      const org   = (document.getElementById('pledge-org')   || {}).value || '';
      const email = (document.getElementById('pledge-email') || {}).value || '';
      const agree = !!(document.getElementById('pledge-agree') || {}).checked;
      if (!name.trim() || !email.trim() || !agree) {
        __showInlineError(pledgeForm, 'Name, email, and consent are required.');
        return;
      }
      const restore = __setSubmitting(pledgeForm, 'Submitting…');
      let serverConfirmUrl = null;
      try {
        const res = await fetch('/api/pledge', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            case_no: '042',
            pledger_name: name.trim(),
            pledger_email: email.trim(),
            pledger_org: org.trim() || null,
            amount_usd: amt,
            agree: true,
            utm: __utm,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'pledge_failed');
        }
        const json = await res.json();
        serverConfirmUrl = json.confirm_url || null;
      } catch (err) {
        restore();
        __showInlineError(pledgeForm, 'Pledge could not be saved. Try again in a moment, or write to pledges@problema.com.');
        return;
      }

      // Confirmation step (same visual as before; adds a "secure card" CTA).
      const afterTotal = POOL_CURRENT + amt;
      const afterPct   = Math.min((afterTotal / POOL_TARGET) * 100, 100);
      if (pledgeConfirmedAmount) pledgeConfirmedAmount.textContent = formatMoney(amt);
      if (pledgeConfirmedPool)   pledgeConfirmedPool.textContent   = formatMoney(afterTotal);
      if (pledgeConfirmedPct)    pledgeConfirmedPct.textContent    = afterPct.toFixed(1) + '%';
      const confirmedTarget = document.getElementById('pledge-confirmed-target');
      if (confirmedTarget) confirmedTarget.textContent = formatMoney(POOL_TARGET);

      // Inject (or update) the "secure your card on file" link into step 3 without
      // touching the markup. The link goes to /pledge/confirm/[uuid] (Stripe Elements).
      const step3 = document.getElementById('pledge-step-3');
      if (step3 && serverConfirmUrl) {
        let cardCta = step3.querySelector('.pledge-secure-cta');
        if (!cardCta) {
          cardCta = document.createElement('a');
          cardCta.className = 'btn pledge-secure-cta';
          cardCta.style.marginTop = '18px';
          cardCta.target = '_blank';
          cardCta.rel    = 'noopener';
          cardCta.textContent = 'Secure with card on file →';
          const closeBtn = step3.querySelector('[data-close="page-modal-pledge"]');
          if (closeBtn) step3.insertBefore(cardCta, closeBtn);
          else step3.appendChild(cardCta);
        }
        cardCta.href = serverConfirmUrl;
      }

      showPledgeStep(3);
    });
  }

  // Reset pledge flow on modal close
  document.getElementById('page-modal-pledge').addEventListener('click', (e) => {
    if (e.target.id === 'page-modal-pledge') {
      closePageModal('page-modal-pledge');
      setTimeout(() => showPledgeStep(1), 300);
    }
  });

  document.querySelectorAll('[data-close="page-modal-pledge"]').forEach(el => {
    el.addEventListener('click', () => setTimeout(() => showPledgeStep(1), 300));
  });

  /* ----------------------------------------------------------
     Live bounty ticker — $200K per 30 days = ~$0.077/sec
     ---------------------------------------------------------- */
  const bountyEl = document.getElementById('featured-bounty');
  if (bountyEl) {
    const BASE = 14000000;
    const RATE = 200000 / (30 * 24 * 3600);
    const pageStart = Date.now();

    function spinDigits(el, finalText, duration) {
      const chars = finalText.split('');
      const totalDigits = chars.filter(c => /\d/.test(c)).length;
      const t0 = performance.now();
      function frame(now) {
        const t = Math.min((now - t0) / duration, 1);
        const spinning = Math.ceil((1 - t) * 3); // 3 rightmost digits spin, then 2, then 1
        let seen = 0;
        const result = chars.map(ch => {
          if (!/\d/.test(ch)) return ch;
          seen++;
          return (totalDigits - seen) < spinning
            ? String(Math.floor(Math.random() * 10))
            : ch;
        }).join('');
        el.textContent = result;
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = finalText;
      }
      requestAnimationFrame(frame);
    }

    setInterval(() => {
      const elapsed = (Date.now() - pageStart) / 1000;
      const current = Math.round(BASE + RATE * elapsed);
      const formatted = current.toLocaleString('en-US');
      if (bountyEl.textContent !== formatted) {
        spinDigits(bountyEl, formatted, 360);
        bountyEl.classList.remove('ticked');
        void bountyEl.offsetWidth;
        bountyEl.classList.add('ticked');
      }
    }, 1000);
  }

  /* ----------------------------------------------------------
     Dossier 3D tilt on mouse move
     ---------------------------------------------------------- */
  const dossier     = document.querySelector('.dossier');
  const featuredWrap = document.querySelector('.featured-wrap');

  if (dossier && featuredWrap) {
    let ticking = false;
    let lastX = 0, lastY = 0;

    featuredWrap.addEventListener('mousemove', (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r    = dossier.getBoundingClientRect();
        const dx   = (lastX - (r.left + r.width  / 2)) / (r.width  / 2);
        const dy   = (lastY - (r.top  + r.height / 2)) / (r.height / 2);
        const rotY =  dx * 6;
        const rotX = -dy * 5;
        const sX   = -dx * 10;
        const sY   = -dy * 10;
        dossier.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
        dossier.style.transform  = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        dossier.style.boxShadow  = `${sX}px ${sY}px 32px -8px rgba(20,17,15,0.28), 0 1px 0 rgba(20,17,15,.08)`;
        ticking = false;
      });
    });

    featuredWrap.addEventListener('mouseleave', () => {
      dossier.style.transition = 'transform 0.6s ease, box-shadow 0.6s ease';
      dossier.style.transform  = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
      dossier.style.boxShadow  = '';
    });
  }

  /* ----------------------------------------------------------
     Global Escape key handler
     ---------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.page-modal-bg.open').forEach(bg => bg.classList.remove('open'));
    closeCaseModal();
    closeWaitlist();
    closeMobileNav();
    syncBodyScroll();
  });

  /* ----------------------------------------------------------
     Magnetic cursor — buttons drift toward nearby cursor
     ---------------------------------------------------------- */
  const magnetBtns = Array.from(document.querySelectorAll('.btn'));
  let magnetTicking = false;
  let mx = 0, my = 0;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (magnetTicking) return;
    magnetTicking = true;
    requestAnimationFrame(() => {
      magnetBtns.forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width === 0) return; // skip hidden buttons in closed modals
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          const pull = (1 - dist / 80) * 0.4;
          btn.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
        } else if (btn.style.transform) {
          btn.style.transition = 'background .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease, transform 0.55s cubic-bezier(0.2,0,0.1,1)';
          btn.style.transform = '';
          setTimeout(() => { btn.style.transition = ''; }, 560);
        }
      });
      magnetTicking = false;
    });
  });

})();
