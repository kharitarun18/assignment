import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getStoredUser } from '../services/storage'

function ProjectModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: initial?.name || '', description: initial?.description || '', member_ids: initial?.members?.map(m => m.id) || [] })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/users').then(res => setUsers(res.data)).catch(() => {})
  }, [])

  function toggleMember(id) {
    setForm(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(id) ? prev.member_ids.filter(x => x !== id) : [...prev.member_ids, id]
    }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initial ? 'Edit Project' : 'New Project'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Website Redesign" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What is this project about?" style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Team Members</label>
              <div className="checkbox-group">
                {users.map(u => (
                  <label key={u.id} className="checkbox-item">
                    <input type="checkbox" checked={form.member_ids.includes(u.id)} onChange={() => toggleMember(u.id)} />
                    <span>{u.name}</span>
                    <span style={{ color: 'var(--text-light)', fontSize: 12 }}>({u.role})</span>
                  </label>
                ))}
                {users.length === 0 && <span style={{ padding: '8px', color: 'var(--text-muted)', fontSize: 13 }}>No users available</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" /> Saving...</> : 'Save Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const user = getStoredUser()
  const navigate = useNavigate()
  const isAdmin = user.role === 'admin'

  async function load() {
    try {
      const res = await api.get('/api/projects/')
      setProjects(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function saveProject(form) {
    if (modal?.project) {
      await api.put(`/api/projects/${modal.project.id}`, form)
    } else {
      await api.post('/api/projects/', form)
    }
    load()
  }

  async function deleteProject(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this project and all its tasks?')) return
    try {
      await api.delete(`/api/projects/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      alert('Failed to delete project')
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Projects</span>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>+ New Project</button>}
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
          </div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setModal({})}>+ New Project</button>}
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner spinner-dark" /></div>
        ) : projects.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
              <p style={{ fontWeight: 500 }}>No projects yet</p>
              {isAdmin && <p style={{ fontSize: 13 }}>Create your first project to get started</p>}
            </div>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
                <div className="project-name">{project.name}</div>
                <div className="project-desc">{project.description || 'No description provided'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="member-chips">
                    {project.members.slice(0, 3).map(m => (
                      <span key={m.id} className="member-chip">{m.name.split(' ')[0]}</span>
                    ))}
                    {project.members.length > 3 && (
                      <span className="member-chip">+{project.members.length - 3}</span>
                    )}
                    {project.members.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-light)' }}>No members</span>}
                  </div>
                  {isAdmin && (
                    <div className="actions-cell" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setModal({ project }) }}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={e => deleteProject(project.id, e)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <ProjectModal
          onClose={() => setModal(null)}
          onSave={saveProject}
          initial={modal.project}
        />
      )}
    </>
  )
}
