export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_UPLOAD_MB = 2;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
/** Lado máximo al achicar fotos grandes (sobra para portadas y fotos de perfil). */
const MAX_DIMENSION = 1600;
/** Por encima de esto ni se intenta procesar (evita colgar el navegador con archivos enormes). */
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

export type PreparedImage = { file: File; error?: never } | { file?: never; error: string };

/** Achica la imagen y la exporta como JPEG. Devuelve null si el navegador no puede decodificarla. */
async function resizeToJpeg(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return null;
  // Fondo blanco: los PNG con transparencia no quedan negros al pasar a JPEG.
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) return null;
  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg' });
}

/**
 * Valida la imagen elegida y la deja lista para subir:
 * - La copia a memoria en el momento. En celulares (iOS sobre todo) la foto elegida es una
 *   copia temporal que el sistema puede borrar antes de subirla, y el envío falla como
 *   "error de red".
 * - Si supera el límite (fotos de cámara de 3–12 MB), la achica a JPEG.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'La imagen debe ser JPG, PNG, WEBP o GIF.' };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return { error: 'La imagen es demasiado grande.' };
  }

  if (file.size <= MAX_UPLOAD_BYTES) {
    try {
      // Copia en memoria del contenido original (conserva GIF animados y PNG con transparencia).
      return { file: new File([await file.arrayBuffer()], file.name, { type: file.type }) };
    } catch {
      return { error: 'No se pudo leer la imagen. Probá elegirla de nuevo.' };
    }
  }

  const resized = await resizeToJpeg(file);
  if (!resized) return { error: `La imagen no puede superar ${MAX_UPLOAD_MB} MB.` };
  if (resized.size > MAX_UPLOAD_BYTES) return { error: `La imagen no puede superar ${MAX_UPLOAD_MB} MB.` };
  return { file: resized };
}
