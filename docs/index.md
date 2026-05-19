# Bienvenidos a XGIO 🦯

<div align="center">
  <span style="display: inline-block; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; padding: 6px 22px; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #a5b4fc;">
    Universidad Iberoamericana Puebla
  </span>
</div>

**XGIO** es un **Sistema de Rastreo GPS en Tiempo Real** para un Bastón Inteligente. Desarrollado como un proyecto de ingeniería interdisciplinaria en la **Universidad Iberoamericana Puebla**, tiene como propósito principal mejorar la autonomía, movilidad y seguridad de las personas con discapacidad visual, al mismo tiempo que ofrece tranquilidad a sus cuidadores.

---

## 🎯 Objetivo del Proyecto

Brindar una herramienta tecnológica accesible y robusta que permita a los usuarios con discapacidad visual desplazarse con mayor confianza en entornos urbanos. El sistema garantiza que los cuidadores puedan monitorear su ubicación en tiempo real mediante una aplicación móvil, recibir alertas en caso de caídas (mediante acelerómetros) o emergencias (botón S.O.S), y revisar el historial de desplazamientos para analizar rutas y tiempos.

## 🏗️ Arquitectura del Sistema

El ecosistema de XGIO es un proyecto full-stack que abarca desde la electrónica física hasta la nube, y se compone de tres pilares fundamentales que interactúan en tiempo real:

1. **[📱 Aplicación Móvil (App)](app.md)**: Interfaz para los cuidadores y usuarios, desarrollada en React Native y Expo, que muestra mapas interactivos, historiales de ruta y alertas push.
2. **[⚙️ Backend (Servidor)](backend.md)**: Lógica de procesamiento de datos y analíticas de rutas, alojada en Vercel y Firebase, procesando los datos de telemetría enviados por el bastón.
3. **[🔌 Firmware (Hardware)](firmware.md)**: El "cerebro" del bastón inteligente, programado en C++ (ESP32), encargado de leer los datos del módulo GPS (NEO-6M), el acelerómetro (MPU6050) y comunicarse con la nube de forma segura.

---

## 🚀 Empezar

Puedes explorar el código fuente directamente en nuestro [Repositorio de GitHub](https://github.com/aritmaldzamu/xgio-monorep). Si deseas acceder a los documentos técnicos, reportes de ingeniería, pósters y un análisis detallado del desempeño del GPS, dirígete a las secciones correspondientes:
- **[Análisis y Pruebas GPS](pruebas_gps.md)**
- **[Documentación en PDF](descargas.md)**
