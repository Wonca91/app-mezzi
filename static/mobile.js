/* ──────────────────────────────────────────────────────────────────────
   App Mezzi — Frontend logic
   ────────────────────────────────────────────────────────────────────── */

const STATE = {
  mezzi: [],
  scadenze: [],
  spese: [],
  km: [],
  meta: { tipi_scadenza: [], categorie_spesa: [] },
  filterScadenze: "*",
  filterSpese: "*",
  filterKm: "*",
  drillMezzo: null,
  currentTab: "garage",
};

// ── SVG icons per tipo mezzo ──────────────────────────────────────────
const ICONS_MEZZO = {
  auto: `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 28h52v-6l-4-2-4-10c-1-2-3-3-5-3H19c-2 0-4 1-5 3l-4 10-4 2v6z"/><circle cx="16" cy="30" r="4"/><circle cx="48" cy="30" r="4"/><line x1="14" y1="18" x2="50" y2="18"/></svg>`,
  scooter: `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="30" r="6"/><circle cx="50" cy="30" r="6"/><path d="M14 30L26 14h10l4 8M40 22h8l4 8M26 14h-8"/><path d="M40 14v4"/></svg>`,
  scooter_sport: `<svg viewBox="0 0 64 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="30" r="6"/><circle cx="50" cy="30" r="6"/><path d="M14 30l8-12 8 4 6-8 8 2 6 14"/><path d="M30 22h12"/><path d="M44 14l4-2"/></svg>`,
};

const ICONS_STATUS = {
  ok: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  critical: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
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
const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
};
const todayISO = () => new Date().toISOString().slice(0, 10);

const MESI = ["GEN","FEB","MAR","APR","MAG","GIU","LUG","AGO","SET","OTT","NOV","DIC"];

function statoFromGiorni(gg) {
  if (gg === null || gg === undefined) return "ok";
  if (gg <= 7) return "critical";
  if (gg <= 30) return "warning";
  return "ok";
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

// ── API ──────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
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
  renderGarage();
  renderScadenze();
  renderSpese();
  renderKm();
  renderFilters();
}

