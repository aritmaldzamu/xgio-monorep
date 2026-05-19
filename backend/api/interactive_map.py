"""
interactive_map.py
Genera un HTML interactivo con Leaflet donde puedes:
  - Activar/desactivar cada usuario con un botón
  - Mostrar/ocultar los saltos GPS
  - Ver info de cada punto al hacer hover

Uso:
  python interactive_map.py
  Abre el archivo map_interactivo.html en tu navegador
"""

import pandas as pd
import json
from math import radians, sin, cos, sqrt, atan2

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
CSV_FILE         = "xgio_locations.csv"
VELOCIDAD_MAX_MS = 2.5         # ← umbral de salto GPS en m/s
OUTPUT_HTML      = "map_interactivo.html"
FECHA            = "2026-03-18" # ← filtra por fecha, o "" para todas las fechas
# ──────────────────────────────────────────────────────────────────────────────

COLORS = ["#3B82F6","#EF4444","#22C55E","#F59E0B","#A855F7",
          "#EC4899","#14B8A6","#F97316","#6366F1","#84CC16"]

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def clean_track(group, max_speed):
    group = group.sort_values("elapsed_min").reset_index(drop=True)
    keep, outliers = [True], []
    for i in range(1, len(group)):
        prev, curr = group.iloc[i-1], group.iloc[i]
        dist = haversine(prev["latitude"], prev["longitude"], curr["latitude"], curr["longitude"])
        dt   = (curr["elapsed_min"] - prev["elapsed_min"]) * 60
        speed = dist / dt if dt > 0 else 999
        if speed > max_speed:
            keep.append(False)
            outliers.append({"lat": curr["latitude"], "lng": curr["longitude"],
                             "min": round(curr["elapsed_min"], 2), "speed": round(speed, 1), "dist": round(dist, 1)})
        else:
            keep.append(True)
    return group[keep].copy(), outliers

# ─── Procesar datos ───────────────────────────────────────────────────────────
df = pd.read_csv(CSV_FILE)
df["timestamp"] = pd.to_datetime(df["timestamp"])
df = df.sort_values(["name", "date", "timestamp"])

if FECHA:
    df = df[df["date"] == FECHA]
    print(f"  Filtrando por fecha: {FECHA}")

user_data = {}
for i, (name, group) in enumerate(df.groupby("name")):
    if len(group) < 2:
        print(f"  {name}: sin suficientes puntos, omitido")
        continue
    t_start = group["timestamp"].iloc[0]
    group = group.copy()
    group["elapsed_min"] = (group["timestamp"] - t_start).dt.total_seconds() / 60
    clean, outliers = clean_track(group, VELOCIDAD_MAX_MS)

    pts = clean[["latitude","longitude","elapsed_min"]].values
    dist = sum(haversine(pts[j-1][0], pts[j-1][1], pts[j][0], pts[j][1]) for j in range(1, len(pts)))

    user_data[name] = {
        "color":    COLORS[i % len(COLORS)],
        "points":   [{"lat": r["latitude"], "lng": r["longitude"],
                      "min": round(r["elapsed_min"], 2)} for _, r in clean.iterrows()],
        "outliers": outliers,
        "total_pts": len(group),
        "clean_pts": len(clean),
        "jumps":     len(outliers),
        "dist_m":    round(dist, 1),
    }
    print(f"  {name}: {len(group)} pts → {len(clean)} limpios, {len(outliers)} saltos, {dist:.0f}m")

json_data = json.dumps(user_data, ensure_ascii=False)
fecha_label = FECHA if FECHA else "Todas las fechas"

