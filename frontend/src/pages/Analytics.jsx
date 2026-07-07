import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, AppBar, Toolbar, Typography, Button,
  Card, CardContent, ToggleButton, ToggleButtonGroup,
  Tabs, Tab, CircularProgress, Alert,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useAuth, API } from '../context/AuthContext'


const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#06b6d4',
  '#ec4899', '#a855f7', '#84cc16', '#ef4444',
]
const GRID = '#2e2e2e'
const AXIS = '#888'

const RANGES = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
]

// The four breakdowns, merged into one tabbed card
const BREAKDOWNS = [
  { key: 'devices', label: 'Devices', type: 'pie', color: '#6366f1' },
  { key: 'browsers', label: 'Browsers', type: 'bar', color: '#22c55e' },
  { key: 'operatingSystems', label: 'OS', type: 'bar', color: '#f59e0b' },
  { key: 'topReferrers', label: 'Referrers', type: 'bar', color: '#06b6d4' },
]

const tooltipStyle = {
  contentStyle: {
    background: '#1a1a1a',
    border: `1px solid ${GRID}`,
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: '#aaa' },
  itemStyle: { color: '#eee' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
}

function fmtDate(d) {
 
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}



function StatCard({ label, value }) {
  return (
    <Card>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={600} sx={{ mt: 0.5 }}>
          {value.toLocaleString('en-US')}
        </Typography>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children, empty }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={600} mb={2}>{title}</Typography>
        {empty ? (
          <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.disabled">No data for this range</Typography>
          </Box>
        ) : children}
      </CardContent>
    </Card>
  )
}

// Renders one breakdown (devices as donut, the rest as horizontal bars)
function BreakdownChart({ config, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.disabled">No data for this range</Typography>
      </Box>
    )
  }

  if (config.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={rows} dataKey="count" nameKey="name"
            cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2}
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend iconType="circle" formatter={(v) => <span style={{ color: '#ccc', fontSize: 12 }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} stroke={AXIS} fontSize={12} />
        <YAxis type="category" dataKey="name" stroke={AXIS} fontSize={12} width={100} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="count" name="Clicks" fill={config.color} radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  )
}



export default function Analytics() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [range, setRange] = useState('7d')
  const [tab, setTab] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAnalytics = useCallback(async (r) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await API.get('/analytics/overview', { params: { range: r } })
      setData(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics(range)
  }, [range, fetchAnalytics])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const s = data?.summary
  const noClicks = !!data && s?.totalClicks === 0

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Navbar */}
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: `1px solid ${GRID}` }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography fontWeight={600} fontSize={15}>Smart Link Shortener</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" color="inherit" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Typography variant="body2" color="text.secondary">{user?.name}</Typography>
            <Button size="small" color="inherit" onClick={handleLogout}>Logout</Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>

        {/* Header + range filter */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" fontWeight={600}>Analytics</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={range}
            onChange={(_, v) => v && setRange(v)}
          >
            {RANGES.map((r) => (
              <ToggleButton key={r.value} value={r.value} sx={{ px: 2 }}>
                {r.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={30} />
          </Box>
        ) : !data ? null : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Stat cards */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
              <StatCard label="Total Clicks" value={s.totalClicks} />
              <StatCard label="Unique Visitors" value={s.uniqueVisitors} />
              <StatCard label="Total Links" value={s.totalLinks} />
              <StatCard label="Active Links" value={s.activeLinks} />
            </Box>

            {/* Clicks over time */}
            <ChartCard title="Clicks Over Time" empty={data.clicksOverTime.length === 0}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.clicksOverTime} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtDate} stroke={AXIS} fontSize={12} tickMargin={8} />
                  <YAxis allowDecimals={false} stroke={AXIS} fontSize={12} width={40} />
                  <Tooltip {...tooltipStyle} labelFormatter={fmtDate} />
                  <Area
                    type="monotone" dataKey="count" name="Clicks"
                    stroke="#6366f1" strokeWidth={2} fill="url(#clickGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Breakdown — devices / browsers / OS / referrers merged into one tabbed card */}
            <Card>
              <CardContent>
                <Tabs
                  value={tab}
                  onChange={(_, v) => setTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    mb: 2,
                    minHeight: 40,
                    borderBottom: `1px solid ${GRID}`,
                    '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 500 },
                  }}
                >
                  {BREAKDOWNS.map((b) => (
                    <Tab key={b.key} label={b.label} />
                  ))}
                </Tabs>
                <BreakdownChart config={BREAKDOWNS[tab]} rows={data[BREAKDOWNS[tab].key]} />
              </CardContent>
            </Card>

            {/* Top links */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Top Links</Typography>
                {data.topLinks.length === 0 ? (
                  <Typography variant="body2" color="text.disabled" sx={{ py: 2 }}>No links yet.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary' }}>Short Code</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>Destination</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary' }}>Clicks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.topLinks.map((l) => (
                        <TableRow key={l.shortCode}>
                          <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>/{l.shortCode}</TableCell>
                          <TableCell sx={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                            {l.longUrl}
                          </TableCell>
                          <TableCell align="right" fontWeight={600}>{l.clicks.toLocaleString('en-US')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {noClicks && (
              <Alert severity="info">
                No clicks recorded in this range yet. Share your short links, then check back here.
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
