import { useEffect, useState } from 'react'
import { collection, onSnapshot, collectionGroup, updateDoc, doc } from 'firebase/firestore'
import { db } from './lib/firebase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  LayoutDashboard, Users, Map, Cpu, Settings, HelpCircle,
  LogOut, Search, Bell, Mail, TrendingUp, Download, AlertCircle, MapPin, Battery, Wifi,
  User, Shield, Sliders, Bluetooth, Info, Save, Check, Globe, RefreshCw, ExternalLink, Navigation
} from 'lucide-react'

// Mocks para las gráficas si no hay suficientes datos
const activityData = [
  { name: 'L', value: 12 }, { name: 'M', value: 19 }, { name: 'M', value: 15 },
  { name: 'J', value: 25 }, { name: 'V', value: 22 }, { name: 'S', value: 30 }, { name: 'D', value: 28 },
];
const COLORS = ['#2563eb', '#10b981', '#ef4444', '#f59e0b'];

// Persistencia de settings en localStorage
const SETTINGS_KEY = 'xgio_admin_settings';
const defaultSettings = {
  adminName: 'Administrador',
  adminEmail: 'admin@xgio.app',
  sosEmailAlerts: true,
  sosSound: true,
  fallAlerts: true,
  batteryWarnThreshold: 30,
  batteryCriticalThreshold: 15,
  bleDeviceName: 'XGIO-Cane-01',
  bleScanTimeout: 15,
  autoExportCSV: false,
  language: 'es',
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch { return defaultSettings; }
}

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Navegación
  const [activeTab, setActiveTab] = useState('dashboard');

  // Notificaciones
  const [showNotifications, setShowNotifications] = useState(false);

  // Mapa — usuario seleccionado para ver en tiempo real
  const [selectedMapUser, setSelectedMapUser] = useState(null);

  // Configuración (persiste en localStorage)
  const [settings, setSettings] = useState(loadSettings);
  const [settingsDraft, setSettingsDraft] = useState(loadSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const updateDraft = (key, value) =>
    setSettingsDraft(prev => ({ ...prev, [key]: value }));

  const saveSettings = () => {
    setSettings(settingsDraft);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsDraft));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const resetSettings = () => {
    setSettingsDraft(defaultSettings);
  };

  // Suscripción en tiempo real a usuarios
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
      },
      (error) => {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Leer últimas ubicaciones de cada usuario en tiempo real
  const [locationsByUser, setLocationsByUser] = useState({});
  useEffect(() => {
    if (users.length === 0) return;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); // YYYY-MM-DD
    const unsubs = users
      .filter(u => u.cane_id)
      .map(user => {
        const ref = collection(db, 'users', user.id, 'CurrentLocation');
        return onSnapshot(ref, snap => {
          // Buscar doc de hoy
          const todayDoc = snap.docs.find(d => d.id === today);
          if (todayDoc) {
            const locs = todayDoc.data().locations || [];
            const last = locs[locs.length - 1] || null;
            setLocationsByUser(prev => ({ ...prev, [user.id]: { last, count: locs.length, date: today } }));
          } else {
            // Buscar el más reciente de cualquier día
            const sorted = snap.docs.sort((a, b) => b.id.localeCompare(a.id));
            if (sorted.length > 0) {
              const locs = sorted[0].data().locations || [];
              const last = locs[locs.length - 1] || null;
              setLocationsByUser(prev => ({ ...prev, [user.id]: { last, count: locs.length, date: sorted[0].id } }));
            }
          }
        });
      });
    return () => unsubs.forEach(u => u());
  }, [users]);

  const exportToCSV = () => {
    if (users.length === 0) return;
    const headers = ['ID,Nombre,Correo,Cane_ID,Fecha_Registro\n'];
    const rows = users.map(u =>
      `"${u.id}","${u.name || ''}","${u.email || ''}","${u.cane_id || ''}","${u.created_at || ''}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "xgio_usuarios_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(user =>
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.cane_id && user.cane_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetAlerts = async () => {
    const usersWithAlerts = users.filter(u => u.last_alert === "SOS" || u.last_alert === "FALL");
    for (const u of usersWithAlerts) {
      try {
        await updateDoc(doc(db, "users", u.id), {
          last_alert: null,
          sos: false
        });
      } catch (err) {
        console.error("Error reseteando alerta para", u.id, err);
      }
    }
  };

  const activeCanesCount = users.filter(u => u.cane_id && u.cane_id.trim() !== "").length;
  const sosCount = users.filter(u => u.last_alert === "SOS").length;
  const deviceStatusData = [
    { name: 'Activos', value: activeCanesCount },
    { name: 'Sin Asignar', value: Math.max(0, users.length - activeCanesCount) }
  ];

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // --- RENDERS POR PESTAÑA ---

  const renderDashboard = () => (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Gestiona los usuarios, bastones y rutas de XGIO en tiempo real.</p>
        </div>
        <button onClick={exportToCSV} style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-header">
            <span className="metric-title">Total de Usuarios</span>
            <Users size={20} color="rgba(255,255,255,0.8)" />
          </div>
          <div className="metric-value">{users.length}</div>
          <div className="metric-change">
            <TrendingUp size={14} className="change-up" />
            <span className="change-up">Activos en plataforma</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Bastones Vinculados</span>
            <Cpu size={20} color="#9ca3af" />
          </div>
          <div className="metric-value">{activeCanesCount}</div>
          <div className="metric-change">
            <span className="change-up">{users.length > 0 ? (activeCanesCount / users.length * 100).toFixed(0) : 0}% de usuarios</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Rutas Registradas</span>
            <Map size={20} color="#9ca3af" />
          </div>
          <div className="metric-value">--</div>
          <div className="metric-change"><span>Métrica en desarrollo</span></div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Alertas S.O.S</span>
            <Bell size={20} color={sosCount > 0 ? "#ef4444" : "#9ca3af"} />
          </div>
          <div className="metric-value" style={{ color: sosCount > 0 ? '#ef4444' : 'white' }}>{sosCount}</div>
          <div className="metric-change" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ color: sosCount > 0 ? '#ef4444' : '#10b981', fontWeight: sosCount > 0 ? '700' : 'normal' }}>
              {sosCount > 0 ? '¡EMERGENCIA ACTIVA!' : 'Todo en orden'}
            </span>
            {sosCount > 0 && (
              <button
                onClick={resetAlerts}
                style={{
                  backgroundColor: '#ef4444', color: 'white', border: 'none',
                  borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
                  fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                }}>
                Resetear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card-panel">
          <h3 className="card-title">Actividad de la Aplicación</h3>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#1f2937' }} contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-panel">
          <h3 className="card-title">Estado de Dispositivos</h3>
          <div style={{ width: '100%', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deviceStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {deviceStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></div> Activos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9ca3af' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div> Sin Asignar
            </div>
          </div>
        </div>
      </div>

      {/* Últimos usuarios registrados */}
      <div className="card-panel">
        <h3 className="card-title">Últimos Registros</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{user.name ? user.name.charAt(0).toUpperCase() : '?'}</div>
                      <span style={{ fontWeight: '500', color: 'white' }}>{user.name || 'Sin Nombre'}</span>
                    </div>
                  </td>
                  <td style={{ color: '#9ca3af' }}>{user.email || 'N/A'}</td>
                  <td><span className={`status-badge ${user.cane_id ? 'status-active' : 'status-pending'}`}>{user.cane_id ? 'Vinculado' : 'Pendiente'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderUsers = () => (
    <div className="card-panel" style={{ flex: 1 }}>
      <h3 className="card-title">Directorio Completo de Usuarios</h3>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo Electrónico</th>
              <th>ID del Bastón (MAC)</th>
              <th>Fecha de Registro</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{user.name ? user.name.charAt(0).toUpperCase() : '?'}</div>
                    <span style={{ fontWeight: '500', color: 'white' }}>{user.name || 'Sin Nombre'}</span>
                  </div>
                </td>
                <td style={{ color: '#9ca3af' }}>{user.email || 'N/A'}</td>
                <td>
                  <span style={{ fontFamily: 'monospace', background: '#1f2937', padding: '4px 8px', borderRadius: '4px' }}>
                    {user.cane_id || 'No Asignado'}
                  </span>
                </td>
                <td style={{ color: '#9ca3af' }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Desconocida'}</td>
                <td><span className={`status-badge ${user.cane_id ? 'status-active' : 'status-pending'}`}>{user.cane_id ? 'Vinculado' : 'Pendiente'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMap = () => {
    // Solo usuarios con bastón que enviaron ubicación en los últimos 5 minutos
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

    // Auto-seleccionar el primero si no hay seleccionado o el seleccionado ya no está activo
    const selected = activeUsers.find(u => u.id === selectedMapUser) || activeUsers[0] || null;

    const formatSecs = (ms) => {
      const s = Math.floor(ms / 1000);
      if (s < 60) return `Hace ${s}s`;
      return `Hace ${Math.floor(s / 60)}min ${s % 60}s`;
    };

    // Google Maps embed URL centrado en el usuario seleccionado
    const mapSrc = selected
      ? `https://www.google.com/maps?q=${selected.last.latitude},${selected.last.longitude}&z=17&output=embed`
      : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Ubicación en Tiempo Real</h1>
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px', marginBottom: 0 }}>
              Mostrando solo usuarios enviando datos ahora mismo
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#0a1628', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '8px 14px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: '600' }}>
              {activeUsers.length} activo{activeUsers.length !== 1 ? 's' : ''} ahora
            </span>
          </div>
        </div>

        {activeUsers.length === 0 ? (
          // Estado vacío
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '16px', backgroundColor: '#0b1221',
            borderRadius: '20px', border: '1px solid #1f2937', padding: '60px 20px',
          }}>
            <div style={{ position: 'relative' }}>
              <MapPin size={56} color="#374151" />
              <div style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '16px', height: '16px', borderRadius: '50%',
                backgroundColor: '#374151', border: '2px solid #111827',
              }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', color: '#9ca3af', margin: '0 0 8px' }}>Ningún usuario activo</h2>
              <p style={{ color: '#4b5563', fontSize: '13px', margin: 0, maxWidth: '360px', lineHeight: '1.6' }}>
                Cuando alguien abra la app y active el seguimiento GPS, aparecerá aquí con su posición en vivo.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', height: 'calc(100vh - 220px)', minHeight: '500px' }}>

            {/* Panel izquierdo — Lista de activos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
              {activeUsers.map(user => {
                const isSelected = (selected?.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedMapUser(user.id)}
                    style={{
                      backgroundColor: isSelected ? '#0f2744' : '#0b1221',
                      border: `1.5px solid ${isSelected ? '#2563eb' : '#1f2937'}`,
                      borderRadius: '14px', padding: '14px 16px',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      outline: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      {/* Avatar con pulso verde */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%',
                          backgroundColor: isSelected ? '#1d4ed8' : '#1f2937',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '15px', color: 'white',
                        }}>
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{
                          position: 'absolute', bottom: '0', right: '0',
                          width: '11px', height: '11px', borderRadius: '50%',
                          backgroundColor: '#22c55e',
                          border: '2px solid #0b1221',
                          boxShadow: '0 0 5px #22c55e',
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.name}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>
                          {user.cane_id}
                        </div>
                      </div>
                    </div>
                    {/* Coords + tiempo */}
                    <div style={{ backgroundColor: '#070e1a', borderRadius: '8px', padding: '8px 10px' }}>
                      <div style={{ color: '#22c55e', fontSize: '10px', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.5px' }}>
                        EN VIVO · {formatSecs(user.diffMs)}
                      </div>
                      <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6' }}>
                        {user.last.latitude.toFixed(6)}<br />
                        {user.last.longitude.toFixed(6)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Panel derecho — Mapa en vivo */}
            <div style={{
              borderRadius: '16px', overflow: 'hidden',
              border: '1px solid #1f2937', position: 'relative',
            }}>
              {/* Badge de usuario activo sobre el mapa */}
              {selected && (
                <div style={{
                  position: 'absolute', top: '14px', left: '14px', zIndex: 10,
                  backgroundColor: '#030712cc', backdropFilter: 'blur(8px)',
                  borderRadius: '10px', padding: '8px 14px',
                  border: '1px solid #1f2937',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                  <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>{selected.name}</span>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>· {formatSecs(selected.diffMs)}</span>
                </div>
              )}

              {/* Enlace a Google Maps en nueva pestaña */}
              {selected && (
                <a
                  href={`https://www.google.com/maps?q=${selected.last.latitude},${selected.last.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute', bottom: '14px', right: '14px', zIndex: 10,
                    backgroundColor: '#030712cc', backdropFilter: 'blur(8px)',
                    borderRadius: '8px', padding: '7px 12px',
                    border: '1px solid #1f2937',
                    color: '#60a5fa', fontSize: '12px', fontWeight: '600',
                    textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  <Navigation size={13} /> Abrir en Maps
                </a>
              )}

              {/* Mapa embed */}
              {mapSrc && (
                <iframe
                  key={mapSrc} // Re-monta cuando cambia la URL (nueva posición)
                  src={mapSrc}
                  title="Ubicación en vivo"
                  width="100%"
                  height="100%"
                  style={{ border: 'none', display: 'block', minHeight: '500px' }}
                  allowFullScreen
                  loading="lazy"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDevices = () => {
    const devicesWithCane = users.filter(u => u.cane_id || u.battery !== undefined || u.ble_connected);

    // Formatear "Última vez visto"
    const formatLastSeen = (last_seen) => {
      if (!last_seen) return null;
      const ts = last_seen.toDate ? last_seen.toDate() : new Date(last_seen);
      const diffMs = Date.now() - ts.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Hace un momento';
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `Hace ${diffH} h`;
      return ts.toLocaleDateString('es-MX');
    };

    return (
      <div className="card-panel" style={{ flex: 1 }}>
        <h3 className="card-title">Salud de Dispositivos — Tiempo Real</h3>
        <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '13px' }}>
          Datos sincronizados directamente desde el bastón vía BLE â†’ app â†’ Firestore. Se actualizan automáticamente cuando el bastón está encendido.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID del Bastón (MAC)</th>
                <th>Propietario</th>
                <th>Batería</th>
                <th>Última Conexión</th>
                <th>Estado BLE</th>
              </tr>
            </thead>
            <tbody>
              {devicesWithCane.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#4b5563', padding: '32px' }}>
                    No hay bastón vinculado a ningún usuario.
                  </td>
                </tr>
              ) : devicesWithCane.map((user) => {
                const battery = user.battery ?? null;
                const isConnected = user.ble_connected === true;
                // Usar umbrales reales desde settings
                const warnAt = settings.batteryWarnThreshold;
                const critAt = settings.batteryCriticalThreshold;
                const batColor = battery === null ? '#4b5563' : battery > warnAt ? '#10b981' : battery > critAt ? '#f59e0b' : '#ef4444';
                const lastSeenText = formatLastSeen(user.last_seen);

                return (
                  <tr key={user.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', background: '#1f2937', padding: '4px 8px', borderRadius: '4px' }}>
                        {user.cane_id}
                      </span>
                    </td>
                    <td><span style={{ color: 'white' }}>{user.name}</span></td>
                    <td>
                      {battery !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Battery size={16} color={batColor} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ color: batColor, fontWeight: '600' }}>
                              {battery}%
                            </span>
                            <div style={{ width: '80px', height: '4px', backgroundColor: '#1f2937', borderRadius: '2px' }}>
                              <div style={{
                                height: '4px', borderRadius: '2px',
                                width: `${battery}%`,
                                backgroundColor: batColor,
                              }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#4b5563', fontSize: '13px' }}>Sin dato</span>
                      )}
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: '13px' }}>
                      {lastSeenText ?? <span style={{ color: '#374151' }}>Nunca</span>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        backgroundColor: isConnected ? '#052e16' : '#1f2937',
                        color: isConnected ? '#4ade80' : '#6b7280',
                        border: `1px solid ${isConnected ? '#16a34a' : '#374151'}`,
                      }}>
                        <Wifi size={12} color={isConnected ? '#4ade80' : '#4b5563'} />
                        {isConnected ? 'Conectado' : 'Sin conexión'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── RENDER SETTINGS ──────────────────────────────────────────────────────────
  const renderSettings = () => {
    const Section = ({ icon: Icon, title, color = '#2563eb', children }) => (
      <div style={{
        backgroundColor: '#111827', border: '1px solid #1f2937',
        borderRadius: '16px', padding: '28px', marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #1f2937' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} color={color} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{title}</h3>
        </div>
        {children}
      </div>
    );

    const Row = ({ label, hint, children }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #1a2234' }}>
        <div>
          <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{label}</div>
          {hint && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>{hint}</div>}
        </div>
        <div style={{ flexShrink: 0, marginLeft: '24px' }}>{children}</div>
      </div>
    );

    const Toggle = ({ value, onChange }) => (
      <button
        onClick={() => onChange(!value)}
        style={{
          width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
          backgroundColor: value ? '#2563eb' : '#374151',
          position: 'relative', transition: 'background-color 0.2s',
        }}
      >
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white',
          position: 'absolute', top: '3px',
          left: value ? '23px' : '3px',
          transition: 'left 0.2s',
        }} />
      </button>
    );

    const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white',
          borderRadius: '8px', padding: '8px 12px', fontSize: '14px',
          outline: 'none', width: '220px',
        }}
      />
    );

    const SliderInput = ({ value, onChange, min, max, color }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: '120px', accentColor: color || '#2563eb' }}
        />
        <span style={{ fontSize: '14px', fontWeight: '700', color: color || '#2563eb', width: '36px', textAlign: 'right' }}>
          {value}%
        </span>
      </div>
    );

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '600' }}>Configuración</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>Personaliza el comportamiento del panel de administración XGIO.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={resetSettings}
              style={{ backgroundColor: '#1f2937', color: '#9ca3af', padding: '10px 16px', borderRadius: '8px', border: '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
            >
              <RefreshCw size={15} /> Restablecer
            </button>
            <button
              onClick={saveSettings}
              style={{ backgroundColor: settingsSaved ? '#059669' : '#2563eb', color: 'white', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', transition: 'background-color 0.3s' }}
            >
              {settingsSaved ? <><Check size={15} /> Guardado</> : <><Save size={15} /> Guardar cambios</>}
            </button>
          </div>
        </div>

        {/* ── 1. Perfil del Administrador */}
        <Section icon={User} title="Perfil del Administrador" color="#8b5cf6">
          <Row label="Nombre del admin" hint="Se muestra en el encabezado y el avatar del panel">
            <TextInput value={settingsDraft.adminName} onChange={v => updateDraft('adminName', v)} placeholder="Ej. Carlos López" />
          </Row>
          <Row label="Correo de contacto" hint="Para identificación interna del administrador">
            <TextInput value={settingsDraft.adminEmail} onChange={v => updateDraft('adminEmail', v)} type="email" placeholder="admin@xgio.app" />
          </Row>
          <Row label="Idioma del panel" hint="Idioma de la interfaz de administración">
            <select
              value={settingsDraft.language}
              onChange={e => updateDraft('language', e.target.value)}
              style={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="es">ðŸ‡²ðŸ‡½ Español</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </Row>
        </Section>

        {/* ── 2. Alertas y Notificaciones */}
        <Section icon={Shield} title="Alertas y Notificaciones" color="#ef4444">
          <Row label="Alertas S.O.S" hint="Mostrar en el panel cuando un usuario presiona el botón de emergencia">
            <Toggle value={settingsDraft.sosEmailAlerts} onChange={v => updateDraft('sosEmailAlerts', v)} />
          </Row>
          <Row label="Alertas de caída" hint="Notificar cuando el bastón detecte una posible caída">
            <Toggle value={settingsDraft.fallAlerts} onChange={v => updateDraft('fallAlerts', v)} />
          </Row>
          <Row label="Sonido de alerta" hint="Reproducir un tono audible al recibir un S.O.S">
            <Toggle value={settingsDraft.sosSound} onChange={v => updateDraft('sosSound', v)} />
          </Row>
          <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: '#1a0a0a', borderRadius: '10px', border: '1px solid #7f1d1d', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} color="#f87171" />
            <p style={{ fontSize: '12px', color: '#fca5a5', margin: 0 }}>Las alertas en tiempo real requieren que la app móvil esté conectada al bastón por BLE y transmitiendo a Firestore.</p>
          </div>
        </Section>

        {/* â”€â”€ 3. Umbrales de Batería */}
        <Section icon={Sliders} title="Umbrales de Batería" color="#f59e0b">
          <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#1a1300', borderRadius: '10px', border: '1px solid #78350f' }}>
            <p style={{ fontSize: '12px', color: '#fcd34d', margin: 0 }}>Estos valores controlan los colores en la tabla de Dispositivos: 🟢 normal · 🟡 advertencia · 🔴 crítico. Los cambios se aplican al guardar.</p>
          </div>
          <Row label="Umbral de advertencia" hint={`Por debajo de ${settingsDraft.batteryWarnThreshold}% el indicador se pone amarillo`}>
            <SliderInput value={settingsDraft.batteryWarnThreshold} onChange={v => updateDraft('batteryWarnThreshold', v)} min={10} max={60} color="#f59e0b" />
          </Row>
          <Row label="Umbral crítico" hint={`Por debajo de ${settingsDraft.batteryCriticalThreshold}% el indicador se pone rojo`}>
            <SliderInput value={settingsDraft.batteryCriticalThreshold} onChange={v => updateDraft('batteryCriticalThreshold', v)} min={5} max={30} color="#ef4444" />
          </Row>
          <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
            {[
              { label: `Normal (>${settingsDraft.batteryWarnThreshold}%)`, color: '#10b981' },
              { label: `Advertencia`, color: '#f59e0b' },
              { label: `Crítico (<${settingsDraft.batteryCriticalThreshold}%)`, color: '#ef4444' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9ca3af' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </Section>

        {/* ── 4. Dispositivos BLE */}
        <Section icon={Bluetooth} title="Configuración de Dispositivos BLE" color="#3b82f6">
          <Row label="Nombre del bastón a buscar" hint="Debe coincidir exactamente con el nombre en el firmware ESP32">
            <TextInput value={settingsDraft.bleDeviceName} onChange={v => updateDraft('bleDeviceName', v)} placeholder="XGIO-Cane-01" />
          </Row>
          <Row label="Timeout de escaneo BLE" hint="Segundos antes de cancelar la búsqueda si no se encuentra el bastón">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range" min={5} max={60} value={settingsDraft.bleScanTimeout}
                onChange={e => updateDraft('bleScanTimeout', Number(e.target.value))}
                style={{ width: '120px', accentColor: '#3b82f6' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6', width: '42px' }}>
                {settingsDraft.bleScanTimeout}s
              </span>
            </div>
          </Row>
          <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: '#0a0f1a', borderRadius: '10px', border: '1px solid #1e3a8a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={16} color="#60a5fa" />
            <p style={{ fontSize: '12px', color: '#93c5fd', margin: 0 }}>El nombre del bastón también debe actualizarse en <code style={{ backgroundColor: '#1e3a8a', padding: '1px 5px', borderRadius: '4px' }}>app/lib/bleService.js</code> si se cambia en el firmware.</p>
          </div>
        </Section>

        {/* â”€â”€ 5. Exportación y Sistema */}
        <Section icon={Download} title="Exportación de Datos" color="#10b981">
          <Row label="Exportación automática al cargar" hint="Genera el CSV de usuarios automáticamente al abrir el dashboard">
            <Toggle value={settingsDraft.autoExportCSV} onChange={v => updateDraft('autoExportCSV', v)} />
          </Row>
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={exportToCSV}
              style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '10px 16px', borderRadius: '8px', border: '1px solid #065f46', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
            >
              <Download size={15} /> Exportar usuarios ahora
            </button>
          </div>
        </Section>

        {/* â”€â”€ 6. Información del sistema */}
        <Section icon={Info} title="Información del Sistema" color="#6b7280">
          {[
            { label: 'Versión del Dashboard', value: 'v1.2.0' },
            { label: 'Proyecto Firebase', value: 'bastones-1c9b6' },
            { label: 'Backend (Vercel)', value: 'xgio-backend.vercel.app', link: 'https://xgio-backend.vercel.app' },
            { label: 'Usuarios registrados', value: `${users.length} en Firestore` },
            { label: 'Bastones vinculados', value: `${users.filter(u => u.cane_id).length} dispositivos` },
          ].map(({ label, value, link }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a2234' }}>
              <span style={{ fontSize: '13px', color: '#9ca3af' }}>{label}</span>
              {link
                ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                  {value} <ExternalLink size={12} />
                </a>
                : <span style={{ fontSize: '13px', color: 'white', fontWeight: '500', fontFamily: 'monospace' }}>{value}</span>
              }
            </div>
          ))}
        </Section>
      </>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <Map size={28} color="#2563eb" />
          <span className="logo-text">XGIO Admin</span>
        </div>

        <div className="menu-section">
          <div className="menu-title">MENÚ PRINCIPAL</div>
          <a className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a className={`menu-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={20} /> Usuarios
          </a>
          <a className={`menu-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
            <Map size={20} /> Rutas & Mapas
          </a>
          <a className={`menu-item ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')}>
            <Cpu size={20} /> Dispositivos
          </a>
        </div>

        <div className="menu-section">
          <div className="menu-title">SISTEMA</div>
          <a className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={20} /> Configuración
          </a>
          <a className="menu-item"><HelpCircle size={20} /> Soporte</a>
          <a className="menu-item" style={{ marginTop: '20px' }}><LogOut size={20} /> Cerrar Sesión</a>
        </div>

        <div className="download-card">
          <h4>Aplicación Móvil</h4>
          <p>Obtén la app de XGIO para pruebas en Android.</p>
          <button className="download-btn" onClick={() => alert("Próximamente: Link directo a la descarga de la APK en Vercel.")}>
            Descargar APK
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="search-bar">
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Buscar usuarios o bastones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="user-profile">
            <button className="icon-btn"><Mail size={20} /></button>
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell size={20} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #111827' }}></div>
              </button>

              {showNotifications && (
                <div style={{ position: 'absolute', top: '50px', right: '0', width: '300px', backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px', padding: '16px', zIndex: 50, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>Notificaciones S.O.S</h4>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0' }}>
                    <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', color: 'white' }}>Alerta Simulada: Bastón BASTON-001</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#9ca3af' }}>Esperando integración de hardware real.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="profile-info">
              <div className="avatar">{settings.adminName.charAt(0).toUpperCase()}</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>{settings.adminName}</div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'map' && renderMap()}
        {activeTab === 'devices' && renderDevices()}
        {activeTab === 'settings' && renderSettings()}

      </main>
    </div>
  )
}

export default App
