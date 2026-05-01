"""
App Mezzi 1.0 — Gestione mezzi (auto/scooter)
Backend Flask + JSON locale.
"""

from flask import Flask, render_template, jsonify, request, redirect
import json, os, uuid, datetime, copy, webbrowser, threading
import shutil, subprocess, time, platform

app = Flask(__name__)
app.json.sort_keys = False

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mezzi_data.json")
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backups")
_STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


def _asset_version(filename):
    try:
        return str(int(os.path.getmtime(os.path.join(_STATIC_DIR, filename))))
    except OSError:
        return "0"


@app.context_processor
def _inject_asset_version():
    return {"asset_v": _asset_version}


# ── Default seed ──────────────────────────────────────────────────────────────
DEFAULT_DATA = {
    "mezzi": [
        {
            "id": "voge-sr3",
            "nome": "VOGE SR3",
            "tipo": "scooter_sport",
            "targa": "",
            "marca": "Voge",
            "modello": "SR3",
            "anno": None,
            "km_attuali": 0,
            "colore": "#00d4ff",
            "tagliando_intervallo_km": None,
        },
        {
            "id": "askoll",
            "nome": "Askoll",
            "tipo": "scooter",
            "targa": "",
            "marca": "Askoll",
            "modello": "",
            "anno": None,
            "km_attuali": 0,
            "colore": "#34c759",
            "tagliando_intervallo_km": None,
        },
        {
            "id": "panda",
            "nome": "Panda",
            "tipo": "auto",
            "targa": "",
            "marca": "Fiat",
            "modello": "Panda",
            "anno": None,
            "km_attuali": 0,
            "colore": "#ff9500",
            "tagliando_intervallo_km": None,
        },
    ],
    "scadenze": [],
    "spese": [],
    "km_log": [],
}

TIPI_SCADENZA = ["bollo", "assicurazione", "revisione", "tagliando", "altro"]
CATEGORIE_SPESA = [
    "carburante", "manutenzione", "assicurazione", "bollo", "revisione",
    "parcheggio", "pedaggio", "multa", "accessori", "altro",
]

# Mappa tipo scadenza → categoria spesa quando si segna "pagato"
SCADENZA_TO_CATEGORIA = {
    "bollo": "bollo",
    "assicurazione": "assicurazione",
    "revisione": "revisione",
    "tagliando": "manutenzione",
    "altro": "altro",
}

# Durata di default (mesi) per il rinnovo automatico
DURATA_DEFAULT_MESI = {
    "bollo": 12,
    "assicurazione": 12,
    "revisione": 24,
    "tagliando": 12,
    "altro": 12,
}


# ── Backup ────────────────────────────────────────────────────────────────────
_last_daily_backup = None


def _do_backup():
    """Snapshot rolling (max 60) + giornaliero (max 90). Mai blocca l'app."""
    global _last_daily_backup
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        now = datetime.datetime.now()

        # Rolling
        ts = now.strftime("%Y%m%d_%H%M%S")
        dest = os.path.join(BACKUP_DIR, f"mezzi_{ts}.json")
        shutil.copy2(DB_FILE, dest)
        rolling = sorted(
            f for f in os.listdir(BACKUP_DIR)
            if f.startswith("mezzi_") and f.endswith(".json") and "_" in f[6:]
        )
        for old in rolling[:-60]:
            try:
                os.remove(os.path.join(BACKUP_DIR, old))
            except OSError:
                pass

        # Daily
        today = now.date()
        if _last_daily_backup != today:
            daily_dir = os.path.join(BACKUP_DIR, "daily")
            os.makedirs(daily_dir, exist_ok=True)
            daily_dest = os.path.join(daily_dir, f"mezzi_{today}.json")
            shutil.copy2(DB_FILE, daily_dest)
            _last_daily_backup = today
            days = sorted(f for f in os.listdir(daily_dir) if f.endswith(".json"))
            for old in days[:-90]:
                try:
                    os.remove(os.path.join(daily_dir, old))
                except OSError:
                    pass
    except Exception:
        pass   # un backup non deve mai crashare l'app


# ── Data helpers ──────────────────────────────────────────────────────────────
_cache = None
_cache_mtime = None
_save_lock = threading.Lock()


def load():
    global _cache, _cache_mtime
    if not os.path.exists(DB_FILE):
        save(copy.deepcopy(DEFAULT_DATA))
    file_mtime = os.path.getmtime(DB_FILE)
    if _cache is not None and _cache_mtime == file_mtime:
        return _cache
    with open(DB_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Migrazioni soft
    for key in ("mezzi", "scadenze", "spese", "km_log"):
        data.setdefault(key, [])
    for m in data["mezzi"]:
        m.setdefault("tagliando_intervallo_km", None)
    for s in data["scadenze"]:
        s.setdefault("km_scadenza", None)
        s.setdefault("intervallo_km", None)
        s.setdefault("intervallo_mesi", None)
        s.setdefault("data_ultimo", None)
        s.setdefault("km_ultimo", None)
        s.setdefault("km_per_mese_stima", None)
    _cache = data
    _cache_mtime = file_mtime
    return data


def save(data):
    """Scrittura atomica + backup."""
    global _cache, _cache_mtime
    with _save_lock:
        # backup PRIMA di sovrascrivere (se esiste già un file)
        if os.path.exists(DB_FILE):
            _do_backup()
        # write atomico (file temporaneo + replace)
        tmp = DB_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, DB_FILE)
        _cache = data
        _cache_mtime = os.path.getmtime(DB_FILE)


