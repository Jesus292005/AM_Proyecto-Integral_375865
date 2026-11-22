# F19 — Perfil de otro usuario
> **Estado:** spec aprobada v1.0 (2026-11-22, D113) · pendiente de implementar · **Prioridad:** Must del rediseño (antes Should, D39, D104) · **Módulo:** M8 Grupos sociales · **Depende de:** F07, F13, F14, F18, F20, F26, F28 · **Pantallas:** S13 · **Decisiones:** D35, D38, D45, D52, D76, D78, D101, D104, D108, R04

## Decisiones (D113: opción A en todas)
| # | Pregunta | A (recomendada) | B | Consecuencia |
|---|---|---|---|---|
| 5 | ¿Qué se ve de las insignias de otro? | **Cuáles tiene, cuántas veces y cuándo la última**, con su metal y si fue con un simulado; **sin** grupo ni jornada. | Lo mismo que en mi Vitrina: también el grupo y la jornada, **solo si es un grupo que compartimos**. | A no expone nombres de grupos a los que no pertenezco (hoy solo sus miembros los leen, F07 R12) y es una consulta simple. B da más contexto ("Top de la jornada en Los Compas") a cambio de una regla más de visibilidad (nivel 3) y su prueba. |

## Objetivo
Ver quién es cada compañero de grupo y cómo predice: su foto, su nombre, su equipo, su carta, su racha y su Vitrina, con el mismo diseño de mi perfil (F28) y en solo lectura (D38). Reemplaza la pantalla provisional S13.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Quién lo ve:** solo quien **comparte hoy** al menos un grupo con esa persona (`comparte_grupo`, F07 R12), o la persona misma. Si deja de compartir grupo (alguien sale, D45), deja de verlo en la siguiente lectura. Un usuario que no existe y uno con el que no comparto grupo dan **el mismo** error (`NO_ENCONTRADO`), para no revelar quién existe. | D35, D38, D45 |
| R2 | **Contenido de S13** (mismo diseño que S09, F28 R1–R2): encabezado con `FotoUsuario` (`fotoPerfil`), nombre (`titulo1`) y equipo favorito (escudo + nombre corto, o "Sin equipo favorito"); Carta (F20 R7), Racha (F13 R7) y Vitrina (F14 R6). **Sin** Ajustes, "Elige tu equipo", Recordatorios, Simulación ni "Cerrar sesión", y sin `BarraSuperior` (S13 no es raíz de una pestaña, F25). | F28, D38 |
| R3 | **Solo lectura:** los textos hablan en tercera persona ("Le faltan n predicciones calificadas para su carta.", "Su racha empieza con su primer acierto."). Las hojas de detalle de la carta (F20 R8) y de las insignias (F14 R6) se abren igual, porque solo explican; el detalle de una insignia sigue la decisión 5 ("La ganó n veces", sin grupo ni jornada). No hay animación de insignias nuevas ni se marcan vistas (F14 R7 es solo para las propias). | F14, F20 |
| R4 | **Nunca predicciones:** S13 no muestra predicciones, justificaciones ni puntos por partido de nadie, ni de partidos abiertos ni cerrados (eso ya está en S03 y en el muro de F26, con R04). La carta y la racha solo usan calificaciones, que existen después del partido. | R04, D35 |
| R5 | **Servidor, una fórmula:** la racha (F13 R1–R5) y la carta (F20 R1–R4) se calculan en funciones internas `racha_de(usuario)` y `carta_de(usuario)` que también usan `mi_racha` y `mi_carta`, para que mi perfil y el que ven los demás nunca den números distintos. Las vistas propias no cambian de columnas ni de resultado. | D52, F13 R6, F20 R5 |
| R6 | **Servidor, lectura:** `perfil_usuario(usuario_id)`, una fila: `usuario_id`, `nombre`, `foto_url`, `es_yo`, equipo favorito (nombre corto, escudo, colores), las columnas de `mi_racha` y las de `mi_carta`. `insignias_usuario(usuario_id)`: el catálogo de F14 R1 con `veces`, `ultima_obtenida_en` y `es_simulada` de esa persona (decisión 5). Errores `SIN_SESION` y `NO_ENCONTRADO` (R1). | D52, F14 R8 |
| R7 | **Permisos (nivel 3, aprobados con esta spec, D113):** `perfil_usuario` e `insignias_usuario` son `security definer` con `search_path` vacío: comprueban `auth.uid()` y R1 antes de leer, y devuelven solo las columnas de R6 (nunca correo, `rol`, `recordatorios_activos`, predicciones, `vista_en`, grupo ni jornada de las insignias). `racha_de` y `carta_de` son `security definer` y también comprueban R1 (la persona misma o alguien con grupo en común), porque `mi_racha` y `mi_carta` (`security_invoker`) las llaman con el rol de quien consulta; esto **cambia** F13 R8 y F20 R6, que decían "sin `security definer`". `execute` para `authenticated`; `anon` sin acceso. | D14, D35, F07 R12, F13 R8, F20 R6 |
| R8 | **Entradas:** desde S08 (Miembros, el muro y el analista, F26) y desde el analista de S08 abierto en la pestaña Inicio; abre dentro de la pestaña desde la que se llegó, con el menú visible (D76), con `router.navigate` (D78). Tocarme a mí mismo abre S13 con mis datos y "Así te ven en tus grupos." en `meta` bajo el nombre. | D76, D78 |
| R9 | **Datos en la app:** dos consultas con Zod (D54), `perfil_usuario` (encabezado, carta y racha) e `insignias_usuario` (Vitrina), con caché por `usuario_id`; las secciones son independientes (una que falla no rompe la otra). Se vuelven a pedir al abrir S13 y al deslizar para recargar. Los componentes `Carta`, la sección de racha y la Vitrina reciben los datos por props, así S09 y S13 usan los mismos. | D52, D54, F28 R2 |
| R10 | **Documentos:** 02-navigation S13 (contenido de R2, sin "puntos", y la entrada desde Miembros y el muro) y las notas de permisos de F13 R8 y F20 R6 (R7). | — |

