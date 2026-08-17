import Admin from './Admin.jsx';
import PublicApp from './PublicApp.jsx';
export default function App(){return window.location.pathname.startsWith('/admin')?<Admin/>:<PublicApp/>;}
