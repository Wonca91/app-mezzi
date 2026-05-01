/* ──────────────────────────────────────────────────────────────────────
   App Mezzi — Frontend logic v2 (refinement)
   ────────────────────────────────────────────────────────────────────── */

const STATE = {
  mezzi: [],
  scadenze: [],
  spese: [],
  km: [],
  meta: { tipi_scadenza: [], categorie_spesa: [], durata_default_mesi: {} },
  filterScadenze: "*",
  filterSpese: "*",
  filterKm: "*",
  scadenzeView: "list",
  drillMezzo: null,
  drillStats: null,
  currentTab: "garage",
};

// ── SVG icons per tipo mezzo ──────────────────────────────────────────
const ICONS_MEZZO = {
  auto: `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 28h52v-6l-4-2-4-10c-1-2-3-3-5-3H19c-2 0-4 1-5 3l-4 10-4 2v6z"/><circle cx="16" cy="30" r="4"/><circle cx="48" cy="30" r="4"/><line x1="14" y1="18" x2="50" y2="18"/></svg>`,
  scooter: `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="30" r="6"/><circle cx="50" cy="30" r="6"/><path d="M14 30L26 14h10l4 8M40 22h8l4 8M26 14h-8"/><path d="M40 14v4"/></svg>`,
  scooter_sport: `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="30" r="6"/><circle cx="50" cy="30" r="6"/><path d="M14 30l8-12 8 4 6-8 8 2 6 14"/><path d="M30 22h12"/><path d="M44 14l4-2"/></svg>`,
};

const ICONS_CAT = {
  carburante: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M18 22V6l-3-3"/><path d="M14 13h4a2 2 0 0 1 2 2v3a1 1 0 0 0 1 1 1 1 0 0 0 1-1V11l-3-3"/></svg>`,
  manutenzione: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  parcheggio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,
  pedaggio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>`,
  multa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 22 2 22 12 2"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  accessori: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 7.27 12 12 3.5 7.27"/><path d="M12 22V12"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  altro: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

// ── Helpers ──────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const fmtEur = (n) => "€ " + Number(n || 0).toLocaleString("it-IT", {
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const fmtEur2 = (n) => "€ " + Number(n || 0).toLocaleString("it-IT", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const fmtKm = (n) => Number(n || 0).toLocaleString("it-IT") + " km";
const fmtNum = (n) => Number(n || 0).toLocaleString("it-IT");
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
};
const todayISO = () => new Date().toISOString().slice(0, 10);

const MESI = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];
const MESI_FULL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function fmtScadShort(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()} ${MESI[d.getMonth()].slice(0,3).toLowerCase().replace(/^\w/, c => c.toUpperCase())} ${d.getFullYear()}`;
}

function labelGiorni(gg) {
  if (gg === null || gg === undefined) return "—";
  if (gg < 0) return `Scaduto ${Math.abs(gg)}gg fa`;
  if (gg === 0) return "Oggi";
  if (gg === 1) return "Domani";
  if (gg < 30) return `Tra ${gg} giorni`;
  if (gg < 365) return `Tra ${Math.round(gg/30)} mesi`;
  return `Tra ${Math.round(gg/365)} anni`;
}

function severityFromGiorni(gg) {
  if (gg === null || gg === undefined) return "ok";
  if (gg <= 7) return "crit";
  if (gg <= 30) return "warn";
  return "ok";
}

// ── API ──────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let msg = `Errore ${res.status}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ── Load all ─────────────────────────────────────────────────────────────
async function reload() {
  const [meta, dashboard, scadenze, spese, km] = await Promise.all([
    api("/api/meta"),
    api("/api/dashboard"),
    api("/api/scadenze"),
    api("/api/spese"),
    api("/api/km"),
  ]);
  STATE.meta = meta;
  STATE.mezzi = dashboard;
  STATE.scadenze = scadenze;
  STATE.spese = spese;
  STATE.km = km;
  renderAll();
}

function renderAll() {
  renderTopbarPulse();
  renderGarage();
  renderScadenze();
  renderSpese();
  renderKm();
  renderFilters();
}

// ── Top-bar pulse ─────────────────────────────────────────────────────────
function renderTopbarPulse() {
  const tot = STATE.mezzi.length;
  const okN = STATE.mezzi.filter(m => m.stato === "ok").length;

  // trova la prossima scadenza globale (non pagata, con data più vicina o stato critico)
  const open = STATE.scadenze.filter(s => !s.pagato && s.data_scadenza);
  open.sort((a, b) => (a._giorni ?? 9999) - (b._giorni ?? 9999));
  const next = open[0];

  const pulse = $("#topbar-pulse");
  if (!tot) {
    pulse.innerHTML = `<span class="pulse-dot ok"></span><span class="pulse-summary">Nessun mezzo</span>`;
    return;
  }

  let html = `<span class="pulse-dot ok"></span><span class="pulse-summary">${okN}/${tot} in regola</span>`;
  if (next) {
    const sev = next._stato === "critical" ? "crit" : next._stato === "warning" ? "warn" : "ok";
    const mezzo = STATE.mezzi.find(m => m.id === next.mezzo_id);
    const tipoTxt = capitalize(next.tipo);
    const ggTxt = next._giorni < 0 ? `${Math.abs(next._giorni)}gg fa` : `${next._giorni}gg`;
    html += `<span class="pulse-sep">·</span>`;
    html += `<span class="pulse-dot ${sev}"></span>`;
    html += `<span class="pulse-alert ${sev}">${tipoTxt} ${escape(mezzo?.nome || "")} · ${ggTxt}</span>`;
  }
  pulse.innerHTML = html;
}

