import {
  getJob,
  getJobs,
  getPost,
  getPosts,
  submitApplication,
} from '../../services/publicService.js';
import '../../styles/public.css';
import '../../styles/content-attachment.css';
import '../../styles/professional-navigation.css';
import CareerDetailPage from './pages/CareerDetailPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NewsDetailPage from './pages/NewsDetailPage.jsx';

export function CareerDetail() {
  return (
    <CareerDetailPage
      loadJob={getJob}
      loadJobs={getJobs}
      submitApplication={submitApplication}
    />
  );
}

export function NewsDetail() {
  return <NewsDetailPage loadPost={getPost} loadPosts={getPosts} />;
}

export default function PublicApp() {
  return <HomePage loadJobs={getJobs} loadPosts={getPosts} />;
}
