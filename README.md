# Streaming Platform

Starter local de una PWA de streaming con React + TypeScript, Express + TypeScript y PostgreSQL.

## Requisitos
- Ubuntu Linux
- Node.js LTS (20 o 22) y npm
- Docker Engine o Docker Desktop con Compose

## Despliegue rápido con Docker (todo el stack)

La forma más simple de ejecutar todo (PostgreSQL + backend + frontend):

```bash
cp .env.example .env    # luego edita JWT_SECRET y ADMIN_PASSWORD
docker compose up -d --build
docker compose ps       # los tres servicios deben quedar "healthy"
```

- Frontend (PWA con nginx): http://localhost:8080
- API: http://localhost:3001/api/health (también http://localhost:8080/api/health vía proxy)
- PostgreSQL: puerto 5433 en el host, credenciales de `.env`.

En el primer arranque se aplican las migraciones y se crea un usuario
administrador con `ADMIN_EMAIL`/`ADMIN_PASSWORD` del `.env` raíz. Los datos
persisten en los volúmenes `streaming_pgdata` (base de datos) y
`streaming_uploads` (archivos subidos): `docker compose down` los conserva y
`docker compose down -v` los borra.

### Integración de Ant Media Server (opcional)

El archivo `docker-compose.yml` incluye un servicio `antmedia` comentado.
Para habilitar la emisión en vivo real:

1. Descomenta el bloque del servicio `antmedia` (imagen `antmedia/community`).
2. Ejecuta `docker compose up -d antmedia` y abre http://localhost:5080 para
   configurar la aplicación `LiveApp`.
3. `ANTMEDIA_BASE_URL` (por defecto `http://localhost:5080/LiveApp`) debe ser
   la URL **vista desde el navegador**. En despliegues con dominio cámbiala
   por `https://tu-dominio:5443/LiveApp`.

Las transmisiones privadas solo exponen sus URLs de reproducción
(`GET /api/streams/:id/playback`, HLS y WebRTC) al dueño o a un administrador.

## 1. Desarrollo local (sin Docker para la app)

### Base de datos
Desde la raíz del proyecto:
```bash
docker compose up -d postgres
docker compose ps
```

### Backend
```bash
cd backend
cp .env.example .env
# Genera un secreto JWT y cópialo en .env:
openssl rand -base64 48
npm install
npm run db:setup   # aplica el esquema (idempotente)
npm run dev        # crea el admin inicial si no existe ninguno
```
API: http://localhost:3001/api/health

### Estructura del backend
```
backend/src/
  config/        variables de entorno y CORS
  database/      cliente PostgreSQL y migraciones
  middleware/     autenticación JWT, roles, rate limit, subida de archivos, errores
  validators/     esquemas de validación (Zod)
  models/         acceso a datos (SQL parametrizado)
  services/       lógica de negocio y permisos
  controllers/    manejadores de petición/respuesta
  routes/         routers Express por recurso
```

### Endpoints disponibles (`/api`)
| Recurso | Endpoints | Acceso |
|---|---|---|
| Salud | `GET /health` | público |
| Autenticación | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | público / token |
| Usuarios | `GET/PUT/DELETE /users`, `GET /users/:id` | admin o propio |
| Roles | `GET/POST/PUT/DELETE /roles` | autenticado / admin |
| Publicaciones | `GET/POST/PUT/DELETE /posts` | lectura pública, escritura autenticada |
| Multimedia | `POST /media` (multipart), `GET /media/:id/file`, `GET/PUT/DELETE /media` | lectura pública, subida autenticada |
| Categorías | `GET/POST/PUT/DELETE /categories` | lectura pública, admin |
| Transmisiones | `GET/POST/PUT/PATCH/DELETE /streams` (`PATCH /streams/:id/status`, `GET /streams/:id/playback`) | lectura pública, gestión autenticada |
| Estadísticas | `GET /stats` | admin |
| Auditoría | `GET /activity-logs` | admin |

Protecciones implementadas: validación Zod en todas las entradas, manejo centralizado de errores, CORS restringido por `CORS_ORIGIN`, límites de solicitudes (general y específico en `/auth`), cabeceras de seguridad con Helmet, subida de archivos con lista blanca de tipos MIME y tamaño máximo, contraseñas con bcrypt y tokens JWT firmados con `JWT_SECRET` de `.env`.

