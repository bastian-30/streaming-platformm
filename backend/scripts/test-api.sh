#!/usr/bin/env bash
# Pruebas integrales de la API de Streaming Platform.
# Uso: npm run test:api -- [URL_BASE]
#   npm run test:api                      # contra http://localhost:3001
#   npm run test:api -- http://localhost:3001
# Requiere: python3 y curl. Lee ADMIN_EMAIL/ADMIN_PASSWORD de variables de
# entorno o de los archivos .env (raíz o backend/).

set -u

API="${1:-${API_URL:-http://localhost:3001}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0

ok() { PASS=$((PASS + 1)); printf '  ✓ %s\n' "$1"; }
ko() { FAIL=$((FAIL + 1)); printf '  ✗ %s\n' "$1"; }
check() {
  local description="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then ok "$description ($actual)"; else ko "$description (esperaba $expected, obtuvo $actual)"; fi
}
jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }
jcode() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# Credenciales del administrador: entorno → .env raíz → backend/.env
find_env() {
  local key="$1" file
  for file in "$ROOT_DIR/.env" "$BACKEND_DIR/.env"; do
    if [ -f "$file" ]; then
      value=$(grep -E "^${key}=" "$file" | head -1 | cut -d= -f2-)
      if [ -n "$value" ]; then printf '%s' "$value"; return; fi
    fi
  done
}
ADMIN_EMAIL="${ADMIN_EMAIL:-$(find_env ADMIN_EMAIL)}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(find_env ADMIN_PASSWORD)}"

STAMP="$(date +%s)"
COLAB_EMAIL="colab.test.$STAMP@streaming.local"
COLAB_PASSWORD="Password$STAMP"
STRANGER_EMAIL="stranger.test.$STAMP@streaming.local"
STRANGER_PASSWORD="Password$STAMP"
ADMIN_EMAIL_TEST="${ADMIN_EMAIL:-admin@streaming.local}"
ADMIN_PASSWORD_TEST="${ADMIN_PASSWORD:?No hay ADMIN_PASSWORD disponible (define la variable o backend/.env)}"

printf '\nPruebas contra %s\n' "$API"
printf 'Admin: %s\n\n' "$ADMIN_EMAIL_TEST"

echo "── Salud y autenticación ──────────────────────────────"
HEALTH=$(curl -s "$API/api/health" || echo '{}')
[ "$(echo "$HEALTH" | jget "['status']")" = "ok" ] && ok "health: status ok" || ko "health: status no ok"
check "GET /api/health" 200 "$(jcode "$API/api/health")"

REG=$(curl -s -X POST "$API/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$COLAB_EMAIL\",\"password\":\"$COLAB_PASSWORD\",\"display_name\":\"Colab Test\"}")
COLAB_TOKEN=$(echo "$REG" | jget "['token']")
[ -n "$COLAB_TOKEN" ] && ok "register colaborador (token emitido)" || ko "register colaborador: sin token"
check "register duplicado" 409 "$(jcode -X POST "$API/api/auth/register" -H 'Content-Type: application/json' -d "{\"email\":\"$COLAB_EMAIL\",\"password\":\"$COLAB_PASSWORD\"}")"
check "register contraseña inválida" 422 "$(jcode -X POST "$API/api/auth/register" -H 'Content-Type: application/json' -d '{"email":"x@x.local","password":"123"}')"
check "login incorrecto" 401 "$(jcode -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$COLAB_EMAIL\",\"password\":\"mala\"}")"

STRANGER_TOKEN=$(curl -s -X POST "$API/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$STRANGER_EMAIL\",\"password\":\"$STRANGER_PASSWORD\"}" | jget "['token']")
[ -n "$STRANGER_TOKEN" ] && ok "register usuario ajeno de prueba" || ko "register usuario ajeno"
AUTH_STRANGER="Authorization: Bearer $STRANGER_TOKEN"

ADMIN_LOGIN=$(curl -s -X POST "$API/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL_TEST\",\"password\":\"$ADMIN_PASSWORD_TEST\"}")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jget "['token']")
[ -n "$ADMIN_TOKEN" ] && ok "login administrador (token emitido)" || ko "login administrador: sin token (¿ADMIN_PASSWORD correcto?)"

