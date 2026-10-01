/** Normaliza un nombre para compararlo: sin mayúsculas, acentos ni espacios repetidos. */
export const normalizeName = (name: string) =>
  name
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

/** Recorta y colapsa espacios repetidos. */
export const cleanText = (text: string) => text.trim().replace(/\s+/g, ' ');
