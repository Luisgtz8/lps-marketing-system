# PROGRESS — LPS sitio / lps-marketing-system

Actualizado: 2026-07-02

## Completado

### Flujo de acceso al curso
- Alumno registra correo → queda pendiente
- Luis activa desde admin panel → correo magic link 7 días automático
- Alumnos con acceso previo: magic link instantáneo (60 min)

### Admin panel (docs/admin.html)
- Login con correo + contraseña
- Funciones: Activar / Quitar acceso / Editar perfil / Link directo (magic link para compartir por WhatsApp)
- Acceso desde footer del sitio (link "Admin") y desde dentro del curso (botón "Admin ↗", solo admins)

### Curso (docs/curso.html)
- Botón "Resetear progreso" (solo admins) — limpia localStorage + DB
- Botón "Admin ↗" en top-bar (solo admins)
- Manejo de estado pending: mensaje "Te avisaremos cuando tu acceso esté listo"

### API progress.ts
- Soporte DELETE → resetea course_progress, quiz_answers, exercise_submissions del usuario

### Taller 2 julio 2026
- 10 alumnos registrados durante el taller
- Correo post-taller enviado con botón WhatsApp comunidad + QR
- Acceso activado en DB para los 10 (`entitlements.paid = true`)
- Script: `scripts/send_taller.mjs` (reutilizable para futuros talleres, `--dry-run` disponible)

## En progreso
- Nada activo

## Pendiente
- Portafolio en index.html: cards clickables con detalle de proyectos

## Decisiones tomadas
- Sin contraseñas para alumnos — flujo 100% magic link
- Acceso manual: Luis cobra → activa desde admin panel → alumno recibe email
- 12/12 funciones Vercel Hobby — no crear nuevos archivos en api/
- RESEND_API_KEY encriptada en Vercel — para envíos locales obtener desde dashboard
- Admins: luisgutierrezhomesolutions@gmail.com, davidhagenb@gmail.com, dhagenballesteros@outlook.com (pass: Lt03128936)
