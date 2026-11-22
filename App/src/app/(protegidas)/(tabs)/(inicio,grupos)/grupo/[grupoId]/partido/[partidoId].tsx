import { PantallaPartido } from '../../../../../../../partido/PantallaPartido';

// S03 abierto desde un grupo (muro y figura de la jornada, F26 R10, R12): la misma pantalla, dentro
// de la pestaña desde la que se llegó, para que "atrás" vuelva al grupo (D76, D115). Las entradas
// externas siguen usando `/partido/:partidoId`, que abre en Inicio.
export default PantallaPartido;
