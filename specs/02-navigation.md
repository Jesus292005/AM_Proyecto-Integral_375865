# 02 — Pantallas y navegación

> **Estado:** ✅ Aprobado v1.0 (2026-10-10, D60)
> **Última actualización:** 2026-10-03
> Base: [`01-mvp.md`](./01-mvp.md). Cada pantalla existe porque la necesita al menos una feature; si no, no se construye.
> Este documento define **qué hay en cada pantalla y cómo se llega**, no cómo se ve (colores, tipografía, estilo): eso se define en la fase de Diseño.
> Las rutas están escritas sin depender de una librería; la herramienta de navegación se elige en la fase de Diseño.

---

## 1. Mapa de pantallas

```
Inicio de sesión (S01)
│
└── App (pestañas inferiores)
    │
    ├── Inicio (S11)                          ← pantalla inicial (D39)
    │   └── Elegir equipo favorito (S12, modal)
    │
    ├── Partidos (S02)
    │   └── Detalle de partido (S03)
    │
    ├── Grupos (S04)
    │   ├── Crear grupo (S05, modal)
    │   ├── Unirse a grupo (S06, modal)
    │   │   └── Escanear QR (S07, cámara)
    │   └── Detalle de grupo (S08)
    │       └── Perfil de otro usuario (S13)
    │
    └── Perfil (S09)
        └── Simulación de partidos (S10)      ← solo cuentas administrador (D36)
```

**Total: 13 pantallas** (3 modales, 1 solo administrador, 1 que reutiliza el diseño de Perfil).

## 2. Pantallas

| ID | Pantalla | Features | Qué muestra / permite | Estados obligatorios |
|---|---|---|---|---|
| S01 | Inicio de sesión | F01 | Botón "Continuar con Google". | Cargando, error de Google, sin internet |
| S11 | Inicio | F17, F18 | **Tres bloques fijos** (no configurables): (1) Próximo partido de mi equipo favorito con acceso directo a predecir — si no tengo equipo, invitación a elegirlo (S12); (2) Partidos de la jornada **pendientes de predecir**; (3) Mis grupos con mi posición — si no tengo grupos, invitación a crear/unirme. Cada bloque lleva a la pantalla correspondiente. | Por bloque: cargando, vacío, error (un bloque con error no rompe los demás) |
| S12 | Elegir equipo favorito | F18 | Lista de los 18 equipos de la Liga MX; seleccionar uno. También accesible desde Perfil para cambiarlo. | Cargando, error |
| S02 | Partidos | F02, F03, F10 | Partidos de una jornada (selector de jornada). Cada partido indica hora, estado (por jugar / en juego / terminado) y si ya predije. En jornadas pasadas muestra mis puntos por partido → **cubre el historial de F10** (D34). | Cargando, con datos, jornada sin partidos, error/sin internet |
| S03 | Detalle de partido | F03, F04, F06, F10, F21, (F16) | **Antes del inicio:** previa del partido (forma, tabla, enfrentamientos directos) + formulario de predicción + justificación (crear/editar); las predicciones de los demás **no se ven**. **Desde la hora de inicio:** mi predicción bloqueada + predicciones y justificaciones de quienes comparten al menos un grupo conmigo (D35). **Terminado:** resultado, estadísticas usadas, mis puntos con desglose (base + bono + explicación de la IA; "bono pendiente" si la IA no ha evaluado). | Cargando, error al guardar, partido ya iniciado al intentar guardar, sin internet |
| S04 | Grupos | F07 | Lista de mis grupos (nombre, # miembros, mi posición). Botones "Crear" y "Unirse". | Cargando, sin grupos (vacío con las dos acciones), error |
| S05 | Crear grupo | F07 | Nombre del grupo → al crear, navega a S08. | Nombre vacío/inválido, error al crear |
| S06 | Unirse a grupo | F07, F12 | Campo de código + botón "Escanear QR". | Código vacío, código inválido, ya soy miembro, error |
| S07 | Escanear QR | F12 | Cámara; al leer un QR válido regresa a S06 con el código lleno. Solo dentro de la app (D37). | Permiso de cámara negado, QR no válido |
| S08 | Detalle de grupo | F07, F08, F12, F14, F15 | Ranking con dos vistas: **torneo** y **jornada**. En la vista de jornada, la tarjeta "Mejor análisis de la jornada". Código e imagen QR para invitar. Botón compartir. Tocar a un miembro abre S13 (D38). | Cargando, ranking sin puntos aún, error |
| S09 | Perfil (propio) | F01, F11, F13, F14, F18, (F20) | Foto y nombre (de Google), equipo favorito, puntos totales, racha, "Vitrina" de insignias, (carta F20). Ajustes: recordatorios (sí/no), cambiar equipo. Cerrar sesión. Acceso a S10 solo si soy administrador. | Cargando, sin insignias aún, error |
| S13 | Perfil de otro usuario | F19 | Mismo diseño que S09 en **solo lectura**: foto, nombre, equipo, puntos, racha, Vitrina, (carta). **No** muestra predicciones de partidos que no han empezado. | Cargando, error, usuario no encontrado |
| S10 | Simulación | F09 | Elegir un partido de 2024 y "jugarlo" como partido actual; forzar su final para disparar la calificación. | — (solo administrador) |

## 3. Rutas y datos que viajan

**Regla:** entre pantallas solo viajan **identificadores**; cada pantalla carga sus propios datos. Así se evita mostrar datos viejos.

| Ruta | Pantalla | Parámetros | Llega desde | Puede ir a |
|---|---|---|---|---|
| `/login` | S01 | — | Arranque sin sesión; cerrar sesión | Inicio |
| `/inicio` | S11 | — | Login, pestaña | S03, S02, S08, S04, S12 |
| `/equipo` | S12 | — | S11, S09 | Atrás |
| `/partidos` | S02 | `jornada?` (por defecto la actual) | Pestaña, S11 | S03 |
| `/partido/:partidoId` | S03 | `partidoId` | S02, S11, notificación | Atrás |
| `/grupos` | S04 | — | Pestaña, S11 | S05, S06, S08 |
| `/grupos/nuevo` | S05 | — | S04, S11 | S08 (al crear) |
| `/grupos/unirse` | S06 | `codigo?` | S04, S11, S07 | S07, S08 (al unirse) |
| `/grupos/escanear` | S07 | — | S06 | S06 con `codigo` |
| `/grupo/:grupoId` | S08 | `grupoId`, `vista?` (`torneo`/`jornada`) | S04, S05, S06, S11, notificación | S13 |
| `/usuario/:usuarioId` | S13 | `usuarioId` | S08 | Atrás |
| `/perfil` | S09 | — | Pestaña | S12, S10, Login (cerrar sesión) |
| `/admin/simulacion` | S10 | — | S09 (solo administrador) | Atrás |

## 4. Entradas externas

| Entrada | Destino | Caso negativo |
|---|---|---|
| Notificación "tus puntos están listos" | S03 del partido calificado | Partido no encontrado → S02 con mensaje |
| Notificación "recordatorio: el partido empieza pronto" | S03 del partido | Si ya empezó, S03 muestra la predicción bloqueada |
| Cualquier ruta sin sesión iniciada | S01; después de iniciar sesión, continuar al destino original | — |

## 5. Pendientes

| ID | Pregunta | Propuesta de Claude |
|---|---|---|
| — | Ninguno. N-01 resuelto por D39: la pantalla inicial es Inicio (S11). | — |