// ── Tab navigation ───────────────────────────────────────────────────────
function setTab(tab) {
  STATE.currentTab = tab;
  $$(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${tab}`));
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  window.scrollTo({ top: 0, behavior: "instant" });
}

// ── Garage ───────────────────────────────────────────────────────────────
function renderGarage() {
  const grid = $("#flash-grid");
  if (!STATE.mezzi.length) {
    grid.innerHTML = `<div class="empty-state">Nessun mezzo. Tocca + per aggiungerne uno.</div>`;
  } else {
    grid.innerHTML = STATE.mezzi.map(m => {
      const stato = m.stato || "ok";
      const prossima = m.prossima_scadenza;
      const prossimaTxt = prossima
        ? `${prossima.tipo} • ${labelGiorni(prossima.giorni)}`
        : "Nessuna scadenza";
      const valClass = stato === "critical" ? "crit" : stato === "warning" ? "warn" : "";
      return `
        <div class="flash-card" style="--mezzo-color:${m.colore}" onclick="openDrill('${m.id}')">
          <div class="flash-top">
            <div class="flash-icon">${ICONS_MEZZO[m.tipo] || ICONS_MEZZO.auto}</div>
            <div class="flash-name">
              <div class="flash-name-top">${escape(m.nome)}</div>
              <div class="flash-name-sub">${escape(m.targa || (m.marca + " " + m.modello).trim() || "—")}</div>
            </div>
            <div class="status-dot ${stato}">${ICONS_STATUS[stato]}</div>
          </div>
          <div class="flash-meta">
            <div class="flash-meta-item">
              <span class="flash-meta-label">Km</span>
              <span class="flash-meta-value">${fmtKm(m.km_attuali)}</span>
            </div>
            <div class="flash-meta-item">
              <span class="flash-meta-label">Prossima</span>
              <span class="flash-meta-value ${valClass}">${escape(prossimaTxt)}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Subtitle: count overall status
  const tot = STATE.mezzi.length;
  const okN = STATE.mezzi.filter(m => m.stato === "ok").length;
  $("#garage-sub").textContent = tot
    ? `${okN}/${tot} in regola • ${STATE.scadenze.filter(s => !s.pagato).length} scadenze aperte`
    : "Aggiungi il tuo primo mezzo";

  // Upcoming
  const upcoming = STATE.scadenze
    .filter(s => !s.pagato && s.data_scadenza)
    .slice(0, 5);
  const ul = $("#upcoming-list");
  if (!upcoming.length) {
    ul.innerHTML = `<div class="empty-state">Nessuna scadenza in arrivo.</div>`;
  } else {
    ul.innerHTML = upcoming.map(s => {
      const d = new Date(s.data_scadenza);
      const mezzo = STATE.mezzi.find(m => m.id === s.mezzo_id);
      const stato = s._stato || "ok";
      return `
        <div class="upcoming-item" onclick="editScadenza('${s.id}')">
          <div class="upcoming-day">
            <div class="upcoming-day-num">${d.getDate()}</div>
            <div class="upcoming-day-mon">${MESI[d.getMonth()]}</div>
          </div>
          <div class="upcoming-info">
            <div class="upcoming-tipo">${escape(s.tipo)}</div>
            <div class="upcoming-mezzo">${escape(mezzo ? mezzo.nome : "?")} • ${labelGiorni(s._giorni)}</div>
          </div>
          <div class="upcoming-badge ${stato}">${stato === "ok" ? "OK" : stato === "warning" ? "Vicina" : "Urgente"}</div>
        </div>
      `;
    }).join("");
  }
}

// ── Filtri (chip) ────────────────────────────────────────────────────────
function renderFilters() {
  ["scadenze", "spese", "km"].forEach(kind => {
    const row = $(`#filter-${kind}`);
    const current = STATE[`filter${kind[0].toUpperCase()+kind.slice(1)}`];
    const chips = [`<button class="chip ${current==='*'?'active':''}" data-filter="*">Tutti</button>`]
      .concat(STATE.mezzi.map(m =>
        `<button class="chip ${current===m.id?'active':''}" data-filter="${m.id}">${escape(m.nome)}</button>`
      ));
    row.innerHTML = chips.join("");
    row.querySelectorAll(".chip").forEach(c => {
      c.onclick = () => {
        STATE[`filter${kind[0].toUpperCase()+kind.slice(1)}`] = c.dataset.filter;
        if (kind === "scadenze") renderScadenze();
        if (kind === "spese") renderSpese();
        if (kind === "km") renderKm();
      };
    });
  });
}

// ── Scadenze ─────────────────────────────────────────────────────────────
function renderScadenze() {
  const tl = $("#timeline-scadenze");
  let items = STATE.scadenze;
  if (STATE.filterScadenze !== "*") items = items.filter(s => s.mezzo_id === STATE.filterScadenze);
  if (!items.length) {
    tl.innerHTML = `<div class="empty-state">Nessuna scadenza. Tocca + per aggiungerne una.</div>`;
    return;
  }
  tl.innerHTML = items.map(s => {
    const d = s.data_scadenza ? new Date(s.data_scadenza) : null;
    const mezzo = STATE.mezzi.find(m => m.id === s.mezzo_id);
    const stato = s.pagato ? "ok" : (s._stato || "ok");
    const badge = s.pagato ? "Pagato" : (stato === "ok" ? "OK" : stato === "warning" ? "Vicina" : "Urgente");
    return `
      <div class="upcoming-item" onclick="editScadenza('${s.id}')">
        <div class="upcoming-day">
          <div class="upcoming-day-num">${d ? d.getDate() : "—"}</div>
          <div class="upcoming-day-mon">${d ? MESI[d.getMonth()] : ""}</div>
        </div>
        <div class="upcoming-info">
          <div class="upcoming-tipo">${escape(s.tipo)}${s.costo ? ` • ${fmtEur(s.costo)}` : ""}</div>
          <div class="upcoming-mezzo">${escape(mezzo ? mezzo.nome : "?")} • ${s.pagato ? "Pagato" : labelGiorni(s._giorni)}</div>
        </div>
        <div class="upcoming-badge ${stato}">${badge}</div>
      </div>
    `;
  }).join("");
}

// ── Spese ────────────────────────────────────────────────────────────────
function renderSpese() {
  let items = STATE.spese;
  if (STATE.filterSpese !== "*") items = items.filter(s => s.mezzo_id === STATE.filterSpese);

  // KPIs
  const oggi = new Date();
  const annoFa = new Date(oggi.getTime() - 365*24*3600*1000).toISOString().slice(0,10);
  const meseInizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1).toISOString().slice(0,10);
  const totAnno = items.filter(s => s.data >= annoFa).reduce((a,s) => a + (Number(s.importo)||0), 0);
  const totMese = items.filter(s => s.data >= meseInizio).reduce((a,s) => a + (Number(s.importo)||0), 0);
  $("#kpi-tot-anno").textContent = fmtEur(totAnno);
  $("#kpi-tot-mese").textContent = fmtEur(totMese);

  // Bars per categoria (12 mesi)
  const perCat = {};
  items.filter(s => s.data >= annoFa).forEach(s => {
    perCat[s.categoria] = (perCat[s.categoria] || 0) + (Number(s.importo)||0);
  });
  const max = Math.max(0, ...Object.values(perCat));
  const cb = $("#cat-bars");
  if (!Object.keys(perCat).length) {
    cb.innerHTML = `<div style="text-align:center;color:var(--text-dim);font-size:13px">Nessuna spesa nell'ultimo anno</div>`;
  } else {
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
  const list = $("#lista-spese");
  if (!items.length) {
    list.innerHTML = `<div class="empty-state">Nessuna spesa.</div>`;
  } else {
    list.innerHTML = items.slice(0, 50).map(s => {
      const mezzo = STATE.mezzi.find(m => m.id === s.mezzo_id);
      return `
        <div class="list-item" onclick="editSpesa('${s.id}')">
          <div class="list-icon">${ICONS_CAT[s.categoria] || ICONS_CAT.altro}</div>
          <div class="list-info">
            <div class="list-line1">${escape(s.categoria)}</div>
            <div class="list-line2">${escape(mezzo ? mezzo.nome : "?")} • ${fmtDate(s.data)}${s.note ? " • " + escape(s.note) : ""}</div>
          </div>
          <div class="list-amount">${fmtEur2(s.importo)}</div>
        </div>
      `;
    }).join("");
  }
}

// ── Km ───────────────────────────────────────────────────────────────────
function renderKm() {
  const cards = $("#km-cards");
  cards.innerHTML = STATE.mezzi.map(m => `
    <div class="km-card" style="--mezzo-color:${m.colore}">
      <div>
        <div class="km-card-name">${escape(m.nome)}</div>
        <div class="km-card-num">${Number(m.km_attuali||0).toLocaleString("it-IT")}<small>km</small></div>
      </div>
      <button class="km-card-btn" onclick="event.stopPropagation();addKm('${m.id}')">+ lettura</button>
    </div>
  `).join("");

  let items = STATE.km;
  if (STATE.filterKm !== "*") items = items.filter(s => s.mezzo_id === STATE.filterKm);
  const list = $("#lista-km");
  if (!items.length) {
    list.innerHTML = `<div class="empty-state">Nessuna lettura registrata.</div>`;
    return;
  }
  list.innerHTML = items.slice(0, 50).map(k => {
    const mezzo = STATE.mezzi.find(m => m.id === k.mezzo_id);
    return `
      <div class="list-item">
        <div class="list-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>
        <div class="list-info">
          <div class="list-line1">${escape(mezzo ? mezzo.nome : "?")}</div>
          <div class="list-line2">${fmtDate(k.data)}${k.note ? " • " + escape(k.note) : ""}</div>
        </div>
        <div class="list-amount">${Number(k.km).toLocaleString("it-IT")}</div>
      </div>
    `;
  }).join("");
}

// ── Drilldown mezzo ──────────────────────────────────────────────────────
function openDrill(mezzoId) {
  STATE.drillMezzo = mezzoId;
  const m = STATE.mezzi.find(x => x.id === mezzoId);
  if (!m) return;
  $("#drill-title").textContent = m.nome;
  const scadenze = STATE.scadenze.filter(s => s.mezzo_id === mezzoId);
  const spese = STATE.spese.filter(s => s.mezzo_id === mezzoId);
  const totSpese = spese.reduce((a,s) => a + (Number(s.importo)||0), 0);

  $("#drill-body").innerHTML = `
    <div class="drill-stats">
      <div class="drill-stat">
        <div class="drill-stat-val">${Number(m.km_attuali||0).toLocaleString("it-IT")}</div>
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
    </div>

    <div class="section-title" style="margin-top:0">Scadenze</div>
    <div class="list" style="margin-bottom:10px">
      ${scadenze.length ? scadenze.map(s => {
        const stato = s.pagato ? "ok" : (s._stato || "ok");
        return `<div class="list-item" onclick="editScadenza('${s.id}')">
          <div class="list-icon" style="background:${stato==='critical'?'rgba(255,59,48,.15)':stato==='warning'?'rgba(255,149,0,.15)':'var(--surface-alt)'}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="list-info">
            <div class="list-line1">${escape(s.tipo)}</div>
            <div class="list-line2">${fmtDate(s.data_scadenza)} ${s.pagato ? "• pagato" : ""}</div>
          </div>
          <div class="list-amount">${s.costo ? fmtEur(s.costo) : ""}</div>
        </div>`;
      }).join("") : `<div class="empty-state">Nessuna scadenza.</div>`}
    </div>
    <button class="btn-primary" style="margin-top:6px" onclick="addScadenza('${mezzoId}')">+ Nuova scadenza</button>

    <div class="section-title">Ultime spese</div>
    <div class="list">
      ${spese.length ? spese.slice(0,5).map(s => `
        <div class="list-item" onclick="editSpesa('${s.id}')">
          <div class="list-icon">${ICONS_CAT[s.categoria] || ICONS_CAT.altro}</div>
          <div class="list-info">
            <div class="list-line1">${escape(s.categoria)}</div>
            <div class="list-line2">${fmtDate(s.data)}</div>
          </div>
          <div class="list-amount">${fmtEur2(s.importo)}</div>
        </div>
      `).join("") : `<div class="empty-state">Nessuna spesa.</div>`}
    </div>
    <button class="btn-primary" style="margin-top:10px" onclick="addSpesa('${mezzoId}')">+ Nuova spesa</button>
  `;
  $("#drill-overlay").style.display = "flex";
}

function closeDrill() {
  $("#drill-overlay").style.display = "none";
  STATE.drillMezzo = null;
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
    <div class="field"><label class="field-label">Km attuali</label><input id="f-km" type="number" value="${m.km_attuali||0}"></div>
    <button class="btn-primary" onclick="saveMezzo('${m.id}')">Salva</button>
  `);
}

async function saveMezzo(id) {
  const body = {
    nome: $("#f-nome").value,
    marca: $("#f-marca").value,
    modello: $("#f-modello").value,
    targa: $("#f-targa").value.toUpperCase(),
    anno: parseInt($("#f-anno").value) || null,
    tipo: $("#f-tipo").value,
    km_attuali: parseInt($("#f-km").value) || 0,
  };
  await api(`/api/mezzi/${id}`, { method: "PUT", body });
  closeModal();
  await reload();
  if (STATE.drillMezzo) openDrill(id);
}

// ── Modal generico ───────────────────────────────────────────────────────
function openModal(title, html) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  $("#modal-overlay").style.display = "flex";
}
function closeModal() {
  $("#modal-overlay").style.display = "none";
}

// ── Add/Edit Scadenza ────────────────────────────────────────────────────
function addScadenza(mezzoId) {
  const tipiOpt = STATE.meta.tipi_scadenza.map(t =>
    `<option value="${t}">${t}</option>`).join("");
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===mezzoId?'selected':''}>${escape(m.nome)}</option>`).join("");
  openModal("Nuova scadenza", `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo">${mezziOpt}</select></div>
    <div class="field"><label class="field-label">Tipo</label><select id="f-tipo">${tipiOpt}</select></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data scadenza</label><input id="f-data" type="date" value="${todayISO()}"></div>
      <div class="field"><label class="field-label">Costo (€)</label><input id="f-costo" type="number" step="0.01" value=""></div>
    </div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note"></textarea></div>
    <button class="btn-primary" onclick="saveScadenza()">Salva</button>
  `);
}

