# Bitácora de IA

> **Cómo hice esta bitácora:** la reconstruí el 22 de noviembre de 2026 a partir de [`decisions.md`](./decisions.md), los archivos de tareas, los commits y mis conversaciones con Claude. Las fechas son las de cada decisión. No la llevé día a día; el registro que sí llevé al momento es `decisions.md`.
>


## Herramientas

| Herramienta | Para qué |
|---|---|
| Claude (chats de un proyecto en claude.ai) | Idea, problema, alcance y especificaciones (SDD), antes de programar. |
| Claude Code | Specs de cada módulo, tareas, código, pruebas y comandos de commit. |
| Subagente `revisor` | Revisa cada lote contra su spec sin haber escrito el código ([`.claude/agents/revisor.md`](../.claude/agents/revisor.md)). |
| Claude Haiku 5.5 (dentro de la app) | Evalúa las justificaciones de los usuarios (F06). |

## Cómo trabajé con la IA

1. **Idea y specs (sep–oct).** Yo llevé la idea ya aprobada por el docente, el usuario, el presupuesto y mis preferencias de herramientas. Claude me hacía preguntas y proponía opciones; yo elegía. No se programó nada hasta tener las specs aprobadas.
2. **Primeras tareas (oct).** Claude proponía cada paso y yo aprobaba uno por uno ([`tasks/S2-propuestas.md`](./tasks/S2-propuestas.md)). Era seguro pero muy lento: M1 cerró hasta el 2 de noviembre.
3. **Trabajo por lotes (desde el 2 nov).** Le di más autonomía con reglas: la IA no puede cambiar reglas de negocio, permisos, alcance ni gastar dinero sin mí; cada criterio tiene una prueba con su id; un revisor independiente revisa cada lote, y nada se da por terminado hasta que yo lo pruebo en mi teléfono ([`CLAUDE.md`](../CLAUDE.md), D89). Los commits los hago yo (D58).

## Entradas

### 2026-10-03 · Lo que la app promete (D01) 
- **IA:** advirtió que "tratar la ludopatía" no se puede demostrar en un proyecto escolar.
- **Yo:** lo acepté; el proyecto es una alternativa sin dinero para demostrar lo que sabes de fútbol.

### 2026-10-03 · Puntos según probabilidad → tabla fija (D05, D06, D18) 
- **Mi idea original:** dar puntos según la probabilidad del evento ([Idea de proyecto]).
- **IA:** señaló que eso son momios, una mecánica de apuestas, justo lo que la app quiere evitar.
- **Yo:** elegí una tabla fija por dificultad (100 / 150 / 350) y sin multiplicadores.

### 2026-10-03 · La justificación ya no penaliza (D07, D08) 
- **Mi idea original:** la justificación daba puntos extra al acertar y penalizaba al fallar.
- **Cambio:** solo da bono y nunca resta, para no castigar a quien se anima a justificar.

### 2026-10-03 · Decisiones que llevé yo
- Usuario principal de 18 a 25 años que ya apuesta (D02), solo Liga MX (D03  se evaluó la Premier y se descartó), solo Android porque no tengo iPhone (D12).
- API-Football con la temporada 2024 gratis y un mes del plan Pro para 2026; **yo probé la API** antes de decidir (D24, D29).
- Supabase como servidor (D50) y TypeScript estricto con Zod, que pedí yo (D54).
- Quité el reconocimiento de voz de mi idea original porque el teclado de Android ya dicta (D22).

### 2026-10-10 · Identidad de la app
- Nombre "Campeón de Sillón" en lugar de "Sofá" (evita confusión con SofaScore) y un identificador de paquete sin mi nombre (D63, D64).
- Pedí modo claro y oscuro y luego lo cambié a solo oscuro, por mi propio análisis: la mitad del trabajo de diseño (D61 → D62).
- Claude propuso 3 direcciones visuales; elegí una mezcla de dos (D67).

