import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';

const books = [
  { id: 1, title: 'Ficciones', chapters: 17, pages: 224, coverUrl: null, authors: [{ id: 1, name: 'Jorge Luis Borges' }] },
];
const authResponse = { token: 'fake-token', user: { id: 1, name: 'Ada', email: 'ada@example.com' } };

type Handler = (init?: RequestInit) => { status: number; body: unknown };

/** Mock de fetch que responde según "MÉTODO /ruta". */
function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${new URL(url).pathname}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Ruta no mockeada: ${key}`);
    const { status, body } = handler(init);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderApp = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Home', () => {
  const coverUrl = 'https://covers.openlibrary.org/b/id/10832290-M.jpg';
  const withCovers = [
    { ...books[0], coverUrl },
    { id: 2, title: 'Libro sin portada', chapters: 1, pages: 10, coverUrl: null, authors: [] },
  ];

  it('muestra la bienvenida y debajo un carrusel solo con portadas', async () => {
    mockApi({ 'GET /books': () => ({ status: 200, body: withCovers }) });
    renderApp('/');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu biblioteca');
    const carousel = screen.getByRole('region', { name: 'Portadas de libros' });

    const cover = await within(carousel).findByRole('img', { name: 'Portada de Ficciones' });
    expect(cover).toHaveAttribute('src', coverUrl);
    // Sin imagen se muestra un respaldo con el título.
    expect(within(carousel).getByRole('img', { name: 'Portada de Libro sin portada' })).toHaveTextContent(
      'Libro sin portada',
    );
    // Solo portadas: sin los detalles de las cards.
    expect(within(carousel).queryByText('Capítulos')).not.toBeInTheDocument();
    expect(within(carousel).getAllByRole('link')[0]).toHaveAttribute('href', '/libros');
  });

  it('usa el respaldo si la imagen no carga', async () => {
    mockApi({ 'GET /books': () => ({ status: 200, body: [withCovers[0]] }) });
    renderApp('/');

    const cover = await screen.findByRole('img', { name: 'Portada de Ficciones' });
    fireEvent.error(cover);

    const fallback = screen.getByRole('img', { name: 'Portada de Ficciones' });
    expect(fallback.tagName).toBe('DIV');
    expect(fallback).toHaveTextContent('Ficciones');
  });

  it('permite pausar el avance automático', async () => {
    mockApi({ 'GET /books': () => ({ status: 200, body: withCovers }) });
    renderApp('/');

    await userEvent.click(await screen.findByRole('button', { name: /Pausar/ }));
    expect(screen.getByRole('button', { name: /Reanudar/ })).toBeInTheDocument();
  });

  it('si la API falla, muestra solo la bienvenida', async () => {
    const fetchMock = mockApi({ 'GET /books': () => ({ status: 500, body: { error: 'Error interno' } }) });
    renderApp('/');

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Portadas de libros' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu biblioteca');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Página de libros', () => {
  it('muestra solo las cards con sus detalles, sin la bienvenida', async () => {
    mockApi({
      'GET /books': () => ({
        status: 200,
        body: [
          ...books,
          {
            id: 2,
            title: 'Seis problemas para don Isidro Parodi',
            chapters: 6,
            pages: 157,
            authors: [
              { id: 1, name: 'Jorge Luis Borges' },
              { id: 2, name: 'Adolfo Bioy Casares' },
            ],
          },
        ],
      }),
    });
    renderApp('/libros');

    expect(screen.getByRole('heading', { level: 1, name: 'Libros' })).toBeInTheDocument();
    expect(screen.queryByText(/Tu biblioteca/)).not.toBeInTheDocument();

    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('2 libros en el catálogo')).toBeInTheDocument();

    const ficciones = within(cards[0]);
    expect(ficciones.getByRole('heading', { name: 'Ficciones' })).toBeInTheDocument();
    expect(ficciones.getByText('Autor')).toBeInTheDocument();
    expect(ficciones.getByText('Jorge Luis Borges')).toBeInTheDocument();
    expect(ficciones.getByText('Lectura media')).toBeInTheDocument();
    expect(ficciones.getByText('17')).toBeInTheDocument();
    expect(ficciones.getByText('224')).toBeInTheDocument();
    expect(ficciones.getByText('13.18')).toBeInTheDocument();

    const parodi = within(cards[1]);
    expect(parodi.getByText('Autores')).toBeInTheDocument();
    expect(parodi.getByText('Adolfo Bioy Casares')).toBeInTheDocument();
    expect(parodi.getByText('Lectura corta')).toBeInTheDocument();
  });

  it('muestra un error con opción de reintentar si la API falla', async () => {
    let calls = 0;
    mockApi({
      'GET /books': () => (++calls === 1 ? { status: 500, body: { error: 'Error interno' } } : { status: 200, body: books }),
    });
    renderApp('/libros');

    expect(await screen.findByRole('alert')).toHaveTextContent('Error interno');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Ficciones' })).toBeInTheDocument();
  });
});

describe('Autenticación', () => {
  it('redirige a login al entrar a una ruta protegida y vuelve tras iniciar sesión', async () => {
    const fetchMock = mockApi({ 'POST /auth/login': () => ({ status: 200, body: authResponse }) });
    const user = userEvent.setup();
    renderApp('/lista');

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'supersegura');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Lista de elementos' })).toBeInTheDocument();
    expect(screen.getAllByText('Ada').length).toBeGreaterThan(0);
    expect(localStorage.getItem('auth_token')).toBe('fake-token');
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      email: 'ada@example.com',
      password: 'supersegura',
    });
  });

  it('muestra el error del servidor si el login falla', async () => {
    mockApi({ 'POST /auth/login': () => ({ status: 401, body: { error: 'Email o contraseña incorrectos' } }) });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos');
  });

  it('registra un usuario, inicia sesión y permite cerrarla', async () => {
    mockApi({
      'POST /auth/register': () => ({ status: 201, body: authResponse }),
      'GET /books': () => ({ status: 200, body: [] }),
    });
    const user = userEvent.setup();
    renderApp('/register');

    await user.type(screen.getByLabelText('Nombre'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'supersegura');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Hola de nuevo, Ada.' })).toBeInTheDocument();

    const [navLogout] = screen.getAllByRole('button', { name: 'Cerrar sesión' });
    await user.click(navLogout);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu biblioteca');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('restaura la sesión guardada validando el token', async () => {
    localStorage.setItem('auth_token', 'fake-token');
    mockApi({
      'GET /auth/me': (init) => {
        const auth = new Headers(init?.headers).get('Authorization');
        return auth === 'Bearer fake-token'
          ? { status: 200, body: authResponse.user }
          : { status: 401, body: { error: 'No autorizado' } };
      },
    });
    renderApp('/lista');

    expect(await screen.findByRole('heading', { name: 'Lista de elementos' })).toBeInTheDocument();
  });

  it('conserva el token si la API no responde al restaurar la sesión', async () => {
    localStorage.setItem('auth_token', 'fake-token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderApp('/lista');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBe('fake-token');
  });

  it('descarta un token inválido guardado', async () => {
    localStorage.setItem('auth_token', 'expirado');
    mockApi({ 'GET /auth/me': () => ({ status: 401, body: { error: 'Token inválido o expirado' } }) });
    renderApp('/lista');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('Agregar libro', () => {
  const authors = [
    { id: 1, name: 'Jorge Luis Borges' },
    { id: 2, name: 'Adolfo Bioy Casares' },
  ];

  /** Simula una sesión guardada válida. */
  const loggedIn = () => {
    localStorage.setItem('auth_token', 'fake-token');
    return { 'GET /auth/me': () => ({ status: 200, body: authResponse.user }) };
  };

  it('sin sesión, redirige a login y después vuelve al formulario', async () => {
    mockApi({
      'POST /auth/login': () => ({ status: 200, body: authResponse }),
      'GET /authors': () => ({ status: 200, body: authors }),
    });
    const user = userEvent.setup();
    renderApp('/libros/nuevo');

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'supersegura');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Agregar libro' })).toBeInTheDocument();
  });

  it('en la página de libros ofrece iniciar sesión si no hay usuario', async () => {
    mockApi({ 'GET /books': () => ({ status: 200, body: [] }) });
    renderApp('/libros');
    expect(screen.getByRole('link', { name: 'Inicia sesión para agregar' })).toHaveAttribute('href', '/libros/nuevo');
  });

  const coverFile = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'portada.png', { type: 'image/png' });
  const uploadedUrl = '/uploads/covers/0b6f2c1e-1111-4222-8333-944445555666.png';

  it('crea el libro subiendo primero la portada y lo muestra en la página de libros', async () => {
    let created: unknown;
    let uploaded: FormDataEntryValue | null = null;
    const fetchMock = mockApi({
      ...loggedIn(),
      'GET /authors': () => ({ status: 200, body: authors }),
      'POST /uploads/covers': (init) => {
        uploaded = (init!.body as FormData).get('cover');
        return { status: 201, body: { url: uploadedUrl } };
      },
      'POST /books': (init) => {
        created = JSON.parse(init!.body as string);
        return { status: 201, body: { id: 9, ...(created as object), authors: [authors[1]] } };
      },
      'GET /books': () => ({
        status: 200,
        body: created ? [{ id: 9, ...(created as object), authors: [authors[1]] }] : [],
      }),
    });
    const user = userEvent.setup();
    renderApp('/libros/nuevo');

    await user.type(await screen.findByLabelText('Título'), '  La invención de Morel ');
    await user.type(screen.getByLabelText('Capítulos'), '1');
    await user.type(screen.getByLabelText('Páginas'), '128');
    await user.upload(screen.getByLabelText('Imagen de portada'), coverFile());
    expect(screen.getByAltText('Vista previa: portada')).toBeInTheDocument();
    expect(screen.getByText('portada.png')).toBeInTheDocument();
    await user.click(await screen.findByLabelText('Adolfo Bioy Casares'));
    await user.click(screen.getByRole('button', { name: 'Guardar libro' }));

    expect(await screen.findByText('Se agregó «La invención de Morel» al catálogo.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'La invención de Morel' })).toBeInTheDocument();
    expect((uploaded as File | null)?.name).toBe('portada.png');
    expect(created).toEqual({
      title: 'La invención de Morel',
      chapters: 1,
      pages: 128,
      coverUrl: uploadedUrl,
      authorIds: [2],
    });

    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(posts.map(([url]) => new URL(url).pathname)).toEqual(['/uploads/covers', '/books']);
    for (const [, init] of posts) {
      expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer fake-token');
    }
  });

  it('rechaza archivos que no son imágenes o superan el tamaño', async () => {
    mockApi({ ...loggedIn(), 'GET /authors': () => ({ status: 200, body: authors }) });
    // applyAccept: false simula elegir "Todos los archivos" en el diálogo del sistema.
    const user = userEvent.setup({ applyAccept: false });
    renderApp('/libros/nuevo');

    const input = await screen.findByLabelText('Imagen de portada');
    await user.upload(input, new File(['hola'], 'notas.txt', { type: 'text/plain' }));
    expect(screen.getByText('La imagen debe ser JPG, PNG, WEBP o GIF.')).toBeInTheDocument();

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'enorme.png', { type: 'image/png' });
    await user.upload(input, big);
    expect(screen.getByText('La imagen no puede superar 2 MB.')).toBeInTheDocument();
    expect(screen.queryByAltText('Vista previa: portada')).not.toBeInTheDocument();
  });

  it('permite crear un autor nuevo y lo deja seleccionado', async () => {
    mockApi({
      ...loggedIn(),
      'GET /authors': () => ({ status: 200, body: [] }),
      'POST /authors': (init) => ({ status: 201, body: { id: 7, ...JSON.parse(init!.body as string) } }),
    });
    const user = userEvent.setup();
    renderApp('/libros/nuevo');

    await user.type(await screen.findByLabelText('Nuevo autor'), 'Julio Cortázar{Enter}');

    expect(await screen.findByLabelText('Julio Cortázar')).toBeChecked();
    expect(screen.getByLabelText('Nuevo autor')).toHaveValue('');
  });

  it('valida los campos antes de enviar', async () => {
    const fetchMock = mockApi({ ...loggedIn(), 'GET /authors': () => ({ status: 200, body: authors }) });
    const user = userEvent.setup();
    renderApp('/libros/nuevo');

    await user.type(await screen.findByLabelText('Capítulos'), '0');
    await user.click(screen.getByRole('button', { name: 'Guardar libro' }));

    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(screen.getAllByText('Debe ser un número entero mayor a 0.')).toHaveLength(2);
    expect(screen.getByText('La portada es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona al menos un autor.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('si el token expiró al guardar, cierra la sesión y pide iniciarla de nuevo', async () => {
    mockApi({
      ...loggedIn(),
      'GET /authors': () => ({ status: 200, body: authors }),
      'POST /uploads/covers': () => ({ status: 401, body: { error: 'Token inválido o expirado' } }),
    });
    const user = userEvent.setup();
    renderApp('/libros/nuevo');

    await user.type(await screen.findByLabelText('Título'), 'Ficciones');
    await user.type(screen.getByLabelText('Capítulos'), '17');
    await user.type(screen.getByLabelText('Páginas'), '224');
    await user.upload(screen.getByLabelText('Imagen de portada'), coverFile());
    await user.click(await screen.findByLabelText('Jorge Luis Borges'));
    await user.click(screen.getByRole('button', { name: 'Guardar libro' }));

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('Página de autores', () => {
  const authorsWithBooks = [
    {
      id: 2,
      name: 'Julio Cortázar',
      books: [
        { id: 7, title: 'Rayuela', chapters: 155, pages: 736, coverUrl: 'https://covers.openlibrary.org/b/id/1047466-M.jpg' },
        { id: 8, title: 'Bestiario', chapters: 8, pages: 160, coverUrl: '/uploads/covers/abc.png' },
      ],
    },
    { id: 1, name: 'Adolfo Bioy Casares', books: [{ id: 5, title: 'La invención de Morel', chapters: 1, pages: 128, coverUrl: null }] },
    { id: 3, name: 'Silvina Ocampo', books: [] },
  ];

  it('muestra cada autor con su información y sus libros, en orden alfabético', async () => {
    mockApi({ 'GET /authors': () => ({ status: 200, body: authorsWithBooks }) });
    renderApp('/autores');

    expect(screen.getByRole('heading', { level: 1, name: 'Autores' })).toBeInTheDocument();
    const cards = await screen.findAllByRole('article');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      'Adolfo Bioy Casares',
      'Julio Cortázar',
      'Silvina Ocampo',
    ]);
    expect(screen.getByText('3 autores')).toBeInTheDocument();

    const cortazar = within(cards[1]);
    expect(cortazar.getByText('2 libros · 896 páginas')).toBeInTheDocument();
    expect(cortazar.getByText('155 capítulos · 736 pág.')).toBeInTheDocument();
    // Las portadas subidas se resuelven contra la URL de la API.
    expect(cortazar.getByRole('img', { name: 'Portada de Bestiario' })).toHaveAttribute(
      'src',
      'http://localhost:3000/uploads/covers/abc.png',
    );

    expect(within(cards[0]).getByText('1 capítulo · 128 pág.')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Todavía no tiene libros cargados.')).toBeInTheDocument();
  });

  it('es accesible desde la navegación', async () => {
    mockApi({ 'GET /books': () => ({ status: 200, body: [] }), 'GET /authors': () => ({ status: 200, body: [] }) });
    const user = userEvent.setup();
    renderApp('/');

    await user.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Autores' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Autores' })).toBeInTheDocument();
    expect(await screen.findByText('Todavía no hay autores cargados.')).toBeInTheDocument();
  });
});

describe('Formulario de nuevo autor', () => {
  const existing = [
    {
      id: 1,
      name: 'Julio Cortázar',
      nationality: 'Argentina',
      birthYear: 1914,
      deathYear: 1984,
      biography: 'Autor de Rayuela.',
      photoUrl: null,
      books: [],
    },
    { id: 2, name: 'Silvina Ocampo', nationality: null, birthYear: null, deathYear: null, biography: null, photoUrl: null, books: [] },
  ];
  const session = () => {
    localStorage.setItem('auth_token', 'fake-token');
    return { 'GET /auth/me': () => ({ status: 200, body: authResponse.user }) };
  };
  const photoFile = () => new File([new Uint8Array([0xff, 0xd8, 0xff])], 'foto.jpg', { type: 'image/jpeg' });
  const photoUrl = '/uploads/covers/0b6f2c1e-1111-4222-8333-944445555666.jpg';

  it('sin sesión, el botón lleva al login y después vuelve al formulario', async () => {
    mockApi({
      'GET /authors': () => ({ status: 200, body: existing }),
      'POST /auth/login': () => ({ status: 200, body: authResponse }),
    });
    const user = userEvent.setup();
    renderApp('/autores');

    await user.click(await screen.findByRole('link', { name: 'Inicia sesión para agregar' }));
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'supersegura');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('heading', { name: 'Nuevo autor' })).toBeInTheDocument();
  });

  it('crea el autor con toda su información y foto, y lo muestra en la lista', async () => {
    let created: Record<string, unknown> | undefined;
    const fetchMock = mockApi({
      ...session(),
      'GET /authors': () => ({
        status: 200,
        body: created ? [...existing, { id: 3, ...created, books: [] }] : existing,
      }),
      'POST /uploads/covers': () => ({ status: 201, body: { url: photoUrl } }),
      'POST /authors': (init) => {
        created = JSON.parse(init!.body as string);
        return { status: 201, body: { id: 3, ...created, books: [] } };
      },
    });
    const user = userEvent.setup();
    renderApp('/autores');

    await user.click(await screen.findByRole('link', { name: '+ Nuevo autor' }));
    await user.type(await screen.findByLabelText('Nombre'), '  Adolfo   Bioy Casares ');
    await user.type(screen.getByLabelText('Nacionalidad'), 'Argentina');
    await user.type(screen.getByLabelText('Año de nacimiento'), '1914');
    await user.type(screen.getByLabelText('Año de fallecimiento'), '1999');
    await user.type(screen.getByLabelText('Biografía'), 'Autor de La invención de Morel.');
    await user.upload(screen.getByLabelText('Foto del autor'), photoFile());
    expect(screen.getByAltText('Vista previa: foto')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar autor' }));

    expect(await screen.findByText(/Se agregó «Adolfo Bioy Casares»/)).toBeInTheDocument();
    expect(created).toEqual({
      name: 'Adolfo Bioy Casares',
      nationality: 'Argentina',
      birthYear: 1914,
      deathYear: 1999,
      biography: 'Autor de La invención de Morel.',
      photoUrl,
    });
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(posts.map(([url]) => new URL(url).pathname)).toEqual(['/uploads/covers', '/authors']);

    const card = within(await screen.findByRole('article', { name: 'Adolfo Bioy Casares' }));
    expect(card.getByText('Argentina · 1914 – 1999')).toBeInTheDocument();
    expect(card.getByText('Autor de La invención de Morel.')).toBeInTheDocument();
    expect(card.getByRole('img', { name: 'Foto de Adolfo Bioy Casares' })).toHaveAttribute(
      'src',
      `http://localhost:3000${photoUrl}`,
    );
  });

  it('solo el nombre es obligatorio: sin foto no sube nada y no manda campos vacíos', async () => {
    let created: unknown;
    const fetchMock = mockApi({
      ...session(),
      'GET /authors': () => ({ status: 200, body: existing }),
      'POST /authors': (init) => {
        created = JSON.parse(init!.body as string);
        return { status: 201, body: { id: 3, name: 'Horacio Quiroga', books: [] } };
      },
    });
    const user = userEvent.setup();
    renderApp('/autores/nuevo');

    await user.type(await screen.findByLabelText('Nombre'), 'Horacio Quiroga{Enter}');

    expect(await screen.findByText(/Se agregó «Horacio Quiroga»/)).toBeInTheDocument();
    expect(created).toEqual({ name: 'Horacio Quiroga' });
    expect(fetchMock.mock.calls.some(([url]) => new URL(url).pathname === '/uploads/covers')).toBe(false);
  });

  it('valida el nombre, los duplicados y los años antes de enviar', async () => {
    const fetchMock = mockApi({ ...session(), 'GET /authors': () => ({ status: 200, body: existing }) });
    const user = userEvent.setup();
    renderApp('/autores/nuevo');

    const save = await screen.findByRole('button', { name: 'Guardar autor' });
    await user.click(save);
    expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nombre'), 'julio cortazar');
    await user.type(screen.getByLabelText('Año de nacimiento'), '1990');
    await user.type(screen.getByLabelText('Año de fallecimiento'), '1980');
    await user.click(save);

    expect(screen.getByText('Ya existe un autor llamado «julio cortazar».')).toBeInTheDocument();
    expect(screen.getByText('No puede ser anterior al año de nacimiento.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('si la sesión venció al guardar, pide iniciarla de nuevo', async () => {
    mockApi({
      ...session(),
      'GET /authors': () => ({ status: 200, body: existing }),
      'POST /authors': () => ({ status: 401, body: { error: 'Token inválido o expirado' } }),
    });
    const user = userEvent.setup();
    renderApp('/autores/nuevo');

    await user.type(await screen.findByLabelText('Nombre'), 'Horacio Quiroga{Enter}');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('Portadas en la página de libros', () => {
  it('cada card muestra la imagen del libro', async () => {
    const coverUrl = 'https://covers.openlibrary.org/b/id/10832290-M.jpg';
    mockApi({ 'GET /books': () => ({ status: 200, body: [{ ...books[0], coverUrl }] }) });
    renderApp('/libros');

    const card = within(await screen.findByRole('article', { name: 'Ficciones' }));
    expect(card.getByRole('img', { name: 'Portada de Ficciones' })).toHaveAttribute('src', coverUrl);
  });
});
