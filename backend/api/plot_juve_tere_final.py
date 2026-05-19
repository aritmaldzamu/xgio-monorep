
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import requests
import polyline
import contextily as ctx
from math import radians, sin, cos, sqrt, atan2
import warnings
warnings.filterwarnings("ignore")

# ─── Configuración de Estética ───────────────────────────────────────────────
plt.rcParams['font.family'] = 'sans-serif'
DARK_BLUE = "#1a2a6c"
IDEAL_COLOR = "#2980b9" # Azul para la ruta ideal

USER_COLORS = {
    "Tere f": "#00E676", # Verde vibrante
    "Juve":   "#FF1744", # Rojo vibrante
}

LANDMARKS = {
    1:  "Entrada Ibero Puebla",
    5:  "Villas Ibero",
    9:  "Super Hola",
    13: "Rest. Benancio",
    28: "Mostovoi",
    33: "Santo Sancho",
    39: "Amalia",
    60: "Home Depot",
    78: "The Normal Puebla",
    90: "Porcelanosa",
}

# ─── Funciones Geográficas ───────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat, dlon = radians(lat2-lat1), radians(lon2-lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def point_to_segment_dist(p_lat, p_lon, a_lat, a_lon, b_lat, b_lon):
    R = 6371000
    lat_rad = radians((a_lat+b_lat)/2)
    px = (p_lon-a_lon)*radians(1)*R*cos(lat_rad)
    py = (p_lat-a_lat)*radians(1)*R
    bx = (b_lon-a_lon)*radians(1)*R*cos(lat_rad)
    by = (b_lat-a_lat)*radians(1)*R
    ab2 = bx**2+by**2
    if ab2 == 0: return haversine(p_lat,p_lon,a_lat,a_lon)
    t = max(0, min(1, (px*bx+py*by)/ab2))
    return sqrt((px-t*bx)**2+(py-t*by)**2)

def dist_to_polyline(lat, lon, pts):
    return min(point_to_segment_dist(lat,lon,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1])
               for i in range(len(pts)-1))

def resample_route(lats, lons, n=90):
    pts = list(zip(lats, lons))
    dists = [0]
    for i in range(1, len(pts)):
        dists.append(dists[-1] + haversine(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]))
    total = dists[-1]
    targets = [total*i/(n-1) for i in range(n)]
    result = []
    j = 0
    for t in targets:
        while j < len(dists)-2 and dists[j+1] < t:
            j += 1
        seg_len = dists[j+1]-dists[j]
        if seg_len == 0:
            result.append(pts[j])
        else:
            frac = (t-dists[j])/seg_len
            lat = pts[j][0] + frac*(pts[j+1][0]-pts[j][0])
            lon = pts[j][1] + frac*(pts[j+1][1]-pts[j][1])
            result.append((lat, lon))
    return [r[0] for r in result], [r[1] for r in result]

# ─── 1. Procesar Datos ───────────────────────────────────────────────────────
print("Cargando y procesando datos...")
df = pd.read_csv("xgio_locations.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])
df_today = df[df["date"].str.startswith("2026-05-")].sort_values(["name","timestamp"])

users_data = {}
for name in ["Tere f", "Juve"]:
    user_df = df_today[df_today["name"] == name]
    if not user_df.empty:
        lats, lons = resample_route(user_df["latitude"].tolist(), user_df["longitude"].tolist(), 90)
        users_data[name] = (lats, lons)

# ─── 2. Ruta Ideal (OSRM) ─────────────────────────────────────────────────────
print("Obteniendo ruta ideal...")
# Usamos el inicio y fin de Tere f como referencia
ref_lats, ref_lons = users_data["Tere f"]
url = f"http://router.project-osrm.org/route/v1/foot/{ref_lons[0]},{ref_lats[0]};{ref_lons[-1]},{ref_lats[-1]}?overview=full&geometries=polyline"
res = requests.get(url, timeout=10).json()
ideal_route = polyline.decode(res["routes"][0]["geometry"])
ideal_lats90, ideal_lons90 = resample_route([p[0] for p in ideal_route], [p[1] for p in ideal_route], 90)

# ─── 3. Cálculos de Dispersión ────────────────────────────────────────────────
stats = []
for name, (lats, lons) in users_data.items():
    dists = [dist_to_polyline(lat, lon, ideal_route) for lat, lon in zip(lats, lons)]
    stats.append({
        "Usuario": name,
        "Media": f"{np.mean(dists):.2f}m",
        "Máxima": f"{np.max(dists):.2f}m",
        "Std": f"{np.std(dists):.2f}m"
    })

# ─── 4. Visualización Premium ─────────────────────────────────────────────────
print("Generando visualización...")
fig = plt.figure(figsize=(16, 10), facecolor='white')
gs = fig.add_gridspec(1, 2, width_ratios=[2.5, 1], wspace=0.1)

# A. MAPA
ax_map = fig.add_subplot(gs[0])
ax_map.set_facecolor("#f8f9fa")

# Dibujar Ruta Ideal
ax_map.plot(ideal_lons90, ideal_lats90, color=IDEAL_COLOR, linewidth=4, alpha=0.4, label="Ruta Ideal (OSRM)", zorder=1)

# Dibujar Usuarios
for name, (lats, lons) in users_data.items():
    color = USER_COLORS[name]
    ax_map.plot(lons, lats, color=color, linewidth=2.5, alpha=0.8, zorder=5, label=f"Ruta {name}")
    ax_map.scatter(lons, lats, color=color, s=25, alpha=0.6, edgecolors='white', linewidth=0.5, zorder=6)

# Fondo de mapa
try:
    ctx.add_basemap(ax_map, crs="EPSG:4326", source=ctx.providers.CartoDB.Positron, zoom=16)
except:
    pass

ax_map.set_title("Análisis de Trayectorias y Dispersión GPS", fontsize=16, fontweight='bold', color=DARK_BLUE, pad=20)
ax_map.set_xlabel("Longitud", fontsize=10, color="#666666")
ax_map.set_ylabel("Latitud", fontsize=10, color="#666666")
ax_map.grid(True, linestyle='--', alpha=0.3)

# B. TABLA Y LANDMARKS LIST
ax_side = fig.add_subplot(gs[1])
ax_side.axis('off')

# Tabla de Estadísticas
table_data = [["Usuario", "Media", "Máx", "Std"]] + [[s["Usuario"], s["Media"], s["Máxima"], s["Std"]] for s in stats]
table = ax_side.table(cellText=table_data, loc='top', cellLoc='center', colWidths=[0.3, 0.23, 0.23, 0.23])
table.auto_set_font_size(False)
table.set_fontsize(11)
table.scale(1.2, 2.5)

# Estilo de la tabla
for (row, col), cell in table.get_celld().items():
    if row == 0:
        cell.set_text_props(fontweight='bold', color='white')
        cell.set_facecolor(DARK_BLUE)
    else:
        cell.set_facecolor('#f2f2f2' if row % 2 == 0 else 'white')
    cell.set_edgecolor('#dddddd')

plt.tight_layout()
output_name = "rutas_juve_tere_landmarks.png"
plt.savefig(output_name, dpi=200, bbox_inches='tight')
print(f"Gráfica generada exitosamente: {output_name}")
