import { Outlet } from 'react-router-dom';
import { useNoIndex } from '../../hooks/useNoIndex';
import { AuthProvider } from './AuthContext';

/** Enveloppe de l'espace d'administration : fournit l'état d'authentification, et seulement ici. */
export function AdminLayout() {
  useNoIndex();
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
