import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getStoredUser } from '../services/storage'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toInputDate(d) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 16)
}

function TaskModal({ onClose, onSave, initial, projectId, users }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    status: initial?.status || 'Pending',
    deadline: toInputDate(initial?.deadline),
    assignee_id: initial?.assignee_id || '',
    project_id: projectId
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Task title is required'); return }
    setLoading(true)
    const payload = { ...form, assignee_id: form.assignee_id || null, deadline: form.deadline || null }
    try {
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initial ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the task" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input filter-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%' }}>
                  <option>Pending</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Deadline</label>
                <input className="form-input" type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-input filter-select" value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))} style={{ width: '100%' }}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner" /> Saving...</> : 'Save Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const user = getStoredUser()
  const isAdmin = user.role === 'admin'

  async function load() {
    try {
      const [projRes, tasksRes, usersRes] = await Promise.all([
        api.get(`/api/projects/${id}`),
        api.get('/api/tasks/', { params: { project_id: id } }),
        api.get('/api/users')
      ])
      setProject(projRes.data)
      setTasks(tasksRes.data)
      setUsers(usersRes.data)
    } catch (e) {
      if (e.response?.status === 404 || e.response?.status === 403) navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function saveTask(form) {
    if (modal?.task) {
      await api.put(`/api/tasks/${modal.task.id}`, form)
    } else {
      await api.post('/api/tasks/', form)
    }
    load()
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return
    await api.delete(`/api/tasks/${taskId}`)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  async function updateStatus(taskId, status) {
    await api.put(`/api/tasks/${taskId}`, { status })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
  }

  function statusBadge(status, deadline) {
    const isOverdue = deadline && new Date(deadline) < new Date() && status !== 'Completed'
    if (isOverdue) return <span className="badge badge-overdue">Overdue</span>
    if (status === 'Completed') return <span className="badge badge-completed">Completed</span>
    if (status === 'In Progress') return <span className="badge badge-progress">In Progress</span>
    return <span className="badge badge-pending">Pending</span>
  }

  if (loading) return (
    <><div className="topbar"><span className="topbar-title">Project</span></div>
    <div className="page-content"><div className="page-loader"><span className="spinner spinner-dark" /></div></div></>
  )

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Back</button>
          <span className="topbar-title">{project?.name}</span>
        </div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>+ Add Task</button>}
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{project?.name}</h1>
            {project?.description && <p className="page-subtitle">{project.description}</p>}
          </div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Task</button>}
        </div>

        <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {project?.members.map(m => (
            <span key={m.id} className="member-chip">
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {m.name[0].toUpperCase()}
              </span>
              {m.name}
            </span>
          ))}
        </div>

        {tasks.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <p style={{ fontWeight: 500 }}>No tasks yet</p>
              {isAdmin && <p style={{ fontSize: 13 }}>Add the first task to this project</p>}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed'
                  return (
                    <tr key={task.id} style={overdue ? { background: '#fff5f5' } : {}}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                        {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}</div>}
                      </td>
                      <td>{statusBadge(task.status, task.deadline)}</td>
                      <td style={{ color: overdue ? 'var(--danger)' : 'inherit', fontWeight: overdue ? 500 : 400 }}>{formatDate(task.deadline)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{task.assignee?.name || '—'}</td>
                      <td>
                        <div className="actions-cell">
                          {!isAdmin && task.assignee_id === user.id && (
                            <select
                              className="filter-select"
                              value={task.status}
                              onChange={e => updateStatus(task.id, e.target.value)}
                              style={{ fontSize: 12, padding: '4px 8px' }}
                            >
                              <option>Pending</option>
                              <option>In Progress</option>
                              <option>Completed</option>
                            </select>
                          )}
                          {isAdmin && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => setModal({ task })}>Edit</button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteTask(task.id)}>Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <TaskModal
          onClose={() => setModal(null)}
          onSave={saveTask}
          initial={modal.task}
          projectId={parseInt(id)}
          users={users}
        />
      )}
    </>
  )
}
