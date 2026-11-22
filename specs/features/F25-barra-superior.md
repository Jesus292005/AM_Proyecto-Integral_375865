# F25 — Barra superior
> **Estado:** ✅ **Terminada** (2026-11-22, D110: cumple CA1–CA4 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-21, D108) · **Prioridad:** Must del rediseño · **Módulo:** M6 Identidad · **Depende de:** F13, F18, F20, F28 · **Pantallas:** S11, S02, S04, S09 · **Decisiones:** D52, D76, D78, D104, 01-mvp §7

## Decisiones (D108)
Ninguna.

## Objetivo
Que tu identidad acompañe a toda la app: en las cuatro pantallas principales, arriba, tu foto y nombre, tu racha, tu media y tu equipo, a un toque de tu perfil (01-mvp §7, M6).

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Dónde:** en la pantalla raíz de cada pestaña (S11, S02, S04, S09), arriba del contenido y debajo del área segura. Los detalles (S03, S08, S13, S10) y los modales siguen con su `EncabezadoPantalla`, sin barra. | D76 |
| R2 | **Contenido:** a la izquierda, `FotoUsuario` (`fotoLista`) y el nombre (`cuerpoFuerte`, una línea). A la derecha: racha actual (ícono `llama` + número), media de la carta en una pastilla con el metal de su nivel y el nivel en texto (U5, U6; sin carta, "—" en `superficie2`) y el escudo del equipo favorito (`escudoLista`; sin equipo no se muestra). Alto mínimo `areaTactil`, línea inferior `linea`. | U5, U6 |
| R3 | **Toque:** toda la barra es un botón "Ir a tu perfil" que abre S09 con `router.navigate` (D78); en S09 no hace nada. Su etiqueta accesible lee todo: "Tu perfil: {nombre}, racha {n}, media {m}, {equipo}". | D78, U5 |
| R4 | **Datos:** las mismas consultas de S09 (perfil de F28 R7, `mi_racha` de F13 y `mi_carta` de F20) con la misma caché: sin consultas nuevas en el servidor. Se vuelven a pedir al enfocar cada pestaña (como F13 R7). | D52 |
| R5 | La derecha deja lugar para la campana de avisos de M9 (F27); no se dibuja todavía. | D104 |

## Flujo
**App:** componente `BarraSuperior` en las cuatro pantallas raíz → lee las tres consultas → tocarla navega a `/perfil`. Sin cambios en el servidor.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | La barra con esqueletos del mismo tamaño (círculo, nombre y dos pastillas). |
| Error | Sin mensaje: la barra muestra lo que sí cargó (inicial "?" si no hay perfil) y cada pantalla maneja sus propios estados. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | La barra está en S11, S02, S04 y S09 y no en S03 ni S08; muestra nombre, racha, media con su nivel y escudo; sin equipo no hay escudo; sin carta, "—". | [prueba] jest |
| CA2 | Tocarla desde S02 abre S09 sin apilar pantallas (D78); en S09 no navega. | [prueba] jest |
| CA3 | Después de que un partido simulado sume, la racha y la media de la barra cambian al volver a la pestaña. | [teléfono] |
| CA4 | La barra se ve completa en las cuatro pestañas en el teléfono y en un emulador de 320–360 dp (D75); con un nombre largo se corta con "…". | [teléfono] |

## Fuera de alcance
Campana y avisos (F27, M9), buscador, menú lateral, barra en los detalles.
