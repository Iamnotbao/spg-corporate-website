import { Routes, Route } from 'react-router-dom';
import Admin from './Admin.jsx';
import PublicApp, { CareerDetail, NewsDetail } from './PublicApp.jsx';

export default function App(){return <Routes><Route path="/admin" element={<Admin/>}/><Route path="/news/:slug" element={<NewsDetail/>}/><Route path="/careers/:slug" element={<CareerDetail/>}/><Route path="*" element={<PublicApp/>}/></Routes>}
