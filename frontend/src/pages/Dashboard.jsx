import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, AppBar, Toolbar, Typography, Button,
  Card, CardContent, TextField, IconButton,
  Divider, Chip, Tooltip, CircularProgress, Alert,
} from '@mui/material'
import {
  ContentCopy, DeleteOutlined, CheckCircleOutlined, Cancel,
} from '@mui/icons-material'
import { useAuth, API } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [longUrl, setLongUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    fetchLinks()
  }, [])

  async function fetchLinks() {
    try {
      const { data } = await API.get('/links')
      setLinks(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!longUrl.trim()) return
    setError('')
    setCreating(true)
    try {
      const { data } = await API.post('/links', {
        longUrl,
        customAlias: alias.trim() || undefined,
      })
      setLinks((prev) => [data, ...prev])
      setLongUrl('')
      setAlias('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create link.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    try {
      await API.delete(`/links/${id}`)
      setLinks((prev) => prev.filter((l) => l._id !== id))
    } catch { /* ignore */ }
  }

  async function handleToggle(id) {
    try {
      const { data } = await API.patch(`/links/${id}/toggle`)
      setLinks((prev) => prev.map((l) => (l._id === id ? data : l)))
    } catch { /* ignore */ }
  }

  function copy(text, id) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const base = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/s/`

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Navbar */}
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid #2e2e2e' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography fontWeight={600} fontSize={15}>
            Smart Link Shortener
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" color="inherit" onClick={() => navigate('/analytics')}>
              Analytics
            </Button>
            <Typography variant="body2" color="text.secondary">
              {user?.name}
            </Typography>
            <Button size="small" color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ maxWidth: 700, mx: 'auto', p: 3 }}>

        {/* Create link card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              Shorten a URL
            </Typography>
            <Box component="form" onSubmit={handleCreate}>
              <TextField
                fullWidth
                label="Long URL"
                placeholder="https://example.com/very-long-url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Custom alias (optional)"
                placeholder="my-link"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                size="small"
                sx={{ mb: 2 }}
              />
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={creating || !longUrl.trim()}
              >
                {creating ? 'Shortening...' : 'Shorten'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Links list */}
        <Typography variant="subtitle1" fontWeight={600} mb={1.5}>
          Your Links ({links.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress size={28} />
          </Box>
        ) : links.length === 0 ? (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                No links yet. Shorten your first URL above.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {links.map((link) => (
              <Card key={link._id} sx={{ opacity: link.isActive ? 1 : 0.6 }}>
                <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>

                  {/* Short URL row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color="primary.main"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => copy(base + link.shortCode, link._id)}
                      >
                        {base}{link.shortCode}
                      </Typography>
                      <Chip
                        label={link.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={link.isActive ? 'success' : 'default'}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={copied === link._id ? 'Copied!' : 'Copy'}>
                        <IconButton size="small" onClick={() => copy(base + link.shortCode, link._id)}>
                          {copied === link._id
                            ? <CheckCircleOutlined fontSize="small" color="success" />
                            : <ContentCopy fontSize="small" />
                          }
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={link.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton size="small" onClick={() => handleToggle(link._id)}>
                          {link.isActive
                            ? <Cancel fontSize="small" />
                            : <CheckCircleOutlined fontSize="small" />
                          }
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(link._id)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Long URL + stats */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {link.longUrl}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    {link.clicks} clicks &bull; Created {new Date(link.createdAt).toLocaleDateString('en-IN')}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
