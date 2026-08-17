import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3 } from 'lucide-react';
import { api } from './api';

export default function PublicApp() {
  const [posts, setPosts] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    api.getPosts().then(setPosts).catch(() => setPosts([]));
    api.getJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

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
          <div className="article-grid">{posts.slice(0, 3).map((post) => <Link className="article-card" to={`/articles/${post._id}`} key={post._id}><img src={post.imageUrl || '/images/placeholder.jpg'} alt="" /><div><p className="eyebrow">{post.category || 'SPG Insights'}</p><h3>{post.title}</h3><p>{post.excerpt || post.content?.slice(0, 140)}</p><span>Read article <ArrowRight size={16} /></span></div></Link>)}</div>
        </div>
      </section>

      <section className="section careers-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">CAREERS</p><h2>Build the future with us</h2></div><Link to="/careers">Explore opportunities <ArrowRight size={16} /></Link></div><div className="job-grid">{jobs.slice(0, 3).map((job) => <Link className="job-card" to={`/careers/${job._id}`} key={job._id}><h3>{job.title}</h3><p>{job.location}</p><span><Clock3 size={16} /> {job.type || 'Full-time'}</span></Link>)}</div></div></section>
    </main>
  );
}
