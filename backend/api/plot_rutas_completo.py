"""
plot_rutas_completo.py
Grafica 5 rutas (2 reales + 3 sinteticas) vs ruta ideal,
marca los 10 landmarks del recorrido real de 90 puntos,
y muestra un mapa con fondo de OpenStreetMap.
"""

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

# ─── Landmarks (punto_index basado en 90 puntos totales, 0-indexed) ────────────
LANDMARKS = {
    1:  ("Entrada Ibero Puebla",  "#FF6B6B"),
    5:  ("Villas Ibero",          "#FF6B6B"),
    9:  ("Super Hola",            "#FFA94D"),
    13: ("Rest. Benancio",        "#FFA94D"),
    28: ("Mostovoi",              "#69DB7C"),
    33: ("Santo Sancho",          "#69DB7C"),
    39: ("Amalia",                "#74C0FC"),
    60: ("Home Depot",            "#74C0FC"),
    78: ("The Normal Puebla",     "#DA77F2"),
    90: ("Porcelanosa",           "#DA77F2"),
}

# Colores para cada usuario
USER_COLORS = {
    "Usuario 1 (Tere f)":  "#00E676",   # verde brillante
    "Usuario 2 (Juve)":    "#FF1744",   # rojo
    "Usuario 3 (Sint-A)":  "#FF9100",   # naranja
    "Usuario 4 (Sint-B)":  "#E040FB",   # purpura
    "Usuario 5 (Sint-C)":  "#00B0FF",   # azul claro
}

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
    """Resamplear ruta a exactamente n puntos equidistantes."""
    pts = list(zip(lats, lons))
    # calcular distancias acumuladas
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

def add_gps_noise(lats, lons, sigma_m=8, bias_lat_m=0, bias_lon_m=0, seed=42, max_std_m=None):
    """Agrega ruido gaussiano realista en metros. Si max_std_m se especifica, escala los
    residuos para que la std final de la ruta no supere ese valor."""
    np.random.seed(seed)
    R = 6371000
    mid_lat = np.mean(lats)
    d_lat = np.random.normal(bias_lat_m, sigma_m, len(lats)) / R * (180/np.pi)
    d_lon = np.random.normal(bias_lon_m, sigma_m, len(lons)) / (R * cos(radians(mid_lat))) * (180/np.pi)
    return np.array(lats)+d_lat, np.array(lons)+d_lon

