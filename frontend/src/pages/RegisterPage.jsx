import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, TextField,
  Button, Typography, Alert, Link,
} from '@mui/material'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirm) return setError('Please fill all fields.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError("Passwords don't match.")
    try {
      setLoading(true)
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={0.5}>Create Account</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Fill in the details to get started
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Full Name"
              value={name} onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }} size="small"
            />
            <TextField
              fullWidth label="Email" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }} size="small"
            />
            <TextField
              fullWidth label="Password" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }} size="small"
              helperText="Minimum 6 characters"
            />
            <TextField
              fullWidth label="Confirm Password" type="password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              sx={{ mb: 3 }} size="small"
            />
            <Button type="submit" variant="contained" fullWidth disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" mt={2} textAlign="center">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">Login</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