// ── Tab navigation ───────────────────────────────────────────────────────
function setTab(tab) {
  STATE.currentTab = tab;
  $$(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${tab}`));
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  updateTabSlider();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateTabSlider() {
  const tabs = ["garage", "scadenze", "spese", "km"];
  const idx = tabs.indexOf(STATE.currentTab);
  const slider = $("#tab-slider");
  if (slider) slider.style.left = `calc(${idx} * 25% + 12.5% - 14px)`;
}

// ── Garage ───────────────────────────────────────────────────────────────
function renderGarage() {
  const grid = $("#flash-grid");
  const tot = STATE.mezzi.length;
  const open = STATE.scadenze.filter(s => !s.pagato).length;
  $("#garage-meta").textContent = `${tot} · ${open} SCAD`;

  if (!tot) {
    grid.innerHTML = `
      <div class="empty-state">
        <div>Nessun mezzo registrato</div>
        <div class="empty-meta">Tocca + per aggiungerne uno</div>
      </div>`;
    return;
  }

  grid.innerHTML = STATE.mezzi.map(m => renderMezzoCard(m)).join("");
}

function renderMezzoCard(m) {
  const subtitle = [m.targa, [m.marca, m.modello].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

  // Determina la prossima scadenza più vicina di questo mezzo
  const ownDeadlines = STATE.scadenze
    .filter(s => s.mezzo_id === m.id && !s.pagato);
  let next = null;
  let nextSev = "nd";
  for (const s of ownDeadlines) {
    if (s.data_scadenza && (s._giorni ?? 99999) >= -365) {
      const sev = severityFromGiorni(s._giorni);
      const score = sev === "crit" ? 0 : sev === "warn" ? 1 : 2;
      const cur = next ? (next._sev === "crit" ? 0 : next._sev === "warn" ? 1 : 2) : 99;
      if (score < cur || (score === cur && (s._giorni ?? 99999) < (next?._giorni ?? 99999))) {
        next = { ...s, _sev: sev };
      }
    }
  }
  if (next) nextSev = next._sev;

  // Costruisco la lista delle ALTRE scadenze (le 3 mini-row)
  const slots = [
    { key: "assicurazione", label: "Assicurazione", sc: m.scadenze_chiave?.assicurazione },
    { key: "revisione",     label: "Revisione",     sc: m.scadenze_chiave?.revisione },
    { key: "bollo",         label: "Bollo",         sc: m.scadenze_chiave?.bollo },
    { key: "tagliando",     label: "Tagliando",     sc: m.tagliando_km ? { stato: m.tagliando_km.stato, _km: m.tagliando_km.km_target } : null },
  ];

  // Se la "prossima" è una di queste, la rimuovo dalla mini-list
  const nextKey = next ? next.tipo.toLowerCase() : null;
  const others = slots.filter(s => s.key !== nextKey);

  // Header del ticket
  let ticketHtml = "";
  if (next) {
    const d = new Date(next.data_scadenza);
    const gg = next._giorni;
    const stateTxt = nextSev === "crit" ? "Urgente" : nextSev === "warn" ? "Da pianificare" : "In regola";
    ticketHtml = `
      <div class="next-ticket ${nextSev}">
        <div>
          <div class="next-eyebrow">Prossima</div>
          <div class="next-day">${d.getDate()}</div>
          <div class="next-mon">${MESI[d.getMonth()]} ${d.getFullYear()}</div>
        </div>
        <div>
          <div class="next-label">${escape(next.tipo)}</div>
          <div class="next-state">${stateTxt}</div>
        </div>
        <div class="next-count">
          <div class="next-count-num">${gg < 0 ? Math.abs(gg) : gg}</div>
          <div class="next-count-lbl">${gg < 0 ? "GG FA" : "GIORNI"}</div>
        </div>
      </div>`;
  } else {
    ticketHtml = `
      <div class="next-ticket nd">
        <div>
          <div class="next-eyebrow">Prossima scadenza</div>
          <div class="next-label">Nessuna registrata</div>
          <div class="next-state">Tocca "+" per aggiungerne</div>
        </div>
        <div></div>
        <div></div>
      </div>`;
  }

  // Mini-row delle altre 3
  const minisHtml = others.slice(0, 3).map(slot => {
    if (!slot.sc) {
      return `
        <div class="mini-row">
          <span class="mini-dot nd"></span>
          <span class="mini-label">${slot.label}</span>
          <span class="mini-nd">N.D.</span>
        </div>`;
    }
    const sev = slot.sc.stato === "critical" ? "crit" : slot.sc.stato === "warning" ? "warn" : "ok";
    const val = slot.sc._km ? `${fmtNum(slot.sc._km)} km` : (fmtScadShort(slot.sc.data) || "—");
    return `
      <div class="mini-row">
        <span class="mini-dot ${sev}"></span>
        <span class="mini-label">${slot.label}</span>
        <span class="mini-val">${val}</span>
      </div>`;
  }).join("");

  return `
    <div class="flash-card" style="--mezzo-color:${m.colore}" onclick="openDrill('${m.id}')">
      <div class="flash-head">
        <div class="flash-icon">${ICONS_MEZZO[m.tipo] || ICONS_MEZZO.auto}</div>
        <div class="flash-name">
          <div class="flash-name-top">${escape(m.nome)}</div>
          <div class="flash-name-sub">${escape(subtitle || "—")}</div>
        </div>
        <div class="flash-km">
          <span class="flash-km-val">${fmtNum(m.km_attuali||0)}</span><span class="flash-km-unit">km</span>
        </div>
      </div>
      ${ticketHtml}
      <div>${minisHtml}</div>
    </div>
  `;
}

// ── Filtri (chip) ────────────────────────────────────────────────────────
function renderFilters() {
  ["scadenze", "spese", "km"].forEach(kind => {
    const row = $(`#filter-${kind}`);
    const current = STATE[`filter${cap(kind)}`];
    const chips = [`<button class="chip ${current==='*'?'active':''}" data-filter="*">Tutti</button>`]
      .concat(STATE.mezzi.map(m =>
        `<button class="chip ${current===m.id?'active':''}" data-filter="${m.id}"><span class="chip-dot" style="background:${m.colore}"></span>${escape(m.nome)}</button>`
      ));
    row.innerHTML = chips.join("");
    row.querySelectorAll(".chip").forEach(c => {
      c.onclick = () => {
        STATE[`filter${cap(kind)}`] = c.dataset.filter;
        if (kind === "scadenze") renderScadenze();
        if (kind === "spese") renderSpese();
        if (kind === "km") renderKm();
      };
    });
  });
}
function cap(s) { return s[0].toUpperCase() + s.slice(1); }

