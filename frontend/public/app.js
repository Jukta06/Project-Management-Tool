const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'http://localhost:5000/api';

const state = {
  token: localStorage.getItem('token') || '',
  user: null,
  projects: [],
  notifications: [],
  projectCache: new Map(),
  tasksByProject: new Map()
};

function qs(sel) {
  return document.querySelector(sel);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const root = qs('#toast-root');
  if (!root) return;
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'error' : 'success'}`;
  node.textContent = message;
  root.appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    state.token = '';
    state.user = null;
    localStorage.removeItem('token');
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    }
  }

  return { ok: res.ok, status: res.status, data };
}

function iconBell() {
  return '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>';
}

function iconDashboard() {
  return '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>';
}

function iconFolder() {
  return '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
}

function iconUser() {
  return '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';
}

function iconLogout() {
  return '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>';
}

function navigate(path) {
  if (location.pathname !== path) {
    history.pushState({}, '', path);
  }
  renderRoute();
}

function onLinkClick(e) {
  const anchor = e.target.closest('a[data-link]');
  if (!anchor) return;
  e.preventDefault();
  const href = anchor.getAttribute('href');
  if (href) navigate(href);
}

document.addEventListener('click', onLinkClick);
window.addEventListener('popstate', renderRoute);

function setRoot(html) {
  const root = qs('#app');
  if (!root) return;
  root.innerHTML = html;
}

function shellLayout(active, content) {
  const username = escapeHtml(state.user?.name || 'User');
  const userInitial = escapeHtml((state.user?.name || 'U').charAt(0).toUpperCase());

  return `
    <div class="layout-container">
      <header class="navbar">
        <div class="navbar-container">
          <a data-link href="/dashboard" class="navbar-logo">
            <span class="navbar-logo-mark">PM</span>
            <span>ProjectHub</span>
          </a>

          <div class="navbar-right">
            <a data-link href="/notifications" class="notification-btn" title="Notifications">
              ${iconBell()}
              ${state.notifications.length ? `<span class="notification-badge">${state.notifications.filter((n) => !n.read).length}</span>` : ''}
            </a>

            <div class="user-menu">
              <div class="user-avatar">${userInitial}</div>
              <span class="user-name">${username}</span>
              <button id="logoutBtn" class="logout-btn" title="Logout">${iconLogout()}</button>
            </div>
          </div>
        </div>
      </header>

      <div class="layout-content">
        <aside class="sidebar">
          <nav class="sidebar-nav">
            <a data-link href="/dashboard" class="sidebar-link ${active === 'dashboard' ? 'sidebar-link-active' : ''}">${iconDashboard()} Dashboard</a>
            <a data-link href="/projects" class="sidebar-link ${active === 'projects' ? 'sidebar-link-active' : ''}">${iconFolder()} Projects</a>
            <a data-link href="/notifications" class="sidebar-link ${active === 'notifications' ? 'sidebar-link-active' : ''}">${iconBell()} Notifications</a>
            <a data-link href="/profile" class="sidebar-link ${active === 'profile' ? 'sidebar-link-active' : ''}">${iconUser()} Profile</a>
          </nav>
        </aside>
        <main class="main-content">${content}</main>
      </div>
    </div>
  `;
}

function renderPublicLanding() {
  setRoot(`
    <div class="landing-page">
      <div class="landing-aurora landing-aurora-top" aria-hidden="true"></div>
      <div class="landing-aurora landing-aurora-bottom" aria-hidden="true"></div>

      <header class="landing-header">
        <div class="landing-brand">
          <div class="brand-logo"><span>PM</span></div>
          <div>
            <p class="brand-label">Project Workspace</p>
            <h1 class="brand-title">Project Management Tool</h1>
          </div>
        </div>
        <nav class="landing-nav" aria-label="Authentication links">
          <a data-link href="/login" class="btn-ghost">Login</a>
          <a data-link href="/register" class="btn-solid">Get Started</a>
        </nav>
      </header>

      <main class="landing-main">
        <section class="hero-copy">
          <p class="hero-chip">Built for modern teams</p>
          <h2>Plan work, track progress, and ship faster.</h2>
          <p class="hero-subtitle">Keep projects, tasks, comments, and team updates in one clear workflow. Collaborate in real-time and stay focused on execution.</p>
          <div class="hero-actions">
            <a data-link href="/register" class="btn-solid btn-lg">Create Account</a>
            <a data-link href="/login" class="btn-outline btn-lg">Sign In</a>
          </div>
        </section>

        <section class="hero-stats" aria-label="Product highlights">
          <article class="stat-card"><p class="stat-number">Realtime</p><p class="stat-label">Live updates for tasks and team presence</p></article>
          <article class="stat-card"><p class="stat-number">Kanban</p><p class="stat-label">Flexible boards for every delivery stage</p></article>
          <article class="stat-card"><p class="stat-number">Secure</p><p class="stat-label">Role-based access with invite approvals</p></article>
        </section>
      </main>
    </div>
  `);
}

function renderLogin() {
  setRoot(`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-icon">${iconFolder()}</div>
          <span>ProjectHub</span>
        </div>
        <h2 class="auth-title">Login</h2>
        <p class="auth-subtitle">Sign in to manage your projects, tasks, and team updates.</p>

        <form id="loginForm" class="auth-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input name="email" type="email" class="input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input name="password" type="password" class="input" required />
          </div>
          <button type="submit" class="btn btn-primary w-full">Login</button>
        </form>

        <p class="auth-footer">Don't have an account? <a data-link href="/register" class="auth-link">Register</a></p>
      </div>
    </div>
  `);

  qs('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get('email') || '').trim(),
      password: String(form.get('password') || '')
    };

    const result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!result.ok) {
      showToast(result.data?.message || 'Login failed', 'error');
      return;
    }

    state.token = result.data.token || '';
    localStorage.setItem('token', state.token);
    await loadAuthContext();
    showToast('Login successful');
    navigate('/dashboard');
  });
}

function renderRegister() {
  setRoot(`
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="auth-brand-icon">${iconFolder()}</div>
          <span>ProjectHub</span>
        </div>
        <h2 class="auth-title">Register</h2>
        <p class="auth-subtitle">Create your account and start collaborating with your team.</p>

        <form id="registerForm" class="auth-form">
          <div class="form-group"><label class="form-label">Name</label><input name="name" type="text" class="input" required /></div>
          <div class="form-group"><label class="form-label">Email</label><input name="email" type="email" class="input" required /></div>
          <div class="form-group"><label class="form-label">Password</label><input name="password" type="password" minlength="6" class="input" required /></div>
          <div class="form-group"><label class="form-label">Confirm Password</label><input name="confirmPassword" type="password" class="input" required /></div>
          <button type="submit" class="btn btn-primary w-full">Register</button>
        </form>

        <p class="auth-footer">Already have an account? <a data-link href="/login" class="auth-link">Login</a></p>
      </div>
    </div>
  `);

  qs('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    const payload = {
      name: String(form.get('name') || '').trim(),
      email: String(form.get('email') || '').trim(),
      password
    };

    const result = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!result.ok) {
      showToast(result.data?.message || 'Registration failed', 'error');
      return;
    }

    state.token = result.data.token || '';
    localStorage.setItem('token', state.token);
    await loadAuthContext();
    showToast('Registration successful');
    navigate('/dashboard');
  });
}

async function loadAuthContext() {
  if (!state.token) {
    state.user = null;
    state.projects = [];
    state.notifications = [];
    return;
  }

  const me = await api('/auth/me');
  if (me.ok) {
    state.user = me.data.user || null;
  }

  const [projectsRes, notifRes] = await Promise.all([
    api('/projects'),
    api('/notifications')
  ]);

  if (projectsRes.ok) {
    state.projects = projectsRes.data.projects || [];
  }
  if (notifRes.ok) {
    state.notifications = notifRes.data.notifications || [];
  }
}

function ensureAuth() {
  if (!state.user) {
    navigate('/login');
    return false;
  }
  return true;
}

function renderDashboard() {
  if (!ensureAuth()) return;

  const totalProjects = state.projects.length;
  const activeProjects = state.projects.filter((p) => p.status === 'active').length;
  const completedProjects = state.projects.filter((p) => p.status === 'completed').length;
  const archivedProjects = state.projects.filter((p) => p.status === 'archived').length;
  const recentProjects = state.projects.slice(0, 6);
  const completionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  const content = `
    <div class="dashboard-page">
      <section class="dashboard-hero card">
        <div class="hero-content">
          <p class="hero-eyebrow">Team workspace overview</p>
          <h1 class="page-title">Welcome back, ${escapeHtml(state.user.name || 'User')}!</h1>
          <p class="hero-subtitle">Manage your pipeline, monitor progress, and keep every task moving.</p>
          <div class="hero-cta-row">
            <a data-link href="/projects" class="hero-btn hero-btn-primary">Open Projects</a>
            <a data-link href="/profile" class="hero-btn hero-btn-secondary">View Profile</a>
          </div>
        </div>
        <div class="hero-profile-card">
          <div class="hero-avatar-wrap">
            ${state.user.avatar ? `<img src="${escapeHtml(state.user.avatar)}" alt="avatar" class="hero-avatar" />` : `<div class="hero-avatar hero-avatar-fallback">${escapeHtml((state.user.name || 'U').charAt(0).toUpperCase())}</div>`}
          </div>
          <p class="hero-user-name">${escapeHtml(state.user.name || 'Team Member')}</p>
          <p class="hero-user-email">${escapeHtml(state.user.email || '')}</p>
          <div class="hero-badge-row">
            <span class="hero-chip">${activeProjects} Active</span>
            <span class="hero-chip">${completionRate}% Completed</span>
          </div>
        </div>
      </section>

      <section class="dashboard-stats">
        <article class="stat-card stat-card-orange"><div class="stat-header"><h3 class="stat-label">Total Projects</h3></div><p class="stat-value">${totalProjects}</p><p class="stat-footnote">All projects in your workspace</p></article>
        <article class="stat-card stat-card-white"><div class="stat-header"><h3 class="stat-label">Active Projects</h3></div><p class="stat-value">${activeProjects}</p><p class="stat-footnote">Projects currently in execution</p></article>
        <article class="stat-card stat-card-white"><div class="stat-header"><h3 class="stat-label">Completed Projects</h3></div><p class="stat-value">${completedProjects}</p><p class="stat-footnote">Delivered and closed projects</p></article>
        <article class="stat-card stat-card-white"><div class="stat-header"><h3 class="stat-label">Archived Projects</h3></div><p class="stat-value">${archivedProjects}</p><p class="stat-footnote">Stored for future reference</p></article>
      </section>

      <section class="dashboard-lower-grid">
        <div class="card recent-projects-card">
          <div class="section-header">
            <h2 class="card-title">Recent Projects</h2>
            <a data-link href="/projects" class="section-link">See all</a>
          </div>
          ${recentProjects.length === 0 ? '<p class="empty-state">No projects yet. Create your first project to get started.</p>' : `<div class="project-list">${recentProjects.map((project) => `
            <div class="project-item">
              <div class="project-item-top"><h3 class="project-item-title">${escapeHtml(project.title)}</h3><span class="project-status status-${escapeHtml(project.status || 'active')}">${escapeHtml(project.status || 'active')}</span></div>
              <p class="project-item-desc">${escapeHtml(project.description || 'No description provided yet.')}</p>
            </div>
          `).join('')}</div>`}
        </div>

        <aside class="card quick-panel">
          <h2 class="card-title">Quick Snapshot</h2>
          <div class="snapshot-rows">
            <div class="snapshot-row"><span>Completion rate</span><strong>${completionRate}%</strong></div>
            <div class="snapshot-progress"><span style="width:${completionRate}%"></span></div>
            <div class="snapshot-row"><span>Running workload</span><strong>${activeProjects} active</strong></div>
            <div class="snapshot-row"><span>Delivery count</span><strong>${completedProjects} done</strong></div>
            <div class="snapshot-row"><span>Archive storage</span><strong>${archivedProjects} saved</strong></div>
          </div>
          <div class="quick-actions">
            <a data-link href="/projects" class="quick-action-btn">Manage Projects</a>
            <a data-link href="/profile" class="quick-action-btn quick-action-btn-muted">Account Settings</a>
          </div>
        </aside>
      </section>
    </div>
  `;

  setRoot(shellLayout('dashboard', content));
  wireGlobalShellEvents();
}

function projectCard(project) {
  return `
    <a data-link href="/projects/${project.id}" class="project-card project-link">
      <div class="project-card-content">
        <div class="project-icon" style="background-color:${escapeHtml(project.color || '#f97316')}20">${iconFolder()}</div>
        <div class="project-info">
          <h3 class="project-title">${escapeHtml(project.title)}</h3>
          <p class="project-desc">${escapeHtml(project.description || 'No description')}</p>
          <div class="project-meta">
            <span class="badge badge-gray">${project.members?.length || 0} members</span>
            <span class="badge badge-${escapeHtml(project.status || 'active')}">${escapeHtml(project.status || 'active')}</span>
          </div>
          <div class="project-actions-row">
            ${project.status === 'active' ? `<button data-action="complete" data-id="${project.id}" class="btn btn-secondary">Mark Completed</button>` : ''}
            ${project.status === 'completed' ? `<button data-action="archive" data-id="${project.id}" class="btn btn-primary">Archive</button>` : ''}
            ${project.status === 'archived' ? `<button data-action="restore" data-id="${project.id}" class="btn btn-secondary">Restore</button>` : ''}
          </div>
        </div>
      </div>
    </a>
  `;
}

function renderProjects() {
  if (!ensureAuth()) return;

  const content = `
    <div>
      <div class="page-header">
        <h1 class="page-title">Projects</h1>
        <div class="projects-actions">
          <div class="projects-view-toggle">
            <button data-view="active" class="btn btn-primary">Active</button>
            <button data-view="archived" class="btn btn-secondary">Archived</button>
          </div>
          <button id="newProjectBtn" class="btn btn-primary btn-with-icon">+ New Project</button>
        </div>
      </div>

      <div id="projectsContainer" class="projects-grid"></div>

      <div id="projectModal" class="modal-overlay hidden">
        <div class="modal">
          <h2 class="modal-title">Create New Project</h2>
          <form id="projectForm" class="modal-form">
            <div class="form-group"><label class="form-label">Project Name</label><input name="title" class="input" required /></div>
            <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="input" rows="3"></textarea></div>
            <div class="form-group"><label class="form-label">Color</label><input name="color" type="color" class="color-input" value="#f97316" /></div>
            <div class="modal-actions">
              <button class="btn btn-primary" type="submit">Create</button>
              <button id="closeProjectModal" class="btn btn-secondary" type="button">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  setRoot(shellLayout('projects', content));
  wireGlobalShellEvents();

  const renderList = (view) => {
    const visible = state.projects.filter((p) => (view === 'archived' ? p.status === 'archived' : p.status !== 'archived'));
    qs('#projectsContainer').innerHTML = visible.length ? visible.map(projectCard).join('') : `
      <div class="empty-state-container">
        <div class="empty-icon">${iconFolder()}</div>
        <h3 class="empty-title">No ${view} projects</h3>
        <p class="empty-desc">${view === 'archived' ? 'Archived projects will appear here' : 'Create your first project to get started'}</p>
      </div>
    `;
  };

  let activeView = 'active';
  renderList(activeView);

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeView = btn.getAttribute('data-view') || 'active';
      document.querySelectorAll('[data-view]').forEach((b) => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      renderList(activeView);
    });
  });

  qs('#newProjectBtn')?.addEventListener('click', () => qs('#projectModal')?.classList.remove('hidden'));
  qs('#closeProjectModal')?.addEventListener('click', () => qs('#projectModal')?.classList.add('hidden'));

  qs('#projectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      color: String(form.get('color') || '#f97316')
    };

    const result = await api('/projects', { method: 'POST', body: JSON.stringify(payload) });
    if (!result.ok) {
      showToast(result.data?.message || 'Failed to create project', 'error');
      return;
    }

    state.projects.unshift(result.data.project);
    qs('#projectModal')?.classList.add('hidden');
    e.currentTarget.reset();
    showToast('Project created successfully');
    renderList(activeView);
  });

  qs('#projectsContainer')?.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();

    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');
    if (!id || !action) return;

    let endpoint = '';
    let method = 'PATCH';

    if (action === 'complete') {
      endpoint = `/projects/${id}`;
      method = 'PUT';
    }
    if (action === 'archive') endpoint = `/projects/${id}/archive`;
    if (action === 'restore') endpoint = `/projects/${id}/restore`;

    const body = action === 'complete' ? JSON.stringify({ status: 'completed' }) : undefined;
    const result = await api(endpoint, { method, body });

    if (!result.ok) {
      showToast(result.data?.message || 'Action failed', 'error');
      return;
    }

    const nextProject = result.data.project;
    state.projects = state.projects.map((p) => (String(p.id) === String(id) ? nextProject : p));
    showToast('Project updated');
    renderList(activeView);
  });
}

