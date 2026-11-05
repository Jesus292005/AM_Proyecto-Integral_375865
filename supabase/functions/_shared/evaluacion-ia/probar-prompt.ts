import {
  armarPeticion,
  costoUsd,
  crearClienteAnthropic,
  esModeloIA,
  interpretarRespuesta,
  type ModeloIA,
  MODELOS,
} from './anthropic.ts';
import { aplicarEvidencia, calcularBono } from './bono.ts';
import { CASOS, datosDeEjemplo, PARTIDO_EJEMPLO } from './ejemplos.ts';
import { mensajeUsuario, SISTEMA, VERSION_PROMPT } from './prompt.ts';

// T46/T48: `deno task probar-prompt` corre el prompt con las justificaciones de ejemplo contra el
// partido 1206057 y escribe un reporte en Markdown. Sin `--enviar` (o sin ANTHROPIC_API_KEY) solo
// imprime las peticiones, sin gastar. `--modelo=claude-haiku-5-5` limita a un modelo (por defecto,
// los dos de la decisión 2 de D94).

function argumentos(args: readonly string[]): { enviar: boolean; modelos: ModeloIA[] } {
  const modelos = args
    .filter((a) => a.startsWith('--modelo='))
    .map((a) => a.slice('--modelo='.length))
    .filter(esModeloIA);
  return {
    enviar: args.includes('--enviar'),
    modelos: modelos.length > 0 ? modelos : (Object.keys(MODELOS) as ModeloIA[]),
  };
}

const bloque = (texto: string) => ['````text', texto, '````'].join('\n');
const celda = (texto: string) => texto.replaceAll('|', '\\|').replaceAll('\n', ' ');

async function principal() {
  const { enviar, modelos } = argumentos(Deno.args);
  const clave = Deno.env.get('ANTHROPIC_API_KEY');
  const datos = datosDeEjemplo();
  const salida: string[] = [
    `# Prueba del prompt ${VERSION_PROMPT} (F06) — partido ${PARTIDO_EJEMPLO}`,
    '',
    '## Prompt de sistema',
    bloque(SISTEMA),
  ];

  if (!enviar || clave === undefined || clave === '') {
    salida.push(
      '',
      `> Sin enviar (${enviar ? 'falta ANTHROPIC_API_KEY' : 'falta --enviar'}): solo las peticiones.`,
    );
    for (const modelo of modelos) {
      const peticion = armarPeticion(modelo, '(prompt de sistema de arriba)', '(mensaje de cada caso, abajo)');
      salida.push('', `## Petición a ${modelo}`, bloque(JSON.stringify(peticion, null, 2)));
    }
    for (const caso of CASOS) {
      salida.push('', `## ${caso.nombre}`, `Esperado: ${caso.esperado}`, '', bloque(
        mensajeUsuario(datos, caso.prediccion, caso.justificacion).texto,
      ));
    }
    console.log(salida.join('\n'));
    return;
  }

  const llamar = crearClienteAnthropic(clave);
  const [primero] = CASOS;
  if (primero) {
    salida.push('', '## Mensaje del usuario (caso 1; los demás cambian solo predicción y justificación)');
    salida.push(bloque(mensajeUsuario(datos, primero.prediccion, primero.justificacion).texto));
  }

  for (const modelo of modelos) {
    let costoTotal = 0;
    salida.push('', `## ${modelo}`);
    for (const caso of CASOS) {
      const { texto, ids } = mensajeUsuario(datos, caso.prediccion, caso.justificacion);
      const respuesta = await llamar(armarPeticion(modelo, SISTEMA, texto));
      salida.push('', `### ${caso.nombre}`, `Justificación: ${caso.justificacion}`, '', `Esperado: ${caso.esperado}`, '');
      if (respuesta.tipo === 'error') {
        salida.push(`**Error:** ${respuesta.mensaje}`);
        continue;
      }
      const resultado = interpretarRespuesta(respuesta.cuerpo);
      if (resultado.tokens) {
        const costo = costoUsd(modelo, resultado.tokens);
        costoTotal += costo;
        salida.push(
          `Tokens: ${resultado.tokens.entrada} de entrada · ${resultado.tokens.salida} de salida · ` +
            `${costo.toFixed(5)} USD`,
        );
      }
      if (resultado.tipo === 'fallo') {
        salida.push(`**Fallo:** ${resultado.motivo}`);
        continue;
      }
      const afirmaciones = aplicarEvidencia(resultado.salida.afirmaciones, ids);
      salida.push(
        '',
        `**Bono: ${calcularBono(afirmaciones)}** · Explicación: ${resultado.salida.explicacion}`,
        '',
        '| Afirmación | Veredicto | Evidencia | Motivo |',
        '|---|---|---|---|',
        ...afirmaciones.map((a) =>
          `| ${celda(a.texto)} | ${a.veredicto} | ${a.evidencia.join(', ')} | ${celda(a.motivo)} |`
        ),
      );
    }
    salida.push('', `**Costo de ${modelo}: ${costoTotal.toFixed(5)} USD por ${CASOS.length} evaluaciones.**`);
  }
  console.log(salida.join('\n'));
}

if (import.meta.main) await principal();
