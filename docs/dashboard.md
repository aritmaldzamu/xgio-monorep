# 🖥️ Panel de Administración (Dashboard Web)

El Dashboard de XGIO es una aplicación web de administración construida con **React + Vite**, diseñada para que los administradores del sistema monitoreen en tiempo real el estado de todos los usuarios y bastones registrados en la plataforma.

!!! note "Acceso"
    El dashboard es una herramienta interna. No es público. Está pensado para ser usado por el equipo de soporte o los familiares cuidadores con rol de administrador.

---

## 🏗️ Arquitectura y Stack

| Tecnología | Uso |
|---|---|
| **React + Vite** | Framework de UI y bundler ultrarrápido |
| **Firebase Firestore** | Base de datos en tiempo real (listener `onSnapshot`) |
| **Recharts** | Gráficas de barras y donut para métricas |
| **Lucide Icons** | Iconografía del panel |
| **Google Maps Embed** | Mapa en tiempo real del usuario seleccionado |

---

## 📊 Módulos del Dashboard

### 1. Métricas Globales en Tiempo Real

La página principal muestra 4 tarjetas de KPI que se actualizan automáticamente cuando llegan datos de Firestore:

<div align="center">
  <img src="/xgio-monorep/assets/imagenes/estado_baston.jpeg" alt="Dashboard - Estado del bastón" width="600" />
</div>

```jsx
// admin/src/App.jsx — Suscripción en tiempo real a todos los usuarios
useEffect(() => {
  setLoading(true);
  const unsub = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      usersList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(usersList);
      setLoading(false);
    }
  );
  return () => unsub(); // Limpieza al desmontar
}, []);

// Métricas derivadas
const activeCanesCount = users.filter(u => u.cane_id?.trim() !== "").length;
const sosCount = users.filter(u => u.last_alert === "SOS").length;
```

Las 4 métricas que muestra son:
- **Total de Usuarios** registrados en la plataforma
- **Bastones Vinculados** (usuarios que completaron el escaneo de QR)
- **Rutas Registradas** (métrica en desarrollo)
- **Alertas S.O.S Activas** — se colorea de rojo si hay emergencias en curso

---

### 2. Mapa GPS en Tiempo Real

El módulo de mapa filtra automáticamente los usuarios que enviaron una ubicación en los **últimos 5 minutos** y los muestra en un panel lateral. Al seleccionar un usuario, el mapa de Google Maps se centra en su coordenada más reciente.

```jsx
// admin/src/App.jsx — Filtrado de usuarios activos en tiempo real
const renderMap = () => {
  const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos
  const now = Date.now();

  const activeUsers = users
    .filter(u => u.cane_id)
    .map(u => {
      const locData = locationsByUser[u.id] || null;
      const last = locData?.last || null;
      const diffMs = last ? now - new Date(last.timestamp).getTime() : Infinity;
      return { ...u, last, diffMs };
    })
    .filter(u => u.diffMs <= ACTIVE_THRESHOLD_MS)
    .sort((a, b) => a.diffMs - b.diffMs); // más reciente primero

  // URL del mapa embed centrada en el usuario seleccionado
  const mapSrc = selected
    ? `https://www.google.com/maps?q=${selected.last.latitude},${selected.last.longitude}&z=17&output=embed`
    : null;

  return (
    <div>
      {/* Panel izquierdo: lista de usuarios activos */}
      {/* Panel derecho: iframe de Google Maps */}
      {mapSrc && <iframe src={mapSrc} title="Ubicación en vivo" />}
    </div>
  );
};
```

---

### 3. Gestión de Alertas S.O.S

Cuando el bastón detecta una caída o el usuario presiona el botón de emergencia, el campo `last_alert` en Firestore se actualiza a `"SOS"` o `"FALL"`. El dashboard lo detecta en tiempo real y puede **resetear el estado** de emergencia directamente desde la interfaz:

```jsx
// admin/src/App.jsx — Función para resetear alertas activas
const resetAlerts = async () => {
  const usersWithAlerts = users.filter(
    u => u.last_alert === "SOS" || u.last_alert === "FALL"
  );
  for (const u of usersWithAlerts) {
    await updateDoc(doc(db, "users", u.id), {
      last_alert: null,
      sos: false
    });
  }
};
```

---

### 4. Exportación de Datos a CSV

```jsx
// admin/src/App.jsx — Exportar directorio de usuarios a CSV
const exportToCSV = () => {
  if (users.length === 0) return;
  const headers = ['ID,Nombre,Correo,Cane_ID,Fecha_Registro\n'];
  const rows = users.map(u =>
    `"${u.id}","${u.name || ''}","${u.email || ''}","${u.cane_id || ''}","${u.created_at || ''}"`
  );
  const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "xgio_usuarios_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

---

### 5. Sistema de Configuración (persiste en localStorage)

El panel guarda las preferencias del administrador localmente para que sobrevivan recargas de página sin necesidad de una base de datos adicional:

```jsx
// admin/src/App.jsx — Persistencia de configuración
const SETTINGS_KEY = 'xgio_admin_settings';
const defaultSettings = {
  adminName:             'Administrador',
  sosEmailAlerts:        true,
  sosSound:              true,
  fallAlerts:            true,
  batteryWarnThreshold:  30,   // % — amarillo
  batteryCriticalThreshold: 15, // % — rojo
  bleDeviceName:         'XGIO-Cane-01',
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

const saveSettings = () => {
  setSettings(settingsDraft);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsDraft));
};
```

---

## 🎨 Diseño y Paleta de Colores

El dashboard usa un tema oscuro (`dark mode`) consistente con la app móvil:

```css
/* admin/src/index.css — Variables del tema XGIO */
:root {
  --bg-dark:        #030712;  /* Fondo principal — gray-950   */
  --bg-panel:       #111827;  /* Tarjetas y sidebar — gray-900 */
  --bg-panel-hover: #1f2937;  /* Hover estados — gray-800     */

  --accent-blue:    #2563eb;  /* Color principal — blue-600   */
  --accent-green:   #10b981;  /* Éxito / activo — emerald-500 */
  --accent-red:     #ef4444;  /* Alertas / error — red-500    */
  --accent-amber:   #f59e0b;  /* Advertencia — amber-500      */

  --text-primary:   #ffffff;
  --text-secondary: #9ca3af;  /* gray-400 */
}
```

---

## 🚀 Cómo Correr el Dashboard

```bash
cd admin
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador. Para que funcione, necesitas el archivo `admin/src/lib/firebase.js` con las credenciales de tu proyecto Firebase.
