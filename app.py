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
            "tipo": "scooter_sport",   # scooter_sport | scooter | auto
            "targa": "",
            "marca": "Voge",
            "modello": "SR3",
            "anno": None,
            "km_attuali": 0,
            "colore": "#00d4ff",
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
        },
    ],
    "scadenze": [],   # { id, mezzo_id, tipo, data_scadenza, costo, note, pagato }
    "spese": [],      # { id, mezzo_id, data, categoria, importo, km, note }
    "km_log": [],     # { id, mezzo_id, data, km, note }
}

TIPI_SCADENZA = ["bollo", "assicurazione", "revisione", "tagliando", "altro"]
CATEGORIE_SPESA = [
    "carburante", "manutenzione", "parcheggio",
    "pedaggio", "multa", "accessori", "altro",
]


# ── Data helpers ──────────────────────────────────────────────────────────────
_cache = None
_cache_mtime = None


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
    _cache = data
    _cache_mtime = file_mtime
    return data


def save(data):
    global _cache, _cache_mtime
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    _cache = data
    _cache_mtime = os.path.getmtime(DB_FILE)


def find_mezzo(mid):
    return next((m for m in load()["mezzi"] if m["id"] == mid), None)


def stato_scadenza(data_scadenza_str):
    """Ritorna ('ok'|'warning'|'critical', giorni_rimanenti)."""
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


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def root():
    return redirect("/mobile")


@app.route("/mobile")
def mobile():
    return render_template("mobile.html")


# ── API: dashboard ────────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    """Aggrega lo stato di ogni mezzo per le flash card."""
    data = load()
    out = []
    for m in data["mezzi"]:
        scadenze_mezzo = [
            s for s in data["scadenze"]
            if s["mezzo_id"] == m["id"] and not s.get("pagato")
        ]
        # peggior stato
        worst = "ok"
        prossima = None
        for s in scadenze_mezzo:
            stato, gg = stato_scadenza(s.get("data_scadenza"))
            if stato == "critical":
                worst = "critical"
            elif stato == "warning" and worst != "critical":
                worst = "warning"
            if gg is not None and (prossima is None or gg < prossima["giorni"]):
                prossima = {
                    "tipo": s["tipo"],
                    "data": s["data_scadenza"],
                    "giorni": gg,
                }
        # spese totali ultimo anno
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
            "stato": worst,
            "prossima_scadenza": prossima,
            "spese_anno": round(tot_anno, 2),
            "n_scadenze_aperte": len(scadenze_mezzo),
        })
    return jsonify(out)


# ── API: mezzi ────────────────────────────────────────────────────────────────
@app.route("/api/mezzi", methods=["GET"])
def api_mezzi():
    return jsonify(load()["mezzi"])


@app.route("/api/mezzi", methods=["POST"])
def api_mezzi_create():
    body = request.get_json() or {}
    data = load()
    new = {
        "id": body.get("id") or str(uuid.uuid4())[:8],
        "nome": body.get("nome", "Nuovo mezzo"),
        "tipo": body.get("tipo", "auto"),
        "targa": body.get("targa", ""),
        "marca": body.get("marca", ""),
        "modello": body.get("modello", ""),
        "anno": body.get("anno"),
        "km_attuali": int(body.get("km_attuali") or 0),
        "colore": body.get("colore", "#00d4ff"),
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
        return jsonify({"error": "not found"}), 404
    for k in ("nome", "tipo", "targa", "marca", "modello", "anno", "km_attuali", "colore"):
        if k in body:
            m[k] = body[k]
    save(data)
    return jsonify(m)


@app.route("/api/mezzi/<mid>", methods=["DELETE"])
def api_mezzi_delete(mid):
    data = load()
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
    mezzo_id = request.args.get("mezzo_id")
    items = data["scadenze"]
    if mezzo_id:
        items = [s for s in items if s["mezzo_id"] == mezzo_id]
    # arricchisci con stato calcolato
    for s in items:
        stato, gg = stato_scadenza(s.get("data_scadenza"))
        s["_stato"] = stato
        s["_giorni"] = gg
    items.sort(key=lambda s: (s.get("pagato", False), s.get("data_scadenza") or "9999"))
    return jsonify(items)


@app.route("/api/scadenze", methods=["POST"])
def api_scadenze_create():
    body = request.get_json() or {}
    data = load()
    new = {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": body["mezzo_id"],
        "tipo": body.get("tipo", "altro"),
        "data_scadenza": body.get("data_scadenza"),
        "costo": float(body.get("costo") or 0),
        "note": body.get("note", ""),
        "pagato": bool(body.get("pagato", False)),
    }
    data["scadenze"].append(new)
    save(data)
    return jsonify(new), 201


@app.route("/api/scadenze/<sid>", methods=["PUT"])
def api_scadenze_update(sid):
    body = request.get_json() or {}
    data = load()
    s = next((x for x in data["scadenze"] if x["id"] == sid), None)
    if not s:
        return jsonify({"error": "not found"}), 404
    for k in ("mezzo_id", "tipo", "data_scadenza", "costo", "note", "pagato"):
        if k in body:
            s[k] = body[k]
    save(data)
    return jsonify(s)


@app.route("/api/scadenze/<sid>", methods=["DELETE"])
def api_scadenze_delete(sid):
    data = load()
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
    data = load()
    new = {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": body["mezzo_id"],
        "data": body.get("data") or datetime.date.today().isoformat(),
        "categoria": body.get("categoria", "altro"),
        "importo": float(body.get("importo") or 0),
        "km": int(body.get("km") or 0) or None,
        "note": body.get("note", ""),
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
        return jsonify({"error": "not found"}), 404
    for k in ("mezzo_id", "data", "categoria", "importo", "km", "note"):
        if k in body:
            s[k] = body[k]
    save(data)
    return jsonify(s)


@app.route("/api/spese/<sid>", methods=["DELETE"])
def api_spese_delete(sid):
    data = load()
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
    data = load()
    new = {
        "id": str(uuid.uuid4())[:8],
        "mezzo_id": body["mezzo_id"],
        "data": body.get("data") or datetime.date.today().isoformat(),
        "km": int(body.get("km") or 0),
        "note": body.get("note", ""),
    }
    data["km_log"].append(new)
    # aggiorna km_attuali del mezzo se più alto
    m = next((x for x in data["mezzi"] if x["id"] == new["mezzo_id"]), None)
    if m and new["km"] > (m.get("km_attuali") or 0):
        m["km_attuali"] = new["km"]
    save(data)
    return jsonify(new), 201


@app.route("/api/km/<kid>", methods=["DELETE"])
def api_km_delete(kid):
    data = load()
    data["km_log"] = [x for x in data["km_log"] if x["id"] != kid]
    save(data)
    return jsonify({"ok": True})


# ── Meta ──────────────────────────────────────────────────────────────────────
@app.route("/api/meta", methods=["GET"])
def api_meta():
    return jsonify({
        "tipi_scadenza": TIPI_SCADENZA,
        "categorie_spesa": CATEGORIE_SPESA,
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
