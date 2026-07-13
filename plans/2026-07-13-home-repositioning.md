# Home Repositioning — Consultoría/Implementación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposicionar `index.html` de "taller para equipos" a "consultoría/implementación de IA para negocios" — Luis como alguien que construye y entrega sistemas, no solo que enseña.

**Architecture:** Un solo archivo HTML estático (`docs/index.html`) con estilos inline y `docs/style.css`. Sin build step, sin bundler. Identidad visual intacta: negro + ámbar (`--green: #F59E0B`). El curso vive en `ia-aplicada.html` — el home deja de venderlo.

**Nueva estructura de secciones:**
1. HERO — "Construimos sistemas de IA para tu negocio"
2. ¿PARA QUIÉN? — empresas que necesitan que alguien LO HAGA, no que lo aprenda
3. LO QUE HACEMOS — 6 servicios como protagonistas (sube de posición)
4. CÓMO TRABAJAMOS — proceso en 4 pasos
5. EXPEDIENTE — portfolio (sin cambios)
6. CAPACITACIÓN — sección pequeña: talleres + curso como opción para los que quieren aprender
7. SOBRE EL INSTRUCTOR — bio actualizado
8. CTA FINAL — "Agenda tu diagnóstico gratis"

**Tech Stack:** HTML + CSS inline + vanilla JS (sin cambios de stack)

---

## Archivo a modificar

- `docs/index.html` — único archivo que cambia (2,568 líneas)

No se crean archivos nuevos. No se toca `sitemap.xml` (no cambian URLs, solo anclas internas).

---

## Task 1: Meta, title y schema — repositioning

**Files:**
- Modify: `docs/index.html` líneas 1–83 (head: title, meta description, keywords, OG, schema)

- [ ] **Step 1: Reemplazar `<title>` y metas de head**

Cambiar:
```html
<title>Talleres de IA para Empresas en Hermosillo — Lightning Pro Solutions</title>
<meta name="description" content="Talleres prácticos de inteligencia artificial para equipos de trabajo en Hermosillo, Sonora. Aprende a usar ChatGPT, Claude, Gemini y NotebookLM con datos reales de tu empresa. Sin teoría, sin tecnicismos. Tu equipo sale con un sistema listo para escalar.">
<meta name="keywords" content="talleres IA Hermosillo, capacitación inteligencia artificial empresas, taller ChatGPT Sonora, automatización IA empresas, curso IA equipos de trabajo, inteligencia artificial Hermosillo, Lightning Pro Solutions, taller IA sin miedo, agentes IA Hermosillo">
```

Por:
```html
<title>Sistemas de IA para tu Negocio — Lightning Pro Solutions · Hermosillo</title>
<meta name="description" content="Implementamos chatbots, integraciones, sitios web y automatizaciones con IA para negocios en Hermosillo, Sonora. Diagnóstico gratis. Resultados en semanas, no meses.">
<meta name="keywords" content="consultoría IA Hermosillo, chatbot empresas Sonora, automatización IA negocios, integración IA sistemas, sitio web inteligencia artificial, Lightning Pro Solutions, implementación IA Hermosillo, agentes IA empresas">
```

- [ ] **Step 2: Actualizar OG tags**

Cambiar:
```html
<meta property="og:title" content="Talleres de IA para Empresas en Hermosillo — Lightning Pro Solutions">
<meta property="og:description" content="Tu equipo aprende a usar ChatGPT, Claude, Gemini y NotebookLM con datos reales. Estructura, contexto y escalabilidad — no solo prompts. Hermosillo, Sonora.">
```

Por:
```html
<meta property="og:title" content="Sistemas de IA para tu Negocio — Lightning Pro Solutions">
<meta property="og:description" content="Construimos chatbots, integraciones y automatizaciones que trabajan 24/7. Diagnóstico gratis, propuesta ese mismo día. Hermosillo, Sonora.">
```

Y el Twitter card:
```html
<meta name="twitter:title" content="Sistemas de IA para tu Negocio — Lightning Pro Solutions">
<meta name="twitter:description" content="Chatbots, integraciones, sitios y automatizaciones con IA. Diagnóstico gratis. Lightning Pro Solutions · Hermosillo, Sonora.">
```

- [ ] **Step 3: Actualizar JSON-LD schema — LocalBusiness**