// ── Scadenze ─────────────────────────────────────────────────────────────
function renderScadenze() {
  const container = $("#scadenze-content");
  let items = STATE.scadenze.filter(s => !s.pagato);
  if (STATE.filterScadenze !== "*") items = items.filter(s => s.mezzo_id === STATE.filterScadenze);

  $("#scad-meta").textContent = `${items.length} APERTE`;

  // Toggle visualizzazione
  $$("#scad-view-toggle button").forEach(b => {
    b.classList.toggle("active", b.dataset.view === STATE.scadenzeView);
  });
  const pill = $("#seg-pill");
  if (pill) {
    pill.classList.toggle("left", STATE.scadenzeView === "list");
    pill.classList.toggle("right", STATE.scadenzeView === "timeline");
  }

  if (STATE.scadenzeView === "timeline") {
    container.innerHTML = renderTimeline(items);
    return;
  }

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div>Nessuna scadenza</div>
        <div class="empty-meta">Tocca "+" per aggiungerne una</div>
      </div>`;
    return;
  }

  // Linear-style: raggruppato per "vicinanza"
  const buckets = {
    "In arrivo · 90 giorni": items.filter(s => (s._giorni ?? 9999) <= 90),
    "Prossimi 12 mesi":      items.filter(s => (s._giorni ?? 9999) > 90 && (s._giorni ?? 9999) <= 365),
    "Oltre l'anno":          items.filter(s => (s._giorni ?? 9999) > 365),
    "Senza data":            items.filter(s => !s.data_scadenza),
  };

  let html = "";
  Object.entries(buckets).forEach(([label, list]) => {
    if (!list.length) return;
    html += `<div class="list-group">
      <div class="list-eyebrow">${label}</div>
      ${list.map(s => renderScadenzaRow(s)).join("")}
    </div>`;
  });
  container.innerHTML = html || `<div class="empty-state"><div>Nessuna scadenza</div></div>`;
}

function renderScadenzaRow(s) {
  const sev = s._stato === "critical" ? "crit" : s._stato === "warning" ? "warn" : "ok";
  const mezzo = STATE.mezzi.find(m => m.id === s.mezzo_id);
  const mezzoColor = mezzo?.colore || "#888";
  const mezzoNome = (mezzo?.nome || "?").toUpperCase();
  let dayN = "—", dayM = "";
  if (s.data_scadenza) {
    const d = new Date(s.data_scadenza);
    dayN = String(d.getDate()).padStart(2, "0");
    dayM = MESI[d.getMonth()];
  } else if (s.km_scadenza) {
    dayN = "KM";
    dayM = "";
  }
  const sub = s.km_scadenza && !s.data_scadenza
    ? (s._km_mancanti != null
        ? (s._km_mancanti < 0 ? `Superato ${Math.abs(s._km_mancanti)} km` : `Tra ${fmtNum(s._km_mancanti)} km`)
        : `${fmtNum(s.km_scadenza)} km`)
    : labelGiorni(s._giorni).toUpperCase();

  const pillTxt = sev === "crit" ? "URGE" : sev === "warn" ? "VICINA" : "OK";
  const dayCls = sev === "crit" ? "crit" : sev === "warn" ? "warn" : "";

  return `
    <div class="list-row" onclick="editScadenza('${s.id}')">
      <div class="list-day">
        <div class="list-day-n ${dayCls}">${dayN}</div>
        <div class="list-day-m">${dayM}</div>
      </div>
      <div>
        <div class="list-type">${escape(s.tipo)}${s.costo ? ` · ${fmtEur(s.costo)}` : ""}</div>
        <div class="list-sub">
          <span class="list-mezzo-dot" style="background:${mezzoColor}"></span>${escape(mezzoNome)} · ${sub}
        </div>
      </div>
      <span class="pill ${sev}">${pillTxt}</span>
    </div>`;
}

// ── Timeline 12 mesi ─────────────────────────────────────────────────────
function renderTimeline(items) {
  const today = new Date();
  const startMonth = today.getMonth();
  const startYear = today.getFullYear();

  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    months.push({ idx: m, year: y, events: [] });
  }

  items.forEach(s => {
    if (!s.data_scadenza) return;
    const d = new Date(s.data_scadenza);
    const monthsAhead = (d.getFullYear() - startYear) * 12 + (d.getMonth() - startMonth);
    if (monthsAhead < 0 || monthsAhead >= 12) return;
    const sev = s._stato === "critical" ? "crit" : s._stato === "warning" ? "warn" : "ok";
    const mezzo = STATE.mezzi.find(m => m.id === s.mezzo_id);
    const mNome = (mezzo?.nome || "?").split(" ")[0].toUpperCase();
    const tipo = s.tipo.slice(0, 3).toUpperCase();
    months[monthsAhead].events.push({ sev, label: `${mNome} ${tipo}`, sid: s.id });
  });

  const lastDate = items
    .filter(s => s.data_scadenza)
    .map(s => new Date(s.data_scadenza))
    .sort((a, b) => b - a)[0];
  const firstMonthLabel = `${MESI[startMonth].slice(0,3)} ${String(startYear).slice(-2)}`;
  const endIdx = months.length - 1;
  const endLabel = `${MESI[months[endIdx].idx].slice(0,3)} ${String(months[endIdx].year).slice(-2)}`;

  let html = `<div class="timeline-wrap">
    <div class="timeline-head">
      <div class="timeline-title">${firstMonthLabel} → ${endLabel}</div>
      <div class="timeline-now-tag">NOW</div>
    </div>
    <div class="timeline-row">`;
  months.forEach((mo, i) => {
    const lbl = MESI[mo.idx].slice(0, 3);
    const lblCls = i === 0 ? "now" : "";
    html += `<div class="timeline-month">
      ${i === 0 ? `<div class="timeline-now"></div>` : ""}
      <div class="timeline-month-label ${lblCls}">${lbl}</div>
      <div class="timeline-bars">
        ${mo.events.slice(0, 4).map(e => `<div class="timeline-bar ${e.sev}" onclick="editScadenza('${e.sid}')">${e.label}</div>`).join("")}
      </div>
    </div>`;
  });
  html += `</div></div>`;

  // Sotto: ultima sezione "PROSSIMA"
  const next = items.filter(s => s.data_scadenza).sort((a, b) => (a._giorni ?? 9999) - (b._giorni ?? 9999))[0];
  if (next) {
    html += `<div class="section-title" style="margin-top:18px">Prossima</div>
      <div class="list-group">${renderScadenzaRow(next)}</div>`;
  }
  return html;
}

function setScadenzeView(view) {
  STATE.scadenzeView = view;
  renderScadenze();
}

// ── Spese ────────────────────────────────────────────────────────────────
function renderSpese() {
  let items = STATE.spese;
  if (STATE.filterSpese !== "*") items = items.filter(s => s.mezzo_id === STATE.filterSpese);

  const oggi = new Date();
  const annoFa = new Date(oggi.getTime() - 365*24*3600*1000).toISOString().slice(0,10);
  const meseInizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().slice(0,10);
  const totAnno = items.filter(s => s.data >= annoFa).reduce((a,s) => a + (Number(s.importo)||0), 0);
  const totMese = items.filter(s => s.data >= meseInizio).reduce((a,s) => a + (Number(s.importo)||0), 0);

  $("#kpi-tot-anno").textContent = fmtEur(totAnno);
  $("#kpi-tot-mese").textContent = fmtEur(totMese);

  // Sub primary: mezzi · €/km medio
  const totMezzi = STATE.filterSpese === "*" ? STATE.mezzi.length : 1;
  const eurKmAvg = STATE.mezzi
    .filter(m => STATE.filterSpese === "*" || m.id === STATE.filterSpese)
    .map(m => m.spese_anno || 0)
    .reduce((a, b) => a + b, 0);
  $("#kpi-tot-anno-sub").textContent = `${totMezzi} mezz${totMezzi > 1 ? 'i' : 'o'} · ${items.length} movimenti`;

  // Mese corr. sub
  const meseLbl = MESI[oggi.getMonth()] + " " + oggi.getFullYear();
  $("#kpi-tot-mese-sub").textContent = meseLbl;

  // Categoria top
  const perCat = {};
  items.filter(s => s.data >= annoFa).forEach(s => {
    perCat[s.categoria] = (perCat[s.categoria] || 0) + (Number(s.importo)||0);
  });
  const topCat = Object.entries(perCat).sort((a,b) => b[1]-a[1])[0];
  if (topCat) {
    $("#kpi-cat-top").textContent = capitalize(topCat[0]);
    $("#kpi-cat-top").style.fontSize = "16px";
    $("#kpi-cat-top-sub").textContent = fmtEur(topCat[1]).toUpperCase();
  } else {
    $("#kpi-cat-top").textContent = "—";
    $("#kpi-cat-top-sub").textContent = "NESSUN DATO";
  }

  // Bars
  const max = Math.max(0, ...Object.values(perCat));
  const cb = $("#cat-bars");
  if (!Object.keys(perCat).length) {
    cb.style.display = "none";
  } else {
    cb.style.display = "";
    cb.innerHTML = Object.entries(perCat).sort((a,b) => b[1]-a[1]).map(([cat, val]) => `
      <div class="cat-bar">
        <div class="cat-bar-head">
          <span class="cat-bar-name">${escape(cat)}</span>
          <span class="cat-bar-val">${fmtEur(val)}</span>
        </div>
        <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${max?(val/max*100):0}%"></div></div>
      </div>
    `).join("");
  }

  // Lista
  const wrap = $("#lista-spese-wrap");
  if (!items.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div>Nessuna spesa registrata</div>
        <div class="empty-meta">Tocca "+" per aggiungerne una</div>
      </div>`;
  } else {
    wrap.innerHTML = `<div class="list">${
      items.slice(0, 50).map(s => {
        const mezzo = STATE.mezzi.find(m => m.id === s.mezzo_id);
        const extra = s.litri ? ` · ${s.litri} L` : "";
        return `
          <div class="list-item" onclick="editSpesa('${s.id}')">
            <div class="list-icon">${ICONS_CAT[s.categoria] || ICONS_CAT.altro}</div>
            <div class="list-info">
              <div class="list-line1">${escape(s.categoria)}</div>
              <div class="list-line2">${escape((mezzo?.nome || "?").toUpperCase())} · ${fmtDate(s.data).toUpperCase()}${extra}</div>
            </div>
            <div class="list-amount">${fmtEur2(s.importo)}</div>
          </div>
        `;
      }).join("")
    }</div>`;
  }
}

