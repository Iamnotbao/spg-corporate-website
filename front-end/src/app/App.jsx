import AppRoutes from './routes.jsx';
import MotionProvider from '../components/ui/MotionProvider.jsx';
import { StudentAuthProvider } from '../features/auth/StudentAuthContext.jsx';

export default function App() {
  return (
    <StudentAuthProvider>
      <MotionProvider />
      <AppRoutes />
    </StudentAuthProvider>
  );
}
