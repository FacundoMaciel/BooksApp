import type { LibraryRepository } from './repositories/libraryRepository';

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
 * y completa la portada de los libros de ejemplo que no la tengan.
 * Es idempotente: se puede ejecutar en cada arranque sin duplicar datos y suma
 * ejemplos nuevos a una base existente. Devuelve cuántos libros insertó.
 */
export async function seedLibrary(repo: LibraryRepository): Promise<number> {
  const authorIds = new Map((await repo.findAllAuthors()).map((a) => [a.name, a.id]));
  const existingBooks = new Map((await repo.findAllBooks()).map((b) => [b.title, b]));

  const authorId = async (name: string) => {
    let id = authorIds.get(name);
    if (id === undefined) {
      id = (await repo.createAuthor({ name })).id;
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
