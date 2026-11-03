import { supabase } from '../supabase/cliente';
import {
  aceptarRecordatorios,
  debePreguntar,
  olvidarDispositivo,
  registrarDispositivo,
} from './registro';
import {
  guardarToken,
  leerAhoraNo,
  leerPermiso,
  leerTokenGuardado,
  olvidarTokenGuardado,
  pedirPermiso,
} from './sistema';

jest.mock('../supabase/cliente', () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));

const rpc = supabase.rpc as unknown as jest.Mock;
const desde = supabase.from as unknown as jest.Mock;
const permiso = leerPermiso as jest.MockedFunction<typeof leerPermiso>;
const pedir = pedirPermiso as jest.MockedFunction<typeof pedirPermiso>;
const ahoraNo = leerAhoraNo as jest.MockedFunction<typeof leerAhoraNo>;
const tokenGuardado = leerTokenGuardado as jest.MockedFunction<typeof leerTokenGuardado>;

beforeEach(() => {
  jest.clearAllMocks();
  rpc.mockResolvedValue({ data: null, error: null });
  permiso.mockResolvedValue('sinPreguntar');
  ahoraNo.mockResolvedValue(false);
  tokenGuardado.mockResolvedValue(null);
});

describe('registrarDispositivo (R2)', () => {
  it('F11a CA5: con permiso registra el token en el servidor y lo guarda', async () => {
    permiso.mockResolvedValue('concedido');

    await registrarDispositivo();

    expect(rpc).toHaveBeenCalledWith('registrar_dispositivo', { token: 'ExponentPushToken[prueba]' });
    expect(guardarToken).toHaveBeenCalledWith('ExponentPushToken[prueba]');
  });

  it('sin permiso no hace nada', async () => {
    permiso.mockResolvedValue('negado');
    await registrarDispositivo();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('si el servidor falla, lanza el error y no guarda el token', async () => {
    permiso.mockResolvedValue('concedido');
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(registrarDispositivo()).rejects.toThrow('boom');
    expect(guardarToken).not.toHaveBeenCalled();
  });
});

describe('debePreguntar (R1)', () => {
  it('F11a CA5: pregunta si el sistema no ha preguntado y no hay "Ahora no"', async () => {
    expect(await debePreguntar()).toBe(true);
  });

  it('F11a CA5: con "Ahora no" guardado no vuelve a preguntar sola', async () => {
    ahoraNo.mockResolvedValue(true);
    expect(await debePreguntar()).toBe(false);
  });

  it('F11a CA5: si el sistema ya preguntó (concedido o negado) no pregunta', async () => {
    permiso.mockResolvedValue('concedido');
    expect(await debePreguntar()).toBe(false);
    permiso.mockResolvedValue('negado');
    expect(await debePreguntar()).toBe(false);
  });
});

describe('aceptarRecordatorios', () => {
  it('F11a CA5: con el permiso concedido registra el teléfono', async () => {
    pedir.mockResolvedValue('concedido');
    permiso.mockResolvedValue('concedido');

    expect(await aceptarRecordatorios()).toBe('concedido');
    expect(rpc).toHaveBeenCalledWith('registrar_dispositivo', expect.anything());
  });

  it('si lo niega no registra', async () => {
    pedir.mockResolvedValue('negado');
    expect(await aceptarRecordatorios()).toBe('negado');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('olvidarDispositivo (R3)', () => {
  it('F11a CA6: borra el token de este teléfono y lo olvida', async () => {
    const eq = jest.fn(async () => ({ error: null }));
    desde.mockReturnValue({ delete: () => ({ eq }) });
    tokenGuardado.mockResolvedValue('ExponentPushToken[prueba]');

    await olvidarDispositivo();

    expect(desde).toHaveBeenCalledWith('dispositivo');
    expect(eq).toHaveBeenCalledWith('token', 'ExponentPushToken[prueba]');
    expect(olvidarTokenGuardado).toHaveBeenCalled();
  });

  it('sin token guardado no consulta', async () => {
    await olvidarDispositivo();
    expect(desde).not.toHaveBeenCalled();
  });
});
