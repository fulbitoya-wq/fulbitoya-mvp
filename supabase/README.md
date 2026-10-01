# Supabase CLI (este repo)

Las migraciones viven en `supabase/migrations/`. El proyecto **remoto** es el de producción/dev compartido (FulbitoYa + PorLaCancha). No hay Postgres local obligatorio.

## Una vez

1. `npx supabase login` (abre el browser; o definí `SUPABASE_ACCESS_TOKEN` en tu máquina, no en el repo).
2. `npm run db:link` — lee el project ref de `NEXT_PUBLIC_SUPABASE_URL` (raíz `.env.local`) y corre `supabase link`.

Queda `supabase/.temp/project-ref` (gitignored). Confirmá con `npm run db:migrations`.

## Aplicar migraciones

```bash
npm run db:push
```

Equivale a `npx supabase db push` desde la raíz. **No pegues SQL a mano** salvo el checklist de verificación.

## Verificar el remoto vs el repo (032+)

En el SQL Editor del dashboard, corré `supabase/verify/032_plus_checklist.sql` y pasá el resultado (todas las filas). Eso no modifica datos.
