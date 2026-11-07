# F07 — Grupos privados: crear, unirse con código, ver miembros
> **Estado:** ✅ **Terminada** (2026-11-07, D99: cumple CA1–CA14 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-07, D97) · **Prioridad:** Must · **Módulo:** M4 · **Depende de:** F01, F03, F04 · **Pantallas:** S04, S05, S06, S08 (miembros, código, salir), S03 (predicciones del grupo) · **Decisiones:** D20, D35, D37, D45, D46, D52, D54, D76, D78, D82, D90 (5), D97

## Decisiones (D97)
1. **P-26:** `usuario_publico` pasa a `security_invoker` y solo muestra **mi registro y el de quienes comparten grupo conmigo**. `usuario` agrega esa política de lectura y permisos **por columna**: nadie lee `correo` ni `google_id` por la API (la app no los usa). Los compañeros de grupo pueden leer `rol` y `recordatorios_activos`. Se vuelven a correr las pruebas de F01.
2. **Límites:** 30 miembros por grupo y 10 grupos por usuario (`GRUPO_LLENO` / `LIMITE_GRUPOS`).
3. **Salir:** cualquiera puede salir, también el creador. Si sale el último `ADMIN`, el miembro más antiguo pasa a `ADMIN`; si sale el último miembro, el grupo y su código se borran. Si vuelves a entrar, cuentan de nuevo todos tus puntos del torneo (R09, D10).

