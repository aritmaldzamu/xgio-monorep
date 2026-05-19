# 🚀 XGIO — Guía de Despliegue a Producción
> Última actualización: Mayo 2026 · Versión 1.0.0

Lee cada sección **en orden**. Cada bloque tiene los comandos uno por uno con explicación de qué hace.
No ejecutes el siguiente comando hasta que el anterior **termine sin errores**.

---

## 📋 ÍNDICE

1. [Dashboard (Vercel — producción real)](#1--dashboard-admin---deploy-a-vercel)
2. [App Web (Expo Web — deploy estático)](#2--app-web-expo-web---deploy-estático)
3. [APK Android (EAS Build — Expo)](#3--apk-android---eas-build)
4. [Verificación final](#4--verificación-final)

---

## 1. 🖥️ Dashboard Admin → Deploy a Vercel

> **Resultado:** El dashboard queda en una URL pública tipo `https://xgio-admin.vercel.app`
> **Directorio:** `xgio-monorepo/admin/`

### Paso 1 — Instalar Vercel CLI (solo la primera vez)

```bash
npm install -g vercel
```

### Paso 2 — Ir al directorio del dashboard

```bash
cd xgio-monorepo/admin
```

### Paso 3 — Hacer el build de producción

```bash
npm run build
```

> ✅ Esto genera la carpeta `dist/` con todos los archivos listos.
> ❌ Si falla, revisa errores en consola antes de continuar.

### Paso 4 — Login en Vercel (solo la primera vez)

```bash
vercel login
```

> Abre el navegador y confirma con tu cuenta de Vercel/GitHub.

### Paso 5 — Deploy a producción

```bash
vercel --prod
```

> La primera vez te pregunta:
> - **Set up and deploy?** → `Y`
> - **Which scope?** → tu usuario
> - **Link to existing project?** → `N` (primera vez) o `Y` si ya existe
> - **Project name:** → `xgio-admin`
> - **In which directory is your code located?** → `.` (punto, directorio actual)
> - **Want to modify settings?** → `N`

> ✅ Al terminar te dará la URL: `https://xgio-admin.vercel.app`

### Paso 6 — Configurar variables de entorno en Vercel (solo la primera vez)

Entra a https://vercel.com → tu proyecto `xgio-admin` → **Settings** → **Environment Variables**
y agrega las mismas del archivo `admin/.env`:

```
VITE_FIREBASE_API_KEY         = AIzaSyAKqX6F8tMXxsRSLM4RcHRHTvFoNtynbcE
VITE_FIREBASE_AUTH_DOMAIN     = bastones-1c9b6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID      = bastones-1c9b6
VITE_FIREBASE_STORAGE_BUCKET  = bastones-1c9b6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 252384686458
VITE_FIREBASE_APP_ID          = 1:252384686458:web:00f5ce014b11b0dd58a6c3
VITE_API_URL                  = https://xgio-backend.vercel.app
```

> Después de agregar las variables, vuelve a correr:
> ```bash
> vercel --prod
> ```

### ♻️ Para futuros re-deploys (cuando hagas cambios)

```bash
cd xgio-monorepo/admin
npm run build
vercel --prod
```

---

## 2. 🌐 App Web (Expo Web) → Deploy estático

> **Resultado:** La app móvil corre como web en una URL pública.
> **Directorio:** `xgio-monorepo/app/`

### Paso 1 — Ir al directorio de la app

```bash
cd xgio-monorepo/app
```

### Paso 2 — Exportar la app como web estático

```bash
npx expo export --platform web
```

> ✅ Genera la carpeta `dist/` con HTML + JS estático.

### Paso 3 — Deploy a Vercel

```bash
vercel --prod
```

> La primera vez:
> - **Project name:** → `xgio-app-web`
> - **Directory:** → `.`
> - **Want to override settings?** → `N`

> ✅ URL resultante: `https://xgio-app-web.vercel.app`

### ♻️ Para futuros re-deploys

```bash
cd xgio-monorepo/app
npx expo export --platform web
vercel --prod
```

---

## 3. 📱 APK Android → EAS Build (Expo)

> **Resultado:** Un archivo `.apk` descargable e instalable en cualquier Android.
> **Directorio:** `xgio-monorepo/app/`
> **Requiere:** Cuenta en https://expo.dev (gratis)

### Paso 1 — Instalar EAS CLI (solo la primera vez)

```bash
npm install -g eas-cli
```

### Paso 2 — Login en Expo (solo la primera vez)

```bash
eas login
```

> Ingresa tu usuario y contraseña de expo.dev

### Paso 3 — Ir al directorio de la app

```bash
cd xgio-monorepo/app
```

### Paso 4 — Verificar configuración EAS (solo la primera vez)

```bash
eas build:configure
```

> Responde:
> - **Which platforms would you like to configure?** → `Android`

### Paso 5 — Construir el APK de producción

```bash
eas build --platform android --profile production
```

> ⏳ Este proceso tarda ~10-15 minutos en los servidores de Expo.
> Puedes ver el progreso en: https://expo.dev/accounts/[tu-usuario]/projects/xgio/builds

### Paso 6 — Descargar el APK

```bash
eas build:list
```

> Te muestra el link de descarga. También aparece en:
> https://expo.dev → tu proyecto `xgio` → **Builds**

### Paso 7 — Guardar el APK en la carpeta releases

```bash
# Mueve el APK descargado manualmente a:
xgio-monorepo/releases/XGIO_v1.X.apk
```

---

> ### ⚡ Para una APK rápida de prueba (sin cuenta Expo, en local)
> 
> ```bash
> cd xgio-monorepo/app
> npx expo run:android --variant release
> ```
> 
> > Requiere tener Android Studio y SDK instalado.
> > El APK queda en: `app/android/app/build/outputs/apk/release/app-release.apk`

---

## 4. ✅ Verificación Final

Después de cada deploy, abre las URLs y verifica:

| Qué verificar | Dónde |
|---|---|
| Dashboard carga y muestra usuarios | `https://xgio-admin.vercel.app` |
| Login/Registro funciona en la app web | `https://xgio-app-web.vercel.app` |
| APK instala y abre sin crash | En un dispositivo Android físico |
| Firestore recibe datos en tiempo real | Firebase Console → `bastones-1c9b6` |
| Backend responde | `https://xgio-backend.vercel.app/health` |

---

## 🗂️ Resumen de URLs del proyecto

| Componente | URL |
|---|---|
| 🖥️ Dashboard Admin | `https://xgio-admin.vercel.app` |
| 📱 App Web | `https://xgio-app-web.vercel.app` |
| ⚙️ Backend API | `https://xgio-backend.vercel.app` |
| 🔥 Firebase Console | `https://console.firebase.google.com/project/bastones-1c9b6` |
| 📦 Expo Builds | `https://expo.dev` → proyecto `xgio` |

---

## ⚠️ Notas importantes

- **Nunca** subas el archivo `.env` a GitHub. Está en `.gitignore`.
- Las variables de entorno **deben configurarse manualmente** en el panel de Vercel para cada proyecto.
- El APK de **EAS Build** usa los servidores de Expo en la nube; necesitas conexión a internet.
- Si cambias el nombre del bastón BLE en el firmware, actualiza también:
  - `app/lib/bleService.js` → constante `XGIO_DEVICE_NAME`
  - Configuración BLE en el Dashboard Admin → sección Configuración

---

*Generado para el proyecto XGIO · Smart Cane Platform*