function fmtDate(date) {
  if (!date) return 'No due date';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return String(date);
  }
}

async function renderProjectDetail(projectId) {
  if (!ensureAuth()) return;

  const [projectRes, tasksRes] = await Promise.all([
    api(`/projects/${projectId}`),
    api(`/tasks?project=${projectId}`)
  ]);

  if (!projectRes.ok) {
    setRoot(shellLayout('projects', '<div class="card">Project not found.</div>'));
    wireGlobalShellEvents();
    return;
  }

  const project = projectRes.data.project;
  const tasks = tasksRes.ok ? (tasksRes.data.tasks || []) : [];

  state.projectCache.set(String(projectId), project);
  state.tasksByProject.set(String(projectId), tasks);

  const boards = Array.isArray(project.boards) && project.boards.length
    ? [...project.boards].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [{ name: 'To Do', order: 0 }, { name: 'In Progress', order: 1 }, { name: 'Done', order: 2 }];

  const boardHtml = boards.map((board) => {
    const boardTasks = tasks.filter((t) => t.board === board.name);
    return `
      <div class="board">
        <div class="board-header">
          <h3 class="board-title">${escapeHtml(board.name)}</h3>
          <button class="btn btn-primary" data-new-task="${escapeHtml(board.name)}">+ Task</button>
        </div>
        <div class="tasks-container">
          ${boardTasks.map((task) => `
            <article class="task-card">
              <h4 class="task-title">${escapeHtml(task.title)}</h4>
              <p class="task-description-markdown">${escapeHtml(task.description || 'No description')}</p>
              <div class="task-meta">
                <span class="priority-badge priority-${escapeHtml(task.priority || 'medium')}">${escapeHtml(task.priority || 'medium')}</span>
                <span class="task-due-date">${fmtDate(task.dueDate)}</span>
              </div>
              <div class="task-card-actions">
                <button class="btn btn-secondary" data-edit-task="${task.id}">Edit</button>
                <button class="btn btn-danger" data-delete-task="${task.id}">Delete</button>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  const content = `
    <div>
      <header class="project-header">
        <h1 class="page-title">${escapeHtml(project.title)}</h1>
        <p class="project-description">${escapeHtml(project.description || 'No description')}</p>
      </header>

      <section class="columns-section">
        <h2 class="columns-title">Task Board</h2>
        <div class="boards-container">${boardHtml}</div>
      </section>

      <div id="taskModal" class="modal-overlay hidden">
        <div class="task-modal card">
          <h2 class="modal-title" id="taskModalTitle">Create Task</h2>
          <form id="taskForm" class="modal-form">
            <input type="hidden" name="taskId" />
            <div class="form-group"><label class="form-label">Title</label><input name="title" class="input" required /></div>
            <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="input" rows="4"></textarea></div>
            <div class="task-form-row">
              <div class="form-group"><label class="form-label">Board</label><select name="board" class="input">${boards.map((b) => `<option>${escapeHtml(b.name)}</option>`).join('')}</select></div>
              <div class="form-group"><label class="form-label">Priority</label><select name="priority" class="input"><option value="low">low</option><option value="medium" selected>medium</option><option value="high">high</option><option value="urgent">urgent</option></select></div>
            </div>
            <div class="form-group"><label class="form-label">Due Date</label><input type="date" name="dueDate" class="input" /></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">Save Task</button>
              <button id="closeTaskModal" type="button" class="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  setRoot(shellLayout('projects', content));
  wireGlobalShellEvents();

  const taskModal = qs('#taskModal');
  const taskForm = qs('#taskForm');
  const taskModalTitle = qs('#taskModalTitle');

  function openTaskModal(boardName, task) {
    if (!taskModal || !taskForm || !taskModalTitle) return;
    taskModal.classList.remove('hidden');

    taskForm.taskId.value = task?.id || '';
    taskForm.title.value = task?.title || '';
    taskForm.description.value = task?.description || '';
    taskForm.board.value = task?.board || boardName || boards[0]?.name || 'To Do';
    taskForm.priority.value = task?.priority || 'medium';
    taskForm.dueDate.value = task?.dueDate ? String(task.dueDate).slice(0, 10) : '';
    taskModalTitle.textContent = task ? 'Edit Task' : 'Create Task';
  }

  qs('#closeTaskModal')?.addEventListener('click', () => taskModal?.classList.add('hidden'));

  document.querySelectorAll('[data-new-task]').forEach((btn) => {
    btn.addEventListener('click', () => openTaskModal(btn.getAttribute('data-new-task') || 'To Do', null));
  });

  document.querySelectorAll('[data-edit-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tid = btn.getAttribute('data-edit-task');
      const task = tasks.find((t) => String(t.id) === String(tid));
      if (task) openTaskModal(task.board || 'To Do', task);
    });
  });

  document.querySelectorAll('[data-delete-task]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tid = btn.getAttribute('data-delete-task');
      if (!tid) return;
      const result = await api(`/tasks/${tid}`, { method: 'DELETE' });
      if (!result.ok) {
        showToast(result.data?.message || 'Failed to delete task', 'error');
        return;
      }
      showToast('Task deleted');
      renderProjectDetail(projectId);
    });
  });

  taskForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(taskForm);
    const payload = {
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      board: String(form.get('board') || boards[0]?.name || 'To Do'),
      priority: String(form.get('priority') || 'medium'),
      dueDate: String(form.get('dueDate') || ''),
      project: Number(projectId)
    };

    const taskId = String(form.get('taskId') || '').trim();
    const result = taskId
      ? await api(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await api('/tasks', { method: 'POST', body: JSON.stringify(payload) });

    if (!result.ok) {
      showToast(result.data?.message || 'Failed to save task', 'error');
      return;
    }

    showToast(taskId ? 'Task updated' : 'Task created');
    taskModal?.classList.add('hidden');
    renderProjectDetail(projectId);
  });
}

function renderNotifications() {
  if (!ensureAuth()) return;

  const notifications = [...state.notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = notifications.filter((n) => !n.read).length;

  const content = `
    <div class="notifications-page card">
      <div class="notifications-header-row">
        <div>
          <h1 class="page-title">Notifications</h1>
          <p class="notifications-subtitle">Project invites, task assignments, and team updates.</p>
        </div>
        <button id="markAllReadBtn" class="btn btn-secondary" ${unreadCount === 0 ? 'disabled' : ''}>Mark All Read</button>
      </div>

      ${notifications.length === 0 ? '<p class="notifications-empty">No notifications yet.</p>' : `<div class="notifications-list">${notifications.map((n) => `
        <div class="notification-card ${n.read ? '' : 'notification-card-unread'}">
          <div class="notification-main">
            <p class="notification-message">${escapeHtml(n.message)}</p>
            <p class="notification-time">${escapeHtml(new Date(n.createdAt).toLocaleString())}</p>
          </div>
          <div class="notification-actions">
            <a data-link href="${n.relatedProjectId ? `/projects/${n.relatedProjectId}` : '/dashboard'}" class="btn btn-secondary">Open</a>
            ${n.read ? '' : `<button data-mark-read="${n.id}" class="btn btn-primary">Mark Read</button>`}
            <button data-delete-note="${n.id}" class="btn btn-danger">Delete</button>
          </div>
        </div>
      `).join('')}</div>`}
    </div>
  `;

  setRoot(shellLayout('notifications', content));
  wireGlobalShellEvents();

  qs('#markAllReadBtn')?.addEventListener('click', async () => {
    const result = await api('/notifications/read-all', { method: 'PUT' });
    if (!result.ok) {
      showToast(result.data?.message || 'Failed to mark all read', 'error');
      return;
    }
    state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
    showToast('All notifications marked as read');
    renderNotifications();
  });

  document.querySelectorAll('[data-mark-read]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-mark-read');
      const result = await api(`/notifications/${id}/read`, { method: 'PUT' });
      if (!result.ok) {
        showToast(result.data?.message || 'Failed to mark read', 'error');
        return;
      }
      state.notifications = state.notifications.map((n) => (String(n.id) === String(id) ? { ...n, read: true } : n));
      renderNotifications();
    });
  });

  document.querySelectorAll('[data-delete-note]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-note');
      const result = await api(`/notifications/${id}`, { method: 'DELETE' });
      if (!result.ok) {
        showToast(result.data?.message || 'Failed to delete', 'error');
        return;
      }
      state.notifications = state.notifications.filter((n) => String(n.id) !== String(id));
      showToast('Notification deleted');
      renderNotifications();
    });
  });
}

function renderProfile() {
  if (!ensureAuth()) return;

  const content = `
    <div class="profile-container">
      <h1 class="page-title">Profile</h1>
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            ${state.user.avatar ? `<img src="${escapeHtml(state.user.avatar)}" alt="Avatar" class="profile-avatar-image" />` : escapeHtml((state.user.name || '?').charAt(0).toUpperCase())}
          </div>
          <div>
            <h2 class="profile-name">${escapeHtml(state.user.name || '')}</h2>
            <p class="profile-email">${escapeHtml(state.user.email || '')}</p>
          </div>
        </div>

        <form id="profileForm" class="profile-form">
          <div class="form-group"><label class="form-label">Name</label><input name="name" class="input" value="${escapeHtml(state.user.name || '')}" /></div>
          <div class="form-group"><label class="form-label">Email</label><input class="input" value="${escapeHtml(state.user.email || '')}" readonly /></div>
          <div class="form-group"><label class="form-label">Avatar URL</label><input name="avatar" class="input" value="${escapeHtml(state.user.avatar || '')}" /></div>
          <div class="form-group"><label class="form-label">Bio</label><textarea name="bio" class="input" rows="4">${escapeHtml(state.user.bio || '')}</textarea></div>
          <div class="form-group"><label class="form-label">Role</label><input class="input" value="${escapeHtml(state.user.role || '')}" readonly /></div>
          <button type="submit" class="btn btn-primary">Save Profile</button>
        </form>
      </div>
    </div>
  `;

  setRoot(shellLayout('profile', content));
  wireGlobalShellEvents();

  qs('#profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name') || '').trim(),
      avatar: String(form.get('avatar') || '').trim(),
      bio: String(form.get('bio') || '').trim()
    };

    const result = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!result.ok) {
      showToast(result.data?.message || 'Failed to update profile', 'error');
      return;
    }

    state.user = result.data.user;
    showToast('Profile updated successfully');
    renderProfile();
  });
}

function wireGlobalShellEvents() {
  qs('#logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    state.token = '';
    state.user = null;
    showToast('Logged out');
    navigate('/login');
  });
}

async function renderRoute() {
  const path = location.pathname;

  if (!state.user && state.token) {
    await loadAuthContext();
  }

  if (path === '/') {
    if (state.user) {
      navigate('/dashboard');
      return;
    }
    renderPublicLanding();
    return;
  }

  if (path === '/login') {
    if (state.user) {
      navigate('/dashboard');
      return;
    }
    renderLogin();
    return;
  }

  if (path === '/register') {
    if (state.user) {
      navigate('/dashboard');
      return;
    }
    renderRegister();
    return;
  }

  if (path === '/dashboard') {
    renderDashboard();
    return;
  }

  if (path === '/projects') {
    renderProjects();
    return;
  }

  const projectMatch = path.match(/^\/projects\/(\d+)$/);
  if (projectMatch) {
    renderProjectDetail(projectMatch[1]);
    return;
  }

  if (path === '/notifications') {
    renderNotifications();
    return;
  }

  if (path === '/profile') {
    renderProfile();
    return;
  }

  navigate('/');
}

renderRoute();