if [ -z "$ADMIN_TOKEN" ] || [ -z "$COLAB_TOKEN" ]; then
  echo "No se pueden ejecutar más pruebas sin tokens."; exit 1
fi

AUTH_ADMIN="Authorization: Bearer $ADMIN_TOKEN"
AUTH_COLAB="Authorization: Bearer $COLAB_TOKEN"

echo "── Protección de rutas ────────────────────────────────"
check "GET /users sin token" 401 "$(jcode "$API/api/users")"
check "GET /users como colaborador" 403 "$(jcode -H "$AUTH_COLAB" "$API/api/users")"
check "GET /users como admin" 200 "$(jcode -H "$AUTH_ADMIN" "$API/api/users")"
check "GET /stats como colaborador" 403 "$(jcode -H "$AUTH_COLAB" "$API/api/stats")"
check "GET /stats como admin" 200 "$(jcode -H "$AUTH_ADMIN" "$API/api/stats")"
check "GET /activity-logs como colaborador" 403 "$(jcode -H "$AUTH_COLAB" "$API/api/activity-logs")"
check "GET /activity-logs como admin" 200 "$(jcode -H "$AUTH_ADMIN" "$API/api/activity-logs")"
check "ruta inexistente" 404 "$(jcode "$API/api/no-existe")"

echo "── Roles ──────────────────────────────────────────────"
check "GET /roles autenticado" 200 "$(jcode -H "$AUTH_COLAB" "$API/api/roles")"
check "crear rol como colaborador" 403 "$(jcode -X POST -H "$AUTH_COLAB" -H 'Content-Type: application/json' -d '{"name":"hacker"}' "$API/api/roles")"
NEW_ROLE=$(curl -s -X POST -H "$AUTH_ADMIN" -H 'Content-Type: application/json' -d '{"name":"tester"}' "$API/api/roles" | jget "['id']")
[ -n "$NEW_ROLE" ] && ok "crear rol tester (admin)" || ko "crear rol tester"
check "eliminar rol del sistema" 409 "$(jcode -X DELETE -H "$AUTH_ADMIN" "$API/api/roles/1")"
check "eliminar rol creado" 204 "$(jcode -X DELETE -H "$AUTH_ADMIN" "$API/api/roles/$NEW_ROLE")"

echo "── Categorías ──────────────────────────────────────────"
CAT=$(curl -s -X POST -H "$AUTH_ADMIN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Prueba $STAMP\",\"slug\":\"prueba-$STAMP\"}" "$API/api/categories")
CAT_ID=$(echo "$CAT" | jget "['id']")
[ -n "$CAT_ID" ] && ok "crear categoría (admin)" || ko "crear categoría"
check "categoría duplicada" 409 "$(jcode -X POST -H "$AUTH_ADMIN" -H 'Content-Type: application/json' -d "{\"name\":\"Prueba $STAMP\",\"slug\":\"prueba-$STAMP\"}" "$API/api/categories")"
check "listar categorías (público)" 200 "$(jcode "$API/api/categories")"

echo "── Publicaciones y visibilidad ────────────────────────"
PUB_POST=$(curl -s -X POST -H "$AUTH_COLAB" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Pública $STAMP\",\"body\":\"Contenido público\",\"visibility\":\"public\",\"category_id\":$CAT_ID}" "$API/api/posts")
PUB_ID=$(echo "$PUB_POST" | jget "['id']")
PRIV_POST=$(curl -s -X POST -H "$AUTH_COLAB" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Privada $STAMP\",\"body\":\"Contenido privado\",\"visibility\":\"private\"}" "$API/api/posts")
PRIV_ID=$(echo "$PRIV_POST" | jget "['id']")
[ -n "$PUB_ID" ] && [ -n "$PRIV_ID" ] && ok "crear posts pública y privada" || ko "crear posts"

