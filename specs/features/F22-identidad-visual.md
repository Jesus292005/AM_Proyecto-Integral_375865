# F22 — Identidad visual: íconos, escudos y colores de equipos
> **Estado:** ✅ Aprobada v1.0 (2026-11-21, D105) · pendiente de implementar · **Prioridad:** Must del rediseño · **Módulo:** M5 Base visual · **Depende de:** F02 · **Pantallas:** todas (menú inferior), S02, S03 · **Decisiones:** D52, D67, D68, D70, D86, D91, D104, D105

## Decisiones (D105)
1. **Íconos:** **(A, recomendada)** copiar los trazos de [Lucide](https://lucide.dev) (licencia ISC, se da crédito) al componente `Icono` que ya existe, dibujados con `react-native-svg`. **(B)** instalar `lucide-react-native`. A no agrega dependencias ni peso: Metro no quita los íconos que no se usan, así que B metería los ~1,500 al paquete (D52).
2. **Colores:** la tabla de R4 es una **propuesta**; Jesús la revisa en el teléfono y cambia los que no le convenzan antes de cerrar la feature.

## Objetivo
Que la app deje de ser solo texto: íconos en el menú y en las secciones, escudos de los equipos en el detalle del partido y colores propios de cada equipo (la API no los da, D70). Es la base visual de M5–M9 (D104).

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Menú inferior** con ícono (20 dp) **encima** del texto en los 4 destinos: Inicio → `casa`, Partidos → `calendario`, Grupos → `usuarios`, Perfil → `usuario`. El activo: ícono y texto en `texto` + barra de acento; los demás en `textoTenue`. | 05-ui v2 §5 |
| R2 | **Íconos nuevos** de M5 (05-ui v2 §7): `casa`, `calendario`, `usuarios`, `usuario`, `filtro`, `lapiz`, `chevronIzquierda`, `chevronDerecha`. Cada uno con su nombre en `Icono`; ninguno se usa sin texto o `accessibilityLabel` (U5). | Decisión 1 |
| R3 | **`EscudoEquipo`** (componente nuevo): el escudo de la API (`escudo_url`, con `expo-image` como en S02, D86). Si no hay URL o la imagen falla: círculo en `color_primario` con la **inicial** del nombre corto en `color_texto` (Teko); sin colores, `superficie2` con la inicial en `textoTenue`. Tamaños: `escudoLista` (28) en S02, `escudoEncabezado` (44) en S03. | D70, D86 |
| R4 | **Colores** (propuesta, decisión 2). Viven en `supabase/functions/_shared/datos-equipos.ts` (junto a los nombres cortos, como ya dice su comentario) y P1 los escribe en `equipo.color_primario` y `equipo.color_texto`. Se aplican al remoto volviendo a correr P1 del Apertura 2026 (2 consultas). Ver la tabla de abajo. | D70 |
| R5 | **Encabezado del partido (S03):** cada equipo con su escudo (`escudoEncabezado`) **a un lado del nombre**: local con el escudo a la izquierda, visitante a la derecha. La franja de color de D68 se queda, ahora con el color de R4. | D68 |
| R6 | Sin dependencias nativas nuevas (`expo-image` y `react-native-svg` ya están en la build de T32). | D91 |

### Colores propuestos (R4)
| Equipo | `color_primario` | `color_texto` |
|---|---|---|
| América | #FFD100 | #0B2341 |
| Atlante | #1B3E8C | #FFFFFF |
| Atlas | #C8102E | #FFFFFF |
| Chivas | #CD1F2D | #FFFFFF |
| Cruz Azul | #0057B8 | #FFFFFF |
| Juárez | #00A650 | #FFFFFF |
| León | #00693C | #FFFFFF |
| Monterrey | #0A2D6E | #FFFFFF |
| Necaxa | #E4002B | #FFFFFF |
| Pachuca | #1E3A70 | #FFFFFF |
| Puebla | #1D3F8F | #FFFFFF |
| Pumas | #0E2B5C | #D4AF37 |
| Querétaro | #1A3D7C | #FFFFFF |
| San Luis | #D71920 | #FFFFFF |
| Santos | #00A859 | #FFFFFF |
| Tigres | #FDB913 | #00205B |
| Tijuana | #B5121B | #FFFFFF |
| Toluca | #D0021B | #FFFFFF |
| Mazatlán (solo 2024) | #5A2D82 | #FFFFFF |

## Flujo
**Servidor:** `datos-equipos.ts` agrega los colores; P1 los escribe al crear o actualizar equipos (sin consultas extra a la API). Jesús vuelve a correr P1 del Apertura 2026.

**App:** `Icono` con los trazos nuevos; `MenuInferior` con íconos (R1); `EscudoEquipo` (R3) reemplaza la imagen suelta de `FilaPartido` y entra en `EncabezadoPartido` (R5).

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Escudo cargando | Círculo `superficie2` del mismo tamaño (sin saltos de diseño). |
| Escudo sin URL o con error | El respaldo de R3. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | P1 escribe `color_primario` y `color_texto` de los equipos de `datos-equipos.ts`; correrla dos veces no cambia nada; un equipo que no está en la lista se queda con `null`. | [prueba] servidor |
| CA2 | El menú inferior muestra ícono y texto en los 4 destinos y marca el activo (R1). | [prueba] jest |
| CA3 | `EscudoEquipo` muestra la imagen con URL y, sin URL o con error, el círculo con la inicial en el color del equipo, o neutro sin colores (R3). | [prueba] jest |
| CA4 | S03 muestra los dos escudos a un lado de los nombres y la franja con el color del equipo (R5). | [prueba] jest |
| CA5 | Jesús revisa los 18 equipos en S02 y S03 y aprueba o corrige los colores (decisión 2). | [teléfono] |
| CA6 | Menú, S02 y S03 se ven completos en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Íconos de pantallas de M6–M9 (se agregan con su spec), ícono de la app y pantalla de carga (05-ui UI-01), color de grupo (M8, D104), tema claro (D62).
