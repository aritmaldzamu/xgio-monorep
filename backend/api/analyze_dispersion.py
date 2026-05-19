"""
analyze_dispersion.py
Analiza la dispersión GPS entre usuarios en los primeros N minutos del recorrido.

Uso:
  python analyze_dispersion.py
  Cambia MINUTOS_ANALISIS para ajustar la ventana de tiempo.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from math import radians, sin, cos, sqrt, atan2

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
MINUTOS_ANALISIS = 5       # ← Cambia este valor
CSV_FILE         = "xgio_locations.csv"
# ──────────────────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    """Distancia en metros entre dos coordenadas."""
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))

# ─── Cargar datos ─────────────────────────────────────────────────────────────
df = pd.read_csv(CSV_FILE)
df["timestamp"] = pd.to_datetime(df["timestamp"])
df = df.sort_values(["name", "date", "timestamp"])
df = df[df["name"].str.lower() != "papu"]

print(f"\n{'='*60}")
print(f"  Análisis de dispersión — primeros {MINUTOS_ANALISIS} minutos")
print(f"{'='*60}")

# ─── Por cada usuario, tomar el inicio y filtrar los primeros N minutos ───────
segments = []
for name, group in df.groupby("name"):
    t_start = group["timestamp"].iloc[0]
    t_end   = t_start + pd.Timedelta(minutes=MINUTOS_ANALISIS)
    window  = group[group["timestamp"] <= t_end].copy()
    window["elapsed_s"] = (window["timestamp"] - t_start).dt.total_seconds()
    window["user"]      = name
    segments.append(window)
    print(f"  {name}: {len(window)} puntos en {MINUTOS_ANALISIS} min (inicio: {t_start.strftime('%H:%M:%S')})")

data = pd.concat(segments, ignore_index=True)

# ─── Centroide global (promedio de todos los puntos en la ventana) ────────────
centroid_lat = data["latitude"].mean()
centroid_lon = data["longitude"].mean()

print(f"\n  Centroide: {centroid_lat:.6f}, {centroid_lon:.6f}")

# ─── Desviación por usuario ───────────────────────────────────────────────────
print(f"\n{'─'*60}")
print(f"  {'Usuario':<15} {'Puntos':>7} {'Desv. prom (m)':>15} {'Desv. máx (m)':>14} {'Desv. mín (m)':>14}")
print(f"{'─'*60}")

user_stats = []
for name, group in data.groupby("user"):
    dists = group.apply(
        lambda r: haversine(r["latitude"], r["longitude"], centroid_lat, centroid_lon), axis=1
    )
    user_stats.append({
        "usuario":    name,
        "puntos":     len(group),
        "desv_prom":  dists.mean(),
        "desv_max":   dists.max(),
        "desv_min":   dists.min(),
        "desv_std":   dists.std(),
    })
    print(f"  {name:<15} {len(group):>7} {dists.mean():>14.1f}m {dists.max():>13.1f}m {dists.min():>13.1f}m")

print(f"{'─'*60}")
stats_df = pd.DataFrame(user_stats)

# ─── GRÁFICA 1: Mapa de dispersión ───────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(16, 7))
fig.suptitle(f"Dispersión GPS — Primeros {MINUTOS_ANALISIS} minutos", fontsize=14, fontweight="bold")

ax1 = axes[0]
colors = cm.tab10(np.linspace(0, 1, data["user"].nunique()))
for (name, group), color in zip(data.groupby("user"), colors):
    ax1.scatter(group["longitude"], group["latitude"],
                label=name, alpha=0.5, s=15, color=color)
    # Marcar inicio
    ax1.scatter(group["longitude"].iloc[0], group["latitude"].iloc[0],
                marker="*", s=120, color=color, edgecolors="black", linewidths=0.5)

# Centroide
ax1.scatter(centroid_lon, centroid_lat, marker="+", s=300,
            color="red", linewidths=2.5, zorder=10, label="Centroide")
ax1.set_title("Trayectorias por usuario")
ax1.set_xlabel("Longitud")
ax1.set_ylabel("Latitud")
ax1.legend(fontsize=8)
ax1.grid(True, alpha=0.3)

# ─── GRÁFICA 2: Desviación promedio por usuario ───────────────────────────────
ax2 = axes[1]
usuarios = stats_df["usuario"]
x        = np.arange(len(usuarios))
bars     = ax2.bar(x, stats_df["desv_prom"], color=colors[:len(usuarios)],
                   alpha=0.8, edgecolor="black", linewidth=0.5)
ax2.errorbar(x, stats_df["desv_prom"], yerr=stats_df["desv_std"],
             fmt="none", color="black", capsize=5, linewidth=1.5)

# Etiquetas en las barras
for bar, val in zip(bars, stats_df["desv_prom"]):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
             f"{val:.1f}m", ha="center", va="bottom", fontsize=9, fontweight="bold")

ax2.set_xticks(x)
ax2.set_xticklabels(usuarios, rotation=20, ha="right")
ax2.set_ylabel("Desviación desde centroide (metros)")
ax2.set_title(f"Desviación promedio ± std ({MINUTOS_ANALISIS} min)")
ax2.grid(True, axis="y", alpha=0.3)
ax2.set_ylim(0, stats_df["desv_max"].max() * 1.25)

plt.tight_layout()
output_img = f"dispersion_{MINUTOS_ANALISIS}min.png"
plt.savefig(output_img, dpi=150, bbox_inches="tight")
print(f"\n✅ Gráfica guardada: {output_img}")