Reemplazar el bloque `hasOfferCatalog` con servicios de implementación (no talleres):
```json
"hasOfferCatalog": {
  "@type": "OfferCatalog",
  "name": "Servicios de implementación de IA",
  "itemListElement": [
    {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "Chatbots y Asistentes con IA",
        "description": "Asistente entrenado con el negocio del cliente, conectado a WhatsApp o sitio web, atiende consultas y agenda citas las 24 horas.",
        "provider": {"@type": "LocalBusiness", "name": "Lightning Pro Solutions"},
        "areaServed": "Hermosillo, Sonora"
      }
    },
    {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "Integraciones y Automatización",
        "description": "Conectamos sistemas que no hablan entre sí: CRM, WhatsApp, correo, hojas de cálculo y APIs externas en un solo flujo automatizado.",
        "provider": {"@type": "LocalBusiness", "name": "Lightning Pro Solutions"},
        "areaServed": "Hermosillo, Sonora"
      }
    },
    {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "Sitios Web y Landing Pages",
        "description": "Sitios conectados a herramientas, optimizados para conversión y con IA integrada para atender al visitante en tiempo real.",
        "provider": {"@type": "LocalBusiness", "name": "Lightning Pro Solutions"},
        "areaServed": "Hermosillo, Sonora"
      }
    }
  ]
}
```

- [ ] **Step 4: Actualizar el FAQ schema** — preguntas sobre consultoría, no talleres

Reemplazar las 4 preguntas actuales (sobre el taller) por:
```json
{
  "@type": "Question",
  "name": "¿Qué tipo de sistemas construyen?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Chatbots y asistentes con IA conectados a WhatsApp o tu sitio web, integraciones entre sistemas que no hablan entre sí, bases de datos y dashboards automatizados, sitios web con IA integrada, y automatización de procesos repetitivos de oficina."
  }
},
{
  "@type": "Question",
  "name": "¿Cuánto tiempo tarda un proyecto?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Depende del alcance. Un chatbot básico puede estar listo en 1–2 semanas. Una integración compleja entre sistemas toma 3–6 semanas. Empezamos con un diagnóstico gratuito donde te damos una estimación exacta."
  }
},
{
  "@type": "Question",
  "name": "¿También dan capacitación?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Sí. Toda implementación incluye capacitación para que tu equipo opere el sistema. También ofrecemos talleres independientes si lo que necesitas es que tu equipo aprenda a usar IA por su cuenta."
  }
},
{
  "@type": "Question",
  "name": "¿Cómo empezamos?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Con un diagnóstico de 20 minutos por WhatsApp o llamada. Entendemos tu proceso actual, identificamos dónde la IA genera más impacto y te entregamos una propuesta ese mismo día."
  }
}
```

- [ ] **Step 5: Verificar en browser**

Abrir `docs/index.html` localmente. Inspeccionar `<head>` con DevTools y confirmar que el title, description y schema reflejan consultoría.

- [ ] **Step 6: Commit**

```bash
cd ~/LPS/sitio
git add docs/index.html
git commit -m "meta: reposicionar home hacia consultoría/implementación IA"
```

---

## Task 2: Nav — nuevo orden de links

**Files:**
- Modify: `docs/index.html` — nav desktop (~línea 1891–1903) y nav mobile (~línea 1908–1917)

El nuevo nav refleja la jerarquía de la oferta: servicios primero, proyectos como prueba, capacitación como opción, contactar como CTA.

- [ ] **Step 1: Reemplazar nav desktop**

Cambiar links de `<ul class="nav-links">`:
```html
<!-- ANTES -->
<li class="nav-text-links-item"><a href="#talleres">Talleres</a></li>
<li class="nav-text-links-item"><a href="#uno-a-uno">1 a 1</a></li>
<li class="nav-text-links-item"><a href="#servicios">Servicios</a></li>
<li class="nav-text-links-item"><a href="#proyectos">Proyectos</a></li>
<li class="nav-text-links-item"><a href="ia-aplicada.html">Curso</a></li>
```

Por:
```html
<li class="nav-text-links-item"><a href="#servicios">Servicios</a></li>
<li class="nav-text-links-item"><a href="#proyectos">Proyectos</a></li>
<li class="nav-text-links-item"><a href="#capacitacion">Capacitación</a></li>
<li class="nav-text-links-item"><a href="ia-aplicada.html">Curso online</a></li>
```

Y el botón Contactar actualizar el mensaje de WhatsApp:
```html
<a href="https://wa.me/526623478040?text=Hola%2C%20quiero%20agendar%20un%20diagn%C3%B3stico%20gratuito" class="btn-nav" target="_blank" rel="noopener">Diagnóstico gratis</a>
```

- [ ] **Step 2: Reemplazar nav mobile**

```html
<a href="#servicios">Servicios</a>
<a href="#proyectos">Proyectos</a>
<a href="#capacitacion">Capacitación</a>
<a href="ia-aplicada.html">Curso online</a>
```

