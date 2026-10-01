# Resumen técnico — FulbitoYa + JugateLA

Documento para otro desarrollador. **No incluye** claves de API, tokens, service_role ni contenido de `.env`.

Fecha de referencia: 2026-09-28.

---

## 1. Visión de producto (dos marcas, un backend)

| Producto | Qué es | Superficie |
|---|---|---|
| **FulbitoYa** | Analogía Pista/Playtomic para fútbol: reserva de cancha, gestión de predio, **sumarse a un partido** (`match`) | Next.js (web) |
| **JugateLA** | Partidos **por plata** en el mapa (premio que pone el predio o, a futuro, un jugador) | Expo / React Native |

Ambos apuntan al **mismo proyecto Supabase**. No hay que reescribir Postgres para la app mobile.

Importante: la tabla geo `public.partidos` es el **partido/departamento argentino**, no un partido de fútbol. El pickup se llama `public.match`. El desafío pago es `public.desafios`.

---

## 2. Stack

### FulbitoYa (`/` del repo)

- Next.js **16.1.6**, React **19.2.3**, TypeScript, Tailwind **4**
- `@supabase/supabase-js` **^2.99.1**
- Mercado Pago SDK **^2.12.0**
- FullCalendar, lucide-react, Resend / nodemailer (emails de invitación)
- Google Maps JS (Places Autocomplete + mapa de desafíos) vía script loader propio

Scripts: `npm run dev` (web), `npm run dev:jugatela` (Expo).

### JugateLA (`/jugatela`)

- Expo **~57**, React Native **0.86.3**, React **19.2.3**
- `@supabase/supabase-js` **^2.117.2**
- `react-native-maps` **1.27.2**
- Sin Expo Router todavía: `App.tsx` + tabs Inicio / Mapa

Variables de entorno (solo **nombres**, no valores):

- FulbitoYa: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo server: webhook MP, RPC), `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `RESEND_API_KEY`, `APP_BASE_URL`
- JugateLA: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## 3. Árbol de carpetas (sin `node_modules`)

```
fulbitoya-mvp/
  app/                      # App Router Next.js
    (auth)/                 # login, registro
    (public)/               # home, canchas, reserva ok/error/pendiente
    (map)/                  # /desafios mapa web
    api/
      pagos/mercadopago/    # preferencia + webhook
      send-invite-email/
      send-match-invite-email/
    dashboard/              # panel predio (canchas, campos, turnos, reservas, desafíos)
    jugador/                # panel jugador (reservas, equipos, matches, perfil)
    equipos/                # ficha pública de equipo
    mis-reservas/
  components/               # UI pública, mapas, reserva, nav
  lib/                      # supabase, canchas, reservas, matches, desafios, MP
  supabase/
    schema.sql              # núcleo inicial (puede estar desfasado vs migraciones)
    migrations/             # 001 … 032 (fuente de verdad del schema)
  scripts/                  # seed georef, etc.
  types/                    # google-maps.d.ts
  jugatela/                 # app Expo
    App.tsx
    app.config.js
    src/lib/                # supabase + desafios (cliente mobile)
    src/screens/            # HomeScreen, MapScreen
    assets/
```

Rutas web relevantes:

- Público: `/`, `/canchas`, `/canchas/[id]`, `/desafios`, `/desafios/[id]`, `/login`, `/registro`
- Jugador: `/jugador`, `/jugador/matches`, `/jugador/matches/crear`, `/jugador/reservas`, `/jugador/equipos`
- Predio: `/dashboard`, `/dashboard/canchas`, `/dashboard/disponibilidades`, `/dashboard/reservas`, `/dashboard/desafios/crear`

---

## 4. Autenticación

- Supabase Auth email/password (`signUp` / `signInWithPassword`).
- Trigger `handle_new_user` (migración `001`): inserta fila en `public.usuarios` con `id` = `auth.users.id`, email, nombre, teléfono, `rol` (`jugador` | `owner`) desde `raw_user_meta_data`.
- Cliente browser: `lib/supabase.ts` (anon key).
- Server (webhook, RPC de pago): `lib/supabase-admin.ts` (service role, **nunca en el cliente**).
- Layout `/jugador` redirige a `/login` si no hay sesión.
- Registro permite elegir rol jugador/owner.

JugateLA **aún no tiene login**; lee `desafios` abiertos con la anon key (RLS de select público).

---

## 5. Esquema Supabase

### 5.1 Tablas y relaciones

```
auth.users
    └── usuarios (1:1, PK = auth.uid)
            ├── canchas.owner_id
            ├── reservas.organizador_id
            ├── reserva_jugadores.jugador_id
            ├── equipos.creador (y miembros)
            ├── match.organizer_id
            ├── match_players.user_id
            ├── desafios.owner_id
            └── verifications.user_id

