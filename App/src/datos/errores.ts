/** Error de una lectura o escritura; `sinConexion` distingue la falta de red de una falla del servidor. */
export class ErrorDatos extends Error {
  constructor(
    mensaje: string,
    readonly sinConexion: boolean,
  ) {
    super(mensaje);
    this.name = 'ErrorDatos';
  }
}

// Sin red, supabase-js no lanza: devuelve el error con `status` 0.
export function comoErrorDatos(error: { message: string }, status: number): ErrorDatos {
  return new ErrorDatos(error.message, status === 0);
}

export function esSinConexion(error: unknown): boolean {
  return error instanceof ErrorDatos && error.sinConexion;
}