Y el botón mobile:
```html
<a href="https://wa.me/526623478040?text=Hola%2C%20quiero%20agendar%20un%20diagn%C3%B3stico%20gratuito" class="btn-nav" target="_blank" rel="noopener">Diagnóstico gratis</a>
```

- [ ] **Step 3: Verificar en browser**

Abrir `docs/index.html`. Comprobar que los 4 links del nav aparecen en orden correcto desktop y mobile. Verificar que "Diagnóstico gratis" abre WhatsApp con el texto correcto.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "nav: reordenar links — servicios primero, diagnóstico como CTA"
```

---

## Task 3: Hero — nuevo posicionamiento

**Files:**
- Modify: `docs/index.html` — sección `<!-- HERO -->` (~líneas 1921–1951)

El hero actual habla al empleado que quiere aprender. El nuevo habla al dueño/director que necesita que alguien lo construya.

- [ ] **Step 1: Reemplazar contenido del hero-left**

Cambiar:
```html
<p class="hero-eyebrow reveal">TALLERES DE IA PARA EQUIPOS · HERMOSILLO, SONORA</p>
<h1 class="hero-h1 reveal">Deja de usar IA para <span class="accent">preguntas sueltas.</span></h1>
<p class="hero-sub reveal">Tu equipo aprende a trabajar con estructura: contexto, carpetas, prompts y asistentes que mejoran conforme se usan.</p>
<div class="hero-btns reveal">
  <a href="https://wa.me/526623478040?text=Hola%2C%20quiero%20agendar%20un%20taller%20de%20IA%20para%20mi%20equipo" class="btn-primary" target="_blank" rel="noopener">Apartar fecha →</a>
  <a href="#talleres" class="btn-outline">Ver talleres</a>
</div>
```

Por:
```html
<p class="hero-eyebrow reveal">CONSULTORÍA E IMPLEMENTACIÓN DE IA · HERMOSILLO, SONORA</p>
<h1 class="hero-h1 reveal">Construimos sistemas de IA que <span class="accent">trabajan en tu negocio.</span></h1>
<p class="hero-sub reveal">Chatbots, integraciones, bases de datos, sitios web y automatizaciones. Diseñados para tu operación. Entregados listos para usar.</p>
<div class="hero-btns reveal">
  <a href="https://wa.me/526623478040?text=Hola%2C%20quiero%20agendar%20un%20diagn%C3%B3stico%20gratuito%20para%20mi%20negocio" class="btn-primary" target="_blank" rel="noopener">Agendar diagnóstico gratis →</a>
  <a href="#servicios" class="btn-outline">Ver servicios</a>
</div>
```

- [ ] **Step 2: Reemplazar contenido del hero-panel**

El panel lateral actualmente lista beneficios del taller. Cambiarlo a ejemplos de resultados concretos:

```html
<div class="hero-panel reveal">
  <img src="img/2.reunion.webp" alt="Consultoría IA Lightning Pro Solutions" class="hero-panel-img">
  <p class="panel-label">RESULTADOS REALES</p>
  <p style="font-size:13px;color:#a0a0a0;margin:0 0 16px;line-height:1.6;">No vendemos tecnología. Entregamos sistemas que ya están funcionando en negocios como el tuyo.</p>
  <ul class="check-list">
    <li><span class="check">✓</span> Chatbot de WhatsApp que atiende y agenda las 24 horas.</li>
    <li><span class="check">✓</span> 961 transacciones analizadas con IA — semanas en días.</li>
    <li><span class="check">✓</span> CRM con alertas automáticas de seguimiento a prospectos.</li>
    <li><span class="check">✓</span> Un proceso de 22 horas convertido en 8 con IA.</li>
    <li><span class="check">✓</span> Sistemas integrados — sin duplicar datos ni exportar Excel.</li>
  </ul>
</div>
```

- [ ] **Step 3: Verificar en browser**

Abrir `docs/index.html`. Hero debe mostrar: eyebrow "Consultoría e Implementación de IA", h1 con "Construimos sistemas...", panel con resultados, dos botones. Animación de fondo (canvas) debe seguir funcionando.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "hero: reposicionar hacia implementación — resultados en panel, diagnóstico como CTA"
```

---

## Task 4: "¿Para quién es?" — empresas que necesitan que alguien lo construya

**Files:**
- Modify: `docs/index.html` — sección `<!-- PARA QUIÉN ES -->` (~líneas 1954–1985)

Actualmente apunta a "equipo que trabaja con computadora". Cambiar a empresas que necesitan un implementador, no un maestro.

- [ ] **Step 1: Reemplazar headline y grid**