// ── Km ───────────────────────────────────────────────────────────────────
function renderKm() {
  const totKm = STATE.mezzi.reduce((a, m) => a + (m.km_attuali || 0), 0);
  $("#km-meta").textContent = `${fmtNum(totKm)} KM TOT`;

  const cards = $("#km-cards");
  cards.innerHTML = STATE.mezzi.map(m => {
    // calcola delta ultime letture
    const myReadings = STATE.km.filter(k => k.mezzo_id === m.id).sort((a, b) => b.data.localeCompare(a.data));
    let deltaTxt = "NESSUNA LETTURA";
    if (myReadings.length >= 2) {
      const diff = myReadings[0].km - myReadings[1].km;
      const days = Math.round((new Date(myReadings[0].data) - new Date(myReadings[1].data)) / 86400000);
      deltaTxt = `+${fmtNum(diff)} · ${days}gg`;
    } else if (myReadings.length === 1) {
      deltaTxt = `Inizio: ${fmtDate(myReadings[0].data).toUpperCase()}`;
    }

    return `
      <div class="km-cluster" style="--mezzo-color:${m.colore}">
        <div class="km-eyebrow">
          <span class="km-eyebrow-dot"></span> ODOMETRO
        </div>
        <div class="km-name">${escape(m.nome)}</div>
        <div class="km-row">
          <div>
            <span class="km-big">${fmtNum(m.km_attuali||0)}</span><span class="km-unit">km</span>
            <div class="km-delta">${deltaTxt}</div>
          </div>
          <button class="km-cta" onclick="event.stopPropagation();addKm('${m.id}')">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Lettura
          </button>
        </div>
      </div>`;
  }).join("");

  let items = STATE.km;
  if (STATE.filterKm !== "*") items = items.filter(s => s.mezzo_id === STATE.filterKm);
  const wrap = $("#lista-km-wrap");
  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state"><div>Nessuna lettura registrata</div><div class="empty-meta">Tocca "+ Lettura" sulla card del mezzo</div></div>`;
    return;
  }
  wrap.innerHTML = `<div class="list">${
    items.slice(0, 50).map((k, i, arr) => {
      const mezzo = STATE.mezzi.find(m => m.id === k.mezzo_id);
      const prev = arr.slice(i + 1).find(p => p.mezzo_id === k.mezzo_id);
      const delta = prev ? `+${fmtNum(k.km - prev.km)}` : "INIZIO";
      const d = new Date(k.data);
      return `
        <div class="list-item" onclick="editKm('${k.id}')">
          <div class="list-day" style="background:transparent;border:none">
            <div class="list-day-n" style="font-size:14px">${d.getDate()}</div>
            <div class="list-day-m">${MESI[d.getMonth()]}</div>
          </div>
          <div class="list-info">
            <div class="list-line1">${escape(mezzo?.nome || "?")}</div>
            <div class="list-line2"><span class="list-mezzo-dot" style="background:${mezzo?.colore || '#888'}"></span>${escape(delta)}</div>
          </div>
          <div class="list-amount">${fmtNum(k.km)}</div>
        </div>
      `;
    }).join("")
  }</div>`;
}

// ── Drilldown mezzo ──────────────────────────────────────────────────────
async function openDrill(mezzoId) {
  STATE.drillMezzo = mezzoId;
  STATE.drillStats = null;
  const m = STATE.mezzi.find(x => x.id === mezzoId);
  if (!m) return;
  $("#drill-title").textContent = m.nome;
  $("#drill-overlay").style.display = "flex";

  renderDrillBody(m);

  try {
    STATE.drillStats = await api(`/api/stats/${mezzoId}`);
    renderDrillBody(m);
  } catch (e) {
    console.error("stats", e);
  }
}