ANON_POSTS=$(curl -s "$API/api/posts" | python3 -c "import sys,json; posts=json.load(sys.stdin); print(sum(1 for p in posts if p['id'] in ('$PUB_ID','$PRIV_ID')))")
[ "$ANON_POSTS" = "1" ] && ok "anónimo solo ve la pública" || ko "anónimo ve $ANON_POSTS de 2 (esperaba 1)"
COLAB_POSTS=$(curl -s -H "$AUTH_COLAB" "$API/api/posts" | python3 -c "import sys,json; posts=json.load(sys.stdin); print(sum(1 for p in posts if p['id'] in ('$PUB_ID','$PRIV_ID')))")
[ "$COLAB_POSTS" = "2" ] && ok "autor ve la pública y su privada" || ko "autor ve $COLAB_POSTS de 2 (esperaba 2)"
check "GET post privada anónimo" 404 "$(jcode "$API/api/posts/$PRIV_ID")"
check "editar post ajeno (colaborador)" 403 "$(jcode -X PUT -H "$AUTH_STRANGER" -H 'Content-Type: application/json' -d '{"title":"hack"}' "$API/api/posts/$PUB_ID")"
check "editar post ajeno (admin permitido)" 200 "$(jcode -X PUT -H "$AUTH_ADMIN" -H 'Content-Type: application/json' -d '{"title":"Editada"}' "$API/api/posts/$PUB_ID")"
check "borrar categoría en uso" 409 "$(jcode -X DELETE -H "$AUTH_ADMIN" "$API/api/categories/$CAT_ID")"

echo "── Multimedia y archivos ──────────────────────────────"
PNG=/tmp/streaming-test-icon.png
python3 -c "
import struct, zlib
def chunk(t, d):
    c = t + d
    return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)
raw = b'\x00' + b'\x8b\x5c\xf6\xff'
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
open('$PNG', 'wb').write(png)
"
PUB_MEDIA=$(curl -s -X POST -H "$AUTH_COLAB" -F "file=@$PNG;type=image/png" -F "title=Icono test" -F "visibility=public" "$API/api/media")
PUB_MEDIA_ID=$(echo "$PUB_MEDIA" | jget "['id']")
[ -n "$PUB_MEDIA_ID" ] && ok "subir imagen pública" || ko "subir imagen pública: $(echo "$PUB_MEDIA" | head -c 120)"
PRIV_MEDIA=$(curl -s -X POST -H "$AUTH_COLAB" -F "file=@$PNG;type=image/png" -F "title=Privada" -F "visibility=private" "$API/api/media")
PRIV_MEDIA_ID=$(echo "$PRIV_MEDIA" | jget "['id']")
check "archivo tipo no permitido" 415 "$(jcode -X POST -H "$AUTH_COLAB" -F "file=@$PNG;filename=x.png;type=text/plain" "$API/api/media")"
check "servir archivo público anónimo" 200 "$(jcode "$API/api/media/$PUB_MEDIA_ID/file")"
check "archivo privado anónimo" 404 "$(jcode "$API/api/media/$PRIV_MEDIA_ID/file")"
check "archivo privado del dueño" 200 "$(jcode -H "$AUTH_COLAB" "$API/api/media/$PRIV_MEDIA_ID/file")"

echo "── Transmisiones en vivo ──────────────────────────────"
STREAM=$(curl -s -X POST -H "$AUTH_COLAB" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Directo test $STAMP\",\"visibility\":\"private\"}" "$API/api/streams")
STREAM_ID=$(echo "$STREAM" | jget "['id']")
STREAM_KEY=$(echo "$STREAM" | jget "['stream_id']")
[ -n "$STREAM_ID" ] && ok "crear transmisión privada (stream_id: $STREAM_KEY)" || ko "crear transmisión"
check "transmisión privada anónimo" 404 "$(jcode "$API/api/streams/$STREAM_ID")"
check "playback privado anónimo" 404 "$(jcode "$API/api/streams/$STREAM_ID/playback")"
check "playback privado del dueño" 200 "$(jcode -H "$AUTH_COLAB" "$API/api/streams/$STREAM_ID/playback")"
STREAM_PUB=$(curl -s -X POST -H "$AUTH_COLAB" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Directo público $STAMP\",\"visibility\":\"public\"}" "$API/api/streams")
STREAM_PUB_ID=$(echo "$STREAM_PUB" | jget "['id']")
check "cambiar estado ajeno" 403 "$(jcode -X PATCH -H "$AUTH_STRANGER" -H 'Content-Type: application/json' -d '{"status":"live"}' "$API/api/streams/$STREAM_PUB_ID/status")"
check "scheduled → live" 200 "$(jcode -X PATCH -H "$AUTH_COLAB" -H 'Content-Type: application/json' -d '{"status":"live"}' "$API/api/streams/$STREAM_PUB_ID/status")"
check "live → scheduled (inválida)" 409 "$(jcode -X PATCH -H "$AUTH_COLAB" -H 'Content-Type: application/json' -d '{"status":"scheduled"}' "$API/api/streams/$STREAM_PUB_ID/status")"
check "live → ended" 200 "$(jcode -X PATCH -H "$AUTH_COLAB" -H 'Content-Type: application/json' -d '{"status":"ended"}' "$API/api/streams/$STREAM_PUB_ID/status")"

