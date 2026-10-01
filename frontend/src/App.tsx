import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/layout/Layout';
import { AddBookPage } from './pages/AddBookPage';
import { AuthorsPage } from './pages/AuthorsPage';
import { BooksPage } from './pages/BooksPage';
import { HomePage } from './pages/HomePage';
import { ListPage } from './pages/ListPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="libros" element={<BooksPage />} />
        <Route path="autores" element={<AuthorsPage />} />
        <Route
          path="lista"
          element={
            <RequireAuth>
              <ListPage />
            </RequireAuth>
          }
        />
        <Route
          path="libros/nuevo"
          element={
            <RequireAuth>
              <AddBookPage />
            </RequireAuth>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