Cambiar el h2 y el grid de industrias:
```html
<!-- ANTES -->
<p class="section-label reveal" style="text-align:center;">¿ESTO ES PARA MÍ?</p>
<h2 class="reveal" style="...">Si tu equipo trabaja desde una computadora, este taller es para ti.</h2>
```

Por:
```html
<p class="section-label reveal" style="text-align:center;">¿ESTO ES PARA TI?</p>
<h2 class="reveal" style="font-size:clamp(22px,3vw,32px);font-weight:700;text-align:center;margin:12px 0 40px;letter-spacing:-0.5px;">Tienes un proceso que mejorar y necesitas a alguien que lo construya.</h2>
```

- [ ] **Step 2: Reemplazar el grid de 5 industrias**

Cambiar las 5 tarjetas de industria por 5 síntomas/situaciones de negocio (pain points del cliente que necesita implementación, no capacitación):

```html
<div class="reveal" style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;">
  <div style="background:#111;border:1px solid #222;border-radius:10px;padding:24px 16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:10px;">📲</div>
    <p style="font-size:13px;font-weight:600;color:#e8e8e8;line-height:1.4;">Pierdes clientes porque nadie responde a tiempo</p>
  </div>
  <div style="background:#111;border:1px solid #222;border-radius:10px;padding:24px 16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:10px;">🔀</div>
    <p style="font-size:13px;font-weight:600;color:#e8e8e8;line-height:1.4;">Tus sistemas no hablan entre sí y duplicas trabajo</p>
  </div>
  <div style="background:#111;border:1px solid #222;border-radius:10px;padding:24px 16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:10px;">📊</div>
    <p style="font-size:13px;font-weight:600;color:#e8e8e8;line-height:1.4;">Haces reportes a mano cada semana o cada mes</p>
  </div>
  <div style="background:#111;border:1px solid #222;border-radius:10px;padding:24px 16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:10px;">📁</div>
    <p style="font-size:13px;font-weight:600;color:#e8e8e8;line-height:1.4;">Tu información está dispersa en correos y Excel</p>
  </div>
  <div style="background:#111;border:1px solid #222;border-radius:10px;padding:24px 16px;text-align:center;">
    <div style="font-size:28px;margin-bottom:10px;">⏱️</div>
    <p style="font-size:13px;font-weight:600;color:#e8e8e8;line-height:1.4;">Tareas repetitivas consumen tiempo de tu equipo</p>
  </div>
</div>
```

- [ ] **Step 3: Actualizar el párrafo inferior**

```html
<p class="reveal" style="text-align:center;color:#888;font-size:15px;margin-top:28px;">No necesitas saber de tecnología. Solo contarnos cómo funciona tu operación. Nosotros identificamos dónde la IA genera impacto real — y lo construimos.</p>
```

- [ ] **Step 4: Verificar en browser**

La sección debe mostrar 5 pain points con íconos. El párrafo inferior debe decir "no necesitas saber de tecnología."

- [ ] **Step 5: Commit**

```bash
git add docs/index.html
git commit -m "para-quien: cambiar de industrias a pain points de implementación"
```

---

## Task 5: Elevar y expandir "LO QUE HACEMOS" — ahora la sección protagonista

**Files:**
- Modify: `docs/index.html` — sección `<!-- LO QUE CONSTRUIMOS -->` (~líneas 2114–2165)

Actualmente tiene 4 servicios. Expandir a 6 (agregar Integraciones y Diagnóstico/Capacitación). Cambiar posición: debe aparecer inmediatamente después de "¿Para quién es?" — antes que la sección de proceso.

> **Nota de reordenamiento:** En el HTML, el bloque `<!-- LO QUE CONSTRUIMOS -->` vive después de `<!-- 1 A 1 -->`. El plan lo mueve antes que el bloque de proceso (Task 6). Esto requiere cortar el bloque HTML de servicios y pegarlo en la nueva posición. Hacer esto en el Task 5 para mantener coherencia.

- [ ] **Step 1: Cortar la sección servicios actual de su posición (~líneas 2114–2165)**

Eliminar el bloque `<!-- LO QUE CONSTRUIMOS -->` de su posición actual (entre `<!-- 1 A 1 -->` y `<!-- EXPEDIENTE -->`).

- [ ] **Step 2: Insertar la nueva sección servicios ampliada después de `</section>` de ¿Para quién es?**

Insertar el siguiente bloque completo (6 servicios, headline actualizado):

