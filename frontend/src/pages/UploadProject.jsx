import { useEffect, useRef, useState } from 'react'
import api from '../services/api'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TechTag({ label }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      background: 'var(--primary-light)',
      color: 'var(--primary)',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 500,
      marginRight: 4,
      marginBottom: 4
    }}>
      {label.trim()}
    </span>
  )
}

function SubmissionCard({ sub, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="sub-card">
      <div className="sub-card-header">
        <div>
          <div className="sub-card-title">{sub.title}</div>
          <div className="sub-card-date">{formatDate(sub.created_at)}</div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--danger)', flexShrink: 0 }}
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </button>
      </div>

      {sub.description && (
        <p className="sub-card-desc">{sub.description}</p>
      )}

      {sub.tech_stack && (
        <div style={{ marginBottom: 12 }}>
          {sub.tech_stack.split(',').filter(t => t.trim()).map((t, i) => (
            <TechTag key={i} label={t} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {sub.link && (
          <a
            href={sub.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View Project
          </a>
        )}
        {sub.file_path && (
          <a
            href={`${API_BASE}/${sub.file_path}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Download File
          </a>
        )}
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ paddingTop: 24 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Delete this submission?</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => { onDelete(sub.id); setConfirmDelete(false) }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UploadProject() {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    title: '',
    description: '',
    link: '',
    tech_stack: '',
    submission_date: today
  })
  const [file, setFile] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef()

  async function loadSubmissions() {
    try {
      const res = await api.get('/api/submissions/user')
      setSubmissions(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => { loadSubmissions() }, [])

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleFileChange(e) {
    const chosen = e.target.files[0]
    if (!chosen) return
    const allowed = ['.zip', '.pdf', '.doc', '.docx', '.txt', '.rar']
    const ext = '.' + chosen.name.split('.').pop().toLowerCase()
    if (!allowed.includes(ext)) {
      setError('Only zip, pdf, doc, docx, txt, rar files are allowed')
      fileRef.current.value = ''
      return
    }
    setFile(chosen)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Project title is required'); return }
    if (!form.description.trim()) { setError('Description is required'); return }

    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('title', form.title.trim())
    formData.append('description', form.description.trim())
    if (form.link.trim()) formData.append('link', form.link.trim())
    if (form.tech_stack.trim()) formData.append('tech_stack', form.tech_stack.trim())
    if (file) formData.append('file', file)

    try {
      await api.post('/api/submissions/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSuccess('Project submitted successfully!')
      setForm({ title: '', description: '', link: '', tech_stack: '', submission_date: today })
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setShowForm(false)
      loadSubmissions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/submissions/${id}`)
      setSubmissions(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      setError('Failed to delete submission')
    }
  }

  return (
    <>
      <div className="topbar">
        <span className="topbar-title">Project Submissions</span>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setError(''); setSuccess('') }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload Project
        </button>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Submissions</h1>
            <p className="page-subtitle">{submissions.length} project{submissions.length !== 1 ? 's' : ''} submitted</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setError(''); setSuccess('') }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Project
          </button>
        </div>

        {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}

        {fetching ? (
          <div className="page-loader"><span className="spinner spinner-dark" /></div>
        ) : submissions.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p style={{ fontWeight: 500 }}>No submissions yet</p>
              <p style={{ fontSize: 13 }}>Upload your first project to get started</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowForm(true)}>
                Upload Project
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {submissions.map(sub => (
              <SubmissionCard key={sub.id} sub={sub} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">Upload a Project</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Project Title <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="form-input"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. E-commerce Website"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <textarea
                    className="form-input"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="What did you build? What problem does it solve?"
                    rows={4}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project Link</label>
                  <input
                    className="form-input"
                    name="link"
                    value={form.link}
                    onChange={handleChange}
                    placeholder="https://github.com/you/project or live URL"
                    type="url"
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>GitHub repo, live demo, or any public URL</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Technologies Used</label>
                  <input
                    className="form-input"
                    name="tech_stack"
                    value={form.tech_stack}
                    onChange={handleChange}
                    placeholder="React, FastAPI, PostgreSQL, Docker"
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>Separate with commas</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Submission Date</label>
                  <input
                    className="form-input"
                    name="submission_date"
                    value={form.submission_date}
                    onChange={handleChange}
                    type="date"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attach File <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 400 }}>(optional)</span></label>
                  <div className="file-upload-area" onClick={() => fileRef.current.click()}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".zip,.pdf,.doc,.docx,.txt,.rar"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    {file ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" fill="none" stroke="var(--success)" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{file.name}</span>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--danger)', padding: '2px 6px' }}
                          onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value = '' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <svg width="22" height="22" fill="none" stroke="var(--text-light)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 6 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to browse file</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>zip, pdf, doc, docx, txt, rar</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <><span className="spinner" /> Submitting...</> : 'Submit Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