echo "── Estadísticas y auditoría ───────────────────────────"
STATS=$(curl -s -H "$AUTH_ADMIN" "$API/api/stats")
[ "$(echo "$STATS" | jget "['overview']['streams']")" -ge 1 ] 2>/dev/null && ok "stats incluye transmisiones" || ko "stats no incluye transmisiones"
LOGS=$(curl -s -H "$AUTH_ADMIN" "$API/api/activity-logs?limit=100")
HAS_LOGIN=$(echo "$LOGS" | python3 -c "import sys,json; logs=json.load(sys.stdin); print('auth.login' in [e['action'] for e in logs['entries']])")
[ "$HAS_LOGIN" = "True" ] && ok "registro de actividades: login registrado" || ko "registro de actividades sin login"
HAS_STREAM=$(echo "$LOGS" | python3 -c "import sys,json; logs=json.load(sys.stdin); print('stream.create' in [e['action'] for e in logs['entries']])")
[ "$HAS_STREAM" = "True" ] && ok "registro de actividades: stream.create registrado" || ko "registro de actividades sin stream.create"

echo "── Limpieza de datos de prueba ────────────────────────"
check "borrar post privada" 204 "$(jcode -X DELETE -H "$AUTH_COLAB" "$API/api/posts/$PRIV_ID")"
check "borrar post pública" 204 "$(jcode -X DELETE -H "$AUTH_COLAB" "$API/api/posts/$PUB_ID")"
check "borrar media pública" 204 "$(jcode -X DELETE -H "$AUTH_COLAB" "$API/api/media/$PUB_MEDIA_ID")"
check "borrar media privada" 204 "$(jcode -X DELETE -H "$AUTH_COLAB" "$API/api/media/$PRIV_MEDIA_ID")"
check "borrar transmisión privada" 204 "$(jcode -X DELETE -H "$AUTH_COLAB" "$API/api/streams/$STREAM_ID")"
check "borrar transmisión pública" 204 "$(jcode -X DELETE -H "$AUTH_COLAB" "$API/api/streams/$STREAM_PUB_ID")"
check "borrar categoría de prueba" 204 "$(jcode -X DELETE -H "$AUTH_ADMIN" "$API/api/categories/$CAT_ID")"
COLAB_ID=$(curl -s -H "$AUTH_ADMIN" "$API/api/users" | python3 -c "import sys,json; users=json.load(sys.stdin); print([u['id'] for u in users if u['email']=='$COLAB_EMAIL'][0])")
check "borrar usuario de prueba" 204 "$(jcode -X DELETE -H "$AUTH_ADMIN" "$API/api/users/$COLAB_ID")"
STRANGER_ID=$(curl -s -H "$AUTH_ADMIN" "$API/api/users" | python3 -c "import sys,json; users=json.load(sys.stdin); print([u['id'] for u in users if u['email']=='$STRANGER_EMAIL'][0])")
check "borrar usuario ajeno de prueba" 204 "$(jcode -X DELETE -H "$AUTH_ADMIN" "$API/api/users/$STRANGER_ID")"

printf '\n════════════════════════════════════════════════════════\n'
printf 'Resultado: %d correctas, %d fallidas\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && echo "TODAS LAS PRUEBAS PASARON ✓" || echo "HAY PRUEBAS FALLIDAS ✗"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
