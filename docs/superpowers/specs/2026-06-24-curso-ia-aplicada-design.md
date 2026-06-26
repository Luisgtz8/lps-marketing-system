# Rediseño de `docs/curso.html` — Curso "IA Aplicada"

**Fecha:** 2026-06-24
**Autor:** David (con Claude Code)
**Estado:** Aprobado, listo para plan de implementación

## Objetivo

Rehacer `docs/curso.html` por completo. Se reusa el **esqueleto visual y el motor** del curso actual (navegación, progreso, tema, quizzes, ejercicios copy-paste, puntaje) pero se reemplaza **todo el contenido** por un temario nuevo de 4 partes (mapeadas a 7 módulos), más técnico y aplicado.

El gate/paywall de magic-link se **elimina temporalmente** (se construirá uno nuevo después). Su especificación completa quedó guardada en memoria del proyecto (`curso-paywall-gate-removed.md`) para poder reconstruirlo.

## Público objetivo

Profesional curioso, **cero código** (dueños, gerentes). El código (pdfplumber, scrapers) se muestra como **demo "mira lo que se puede hacer"** — el alumno copia/pega, no escribe desde cero. Énfasis en el resultado de negocio, no en la sintaxis. Tono alineado con el curso actual: "la IA propone, tú revisas y decides". Copy en español.

## Qué se reusa, qué se quita

### Se reusa (motor + esqueleto)
- Sidebar de módulos, navegación `goTo()`, barra de progreso, top bar.
- Tema claro/oscuro (toggle + persistencia `localStorage['lps-theme']`).
- Layout responsive (course-layout, sidebar, mobile-tabs).
- **Quizzes con feedback** (opción múltiple, explicación correcto/incorrecto).
- **Ejercicios copy-paste** (bloque copiable + botón "copiar" + casilla "lo hice").
- **Sistema de puntaje /100** + pantalla de resultados final.
- Estilos base, tipografía (Space Grotesk), color de marca `--amber: #F59E0B`, footer.

### Se quita
- `#reg-gate` completo (formulario, estados reg-sent/paywall/verifying/expired/neterror) y toda la lógica de auth backend (`submitReg`, `consumeTokenFromUrl`, `checkAccess`, `showPaywall`, `logout`, `initGate`, llamadas a `/api/*`). Guardado en memoria.
- Puzzles interactivos (classify, order, connect, nivel, sec) y `calcPuzzleScore`, `puzzleRetries`.
- La Bóveda (`boveda-section`, botones de bóveda).
- El scoring de puzzles en el panel admin (el panel admin de navegación rápida puede conservarse opcionalmente, sin las filas de puzzles).
- Progreso server-side (`/api/progress`, `mergeServerProgress`). El progreso vive solo en `localStorage`.

## Estructura de módulos (7)

| # | Módulo | Parte | Interactividad |
|---|--------|-------|----------------|
| 1 | ¿Qué es un LLM? (versión extremadamente simplificada) | I | Quiz |
| 2 | El dinero y la disrupción: empleos y habilidades del futuro | I | Quiz |
| 3 | Prompts, contexto y tokens | II | Quiz |
| 4 | Las herramientas (Claude Code ★, ChatGPT, apps nativas, Gmail, Calendar) | II | Ejercicio copy-paste |
| 5 | De PDF a datos: leer documentos con IA | III | Ejercicio (contrato real) + quiz |
| 6 | Análisis con datos reales: KPIs y Excel | III | Ejercicio (ventas/egresos reales) |
| 7 | Case study: análisis financiero de empresa pública | IV | Ejercicio + cierre/resultados |

### Contenido por módulo

**M1 — ¿Qué es un LLM?**
Versión extremadamente simplificada: un LLM predice la siguiente palabra a partir de un patrón aprendido de enormes cantidades de texto. Analogía sencilla (autocompletar con esteroides). Qué SÍ hace bien y qué NO (puede inventar / "alucinar"). Cierra con la idea de que es una herramienta que propone, no un oráculo.

**M2 — El dinero y la disrupción**
Cantidad de dinero detrás de la industria (inversión, valor de mercado). La disrupción que ha causado: despidos, reestructuraciones de capital humano. Las habilidades del futuro. Mensaje central reformulado con tacto y motivación (no amenaza): *cómo aprendes a usar la IA es lo que define tu valor profesional en los próximos años — los que la dominan se vuelven indispensables.*

**M3 — Prompts, contexto y tokens**
Qué es un prompt (la instrucción). Qué es contexto (todo lo que la IA "tiene presente" en la conversación). Qué son tokens (las piezas en que la IA parte el texto; por qué importan para costo y límites). Explicaciones concretas, sin jerga matemática.

**M4 — Las herramientas** *(módulo estrella, ver sección detallada abajo)*
- **Claude Code** (modo pro): guía de instalación visual por OS, CLAUDE.md rápido, overview de cómo se crean agentes y skills.
- **ChatGPT** brevemente.
- **Apps nativas de la app de Claude.**
- **Gmail** — crear correos en borrador.
- **Google Calendar.**
Ejercicio copy-paste al cierre.

**M5 — De PDF a datos**
- Leer PDFs con scripts (demo de `pdfplumber`) → convertir en datos estructurados.
- Visión para leer algunos PDFs (sujeto a tamaño).
- Cómo alimentarle un libro en PDF a la IA (introducción, no a fondo — antesala a herramientas más complejas).
- Ejercicio con `docs/recursos/contrato_arcoiris.pdf` real.