## Flujo
**Servidor:** migración con `racha_de` y `carta_de` (R5) y las vistas `mi_racha` y `mi_carta` sobre ellas, `perfil_usuario` e `insignias_usuario` (R6) y sus permisos (R7).

**App:** S13 lee `usuarioId` de la ruta, pide las dos consultas (R9) y pinta R2–R3 con los componentes de S09; "← Volver" regresa a la pantalla anterior.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | El esqueleto de S09 (F28): círculo y dos barras, la forma de la carta y la rejilla. |
| No encontrado (`NO_ENCONTRADO` o id inválido) | "No puedes ver este perfil: solo se ven los de tus compañeros de grupo." + "Volver". |
| Error / sin conexión | Por sección, mensaje y "Reintentar" (05-ui §6). |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | `perfil_usuario` devuelve la fila de un compañero de grupo y la mía; da `NO_ENCONTRADO` para alguien sin grupo en común, para un id que no existe y para un excompañero después de salir; no trae columnas de más; `anon` no la ejecuta. | [prueba] pgTAP |
| CA2 | La racha y la carta de `perfil_usuario` son iguales a las de `mi_racha` y `mi_carta` de esa misma persona; las pruebas de F13 (CA1–CA5) y F20 (CA1–CA2) siguen pasando; `racha_de` y `carta_de` dan `NO_ENCONTRADO` para alguien sin grupo en común. | [prueba] pgTAP |
| CA3 | `insignias_usuario` devuelve todo el catálogo con las veces, la última fecha y `es_simulada` de esa persona, sin grupo, jornada ni `vista_en`; `NO_ENCONTRADO` como CA1. | [prueba] pgTAP |
| CA4 | S13 pinta encabezado (con y sin equipo), carta (con nivel y bloqueada en tercera persona), racha y Vitrina sin Ajustes ni barra superior; el detalle de una insignia no muestra grupo ni jornada; no anima ni llama a `marcar_insignias_vistas`; con mi propio id muestra "Así te ven en tus grupos." | [prueba] jest |
| CA5 | S13 pinta "No puedes ver este perfil…" con `NO_ENCONTRADO` y un id inválido, y el error con "Reintentar" por sección; tocar un miembro en S08 abre S13 con `navigate` dentro de la pestaña. | [prueba] jest |
| CA6 | B abre el perfil de A desde Miembros y ve la misma carta, racha e insignias que A ve en su S09, sin ninguna predicción; con el perfil de B abierto en A, B sale del grupo y, al recargar, A ve "No puedes ver este perfil…". | [teléfono] |
| CA7 | S13 se ve completa en el teléfono y en un emulador de 320–360 dp (D75); un nombre largo se reduce como en S09. | [teléfono] |

## Fuera de alcance
Historial de predicciones de otro (aun de partidos cerrados), puntos o posición del otro en los grupos que compartimos (están en S08), seguir o bloquear usuarios, reportar un perfil, comparar dos cartas, perfil público para quien no comparte grupo, ranking global.
