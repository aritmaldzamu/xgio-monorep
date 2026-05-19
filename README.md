# XGIO - Sistema de Rastreo GPS para Bastón Inteligente 🦯

¡Bienvenido al repositorio oficial del proyecto **XGIO**! 

Este proyecto integra hardware y software para crear un sistema de rastreo GPS en tiempo real enfocado en mejorar la autonomía y seguridad de personas con discapacidad visual mediante el uso de un bastón inteligente.

---

## 📁 Estructura del Proyecto

Para mantener el proyecto limpio y organizado, la arquitectura del código está dividida en los siguientes módulos principales:

### 📱 `app/`
Contiene la aplicación móvil (React Native / Expo) que utilizan los cuidadores o familiares para:
- Monitorear en tiempo real la ubicación del usuario.
- Recibir notificaciones push y alertas.
- Visualizar el historial de rutas y consultar el estado de la batería del bastón.

### ⚙️ `backend/`
Contiene la API y las funciones lógicas del lado del servidor (Python / Flask / Serverless):
- Cálculos de dispersión de rutas (comparación de rutas reales vs rutas ideales).
- Procesamiento y limpieza de datos (polylines) provenientes del GPS.
- Scripts para generar los mapas interactivos y reportes analíticos.

### 🔌 `firmware/`
El código que se ejecuta directamente en el microcontrolador del bastón (ESP32/Arduino):
- Lectura de sensores.
- Comunicación constante con los servicios de la nube (Firebase/Backend).
- Gestión de energía y geolocalización.

### 📄 `docs/`
Toda la documentación técnica y académica del proyecto:
- **Proyecto de Ingeniería**: Documento detallado de la investigación y desarrollo.
- **Póster y Resumen**: Material de presentación para ferias, exposiciones y divulgación científica.

### 🛠️ `tools/`
Scripts útiles para tareas de mantenimiento y soporte del proyecto:
- Generadores de códigos QR para autenticación o sincronización de dispositivos (`generate_qr.py`).
- Utilidades para solucionar problemas de codificación de archivos.

### 📊 `graficas_reporte/`
Imágenes y gráficas estáticas que se han generado durante la fase de análisis de desempeño (Ej. pruebas de dispersión de GPS de distintos usuarios).

### 📦 `releases/`
Contiene las versiones compiladas y empaquetadas del proyecto (como el archivo APK para Android) y las guías de despliegue (`DEPLOYMENT_GUIDE.md`).

---

## 🚀 Empezar a trabajar

Dependiendo del módulo en el que vayas a trabajar, te recomendamos ingresar a cada carpeta y seguir sus propias instrucciones o revisar sus dependencias:

- Para correr la app móvil, dirígete a `app/` y utiliza `npm install` y `npm start`.
- Para levantar el backend o ejecutar análisis de Python, entra a `backend/` e instala las dependencias de `requirements.txt`.

---
*Este repositorio utiliza el formato de Monorepo para consolidar todos los subsistemas del ecosistema XGIO en un solo lugar de forma ordenada.*