canchas 1—N campos 1—N disponibilidades 1—0..1 reservas (cuando hay pago)
reservas 1—N reserva_jugadores

provincias 1—N partidos(geo) 1—N localidades
canchas / match / equipos → FKs de ubicación (provincia_id, partido_id, localidad_id)

match 1—N match_players
desafios.owner_id → usuarios
desafios.cancha_id → canchas (opcional)
```

**Core reservas (schema + migraciones 014–028):**

| Tabla | Rol |
|---|---|
| `usuarios` | Perfil. `rol` owner/jugador. Extra: verificación/nivel (`002`) |
| `canchas` | Predio. `owner_id`, dirección, geo, `lat/lng`, `place_id` (`032`), amenities, `activa` |
| `campos` | Cancha física dentro del predio. `tipo` 5/7/9/11, `valor_hora`, `valor_reserva` (seña) |
| `disponibilidades` | Turno: fecha, hora_inicio/fin, precio, `estado` disponible/reservado/bloqueado |
| `reservas` | `disponibilidad_id`, `organizador_id`, `monto_total`, `estado_pago` pendiente/pagado/cancelado, IDs MP |
| `reserva_jugadores` | Split futuro; hoy el organizador entra como único jugador al confirmar pago |

**Geo (`010`–`013`):** `provincias`, `partidos`, `localidades` (lectura pública). IDs Georef únicos.

**Equipos (`003`–`009`):** `equipos`, `equipo_miembros`, `equipo_invitaciones` / `team_invitations` (hay dos caminos históricos; conviene unificar al tocar equipos).

**Matches pickup (`029`–`031`):**

- `match`: organizer, tipo f5–f11, ubicación, fecha/hora, duración, estado, visibilidad, + `direccion/place_id/lat/lng` (`032`)
- `match_players`: user_id y/o invited_email, `origen` invitacion/solicitud, `estado` invitado/confirmado/rechazado

**Desafíos (`032`):** premio, dirección Google, lat/lng, estado abierto/completo/cancelado/finalizado, tipo `match_tipo`.

**Verificación:** `verifications` (`002`).

**Storage (policies en migraciones):** buckets predio-logos, predio-fondos, fotos de campos, logos de equipos.

### 5.2 RPCs de pago (service_role salvo donde se indica)

| Función | Quién la ejecuta | Qué hace |
|---|---|---|
| `get_sena_para_disponibilidad` | API preferencia (admin) | Lee seña del campo; no crea reserva |
| `confirmar_pago_desde_disponibilidad` | Webhook MP (admin) | Si turno disponible: pasa a `reservado`, inserta reserva **pagada** + fila en `reserva_jugadores` |
| `iniciar_reserva_sena` / `confirmar_pago_reserva` | Legado (`024`) | Flujo anterior (reserva pendiente al click). El código actual de API usa el flujo `028` |
| `cancelar_reserva_pendiente` | service_role | Cancela pendiente |

### 5.3 RLS (resumen operativo)

Políticas actuales viven en `schema.sql` + migraciones; si chocan, **gana lo último aplicado en el proyecto remoto**.

- **usuarios:** CRUD del propio `auth.uid()`.
- **canchas:** SELECT si `activa`; ALL si `owner_id = auth.uid()`.
- **campos / disponibilidades:** SELECT amplio; escritura si el user es owner de la cancha.
- **reservas:** SELECT organizador, jugadores de la reserva, o owner del predio. INSERT organizador = `auth.uid()`. La **creación real post-pago** la hace el webhook con service_role (bypasea RLS).
- **match:** SELECT si público, organizer, o estás en `match_players`. INSERT/UPDATE/DELETE solo organizer.
- **match_players (`030`):** authenticated puede SELECT/INSERT/UPDATE/DELETE (se relajó para evitar recursión RLS). Es un punto a endurecer.
- **desafios:** SELECT si `estado = abierto` **o** owner. INSERT/UPDATE/DELETE solo `owner_id = auth.uid()`.
- **geo:** SELECT público.

---

## 6. Flujo reserva de cancha (FulbitoYa)

Punto de unión predio ↔ jugador. JugateLA **no** reserva turnos hoy.

1. Owner carga cancha → campos (`valor_reserva` = seña) → disponibilidades.
2. Jugador logueado en ficha de cancha elige un slot (`ReservarSlotButton`).
3. `POST /api/pagos/mercadopago/preferencia`  
   - Bearer del usuario  
   - RPC `get_sena_para_disponibilidad` (monto **no** lo manda el cliente)  
   - Crea Preference MP con metadata `disponibilidad_id`, `organizador_id`, `monto_sena`  
   - **No** inserta `reservas` todavía (`028`)
4. Checkout MP. Callbacks `/reserva/ok|error|pendiente`.
5. `POST /api/pagos/mercadopago/webhook`  
   - Trae el pago a MP  
   - Si `approved` → `confirmar_pago_desde_disponibilidad`  
   - Turno `reservado` + reserva `pagado`

El take rate de marketplace **no está implementado**: se cobra la seña entera vía collector MP; no hay split ni liquidación al predio.

---

## 7. Flujo creación de partidos (donde se conectan las apps)

Hay **tres** conceptos distintos:

### A. `match` — sumarte a un partido (visión Pista / FulbitoYa)

- UI: `/jugador/matches/crear` → `createMatch` en `lib/matches.ts`
- Inserta `match` (organizer = usuario logueado) + fila `match_players` del organizer `confirmado`
- Ubicación: provincia/partido(geo)/localidad + autocomplete Google (lat/lng)
- Invitaciones por email (`/api/send-match-invite-email`), visibilidad público/privado
- Home pública lista matches públicos (`PublicMatchesSection`)
- **No hay cobro.** No está en JugateLA.

### B. Reserva de **cancha** — GMV de seña

- Ver sección 6. Es el flujo de dinero actual.

### C. `desafios` — partido por plata (visión JugateLA)

- Alta hoy: `/dashboard/desafios/crear` (predio logueado). `owner_id` = `auth.uid()`, premio, dirección Google obligatoria (lat/lng).
- Lectura web: `/desafios` (mapa pins de premio) + teaser en home.
- Lectura mobile: JugateLA `getDesafiosPublicos()` misma tabla, filtro `estado = abierto` y `fecha >= hoy`.
- Heurística UI “predio vs jugadores”: si hay `cancha_id` se etiqueta predio; si no, jugadores. **El jugador todavía no puede crear** desde la app (CTA con alerta).
- No hay inscripción paga ni pozo.

**Cómo se van a conectar las dos apps (diseño actual, no todo codeado):**

```
Predio (FulbitoYa dashboard) ──insert──► desafios ──select──► JugateLA mapa
Jugador (FulbitoYa) ──insert──► match (pickup sin plata)
Jugador (JugateLA, pendiente) ──insert──► desafios (mismo RLS: owner_id = auth.uid())
Jugador (FulbitoYa) ──MP webhook──► reservas + disponibilidades
```

Auth compartida (mismo `usuarios.id`) permitiría más adelante: crear desafío desde el celular, ver reservas, o deep-link a un `match`. Hoy el puente real es **solo `desafios` + el mismo proyecto Supabase**.

---

## 8. Qué funciona vs qué falta

### Funciona

- Auth, roles jugador/owner, panel predio (canchas, campos, logos/fondos, disponibilidades)
- Catálogo público de canchas, búsqueda por zona
- Reserva con seña MP (preferencia + webhook + bloqueo de turno al aprobar)
- Equipos / invitaciones (con deuda de unificar tablas)
- Matches: crear, listar, detalle, invitaciones, matches públicos en home
- Desafíos: tabla + RLS, alta admin, mapa web tipo Airbnb, autocomplete Google en canchas/matches/desafíos
- JugateLA: Expo, home + mapa, lectura de desafíos, cuenta Expo para preview
- Migración `032` pensada para `desafios` + columnas Maps en `match`/`canchas`

### Falta / frágil

- **JugateLA:** login, publicar desafío, inscripción, pagos, notificaciones, deep links
- **Campo `origen` explícito** predio vs jugador (hoy se infiere `cancha_id`)
- **Take rate** y liquidación al predio
- Split de seña entre varios `reserva_jugadores` (tabla existe, flujo no)
- Dashboard predio: KPIs/calendario “en construcción”
- `/jugador/desafios` reusa el mapa web; no es una app de desafíos nativa
- RLS de `match_players` demasiado abierta post-`030`
- Posible doble definición de invitaciones de equipo
- Google Maps: billing del proyecto GCP; referrers localhost vs Expo
- Builds nativos de stores (hoy Expo Go)
- Producto: no mezclar marca FulbitoYa (Pista) con JugateLA (plata en el mapa) en la misma UX de jugador a largo plazo

---

## 9. Cómo correr local (sin secretos)

```text
FulbitoYa:  npm run dev          → http://localhost:3000
JugateLA:   cd jugatela && npm start   → Expo Go (ideal --tunnel si no hay LAN)
```

Supabase: proyecto remoto (no hay Postgres local en el repo). Migraciones en `supabase/migrations/`.

---

## 10. Puntos de extensión recomendados para el otro dev

1. Auth en JugateLA con el mismo Auth de Supabase (sesión persistida).
2. INSERT `desafios` desde mobile (`owner_id = auth.uid()`), campo `origen` en DB.
3. No reimplementar reservas en RN hasta que el webhook/MP esté estable en web.
4. Endurecer RLS de `match_players`.
5. Si se unifica pickup + desafíos, decidir si `match` gana un `premio` o se mantiene `desafios` separado (hoy está separado a propósito).