**M6 — Análisis con datos reales**
- Con los datos de los PDFs/CSVs, generar un análisis. Datasets reales: `docs/recursos/ventas_lineas_2t_2026.csv`, `docs/recursos/egresos_2t_2026.csv` (y los `.xlsx` de mayo).
- Bajar/usar un dataset interesante y trabajar localmente con él.
- Sacar KPIs y estructurar todo en Excel.
- **Hilo narrativo:** una distribuidora de autopartes en Hermosillo (aranceles, competencia china, márgenes por línea) — los datos ya cuentan esta historia.

**M7 — Case study: análisis financiero de empresa pública**
- Analizar los estados financieros de una compañía pública.
- Mini-modelo con scrapers para sacar las ventas de un competidor grande que cotiza en bolsa y entender el mercado.
- Usa `docs/recursos/competencia_por_linea.csv` para aterrizar el caso local.
- Cierre del curso + pantalla de resultados (puntaje /100).

## Módulo 4 en detalle — Guía de instalación de Claude Code

Requisito del usuario: pasos exactos para descargar en **Windows, Mac y Linux**, con instrucciones de cómo abrir la terminal, **muy visual**.

### Decisiones
- **Selector por pestañas (tabs)** Windows / Mac / Linux. Autodetección del OS del alumno vía `navigator.platform`/`userAgent` → abre su pestaña por defecto; puede cambiar manualmente.
- **Guía honesta y completa**: incluye Node.js como prerequisito, paso a paso, antes de Claude Code.
- **Visuales = mockups en HTML/CSS** (no imágenes/screenshots reales). Se recrea el aspecto de la terminal y los diagramas de teclas con diseño puro.

### Pasos por OS (cada uno en su tab)
1. **Abrir la terminal** — con diagrama de teclas:
   - Windows: `Win + R` → escribir `cmd` (o usar "Terminal de Windows" / PowerShell). Mostrar tecla a tecla.
   - Mac: `Cmd + Espacio` → escribir "Terminal" → Enter.
   - Linux: `Ctrl + Alt + T`.
2. **Instalar Node.js** — paso a paso:
   - Windows/Mac: descargar el instalador LTS desde `https://nodejs.org` y seguir el asistente (mockup del flujo del instalador).
   - Linux: vía gestor de paquetes (ej. `sudo apt install nodejs npm` con nota de que varía por distro) o nvm.
3. **Verificar Node** — comando copiable `node --version` (esperar algo como `v24.x`).
4. **Instalar Claude Code** — comando copiable `npm install -g @anthropic-ai/claude-code`.
5. **Primer arranque** — `claude` en la terminal; nota sobre iniciar sesión.

### Componentes visuales (HTML/CSS, reutilizables)
- `.os-tabs` — barra de pestañas con íconos por OS.
- `.os-panel` — panel por OS, solo el activo visible.
- `.install-step` — tarjeta numerada con ícono, título, cuerpo y (opcional) bloque de comando.
- `.terminal-mock` — bloque tipo terminal (barra de título con 3 puntos, prompt `$`, texto monoespaciado).
- `.key-combo` — diagrama de teclas (ej. `[Win] + [R]`) con estilo de teclas físicas.
- `.copy-block` — bloque de comando copiable (reusar el existente del curso si lo hay) con botón "copiar".
- `.install-warning` — callout de aviso para pasos delicados.

CLAUDE.md y el overview de agentes/skills se explican **brevemente y conceptualmente** (qué son, para qué sirven), sin tutorial profundo.

## Datos y estado

- **Sin backend.** El progreso (quizzes respondidos, ejercicios hechos, puntaje) se guarda en `localStorage` con una clave nueva (ej. `lps-curso-ia-aplicada-v1`) para no colisionar con el progreso del curso viejo.
- El tema sigue en `localStorage['lps-theme']`.
- No se reintroducen claves anon ni llamadas a `/api/*` (consistente con CLAUDE.md).

## Arquitectura del archivo

`docs/curso.html` sigue siendo **un solo archivo** HTML con `<style>` inline y `<script>` inline (sin build step, como el resto de `docs/`). Secciones internas claras:
1. `<head>` + `<style>` (estilos reusados + nuevos: os-tabs, terminal-mock, key-combo, install-step).
2. `#course-screen` con top bar, sidebar (`#nav-items`), 7 `.module`.
3. `<script>`: `MODULES`, `ANSWERS` (nuevos quizzes), navegación `goTo`/`restoreUI`, quizzes, ejercicios copy-paste, puntaje, persistencia local, autodetección de OS para las tabs.

## Pruebas / verificación

No hay framework de tests para el front estático. Verificación manual:
- Abrir `docs/curso.html` en navegador (light + dark).
- Navegar los 7 módulos (sidebar + tabs móviles).
- Probar cada quiz (correcto/incorrecto → feedback).
- Probar botones "copiar" y casillas "lo hice".
- En M4: las tabs Win/Mac/Linux cambian; autodetección abre la correcta; comandos copiables funcionan.
- Verificar que el puntaje /100 acumula y la pantalla de resultados aparece.
- Confirmar que NO hay `#reg-gate` ni llamadas a `/api/*` residuales.
- Confirmar que `localStorage` usa la clave nueva (no pisa el progreso viejo).

## Fuera de alcance (YAGNI)
- Reconstruir el gate/paywall (después; ya está en memoria).
- Backend / persistencia server-side de progreso.
- Puzzles interactivos y la Bóveda.
- Screenshots/imágenes reales de instaladores (se usan mockups CSS).