function renderDrillBody(m) {
  const mezzoId = m.id;
  const scadenze = STATE.scadenze.filter(s => s.mezzo_id === mezzoId);
  const spese = STATE.spese.filter(s => s.mezzo_id === mezzoId);
  const totSpese = spese.reduce((a, s) => a + (Number(s.importo) || 0), 0);
  const stats = STATE.drillStats;

  let kpiHtml = `
    <div class="drill-stats">
      <div class="drill-stat">
        <div class="drill-stat-val">${fmtNum(m.km_attuali || 0)}</div>
        <div class="drill-stat-lbl">Km</div>
      </div>
      <div class="drill-stat">
        <div class="drill-stat-val">${fmtEur(totSpese)}</div>
        <div class="drill-stat-lbl">Tot. Spese</div>
      </div>
      <div class="drill-stat">
        <div class="drill-stat-val">${scadenze.filter(s => !s.pagato).length}</div>
        <div class="drill-stat-lbl">Scad. Aperte</div>
      </div>
    </div>`;

  if (stats) {
    const tiles = [];
    if (stats.eur_km != null) tiles.push({ lbl: "€/km (12m)", val: `€ ${stats.eur_km.toFixed(3)}` });
    if (stats.km_percorsi_anno != null) tiles.push({ lbl: "Km/anno", val: fmtNum(stats.km_percorsi_anno) });
    if (stats.consumo_l_100km != null) tiles.push({ lbl: "Consumo", val: `${stats.consumo_l_100km} l/100km` });
    if (stats.prezzo_medio_l != null) tiles.push({ lbl: "Prezzo medio", val: `€ ${stats.prezzo_medio_l.toFixed(3)}/l` });
    if (tiles.length) {
      kpiHtml += `
        <div class="section-title" style="margin:18px 0 10px">Statistiche 12 mesi</div>
        <div class="stats-grid">
          ${tiles.map(t => `
            <div class="stat-tile">
              <div class="stat-tile-val">${t.val}</div>
              <div class="stat-tile-lbl">${t.lbl}</div>
            </div>
          `).join("")}
        </div>`;
    }
  }

  $("#drill-body").innerHTML = `
    ${kpiHtml}

    <div class="section-title">Scadenze</div>
    <div class="list" style="margin-bottom:10px">
      ${scadenze.length ? scadenze.map(s => {
        const sev = s.pagato ? "ok" : (s._stato === "critical" ? "crit" : s._stato === "warning" ? "warn" : "ok");
        const sub = s.pagato
          ? "PAGATO"
          : (s.km_scadenza && !s.data_scadenza
              ? `${fmtNum(s.km_scadenza)} km`
              : (fmtDate(s.data_scadenza) || "—").toUpperCase());
        return `<div class="list-item" onclick="editScadenza('${s.id}')">
          <span class="mini-dot ${sev}" style="width:10px;height:10px"></span>
          <div class="list-info">
            <div class="list-line1">${escape(s.tipo)}</div>
            <div class="list-line2">${sub}</div>
          </div>
          <div class="list-amount">${s.costo ? fmtEur(s.costo) : ""}</div>
        </div>`;
      }).join("") : `<div class="empty-state">Nessuna scadenza</div>`}
    </div>
    <button class="btn-primary" style="margin-top:6px" onclick="addScadenza('${mezzoId}')">+ Nuova scadenza</button>

    <div class="section-title">Ultime spese</div>
    <div class="list">
      ${spese.length ? spese.slice(0, 5).map(s => `
        <div class="list-item" onclick="editSpesa('${s.id}')">
          <div class="list-icon">${ICONS_CAT[s.categoria] || ICONS_CAT.altro}</div>
          <div class="list-info">
            <div class="list-line1">${escape(s.categoria)}</div>
            <div class="list-line2">${fmtDate(s.data).toUpperCase()}${s.litri ? " · " + s.litri + " L" : ""}</div>
          </div>
          <div class="list-amount">${fmtEur2(s.importo)}</div>
        </div>
      `).join("") : `<div class="empty-state">Nessuna spesa</div>`}
    </div>
    <button class="btn-primary" style="margin-top:10px" onclick="addSpesa('${mezzoId}')">+ Nuova spesa</button>
  `;
}

function closeDrill() {
  $("#drill-overlay").style.display = "none";
  STATE.drillMezzo = null;
  STATE.drillStats = null;
}

function editMezzo() {
  if (!STATE.drillMezzo) return;
  const m = STATE.mezzi.find(x => x.id === STATE.drillMezzo);
  openModal("Modifica mezzo", `
    <div class="field"><label class="field-label">Nome</label><input id="f-nome" value="${escape(m.nome)}"></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Marca</label><input id="f-marca" value="${escape(m.marca||'')}"></div>
      <div class="field"><label class="field-label">Modello</label><input id="f-modello" value="${escape(m.modello||'')}"></div>
    </div>
    <div class="row-2">
      <div class="field"><label class="field-label">Targa</label><input id="f-targa" value="${escape(m.targa||'')}" style="text-transform:uppercase"></div>
      <div class="field"><label class="field-label">Anno</label><input id="f-anno" type="number" value="${m.anno||''}"></div>
    </div>
    <div class="field"><label class="field-label">Tipo</label>
      <select id="f-tipo">
        <option value="auto" ${m.tipo==='auto'?'selected':''}>Auto</option>
        <option value="scooter" ${m.tipo==='scooter'?'selected':''}>Scooter</option>
        <option value="scooter_sport" ${m.tipo==='scooter_sport'?'selected':''}>Moto / Scooter sport</option>
      </select>
    </div>
    <div class="row-2">
      <div class="field"><label class="field-label">Km attuali</label><input id="f-km" type="number" value="${m.km_attuali||0}"></div>
      <div class="field"><label class="field-label">Tagliando ogni (km)</label><input id="f-tagliando" type="number" value="${m.tagliando_intervallo_km||''}" placeholder="es. 6000"></div>
    </div>
    <button class="btn-primary" onclick="saveMezzo('${m.id}')">Salva</button>
    <button class="btn-danger" onclick="askDeleteMezzo('${m.id}')">Elimina mezzo</button>
  `);
}

async function saveMezzo(id) {
  try {
    const body = {
      nome: $("#f-nome").value,
      marca: $("#f-marca").value,
      modello: $("#f-modello").value,
      targa: $("#f-targa").value.toUpperCase(),
      anno: parseInt($("#f-anno").value) || null,
      tipo: $("#f-tipo").value,
      km_attuali: parseInt($("#f-km").value) || 0,
      tagliando_intervallo_km: parseInt($("#f-tagliando").value) || null,
    };
    await api(`/api/mezzi/${id}`, { method: "PUT", body });
    closeModal();
    await reload();
    if (STATE.drillMezzo) openDrill(id);
    toast("Mezzo aggiornato", "ok");
  } catch (e) { toast(e.message, "err"); }
}

async function askDeleteMezzo(id) {
  const m = STATE.mezzi.find(x => x.id === id);
  const ok = await confirmSheet(
    `Eliminare ${m?.nome || 'il mezzo'}? Verranno cancellate anche tutte le scadenze, spese e letture km associate.`,
    { confirmLabel: "Elimina", cancelLabel: "Annulla", danger: true }
  );
  if (!ok) return;
  try {
    await api(`/api/mezzi/${id}`, { method: "DELETE" });
    closeModal();
    closeDrill();
    await reload();
    toast("Mezzo eliminato", "ok");
  } catch (e) { toast(e.message, "err"); }
}

// ── Toast ────────────────────────────────────────────────────────────────
function toast(msg, kind = "info") {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.className = `toast ${kind} show`;
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = "toast"; }, 2800);
}

