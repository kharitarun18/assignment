import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelative(d) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function statusBadge(status, deadline) {
  const overdue = deadline && new Date(deadline) < new Date() && status !== 'Completed'
  if (overdue) return <span className="badge badge-overdue">Overdue</span>
  if (status === 'Completed') return <span className="badge badge-completed">Completed</span>
  if (status === 'In Progress') return <span className="badge badge-progress">In Progress</span>
  return <span className="badge badge-pending">Pending</span>
}

function StatCard({ label, value, accent }) {
  return (
    <div className="dash-stat-card" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="dash-stat-value" style={{ color: accent === '#6b7280' ? 'var(--text)' : accent }}>
        {value ?? '—'}
      </div>
      <div className="dash-stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const navigate = useNavigate()
  const isMember = user.role === 'member'

  useEffect(() => {
    async function load() {
      try {
        const calls = [
          api.get('/api/tasks/dashboard'),
          api.get('/api/tasks/')
        ]
        if (isMember) calls.push(api.get('/api/submissions/user'))
        const results = await Promise.all(calls)
        setStats(results[0].data)
        setTasks(results[1].data.slice(0, 8))
        if (isMember) setSubmissions(results[2].data.slice(0, 3))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Dashboard</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isMember && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/submissions')}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Project
            </button>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="page-content">
        <div className="dash-welcome">
          <div>
            <h1 className="dash-welcome-title">Good {getGreeting()}, {user.name?.split(' ')[0]}</h1>
            <p className="dash-welcome-sub">Here's what's happening in your workspace today.</p>
          </div>
          <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-member'}`} style={{ padding: '5px 14px', fontSize: 13 }}>
            {user.role}
          </span>
        </div>

        {loading ? (
          <div className="page-loader"><span className="spinner spinner-dark" /></div>
        ) : (
          <>
            <div className="dash-stats" style={{ marginBottom: 20 }}>
              <StatCard label="Total Tasks" value={stats?.total} accent="#6b7280" />
              <StatCard label="Completed" value={stats?.completed} accent="#16a34a" />
              <StatCard label="In Progress" value={stats?.in_progress} accent="#2563eb" />
              <StatCard label="Pending" value={stats?.pending} accent="#d97706" />
              <StatCard label="Overdue" value={stats?.overdue} accent="#dc2626" />
            </div>

            <div className="dash-layout">
              <div className="dash-section">
                <div className="section-header">
                  <span className="section-title">My Tasks</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')}>View all</button>
                </div>

                {tasks.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 24px' }}>
                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    <p style={{ fontWeight: 500 }}>No tasks assigned yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tasks.map(task => {
                      const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'Completed'
                      return (
                        <div key={task.id} className="dash-task-row" style={overdue ? { borderLeft: '3px solid var(--danger)', background: '#fff8f8' } : {}}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{task.title}</div>
                            {task.description && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            {statusBadge(task.status, task.deadline)}
                            <span style={{ fontSize: 12, color: overdue ? 'var(--danger)' : 'var(--text-light)', whiteSpace: 'nowrap' }}>
                              {formatDate(task.deadline)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {isMember && (
                <div className="dash-section">
                  <div className="section-header" style={{ marginBottom: 12 }}>
                    <span className="section-title">Recent Submissions</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/submissions')}>See all</button>
                  </div>
                  {submissions.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--surface2)', borderRadius: 'var(--radius)' }}>
                      No submissions yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {submissions.map(sub => (
                        <div key={sub.id} className="dash-submission-row">
                          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{sub.title}</div>
                          {sub.tech_stack && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub.tech_stack}</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 3 }}>{formatRelative(sub.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
