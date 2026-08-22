import AppRoutes from './routes.jsx';
import { StudentAuthProvider } from '../features/auth/StudentAuthContext.jsx';

export default function App() {
  return (
    <StudentAuthProvider>
      <AppRoutes />
    </StudentAuthProvider>
  );
}
