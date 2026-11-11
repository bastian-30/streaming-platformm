import { useEffect, useState } from 'react';
import {
  Activity, AudioLines, BarChart3, BookOpenText, Clapperboard,
  Film, Home, Image, Menu, Radio, Search, Settings, ShieldCheck,
  Users, Video, X, Bell, Play, Wifi
} from 'lucide-react';

type Section = 'Inicio' | 'Biblioteca' | 'En vivo' | 'Transmitir' | 'Publicaciones' | 'Administración' | 'Configuración';
type Health = { status: string; database: string };

// URL de la API: en desarrollo apunta al backend local; en Docker se construye
// con VITE_API_URL=/api para pasar por el proxy de nginx
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const navigation: { label: Section; icon: typeof Home }[] = [
  { label: 'Inicio', icon: Home },
  { label: 'Biblioteca', icon: Film },
  { label: 'En vivo', icon: Radio },
  { label: 'Transmitir', icon: Video },
  { label: 'Publicaciones', icon: BookOpenText },
  { label: 'Administración', icon: ShieldCheck },
  { label: 'Configuración', icon: Settings },
];

const descriptions: Record<Section, string> = {
  Inicio: 'Descubre contenido y transmisiones de tu plataforma.',
  Biblioteca: 'Organiza y consulta videos, audios e imágenes.',
  'En vivo': 'Mira las transmisiones públicas disponibles.',
  Transmitir: 'Prepara tu cámara y micrófono para emitir en directo.',
  Publicaciones: 'Noticias, anuncios y contenido escrito.',
  Administración: 'Gestiona usuarios, contenido y actividad.',
  Configuración: 'Preferencias y estado de los servicios.',
};

