import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import contextily as ctx
import requests
import polyline
from math import radians, sin, cos, sqrt, atan2
import json

API_KEY = "AIzaSyDGj-c8lTOasXtDHbZVnPmEidrAm1lh2YA"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # radius of Earth in meters
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def point_line_distance(p_lat, p_lon, a_lat, a_lon, b_lat, b_lon):
    # Approximation for small distances using equirectangular projection
    # Convert lat/lon to meters relative to A
    R = 6371000
    lat_rad = radians((a_lat + b_lat) / 2)
    
    px = (p_lon - a_lon) * radians(1) * R * cos(lat_rad)
    py = (p_lat - a_lat) * radians(1) * R
    
    bx = (b_lon - a_lon) * radians(1) * R * cos(lat_rad)
    by = (b_lat - a_lat) * radians(1) * R
    
    # Project P onto AB
    ab2 = bx**2 + by**2
    if ab2 == 0:
        return haversine(p_lat, p_lon, a_lat, a_lon)
        
    t = max(0, min(1, (px * bx + py * by) / ab2))
    
    proj_x = t * bx
    proj_y = t * by
    
    return sqrt((px - proj_x)**2 + (py - proj_y)**2)

def distance_to_polyline(lat, lon, polyline_pts):
    min_dist = float('inf')
    for i in range(len(polyline_pts) - 1):
        a_lat, a_lon = polyline_pts[i]
        b_lat, b_lon = polyline_pts[i+1]
        dist = point_line_distance(lat, lon, a_lat, a_lon, b_lat, b_lon)
        if dist < min_dist:
            min_dist = dist
    return min_dist

# 1. Cargar datos
print("Cargando datos...")
df = pd.read_csv("xgio_locations.csv")
df["timestamp"] = pd.to_datetime(df["timestamp"])

# Filtrar para hoy y los usuarios indicados
# Asumimos que 'Tere f' es mtfs si no aparece mtfs.
df_today = df[df["date"].str.startswith("2026-05-")].copy()
users_to_plot = ["Juve", "Tere f"]
df_plot = df_today[df_today["name"].isin(users_to_plot)].sort_values(["name", "timestamp"])

if df_plot.empty:
    print("No se encontraron datos para estos usuarios hoy. Se graficarán todos los disponibles hoy.")
    df_plot = df_today.sort_values(["name", "timestamp"])

# 2. Extraer origen y destino basado en el primer usuario
first_user = df_plot["name"].unique()[0]
user_data = df_plot[df_plot["name"] == first_user]
origin_lat, origin_lon = user_data.iloc[0]["latitude"], user_data.iloc[0]["longitude"]
dest_lat, dest_lon = user_data.iloc[-1]["latitude"], user_data.iloc[-1]["longitude"]

# 3. Consultar OSRM API (gratis, sin API key)
print("Consultando ruta ideal a OSRM (OpenStreetMap)...")
# OSRM espera lon,lat
url = f"http://router.project-osrm.org/route/v1/foot/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=polyline"
res = requests.get(url).json()

if res.get("code") != "Ok":
    print("Error consultando OSRM:", res)
    exit()

encoded_polyline = res["routes"][0]["geometry"]
# polyline.decode devuelve (lat, lon)
ideal_route = polyline.decode(encoded_polyline)

print(f"Ruta ideal obtenida con {len(ideal_route)} puntos (nodos).")

# 4. Calcular dispersión
print("Calculando dispersión...")
dispersion_results = []

for name, group in df_plot.groupby("name"):
    distances = []
    for _, row in group.iterrows():
        d = distance_to_polyline(row["latitude"], row["longitude"], ideal_route)
        distances.append(d)
        
    avg_d = np.mean(distances)
    max_d = np.max(distances)
    
    dispersion_results.append({
        "Usuario": name,
        "Puntos": len(group),
        "Dispersión Media (m)": round(avg_d, 2),
        "Dispersión Max (m)": round(max_d, 2)
    })

print("\n--- RESULTADOS DE DISPERSIÓN ---")
for r in dispersion_results:
    print(f"Usuario: {r['Usuario']} | Puntos: {r['Puntos']} | Media: {r['Dispersión Media (m)']}m | Max: {r['Dispersión Max (m)']}m")

# 5. Graficar con Contextily
print("\nGenerando mapa...")
fig, ax = plt.subplots(figsize=(10, 8))

# Extraer coords ruta ideal
ideal_lats = [pt[0] for pt in ideal_route]
ideal_lons = [pt[1] for pt in ideal_route]

# Plot ruta ideal
ax.plot(ideal_lons, ideal_lats, color='blue', linewidth=4, alpha=0.6, label='Ruta Ideal (OSRM)', zorder=2)
ax.scatter(ideal_lons, ideal_lats, color='blue', s=20, edgecolor='white', zorder=3)

# Plot usuarios
colors = {'Juve': 'red', 'Tere f': 'green'}
for name, group in df_plot.groupby("name"):
    c = colors.get(name, 'orange')
    ax.scatter(group["longitude"], group["latitude"], color=c, s=15, label=f'Ruta {name}', zorder=4)

# Agregar mapa base
try:
    ctx.add_basemap(ax, crs="EPSG:4326", source=ctx.providers.OpenStreetMap.Mapnik, alpha=0.7)
except Exception as e:
    print("No se pudo cargar el mapa base (contextily):", e)

ax.set_xlabel("Longitud")
ax.set_ylabel("Latitud")
ax.set_title("Análisis de Dispersión vs Ruta Ideal (OSRM)", fontsize=14, fontweight='bold')
ax.legend(loc='upper right')

# Añadir texto de resultados en la gráfica
text_str = "Dispersión (Error respecto a Ruta Ideal):\n"
for r in dispersion_results:
    text_str += f"{r['Usuario']}: Media {r['Dispersión Media (m)']}m | Max {r['Dispersión Max (m)']}m\n"

props = dict(boxstyle='round', facecolor='white', alpha=0.8)
ax.text(0.02, 0.02, text_str.strip(), transform=ax.transAxes, fontsize=10,
        verticalalignment='bottom', bbox=props)

output_file = "ruta_ideal_dispersion.png"
plt.savefig(output_file, dpi=200, bbox_inches='tight')
print(f"✅ Imagen generada exitosamente en: {output_file}")