function editScadenza(id) {
  const s = STATE.scadenze.find(x => x.id === id);
  if (!s) return;
  const tipiOpt = STATE.meta.tipi_scadenza.map(t =>
    `<option value="${t}" ${t===s.tipo?'selected':''}>${t}</option>`).join("");
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===s.mezzo_id?'selected':''}>${escape(m.nome)}</option>`).join("");
  openModal("Modifica scadenza", `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo">${mezziOpt}</select></div>
    <div class="field"><label class="field-label">Tipo</label><select id="f-tipo">${tipiOpt}</select></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data scadenza</label><input id="f-data" type="date" value="${s.data_scadenza||''}"></div>
      <div class="field"><label class="field-label">Costo (€)</label><input id="f-costo" type="number" step="0.01" value="${s.costo||''}"></div>
    </div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note">${escape(s.note||'')}</textarea></div>
    <div class="field" style="display:flex;align-items:center;gap:10px">
      <input id="f-pagato" type="checkbox" ${s.pagato?'checked':''} style="width:auto;margin:0">
      <label for="f-pagato" style="margin:0;font-weight:500">Pagato</label>
    </div>
    <button class="btn-primary" onclick="saveScadenza('${id}')">Salva</button>
    <button class="btn-danger" onclick="deleteScadenza('${id}')">Elimina</button>
  `);
}

async function saveScadenza(id) {
  const body = {
    mezzo_id: $("#f-mezzo").value,
    tipo: $("#f-tipo").value,
    data_scadenza: $("#f-data").value,
    costo: parseFloat($("#f-costo").value) || 0,
    note: $("#f-note").value,
    pagato: $("#f-pagato") ? $("#f-pagato").checked : false,
  };
  if (id) {
    await api(`/api/scadenze/${id}`, { method: "PUT", body });
  } else {
    await api(`/api/scadenze`, { method: "POST", body });
  }
  closeModal();
  await reload();
  if (STATE.drillMezzo) openDrill(STATE.drillMezzo);
}

async function deleteScadenza(id) {
  if (!confirm("Eliminare questa scadenza?")) return;
  await api(`/api/scadenze/${id}`, { method: "DELETE" });
  closeModal();
  await reload();
  if (STATE.drillMezzo) openDrill(STATE.drillMezzo);
}

// ── Add/Edit Spesa ───────────────────────────────────────────────────────
function addSpesa(mezzoId) {
  const catOpt = STATE.meta.categorie_spesa.map(c =>
    `<option value="${c}">${c}</option>`).join("");
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===mezzoId?'selected':''}>${escape(m.nome)}</option>`).join("");
  openModal("Nuova spesa", `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo">${mezziOpt}</select></div>
    <div class="field"><label class="field-label">Categoria</label><select id="f-cat">${catOpt}</select></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data</label><input id="f-data" type="date" value="${todayISO()}"></div>
      <div class="field"><label class="field-label">Importo (€)</label><input id="f-importo" type="number" step="0.01" inputmode="decimal"></div>
    </div>
    <div class="field"><label class="field-label">Km al momento (opz.)</label><input id="f-km" type="number"></div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note"></textarea></div>
    <button class="btn-primary" onclick="saveSpesa()">Salva</button>
  `);
}

