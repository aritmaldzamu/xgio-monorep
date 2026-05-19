# Servidor (Backend)
El backend procesa la lógica pesada que no se debe ejecutar en el microcontrolador ni en la aplicación móvil. Está construido en **Python** y se utiliza tanto para APIs Serverless en **Vercel** como para scripts de limpieza de datos geoespaciales.

## Funcionalidades Principales
- **Cálculo de Dispersión**: Analiza qué tanto se desvía la ruta real del usuario respecto a una ruta ideal (OSRM).
- **Limpieza de Datos**: Suaviza las coordenadas GPS mediante la Fórmula de Haversine para evitar saltos bruscos ocasionados por ruido en la señal.
- **Generación de Gráficas**: Crea reportes visuales del rendimiento con Matplotlib.

## Tecnologías
- Python (Pandas, Folium, Matplotlib, Numpy)
- Vercel (Hosting para funciones serverless)

---

## 💻 Implementación y Código

Para garantizar la fiabilidad del rastreo, implementamos un algoritmo que filtra lecturas anómalas (outliers) evaluando la velocidad requerida para moverse de un punto a otro.

=== "backend/api/clean_polylines.py"
    ```python
    import pandas as pd
    from math import radians, sin, cos, sqrt, atan2

    def haversine(lat1, lon1, lat2, lon2):
        """Calcula la distancia en metros entre dos coordenadas GPS."""
        R = 6371000
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        return R * 2 * atan2(sqrt(a), sqrt(1-a))

    def clean_track(group, max_speed):
        """
        Elimina puntos donde la velocidad respecto al punto anterior
        supera max_speed m/s (ej. 2.5 m/s para velocidad de caminata).
        Devuelve (clean_df, outliers_df).
        """
        group = group.sort_values("elapsed_min").reset_index(drop=True)
        keep     = [True]
        outliers = []

        for i in range(1, len(group)):
            prev = group.iloc[i-1]
            curr = group.iloc[i]
            
            dist = haversine(
                prev["latitude"], prev["longitude"],
                curr["latitude"], curr["longitude"]
            )
            dt = (curr["elapsed_min"] - prev["elapsed_min"]) * 60  # segundos
            speed = dist / dt if dt > 0 else 999

            if speed > max_speed:
                keep.append(False)
                outliers.append(curr)
            else:
                keep.append(True)

        clean = group[keep].copy()
        out_df = pd.DataFrame(outliers)
        return clean, out_df
    ```