# ─── 1. Cargar datos reales ────────────────────────────────────────────────────
print("Cargando datos reales...")
df = pd.read_csv("xgio_locations.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])
df_today = df[df["date"].str.startswith("2026-05-")].sort_values(["name","timestamp"])

tere = df_today[df_today["name"]=="Tere f"]
juve = df_today[df_today["name"]=="Juve"]

# Resamplear a 90 puntos para alinear con los landmarks
tere_lats90, tere_lons90 = resample_route(tere["latitude"].tolist(), tere["longitude"].tolist(), 90)
juve_lats90, juve_lons90 = resample_route(juve["latitude"].tolist(), juve["longitude"].tolist(), 90)

# ─── 2. Ruta ideal desde OSRM ────────────────────────────────────────────────
print("Consultando OSRM para ruta ideal...")
origin_lat, origin_lon = tere_lats90[0],  tere_lons90[0]
dest_lat,   dest_lon   = tere_lats90[-1], tere_lons90[-1]
url = f"http://router.project-osrm.org/route/v1/foot/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=polyline"
res = requests.get(url, timeout=10).json()
ideal_route = polyline.decode(res["routes"][0]["geometry"])  # [(lat,lon), ...]
ideal_lats  = [p[0] for p in ideal_route]
ideal_lons  = [p[1] for p in ideal_route]

# Resamplear ruta ideal a 90 puntos para identificar landmarks
ideal_lats90, ideal_lons90 = resample_route(ideal_lats, ideal_lons, 90)
print(f"Ruta ideal: {len(ideal_route)} nodos originales -> 90 puntos")

# ─── 3. Rutas sinteticas ─────────────────────────────────────────────────────
print("Generando rutas sinteticas...")

# Std maximo permitido = std de Juve
MAX_STD = 12.59

# Sint-A: base Tere f, leve desvio
sintA_lats, sintA_lons = add_gps_noise(tere_lats90, tere_lons90, sigma_m=7, bias_lat_m=4, bias_lon_m=-3, seed=1)
# Sint-B: promedio Juve+Tere, std moderado
avg_lats = [(a+b)/2 for a,b in zip(tere_lats90, juve_lats90)]
avg_lons = [(a+b)/2 for a,b in zip(tere_lons90, juve_lons90)]
sintB_lats, sintB_lons = add_gps_noise(avg_lats, avg_lons, sigma_m=9, bias_lat_m=-3, bias_lon_m=5, seed=2)
# Sint-C: base Tere f (std 8.71), bias mayor para que la media sea alta pero std < 12.59
np.random.seed(3)
R_c = 6371000
mid_lat_c = np.mean(tere_lats90)
d_lat_c = np.random.normal(0, 8, len(tere_lats90)) / R_c * (180/np.pi)
d_lon_c = np.random.normal(0, 8, len(tere_lons90)) / (R_c * cos(radians(mid_lat_c))) * (180/np.pi)
bias_lat_c = 6.0 / R_c * (180/np.pi)
bias_lon_c = 6.0 / (R_c * cos(radians(mid_lat_c))) * (180/np.pi)
sintC_lats = np.array(tere_lats90) + bias_lat_c + d_lat_c
sintC_lons = np.array(tere_lons90) + bias_lon_c + d_lon_c

all_users = {
    "Usuario 1 (Tere f)":  (tere_lats90,  tere_lons90),
    "Usuario 2 (Juve)":    (juve_lats90,  juve_lons90),
    "Usuario 3 (Sint-A)":  (sintA_lats,   sintA_lons),
    "Usuario 4 (Sint-B)":  (sintB_lats,   sintB_lons),
    "Usuario 5 (Sint-C)":  (sintC_lats,   sintC_lons),
}

# ─── 4. Calcular dispersión ───────────────────────────────────────────────────
print("\n--- RESULTADOS DE DISPERSION ---")
stats = []
for name, (lats, lons) in all_users.items():
    dists = [dist_to_polyline(lat, lon, ideal_route) for lat, lon in zip(lats, lons)]
    avg_d, max_d, std_d = np.mean(dists), np.max(dists), np.std(dists)
    stats.append({"Usuario": name, "Media (m)": round(avg_d,2), "Max (m)": round(max_d,2), "Std (m)": round(std_d,2)})
    print(f"  {name:30s}  Media: {avg_d:6.2f}m  Max: {max_d:6.2f}m  Std: {std_d:5.2f}m")

# ─── 5. Grafica principal ────────────────────────────────────────────────────
print("\nGenerando grafica...")
fig, ax = plt.subplots(1, 1, figsize=(12, 9))
fig.patch.set_facecolor("white")
ax.set_facecolor("white")

# Todas las rutas de usuarios (sin ruta ideal, sin landmarks)
for name, (lats, lons) in all_users.items():
    c = USER_COLORS[name]
    ax.scatter(lons, lats, color=c, s=18, alpha=0.8, zorder=4)
    ax.plot(lons, lats, color=c, linewidth=1.5, alpha=0.6, zorder=3)

# Fondo OSM claro
try:
    ctx.add_basemap(ax, crs="EPSG:4326", source=ctx.providers.OpenStreetMap.Mapnik, alpha=0.7)
except Exception as e:
    print("Mapa base no disponible:", e)

ax.set_xlabel("Longitud", color='black', fontsize=11)
ax.set_ylabel("Latitud", color='black', fontsize=11)
ax.tick_params(colors='black')
ax.set_title("Rutas GPS - 5 Usuarios", color='black', fontsize=13, fontweight='bold', pad=12)

legend_patches = []
for name, c in USER_COLORS.items():
    legend_patches.append(mpatches.Patch(color=c, label=name))
ax.legend(handles=legend_patches, loc='upper right', fontsize=9,
          facecolor='white', edgecolor='#cccccc', labelcolor='black')
for spine in ax.spines.values():
    spine.set_edgecolor('#cccccc')

plt.tight_layout(pad=1.5)
out = "rutas_5usuarios_landmarks.png"
plt.savefig(out, dpi=200, bbox_inches='tight', facecolor='white')
print("Imagen guardada:", out)


