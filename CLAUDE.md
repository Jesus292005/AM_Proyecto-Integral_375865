# Campeón de Sillón — instrucciones para Claude

App móvil (React Native + Expo SDK 57, Android) de predicciones de la Liga MX con gamificación y sin dinero real. Proyecto escolar de una sola persona (Jesús) con entrega a finales de noviembre de 2026.

## Antes de hacer cualquier cosa
1. Lee `specs/decisions.md` (decisiones cerradas y pendientes) y la spec de la feature en la que vas a trabajar (`specs/features/`).
2. Lee `App/AGENTS.md`: Expo cambió; consulta la documentación versionada de SDK 57 antes de escribir código de Expo.

## Reglas de trabajo (metodología SDD)
- **No se programa nada sin spec aprobada.** Si algo no está en la spec, no lo inventes (requisitos, datos, navegación, comportamiento, UI): pregunta.
- Flujo por módulo (`specs/01-mvp.md` §4.1): spec → tareas → implementación → pruebas → validación de Jesús → actualizar la spec si algo cambió.
- Una feature solo se marca terminada cuando cumple sus criterios de aceptación **y** Jesús la aprobó en su teléfono.
- Las tareas de cada semana están en `specs/tasks/`.
- Sé estricto: avisa cuando una decisión pueda costar después.

## Commits
- **Jesús ejecuta los commits** (D58). Al terminar cada tarea, entrégale los comandos exactos (`git add` de archivos concretos + mensaje), sin ejecutarlos.
- Un commit por tarea (D59). Formato: `tipo(área): descripción` en español (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`).
- Nunca subir secretos: `.env` está ignorado.

## Reglas técnicas
- TypeScript estricto, sin `any`; Zod en todas las fronteras de datos externos (D54).
- Toda la lógica de negocio (puntos, reglas, visibilidad, insignias) vive en el servidor (Supabase); la app solo muestra (D52).
- Las claves secretas (API-Football, Anthropic, servicio de Supabase) **nunca** van en la app (D14).
- UI: solo tokens de `specs/05-ui.md`; nada de colores, tamaños o espacios sueltos. Toda pantalla con datos maneja cargando / vacío / error / sin conexión.
- Código multiplataforma: sin APIs exclusivas de Android (D53).