function editSpesa(id) {
  const s = STATE.spese.find(x => x.id === id);
  if (!s) return;
  const catOpt = STATE.meta.categorie_spesa.map(c =>
    `<option value="${c}" ${c===s.categoria?'selected':''}>${c}</option>`).join("");
  const mezziOpt = STATE.mezzi.map(m =>
    `<option value="${m.id}" ${m.id===s.mezzo_id?'selected':''}>${escape(m.nome)}</option>`).join("");
  openModal("Modifica spesa", `
    <div class="field"><label class="field-label">Mezzo</label><select id="f-mezzo">${mezziOpt}</select></div>
    <div class="field"><label class="field-label">Categoria</label><select id="f-cat">${catOpt}</select></div>
    <div class="row-2">
      <div class="field"><label class="field-label">Data</label><input id="f-data" type="date" value="${s.data||''}"></div>
      <div class="field"><label class="field-label">Importo (€)</label><input id="f-importo" type="number" step="0.01" value="${s.importo||''}"></div>
    </div>
    <div class="field"><label class="field-label">Km al momento (opz.)</label><input id="f-km" type="number" value="${s.km||''}"></div>
    <div class="field"><label class="field-label">Note</label><textarea id="f-note">${escape(s.note||'')}</textarea></div>
    <button class="btn-primary" onclick="saveSpesa('${id}')">Salva</button>
    <button class="btn-danger" onclick="deleteSpesa('${id}')">Elimina</button>
  `);
}