# ─── Generar HTML ─────────────────────────────────────────────────────────────
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>XGIO — Polilíneas GPS</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0f172a; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; }}
  #header {{ padding: 12px 20px; background: #1e293b; border-bottom: 1px solid #334155;
             display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }}
  #header h1 {{ font-size: 16px; font-weight: 700; color: #f1f5f9; letter-spacing: 2px; }}
  #header span {{ font-size: 11px; color: #64748b; margin-left: 8px; }}
  #controls {{ display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }}
  .user-btn {{ padding: 6px 14px; border-radius: 20px; border: 2px solid; font-size: 12px;
               font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; }}
  .user-btn.active {{ color: white !important; }}
  .user-btn:hover {{ opacity: 0.8; transform: scale(1.03); }}
  #toggle-jumps {{ padding: 6px 14px; border-radius: 20px; border: 2px solid #f59e0b;
                   color: #f59e0b; font-size: 12px; font-weight: 600; cursor: pointer;
                   background: transparent; transition: all 0.2s; }}
  #toggle-jumps.active {{ background: #f59e0b; color: #0f172a; }}
  #toggle-jumps:hover {{ opacity: 0.8; }}
  #map {{ flex: 1; }}
  #stats {{ position: absolute; bottom: 20px; right: 10px; z-index: 1000; background: #1e293bdd;
            border: 1px solid #334155; border-radius: 12px; padding: 12px 16px; min-width: 220px;
            backdrop-filter: blur(6px); }}
  #stats h3 {{ font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }}
  .stat-row {{ display: flex; justify-content: space-between; font-size: 12px;
               padding: 3px 0; border-bottom: 1px solid #1e293b; }}
  .stat-name {{ font-weight: 600; }}
  .stat-val  {{ color: #94a3b8; }}
  .dot {{ width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }}
</style>
</head>
<body>

<div id="header">
  <div>
    <h1>⬡ XGIO GPS <span>{fecha_label}</span></h1>
  </div>
  <div id="controls">
    <button id="toggle-jumps" class="active" onclick="toggleJumps()">⚡ Saltos GPS</button>
    <button onclick="toggleAll(true)"  style="padding:6px 10px;border-radius:20px;border:1px solid #475569;
      color:#94a3b8;font-size:11px;cursor:pointer;background:transparent;">Todos</button>
    <button onclick="toggleAll(false)" style="padding:6px 10px;border-radius:20px;border:1px solid #475569;
      color:#94a3b8;font-size:11px;cursor:pointer;background:transparent;">Ninguno</button>
  </div>
</div>

<div style="position:relative;flex:1;display:flex;">
  <div id="map"></div>
  <div id="stats">
    <h3>Resumen</h3>
    <div id="stats-body"></div>
  </div>
</div>

<script>
const RAW = {json_data};

const map = L.map('map', {{ zoomControl: true }});
L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
  attribution: '© CartoDB', maxZoom: 20
}}).addTo(map);

const layers = {{}};
let showJumps = true;
const allBounds = [];

Object.entries(RAW).forEach(([name, data]) => {{
  const latlngs = data.points.map(p => [p.lat, p.lng]);
  allBounds.push(...latlngs);

  const line = L.polyline(latlngs, {{
    color: data.color, weight: 3.5, opacity: 0.85,
  }}).addTo(map);

  line.bindTooltip(`<b>${{name}}</b><br>${{data.clean_pts}} pts · ${{data.dist_m}}m`, {{sticky: true}});

  const startIcon = L.divIcon({{
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${{data.color}};
                border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
    iconSize:[12,12], iconAnchor:[6,6], className:''
  }});
  const startM = L.marker(latlngs[0], {{icon: startIcon}})
    .addTo(map).bindPopup(`<b>${{name}}</b><br>🟢 Inicio`);

  const endIcon = L.divIcon({{
    html: `<div style="width:12px;height:12px;background:${{data.color}};
                border:2px solid white;transform:rotate(45deg);box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
    iconSize:[12,12], iconAnchor:[6,6], className:''
  }});
  const endM = L.marker(latlngs[latlngs.length-1], {{icon: endIcon}})
    .addTo(map).bindPopup(`<b>${{name}}</b><br>🔴 Fin`);

  const jumpMarkers = data.outliers.map(o => {{
    const jIcon = L.divIcon({{
      html: `<div style="width:16px;height:16px;border:2.5px solid ${{data.color}};
                  border-radius:50%;background:rgba(0,0,0,0.6);display:flex;
                  align-items:center;justify-content:center;font-size:9px">✕</div>`,
      iconSize:[16,16], iconAnchor:[8,8], className:''
    }});
    return L.marker([o.lat, o.lng], {{icon: jIcon}})
      .addTo(map)
      .bindPopup(`<b>${{name}}</b><br>⚡ Salto GPS<br>Vel: ${{o.speed}} m/s<br>Dist: ${{o.dist}}m<br>Min: ${{o.min}}`);
  }});

  layers[name] = {{ line, startM, endM, jumpMarkers, active: true, color: data.color,
                    clean_pts: data.clean_pts, jumps: data.jumps, dist_m: data.dist_m }};
}});

if (allBounds.length) map.fitBounds(allBounds, {{padding: [30,30]}});

const ctrl = document.getElementById('controls');
const statsBody = document.getElementById('stats-body');

Object.entries(layers).forEach(([name, layer]) => {{
  const btn = document.createElement('button');
  btn.className = 'user-btn active';
  btn.textContent = name;
  btn.style.borderColor = layer.color;
  btn.style.background  = layer.color;
  btn.dataset.name = name;
  btn.onclick = () => toggleUser(name, btn);
  ctrl.appendChild(btn);

  const row = document.createElement('div');
  row.className = 'stat-row';
  row.id = 'stat-' + name;
  row.innerHTML = `<span class="stat-name"><span class="dot" style="background:${{layer.color}}"></span>${{name}}</span>
    <span class="stat-val">${{layer.clean_pts}}pts · ${{layer.dist_m}}m · ${{layer.jumps}}⚡</span>`;
  statsBody.appendChild(row);
}});

function toggleUser(name, btn) {{
  const layer = layers[name];
  layer.active = !layer.active;
  const action = layer.active ? 'addTo' : 'remove';
  layer.line[action](map);
  layer.startM[action](map);
  layer.endM[action](map);
  if (showJumps) layer.jumpMarkers.forEach(m => m[action](map));
  btn.style.background = layer.active ? layer.color : 'transparent';
  btn.style.color      = layer.active ? 'white'     : layer.color;
  document.getElementById('stat-' + name).style.opacity = layer.active ? '1' : '0.35';
}}

function toggleJumps() {{
  showJumps = !showJumps;
  const btn = document.getElementById('toggle-jumps');
  btn.classList.toggle('active', showJumps);
  Object.values(layers).forEach(layer => {{
    if (layer.active) {{
      layer.jumpMarkers.forEach(m => showJumps ? m.addTo(map) : m.remove());
    }}
  }});
}}

function toggleAll(state) {{
  document.querySelectorAll('.user-btn').forEach(btn => {{
    const name  = btn.dataset.name;
    const layer = layers[name];
    if (layer.active !== state) toggleUser(name, btn);
  }});
}}
</script>
</body>
</html>"""

with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
    f.write(html)

print(f"\n✅ Listo: {OUTPUT_HTML}")
print(f"   Abre ese archivo en tu navegador")
