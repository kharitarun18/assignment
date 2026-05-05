import { useEffect, useState } from 'react'
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

function TaskModal({ onClose, onSave, initial, projects, users }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    status: initial?.status || 'Pending',
    deadline: toInputDate(initial?.deadline),
    assignee_id: initial?.assignee_id || '',
    project_id: initial?.project_id || (projects[0]?.id || '')
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Task title is required'); return }
    if (!form.project_id) { setError('Please select a project'); return }
    setLoading(true)
    const payload = { ...form, assignee_id: form.assignee_id || null, deadline: form.deadline || null, project_id: parseInt(form.project_id) }
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
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select className="form-input filter-select" value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} style={{ width: '100%' }}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filters, setFilters] = useState({ status: '', assignee_id: '', project_id: '' })
  const user = getStoredUser()
  const isAdmin = user.role === 'admin'

  async function load() {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.assignee_id) params.assignee_id = filters.assignee_id
    if (filters.project_id) params.project_id = filters.project_id
    try {
      const [tasksRes, projRes, usersRes] = await Promise.all([
        api.get('/api/tasks/', { params }),
        api.get('/api/projects/'),
        api.get('/api/users')
      ])
      setTasks(tasksRes.data)
      setProjects(projRes.data)
      setUsers(usersRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

  async function saveTask(form) {
    if (modal?.task) {
      await api.put(`/api/tasks/${modal.task.id}`, form)
    } else {
      await api.post('/api/tasks/', form)
    }
    load()
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    await api.delete(`/api/tasks/${id}`)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function updateStatus(taskId, status) {
    await api.put(`/api/tasks/${taskId}`, { status })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
  }

  function cardClass(task) {
    const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed'
    if (overdue) return 'task-card overdue'
    if (task.status === 'Completed') return 'task-card completed'
    if (task.status === 'In Progress') return 'task-card in-progress'
    return 'task-card'
  }

  function statusBadge(status, deadline) {
    const isOverdue = deadline && new Date(deadline) < new Date() && status !== 'Completed'
    if (isOverdue) return <span className="badge badge-overdue">Overdue</span>
    if (status === 'Completed') return <span className="badge badge-completed">Completed</span>
    if (status === 'In Progress') return <span className="badge badge-progress">In Progress</span>
    return <span className="badge badge-pending">Pending</span>
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Tasks</span>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>+ New Task</button>}
      </div>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</p>
          </div>
          {isAdmin && <button className="btn btn-primary" onClick={() => setModal({})}>+ New Task</button>}
        </div>

        <div className="filter-bar">
          <select className="filter-select" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
          {isAdmin && (
            <>
              <select className="filter-select" value={filters.assignee_id} onChange={e => setFilters(p => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">All Members</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <select className="filter-select" value={filters.project_id} onChange={e => setFilters(p => ({ ...p, project_id: e.target.value }))}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )}
          {(filters.status || filters.assignee_id || filters.project_id) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', assignee_id: '', project_id: '' })}>Clear filters</button>
          )}
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner spinner-dark" /></div>
        ) : tasks.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <p style={{ fontWeight: 500 }}>No tasks found</p>
              <p style={{ fontSize: 13 }}>Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map(task => {
              const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed'
              return (
                <div key={task.id} className={cardClass(task)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, flex: 1, marginRight: 8 }}>{task.title}</div>
                    {statusBadge(task.status, task.deadline)}
                  </div>
                  {task.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                      {task.description.slice(0, 100)}{task.description.length > 100 ? '…' : ''}
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: overdue ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 12 }}>
                    {task.deadline ? (overdue ? '⚠ Overdue · ' : '📅 ') + formatDate(task.deadline) : 'No deadline'}
                  </div>
                  {task.assignee && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      👤 {task.assignee.name}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {!isAdmin && task.assignee_id === user.id && (
                      <select
                        className="filter-select"
                        value={task.status}
                        onChange={e => updateStatus(task.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px', flex: 1 }}
                      >
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    )}
                    {isAdmin && (
                      <>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setModal({ task })}>Edit</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteTask(task.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <TaskModal
          onClose={() => setModal(null)}
          onSave={saveTask}
          initial={modal.task}
          projects={projects}
          users={users}
        />
      )}
    </>
  )
}