async function saveSpesa(id) {
  const body = {
    mezzo_id: $("#f-mezzo").value,
    categoria: $("#f-cat").value,
    data: $("#f-data").value,
    importo: parseFloat($("#f-importo").value) || 0,
    km: parseInt($("#f-km").value) || null,
    note: $("#f-note").value,
  };
  if (id) {
    await api(`/api/spese/${id}`, { method: "PUT", body });
  } else {
    await api(`/api/spese`, { method: "POST", body });
  }
  closeModal();
  await reload();
}

async function deleteSpesa(id) {
  if (!confirm("Eliminare questa spesa?")) return;
  await api(`/api/spese/${id}`, { method: "DELETE" });
  closeModal();
  await reload();
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
  const body = {
    mezzo_id: $("#f-mezzo").value,
    data: $("#f-data").value,
    km: parseInt($("#f-km").value) || 0,
    note: $("#f-note").value,
  };
  await api(`/api/km`, { method: "POST", body });
  closeModal();
  await reload();
}

// ── Quick add (FAB top-right) ────────────────────────────────────────────
function quickAdd() {
  const tab = STATE.currentTab;
  if (tab === "garage") return openModal("Aggiungi", `
    <p style="margin:0 0 14px;color:var(--text-sec);font-size:14px">Cosa vuoi aggiungere?</p>
    <button class="btn-primary" style="margin-bottom:8px" onclick="closeModal();addScadenza()">Scadenza</button>
    <button class="btn-primary" style="margin-bottom:8px;background:var(--accent-2)" onclick="closeModal();addSpesa()">Spesa</button>
    <button class="btn-primary" style="background:var(--text-sec)" onclick="closeModal();addKm()">Lettura km</button>
  `);
  if (tab === "scadenze") addScadenza();
  if (tab === "spese") addSpesa();
  if (tab === "km") addKm();
}

