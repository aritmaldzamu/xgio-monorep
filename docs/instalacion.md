# 🚀 Guía de Instalación Completa

Esta guía te llevará paso a paso desde cero hasta tener el proyecto XGIO **completamente funcional** en tus propias cuentas de Firebase y Vercel. No se asume ningún conocimiento previo.

!!! warning "Requisitos Previos"
    Antes de empezar, asegúrate de tener instalado en tu computadora:

    - [Node.js v18+](https://nodejs.org/) (incluye `npm`)
    - [Python 3.10+](https://www.python.org/)
    - [Git](https://git-scm.com/)
    - [Expo Go](https://expo.dev/go) en tu celular Android/iOS para probar la app

---

## Paso 1 — Clonar el Repositorio

Abre una terminal y clona el monorepo:

```bash
git clone https://github.com/aritmaldzamu/xgio-monorep.git
cd xgio-monorep
```

La estructura del proyecto que verás es:

```
xgio-monorep/
├── app/          ← Aplicación móvil (React Native / Expo)
├── backend/      ← API REST (Python / Flask)
└── firmware/     ← Código del bastón (ESP32 / Arduino)
```

---

## Paso 2 — Crear tu proyecto en Firebase

El proyecto usa Firebase para **autenticación de usuarios** y **base de datos Firestore** (donde se guardan las ubicaciones GPS).

### 2.1 Crear el proyecto

1. Ve a [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Haz clic en **"Agregar proyecto"**
3. Ponle un nombre (ej. `xgio-mi-proyecto`) y continúa
4. Desactiva Google Analytics si no lo necesitas → **Crear proyecto**

### 2.2 Habilitar Authentication

1. En el menú lateral → **Authentication** → **Comenzar**
2. En la pestaña **"Sign-in method"** → activa **Correo electrónico/Contraseña**
3. Guarda los cambios

### 2.3 Crear la base de datos Firestore

1. En el menú lateral → **Firestore Database** → **Crear base de datos**
2. Selecciona **"Modo de prueba"** (puedes cambiar las reglas después)
3. Elige la región más cercana (ej. `us-central`) → **Listo**

### 2.4 Obtener las claves del SDK Web (para la App móvil)

1. En la consola de Firebase → ⚙️ **Configuración del proyecto** (ícono de engranaje)
2. Desplázate hasta **"Tus apps"** → haz clic en `</>` (Web)
3. Registra la app con un nombre (ej. `xgio-app`) → **Registrar app**
4. Copia los valores del objeto `firebaseConfig`:

```javascript
// Ejemplo de lo que verás:
const firebaseConfig = {
  apiKey:            "AIzaSy...",         // ← EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain:        "mi-proyecto.firebaseapp.com", // ← EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId:         "mi-proyecto-id",   // ← EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket:     "mi-proyecto.appspot.com", // ← EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789",        // ← EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId:             "1:123:web:abc123", // ← EXPO_PUBLIC_FIREBASE_APP_ID
};
```

!!! tip "Guarda estos valores"
    Los usarás en los pasos 4 y 5. Son las claves públicas del SDK Web.

### 2.5 Generar la Service Account (para el Backend)

El backend necesita acceso administrativo a Firebase. La **Service Account** es el archivo de credenciales que se lo da.

1. En ⚙️ **Configuración del proyecto** → pestaña **"Cuentas de servicio"**
2. Haz clic en **"Generar nueva clave privada"** → **Generar clave**
3. Se descargará un archivo `.json`. **Renómbralo** a `serviceAccount.json`
4. Muévelo a la carpeta: `backend/api/serviceAccount.json`

!!! caution "¡Nunca subas este archivo a GitHub!"
    El `serviceAccount.json` ya está en el `.gitignore`. Nunca lo elimines de ahí. Si lo expones públicamente, alguien tendría acceso total a tu Firebase.

---

## Paso 3 — Desplegar el Backend en Vercel

El backend es una API de Python (Flask) que se despliega como una función serverless en Vercel.

### 3.1 Instalar la CLI de Vercel

```bash
npm install -g vercel
```

### 3.2 Entrar a la carpeta del backend

```bash
cd backend
```

### 3.3 Iniciar sesión y desplegar

```bash
vercel login
vercel --prod
```

Vercel te hará algunas preguntas la primera vez:

- **Set up and deploy?** → `Y`
- **Which scope?** → Elige tu cuenta personal
- **Link to existing project?** → `N` (es un proyecto nuevo)
- **Project name:** → `xgio-backend` (o el que prefieras)
- **In which directory is your code?** → `.` (directorio actual)
- **Want to override settings?** → `N`

Al terminar, Vercel te dará la URL de tu API. Se verá así:
```
https://xgio-backend-tu-usuario.vercel.app
```

**Guarda esta URL**, la necesitarás en el paso 4.

### 3.4 Configurar las variables de entorno en Vercel

El backend necesita dos variables secretas. Ve al dashboard de Vercel:

1. Ve a [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Entra a tu proyecto `xgio-backend`
3. Ve a **Settings → Environment Variables**
4. Agrega estas dos variables:

| Variable | Valor |
|---|---|
| `FIREBASE_API_KEY` | La `apiKey` que copiaste en el paso 2.4 |
| `JWT_SECRET` | Una cadena secreta larga (ej. genera una en [https://jwtsecret.com/generate](https://jwtsecret.com/generate)) |

5. Haz un nuevo deploy para que apliquen: `vercel --prod`

!!! tip "¿Por qué un JWT_SECRET?"
    El backend genera sus propios tokens JWT (además de Firebase) para autenticar las peticiones de la app. Usa una cadena aleatoria larga como `xg10_sup3r_s3cr3t_2026!` o mejor aún, una generada automáticamente.

---

## Paso 4 — Configurar la App Móvil

### 4.1 Instalar dependencias

```bash
cd ../app
npm install
```

### 4.2 Crear el archivo de variables de entorno

Crea un archivo llamado `.env` en la carpeta `app/` con el siguiente contenido:

```env
# ── Firebase (SDK Web) ──────────────────────────────────────────────────────
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=mi-proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=mi-proyecto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=mi-proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123

# ── Backend (URL de tu API en Vercel) ───────────────────────────────────────
EXPO_PUBLIC_API_URL=https://xgio-backend-tu-usuario.vercel.app
```

!!! warning "Reemplaza los valores"
    Sustituye cada valor con los datos reales que obtuviste en los pasos 2.4 y 3.3.

### 4.3 Iniciar la app en modo desarrollo

```bash
npx expo start
```

Se abrirá un menú en la terminal con un código QR. Escanéalo con la app **Expo Go** en tu celular. La aplicación cargará directamente en tu dispositivo.

---

## Paso 5 — Configurar las Reglas de Firestore (Seguridad)

Para producción, necesitas asegurar que solo los usuarios autenticados accedan a sus propios datos. Ve a **Firestore → Reglas** y reemplaza el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuario solo accede a sus propios datos
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Haz clic en **Publicar**.

---

## Paso 6 — (Opcional) Generar un APK para Android

Si quieres instalar la app directamente sin Expo Go, puedes generar un APK:

```bash
cd app
npx eas build -p android --profile preview
```

Necesitas tener una cuenta en [Expo](https://expo.dev/) y haber iniciado sesión con `npx expo login`.

El APK generado se puede distribuir directamente por WhatsApp, Google Drive, etc.

---

## Resumen de Variables de Entorno

### `app/.env` (App Móvil)

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Clave pública del SDK Web de Firebase |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de autenticación de Firebase |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ID del proyecto en Firebase |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de almacenamiento |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ID del remitente de mensajes |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | ID de la app web en Firebase |
| `EXPO_PUBLIC_API_URL` | URL completa del backend desplegado en Vercel |

### Backend en Vercel (Variables de Entorno en el Dashboard)

| Variable | Descripción |
|---|---|
| `FIREBASE_API_KEY` | La misma `apiKey` de Firebase (para autenticación REST) |
| `JWT_SECRET` | Cadena secreta para firmar los tokens de sesión |

---

!!! tip "¿Algo salió mal?"
    Los errores más comunes son:

    - **"Firebase: Error (auth/invalid-api-key)"** → Revisa que `EXPO_PUBLIC_FIREBASE_API_KEY` sea correcta y no tenga espacios.
    - **"401 Unauthorized" en la API"** → El `JWT_SECRET` en Vercel y en la app no coinciden, o el token expiró.
    - **"serviceAccount.json not found"** → Asegúrate de que el archivo esté en `backend/api/serviceAccount.json` exactamente.
    - **Imágenes en Expo Go que no cargan** → Reinicia el servidor con `npx expo start --clear`.