```html
<!-- LO QUE HACEMOS -->
<section class="servicios" id="servicios">
  <div class="servicios-inner">
    <p class="section-label reveal">LO QUE HACEMOS</p>
    <h2 class="section-h2 reveal">Sistemas que trabajan mientras tú te enfocas en lo importante.</h2>
    <div class="servicios-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="servicio-card reveal">
        <div class="servicio-icon-wrap"><div class="servicio-icon">💬</div></div>
        <h3 class="servicio-name">Chatbots y Asistentes IA</h3>
        <p class="servicio-desc">Asistente entrenado con tu negocio que atiende, califica y agenda las 24 horas. WhatsApp, tu web o por voz.</p>
        <div class="servicio-tags">
          <span class="servicio-tag">Bot de WhatsApp</span>
          <span class="servicio-tag">Atención 24/7</span>
          <span class="servicio-tag">Agenda automática</span>
        </div>
      </div>
      <div class="servicio-card reveal">
        <div class="servicio-icon-wrap"><div class="servicio-icon">🔗</div></div>
        <h3 class="servicio-name">Integraciones de Sistemas</h3>
        <p class="servicio-desc">Conectamos lo que tienes: CRM, WhatsApp, correo, Excel, Drive, APIs externas. Un flujo único sin duplicar datos.</p>
        <div class="servicio-tags">
          <span class="servicio-tag">API & Webhooks</span>
          <span class="servicio-tag">n8n / Make</span>
          <span class="servicio-tag">Cero duplicados</span>
        </div>
      </div>
      <div class="servicio-card reveal">
        <div class="servicio-icon-wrap"><div class="servicio-icon">⚡</div></div>
        <h3 class="servicio-name">Sitios Web</h3>
        <p class="servicio-desc">Landing pages y sitios que convierten. Conectados a tus herramientas y con IA integrada para atender al visitante en tiempo real.</p>
        <div class="servicio-tags">
          <span class="servicio-tag">Landing pages</span>
          <span class="servicio-tag">Funnels de venta</span>
          <span class="servicio-tag">Integrado a tus tools</span>
        </div>
      </div>
      <div class="servicio-card reveal">
        <div class="servicio-icon-wrap"><div class="servicio-icon">🗄️</div></div>
        <h3 class="servicio-name">Bases de Datos</h3>
        <p class="servicio-desc">Estructura tu información en una base de datos real. CRM propio, historial de clientes, inventario — consultable y actualizable desde cualquier lugar.</p>
        <div class="servicio-tags">
          <span class="servicio-tag">Supabase / PostgreSQL</span>
          <span class="servicio-tag">CRM a la medida</span>
          <span class="servicio-tag">Acceso desde web</span>
        </div>
      </div>
      <div class="servicio-card reveal">
        <div class="servicio-icon-wrap"><div class="servicio-icon">🛠️</div></div>
        <h3 class="servicio-name">Automatización de Procesos</h3>
        <p class="servicio-desc">Reportes que se generan solos, alertas automáticas, flujos que eliminan tareas manuales repetitivas de tu operación diaria.</p>
        <div class="servicio-tags">
          <span class="servicio-tag">Reportes automáticos</span>
          <span class="servicio-tag">Alertas y notificaciones</span>
          <span class="servicio-tag">Flujos internos</span>
        </div>
      </div>
      <div class="servicio-card reveal">
        <div class="servicio-icon-wrap"><div class="servicio-icon">🎯</div></div>
        <h3 class="servicio-name">Diagnóstico y Asesoría</h3>
        <p class="servicio-desc">Revisamos cómo opera tu negocio e identificamos exactamente dónde la IA genera impacto. Diagnóstico gratuito, propuesta ese mismo día.</p>
        <div class="servicio-tags">
          <span class="servicio-tag">Diagnóstico gratis</span>
          <span class="servicio-tag">Propuesta en 24h</span>
          <span class="servicio-tag">Sin compromiso</span>
        </div>
      </div>
    </div>
    <div class="reveal" style="text-align:center;margin-top:48px;">
      <a href="https://wa.me/526623478040?text=Quiero%20hablar%20de%20un%20proyecto" class="btn-green" target="_blank" rel="noopener">Hablar de tu proyecto →</a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Verificar en browser**

La sección debe aparecer como la 3ª sección (después de hero y ¿para quién?). Deben verse 6 cards en grid 3x2. El grid debe responder bien en mobile (verificar con DevTools → mobile view).

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "servicios: expandir a 6, mover arriba, agregar integraciones y base de datos"
```

---

## Task 6: Nueva sección "CÓMO TRABAJAMOS" — proceso en 4 pasos

**Files:**
- Modify: `docs/index.html` — reemplazar la sección `<!-- PROBLEMA / SOLUCIÓN -->` / "EL MÉTODO" (~líneas 1987–2046) por la nueva sección de proceso

