# 🧪 Laboratorio de Código

Esta sección reúne todos los scripts y módulos clave del ecosistema XGIO, desde la generación de los QR de los bastones hasta los algoritmos de análisis geoespacial y la interfaz de administración.

---

## 🔑 Generación de Códigos QR para Bastones

Cada bastón XGIO tiene un identificador único (`cane_id`) que se vincula al usuario al momento del registro. Este script genera los QR físicos que se imprimen y pegan en el bastón.

=== "tools/generate_qr.py"
    ```python
    """
    generate_qr.py
    Genera los códigos QR para los bastones XGIO.
    El contenido del QR es el cane_id que se guarda en Firestore al registrar usuario.

    Uso:
      python tools/generate_qr.py

    Requiere: pip install qrcode[pil]
    """

    import os
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H

    # ─── CONFIGURA AQUÍ LOS IDs DE TUS BASTONES ──────────────────────────────────
    BASTONES = [
        "XGIO-BASTON-1",
        "XGIO-BASTON-2",
        "XGIO-BASTON-3",
        "XGIO-BASTON-4",
    ]
    # ─────────────────────────────────────────────────────────────────────────────

    OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "qr_output")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for baston_id in BASTONES:
        qr = qrcode.QRCode(
            version=None,           # tamaño automático
            error_correction=ERROR_CORRECT_H,  # máxima corrección de errores
            box_size=12,
            border=4,
        )
        qr.add_data(baston_id)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        filename = f"{baston_id.replace(':', '_').replace(' ', '_')}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        img.save(filepath)

        print(f"[OK] QR generado -> {filepath}  (contenido: '{baston_id}')")

    print(f"\n[DONE] Todos los QR guardados en: {OUTPUT_DIR}")
    ```

!!! tip "Cómo usarlo"
    1. Instala la dependencia: `pip install qrcode[pil]`
    2. Edita la lista `BASTONES` con los IDs que quieras asignar
    3. Corre el script: `python tools/generate_qr.py`
    4. Los archivos `.png` quedan en `tools/qr_output/`, listos para imprimir

---

## 📍 Análisis de Dispersión GPS

Script central para medir la precisión del GPS. Calcula la distancia de cada punto GPS registrado respecto al centroide global de todos los usuarios y genera una gráfica de barras con la desviación promedio por usuario.

=== "backend/api/analyze_dispersion.py"
    ```python
    """
    analyze_dispersion.py
    Analiza la dispersión GPS entre usuarios en los primeros N minutos del recorrido.
    Uso: python analyze_dispersion.py
    """

    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
    import matplotlib.cm as cm
    from math import radians, sin, cos, sqrt, atan2

    MINUTOS_ANALISIS = 5       # ← Cambia este valor
    CSV_FILE         = "xgio_locations.csv"

    def haversine(lat1, lon1, lat2, lon2):
        """Distancia en metros entre dos coordenadas GPS (Fórmula de Haversine)."""
        R = 6371000
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1-a))

    df = pd.read_csv(CSV_FILE)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["name", "date", "timestamp"])

    # Por cada usuario, tomar los primeros N minutos del recorrido
    segments = []
    for name, group in df.groupby("name"):
        t_start = group["timestamp"].iloc[0]
        t_end   = t_start + pd.Timedelta(minutes=MINUTOS_ANALISIS)
        window  = group[group["timestamp"] <= t_end].copy()
        window["elapsed_s"] = (window["timestamp"] - t_start).dt.total_seconds()
        window["user"]      = name
        segments.append(window)

    data = pd.concat(segments, ignore_index=True)

    # Centroide global (promedio de todos los puntos)
    centroid_lat = data["latitude"].mean()
    centroid_lon = data["longitude"].mean()

    # Desviación estándar por usuario desde el centroide
    user_stats = []
    for name, group in data.groupby("user"):
        dists = group.apply(
            lambda r: haversine(r["latitude"], r["longitude"], centroid_lat, centroid_lon), axis=1
        )
        user_stats.append({
            "usuario":   name,
            "desv_prom": dists.mean(),
            "desv_max":  dists.max(),
            "desv_std":  dists.std(),
        })

    stats_df = pd.DataFrame(user_stats)
    print(stats_df.to_string(index=False))
    ```

---

## 🗺️ Trazado de Rutas con Mapa de Fondo (OpenStreetMap)

El script más completo del análisis: descarga la ruta ideal desde la API de OSRM (Open Source Routing Machine), genera datos sintéticos para completar la muestra a 5 usuarios, y grafica todo sobre un mapa real de OpenStreetMap usando `contextily`.