# ── Validazione ───────────────────────────────────────────────────────────────
def _err(msg, code=400):
    return jsonify({"error": msg}), code


def _mezzo_exists(mezzo_id):
    return any(m["id"] == mezzo_id for m in load()["mezzi"])


def _safe_float(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _safe_int(v, default=0):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


# ── Stato scadenza ────────────────────────────────────────────────────────────
def stato_scadenza(data_scadenza_str):
    """Ritorna ('ok'|'warning'|'critical', giorni_rimanenti). None se non valido."""
    try:
        d = datetime.date.fromisoformat(data_scadenza_str)
    except (TypeError, ValueError):
        return ("ok", None)
    delta = (d - datetime.date.today()).days
    if delta <= 7:
        return ("critical", delta)
    if delta <= 30:
        return ("warning", delta)
    return ("ok", delta)


def stato_km(km_target, km_attuali):
    """Per scadenze a chilometraggio: ('ok'|'warning'|'critical', km_mancanti)."""
    if km_target is None or km_attuali is None:
        return ("ok", None)
    delta = int(km_target) - int(km_attuali)
    if delta <= 200:
        return ("critical", delta)
    if delta <= 1000:
        return ("warning", delta)
    return ("ok", delta)


def stato_combinato(s, mezzo):
    """Combina stato data + stato km della scadenza. Ritorna il peggiore."""
    s_data = stato_scadenza(s.get("data_scadenza")) if s.get("data_scadenza") else ("ok", None)
    s_km = stato_km(s.get("km_scadenza"), mezzo.get("km_attuali", 0)) if s.get("km_scadenza") else ("ok", None)
    order = {"ok": 0, "warning": 1, "critical": 2}
    worst = max([s_data[0], s_km[0]], key=lambda x: order[x])
    return worst, s_data[1], s_km[1]


def calcola_km_per_mese(mezzo_id, data):
    """Calcola km/mese medio dalle letture km_log + spese con km. None se < 2 letture."""
    letture = []
    for k in data["km_log"]:
        if k["mezzo_id"] == mezzo_id and k.get("data") and k.get("km"):
            try:
                letture.append((datetime.date.fromisoformat(k["data"]), int(k["km"])))
            except (TypeError, ValueError):
                pass
    for s in data["spese"]:
        if s["mezzo_id"] == mezzo_id and s.get("data") and s.get("km"):
            try:
                letture.append((datetime.date.fromisoformat(s["data"]), int(s["km"])))
            except (TypeError, ValueError):
                pass
    if len(letture) < 2:
        return None
    letture.sort()
    d_first, km_first = letture[0]
    d_last, km_last = letture[-1]
    days = (d_last - d_first).days
    if days < 1:
        return None
    km_diff = km_last - km_first
    if km_diff <= 0:
        return None
    return round(km_diff * 30.4375 / days, 1)  # 30.4375 = 365.25/12


def proietta_data(km_target, km_attuali, km_per_mese):
    """Data prevista in cui si raggiungeranno km_target dato km/mese."""
    if km_target is None or km_attuali is None or km_per_mese is None or km_per_mese <= 0:
        return None
    delta = km_target - km_attuali
    if delta <= 0:
        return datetime.date.today().isoformat()
    giorni = int(delta * 30.4375 / km_per_mese)
    return (datetime.date.today() + datetime.timedelta(days=giorni)).isoformat()


def aggiungi_mesi(d, mesi):
    """Aggiunge N mesi a una date, gestendo gli overflow di giorno."""
    y = d.year + (d.month - 1 + mesi) // 12
    m = (d.month - 1 + mesi) % 12 + 1
    import calendar as _cal
    last_day = _cal.monthrange(y, m)[1]
    return datetime.date(y, m, min(d.day, last_day))


# ── Routes base ───────────────────────────────────────────────────────────────
@app.route("/")
def root():
    return redirect("/mobile")


@app.route("/mobile")
def mobile():
    return render_template("mobile.html")


# ── API: dashboard ────────────────────────────────────────────────────────────
SCADENZE_CHIAVE = ["assicurazione", "revisione", "bollo"]


@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    data = load()
    out = []
    for m in data["mezzi"]:
        scadenze_mezzo = [
            s for s in data["scadenze"]
            if s["mezzo_id"] == m["id"] and not s.get("pagato")
        ]

        chiave = {}
        worst = "ok"
        order = {"ok": 0, "warning": 1, "critical": 2}
        for tipo in SCADENZE_CHIAVE:
            cand = [s for s in scadenze_mezzo if s.get("tipo") == tipo and s.get("data_scadenza")]
            cand.sort(key=lambda s: s["data_scadenza"])
            if cand:
                s = cand[0]
                stato, gg = stato_scadenza(s["data_scadenza"])
                chiave[tipo] = {"data": s["data_scadenza"], "stato": stato, "giorni": gg}
                if order[stato] > order[worst]:
                    worst = stato
            else:
                chiave[tipo] = None

        # Tagliando: prossimo a chilometraggio (se presente)
        tagliando_km = None
        for s in scadenze_mezzo:
            if s.get("tipo") == "tagliando" and s.get("km_scadenza"):
                stato, mancanti = stato_km(s["km_scadenza"], m.get("km_attuali", 0))
                if (tagliando_km is None) or (mancanti is not None and mancanti < tagliando_km["mancanti"]):
                    tagliando_km = {
                        "km_target": s["km_scadenza"],
                        "mancanti": mancanti,
                        "stato": stato,
                    }
                if order[stato] > order[worst]:
                    worst = stato

        oggi = datetime.date.today()
        anno_fa = (oggi - datetime.timedelta(days=365)).isoformat()
        tot_anno = sum(
            float(sp.get("importo", 0))
            for sp in data["spese"]
            if sp["mezzo_id"] == m["id"] and sp.get("data", "") >= anno_fa
        )
        out.append({
            "id": m["id"],
            "nome": m["nome"],
            "tipo": m["tipo"],
            "marca": m.get("marca", ""),
            "modello": m.get("modello", ""),
            "targa": m.get("targa", ""),
            "km_attuali": m.get("km_attuali", 0),
            "colore": m.get("colore", "#00d4ff"),
            "tagliando_intervallo_km": m.get("tagliando_intervallo_km"),
            "stato": worst,
            "scadenze_chiave": chiave,
            "tagliando_km": tagliando_km,
            "spese_anno": round(tot_anno, 2),
            "n_scadenze_aperte": len(scadenze_mezzo),
        })
    return jsonify(out)


# ── API: proiezione km/mese ──────────────────────────────────────────────────
@app.route("/api/proiezione/<mid>", methods=["GET"])
def api_proiezione(mid):
    data = load()
    m = next((x for x in data["mezzi"] if x["id"] == mid), None)
    if not m:
        return _err("mezzo non trovato", 404)
    km_per_mese = calcola_km_per_mese(mid, data)
    return jsonify({
        "km_per_mese": km_per_mese,
        "km_attuali": m.get("km_attuali", 0),
        "metodo": "storico" if km_per_mese else "manuale",
    })


# ── API: stats per mezzo (€/km, consumo) ──────────────────────────────────────
@app.route("/api/stats/<mid>", methods=["GET"])
def api_stats(mid):
    data = load()
    m = next((x for x in data["mezzi"] if x["id"] == mid), None)
    if not m:
        return _err("mezzo non trovato", 404)

    oggi = datetime.date.today()
    anno_fa = (oggi - datetime.timedelta(days=365)).isoformat()
    spese_anno = [s for s in data["spese"] if s["mezzo_id"] == mid and s.get("data", "") >= anno_fa]
    tot_spese = sum(float(s.get("importo") or 0) for s in spese_anno)
    tot_carburante = sum(float(s.get("importo") or 0) for s in spese_anno if s.get("categoria") == "carburante")
    tot_litri = sum(float(s.get("litri") or 0) for s in spese_anno if s.get("categoria") == "carburante")

    # Km percorsi negli ultimi 12 mesi: differenza tra max e min letture
    letture = [k for k in data["km_log"] if k["mezzo_id"] == mid and k.get("data", "") >= anno_fa]
    km_anno = None
    if letture:
        km_anno = max(k["km"] for k in letture) - min(k["km"] for k in letture)

    eur_km = (tot_spese / km_anno) if (km_anno and km_anno > 0) else None
    consumo_l_100km = (tot_litri * 100 / km_anno) if (km_anno and km_anno > 0 and tot_litri > 0) else None
    prezzo_medio_l = (tot_carburante / tot_litri) if (tot_litri > 0) else None

    return jsonify({
        "tot_spese_anno": round(tot_spese, 2),
        "tot_carburante_anno": round(tot_carburante, 2),
        "tot_litri_anno": round(tot_litri, 2),
        "km_percorsi_anno": km_anno,
        "eur_km": round(eur_km, 3) if eur_km is not None else None,
        "consumo_l_100km": round(consumo_l_100km, 1) if consumo_l_100km is not None else None,
        "prezzo_medio_l": round(prezzo_medio_l, 3) if prezzo_medio_l is not None else None,
    })


# ── API: mezzi ────────────────────────────────────────────────────────────────
@app.route("/api/mezzi", methods=["GET"])
def api_mezzi():
    return jsonify(load()["mezzi"])


@app.route("/api/mezzi", methods=["POST"])
def api_mezzi_create():
    body = request.get_json() or {}
    nome = (body.get("nome") or "").strip()
    if not nome:
        return _err("nome mezzo obbligatorio")
    tipo = body.get("tipo", "auto")
    if tipo not in ("auto", "scooter", "scooter_sport"):
        return _err("tipo non valido")
    data = load()
    new = {
        "id": body.get("id") or str(uuid.uuid4())[:8],
        "nome": nome,
        "tipo": tipo,
        "targa": (body.get("targa") or "").upper().strip(),
        "marca": (body.get("marca") or "").strip(),
        "modello": (body.get("modello") or "").strip(),
        "anno": body.get("anno"),
        "km_attuali": max(0, _safe_int(body.get("km_attuali"))),
        "colore": body.get("colore", "#00d4ff"),
        "tagliando_intervallo_km": _safe_int(body.get("tagliando_intervallo_km")) or None,
    }
    data["mezzi"].append(new)
    save(data)
    return jsonify(new), 201


@app.route("/api/mezzi/<mid>", methods=["PUT"])
def api_mezzi_update(mid):
    body = request.get_json() or {}
    data = load()
    m = next((x for x in data["mezzi"] if x["id"] == mid), None)
    if not m:
        return _err("not found", 404)
    for k in ("nome", "tipo", "targa", "marca", "modello", "anno", "km_attuali", "colore", "tagliando_intervallo_km"):
        if k in body:
            v = body[k]
            if k == "km_attuali":
                v = max(0, _safe_int(v))
            elif k == "targa":
                v = (v or "").upper().strip()
            elif k == "tagliando_intervallo_km":
                v = _safe_int(v) or None
            elif k == "tipo" and v not in ("auto", "scooter", "scooter_sport"):
                return _err("tipo non valido")
            m[k] = v
    save(data)
    return jsonify(m)


@app.route("/api/mezzi/<mid>", methods=["DELETE"])
def api_mezzi_delete(mid):
    data = load()
    if not any(x["id"] == mid for x in data["mezzi"]):
        return _err("not found", 404)
    data["mezzi"] = [x for x in data["mezzi"] if x["id"] != mid]
    data["scadenze"] = [x for x in data["scadenze"] if x["mezzo_id"] != mid]
    data["spese"] = [x for x in data["spese"] if x["mezzo_id"] != mid]
    data["km_log"] = [x for x in data["km_log"] if x["mezzo_id"] != mid]
    save(data)
    return jsonify({"ok": True})


# ── API: scadenze ─────────────────────────────────────────────────────────────
@app.route("/api/scadenze", methods=["GET"])
def api_scadenze():
    data = load()
    mezzi_by_id = {m["id"]: m for m in data["mezzi"]}
    mezzo_id = request.args.get("mezzo_id")
    items = data["scadenze"]
    if mezzo_id:
        items = [s for s in items if s["mezzo_id"] == mezzo_id]
    for s in items:
        m = mezzi_by_id.get(s["mezzo_id"])
        worst, gg, km_mancanti = stato_combinato(s, m or {})
        s["_stato"] = worst
        s["_giorni"] = gg
        s["_km_mancanti"] = km_mancanti
    items.sort(key=lambda s: (s.get("pagato", False), s.get("data_scadenza") or "9999"))
    return jsonify(items)


def _build_scadenza(body, data):
    """Costruisce un oggetto scadenza da un body, con validazione minima."""
    mezzo_id = body.get("mezzo_id")
    if not mezzo_id or not _mezzo_exists(mezzo_id):
        return None, "mezzo_id non valido"
    tipo = body.get("tipo", "altro")
    if tipo not in TIPI_SCADENZA:
        return None, "tipo non valido"

    mezzo = next((m for m in data["mezzi"] if m["id"] == mezzo_id), {})
    data_sc = body.get("data_scadenza") or None
    km_sc = _safe_int(body.get("km_scadenza")) or None
    data_ultimo = body.get("data_ultimo") or None
    km_ultimo = _safe_int(body.get("km_ultimo")) or None
    intervallo_km = _safe_int(body.get("intervallo_km")) or None
    intervallo_mesi = _safe_int(body.get("intervallo_mesi")) or None
    km_per_mese_stima = _safe_float(body.get("km_per_mese_stima")) or None

    # Logica tagliando: se ho km_ultimo + intervallo_km, derivo km_scadenza
    if tipo == "tagliando":
        if km_ultimo is not None and intervallo_km:
            km_sc = km_ultimo + intervallo_km
        # Se non ho data_scadenza ma ho km_per_mese, la proietto
        if not data_sc and km_sc is not None:
            kpm = km_per_mese_stima or calcola_km_per_mese(mezzo_id, data)
            data_sc = proietta_data(km_sc, mezzo.get("km_attuali", 0), kpm)

    if not data_sc and not km_sc:
        return None, "specificare almeno data o km di scadenza"

    costo = max(0.0, _safe_float(body.get("costo")))
    return {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": mezzo_id,
        "tipo": tipo,
        "data_scadenza": data_sc,
        "km_scadenza": km_sc,
        "intervallo_mesi": intervallo_mesi,
        "intervallo_km": intervallo_km,
        "data_ultimo": data_ultimo,
        "km_ultimo": km_ultimo,
        "km_per_mese_stima": km_per_mese_stima,
        "costo": costo,
        "note": (body.get("note") or "").strip(),
        "pagato": bool(body.get("pagato", False)),
    }, None


@app.route("/api/scadenze", methods=["POST"])
def api_scadenze_create():
    body = request.get_json() or {}
    data = load()
    new, err = _build_scadenza(body, data)
    if err:
        return _err(err)
    data["scadenze"].append(new)

    # Se viene creata già marcata "pagato" e ha un costo, genera anche la spesa
    spesa_creata = None
    if new.get("pagato") and float(new.get("costo") or 0) > 0:
        spesa_creata = _crea_spesa_da_scadenza(new, data)
        if spesa_creata:
            data["spese"].append(spesa_creata)

    save(data)
    out = dict(new)
    if spesa_creata:
        out["_spesa_creata"] = spesa_creata
    return jsonify(out), 201


@app.route("/api/scadenze/<sid>", methods=["PUT"])
def api_scadenze_update(sid):
    body = request.get_json() or {}
    data = load()
    s = next((x for x in data["scadenze"] if x["id"] == sid), None)
    if not s:
        return _err("not found", 404)

    pagato_prima = s.get("pagato", False)

    for k in ("mezzo_id", "tipo", "data_scadenza", "km_scadenza",
              "intervallo_mesi", "intervallo_km", "data_ultimo", "km_ultimo",
              "km_per_mese_stima", "costo", "note", "pagato"):
        if k in body:
            v = body[k]
            if k == "costo":
                v = max(0.0, _safe_float(v))
            elif k in ("km_scadenza", "intervallo_mesi", "intervallo_km", "km_ultimo"):
                v = _safe_int(v) or None
            elif k == "km_per_mese_stima":
                v = _safe_float(v) or None
            elif k == "tipo" and v not in TIPI_SCADENZA:
                return _err("tipo non valido")
            elif k == "mezzo_id" and not _mezzo_exists(v):
                return _err("mezzo_id non valido")
            elif k == "pagato":
                v = bool(v)
            s[k] = v

    # Se è un tagliando e ho km_ultimo+intervallo_km, ricalcolo km_scadenza
    if s.get("tipo") == "tagliando":
        if s.get("km_ultimo") is not None and s.get("intervallo_km"):
            s["km_scadenza"] = s["km_ultimo"] + s["intervallo_km"]
        # Se non ho data_scadenza esplicita, proietto da km/mese
        if not s.get("data_scadenza") and s.get("km_scadenza"):
            mezzo = next((m for m in data["mezzi"] if m["id"] == s["mezzo_id"]), {})
            kpm = s.get("km_per_mese_stima") or calcola_km_per_mese(s["mezzo_id"], data)
            s["data_scadenza"] = proietta_data(s["km_scadenza"], mezzo.get("km_attuali", 0), kpm)

    nuova_creata = None
    spesa_creata = None
    if not pagato_prima and s.get("pagato"):
        nuova_creata = _crea_rinnovo(s, data)
        if nuova_creata:
            data["scadenze"].append(nuova_creata)
        # Crea automaticamente la spesa associata al pagamento
        spesa_creata = _crea_spesa_da_scadenza(s, data)
        if spesa_creata:
            data["spese"].append(spesa_creata)

    save(data)
    out = dict(s)
    if nuova_creata: out["_rinnovo_creato"] = nuova_creata
    if spesa_creata: out["_spesa_creata"] = spesa_creata
    return jsonify(out)


def _data_evento_scadenza(s):
    """Ritorna la data ISO dell'evento per cui si sta creando la spesa.
    - Tagliando: data_ultimo (quando il tagliando e' stato fatto)
    - Altre scadenze a data: data_scadenza (data del pagamento previsto)
    - Fallback: oggi
    """
    tipo = s.get("tipo", "altro")
    if tipo == "tagliando" and s.get("data_ultimo"):
        return s["data_ultimo"]
    if s.get("data_scadenza"):
        return s["data_scadenza"]
    return datetime.date.today().isoformat()


def _crea_spesa_da_scadenza(s, data):
    """Quando una scadenza viene segnata pagato, crea una spesa con il costo
    e la data dell'evento (data_ultimo per tagliando, data_scadenza altrimenti)."""
    costo = float(s.get("costo") or 0)
    if costo <= 0:
        return None
    tipo = s.get("tipo", "altro")
    categoria = SCADENZA_TO_CATEGORIA.get(tipo, "altro")
    if categoria not in CATEGORIE_SPESA:
        categoria = "altro"
    mezzo = next((m for m in data["mezzi"] if m["id"] == s["mezzo_id"]), {})
    data_evento = _data_evento_scadenza(s)
    nota_data = ""
    if data_evento:
        try:
            nota_data = datetime.date.fromisoformat(data_evento).strftime("%d/%m/%Y")
        except (TypeError, ValueError):
            pass
    if not nota_data and s.get("km_scadenza"):
        nota_data = f"{int(s['km_scadenza'])} km"
    return {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": s["mezzo_id"],
        "data": data_evento,
        "categoria": categoria,
        "importo": costo,
        "km": (s.get("km_ultimo") if tipo == "tagliando" else mezzo.get("km_attuali")) or None,
        "litri": None,
        "note": f"Pagamento {tipo}" + (f" {nota_data}" if nota_data else ""),
    }


def _crea_rinnovo(s, data):
    """Quando una scadenza diventa 'pagato', genera la successiva con offset.
       Per il tagliando: il nuovo 'ultimo' diventa l'attuale km del mezzo,
       e proietta la prossima data dai km/mese medi."""
    tipo = s.get("tipo", "altro")
    mezzo = next((m for m in data["mezzi"] if m["id"] == s["mezzo_id"]), None)

    nuova_data = None
    nuovo_km = None
    nuovo_data_ultimo = None
    nuovo_km_ultimo = None

    if tipo == "tagliando" and mezzo:
        # Il tagliando appena pagato è "fatto a oggi" con i km attuali del mezzo
        nuovo_data_ultimo = datetime.date.today().isoformat()
        nuovo_km_ultimo = mezzo.get("km_attuali", 0)
        intervallo_km = s.get("intervallo_km") or mezzo.get("tagliando_intervallo_km")
        if intervallo_km:
            nuovo_km = nuovo_km_ultimo + int(intervallo_km)
            kpm = s.get("km_per_mese_stima") or calcola_km_per_mese(s["mezzo_id"], data)
            nuova_data = proietta_data(nuovo_km, nuovo_km_ultimo, kpm)
    else:
        # Scadenze a data: offset standard
        intervallo_mesi = s.get("intervallo_mesi") or DURATA_DEFAULT_MESI.get(tipo)
        if s.get("data_scadenza") and intervallo_mesi:
            try:
                base = datetime.date.fromisoformat(s["data_scadenza"])
                nuova_data = aggiungi_mesi(base, intervallo_mesi).isoformat()
            except (TypeError, ValueError):
                pass
        intervallo_km = s.get("intervallo_km")
        if s.get("km_scadenza") and intervallo_km:
            nuovo_km = int(s["km_scadenza"]) + int(intervallo_km)

    if not nuova_data and not nuovo_km:
        return None

    return {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": s["mezzo_id"],
        "tipo": tipo,
        "data_scadenza": nuova_data,
        "km_scadenza": nuovo_km,
        "intervallo_mesi": s.get("intervallo_mesi"),
        "intervallo_km": s.get("intervallo_km"),
        "data_ultimo": nuovo_data_ultimo,
        "km_ultimo": nuovo_km_ultimo,
        "km_per_mese_stima": s.get("km_per_mese_stima"),
        "costo": 0.0,
        "note": "",
        "pagato": False,
    }


@app.route("/api/scadenze/<sid>", methods=["DELETE"])
def api_scadenze_delete(sid):
    data = load()
    if not any(x["id"] == sid for x in data["scadenze"]):
        return _err("not found", 404)
    data["scadenze"] = [x for x in data["scadenze"] if x["id"] != sid]
    save(data)
    return jsonify({"ok": True})


# ── API: spese ────────────────────────────────────────────────────────────────
@app.route("/api/spese", methods=["GET"])
def api_spese():
    data = load()
    mezzo_id = request.args.get("mezzo_id")
    items = list(data["spese"])
    if mezzo_id:
        items = [s for s in items if s["mezzo_id"] == mezzo_id]
    items.sort(key=lambda s: s.get("data", ""), reverse=True)
    return jsonify(items)


@app.route("/api/spese", methods=["POST"])
def api_spese_create():
    body = request.get_json() or {}
    mezzo_id = body.get("mezzo_id")
    if not mezzo_id or not _mezzo_exists(mezzo_id):
        return _err("mezzo_id non valido")
    importo = _safe_float(body.get("importo"))
    if importo <= 0:
        return _err("importo deve essere > 0")
    categoria = body.get("categoria", "altro")
    if categoria not in CATEGORIE_SPESA:
        return _err("categoria non valida")
    data = load()
    new = {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": mezzo_id,
        "data": body.get("data") or datetime.date.today().isoformat(),
        "categoria": categoria,
        "importo": importo,
        "km": _safe_int(body.get("km")) or None,
        "litri": _safe_float(body.get("litri")) or None,
        "note": (body.get("note") or "").strip(),
    }
    data["spese"].append(new)
    save(data)
    return jsonify(new), 201


@app.route("/api/spese/<sid>", methods=["PUT"])
def api_spese_update(sid):
    body = request.get_json() or {}
    data = load()
    s = next((x for x in data["spese"] if x["id"] == sid), None)
    if not s:
        return _err("not found", 404)
    for k in ("mezzo_id", "data", "categoria", "importo", "km", "litri", "note"):
        if k in body:
            v = body[k]
            if k == "importo":
                v = _safe_float(v)
                if v <= 0:
                    return _err("importo deve essere > 0")
            elif k == "km":
                v = _safe_int(v) or None
            elif k == "litri":
                v = _safe_float(v) or None
            elif k == "categoria" and v not in CATEGORIE_SPESA:
                return _err("categoria non valida")
            elif k == "mezzo_id" and not _mezzo_exists(v):
                return _err("mezzo_id non valido")
            s[k] = v
    save(data)
    return jsonify(s)


@app.route("/api/spese/<sid>", methods=["DELETE"])
def api_spese_delete(sid):
    data = load()
    if not any(x["id"] == sid for x in data["spese"]):
        return _err("not found", 404)
    data["spese"] = [x for x in data["spese"] if x["id"] != sid]
    save(data)
    return jsonify({"ok": True})


# ── API: km ───────────────────────────────────────────────────────────────────
@app.route("/api/km", methods=["GET"])
def api_km():
    data = load()
    mezzo_id = request.args.get("mezzo_id")
    items = list(data["km_log"])
    if mezzo_id:
        items = [k for k in items if k["mezzo_id"] == mezzo_id]
    items.sort(key=lambda k: k.get("data", ""), reverse=True)
    return jsonify(items)


@app.route("/api/km", methods=["POST"])
def api_km_create():
    body = request.get_json() or {}
    mezzo_id = body.get("mezzo_id")
    if not mezzo_id or not _mezzo_exists(mezzo_id):
        return _err("mezzo_id non valido")
    km = _safe_int(body.get("km"))
    if km <= 0:
        return _err("km deve essere > 0")
    data = load()
    new = {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": mezzo_id,
        "data": body.get("data") or datetime.date.today().isoformat(),
        "km": km,
        "note": (body.get("note") or "").strip(),
    }
    data["km_log"].append(new)
    m = next((x for x in data["mezzi"] if x["id"] == mezzo_id), None)
    if m and km > (m.get("km_attuali") or 0):
        m["km_attuali"] = km
    save(data)
    return jsonify(new), 201


@app.route("/api/km/<kid>", methods=["PUT"])
def api_km_update(kid):
    body = request.get_json() or {}
    data = load()
    k = next((x for x in data["km_log"] if x["id"] == kid), None)
    if not k:
        return _err("not found", 404)
    if "data" in body:
        k["data"] = body["data"]
    if "km" in body:
        v = _safe_int(body["km"])
        if v <= 0:
            return _err("km deve essere > 0")
        k["km"] = v
    if "note" in body:
        k["note"] = (body["note"] or "").strip()
    # ricalcolo km_attuali del mezzo come max delle letture
    mezzo = next((m for m in data["mezzi"] if m["id"] == k["mezzo_id"]), None)
    if mezzo:
        readings = [x["km"] for x in data["km_log"] if x["mezzo_id"] == k["mezzo_id"] and x.get("km")]
        if readings:
            mezzo["km_attuali"] = max(readings)
    save(data)
    return jsonify(k)


@app.route("/api/km/<kid>", methods=["DELETE"])
def api_km_delete(kid):
    data = load()
    target = next((x for x in data["km_log"] if x["id"] == kid), None)
    if not target:
        return _err("not found", 404)
    data["km_log"] = [x for x in data["km_log"] if x["id"] != kid]
    # ricalcolo km_attuali del mezzo
    mezzo = next((m for m in data["mezzi"] if m["id"] == target["mezzo_id"]), None)
    if mezzo:
        readings = [x["km"] for x in data["km_log"] if x["mezzo_id"] == target["mezzo_id"] and x.get("km")]
        mezzo["km_attuali"] = max(readings) if readings else 0
    save(data)
    return jsonify({"ok": True})


# ── Maintenance: backfill spese da scadenze già pagate ───────────────────────
@app.route("/api/maintenance/backfill-spese", methods=["POST"])
def api_backfill_spese():
    """Per ogni scadenza con pagato=true e costo>0, verifica se esiste una
       spesa associata; se no, la crea. Se gia' esiste ma con dati sbagliati
       (data, km, nota), li corregge alla forma canonica (data evento)."""
    data = load()
    created = []
    fixed = []
    skipped = []
    for s in data["scadenze"]:
        if not s.get("pagato"):
            continue
        costo = float(s.get("costo") or 0)
        if costo <= 0:
            continue
        tipo = s.get("tipo", "altro")
        prefix = f"Pagamento {tipo}"
        match = next((sp for sp in data["spese"]
                      if sp["mezzo_id"] == s["mezzo_id"]
                      and abs(float(sp.get("importo") or 0) - costo) < 0.01
                      and (sp.get("note") or "").startswith(prefix)), None)

        canonical = _crea_spesa_da_scadenza(s, data)
        if not canonical:
            continue

        if match:
            # Verifica se la spesa esistente ha i dati canonici, altrimenti li corregge
            changes = {}
            for k in ("data", "km", "note", "categoria"):
                if match.get(k) != canonical.get(k):
                    changes[k] = {"old": match.get(k), "new": canonical.get(k)}
                    match[k] = canonical.get(k)
            if changes:
                fixed.append({"spesa_id": match["id"], "scadenza_id": s["id"], "changes": changes})
            else:
                skipped.append({"scadenza_id": s["id"], "spesa_id": match["id"]})
        else:
            data["spese"].append(canonical)
            created.append(canonical)

    if created or fixed:
        save(data)
    return jsonify({
        "created_count": len(created),
        "fixed_count": len(fixed),
        "skipped_count": len(skipped),
        "created": created,
        "fixed": fixed,
    })


# ── Meta ──────────────────────────────────────────────────────────────────────
@app.route("/api/meta", methods=["GET"])
def api_meta():
    return jsonify({
        "tipi_scadenza": TIPI_SCADENZA,
        "categorie_spesa": CATEGORIE_SPESA,
        "durata_default_mesi": DURATA_DEFAULT_MESI,
    })


# ── Deploy (git pull + restart via systemd) ───────────────────────────────────
_REPO_DIR = os.path.dirname(os.path.abspath(__file__))
_IS_PI = os.path.exists("/etc/systemd/system/mezziapp.service")
_GIT_BIN = shutil.which("git") or "/usr/bin/git"


def _git(*args, timeout=30):
    try:
        env = os.environ.copy()
        env["PATH"] = "/usr/bin:/bin:/usr/local/bin:" + env.get("PATH", "")
        r = subprocess.run(
            [_GIT_BIN, "-C", _REPO_DIR] + list(args),
            capture_output=True, text=True, timeout=timeout, env=env,
        )
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except Exception as e:
        return -1, "", str(e)


@app.route("/api/deploy/status", methods=["GET"])
def deploy_status():
    rc_l, local_hash, _ = _git("rev-parse", "HEAD")
    _, local_info, _ = _git("log", "-1", "--format=%h|%s|%cr", "HEAD")
    _git("fetch", "origin", "main", timeout=20)
    _, remote_hash, _ = _git("rev-parse", "origin/main")
    _, remote_info, _ = _git("log", "-1", "--format=%h|%s|%cr", "origin/main")
    _, behind_str, _ = _git("rev-list", "--count", "HEAD..origin/main")
    try:
        behind = int(behind_str or 0)
    except ValueError:
        behind = 0

    def _split(s):
        parts = (s or "").split("|", 2)
        while len(parts) < 3:
            parts.append("")
        return {"hash": parts[0], "subject": parts[1], "when": parts[2]}

    return jsonify({
        "platform": "pi" if _IS_PI else "local",
        "hostname": platform.node(),
        "local": _split(local_info) | {"full_hash": local_hash},
        "remote": _split(remote_info) | {"full_hash": remote_hash},
        "behind": behind,
        "up_to_date": bool(local_hash) and (local_hash == remote_hash),
        "git_ok": rc_l == 0,
    })


@app.route("/api/deploy", methods=["POST"])
def deploy_run():
    if not _IS_PI:
        return jsonify({
            "ok": False,
            "error": "Deploy disponibile solo sul Raspberry Pi (qui sei in locale).",
        }), 400
    rc, out, err = _git("pull", "origin", "main", timeout=90)
    log = (out + ("\n" + err if err else "")).strip()
    if rc != 0:
        return jsonify({"ok": False, "log": log, "error": "git pull fallito"}), 500

    _, new_hash, _ = _git("rev-parse", "HEAD")

    def _restart():
        time.sleep(1.5)
        os._exit(0)
    threading.Thread(target=_restart, daemon=True).start()

    return jsonify({
        "ok": True,
        "log": log,
        "new_hash": new_hash,
        "restarting": True,
    })


# ── Avvio ─────────────────────────────────────────────────────────────────────
def open_browser():
    try:
        webbrowser.open("http://127.0.0.1:5001/mobile")
    except Exception:
        pass


if __name__ == "__main__":
    threading.Timer(1.2, open_browser).start()
    app.run(host="0.0.0.0", port=5001, debug=False)