La sección "El Método" (bueno vs malo) era correcta para vender capacitación. Para consultoría, el comprador necesita saber **cómo es trabajar con Luis**.

- [ ] **Step 1: Reemplazar el bloque `<!-- PROBLEMA / SOLUCIÓN -->` completo**

Eliminar el bloque `<!-- PROBLEMA / SOLUCIÓN -->` (desde `<section class="problem">` hasta su `</section>`).

- [ ] **Step 2: Insertar nueva sección `<!-- CÓMO TRABAJAMOS -->` en su lugar**

```html
<!-- CÓMO TRABAJAMOS -->
<section class="problem" id="proceso">
  <div class="method-inner">
    <div class="reveal">
      <p class="section-label">CÓMO TRABAJAMOS</p>
      <h2 class="section-h2" style="max-width:760px;margin-bottom:16px;">Del diagnóstico al sistema funcionando.</h2>
      <p style="color:#888;font-size:16px;line-height:1.7;max-width:760px;">Sin contratos largos de consultoría. Sin cobrar por explorar. Entendemos tu operación, diseñamos la solución y la entregamos funcionando.</p>
    </div>

    <div class="method-grid reveal" style="grid-template-columns:repeat(4,1fr);gap:20px;">
      <div class="method-card good" style="border-left:3px solid var(--green);">
        <div style="font-size:32px;margin-bottom:12px;">🔍</div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#fff;">1. Diagnóstico</h3>
        <p style="font-size:14px;color:#888;line-height:1.6;">20 minutos por WhatsApp o llamada. Entendemos tu proceso, identificamos el cuello de botella y vemos dónde la IA genera impacto real.</p>
        <p style="font-size:12px;font-weight:600;color:var(--green);margin-top:12px;">GRATIS · SIN COMPROMISO</p>
      </div>
      <div class="method-card good" style="border-left:3px solid var(--green);">
        <div style="font-size:32px;margin-bottom:12px;">📋</div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#fff;">2. Propuesta</h3>
        <p style="font-size:14px;color:#888;line-height:1.6;">Ese mismo día te mandamos qué construimos, cuánto tarda y cuánto cuesta. Sin letra chica ni costos ocultos.</p>
        <p style="font-size:12px;font-weight:600;color:var(--green);margin-top:12px;">MISMO DÍA DEL DIAGNÓSTICO</p>
      </div>
      <div class="method-card good" style="border-left:3px solid var(--green);">
        <div style="font-size:32px;margin-bottom:12px;">⚙️</div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#fff;">3. Construcción</h3>
        <p style="font-size:14px;color:#888;line-height:1.6;">Construimos el sistema, te mostramos el avance en cada etapa y ajustamos hasta que funciona exactamente como lo necesitas.</p>
        <p style="font-size:12px;font-weight:600;color:var(--green);margin-top:12px;">1–6 SEMANAS SEGÚN ALCANCE</p>
      </div>
      <div class="method-card good" style="border-left:3px solid var(--green);">
        <div style="font-size:32px;margin-bottom:12px;">🤝</div>
        <h3 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#fff;">4. Acompañamiento</h3>
        <p style="font-size:14px;color:#888;line-height:1.6;">Capacitamos a tu equipo para operar el sistema y te acompañamos el primer mes. No te dejamos con algo que no sabes usar.</p>
        <p style="font-size:12px;font-weight:600;color:var(--green);margin-top:12px;">INCLUIDO EN TODA IMPLEMENTACIÓN</p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Verificar en browser**

La sección debe mostrar 4 cards en fila (con layout responsive en mobile). Cada card tiene ícono, número, headline, descripción y badge verde. Las cards deben tener `border-left` ámbar visible.

- [ ] **Step 4: Ajuste responsive (si aplica)**

Si en mobile las 4 cards en fila se ven apretadas, agregar dentro del `<style>` al final del bloque de estilos:

```css
@media (max-width: 768px) {
  .method-grid[style*="repeat(4"] {
    grid-template-columns: 1fr 1fr !important;
  }
}
```

Si ya existe un breakpoint `768px` con `.method-grid`, agregar `grid-template-columns` ahí.

- [ ] **Step 5: Commit**

```bash
git add docs/index.html
git commit -m "proceso: reemplazar 'El Método' por sección cómo trabajamos en 4 pasos"
```

---

## Task 7: Sección "CAPACITACIÓN" — demover talleres y curso

**Files:**
- Modify: `docs/index.html` — reemplazar las secciones `<!-- TALLERES -->` y `<!-- 1 A 1 -->` (~líneas 2048–2112) por una sola sección compacta de capacitación

La sección actual tiene 2 tarjetas de talleres grandes + 2 cards de 1 a 1. Colapsar todo en una sección más pequeña que diga "si prefieres aprender" — con 3 opciones: taller presencial, mentoría 1 a 1, curso online.

- [ ] **Step 1: Eliminar la sección `<!-- TALLERES -->` completa**

Eliminar desde `<section class="talleres" id="talleres">` hasta su `</section>`.

- [ ] **Step 2: Eliminar la sección `<!-- 1 A 1 -->` completa**

Eliminar desde `<section class="uno-a-uno" id="uno-a-uno">` hasta su `</section>`.

- [ ] **Step 3: Insertar nueva sección `<!-- CAPACITACIÓN -->` en su lugar**

Colocar el siguiente bloque (va antes del `<!-- EXPEDIENTE -->`):

```html
<!-- CAPACITACIÓN -->
<section class="talleres" id="capacitacion" style="padding: 80px 0; background: var(--black-mid); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
  <div class="talleres-inner">
    <p class="section-label reveal">CAPACITACIÓN</p>
    <h2 class="section-h2 section-h2-center reveal">¿Prefieres que tu equipo aprenda a usarla?</h2>
    <p class="reveal" style="text-align:center;color:#888;font-size:15px;max-width:600px;margin:0 auto 48px;">También enseñamos. Si tu objetivo es que tu equipo use IA por su cuenta con estructura y criterio, tenemos tres formas de lograrlo.</p>

    <div class="talleres-grid" style="grid-template-columns:repeat(3,1fr);gap:24px;">
      <div class="taller-card reveal">
        <span class="taller-badge">PRESENCIAL</span>
        <h3 class="taller-name">Taller IA Sin Miedo</h3>
        <p class="taller-desc">3 horas con datos reales de tu empresa. El equipo sale usando IA con estructura, prompts claros y carpetas de contexto.</p>
        <div class="taller-meta">
          <span>Hasta 30 personas</span>
          <span>Hermosillo o remoto</span>
        </div>
        <a href="https://wa.me/526623478040?text=Quiero%20info%20del%20taller%20IA%20Sin%20Miedo" class="btn-outline-green" target="_blank" rel="noopener">Solicitar información</a>
      </div>
      <div class="taller-card reveal">
        <span class="taller-badge">1 A 1</span>
        <h3 class="taller-name">Mentoría Personalizada</h3>
        <p class="taller-desc">Sesiones individuales con tus herramientas, tus archivos y tus tareas reales. Aprendes a tu ritmo con seguimiento entre sesiones.</p>
        <div class="taller-meta">
          <span>Sesiones semanales o quincenales</span>
          <span>Diagnóstico incluido</span>
        </div>
        <a href="https://wa.me/526623478040?text=Quiero%20info%20de%20mentor%C3%ADa%201%20a%201" class="btn-outline-green" target="_blank" rel="noopener">Solicitar mentoría</a>
      </div>
      <div class="taller-card featured reveal">
        <span class="taller-badge green">ONLINE</span>
        <h3 class="taller-name">Curso IA Aplicada</h3>
        <p class="taller-desc">A tu ritmo, desde donde estés. Módulos prácticos con ejercicios reales. Acceso de por vida al contenido y sus actualizaciones.</p>
        <div class="taller-meta">
          <span>Acceso inmediato</span>
          <span>Actualizado continuamente</span>
        </div>
        <a href="ia-aplicada.html" class="btn-green">Ver el curso →</a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Verificar en browser**

