import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './Landing.css';

const Landing = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-page">
      <div className="landing-aurora landing-aurora-top" aria-hidden="true" />
      <div className="landing-aurora landing-aurora-bottom" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-brand">
          <div className="brand-logo" aria-hidden="true">
            <span>PM</span>
          </div>
          <div>
            <p className="brand-label">Project Workspace</p>
            <h1 className="brand-title">Project Management Tool</h1>
          </div>
        </div>

        <nav className="landing-nav" aria-label="Authentication links">
          <Link to="/login" className="btn-ghost">Login</Link>
          <Link to="/register" className="btn-solid">Get Started</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-copy">
          <p className="hero-chip">Built for modern teams</p>
          <h2>Plan work, track progress, and ship faster.</h2>
          <p className="hero-subtitle">
            Keep projects, tasks, comments, and team updates in one clear workflow.
            Collaborate in real-time and stay focused on execution.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-solid btn-lg">Create Account</Link>
            <Link to="/login" className="btn-outline btn-lg">Sign In</Link>
          </div>
        </section>

        <section className="hero-stats" aria-label="Product highlights">
          <article className="stat-card">
            <p className="stat-number">Realtime</p>
            <p className="stat-label">Live updates for tasks and team presence</p>
          </article>
          <article className="stat-card">
            <p className="stat-number">Kanban</p>
            <p className="stat-label">Flexible boards for every delivery stage</p>
          </article>
          <article className="stat-card">
            <p className="stat-number">Secure</p>
            <p className="stat-label">Role-based access with invite approvals</p>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Landing;
