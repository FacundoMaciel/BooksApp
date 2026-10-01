import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, getErrorMessage } from '../api/client';
import { prepareImage } from './image';

const MB = 1024 * 1024;

describe('prepareImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('copia la imagen a memoria: el archivo sigue disponible aunque el original desaparezca', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const original = new File([bytes], 'portada.png', { type: 'image/png' });

    const { file } = await prepareImage(original);

    expect(file).toBeDefined();
    expect(file).not.toBe(original);
    expect(file!.name).toBe('portada.png');
    expect(file!.type).toBe('image/png');
    expect(new Uint8Array(await file!.arrayBuffer())).toEqual(bytes);
  });

  it('rechaza formatos no admitidos', async () => {
    const result = await prepareImage(new File(['x'], 'foto.heic', { type: 'image/heic' }));
    expect(result.error).toBe('La imagen debe ser JPG, PNG, WEBP o GIF.');
  });

  it('achica a JPEG las fotos que superan el límite (fotos de cámara)', async () => {
    const bitmap = { width: 4000, height: 3000, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
      cb(new Blob([new Uint8Array(300 * 1024)], { type: 'image/jpeg' }));
    });

    const photo = new File([new Uint8Array(5 * MB)], 'IMG_0001.jpeg', { type: 'image/jpeg' });
    const { file, error } = await prepareImage(photo);

    expect(error).toBeUndefined();
    expect(file!.name).toBe('IMG_0001.jpg');
    expect(file!.type).toBe('image/jpeg');
    expect(file!.size).toBe(300 * 1024);
    // Lado mayor reducido a 1600 px manteniendo la proporción.
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 1200);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('si el navegador no puede achicarla, avisa del límite', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('formato no soportado')));
    const photo = new File([new Uint8Array(3 * MB)], 'foto.png', { type: 'image/png' });
    expect((await prepareImage(photo)).error).toBe('La imagen no puede superar 2 MB.');
  });
});

describe('Errores de red', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('incluyen el detalle del navegador para poder diagnosticarlos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')));
    const error = await apiFetch('/books').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect(getErrorMessage(error)).toBe(
      'No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo. (detalle: Load failed)',
    );
  });
});
