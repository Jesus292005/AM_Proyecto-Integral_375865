// Lo nativo de las notificaciones (F11a) no existe en jest: todas las pruebas usan
// `src/notificaciones/__mocks__/sistema`.
jest.mock('./src/notificaciones/sistema');
// Igual la cámara de F12: `src/grupos/__mocks__/camara`.
jest.mock('./src/grupos/camara');