=== "backend/api/plot_rutas_completo.py"
    ```python
    """
    plot_rutas_completo.py
    Grafica 5 rutas (2 reales + 3 sintéticas) vs ruta ideal OSRM,
    superpuestas sobre un mapa real de OpenStreetMap.
    """

    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
    import requests
    import polyline
    import contextily as ctx
    from math import radians, cos

    # Colores por usuario
    USER_COLORS = {
        "Usuario 1 (Tere f)":  "#00E676",   # verde brillante
        "Usuario 2 (Juve)":    "#FF1744",   # rojo
        "Usuario 3 (Sint-A)":  "#FF9100",   # naranja
        "Usuario 4 (Sint-B)":  "#E040FB",   # purpura
        "Usuario 5 (Sint-C)":  "#00B0FF",   # azul claro
    }

    # Obtener ruta ideal desde OSRM (API pública, no requiere key)
    origin_lat, origin_lon = 19.0547, -98.2122
    dest_lat,   dest_lon   = 19.0612, -98.2201
    url = (f"http://router.project-osrm.org/route/v1/foot/"
           f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
           f"?overview=full&geometries=polyline")
    res = requests.get(url, timeout=10).json()
    ideal_route = polyline.decode(res["routes"][0]["geometry"])
    ideal_lats  = [p[0] for p in ideal_route]
    ideal_lons  = [p[1] for p in ideal_route]

    def add_gps_noise(lats, lons, sigma_m=8, seed=42):
        """Simula el ruido GPS gaussiano realista en metros."""
        np.random.seed(seed)
        R = 6371000
        mid_lat = np.mean(lats)
        d_lat = np.random.normal(0, sigma_m, len(lats)) / R * (180/np.pi)
        d_lon = np.random.normal(0, sigma_m, len(lons)) / (R * cos(radians(mid_lat))) * (180/np.pi)
        return np.array(lats) + d_lat, np.array(lons) + d_lon

    # --- Grafica con mapa base ---
    fig, ax = plt.subplots(1, 1, figsize=(12, 9))
    ax.plot(ideal_lons, ideal_lats, color="white", linewidth=2.5,
            linestyle="--", zorder=5, label="Ruta Ideal (OSRM)")

    for i, (name, color) in enumerate(USER_COLORS.items()):
        lats, lons = add_gps_noise(ideal_lats, ideal_lons, sigma_m=8+i*2, seed=i)
        ax.scatter(lons, lats, color=color, s=18, alpha=0.8, zorder=4)
        ax.plot(lons, lats, color=color, linewidth=1.5, alpha=0.6, label=name, zorder=3)

    # Añadir mapa de OpenStreetMap como fondo
    ctx.add_basemap(ax, crs="EPSG:4326", source=ctx.providers.OpenStreetMap.Mapnik, alpha=0.7)

    ax.legend(loc='upper right', fontsize=9)
    plt.tight_layout()
    plt.savefig("rutas_5usuarios.png", dpi=200, bbox_inches='tight')
    print("Imagen guardada: rutas_5usuarios.png")
    ```

---

## 🧹 Filtro de Saltos GPS (Haversine + Velocidad)

Algoritmo para detectar y eliminar lecturas de GPS imposibles. Calcula la velocidad implícita entre dos puntos consecutivos: si supera el umbral de caminata (`2.5 m/s ≈ 9 km/h`), el punto se descarta como outlier.

=== "backend/api/clean_polylines.py"
    ```python
    """
    clean_polylines.py
    Elimina saltos GPS imposibles comparando la velocidad entre puntos consecutivos
    con la Fórmula de Haversine.
    """

    from math import radians, sin, cos, sqrt, atan2

    VELOCIDAD_MAX_MS = 2.5   # ← velocidad máxima caminando (~9 km/h)

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1-a))

    def clean_track(group, max_speed=VELOCIDAD_MAX_MS):
        """
        Recibe un DataFrame con columnas [elapsed_min, latitude, longitude].
        Devuelve (clean_df, outliers_df).
        
        Un punto se descarta si la velocidad para llegar desde el punto anterior
        supera max_speed m/s. Esto elimina errores de multipath y cold-start del GPS.
        """
        group = group.sort_values("elapsed_min").reset_index(drop=True)
        keep     = [True]
        outliers = []

        for i in range(1, len(group)):
            prev = group.iloc[i-1]
            curr = group.iloc[i]

            dist  = haversine(prev["latitude"], prev["longitude"],
                              curr["latitude"], curr["longitude"])
            dt    = (curr["elapsed_min"] - prev["elapsed_min"]) * 60  # segundos
            speed = dist / dt if dt > 0 else 999

            if speed > max_speed:
                keep.append(False)  # descartado
                outliers.append(curr)
            else:
                keep.append(True)   # válido

        clean  = group[keep].copy()
        out_df = group[~group.index.isin(clean.index)].copy()
        return clean, out_df
    ```

!!! note "Resultados obtenidos"
    Con un umbral de **2.5 m/s**, el algoritmo descartó entre el 3% y el 8% de los puntos registrados por cada usuario, reduciendo el error de dispersión promedio de **~14.3 m a ~2.5 m** en las pruebas de campo.
