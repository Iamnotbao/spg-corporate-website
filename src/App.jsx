import { useEffect, useState } from 'react';

const fallbackJobs = [
  { id: 'frontend-developer', title: 'Frontend Developer', type: 'Full-time', location: 'Ho Chi Minh City', description: 'Build accessible and reliable digital experiences with our team.' },
  { id: 'logistics-coordinator', title: 'Logistics Coordinator', type: 'Full-time', location: 'Ho Chi Minh City', description: 'Coordinate daily operations and help our partners move forward.' },
  { id: 'business-development-executive', title: 'Business Development Executive', type: 'Full-time', location: 'Ho Chi Minh City', description: 'Create meaningful partnerships and new opportunities for SPG.' },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobs, setJobs] = useState(fallbackJobs);
  const [selectedJob, setSelectedJob] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('');

  useEffect(() => { fetch('/api/jobs').then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setJobs(data.jobs || fallbackJobs)).catch(() => setJobs(fallbackJobs)); }, []);
  const submitApplication = async (event) => { event.preventDefault(); setStatus('Submitting...'); try { const response = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, jobId: selectedJob.id }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setStatus(data.message); setForm({ name: '', email: '', phone: '', message: '' }); } catch (error) { setStatus(error.message || 'Could not submit application.'); } };
  return <div className="site-shell">
    <header className="header"><a className="logo" href="#home">SPG<span>.</span></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">☰</button><nav className={menuOpen ? 'nav open' : 'nav'}><a href="#about">About us</a><a href="#services">Services</a><a href="#careers">Careers</a><a href="#contact">Contact</a></nav></header>
    <main>
      <section id="home" className="hero"><div><p className="eyebrow">SMART PEOPLE. GREATER POSSIBILITIES.</p><h1>Moving business<br/><em>forward.</em></h1><p className="hero-copy">SPG connects people, capability and opportunity to create lasting value for businesses and communities.</p><a className="button" href="#about">Discover SPG <span>↗</span></a></div><div className="hero-card"><div className="orb">SPG</div><p>Building what comes next</p></div></section>
      <section id="about" className="section split"><div><p className="eyebrow">WHO WE ARE</p><h2>Built for progress.</h2></div><div><p>SPG is a forward-thinking company focused on delivering reliable solutions, developing strong partnerships and creating meaningful opportunities.</p><p>Our people and our principles guide everything we do.</p><a className="text-link" href="#contact">Learn more about us ↗</a></div></section>
      <section id="services" className="section services"><p className="eyebrow">WHAT WE DO</p><h2>Capabilities that<br/><em>make a difference.</em></h2><div className="service-grid"><article><span>01</span><h3>Operations</h3><p>Efficient processes and dependable execution for everyday business needs.</p></article><article><span>02</span><h3>Partnerships</h3><p>Collaborative solutions designed around long-term value.</p></article><article><span>03</span><h3>People</h3><p>Talent and opportunities that help organisations grow sustainably.</p></article></div></section>
      <section id="careers" className="section careers"><div className="careers-heading"><div><p className="eyebrow">JOIN OUR TEAM</p><h2>Bring your<br/><em>ambition.</em></h2></div><p>We are looking for curious, capable people who want to build the future with us.</p></div><div className="job-list">{jobs.map((job) => <article className="job" key={job.id}><div><h3>{job.title}</h3><p>{job.type} · {job.location}</p><small>{job.description}</small></div><button className="apply-button" onClick={() => { setSelectedJob(job); setStatus(''); }}>Apply ↗</button></article>)}</div>{selectedJob && <div className="application-card"><button className="close-button" onClick={() => setSelectedJob(null)}>×</button><p className="eyebrow">APPLICATION</p><h3>{selectedJob.title}</h3><form onSubmit={submitApplication}><input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><textarea placeholder="Message" rows="4" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /><button className="button" type="submit">Submit application</button></form>{status && <p className="form-status">{status}</p>}</div>}</section>
      <section id="contact" className="contact"><p className="eyebrow">START A CONVERSATION</p><h2>Let’s create<br/><em>what’s next.</em></h2><a className="button light" href="mailto:hello@spg.com">hello@spg.com <span>↗</span></a></section>
    </main><footer><span>© 2026 SPG</span><span>Corporate website</span></footer>
  </div>;
}
export default App;