## Objetivo
Que el usuario cree un grupo privado, invite con un código y vea a sus miembros. Con los grupos llega **R04**: las predicciones y justificaciones de otros se ven solo entre quienes comparten grupo y solo desde `cierrePredicciones`. El servidor lo aplica (D35).

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Nombre:** de 3 a 30 caracteres después de recortar los espacios del inicio y del final. No es único. El servidor lo recorta y lo valida (`NOMBRE_INVALIDO`). | 02-navigation S05 |
| R2 | **Código de invitación:** 8 caracteres del alfabeto `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (31 caracteres, sin `0 O 1 I L`), generados en el servidor con números aleatorios criptográficos (`gen_random_bytes`), únicos (si se repite, se genera otro) y que no cambian. Se muestra como `ABCD-EFGH`. Al unirse, el servidor ignora mayúsculas y minúsculas, guiones y espacios. Con 31⁸ ≈ 8.5 × 10¹¹ combinaciones no se puede adivinar probando. | 03-data-model `Grupo` |
| R3 | **Crear:** el creador queda como `ADMIN`. Respeta el límite de grupos por usuario (decisión 2). | 03-data-model `MiembroGrupo` |
| R4 | **Unirse:** un solo camino, `unirse_grupo(codigo)`, que también usa el QR (F12). Si ya soy miembro, no me duplica: devuelve el grupo con `ya_era_miembro = true` y la app abre el grupo. Errores: `CODIGO_INVALIDO` (no tiene el formato), `CODIGO_NO_EXISTE`, `GRUPO_LLENO`, `LIMITE_GRUPOS`. | D20 |
| R5 | **Salir:** según la decisión 3. Al salir, dejo de ver al instante las predicciones de los miembros y ellos las mías (R04 se calcula en cada lectura), y desaparezco del ranking del grupo (D45). | D45 |
| R6 | **R04:** una predicción ajena (también su justificación) solo se lee si comparto **al menos un grupo** con su autor **y** la hora del servidor ya llegó a su `Partido.cierrePredicciones`. Una predicción nunca se lee "a medias": se ve completa o no se ve. Escribir sigue siendo solo sobre las propias (F03 R6). | D35, D46, D82, D90 (5) |
| R7 | **S03, sección "En tus grupos"** (después del cierre, debajo de mi predicción): una fila por **persona** que comparte grupo conmigo y predijo el partido (aunque compartamos varios grupos, sale una vez, D20), con foto, nombre, la predicción en el formato de F03 en solo lectura y la justificación completa si tiene. Ordenada por nombre. No muestra los puntos de los demás: esos están en el ranking (F08). | 02-navigation S03 |
| R8 | **Datos de usuario:** según la decisión 1. La app sigue leyendo nombre y foto de otros solo por `usuario_publico`. | P-26, F01 V3 |
| R9 | **S04:** mis grupos con su nombre y número de miembros (F08 agrega mi posición), ordenados por el más reciente al que me uní. "Crear" lleva a S05 y "Unirse" a S06. | 02-navigation S04 |
| R10 | **S08:** nombre del grupo, lista de miembros (foto, nombre, marca "Admin"; yo resaltado con `TablaFila` resaltada), sección "Invitar" con el código en `titulo2` (F12 agrega el QR) y botón secundario "Salir del grupo" con confirmación. F08 cambia la lista por el ranking. | 02-navigation S08, 05-ui §5 |
| R11 | **Navegación:** S05 y S06 son modales que tapan el menú (D76). Al crear o unirme, el modal se cierra y se abre S08 **en la pestaña Grupos** con `router.navigate` (D78). Al salir de un grupo, S08 regresa a S04. | D76, D78 |
| R12 | **Permisos (nivel 3, se aprueban con esta spec):** tablas `grupo` y `miembro_grupo` con RLS. `authenticated` **solo lee** (`grupo` y `miembro_grupo` de los grupos de los que es miembro) y **no escribe directamente**: crea, se une y sale únicamente con `crear_grupo(nombre)`, `unirse_grupo(codigo)` y `salir_grupo(grupo_id)`, `security definer` con `search_path` vacío y `auth.uid()` como único usuario posible. Función de ayuda `comparte_grupo(otro uuid)` (`security definer`, `stable`) para las políticas de `prediccion`, `usuario` y `miembro_grupo` (evita la recursión de RLS). `prediccion` agrega la política de lectura de R6. `usuario` y `usuario_publico` según la decisión 1. `anon` sin acceso a nada de esto; `service_role` completo. | D14, D35, P-26 |

## Flujo
**Servidor**
1. Migración de grupos: tablas, generador del código (R2), las tres funciones de R12 con sus errores, `comparte_grupo`, RLS y permisos.
2. Migración de R04 y P-26: política de lectura de `prediccion` (R6), cambios de `usuario` / `usuario_publico` (decisión 1) y vista `mis_grupos` (`security_invoker`: id, nombre, miembros, unido en) para S04.

**App**
1. S04 lee `mis_grupos` y pinta R9.
2. S05: `CampoTexto` con contador "n/30" → "Crear grupo" → `crear_grupo` → R11.
3. S06: `CampoTexto` del código (mayúsculas automáticas, acepta guion) + "Unirse" + "Escanear QR" (F12). Un solo gancho `useUnirseAGrupo` valida el formato con el mismo esquema Zod que usará F12 (`esquemaCodigoInvitacion`), llama a `unirse_grupo` y sigue R11. Si llega `codigo` en la ruta, el campo aparece lleno.
4. S08 lee el grupo y sus miembros (`miembro_grupo` + `usuario_publico`) y pinta R10.
5. S03, después del cierre, pide las predicciones del partido de otros usuarios (las RLS ya filtran por R6) con su nombre y foto, y pinta R7.

## Estados de pantalla
| Pantalla | Estado | Qué se ve |
|---|---|---|
| S04 | Vacío | "Aún no estás en ningún grupo." + "Crear grupo" y "Unirse con código" (05-ui §6). |
| S05 | Nombre inválido | `CampoTexto` en error: "Escribe un nombre de 3 a 30 caracteres." |
| S05 | Límite | "Ya estás en 10 grupos; sal de uno para crear otro." |
| S06 | Código mal escrito | "El código tiene 8 letras y números, como ABCD-EFGH." (sin llamar al servidor) |
| S06 | No existe / lleno / límite | "No encontramos un grupo con ese código." · "Ese grupo ya tiene 30 miembros." · "Ya estás en 10 grupos; sal de uno para unirte a otro." Se conserva lo escrito. |
| S06 | Ya era miembro | Abre S08 con el aviso `meta` "Ya eras miembro de este grupo." |
| S08 | Grupo no encontrado (no soy miembro o no existe) | "No perteneces a este grupo." + "Ir a Grupos". |
| S03 | Nadie más predijo | "Nadie de tus grupos predijo este partido." (solo si estoy en algún grupo; sin grupos, la sección no se muestra) |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Crear con nombre válido deja el grupo con el creador como `ADMIN`; se rechazan nombres de 2 y de 31 caracteres o solo espacios (`NOMBRE_INVALIDO`) y el grupo 11 (`LIMITE_GRUPOS`). | [prueba] pgTAP |
| CA2 | 1,000 códigos generados tienen 8 caracteres, solo del alfabeto de R2, sin repetirse. | [prueba] pgTAP |
| CA3 | Unirse con `abcd-efgh`, `ABCD EFGH` o `ABCDEFGH` funciona igual; unirse dos veces deja una sola fila (`ya_era_miembro`); se rechazan un código con `O` o de 7 caracteres (`CODIGO_INVALIDO`), uno inexistente (`CODIGO_NO_EXISTE`), el miembro 31 (`GRUPO_LLENO`) y el grupo 11 del usuario (`LIMITE_GRUPOS`). | [prueba] pgTAP |
| CA4 | Salir quita al miembro; si era el último `ADMIN`, el más antiguo pasa a `ADMIN`; si era el último, el grupo se borra; salir de un grupo ajeno falla (`NO_MIEMBRO`). | [prueba] pgTAP |
| CA5 | Un no miembro no lee el grupo, su código ni sus miembros; nadie de `authenticated` inserta, modifica ni borra directamente en `grupo` o `miembro_grupo`; `anon` no tiene acceso ni ejecuta las funciones. | [prueba] pgTAP |
| CA6 | R04 con dos partidos (uno antes y otro después del cierre) y tres usuarios: el miembro del mismo grupo lee la predicción y la justificación ajenas **solo** después del cierre; el que no comparte grupo no las lee nunca; al salir del grupo se dejan de leer; nadie modifica ni borra la de otro. | [prueba] pgTAP |
| CA7 | Las pruebas de F03 (CA6) y F04 (CA3) se ajustan a R04 y pasan: sin grupo en común, nadie lee la predicción ajena antes ni después del cierre, tampoco el administrador. `mis_puntos` sigue devolviendo solo lo propio. | [prueba] pgTAP |
| CA8 | Decisión 1 aplicada: `usuario_publico` devuelve solo mi fila y las de quienes comparten grupo conmigo, con sus 4 columnas; nadie de `authenticated` lee `correo` ni `google_id`; las pruebas de F01 (CA7) pasan. | [prueba] pgTAP |
| CA9 | S05 y S06 validan antes de llamar, muestran cada error de R4 con su texto y conservan lo escrito; al crear o unirse navegan a S08 con `navigate`. S04 muestra sus estados. | [prueba] jest |
| CA10 | S03 muestra "En tus grupos" solo con el partido cerrado, una fila por persona, y el texto de vacío. | [prueba] jest |
| CA11 | Con dos cuentas: la primera crea un grupo; la segunda se une escribiendo el código; las dos ven a ambos en S08; la segunda sale y desaparece de la lista de la primera. | [teléfono] |
| CA12 | Las dos cuentas en el mismo grupo predicen un simulado: antes del cierre ninguna ve la predicción de la otra; después de "Iniciar ahora", cada una ve la de la otra con su justificación en S03. | [teléfono] |
| CA13 | El asesor de seguridad de Supabase ya no marca `usuario_publico` como crítica. | [teléfono] 👤 tablero |
| CA14 | S04, S05, S06 y S08 se ven completas en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Ranking (F08), QR (F12), expulsar miembros, renombrar el grupo o cambiar su código, perfil de otro usuario al tocar un miembro (F19, fuera del plan), compartir (F15), comentarios (F16), puntos de los demás en S03.