### 2026-10-10 · Errores que encontré probando en el teléfono (D76, D77, D78)
- **IA:** las primeras pantallas tenían un destello blanco al cambiar de pantalla, el menú desaparecía en los detalles y tocar varias veces un botón apilaba copias de la pantalla.
- **Cómo me di cuenta:** probando T03 en mi teléfono.
- **Arreglo:** tema oscuro en la navegación, una pila por pestaña y una regla de lint que prohíbe `router.push`.

### 2026-11-02 · Plan atrasado y nueva forma de trabajo (D87, D88, D89)
- M1 cerró casi un mes tarde porque yo aprobaba cada paso. Replanteamos el plan y pasé al trabajo por lotes con niveles de decisión y revisor.

### 2026-11-02 · Tamaño de la app (D91) 
- **IA:** con todas las librerías nativas, la app pasó el tope de 30 MB (32.79 MB). Se consideró activar R8 para reducirla.
- **Decisión:** se descartó R8 (ahorro incierto y riesgo de romper el inicio de sesión) y subí el tope a 35 MB.

### 2026-11-06 · La IA de la app invertía las faltas (D94, D95)
- **IA (Haiku 5.5):** en los prompts v1 y v2 leyó al revés las faltas de los equipos y le dio 67 a un análisis acertado.
- **Cómo me di cuenta:** la probé con 4 casos cuyo resultado esperado ya sabía ([`prompts/`](./prompts)).
- **Arreglo:** prompt v3 con el nombre del equipo junto a cada dato y esfuerzo `medium`. Antes comparé Haiku 4.5 contra 5.5 y elegí 5.5 por costo.

### 2026-11-07 · Rachas: no tomé la opción recomendada (D101)
- **IA:** recomendó que la racha fuera por torneo.
- **Yo:** elegí la racha histórica, de todos los torneos.

### 2026-11-07 · Permiso de cámara del QR (D100)
- El permiso no se volvía a pedir después de negarlo o de volver de Ajustes. Lo encontré en el guion de prueba y se corrigió.

### 2026-11-12 · Me quedé solo probando 
- Me di cuenta de que validaba en el teléfono sin entender cómo estaba construido el código, y le pedí a Claude que me explicara el proyecto por fases y en lenguaje sencillo.

### 2026-11-21 · Rediseño (D103, D104)
- **Yo:** dije que la app no me gustaba (solo texto, sin íconos) y que no invitaba a quedarse.
- **IA:** propuso el plan del rediseño (M5–M9). Yo elegí el ícono de grupo (círculo de color con inicial) y quedaron fuera el chat y las fotos de grupo.
- **Error detectado:** la app iba a llegar a la demo abriendo en una pantalla de prueba con enlaces falsos (D103).

### 2026-11-21 · El revisor encontró un hueco de seguridad (D109)
- **IA:** desde T06, el nombre y la foto se copiaban de un dato que el propio usuario puede cambiar.
- **Cómo se detectó:** el subagente revisor, al revisar el lote L1 de M6. Se cambió a la identidad de Google (`auth.identities`).

### 2026-11-22 · Ajustes del guion de grupos (D114, D115)
- El "Analista de la jornada" mezclaba el bono de la IA con los puntos, la figura destacaba un análisis de 0/100 y un partido abierto desde un grupo regresaba a Inicio. Lo vi probando y pedí los cambios.

### 2026-11-22 · El rediseño entra a la demo (D117)
- Había decidido congelar del 20 al 22 y dejar el rediseño para después. Lo metí antes de la demo porque la app no se veía presentable y el avance con la IA me dio tiempo.

## Reflexión

- **Lo que funcionó:** escribir specs y decisiones antes de programar, las pruebas con el id de cada criterio, el revisor independiente y la regla de no dar nada por terminado sin probarlo en mi teléfono. Varios errores (D76–D78, D103, D114–D115) solo aparecieron así.
- **Lo que haría distinto:**
  - Aprobé la opción recomendada casi siempre; la cambié pocas veces. Debí cuestionar más.
  - Al dar tanta autonomía dejé de entender el código por un tiempo.
  - No respeté el congelamiento que yo mismo decidí.
  - Concentré muchos commits en los últimos días.

[Idea de proyecto]: ./00-project.md
