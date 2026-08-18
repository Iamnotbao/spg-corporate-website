import {
  getJob,
  getJobs,
  getPost,
  getPosts,
  submitApplication,
} from '../../services/publicService.js';
import '../../styles/public.css';
import CareerDetailPage from './pages/CareerDetailPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NewsDetailPage from './pages/NewsDetailPage.jsx';

export function CareerDetail() {
  return <CareerDetailPage loadJob={getJob} submitApplication={submitApplication} />;
}

export function NewsDetail() {
  return <NewsDetailPage loadPost={getPost} />;
}

export default function PublicApp() {
  return <HomePage loadJobs={getJobs} loadPosts={getPosts} />;
}