// ── Utility ──────────────────────────────────────────────────────────────
function escape(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
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
      dot.style.background = "var(--success)";
    } else if (s.behind > 0) {
      headline.textContent = `${s.behind} commit da installare`;
      dot.style.background = "var(--warning)";
      btn.disabled = false;
    } else {
      headline.textContent = "Stato indeterminato";
      dot.style.background = "#9ca3af";
    }
  } catch (e) {
    headline.textContent = "Errore";
    dot.style.background = "var(--danger)";
  }
}

async function mRunDeploy() {
  if (!confirm("Aggiornare il Pi ora? Pochi secondi di downtime.")) return;
  const btn = $("#m-deploy-btn");
  const headline = $("#m-deploy-headline");
  const dot = $("#m-deploy-dot");
  const logEl = $("#m-deploy-log");
  btn.disabled = true;
  headline.textContent = "Deploy in corso…";
  dot.style.background = "var(--accent)";
  logEl.style.display = "block";
  logEl.textContent = "git pull…";
  try {
    const r = await fetch("/api/deploy", { method: "POST" });
    const s = await r.json();
    logEl.textContent = s.log || "(no output)";
    if (!s.ok) {
      headline.textContent = "Deploy fallito";
      dot.style.background = "var(--danger)";
      btn.disabled = false;
      return;
    }
    headline.textContent = "Riavvio…";
    setTimeout(async () => {
      let ok = false;
      for (let i = 0; i < 20; i++) {
        try {
          const r2 = await fetch("/api/deploy/status");
          if (r2.ok) { ok = true; break; }
        } catch (e) {}
        await new Promise(res => setTimeout(res, 1000));
      }
      if (ok) {
        headline.textContent = "Completato ✓";
        dot.style.background = "var(--success)";
        await loadDeployStatus();
      } else {
        headline.textContent = "Il servizio non risponde";
        dot.style.background = "var(--danger)";
      }
    }, 3000);
  } catch (e) {
    headline.textContent = "Errore di rete";
    dot.style.background = "var(--danger)";
    btn.disabled = false;
  }
}

// Espongo per onclick inline
window.openDeploySheet = openDeploySheet;
window.closeDeploySheet = closeDeploySheet;
window.mLoadDeployStatus = loadDeployStatus;
window.mRunDeploy = mRunDeploy;

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
  reload()
    .then(() => checkDeployBadge())
    .catch(err => {
      console.error(err);
      document.body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger)">Errore di caricamento: ${err.message}</div>`;
    });
});
