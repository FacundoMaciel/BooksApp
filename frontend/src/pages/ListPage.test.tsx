import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListPage } from './ListPage';

const setup = () => {
  const user = userEvent.setup();
  render(<ListPage />);
  return {
    user,
    input: screen.getByLabelText('Nuevo elemento'),
    addButton: screen.getByRole('button', { name: 'Añadir' }),
  };
};

const itemTexts = () =>
  screen.queryAllByRole('listitem').map((li) => li.textContent?.replace('✕', '').trim());

describe('ListPage (ejercicio 1)', () => {
  it('añade el texto al final de la lista al hacer click en el botón', async () => {
    const { user, input, addButton } = setup();

    await user.type(input, 'Primero');
    await user.click(addButton);
    await user.type(input, 'Segundo');
    await user.click(addButton);

    expect(itemTexts()).toEqual(['Primero', 'Segundo']);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('permite añadir con Enter', async () => {
    const { user, input } = setup();
    await user.type(input, 'Con enter{Enter}');
    expect(itemTexts()).toEqual(['Con enter']);
  });

  it('no añade elementos vacíos o solo con espacios', async () => {
    const { user, input, addButton } = setup();
    expect(addButton).toBeDisabled();

    await user.type(input, '   ');
    expect(addButton).toBeDisabled();
    await user.type(input, '{Enter}');

    expect(itemTexts()).toEqual([]);
  });

  it('elimina un elemento al hacer click sobre él', async () => {
    const { user, input } = setup();
    await user.type(input, 'A{Enter}B{Enter}C{Enter}');

    await user.click(screen.getByRole('button', { name: 'Eliminar B' }));

    expect(itemTexts()).toEqual(['A', 'C']);
  });

  it('elimina solo el elemento clickeado cuando hay textos repetidos', async () => {
    const { user, input } = setup();
    await user.type(input, 'X{Enter}X{Enter}');

    await user.click(screen.getAllByRole('button', { name: 'Eliminar X' })[0]);

    expect(itemTexts()).toEqual(['X']);
  });

  it('muestra un mensaje cuando la lista está vacía', async () => {
    const { user, input } = setup();
    expect(screen.getByText(/La lista está vacía/)).toBeInTheDocument();

    await user.type(input, 'A{Enter}');
    await user.click(screen.getByRole('button', { name: 'Eliminar A' }));

    expect(screen.getByText(/La lista está vacía/)).toBeInTheDocument();
  });
});
