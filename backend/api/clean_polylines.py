"""
clean_polylines.py
Limpia saltos GPS imposibles y grafica las polilíneas reales de cada usuario
superpuestas en una sola gráfica, marcando dónde ocurrieron los saltos.

Uso:
  python clean_polylines.py
  Ajusta VELOCIDAD_MAX_MS para cambiar el umbral de filtrado.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import matplotlib.patches as mpatches
from math import radians, sin, cos, sqrt, atan2

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
CSV_FILE          = "xgio_locations.csv"
VELOCIDAD_MAX_MS  = 2.5   # ← velocidad máxima caminando en m/s (~9 km/h)
                           #   baja a 1.8 para más estricto, sube a 4.0 para menos
MINUTO_INICIO     = 0     # ← rango de tiempo a analizar
MINUTO_FIN        = 999   # ← 999 = todo el recorrido
# ──────────────────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

def clean_track(group, max_speed):
    """
    Elimina puntos donde la velocidad respecto al punto anterior
    supera max_speed m/s. Devuelve (clean_df, outliers_df).
    """
    group = group.sort_values("elapsed_min").reset_index(drop=True)
    keep     = [True]
    outliers = []

    for i in range(1, len(group)):
        prev = group.iloc[i-1]
        curr = group.iloc[i]
        dist = haversine(prev["latitude"], prev["longitude"],
                         curr["latitude"], curr["longitude"])
        dt   = (curr["elapsed_min"] - prev["elapsed_min"]) * 60  # segundos
        speed = dist / dt if dt > 0 else 999

        if speed > max_speed:
            keep.append(False)
            outliers.append({
                "latitude":   curr["latitude"],
                "longitude":  curr["longitude"],
                "elapsed_min": curr["elapsed_min"],
                "speed_ms":   speed,
                "dist_m":     dist,
            })
        else:
            keep.append(True)

    clean = group[keep].copy()
    out_df = pd.DataFrame(outliers)
    return clean, out_df

# ─── Cargar datos ─────────────────────────────────────────────────────────────
df = pd.read_csv(CSV_FILE)
df["timestamp"] = pd.to_datetime(df["timestamp"])
df = df.sort_values(["name", "date", "timestamp"])
df = df[df["name"].str.lower() != "papu"]

# Tiempo relativo por usuario
segments = []
for name, group in df.groupby("name"):
    t_start = group["timestamp"].iloc[0]
    group = group.copy()
    group["elapsed_min"] = (group["timestamp"] - t_start).dt.total_seconds() / 60
    group["user"] = name
    segments.append(group)

data = pd.concat(segments, ignore_index=True)
data = data[(data["elapsed_min"] >= MINUTO_INICIO) & (data["elapsed_min"] <= MINUTO_FIN)]

usuarios  = sorted(data["user"].unique())
n_users   = len(usuarios)
colors    = cm.tab10(np.linspace(0, 1, n_users))
color_map = dict(zip(usuarios, colors))

# ─── Limpiar cada usuario ─────────────────────────────────────────────────────
print(f"\n{'='*65}")
print(f"  Filtro de velocidad máxima: {VELOCIDAD_MAX_MS} m/s  ({VELOCIDAD_MAX_MS*3.6:.1f} km/h)")
print(f"{'='*65}")
print(f"  {'Usuario':<15} {'Original':>9} {'Limpios':>9} {'Saltos':>7} {'Distancia':>12}")
print(f"{'─'*65}")

clean_data  = {}
outlier_data = {}

for name in usuarios:
    group  = data[data["user"] == name].copy()
    clean, outs = clean_track(group, VELOCIDAD_MAX_MS)

    # Distancia total limpia
    pts  = clean[["latitude","longitude"]].values
    dist = sum(haversine(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1])
               for i in range(1, len(pts)))

    clean_data[name]   = clean
    outlier_data[name] = outs

    print(f"  {name:<15} {len(group):>9} {len(clean):>9} {len(outs):>7} {dist:>10.0f}m")

print(f"{'='*65}")

# ─── GRÁFICA ─────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(13, 9))
fig.suptitle(
    f"Polilíneas reales — filtro {VELOCIDAD_MAX_MS} m/s ({VELOCIDAD_MAX_MS*3.6:.1f} km/h)\n"
    f"Rango: min {MINUTO_INICIO}–{'completo' if MINUTO_FIN==999 else MINUTO_FIN}",
    fontsize=13, fontweight="bold"
)

for name in usuarios:
    color = color_map[name]
    clean = clean_data[name].sort_values("elapsed_min")
    outs  = outlier_data[name]

    lons = clean["longitude"].values
    lats = clean["latitude"].values

    # Polilínea limpia
    ax.plot(lons, lats, color=color, linewidth=2.2, alpha=0.8, label=name, zorder=3)

    # Inicio y fin
    ax.scatter(lons[0],  lats[0],  color=color, s=90, marker="o",
               edgecolors="white", linewidths=1.5, zorder=6)
    ax.scatter(lons[-1], lats[-1], color=color, s=90, marker="s",
               edgecolors="white", linewidths=1.5, zorder=6)

    # Flechas de dirección
    step = max(1, len(lons) // 10)
    for i in range(0, len(lons)-1, step):
        ax.annotate("", xy=(lons[i+1], lats[i+1]), xytext=(lons[i], lats[i]),
            arrowprops=dict(arrowstyle="->", color=color, lw=1.0, alpha=0.55))

    # Saltos marcados con X roja
    if len(outs) > 0:
        ax.scatter(outs["longitude"], outs["latitude"],
                   marker="x", s=120, color=color, linewidths=2.5,
                   zorder=8, alpha=0.9)
        # Círculo de alerta alrededor del salto
        for _, row in outs.iterrows():
            circle = plt.Circle((row["longitude"], row["latitude"]),
                                 0.00015, color=color, fill=False,
                                 linestyle="--", linewidth=1.2, alpha=0.6, zorder=7)
            ax.add_patch(circle)

# ─── Leyenda ──────────────────────────────────────────────────────────────────
user_patches  = [mpatches.Patch(color=color_map[u], label=u) for u in usuarios]
start_marker  = plt.Line2D([0],[0], marker="o", color="gray", linestyle="None",
                            markersize=7, label="Inicio", markeredgecolor="white")
end_marker    = plt.Line2D([0],[0], marker="s", color="gray", linestyle="None",
                            markersize=7, label="Fin", markeredgecolor="white")
jump_marker   = plt.Line2D([0],[0], marker="x", color="gray", linestyle="None",
                            markersize=9, label="Salto GPS descartado", markeredgewidth=2)

ax.legend(handles=user_patches + [start_marker, end_marker, jump_marker],
          fontsize=9, loc="best", framealpha=0.85)

ax.set_xlabel("Longitud", fontsize=10)
ax.set_ylabel("Latitud",  fontsize=10)
ax.grid(True, alpha=0.25)
ax.set_aspect("equal", adjustable="datalim")

plt.tight_layout()
output = f"polylines_clean_{VELOCIDAD_MAX_MS}ms.png"
plt.savefig(output, dpi=150, bbox_inches="tight")
print(f"\n✅ Gráfica guardada: {output}")