La sección "CAPACITACIÓN" debe mostrar 3 cards en fila. La tercera card ("ONLINE") debe ser la destacada (clase `featured`). El link "Ver el curso →" debe ir a `ia-aplicada.html`. En mobile debe colapsar a 1 columna.

- [ ] **Step 5: Commit**

```bash
git add docs/index.html
git commit -m "capacitacion: colapsar talleres + 1a1 en sección compacta, agregar link a curso"
```

---

## Task 8: Bio del instructor — actualizar para consultor, no maestro

**Files:**
- Modify: `docs/index.html` — sección `<!-- SOBRE EL INSTRUCTOR -->` (~líneas 2279–2317)

El bio actual dice "El instructor". Cambiar a "El consultor" con el mismo tono pero enfocado en implementación.

- [ ] **Step 1: Actualizar label y headline**

Cambiar:
```html
<p class="section-label reveal">EL INSTRUCTOR</p>
<h2 class="about-h2 reveal">No teoría.
```

Por:
```html
<p class="section-label reveal">QUIÉN LO HACE</p>
<h2 class="about-h2 reveal">No consultores.
```

- [ ] **Step 2: Actualizar el bio**

Cambiar:
```html
<p class="about-bio reveal">El instructor es la cara de Lightning — y detrás hay un equipo técnico con el talento para hacer todo realidad. Lo que nos diferencia no es solo el stack: es la capacidad de sentarnos con un cliente, entender cómo opera su negocio y detectar dónde la IA genera impacto real. Sin venderle tecnología que no necesita. Sin abrumarlo con términos que no le sirven. El resultado siempre es un plan concreto, ejecutable y diseñado para escalar con el equipo que ya tiene.</p>
```

