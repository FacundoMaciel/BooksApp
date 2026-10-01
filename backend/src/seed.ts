import type { AuthorInfo } from './domain/entities';
import type { LibraryRepository } from './repositories/libraryRepository';

/** Información de los autores de ejemplo. */
export const SEED_AUTHORS: Record<string, Partial<AuthorInfo>> = {
  'Jorge Luis Borges': {
    nationality: 'Argentina',
    birthYear: 1899,
    deathYear: 1986,
    biography: 'Cuentista, poeta y ensayista; figura central de la literatura fantástica del siglo XX.',
  },
  'Adolfo Bioy Casares': {
    nationality: 'Argentina',
    birthYear: 1914,
    deathYear: 1999,
    biography: 'Novelista de lo fantástico y policial; colaborador habitual de Borges. Premio Cervantes 1990.',
  },
  'Silvina Ocampo': {
    nationality: 'Argentina',
    birthYear: 1903,
    deathYear: 1993,
    biography: 'Cuentista y poeta de lo inquietante y lo cotidiano; coeditora de la Antología de la literatura fantástica.',
  },
  'Julio Cortázar': {
    nationality: 'Argentina',
    birthYear: 1914,
    deathYear: 1984,
    biography: 'Maestro del cuento y renovador de la novela con Rayuela; figura del boom latinoamericano.',
  },
  'Gabriel García Márquez': {
    nationality: 'Colombia',
    birthYear: 1927,
    deathYear: 2014,
    biography: 'Máximo exponente del realismo mágico. Premio Nobel de Literatura 1982.',
  },
  'Juan Rulfo': {
    nationality: 'México',
    birthYear: 1917,
    deathYear: 1986,
    biography: 'Con solo dos libros, Pedro Páramo y El llano en llamas, transformó la narrativa en español.',
  },
  'Ernesto Sabato': {
    nationality: 'Argentina',
    birthYear: 1911,
    deathYear: 2011,
    biography: 'Físico y escritor; autor de El túnel y Sobre héroes y tumbas. Premio Cervantes 1984.',
  },
  'Mario Vargas Llosa': {
    nationality: 'Perú',
    birthYear: 1936,
    deathYear: 2025,
    biography: 'Novelista y ensayista del boom latinoamericano. Premio Nobel de Literatura 2010.',
  },
  'Isabel Allende': {
    nationality: 'Chile',
    birthYear: 1942,
    biography: 'Una de las novelistas en español más leídas; debutó con La casa de los espíritus.',
  },
  'Roberto Bolaño': {
    nationality: 'Chile',
    birthYear: 1953,
    deathYear: 2003,
    biography: 'Poeta y novelista; Los detectives salvajes y 2666 lo consagraron tras su muerte.',
  },
  'Horacio Quiroga': {
    nationality: 'Uruguay',
    birthYear: 1878,
    deathYear: 1937,
    biography: 'Maestro del cuento latinoamericano, de la selva misionera y lo trágico.',
  },
  'Miguel de Cervantes': {
    nationality: 'España',
    birthYear: 1547,
    deathYear: 1616,
    biography: 'Autor de Don Quijote de la Mancha, considerada la primera novela moderna.',
  },
};

interface SeedBook {
  title: string;
  chapters: number;
  pages: number;
  authors: string[];
  /** Id de portada en Open Library (verificado). */
  coverId: number;
}

