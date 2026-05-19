"""
compare_polylines.py
Superpone las polilíneas de todos los usuarios y permite filtrar por rango de tiempo.

Uso:
  python compare_polylines.py
  Cambia MINUTO_INICIO y MINUTO_FIN para el rango que quieres analizar.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import matplotlib.patches as mpatches
from math import radians, sin, cos, sqrt, atan2

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
CSV_FILE     = "xgio_locations.csv"
MINUTO_INICIO = 0     # ← desde qué minuto
MINUTO_FIN    = 5     # ← hasta qué minuto  (cambia a 10, 15, etc.)
# ──────────────────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def total_distance(group):
    pts = group[["latitude","longitude"]].values
    d = 0
    for i in range(1, len(pts)):
        d += haversine(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1])
    return d

# ─── Cargar y preparar datos ──────────────────────────────────────────────────
df = pd.read_csv(CSV_FILE)
df["timestamp"] = pd.to_datetime(df["timestamp"])
df = df.sort_values(["name", "date", "timestamp"])
df = df[df["name"].str.lower() != "papu"]

# Calcular tiempo relativo por usuario desde su primer punto
segments = []
for name, group in df.groupby("name"):
    t_start = group["timestamp"].iloc[0]
    group = group.copy()
    group["elapsed_min"] = (group["timestamp"] - t_start).dt.total_seconds() / 60
    group["user"] = name
    segments.append(group)

data = pd.concat(segments, ignore_index=True)

# Filtrar por rango
filtered = data[
    (data["elapsed_min"] >= MINUTO_INICIO) &
    (data["elapsed_min"] <= MINUTO_FIN)
].copy()

usuarios  = filtered["user"].unique()
n_users   = len(usuarios)
colors    = cm.tab10(np.linspace(0, 1, n_users))
color_map = dict(zip(usuarios, colors))

print(f"\n{'='*60}")
print(f"  Rango: minuto {MINUTO_INICIO} → minuto {MINUTO_FIN}")
print(f"  Usuarios con datos en ese rango: {n_users}")
print(f"{'='*60}")

# ─── Stats por usuario en el rango ───────────────────────────────────────────
stats = []
for name, group in filtered.groupby("user"):
    dist = total_distance(group)
    duration = group["elapsed_min"].max() - group["elapsed_min"].min()
    speed = (dist / (duration * 60)) if duration > 0 else 0
    stats.append({
        "usuario": name,
        "puntos":  len(group),
        "distancia_m": dist,
        "velocidad_m_s": speed,
    })
    print(f"  {name:<15} {len(group):>5} pts  |  {dist:>7.1f}m  |  {speed:.2f} m/s")

stats_df = pd.DataFrame(stats)

# ─── FIGURA ───────────────────────────────────────────────────────────────────
fig = plt.figure(figsize=(18, 8))
fig.suptitle(f"Comparación de polilíneas — Minuto {MINUTO_INICIO} al {MINUTO_FIN}",
             fontsize=14, fontweight="bold")

# ── Panel izquierdo: polilíneas superpuestas ──────────────────────────────────
ax1 = fig.add_subplot(1, 3, (1, 2))

for name, group in filtered.groupby("user"):
    color = color_map[name]
    group = group.sort_values("elapsed_min")
    lons  = group["longitude"].values
    lats  = group["latitude"].values

    # Línea principal
    ax1.plot(lons, lats, color=color, linewidth=2, alpha=0.75, label=name)

    # Marcador de inicio
    ax1.scatter(lons[0], lats[0], color=color, s=80,
                marker="o", edgecolors="white", linewidths=1.2, zorder=6)
    # Marcador de fin
    ax1.scatter(lons[-1], lats[-1], color=color, s=80,
                marker="s", edgecolors="white", linewidths=1.2, zorder=6)

    # Flechas de dirección cada ~10 puntos
    step = max(1, len(lons) // 8)
    for i in range(0, len(lons)-1, step):
        ax1.annotate("", xy=(lons[i+1], lats[i+1]), xytext=(lons[i], lats[i]),
            arrowprops=dict(arrowstyle="->", color=color, lw=1.2, alpha=0.6))

# Leyenda con inicio/fin
legend_patches = [mpatches.Patch(color=color_map[u], label=u) for u in usuarios]
start_marker = plt.Line2D([0],[0], marker="o", color="gray", linestyle="None",
                           markersize=7, label="Inicio", markeredgecolor="white")
end_marker   = plt.Line2D([0],[0], marker="s", color="gray", linestyle="None",
                           markersize=7, label="Fin", markeredgecolor="white")
ax1.legend(handles=legend_patches + [start_marker, end_marker],
           fontsize=8, loc="best", framealpha=0.8)

ax1.set_title(f"Polilíneas superpuestas (min {MINUTO_INICIO}–{MINUTO_FIN})")
ax1.set_xlabel("Longitud")
ax1.set_ylabel("Latitud")
ax1.grid(True, alpha=0.25)
ax1.set_aspect("equal", adjustable="datalim")

# ── Panel derecho: distancia recorrida por usuario ────────────────────────────
ax2 = fig.add_subplot(1, 3, 3)
x = np.arange(len(stats_df))
bar_colors = [color_map[u] for u in stats_df["usuario"]]
bars = ax2.bar(x, stats_df["distancia_m"], color=bar_colors,
               alpha=0.85, edgecolor="black", linewidth=0.5)

for bar, val in zip(bars, stats_df["distancia_m"]):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
             f"{val:.0f}m", ha="center", va="bottom", fontsize=8, fontweight="bold")

ax2.set_xticks(x)
ax2.set_xticklabels(stats_df["usuario"], rotation=25, ha="right", fontsize=8)
ax2.set_ylabel("Distancia recorrida (metros)")
ax2.set_title("Distancia por usuario\nen el rango seleccionado")
ax2.grid(True, axis="y", alpha=0.3)

plt.tight_layout()
output = f"polylines_{MINUTO_INICIO}a{MINUTO_FIN}min.png"
plt.savefig(output, dpi=150, bbox_inches="tight")
print(f"\n✅ Gráfica guardada: {output}")
