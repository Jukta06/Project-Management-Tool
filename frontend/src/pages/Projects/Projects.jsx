import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban } from '../../components/Icons';
import { useProjectStore } from '../../store/projectStore';
import toast from 'react-hot-toast';
import './Projects.css';

const Projects = () => {
  const {
    projects,
    fetchProjects,
    createProject,
    markProjectCompleted,
    archiveProject,
    restoreProject,
    isLoading
  } = useProjectStore();
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('active');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color: '#f97316',
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await createProject(formData);
    
    if (result.success) {
      toast.success('Project created successfully!');
      setShowModal(false);
      setFormData({ title: '', description: '', color: '#f97316' });
    } else {
      toast.error(result.error || 'Failed to create project');
    }
  };

  const handleComplete = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await markProjectCompleted(projectId);
    if (result.success) {
      toast.success('Project marked as completed');
    } else {
      toast.error(result.error || 'Failed to mark project completed');
    }
  };

  const handleArchive = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await archiveProject(projectId);
    if (result.success) {
      toast.success('Project archived successfully');
    } else {
      toast.error(result.error || 'Failed to archive project');
    }
  };

  const handleRestore = async (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await restoreProject(projectId);
    if (result.success) {
      toast.success('Project restored successfully');
    } else {
      toast.error(result.error || 'Failed to restore project');
    }
  };

  const visibleProjects = projects.filter((project) => (
    view === 'archived' ? project.status === 'archived' : project.status !== 'archived'
  ));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <div className="projects-actions">
          <div className="projects-view-toggle">
            <button
              className={`btn ${view === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('active')}
            >
              Active
            </button>
            <button
              className={`btn ${view === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setView('archived')}
            >
              Archived
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-with-icon"
          >
            <Plus className="w-5 h-5" />
            New Project
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading...</div>
      ) : visibleProjects.length === 0 ? (
        <div className="empty-state-container">
          <FolderKanban className="empty-icon" />
          <h3 className="empty-title">No {view} projects</h3>
          <p className="empty-desc">
            {view === 'archived'
              ? 'Archived projects will appear here'
              : 'Create your first project to get started'}
          </p>
          {view === 'active' && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {visibleProjects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="project-card"
            >
              <div className="project-card-content">
                <div
                  className="project-icon"
                  style={{ backgroundColor: project.color + '20' }}
                >
                  <FolderKanban style={{ color: project.color }} className="w-6 h-6" />
                </div>
                <div className="project-info">
                  <h3 className="project-title">{project.title}</h3>
                  <p className="project-desc">
                    {project.description || 'No description'}
                  </p>
                  <div className="project-meta">
                    <span className="badge badge-gray">
                      {project.members?.length || 0} members
                    </span>
                    <span className={`badge badge-${project.status}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="project-actions-row">
                    {project.status === 'active' && (
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => handleComplete(e, project.id)}
                      >
                        Mark Completed
                      </button>
                    )}
                    {project.status === 'completed' && (
                      <button
                        className="btn btn-primary"
                        onClick={(e) => handleArchive(e, project.id)}
                      >
                        Archive
                      </button>
                    )}
                    {project.status === 'archived' && (
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => handleRestore(e, project.id)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="modal-title">Create New Project</h2>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="color-input"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