function App() {
  const [section, setSection] = useState<Section>('Inicio');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((response) => {
        if (!response.ok) throw new Error('API no disponible');
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const selectSection = (label: Section) => {
    setSection(label);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Play size={21} fill="currentColor" /></div>
          <div><strong>Streaming</strong><span>PLATFORM</span></div>
          <button className="icon-button close-menu" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X /></button>
        </div>

        <div className="workspace-label">PLATAFORMA</div>
        <nav className="nav-list">
          {navigation.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${section === label ? 'active' : ''}`} onClick={() => selectSection(label)}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
              {label === 'En vivo' && <i className="live-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="storage-card">
            <div className="storage-icon"><Wifi size={17} /></div>
            <div><strong>Servidor local</strong><span>{health?.status === 'ok' ? 'Conectado' : 'Sin conexión'}</span></div>
            <span className={`status-dot ${health?.status === 'ok' ? 'online' : ''}`} />
          </div>
          <div className="profile">
            <div className="avatar">SP</div>
            <div><strong>Visitante</strong><span>Acceso público</span></div>
            <button className="icon-button" aria-label="Notificaciones"><Bell size={18} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu /></button>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{section}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contenido..." /></label>
            <div className="top-avatar">SP</div>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> STREAMING PLATFORM</div><h1>{section}</h1><p>{descriptions[section]}</p></div>
            <div className="heading-status"><span className={`status-dot ${health?.status === 'ok' ? 'online' : ''}`} />{health?.status === 'ok' ? 'Servicios conectados' : 'Modo de demostración'}</div>
          </section>

          {section === 'Inicio' ? (
            <>
              <section className="hero">
                <div className="hero-content">
                  <span className="hero-tag"><span className="live-dot" /> TU ESPACIO MULTIMEDIA</span>
                  <h2>Todo tu contenido.<br /><em>En un solo lugar.</em></h2>
                  <p>Explora videos, escucha audio y descubre transmisiones en vivo desde Streaming Platform.</p>
                  <button className="primary-button" onClick={() => selectSection('Biblioteca')}><Play size={16} fill="currentColor" /> Explorar biblioteca</button>
                </div>
                <div className="hero-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-play"><Play size={48} fill="currentColor" /></div><div className="art-wave wave-one" /><div className="art-wave wave-two" /></div>
              </section>

              <div className="section-title"><div><h3>Explora la plataforma</h3><p>Accede rápidamente a cada apartado</p></div></div>
              <div className="quick-grid">
                <QuickCard icon={<Clapperboard />} title="Biblioteca multimedia" detail="Videos, audios e imágenes" onClick={() => selectSection('Biblioteca')} />
                <QuickCard icon={<Radio />} title="Transmisiones en vivo" detail="Contenido en directo" onClick={() => selectSection('En vivo')} />
                <QuickCard icon={<BookOpenText />} title="Publicaciones" detail="Noticias y contenido escrito" onClick={() => selectSection('Publicaciones')} />
                <QuickCard icon={<BarChart3 />} title="Administración" detail="Control de la plataforma" onClick={() => selectSection('Administración')} />
              </div>

              <div className="section-title lower-title"><div><h3>Actividad de la plataforma</h3><p>Resumen de los servicios locales</p></div></div>
              <div className="stats-grid">
                <Stat icon={<Film />} label="Biblioteca" value="Preparada" note="Módulo inicial" />
                <Stat icon={<Radio />} label="Streaming" value="Pendiente" note="Integración Ant Media" />
                <Stat icon={<Users />} label="Usuarios" value="Pendiente" note="Autenticación por implementar" />
                <Stat icon={<Activity />} label="API" value={health?.status === 'ok' ? 'En línea' : 'Desconectada'} note={health?.database === 'connected' ? 'PostgreSQL conectado' : 'Verifica el backend'} />
              </div>
            </>
          ) : (
            <SectionPanel section={section} search={search} onGoLive={() => selectSection('Transmitir')} />
          )}

          <footer>© 2026 Streaming Platform <span>Desarrollado con React · TypeScript · PWA</span></footer>
        </div>
      </main>
    </div>
  );
}

function QuickCard({ icon, title, detail, onClick }: { icon: React.ReactNode; title: string; detail: string; onClick: () => void }) {
  return <button className="quick-card" onClick={onClick}><div className="quick-icon">{icon}</div><div><strong>{title}</strong><span>{detail}</span></div><span className="card-arrow">↗</span></button>;
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <div className="stat-card"><div className="stat-top">{icon}<span>{label}</span></div><strong>{value}</strong><small>{note}</small></div>;
}

function SectionPanel({ section, search, onGoLive }: { section: Section; search: string; onGoLive: () => void }) {
  const [permission, setPermission] = useState('sin comprobar');
  const [cameraMessage, setCameraMessage] = useState('');
  const [title, setTitle] = useState('');
  const [post, setPost] = useState('');

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermission('concedido');
      setCameraMessage('Permisos concedidos. La cámara y el micrófono funcionan en este dispositivo.');
    } catch {
      setPermission('denegado');
      setCameraMessage('No se pudieron obtener permisos. Revisa los permisos del navegador y usa localhost o HTTPS.');
    }
  };

  if (section === 'Transmitir') return <div className="panel-card"><div className="panel-icon"><Video /></div><h2>Preparar transmisión</h2><p>Comprueba que tu navegador puede acceder a la cámara y al micrófono. La emisión real se habilitará al integrar Ant Media Server.</p><div className="permission-row"><span>Permisos de cámara y micrófono</span><strong>{permission}</strong></div><button className="primary-button" onClick={checkCamera}>Comprobar permisos</button>{cameraMessage && <p className="feedback">{cameraMessage}</p>}</div>;

  if (section === 'Administración') return <div className="panel-card"><div className="panel-icon"><ShieldCheck /></div><h2>Panel de administración</h2><p>Este apartado se conectará con la autenticación y los roles de administrador y colaborador. Por ahora se muestra como vista inicial; todavía no protege operaciones.</p><div className="notice">La administración debe quedar restringida en el servidor, no solo en la interfaz.</div></div>;

  if (section === 'Configuración') return <div className="panel-card"><div className="panel-icon"><Settings /></div><h2>Estado de los servicios</h2><p>API: <strong>{API_BASE_URL}</strong></p><p>Base de datos: PostgreSQL en el puerto 5433 (local) o 5432 (Docker).</p><p>Estado PWA: manifest y service worker configurados con actualización automática.</p></div>;

  if (section === 'En vivo') return <div className="panel-card"><div className="panel-icon"><Radio /></div><span className="coming-tag">MÓDULO EN PREPARACIÓN</span><h2>Transmisiones en vivo</h2><p>Aquí aparecerán las transmisiones públicas. Las transmisiones privadas requerirán autenticación y autorización.</p><button className="primary-button" onClick={onGoLive}><Video size={17} /> Preparar una transmisión</button></div>;

  if (section === 'Publicaciones') return <div className="panel-card"><div className="panel-icon"><BookOpenText /></div><h2>Publicaciones</h2><p>El formulario y el guardado en PostgreSQL se incorporarán en la siguiente etapa.</p><label className="field-label">Título de ejemplo</label><input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Escribe un título" /><label className="field-label">Contenido</label><textarea className="text-field" value={post} onChange={(e) => setPost(e.target.value)} placeholder="Escribe una publicación..." rows={4} /><p className="feedback">Vista previa local: {title || 'Sin título'} · {post.length} caracteres. Aún no se guarda en la base de datos.</p></div>;

  const q = search.trim().toLowerCase();
  const items = [
    { icon: <Film />, title: 'Videos', desc: 'Reproducción de contenido audiovisual' },
    { icon: <AudioLines />, title: 'Audios', desc: 'Contenido de audio y podcasts' },
    { icon: <Image />, title: 'Imágenes', desc: 'Galería de imágenes' }
  ].filter((item) => !q || `${item.title} ${item.desc}`.toLowerCase().includes(q));

  return <div className="library-grid">{items.length ? items.map((item) => <div className="library-card" key={item.title}><div className="quick-icon">{item.icon}</div><h3>{item.title}</h3><p>{item.desc}</p><span className="coming-tag">ALMACENAMIENTO POR IMPLEMENTAR</span></div>) : <p>No se encontraron categorías para “{search}”.</p>}</div>;
}

export default App;