### Seguridad y permisos
- **Visibilidad por recurso**: cada publicación, archivo y transmisión puede ser `public` o `private`. Los anónimos solo ven lo público; los usuarios autenticados ven lo público y lo suyo; el admin ve todo. Los recursos privados ajenos devuelven 404 (no filtran su existencia).
- **Permisos por rol**: el sistema de roles distingue usuarios del sistema (`is_system`) y el middleware `requireRole` protege las rutas de administración (`/users`, `/stats`, `/activity-logs`, gestión de categorías y roles).
- **Auditoría**: la tabla `activity_logs` registra registros, inicios de sesión (incluidos los fallidos), y todo cambio en usuarios, roles, publicaciones, multimedia, categorías y transmisiones, con usuario, IP y detalles. `GET /api/activity-logs` (solo admin) la consulta paginada.
- **Credenciales**: los secretos viven en archivos `.env` (excluidos de Git e imágenes Docker), nunca en el código. En producción se exige un `JWT_SECRET` de al menos 32 caracteres y se crea el administrador inicial desde variables de entorno.

## 2. Frontend (desarrollo)
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
Abrir http://localhost:5173 (usa la API en http://localhost:3001; configurable con `VITE_API_URL`).

## 3. Probar la PWA
```bash
cd frontend
npm run build
npm run preview -- --host 0.0.0.0
```
Abrir la dirección que indique Vite Preview en Chrome. Para instalar, usar el icono/opción "Instalar Streaming Platform" del navegador. La instalación PWA requiere HTTPS o localhost.

Características de la PWA:
- Manifest (`manifest.webmanifest`) con nombre "Streaming Platform", nombre corto "Streaming", tema oscuro, `display: standalone` e iconos PNG de 192×192 y 512×512 (normales y maskable).
- Service Worker con actualización automática (`autoUpdate` + comprobación periódica) y limpieza de cachés antiguas.
- Funcionamiento sin conexión: el app shell se precachea y la navegación tiene respaldo en `index.html`.
- Estrategia de caché: contenido público con "network first" y **sin caché** para autenticación, datos privados de usuarios, estadísticas y transmisiones en vivo. Ninguna petición con cabecera `Authorization` se almacena en caché.
- Interfaz adaptativa a móvil y escritorio (menú lateral deslizante, rejillas y tipografía reajustadas en pantallas pequeñas).

## 4. Pruebas

Suite de pruebas integrales de la API (56 comprobaciones: autenticación,
permisos, visibilidad pública/privada, subida de archivos, transiciones de
estado de transmisiones, estadísticas, auditoría y limpieza):

```bash
cd backend
npm run test:api                        # contra http://localhost:3001
npm run test:api -- http://otra-url:3001
```

Requiere `python3` y `curl`, y credenciales de administrador definidas en
`ADMIN_EMAIL`/`ADMIN_PASSWORD` (variables de entorno o los archivos `.env`).
Verificación estática y de build:

```bash
cd backend && npx tsc --noEmit && npm run build
cd frontend && npm run build
```

## Comandos útiles
```bash
# aplicar cambios del esquema SQL
cd backend && npm run db:setup

# detener el stack completo (conserva los datos)
docker compose down

# detener y eliminar también los datos locales (¡borra la BD y los archivos!)
docker compose down -v

# ver el registro de auditoría (requiere token de admin)
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/activity-logs
```

## Estado de esta entrega
- Interfaz oscura y navegación entre secciones.
- PWA instalable (Android y escritorio) con manifest y service worker.
- API REST organizada por capas con autenticación JWT, roles, CRUD completo y subida de archivos.
- Despliegue completo con Docker Compose (PostgreSQL, backend y frontend con nginx) y volumen persistente de datos; integración preparada para Ant Media Server (servicio incluido como comentario en el compose).
- Registro de auditoría de todas las operaciones y transmisiones privadas con URLs de reproducción solo para dueño/administrador.
- La emisión real en vivo se integrará con Ant Media Server en las siguientes etapas. No se debe publicar esta configuración local en Internet: cambia las contraseñas y el `JWT_SECRET` antes de producción.