Por:
```html
<p class="about-bio reveal">Luis es la cara de Lightning — y detrás hay un equipo técnico con el talento para hacer todo realidad. Lo que nos diferencia no es el stack: es la capacidad de sentarnos con un cliente, entender cómo opera su negocio y detectar dónde la IA genera impacto real. Sin venderle tecnología que no necesita. Sin proyectos que toman años. El resultado es siempre un sistema concreto, entregado funcionando y diseñado para que tu equipo lo opere desde el primer día.</p>
```

- [ ] **Step 3: Verificar en browser**

Sección debe decir "QUIÉN LO HACE" y "No consultores." Bio actualizado visible.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html
git commit -m "about: actualizar bio de instructor a consultor/implementador"
```

---

## Task 9: CTA final — Diagnóstico gratis

**Files:**
- Modify: `docs/index.html` — sección `<!-- CTA FINAL -->` (~líneas 2319–2328)

- [ ] **Step 1: Reemplazar el CTA final**

Leer el contenido actual y reemplazar por:
```html
<!-- CTA FINAL -->
<section class="cta-final">
  <div class="cta-final-inner">
    <h2 class="cta-final-h2 reveal">Agenda tu diagnóstico gratis.</h2>
    <p class="cta-final-sub reveal">20 minutos para entender tu operación. Propuesta ese mismo día. Sin compromiso.</p>
    <div class="reveal" style="display:flex;flex-direction:column;align-items:center;gap:16px;">
      <a href="https://wa.me/526623478040?text=Hola%2C%20quiero%20agendar%20un%20diagn%C3%B3stico%20gratuito%20para%20mi%20negocio" class="btn-primary" target="_blank" rel="noopener" style="font-size:17px;padding:16px 36px;">Agendar por WhatsApp →</a>
      <p class="cta-note">6623478040 · Hermosillo, Sonora · Facturación disponible</p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Verificar en browser**

CTA final debe decir "Agenda tu diagnóstico gratis." con el botón de WhatsApp grande y la nota con el número.

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "cta: cambiar a diagnóstico gratis como acción final"
```

---

## Task 10: QA final — recorrido completo del sitio

**Files:** ninguno nuevo — verificación en browser

- [ ] **Step 1: Abrir `docs/index.html` en Chrome (modo local)**

Verificar de arriba a abajo que la estructura es:
1. NAV: Servicios | Proyectos | Capacitación | Curso online | [Diagnóstico gratis]
2. HERO: "Construimos sistemas de IA..."
3. ¿PARA QUIÉN?: 5 pain points
4. LO QUE HACEMOS: 6 servicios en grid 3x2
5. CÓMO TRABAJAMOS: 4 pasos en fila
6. EXPEDIENTE: carousel de proyectos (sin cambios)
7. CAPACITACIÓN: 3 cards (taller, mentoría, curso online)
8. SOBRE EL INSTRUCTOR: bio actualizado
9. CTA FINAL: "Agenda tu diagnóstico gratis"
10. FOOTER: links incluyendo Admin y Bóveda

- [ ] **Step 2: Verificar mobile (DevTools → 375px)**

- Nav hamburger funciona
- Hero stack vertical, imágenes no se desbordan
- Grids de 3 y 6 columnas colapsan a 1 o 2 columnas
- CTA botón full-width

- [ ] **Step 3: Verificar tema light**

Hacer click en toggle de sol/luna. El sitio debe cambiar correctamente.

- [ ] **Step 4: Verificar que admin.html y boveda.html no cambiaron**

Abrir `docs/admin.html` — debe cargar igual. Abrir `docs/boveda.html` — debe cargar igual.

- [ ] **Step 5: Commit final de QA (si hubo ajustes menores)**

```bash
git add docs/index.html
git commit -m "qa: ajustes menores post-revisión visual completa"
```

---

## Orden de ejecución recomendado

Los tasks 1–9 son secuenciales (cada uno modifica el mismo archivo). Task 10 va al final.

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10
```

Push solo después del QA del Task 10 y con aprobación de Luis.
