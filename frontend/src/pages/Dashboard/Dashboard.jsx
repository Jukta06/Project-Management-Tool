import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { LayoutDashboard, FolderKanban, User, Plus } from '../../components/Icons';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();

  const totalProjects = projects.length;
  const activeProjects = projects.filter((project) => project.status === 'active').length;
  const completedProjects = projects.filter((project) => project.status === 'completed').length;
  const archivedProjects = projects.filter((project) => project.status === 'archived').length;
  const recentProjects = projects.slice(0, 6);
  const completionRate = totalProjects > 0
    ? Math.round((completedProjects / totalProjects) * 100)
    : 0;

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero card">
        <div className="hero-content">
          <p className="hero-eyebrow">Team workspace overview</p>
          <h1 className="page-title">Welcome back, {user?.name || 'User'}!</h1>
          <p className="hero-subtitle">
            Manage your pipeline, monitor progress, and keep every task moving.
          </p>
          <div className="hero-cta-row">
            <Link to="/projects" className="hero-btn hero-btn-primary">
              <FolderKanban className="hero-btn-icon" />
              Open Projects
            </Link>
            <Link to="/profile" className="hero-btn hero-btn-secondary">
              <User className="hero-btn-icon" />
              View Profile
            </Link>
          </div>
        </div>

        <div className="hero-profile-card">
          <div className="hero-avatar-wrap">
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name || 'User avatar'} className="hero-avatar" />
            ) : (
              <div className="hero-avatar hero-avatar-fallback">{userInitial}</div>
            )}
          </div>
          <p className="hero-user-name">{user?.name || 'Team Member'}</p>
          <p className="hero-user-email">{user?.email || 'No email available'}</p>
          <div className="hero-badge-row">
            <span className="hero-chip">{activeProjects} Active</span>
            <span className="hero-chip">{completionRate}% Completed</span>
          </div>
        </div>
      </section>

      <section className="dashboard-stats">
        <article className="stat-card stat-card-orange">
          <div className="stat-header">
            <LayoutDashboard className="stat-icon" />
            <h3 className="stat-label">Total Projects</h3>
          </div>
          <p className="stat-value">{totalProjects}</p>
          <p className="stat-footnote">All projects in your workspace</p>
        </article>

        <article className="stat-card stat-card-white">
          <div className="stat-header">
            <FolderKanban className="stat-icon" />
            <h3 className="stat-label">Active Projects</h3>
          </div>
          <p className="stat-value">{activeProjects}</p>
          <p className="stat-footnote">Projects currently in execution</p>
        </article>

        <article className="stat-card stat-card-white">
          <div className="stat-header">
            <Plus className="stat-icon" />
            <h3 className="stat-label">Completed Projects</h3>
          </div>
          <p className="stat-value">{completedProjects}</p>
          <p className="stat-footnote">Delivered and closed projects</p>
        </article>

        <article className="stat-card stat-card-white">
          <div className="stat-header">
            <User className="stat-icon" />
            <h3 className="stat-label">Archived Projects</h3>
          </div>
          <p className="stat-value">{archivedProjects}</p>
          <p className="stat-footnote">Stored for future reference</p>
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <div className="card recent-projects-card">
          <div className="section-header">
            <h2 className="card-title">Recent Projects</h2>
            <Link to="/projects" className="section-link">See all</Link>
          </div>

          {recentProjects.length === 0 ? (
            <p className="empty-state">No projects yet. Create your first project to get started.</p>
          ) : (
            <div className="project-list">
              {recentProjects.map((project) => (
                <div key={project.id} className="project-item">
                  <div className="project-item-top">
                    <h3 className="project-item-title">{project.title}</h3>
                    <span className={`project-status status-${project.status || 'active'}`}>
                      {project.status || 'active'}
                    </span>
                  </div>
                  <p className="project-item-desc">
                    {project.description || 'No description provided yet.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="card quick-panel">
          <h2 className="card-title">Quick Snapshot</h2>
          <div className="snapshot-rows">
            <div className="snapshot-row">
              <span>Completion rate</span>
              <strong>{completionRate}%</strong>
            </div>
            <div className="snapshot-progress">
              <span style={{ width: `${completionRate}%` }} />
            </div>

            <div className="snapshot-row">
              <span>Running workload</span>
              <strong>{activeProjects} active</strong>
            </div>
            <div className="snapshot-row">
              <span>Delivery count</span>
              <strong>{completedProjects} done</strong>
            </div>
            <div className="snapshot-row">
              <span>Archive storage</span>
              <strong>{archivedProjects} saved</strong>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/projects" className="quick-action-btn">Manage Projects</Link>
            <Link to="/profile" className="quick-action-btn quick-action-btn-muted">Account Settings</Link>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Dashboard;
