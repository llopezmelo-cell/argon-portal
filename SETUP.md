# ARGon Portal — Guía de instalación

## Paso 1 — Crear cuenta en Supabase (base de datos + auth)

1. Ir a https://supabase.com → "Start for free"
2. Crear cuenta con tu email
3. Crear nuevo proyecto: nombre "argon-portal", región "South America (São Paulo)"
4. Anotar:
   - Project URL: https://XXXX.supabase.co
   - anon public key (Settings → API)
   - service_role key (Settings → API → guardar en lugar seguro)

## Paso 2 — Crear la base de datos

1. En Supabase → SQL Editor
2. Copiar y ejecutar el contenido de `supabase/schema.sql`
3. Verificar que todas las tablas se crearon en Table Editor

## Paso 3 — Configurar variables de entorno

Editar el archivo `.env.local` y completar con los valores de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

También configurar email para invitaciones (Gmail):
```
SMTP_USER=tu@gmail.com
SMTP_PASS=tu_app_password  ← Generá en Google → Seguridad → Contraseñas de aplicación
```

## Paso 4 — Crear tu cuenta de admin

1. En Supabase → Authentication → Users → "Invite user"
2. Invitar con tu email (luislm@argon.com.ar o el que uses)
3. Activar la cuenta desde el email que recibís
4. En SQL Editor ejecutar (reemplazando el UUID con el de Auth → Users):
   ```sql
   INSERT INTO users (id, email, full_name, role, status)
   VALUES ('TU-UUID-DE-AUTH', 'tu@email.com', 'Luis López Melo', 'admin', 'activo');
   ```

## Paso 5 — Correr localmente

```bash
npm run dev
```

Abrir: http://localhost:3000/login

## Paso 6 — Deploy en Vercel (acceso desde cualquier lugar)

1. Ir a https://vercel.com → crear cuenta
2. "New Project" → importar desde GitHub (subir el código primero)
   O usar Vercel CLI: `npx vercel`
3. Agregar variables de entorno en Vercel → Settings → Environment Variables
4. Cambiar en `.env.local`:
   ```
   WEBAUTHN_RP_ID=tu-proyecto.vercel.app
   WEBAUTHN_ORIGIN=https://tu-proyecto.vercel.app
   NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
   ```
5. Deploy → recibís URL tipo: https://argon-portal.vercel.app

## Paso 7 — Instalar en el celular (PWA)

**Android (Chrome):**
- Abrir la URL en Chrome
- Menú → "Agregar a pantalla de inicio"

**iPhone (Safari):**
- Abrir la URL en Safari
- Compartir → "Agregar a pantalla de inicio"

## Seguridad implementada

- ✅ HTTPS obligatorio (Vercel)
- ✅ JWT tokens (15 min access + 90 días refresh)
- ✅ PIN hasheado (SHA-256)
- ✅ Biometría WebAuthn (Face ID / huella)
- ✅ Bloqueo tras 5 intentos fallidos
- ✅ Row Level Security (cada usuario solo ve sus datos)
- ✅ Rate limiting en login (máx 5 intentos/min por IP)
- ✅ Headers HTTP de seguridad (CSP, HSTS, X-Frame)
- ✅ Audit log de todos los accesos
- ✅ Desbloqueo de cuentas solo por admin

## App Store (próximo paso)

Para publicar en iOS App Store y Google Play:
1. Instalar Expo: `npm install -g expo-cli`
2. Crear proyecto Expo que use las mismas APIs
3. Expo EAS Build para generar el .ipa y .aab
4. Subir a App Store Connect y Google Play Console