// ── Confirm sheet ────────────────────────────────────────────────────────
function confirmSheet(message, { confirmLabel = "Conferma", cancelLabel = "Annulla", danger = false } = {}) {
  return new Promise((resolve) => {
    let overlay = $("#confirm-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "confirm-overlay";
      overlay.className = "modal-overlay";
      overlay.style.display = "none";
      overlay.innerHTML = `
        <div class="modal" style="max-width:340px">
          <div class="modal-body" style="padding:24px 20px 18px">
            <p id="confirm-msg" style="margin:0 0 18px;font-size:15px;line-height:1.45;color:var(--text)"></p>
            <button id="confirm-yes" class="btn-primary" style="margin-bottom:8px"></button>
            <button id="confirm-no" class="btn-secondary"></button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector("#confirm-msg").textContent = message;
    const yes = overlay.querySelector("#confirm-yes");
    const no = overlay.querySelector("#confirm-no");
    yes.textContent = confirmLabel;
    no.textContent = cancelLabel;
    yes.style.background = danger ? "var(--crit)" : "var(--ink)";
    overlay.style.display = "flex";
    const close = (val) => {
      overlay.style.display = "none";
      yes.onclick = no.onclick = overlay.onclick = null;
      resolve(val);
    };
    yes.onclick = () => close(true);
    no.onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
  });
}

// ── Modal generico ───────────────────────────────────────────────────────
function openModal(title, html) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  $("#modal-overlay").style.display = "flex";
}
function closeModal() { $("#modal-overlay").style.display = "none"; }

// ── Form Scadenza (con tagliando dedicato + proiezione live) ─────────────
function _formScadenza(s, mezzoId) {
  const tipiOpt = STATE.meta.tipi_scadenza.map(t =>
    `<option value="${t}" ${t===(s?.tipo||'')?'selected':''}>${t}</option>`).join("");
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===(s?.mezzo_id||mezzoId)?'selected':''}>${escape(m.nome)}</option>`).join("");
  return `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo" onchange="aggiornaCampiScadenza()">${mezziOpt}</select></div>
    <div class="field"><label class="field-label">Tipo</label><select id="f-tipo" onchange="aggiornaCampiScadenza()">${tipiOpt}</select></div>

    <div id="sez-data">
      <div class="row-2">
        <div class="field"><label class="field-label">Data scadenza</label><input id="f-data" type="date" value="${s?.data_scadenza||''}"></div>
        <div class="field"><label class="field-label">Costo (€)</label><input id="f-costo" type="number" step="0.01" inputmode="decimal" value="${s?.costo||''}"></div>
      </div>
      <div class="field"><label class="field-label">Rinnovo (mesi)</label><input id="f-int-mesi" type="number" value="${s?.intervallo_mesi||''}" placeholder="auto"></div>
    </div>

    <div id="sez-tagliando" style="display:none">
      <div class="hint-box">
        Inserisci quando hai fatto <strong>l'ultimo</strong> tagliando + intervallo dal libretto. La data del prossimo viene <strong>proiettata dai km/mese medi</strong>.
      </div>
      <div class="row-2">
        <div class="field"><label class="field-label">Data ultimo</label><input id="f-data-ultimo" type="date" value="${s?.data_ultimo||''}" oninput="aggiornaProiezione()"></div>
        <div class="field"><label class="field-label">Km a quel momento</label><input id="f-km-ultimo" type="number" inputmode="numeric" value="${s?.km_ultimo||''}" oninput="aggiornaProiezione()"></div>
      </div>
      <div class="row-2">
        <div class="field"><label class="field-label">Intervallo (km)</label><input id="f-int-km" type="number" inputmode="numeric" value="${s?.intervallo_km||''}" placeholder="es. 6000" oninput="aggiornaProiezione()"></div>
        <div class="field"><label class="field-label">Costo (€)</label><input id="f-costo-tag" type="number" step="0.01" inputmode="decimal" value="${s?.costo||''}"></div>
      </div>
      <div class="field">
        <label class="field-label">Km medi/mese <span id="f-kpm-source" style="font-weight:500;color:var(--text-dim);margin-left:6px;text-transform:none;letter-spacing:0;font-family:inherit"></span></label>
        <input id="f-kpm" type="number" inputmode="numeric" placeholder="auto da storico" oninput="aggiornaProiezione()" value="${s?.km_per_mese_stima||''}">
      </div>
      <div class="proiezione-card" id="proiezione-card" style="display:none">
        <div class="proiezione-row"><span>Prossimo a</span><strong id="proj-km">—</strong></div>
        <div class="proiezione-row"><span>Data prevista</span><strong id="proj-data">—</strong></div>
        <div class="proiezione-row"><span>Mancano</span><strong id="proj-rest">—</strong></div>
      </div>
    </div>

    <div class="field"><label class="field-label">Note</label><textarea id="f-note">${escape(s?.note||'')}</textarea></div>
    ${s ? `
      <div class="field" style="display:flex;align-items:center;gap:10px">
        <input id="f-pagato" type="checkbox" ${s.pagato?'checked':''} style="width:auto;margin:0">
        <label for="f-pagato" style="margin:0;font-weight:500">Pagato (genera la prossima)</label>
      </div>` : ""}
    <button class="btn-primary" onclick="saveScadenza('${s?.id || ''}')">Salva</button>
    ${s ? `<button class="btn-danger" onclick="askDeleteScadenza('${s.id}')">Elimina</button>` : ""}
  `;
}

let _proiezioneCache = null;
let _proiezioneMezzoId = null;

async function aggiornaCampiScadenza() {
  const tipo = $("#f-tipo")?.value;
  const isTagliando = tipo === "tagliando";
  const sezData = $("#sez-data");
  const sezTag = $("#sez-tagliando");
  if (sezData) sezData.style.display = isTagliando ? "none" : "";
  if (sezTag)  sezTag.style.display  = isTagliando ? "" : "none";

  if (isTagliando) {
    const mezzoId = $("#f-mezzo")?.value;
    if (mezzoId && mezzoId !== _proiezioneMezzoId) {
      _proiezioneMezzoId = mezzoId;
      try {
        _proiezioneCache = await api(`/api/proiezione/${mezzoId}`);
      } catch { _proiezioneCache = null; }
      const m = STATE.mezzi.find(x => x.id === mezzoId);
      if (m) {
        const kuField = $("#f-km-ultimo");
        if (kuField && !kuField.value) kuField.value = m.km_attuali || "";
        const intField = $("#f-int-km");
        if (intField && !intField.value && m.tagliando_intervallo_km) {
          intField.value = m.tagliando_intervallo_km;
        }
        const dField = $("#f-data-ultimo");
        if (dField && !dField.value) dField.value = todayISO();
      }
    }
    aggiornaProiezione();
  }
}

function aggiornaProiezione() {
  const kmUltimo = parseInt($("#f-km-ultimo")?.value);
  const intKm = parseInt($("#f-int-km")?.value);
  const kpmManual = parseFloat($("#f-kpm")?.value);
  const mezzoId = $("#f-mezzo")?.value;
  const m = STATE.mezzi.find(x => x.id === mezzoId);
  const kmAttuali = m?.km_attuali || 0;

  let kpm = kpmManual;
  let source = "manuale";
  if (!kpm || kpm <= 0) {
    if (_proiezioneCache?.km_per_mese) {
      kpm = _proiezioneCache.km_per_mese;
      source = "da storico";
    } else {
      kpm = null;
      source = "inserisci manualmente";
    }
  }
  const kpmEl = $("#f-kpm-source");
  if (kpmEl) {
    kpmEl.textContent = `— ${source}` + (kpm ? ` (${fmtNum(kpm)})` : "");
  }
  const kpmField = $("#f-kpm");
  if (kpmField && !kpmField.value && _proiezioneCache?.km_per_mese) {
    kpmField.placeholder = `${fmtNum(_proiezioneCache.km_per_mese)} (storico)`;
  }

  const card = $("#proiezione-card");
  if (!card) return;
  if (!kmUltimo || !intKm) { card.style.display = "none"; return; }

  const kmTarget = kmUltimo + intKm;
  const mancanti = kmTarget - kmAttuali;
  let dataProj = "—";
  if (kpm && kpm > 0) {
    if (mancanti <= 0) dataProj = "ora (in ritardo!)";
    else {
      const giorni = Math.round(mancanti * 30.4375 / kpm);
      const d = new Date();
      d.setDate(d.getDate() + giorni);
      dataProj = d.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
    }
  } else { dataProj = "(manca km/mese)"; }

  $("#proj-km").textContent = fmtNum(kmTarget) + " km";
  $("#proj-data").textContent = dataProj;
  $("#proj-rest").textContent = mancanti > 0
    ? `${fmtNum(mancanti)} km`
    : `superato di ${fmtNum(Math.abs(mancanti))} km`;
  card.style.display = "";
}

function addScadenza(mezzoId) {
  _proiezioneCache = null;
  _proiezioneMezzoId = null;
  openModal("Nuova scadenza", _formScadenza(null, mezzoId));
  setTimeout(() => {
    if ($("#f-data") && !$("#f-data").value) $("#f-data").value = todayISO();
    aggiornaCampiScadenza();
  }, 0);
}

function editScadenza(id) {
  _proiezioneCache = null;
  _proiezioneMezzoId = null;
  const s = STATE.scadenze.find(x => x.id === id);
  if (!s) return;
  openModal("Modifica scadenza", _formScadenza(s));
  setTimeout(aggiornaCampiScadenza, 0);
}

async function saveScadenza(id) {
  try {
    const tipo = $("#f-tipo").value;
    const body = {
      mezzo_id: $("#f-mezzo").value,
      tipo: tipo,
      note: $("#f-note").value,
      pagato: $("#f-pagato") ? $("#f-pagato").checked : false,
    };
    if (tipo === "tagliando") {
      body.data_ultimo = $("#f-data-ultimo").value || null;
      body.km_ultimo = parseInt($("#f-km-ultimo").value) || null;
      body.intervallo_km = parseInt($("#f-int-km").value) || null;
      body.km_per_mese_stima = parseFloat($("#f-kpm").value) || null;
      body.costo = parseFloat($("#f-costo-tag").value) || 0;
    } else {
      body.data_scadenza = $("#f-data").value || null;
      body.intervallo_mesi = parseInt($("#f-int-mesi").value) || null;
      body.costo = parseFloat($("#f-costo").value) || 0;
    }
    let resp;
    if (id) resp = await api(`/api/scadenze/${id}`, { method: "PUT", body });
    else    resp = await api(`/api/scadenze`,         { method: "POST", body });
    closeModal();
    await reload();
    if (STATE.drillMezzo) openDrill(STATE.drillMezzo);
    if (resp._spesa_creata && resp._rinnovo_creato) toast("Pagato! Spesa registrata + rinnovo", "ok");
    else if (resp._spesa_creata) toast("Pagato! Spesa registrata", "ok");
    else if (resp._rinnovo_creato) toast("Pagato! Rinnovo creato", "ok");
    else toast(id ? "Scadenza aggiornata" : "Scadenza creata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

async function askDeleteScadenza(id) {
  const ok = await confirmSheet("Eliminare questa scadenza?", { confirmLabel: "Elimina", danger: true });
  if (!ok) return;
  try {
    await api(`/api/scadenze/${id}`, { method: "DELETE" });
    closeModal();
    await reload();
    if (STATE.drillMezzo) openDrill(STATE.drillMezzo);
    toast("Scadenza eliminata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

// ── Form Spesa ───────────────────────────────────────────────────────────
function _formSpesa(s, mezzoId) {
  const catOpt = STATE.meta.categorie_spesa.map(c =>
    `<option value="${c}" ${c===(s?.categoria||'')?'selected':''}>${c}</option>`).join("");
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===(s?.mezzo_id||mezzoId)?'selected':''}>${escape(m.nome)}</option>`).join("");
  return `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo">${mezziOpt}</select></div>
    <div class="field"><label class="field-label">Categoria</label><select id="f-cat" onchange="aggiornaCampiSpesa()">${catOpt}</select></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data</label><input id="f-data" type="date" value="${s?.data || todayISO()}"></div>
      <div class="field"><label class="field-label">Importo (€)</label><input id="f-importo" type="number" step="0.01" inputmode="decimal" value="${s?.importo||''}"></div>
    </div>
    <div class="row-2">
      <div class="field"><label class="field-label">Km al momento</label><input id="f-km" type="number" value="${s?.km||''}"></div>
      <div class="field" id="f-litri-wrap" style="display:none"><label class="field-label">Litri</label><input id="f-litri" type="number" step="0.01" inputmode="decimal" value="${s?.litri||''}"></div>
    </div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note">${escape(s?.note||'')}</textarea></div>
    <button class="btn-primary" onclick="saveSpesa('${s?.id || ''}')">Salva</button>
    ${s ? `<button class="btn-danger" onclick="askDeleteSpesa('${s.id}')">Elimina</button>` : ""}
  `;
}

function aggiornaCampiSpesa() {
  const cat = $("#f-cat")?.value;
  const lt = $("#f-litri-wrap"); if (lt) lt.style.display = cat === "carburante" ? "" : "none";
}

function addSpesa(mezzoId) {
  openModal("Nuova spesa", _formSpesa(null, mezzoId));
  setTimeout(aggiornaCampiSpesa, 0);
}

function editSpesa(id) {
  const s = STATE.spese.find(x => x.id === id);
  if (!s) return;
  openModal("Modifica spesa", _formSpesa(s));
  setTimeout(aggiornaCampiSpesa, 0);
}

async function saveSpesa(id) {
  try {
    const body = {
      mezzo_id: $("#f-mezzo").value,
      categoria: $("#f-cat").value,
      data: $("#f-data").value,
      importo: parseFloat($("#f-importo").value) || 0,
      km: parseInt($("#f-km").value) || null,
      litri: parseFloat($("#f-litri")?.value) || null,
      note: $("#f-note").value,
    };
    if (id) await api(`/api/spese/${id}`, { method: "PUT", body });
    else    await api(`/api/spese`,         { method: "POST", body });
    closeModal();
    await reload();
    if (STATE.drillMezzo) openDrill(STATE.drillMezzo);
    toast(id ? "Spesa aggiornata" : "Spesa creata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

async function askDeleteSpesa(id) {
  const ok = await confirmSheet("Eliminare questa spesa?", { confirmLabel: "Elimina", danger: true });
  if (!ok) return;
  try {
    await api(`/api/spese/${id}`, { method: "DELETE" });
    closeModal();
    await reload();
    toast("Spesa eliminata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

// ── Add Km ───────────────────────────────────────────────────────────────
function addKm(mezzoId) {
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===mezzoId?'selected':''}>${escape(m.nome)}</option>`).join("");
  openModal("Nuova lettura km", `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo">${mezziOpt}</select></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data</label><input id="f-data" type="date" value="${todayISO()}"></div>
      <div class="field"><label class="field-label">Km</label><input id="f-km" type="number" inputmode="numeric"></div>
    </div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note"></textarea></div>
    <button class="btn-primary" onclick="saveKm()">Salva</button>
  `);
}

async function saveKm() {
  try {
    const body = {
      mezzo_id: $("#f-mezzo").value,
      data: $("#f-data").value,
      km: parseInt($("#f-km").value) || 0,
      note: $("#f-note").value,
    };
    await api(`/api/km`, { method: "POST", body });
    closeModal();
    await reload();
    if (STATE.drillMezzo) openDrill(STATE.drillMezzo);
    toast("Lettura registrata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

function editKm(id) {
  const k = STATE.km.find(x => x.id === id);
  if (!k) return;
  const mezzo = STATE.mezzi.find(m => m.id === k.mezzo_id);
  openModal("Modifica lettura", `
    <div class="field">
      <label class="field-label">Mezzo</label>
      <input value="${escape(mezzo?.nome || '?')}" disabled style="opacity:.7">
    </div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data</label><input id="f-data" type="date" value="${k.data}"></div>
      <div class="field"><label class="field-label">Km</label><input id="f-km" type="number" inputmode="numeric" value="${k.km}"></div>
    </div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note">${escape(k.note || '')}</textarea></div>
    <button class="btn-primary" onclick="saveKmEdit('${id}')">Salva</button>
    <button class="btn-danger" onclick="askDeleteKm('${id}')">Elimina lettura</button>
  `);
}

async function saveKmEdit(id) {
  try {
    const body = {
      data: $("#f-data").value,
      km: parseInt($("#f-km").value) || 0,
      note: $("#f-note").value,
    };
    await api(`/api/km/${id}`, { method: "PUT", body });
    closeModal();
    await reload();
    toast("Lettura aggiornata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

async function askDeleteKm(id) {
  const ok = await confirmSheet("Eliminare questa lettura km?", { confirmLabel: "Elimina", danger: true });
  if (!ok) return;
  try {
    await api(`/api/km/${id}`, { method: "DELETE" });
    closeModal();
    await reload();
    toast("Lettura eliminata", "ok");
  } catch (e) { toast(e.message, "err"); }
}

// ── Quick add ────────────────────────────────────────────────────────────
function quickAdd() {
  const tab = STATE.currentTab;
  if (tab === "garage") return openModal("Aggiungi", `
    <p style="margin:0 0 14px;color:var(--text-sec);font-size:14px">Cosa vuoi aggiungere?</p>
    <button class="btn-primary" style="margin-bottom:8px" onclick="closeModal();addScadenza()">Scadenza</button>
    <button class="btn-primary" style="margin-bottom:8px;background:var(--cyan-deep)" onclick="closeModal();addSpesa()">Spesa</button>
    <button class="btn-primary" style="background:var(--text-sec)" onclick="closeModal();addKm()">Lettura km</button>
  `);
  if (tab === "scadenze") addScadenza();
  if (tab === "spese") addSpesa();
  if (tab === "km") addKm();
}

// ── Deploy ───────────────────────────────────────────────────────────────
async function checkDeployBadge() {
  try {
    const r = await fetch("/api/deploy/status");
    const s = await r.json();
    const badge = $("#deploy-badge");
    if (badge && s.platform === "pi" && s.behind > 0) {
      badge.textContent = s.behind > 9 ? "9+" : s.behind;
      badge.style.display = "flex";
    }
  } catch (e) {}
}

function openDeploySheet() {
  $("#deploy-overlay").style.display = "flex";
  loadDeployStatus();
}
function closeDeploySheet(e) {
  if (e && e.target !== e.currentTarget) return;
  $("#deploy-overlay").style.display = "none";
}

async function loadDeployStatus() {
  const dot = $("#m-deploy-dot");
  const headline = $("#m-deploy-headline");
  const loc = $("#m-deploy-local");
  const rem = $("#m-deploy-remote");
  const btn = $("#m-deploy-btn");
  headline.textContent = "Controllo…";
  dot.style.background = "#9ca3af";
  btn.disabled = true;
  try {
    const r = await fetch("/api/deploy/status");
    const s = await r.json();
    const fmtV = (v) => v && v.hash ? `${v.hash} — ${v.subject || ""}${v.when ? " · " + v.when : ""}` : "—";
    loc.textContent = fmtV(s.local);
    rem.textContent = fmtV(s.remote);
    if (s.platform !== "pi") {
      headline.textContent = "Deploy solo dal Pi";
      dot.style.background = "#9ca3af";
    } else if (s.up_to_date) {
      headline.textContent = "Aggiornato ✓";
      dot.style.background = "var(--ok)";
    } else if (s.behind > 0) {
      headline.textContent = `${s.behind} commit da installare`;
      dot.style.background = "var(--warn)";
      btn.disabled = false;
    } else {
      headline.textContent = "Stato indeterminato";
      dot.style.background = "#9ca3af";
    }
  } catch (e) {
    headline.textContent = "Errore";
    dot.style.background = "var(--crit)";
  }
}

async function mRunDeploy() {
  const ok = await confirmSheet("Aggiornare il Pi ora? Pochi secondi di downtime.", { confirmLabel: "Aggiorna" });
  if (!ok) return;
  const btn = $("#m-deploy-btn");
  const headline = $("#m-deploy-headline");
  const dot = $("#m-deploy-dot");
  const logEl = $("#m-deploy-log");
  btn.disabled = true;
  headline.textContent = "Deploy in corso…";
  dot.style.background = "var(--cyan)";
  logEl.style.display = "block";
  logEl.textContent = "git pull…";
  try {
    const r = await fetch("/api/deploy", { method: "POST" });
    const s = await r.json();
    logEl.textContent = s.log || "(no output)";
    if (!s.ok) {
      headline.textContent = "Deploy fallito";
      dot.style.background = "var(--crit)";
      btn.disabled = false;
      return;
    }
    headline.textContent = "Riavvio…";
    setTimeout(async () => {
      let okR = false;
      for (let i = 0; i < 20; i++) {
        try {
          const r2 = await fetch("/api/deploy/status");
          if (r2.ok) { okR = true; break; }
        } catch (e) {}
        await new Promise(res => setTimeout(res, 1000));
      }
      if (okR) {
        headline.textContent = "Completato ✓";
        dot.style.background = "var(--ok)";
        await loadDeployStatus();
        toast("Pi aggiornato", "ok");
      } else {
        headline.textContent = "Il servizio non risponde";
        dot.style.background = "var(--crit)";
      }
    }, 3000);
  } catch (e) {
    headline.textContent = "Errore di rete";
    dot.style.background = "var(--crit)";
    btn.disabled = false;
  }
}

window.openDeploySheet = openDeploySheet;
window.closeDeploySheet = closeDeploySheet;
window.mLoadDeployStatus = loadDeployStatus;
window.mRunDeploy = mRunDeploy;

// ── Utility ──────────────────────────────────────────────────────────────
function escape(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
function capitalize(s) { return String(s || "").replace(/^\w/, c => c.toUpperCase()); }

// ── Init ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  $$(".nav-btn").forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $("#btn-add-quick").onclick = quickAdd;
  $("#drill-overlay").addEventListener("click", (e) => {
    if (e.target === $("#drill-overlay")) closeDrill();
  });
  $("#modal-overlay").addEventListener("click", (e) => {
    if (e.target === $("#modal-overlay")) closeModal();
  });
  setTimeout(updateTabSlider, 50);
  reload()
    .then(() => checkDeployBadge())
    .catch(err => {
      console.error(err);
      document.body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--crit)">Errore di caricamento: ${err.message}</div>`;
    });
});