export const openLibraryCover = (coverId: number) => `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;

/** Catálogo de ejemplo. Incluye obras en coautoría para mostrar la relación Many-to-Many. */
export const SEED_BOOKS: SeedBook[] = [
  { title: 'Ficciones', chapters: 17, pages: 224, authors: ['Jorge Luis Borges'], coverId: 10832290 },
  { title: 'El Aleph', chapters: 17, pages: 208, authors: ['Jorge Luis Borges'], coverId: 14408958 },
  {
    title: 'Seis problemas para don Isidro Parodi',
    chapters: 6,
    pages: 157,
    authors: ['Jorge Luis Borges', 'Adolfo Bioy Casares'],
    coverId: 6562964,
  },
  {
    title: 'Crónicas de Bustos Domecq',
    chapters: 20,
    pages: 160,
    authors: ['Jorge Luis Borges', 'Adolfo Bioy Casares'],
    coverId: 9693131,
  },
  {
    title: 'Antología de la literatura fantástica',
    chapters: 75,
    pages: 432,
    authors: ['Jorge Luis Borges', 'Adolfo Bioy Casares', 'Silvina Ocampo'],
    coverId: 10832253,
  },
  { title: 'La invención de Morel', chapters: 1, pages: 128, authors: ['Adolfo Bioy Casares'], coverId: 1046845 },
  { title: 'Rayuela', chapters: 155, pages: 736, authors: ['Julio Cortázar'], coverId: 1047466 },
  { title: 'Bestiario', chapters: 8, pages: 160, authors: ['Julio Cortázar'], coverId: 5721778 },
  { title: 'Final del juego', chapters: 18, pages: 224, authors: ['Julio Cortázar'], coverId: 4933371 },
  { title: 'Cien años de soledad', chapters: 20, pages: 471, authors: ['Gabriel García Márquez'], coverId: 12627383 },
  {
    title: 'Crónica de una muerte anunciada',
    chapters: 5,
    pages: 122,
    authors: ['Gabriel García Márquez'],
    coverId: 8489859,
  },
  {
    title: 'El amor en los tiempos del cólera',
    chapters: 6,
    pages: 464,
    authors: ['Gabriel García Márquez'],
    coverId: 10096404,
  },
  { title: 'Pedro Páramo', chapters: 70, pages: 128, authors: ['Juan Rulfo'], coverId: 5419076 },
  { title: 'El túnel', chapters: 39, pages: 160, authors: ['Ernesto Sabato'], coverId: 5517733 },
  { title: 'Sobre héroes y tumbas', chapters: 4, pages: 512, authors: ['Ernesto Sabato'], coverId: 8078732 },
  { title: 'La ciudad y los perros', chapters: 18, pages: 448, authors: ['Mario Vargas Llosa'], coverId: 3221667 },
  { title: 'La casa de los espíritus', chapters: 14, pages: 448, authors: ['Isabel Allende'], coverId: 3205226 },
  { title: 'Los detectives salvajes', chapters: 3, pages: 624, authors: ['Roberto Bolaño'], coverId: 3706128 },
  { title: '2666', chapters: 5, pages: 1128, authors: ['Roberto Bolaño'], coverId: 1047310 },
  { title: 'Cuentos de la selva', chapters: 8, pages: 112, authors: ['Horacio Quiroga'], coverId: 4902905 },
  {
    title: 'Don Quijote de la Mancha',
    chapters: 126,
    pages: 1376,
    authors: ['Miguel de Cervantes'],
    coverId: 14428305,
  },
];

/**
 * Agrega los libros y autores de ejemplo que todavía no existan (por título / nombre)
 * y completa la portada de los libros y la información de los autores de ejemplo que falten
 * (sin pisar lo que haya cargado un usuario).
 * Es idempotente: se puede ejecutar en cada arranque sin duplicar datos y suma
 * ejemplos nuevos a una base existente. Devuelve cuántos libros insertó.
 */
export async function seedLibrary(repo: LibraryRepository): Promise<number> {
  const existingAuthors = await repo.findAllAuthors();
  const authorIds = new Map(existingAuthors.map((a) => [a.name, a.id]));
  const existingBooks = new Map((await repo.findAllBooks()).map((b) => [b.title, b]));

  // Completa la información de los autores de ejemplo que ya existen y les falta algún dato.
  for (const author of existingAuthors) {
    const info = SEED_AUTHORS[author.name];
    const missing = info && (Object.keys(info) as (keyof AuthorInfo)[]).some((key) => author[key] === null);
    if (missing) await repo.fillAuthorInfo(author.id, info);
  }

  const authorId = async (name: string) => {
    let id = authorIds.get(name);
    if (id === undefined) {
      id = (await repo.createAuthor({ name, ...SEED_AUTHORS[name] })).id;
      authorIds.set(name, id);
    }
    return id;
  };

  let inserted = 0;
  for (const { authors, coverId, ...book } of SEED_BOOKS) {
    const coverUrl = openLibraryCover(coverId);
    const existing = existingBooks.get(book.title);
    if (existing) {
      // No pisa una portada que el usuario haya cargado.
      if (!existing.coverUrl) await repo.updateBookCover(existing.id, coverUrl);
      continue;
    }
    const ids: number[] = [];
    for (const name of authors) ids.push(await authorId(name));
    await repo.createBook({ ...book, coverUrl }, ids);
    inserted++;
  }
  return inserted;
}
