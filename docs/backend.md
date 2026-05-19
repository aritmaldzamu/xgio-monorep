# Servidor (Backend)
El backend procesa la lógica pesada que no se debe ejecutar en el microcontrolador ni en la aplicación móvil. Está construido en **Python** y expone una API a través de **Flask / Serverless**.

## Funcionalidades Principales
- **Cálculo de Dispersión**: Analiza qué tanto se desvía la ruta real del usuario respecto a una ruta ideal (OSRM).
- **Limpieza de Datos**: Suaviza las coordenadas GPS para evitar saltos bruscos en el mapa.
- **Generación de Gráficas**: Crea reportes visuales del rendimiento.

## Tecnologías
- Python (Pandas, Folium, Matplotlib)
- Vercel (Hosting)

