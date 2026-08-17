import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { api } from './api';

export default function PublicApp() {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api.getPosts().then(setPosts).catch(() => setPosts([]));
    api.getJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const featuredPosts = useMemo(() => posts.slice(0, 3), [posts]);
  const currentPost = featuredPosts[slide] || featuredPosts[0];

  useEffect(() => {
    if (slide >= featuredPosts.length) setSlide(0);
  }, [featuredPosts.length, slide]);

  useEffect(() => {
    if (featuredPosts.length < 2) return undefined;
    const timer = setInterval(() => {
      setSlide((value) => (value + 1) % featuredPosts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredPosts.length]);

  const next = () => setSlide((value) => (value + 1) % Math.max(featuredPosts.length, 1));
  const previous = () => setSlide((value) => (value - 1 + Math.max(featuredPosts.length, 1)) % Math.max(featuredPosts.length, 1));

  return (
    <main className="public-app">
      <section className="hero-section">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">SPG CORPORATE</p>
            <h1>Beyond Excellence</h1>
            <p className="hero-copy">Strategic growth, operational excellence and lasting value for the businesses we build.</p>
            <Link className="button button-primary" to="/about">Discover SPG <ArrowRight size={18} /></Link>
          </div>
          <div className="hero-visual" aria-hidden="true" />
        </div>
      </section>

      <section className="section news-section">
        <div className="container">
          <div className="section-heading"><div><p className="eyebrow">INSIGHTS</p><h2>Featured articles</h2></div><Link to="/articles">View all <ArrowRight size={16} /></Link></div>
          {currentPost ? <article className="article-carousel">
            <img src={currentPost.imageUrl || '/images/placeholder.jpg'} alt="" />
            <div className="article-carousel-content"><p className="eyebrow">{currentPost.category || 'SPG Insights'}</p><h3>{currentPost.title}</h3><p>{currentPost.excerpt || currentPost.content?.slice(0, 180)}</p><Link to={`/articles/${currentPost._id}`}>Read article <ArrowRight size={16} /></Link></div>
            <div className="carousel-controls"><button onClick={previous} aria-label="Previous article"><ChevronLeft size={20} /></button><span>{slide + 1} / {featuredPosts.length}</span><button onClick={next} aria-label="Next article"><ChevronRight size={20} /></button></div>
          </article> : <p className="empty-state">No articles available.</p>}
        </div>
      </section>

      <section className="section careers-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">CAREERS</p><h2>Build the future with us</h2></div><Link to="/careers">Explore opportunities <ArrowRight size={16} /></Link></div><div className="job-grid">{jobs.slice(0, 3).map((job) => <Link className="job-card" to={`/careers/${job._id}`} key={job._id}><h3>{job.title}</h3><p>{job.location}</p><span><Clock3 size={16} /> {job.type || 'Full-time'}</span></Link>)}</div></div></section>
    </main>
  );
}
