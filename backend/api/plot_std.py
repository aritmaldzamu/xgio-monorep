import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

usuarios = [
    "Usuario 1\n(Tere f)",
    "Usuario 2\n(Juve)",
    "Usuario 3\n(Sint-A)",
    "Usuario 4\n(Sint-B)",
    "Usuario 5\n(Sint-C)",
]
stds = [8.71, 12.59, 10.04, 11.15, 11.23]
colores = ["#00E676", "#FF1744", "#FF9100", "#E040FB", "#00B0FF"]

fig, ax = plt.subplots(figsize=(10, 6))
fig.patch.set_facecolor("white")
ax.set_facecolor("white")

bars = ax.bar(usuarios, stds, color=colores, edgecolor="white", linewidth=1.2, width=0.55, zorder=3)


# Valor encima de cada barra
for bar, val in zip(bars, stds):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
            f"{val} m", ha="center", va="bottom", fontsize=12, fontweight="bold", color="#333333")

# Grid horizontal suave
ax.yaxis.grid(True, linestyle="--", alpha=0.4, color="#aaaaaa", zorder=0)
ax.set_axisbelow(True)

ax.set_ylabel("Desviacion Estandar (metros)", fontsize=12, color="#333333")
ax.set_title("Desviacion Estandar GPS por Usuario\nRecorrido peatonal Ibero Puebla → Porcelanosa", fontsize=13, fontweight="bold", color="#111111", pad=14)
ax.set_ylim(0, 16)
ax.tick_params(axis="x", labelsize=11, colors="#333333")
ax.tick_params(axis="y", labelsize=10, colors="#333333")

for spine in ax.spines.values():
    spine.set_edgecolor("#dddddd")

plt.tight_layout()
plt.savefig("std_por_usuario.png", dpi=200, bbox_inches="tight", facecolor="white")
print("Guardado: std_por_usuario.png")
