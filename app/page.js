'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  ArrowRight, Mic, Send, ShieldAlert, TrendingDown, TrendingUp,
  Volume2, VolumeX, Loader2, Target, AlertTriangle, CheckCircle2, Sparkles,
  Brain, Scale, LineChart, LogOut, Plus, Play, ChevronRight, Clock, Building2, ChevronDown,
  Wand2, FileText, Download, Pencil, History, ListChecks, BarChart3, PlayCircle, Check, X, ArrowLeft,
  Share2, Copy, GitCompare, User, Eye, Quote,
} from 'lucide-react'
import { LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const DIM_LABELS = {
  problem: 'Problem Severity', market: 'Market Attractiveness', founder: 'Founder Credibility',
  differentiation: 'Differentiation', defensibility: 'Defensibility', distribution: 'Distribution',
  economics: 'Unit Economics', scalability: 'Scalability', novelty: 'Novelty', feasibility: 'Feasibility',
}
const DIM_ORDER = ['problem', 'market', 'founder', 'differentiation', 'defensibility', 'distribution', 'economics', 'scalability', 'novelty', 'feasibility']

const VERDICT_COLOR = {
  'Strong Interest': 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  'Interest': 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
  'Conditional Interest': 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  'Needs More Evidence': 'text-amber-300 border-amber-500/30 bg-amber-500/10',
  'Pass': 'text-red-300 border-red-500/30 bg-red-500/10',
}
const SEV_COLOR = { P0: 'text-red-300 border-red-500/30 bg-red-500/10', P1: 'text-amber-300 border-amber-500/30 bg-amber-500/10', P2: 'text-sky-300 border-sky-500/30 bg-sky-500/10' }

const api = async (path, opts = {}) => {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed')
  return data
}

function FlowLines({ className = '', count = 16, opacity = 0.55 }) {
  return (
    <svg className={className} viewBox="0 0 600 400" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="flowg" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#a3e635" />
          <stop offset="45%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      {Array.from({ length: count }).map((_, i) => (
        <path
          key={i}
          d={`M -60 ${90 + i * 12} C 160 ${40 + i * 15}, 380 ${330 - i * 7}, 660 ${100 + i * 11}`}
          stroke="url(#flowg)"
          strokeWidth="1.1"
          opacity={Math.max(0.05, opacity - i * 0.03)}
        />
      ))}
    </svg>
  )
}

function Logo({ className = 'text-[17px]' }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="w-6 h-6 rounded-[7px] brand-gradient grid place-items-center">
        <Play className="w-3 h-3 text-black" fill="currentColor" />
      </div>
      <span className={`font-semibold tracking-tight ${className}`}>echoclash</span>
    </div>
  )
}

function SectionTitle({ eyebrow, title, sub, center }) {
  return (
    <div className={center ? 'text-center max-w-2xl mx-auto' : 'section-bar'}>
      {eyebrow && <div className="text-sm font-medium text-brand mb-2">{eyebrow}</div>}
      <h2 className="text-3xl md:text-[40px] font-semibold tracking-tight leading-tight text-foreground">{title}</h2>
      {sub && <p className="text-muted-foreground mt-3 text-lg">{sub}</p>}
    </div>
  )
}

function avgConfidence(dims) {
  if (!dims) return 50
  const vals = DIM_ORDER.map((k) => dims[k] ?? 5)
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10)
}

// ================================================================== APP
export default function App() {
  const [route, setRoute] = useState({ name: 'landing', params: {} })
  const [user, setUser] = useState(null)
  const [booted, setBooted] = useState(false)

  const go = useCallback((name, params = {}) => { setRoute({ name, params }); window.scrollTo(0, 0) }, [])

  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem('ec_user') || 'null'); if (u) setUser(u) } catch (e) {}
    setBooted(true)
  }, [])

  const login = (u) => { localStorage.setItem('ec_user', JSON.stringify(u)); setUser(u); go('dashboard') }
  const logout = () => { localStorage.removeItem('ec_user'); setUser(null); go('landing') }

  const enterDemo = async () => {
    try {
      const u = user || await api('/auth/login', { method: 'POST', body: { email: 'test@example.com', password: 'password123' } })
      localStorage.setItem('ec_user', JSON.stringify(u)); setUser(u)
      const d = await api('/demo/seed', { method: 'POST', body: { user_id: u.id } })
      go('demo-pitch', { sessionId: d.session_ids[0], startupId: d.startup.id })
    } catch (e) { toast.error('Could not start demo') }
  }

  if (!booted) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>

  const guarded = ['dashboard', 'startup-new', 'panels', 'pitch', 'debrief', 'rewrite', 'editor', 'studio', 'demo-pitch']
  if (guarded.includes(route.name) && !user) return <LoginView onLogin={login} go={go} />

  return (
    <>
      <Toaster theme="dark" position="top-center" richColors />
      {route.name === 'landing' && <LandingView go={go} enterDemo={enterDemo} />}
      {route.name === 'login' && <LoginView onLogin={login} go={go} />}
      {route.name === 'dashboard' && <DashboardView user={user} go={go} logout={logout} enterDemo={enterDemo} />}
      {route.name === 'startup-new' && <StartupNewView user={user} go={go} />}
      {route.name === 'panels' && <PanelsView user={user} go={go} startup={route.params.startup} />}
      {route.name === 'pitch' && <PitchRoomView user={user} go={go} sessionId={route.params.sessionId} />}
      {route.name === 'debrief' && <DebriefView user={user} go={go} sessionId={route.params.sessionId} />}
      {route.name === 'rewrite' && <RewriteView user={user} go={go} sessionId={route.params.sessionId} />}
      {route.name === 'editor' && <EditorView user={user} go={go} versionId={route.params.versionId} />}
      {route.name === 'studio' && <StudioView user={user} go={go} startupId={route.params.startupId} />}
      {route.name === 'demo-pitch' && <DemoPitchView user={user} go={go} sessionId={route.params.sessionId} />}
    </>
  )
}

// ================================================================== LANDING
function LandingView({ go, enterDemo }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-[68px]">
          <Logo />
          <div className="hidden md:flex items-center gap-7 text-[15px] text-muted-foreground">
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1 hover:text-foreground">Product <ChevronDown className="w-3.5 h-3.5" /></button>
            <button onClick={() => document.getElementById('panels')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1 hover:text-foreground">Panels <ChevronDown className="w-3.5 h-3.5" /></button>
            <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground">How it works</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => go('login')} className="text-[15px] text-muted-foreground hover:text-foreground hidden sm:block">Sign in</button>
            <Button size="sm" onClick={() => go('login')} className="rounded-lg h-9">Stress test my pitch</Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <FlowLines className="absolute right-0 top-0 w-[70%] h-full opacity-90 pointer-events-none" />
        <div className="container relative py-20 md:py-28 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 text-[13px] mb-7">
              <span className="rounded-full bg-brand text-black px-2 py-0.5 text-[11px] font-medium">New</span>
              <span className="text-muted-foreground">AI Investment Committee</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <h1 className="text-5xl md:text-[64px] font-semibold tracking-[-0.02em] leading-[1.02] text-foreground">
              The AI investment committee<br />founders build on
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-xl leading-relaxed">
              Pitch live. Get challenged. Find exactly where your startup breaks — then fix it and pitch again.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => go('login')} className="rounded-lg h-12 px-6 text-[15px]">
                Get started <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-lg h-12 px-6 text-[15px] border-border bg-transparent hover:bg-secondary">
                See how it works
              </Button>
            </div>
            <button onClick={enterDemo} className="mt-5 inline-flex items-center gap-2 text-[14px] text-brand hover:underline">
              <PlayCircle className="w-4 h-4" /> Watch the FlowPay demo — zero typing
            </button>
            <p className="mt-7 text-[13px] text-muted-foreground/70">AI Simulation. Not affiliated with any real investor, firm or program.</p>
          </div>
          <div className="relative"><PitchPreview /></div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="container py-8 text-center">
          <p className="text-muted-foreground text-[15px]">The simulation layer between founders and the real capital market.</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container py-24">
        <SectionTitle eyebrow="How it works" title="One platform for your entire pitch journey." sub="Pitch, get challenged, diagnose, rewrite — a full loop that keeps working while you sleep." />
        <div className="grid md:grid-cols-5 gap-4 mt-14">
          {[
            { i: Play, t: 'Pitch', d: 'Present your startup live to the panel.' },
            { i: ShieldAlert, t: 'Challenge', d: 'Personas probe and catch contradictions.' },
            { i: Brain, t: 'Diagnose', d: 'Belief scores move in real time.' },
            { i: Target, t: 'Debrief', d: 'See exactly where you break, prioritized.' },
            { i: Sparkles, t: 'Rewrite', d: 'Fix the gaps and pitch again, stronger.' },
          ].map((s, idx) => (
            <div key={idx} className="surface rounded-2xl p-5">
              <div className="w-9 h-9 rounded-lg bg-secondary border border-border grid place-items-center mb-3"><s.i className="w-4 h-4 text-brand" /></div>
              <div className="text-xs text-muted-foreground/70">Step {idx + 1}</div>
              <div className="font-semibold mt-0.5 text-foreground">{s.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PANELS */}
      <section id="panels" className="bg-white/[0.02] border-y border-border">
        <div className="container py-24">
          <SectionTitle eyebrow="The panel" title="Three rooms. Nine investors. Every one different." sub="Each persona is a full decision system — its own lens, thresholds and distrusts. Same pitch, different verdicts." />
          <div className="grid md:grid-cols-3 gap-5 mt-14">
            {[
              { n: 'Commercial Panel', t: 'Shark Tank-style', d: 'Revenue, margins, willingness to pay.', diff: 'Medium' },
              { n: 'VC Investment Committee', t: 'Venture scale', d: 'Market size, CAC/LTV truth, defensibility.', diff: 'Hard' },
              { n: 'Founder / Operator Panel', t: 'Builders', d: 'Product depth, distribution, founder-market-fit.', diff: 'Medium-Hard' },
            ].map((p, i) => (
              <div key={i} className="relative surface rounded-2xl p-6 overflow-hidden">
                <FlowLines className="absolute -right-10 -top-10 w-48 h-40 opacity-70" count={10} />
                <div className="relative">
                  <Badge variant="outline" className="mb-3 bg-secondary border-border text-muted-foreground">{p.diff}</Badge>
                  <div className="text-xs text-muted-foreground/70">{p.t}</div>
                  <div className="text-xl font-semibold mt-1 text-foreground">{p.n}</div>
                  <div className="text-sm text-muted-foreground mt-2">{p.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <div className="relative rounded-3xl border border-border surface p-14 text-center overflow-hidden">
          <FlowLines className="absolute inset-0 w-full h-full opacity-60" count={20} />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">Find where your startup breaks.</h2>
            <p className="text-muted-foreground mt-4 text-lg">Before a real investor does.</p>
            <Button size="lg" onClick={() => go('login')} className="mt-8 rounded-lg h-12 px-7 text-[15px]">
              Stress test my pitch <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-[13px] text-muted-foreground/70">AI Simulation. Not affiliated with any real investor, firm or program.</p>
        </div>
      </footer>
    </div>
  )
}

function PitchPreview() {
  const steps = [
    { label: 'Founder claims', text: '"Our CAC is ₹200 and we have 50 paying customers."', tone: 'neutral' },
    { label: 'Contradiction detected', text: 'Earlier: "spent ₹20,000 on acquisition." → ₹20,000 / 50 = ₹400 CAC.', tone: 'danger' },
    { label: 'Belief score drops', text: 'Unit Economics 7 → 4', tone: 'drop' },
    { label: 'Panel verdict', text: 'Needs More Evidence · Score 61', tone: 'warn' },
  ]
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((p) => (p + 1) % steps.length), 2200); return () => clearInterval(t) }, [])
  return (
    <div className="relative rounded-2xl border border-border bg-card shadow-2xl p-6">
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
        <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
        <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
        <span className="ml-2 text-xs text-muted-foreground">live pitch simulation</span>
      </div>
      <div className="space-y-2.5 min-h-[210px] pt-4">
        {steps.map((s, idx) => (
          <AnimatePresence key={idx}>
            {idx <= i && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-start gap-3 p-3 rounded-xl border ${s.tone === 'danger' ? 'border-red-500/40 bg-red-500/10' : s.tone === 'drop' ? 'border-red-500/20 bg-secondary' : s.tone === 'warn' ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-secondary'}`}>
                <div className="mt-0.5">
                  {s.tone === 'danger' ? <ShieldAlert className="w-4 h-4 text-red-400" /> : s.tone === 'drop' ? <TrendingDown className="w-4 h-4 text-red-400" /> : s.tone === 'warn' ? <Scale className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-brand" />}
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                  <div className="text-sm mt-0.5 text-foreground">{s.text}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  )
}

// ================================================================== LOGIN
function LoginView({ onLogin, go }) {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try { const u = await api('/auth/login', { method: 'POST', body: { email, password } }); toast.success('Welcome, Founder.'); onLogin(u) }
    catch (err) { toast.error(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background relative overflow-hidden px-4">
      <FlowLines className="absolute inset-0 w-full h-full opacity-40" count={22} />
      <div className="absolute top-6 left-6"><button onClick={() => go('landing')}><Logo /></button></div>
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Enter EchoClash</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to stress test your pitch.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label className="text-foreground">Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-secondary border-border" /></div>
          <div><Label className="text-foreground">Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-secondary border-border" /></div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}</Button>
        </form>
        <div className="mt-4 text-xs text-muted-foreground bg-secondary border border-border rounded-lg p-3">
          Demo access is pre-filled — just click <span className="text-foreground font-medium">Sign in</span>.
        </div>
      </div>
    </div>
  )
}

// ================================================================== SHELL
function Shell({ children, go, logout }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => go('dashboard')}><Logo /></button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => go('dashboard')} className="text-muted-foreground">Dashboard</Button>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>
      <div className="container py-8">{children}</div>
    </div>
  )
}

// ================================================================== DASHBOARD
function DashboardView({ user, go, logout, enterDemo }) {
  const [startups, setStartups] = useState(null)
  const [sessions, setSessions] = useState({})

  useEffect(() => {
    api('/startups?user_id=' + user.id).then(async (rows) => {
      setStartups(rows)
      const map = {}
      for (const s of rows) { try { map[s.id] = await api('/sessions?startup_id=' + s.id) } catch (e) { map[s.id] = [] } }
      setSessions(map)
    }).catch(() => setStartups([]))
  }, [user.id])

  return (
    <Shell go={go} logout={logout}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Founder Studio</h1>
          <p className="text-muted-foreground mt-1">Your startups and their pitch trajectory.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={enterDemo} className="rounded-lg border-border bg-transparent"><PlayCircle className="w-4 h-4 mr-1" /> Watch demo</Button>
          <Button onClick={() => go('startup-new')} className="rounded-lg"><Plus className="w-4 h-4 mr-1" /> New startup</Button>
        </div>
      </div>

      {startups === null && <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>}

      {startups && startups.length === 0 && (
        <div className="relative surface rounded-2xl p-14 text-center overflow-hidden">
          <FlowLines className="absolute inset-0 w-full h-full opacity-50" count={18} />
          <div className="relative">
            <Building2 className="w-10 h-10 text-brand mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground">Create your first startup to begin</h3>
            <p className="text-muted-foreground mt-2">Set up your startup, pick a panel, and pitch live.</p>
            <Button onClick={() => go('startup-new')} className="mt-6 rounded-lg">Get started <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {(startups || []).map((s) => {
          const sess = sessions[s.id] || []
          const withVerdict = sess.filter((x) => x.status === 'ended')
          const latest = withVerdict[0]
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-6 hover:border-white/20 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground/70">{s.industry || 'Startup'} · {s.stage || 'Stage'}</div>
                  <h3 className="text-xl font-semibold mt-0.5 text-foreground">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.one_liner || s.problem}</p>
                </div>
                {latest?.verdict && <Badge variant="outline" className={VERDICT_COLOR[latest.verdict.verdict] || ''}>{latest.verdict.verdict}</Badge>}
              </div>
              <div className="flex items-center gap-8 mt-4">
                <div><div className="text-2xl font-semibold text-foreground">{latest?.verdict?.final_score ?? '—'}</div><div className="text-xs text-muted-foreground/70">Readiness</div></div>
                <div><div className="text-2xl font-semibold text-foreground">{sess.length}</div><div className="text-xs text-muted-foreground/70">Sessions</div></div>
              </div>
              <div className="flex gap-2 mt-5">
                <Button size="sm" onClick={() => go('panels', { startup: s })} className="rounded-lg">{sess.length ? 'Re-pitch' : 'Pitch now'} <ArrowRight className="w-4 h-4 ml-1" /></Button>
                <Button size="sm" variant="outline" onClick={() => go('studio', { startupId: s.id })} className="rounded-lg border-border">Studio</Button>
                {latest && <Button size="sm" variant="outline" onClick={() => go('debrief', { sessionId: latest.id })} className="rounded-lg border-border">Latest debrief</Button>}
              </div>
              {sess.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                  {sess.slice(0, 3).map((x) => (
                    <div key={x.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Round {x.round_number} · {x.turns} turns</span>
                      <span>{x.verdict ? x.verdict.verdict : (x.status === 'active' ? 'In progress' : '—')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Shell>
  )
}

// ================================================================== ONBOARDING
const STARTUP_SECTIONS = [
  { title: 'Identity', fields: [
    { k: 'name', l: 'Startup name', req: true }, { k: 'founder', l: 'Founder name', req: true },
    { k: 'industry', l: 'Industry', req: true }, { k: 'stage', l: 'Stage (Idea / Pre-seed / Seed / Series A)', req: true },
    { k: 'one_liner', l: 'One-liner', req: true, area: true },
  ]},
  { title: 'Problem & Customer', fields: [
    { k: 'problem', l: 'What problem do you solve?', req: true, area: true },
    { k: 'customer', l: 'Who is your customer?', area: true },
    { k: 'solution', l: 'Your solution', area: true },
  ]},
  { title: 'Business & Unit Economics', fields: [
    { k: 'business_model', l: 'Business model' }, { k: 'pricing', l: 'Pricing' }, { k: 'revenue', l: 'Revenue' },
    { k: 'customers', l: 'Customers (count)' }, { k: 'cac', l: 'CAC' }, { k: 'retention', l: 'Retention' },
  ]},
  { title: 'Market & Growth', fields: [
    { k: 'market_size', l: 'Market size / TAM' }, { k: 'competitors', l: 'Competitors' },
    { k: 'differentiation', l: 'Differentiation' }, { k: 'moat', l: 'Moat' },
    { k: 'gtm', l: 'Go-to-market' }, { k: 'traction', l: 'Traction' },
    { k: 'fundraising_status', l: 'Fundraising status' }, { k: 'evidence', l: 'Evidence you can cite', area: true },
  ]},
]

function StartupNewView({ user, go }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const section = STARTUP_SECTIONS[step]
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const canNext = section.fields.filter((f) => f.req).every((f) => (form[f.k] || '').trim())

  const save = async () => {
    setSaving(true)
    try { const startup = await api('/startups', { method: 'POST', body: { ...form, user_id: user.id } }); toast.success('Startup saved.'); go('panels', { startup }) }
    catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          {STARTUP_SECTIONS.map((s, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-secondary'}`} />)}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">Step {step + 1} of {STARTUP_SECTIONS.length}. Required fields marked; others are optional.</p>

        <div className="rounded-2xl border border-border bg-card p-6 mt-6 space-y-4">
          {section.fields.map((f) => (
            <div key={f.k}>
              <Label className="flex items-center gap-2 text-foreground">{f.l} {f.req ? <span className="text-red-400">*</span> : <span className="text-[10px] text-muted-foreground border border-border rounded px-1">optional</span>}</Label>
              {f.area
                ? <Textarea value={form[f.k] || ''} onChange={(e) => set(f.k, e.target.value)} className="mt-1.5 bg-secondary border-border" rows={3} />
                : <Input value={form[f.k] || ''} onChange={(e) => set(f.k, e.target.value)} className="mt-1.5 bg-secondary border-border" />}
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" className="rounded-lg border-border bg-transparent" onClick={() => step === 0 ? go('dashboard') : setStep(step - 1)}>Back</Button>
          {step < STARTUP_SECTIONS.length - 1
            ? <Button disabled={!canNext} onClick={() => setStep(step + 1)} className="rounded-lg">Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
            : <Button disabled={!canNext || saving} onClick={save} className="rounded-lg">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Choose panel <ArrowRight className="w-4 h-4 ml-1" /></>}</Button>}
        </div>
      </div>
    </Shell>
  )
}

// ================================================================== PANELS
function PanelsView({ user, go, startup }) {
  const [panels, setPanels] = useState(null)
  const [starting, setStarting] = useState(null)

  useEffect(() => { api('/panels').then((d) => setPanels(d.panels)).catch(() => setPanels([])) }, [])

  const start = async (panelId) => {
    setStarting(panelId)
    try { const session = await api('/sessions', { method: 'POST', body: { user_id: user.id, startup_id: startup.id, panel_id: panelId } }); go('pitch', { sessionId: session.id }) }
    catch (err) { toast.error(err.message); setStarting(null) }
  }

  return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Who do you want to pitch to?</h1>
        <p className="text-muted-foreground mt-2">Pitching <span className="text-foreground font-medium">{startup?.name}</span> · each room evaluates you differently.</p>
      </div>

      {!panels && <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>}

      <div className="grid lg:grid-cols-3 gap-5">
        {(panels || []).map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-6 flex flex-col hover:border-white/20 transition-colors">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-secondary border-border text-foreground">{p.difficulty}</Badge>
              <span className="text-xs text-muted-foreground/70">{p.tagline}</span>
            </div>
            <h3 className="text-xl font-semibold mt-3 text-foreground">{p.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">{p.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {p.focus.map((f) => <span key={f} className="text-[11px] bg-secondary border border-border rounded px-2 py-0.5 text-muted-foreground">{f}</span>)}
            </div>
            <div className="space-y-2 mt-5">
              {p.personas.map((pe) => (
                <div key={pe.id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary border border-border">
                  <img src={pe.avatar_url} alt={pe.name} className="w-9 h-9 rounded-full object-cover border border-border" />
                  <div className="min-w-0"><div className="text-sm font-medium truncate text-foreground">{pe.name}</div><div className="text-xs text-muted-foreground truncate">{pe.role}</div></div>
                </div>
              ))}
            </div>
            <Button onClick={() => start(p.id)} disabled={!!starting} className="mt-5 rounded-lg">
              {starting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Pitch this panel <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground/60 mt-8">AI Simulation. Not affiliated with any real investor, firm or program.</p>
    </Shell>
  )
}

// ================================================================== PITCH ROOM
const STATUS_MSGS = ['Analyzing your claims...', 'Cross-checking evidence...', 'Updating investor beliefs...', 'The panel is forming a response...']
// Distinct voice profiles per panel seat (index-based) for spoken persona replies
const VOICE_PROFILES = [
  { rate: 0.97, pitch: 0.82 },
  { rate: 1.07, pitch: 1.14 },
  { rate: 0.99, pitch: 1.0 },
]

function PitchRoomView({ user, go, sessionId }) {
  const [session, setSession] = useState(null)
  const [personas, setPersonas] = useState([])
  const [beliefs, setBeliefs] = useState({})
  const [beliefHistory, setBeliefHistory] = useState([])
  const [transcript, setTranscript] = useState([])
  const [phase, setPhase] = useState('idle') // idle | listening | processing | speaking
  const [interim, setInterim] = useState('')
  const [caption, setCaption] = useState(null)
  const [speaker, setSpeaker] = useState(null)
  const [ttsOn, setTtsOn] = useState(true)
  const [micSupported, setMicSupported] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const [dp, setDp] = useState(null)
  const [showT, setShowT] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [textVal, setTextVal] = useState('')
  const [timerMode, setTimerMode] = useState('off')
  const [remaining, setRemaining] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const voiceMapRef = useRef({})

  const recogRef = useRef(null); const finalRef = useRef(''); const interimRef = useRef('')
  const interruptedRef = useRef(false); const maxTimerRef = useRef(null); const sendingRef = useRef(false)
  const sendFnRef = useRef(() => {}); const ttsOnRef = useRef(true)
  useEffect(() => { ttsOnRef.current = ttsOn }, [ttsOn])

  useEffect(() => {
    api('/sessions/' + sessionId).then((s) => {
      setSession(s); setPersonas(s.panel_personas || []); setBeliefs(s.beliefs || {}); setBeliefHistory(s.belief_history || []); setTranscript(s.transcript || [])
      if (s.verdict) go('debrief', { sessionId })
    }).catch(() => { toast.error('Could not load session'); go('dashboard') })
  }, [sessionId])
  useEffect(() => { const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t) }, [])

  // assign each judge a distinct voice + pitch/rate
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis || personas.length === 0) return
    const profiles = [{ pitch: 0.8, rate: 0.98 }, { pitch: 1.2, rate: 1.07 }, { pitch: 1.0, rate: 0.9 }, { pitch: 0.9, rate: 1.0 }]
    const build = () => {
      const voices = window.speechSynthesis.getVoices() || []
      const en = voices.filter((v) => /en[-_]/i.test(v.lang))
      const pool = en.length ? en : voices
      const map = {}
      personas.forEach((p, i) => { map[p.id] = { voice: pool.length ? pool[i % pool.length] : null, ...profiles[i % profiles.length] } })
      voiceMapRef.current = map
    }
    build(); window.speechSynthesis.onvoiceschanged = build
    return () => { try { window.speechSynthesis.onvoiceschanged = null } catch (e) {} }
  }, [personas])

  // optional round countdown
  useEffect(() => {
    if (!timerActive) return
    if (remaining <= 0) { setTimerActive(false); toast('Time! The panel is wrapping up.'); endPitch(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [timerActive, remaining])

  const startTimer = (m) => {
    if (m === 'off') { setTimerMode('off'); setTimerActive(false); setRemaining(0) }
    else { setTimerMode(m); setRemaining(parseInt(m, 10)); setTimerActive(true) }
  }

  const speak = (text, personaId, onDone) => {
    if (ttsOnRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      const prof = voiceMapRef.current[personaId]
      if (prof) { if (prof.voice) u.voice = prof.voice; u.pitch = prof.pitch; u.rate = prof.rate }
      else { u.rate = 1.04; u.pitch = 0.96 }
      u.onend = onDone; u.onerror = onDone; window.speechSynthesis.speak(u)
    } else { setTimeout(onDone, Math.min(7000, 1400 + text.length * 32)) }
  }

  const finalize = async (interrupted) => {
    if (sendingRef.current) return
    const text = (finalRef.current || interimRef.current || '').trim()
    finalRef.current = ''; interimRef.current = ''; setInterim('')
    if (!text) { setPhase('idle'); return }
    sendingRef.current = true; setPhase('processing')
    setTranscript((t) => [...t, { id: 'f' + Date.now(), role: 'founder', content: text }])
    setCaption({ who: 'founder', text })
    try {
      const msg = interrupted ? text + ' [The founder is still mid-sentence — cut in and interrupt them.]' : text
      const res = await api('/pitch/turn', { method: 'POST', body: { session_id: sessionId, message: msg } })
      const pm = res.persona_message
      setBeliefs(res.beliefs); setBeliefHistory((h) => [...h, ...(res.belief_changes || [])]); setSpeaker(pm.persona_id)
      setTranscript((t) => [...t, pm])
      const avatar = pm.avatar_url || personas.find((p) => p.id === pm.persona_id)?.avatar_url
      setCaption({ who: 'persona', name: pm.personaName, role: pm.personaRole, avatar, text: pm.content, question: pm.question, contradictions: pm.contradictions, beliefChanges: pm.beliefChanges, interrupted })
      setPhase('speaking')
      speak(pm.content + (pm.question?.text ? '. ' + pm.question.text : ''), pm.persona_id, () => { setSpeaker(null); setPhase('idle') })
    } catch (e) { toast.error('The panel is experiencing a brief delay. Try again.'); setPhase('idle') }
    finally { sendingRef.current = false }
  }
  sendFnRef.current = finalize

  useEffect(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) { setMicSupported(false); setTextMode(true); return }
    const r = new SR(); r.continuous = false; r.interimResults = true; r.lang = 'en-IN'
    r.onresult = (e) => {
      let fin = '', intr = ''
      for (let i = 0; i < e.results.length; i++) { const tr = e.results[i][0].transcript; if (e.results[i].isFinal) fin += tr; else intr += tr }
      if (fin) finalRef.current += fin + ' '
      interimRef.current = intr; setInterim((finalRef.current + intr).trim())
      if ((finalRef.current + intr).trim().length > 240 && !interruptedRef.current) { interruptedRef.current = true; try { r.stop() } catch (er) {} }
    }
    r.onerror = () => {}
    r.onend = () => { if (maxTimerRef.current) clearTimeout(maxTimerRef.current); sendFnRef.current(interruptedRef.current) }
    recogRef.current = r
    return () => { try { r.abort() } catch (er) {} if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel() }
  }, [])

  const startListening = () => {
    if (!micSupported) { setTextMode(true); return }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    finalRef.current = ''; interimRef.current = ''; interruptedRef.current = false; setInterim(''); setCaption(null); setPhase('listening')
    try { recogRef.current.start() } catch (e) {}
    maxTimerRef.current = setTimeout(() => { interruptedRef.current = true; try { recogRef.current.stop() } catch (er) {} }, 16000)
  }
  const stopListening = () => { try { recogRef.current.stop() } catch (e) {} }
  const skipSpeaking = () => { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); setSpeaker(null); setPhase('idle') }
  const sendText = () => { const v = textVal.trim(); if (!v) return; finalRef.current = v; setTextVal(''); finalize(false) }

  const micClick = () => {
    if (phase === 'idle') startListening()
    else if (phase === 'listening') stopListening()
    else if (phase === 'speaking') skipSpeaking()
  }
  submitRef.current = submitTurn

  const endPitch = async () => {
    if (transcript.filter((m) => m.role === 'founder').length === 0) { toast.error('Give at least part of your pitch first.'); return }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setEnding(true)
    try { await api('/pitch/end', { method: 'POST', body: { session_id: sessionId } }); go('debrief', { sessionId }) }
    catch (e) { toast.error('Could not reach the panel. Try again.'); setEnding(false) }
  }

  if (!session) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  const isPitch = stage === 'pitch'
  let micTitle = 'Tap to start'
  let micHint = ''
  if (isPitch) {
    if (!micOn) { micTitle = 'Tap the mic and start pitching'; micHint = 'The panel listens without interrupting. Say "thank you" or tap "Done pitching" when finished (auto-ends at 3:00).' }
    else if (phase === 'listening') { micTitle = 'Pitching — speak freely'; micHint = 'Say "thank you" or tap "Done pitching" to move to questions.' }
    else if (phase === 'thinking') { micTitle = 'The panel is preparing its first question...' }
    else if (phase === 'speaking') { micTitle = 'A judge is speaking...' }
  } else {
    if (phase === 'listening') { micTitle = 'Answering — speak your answer'; micHint = 'Pause ~5 seconds when done, or tap "Submit answer".' }
    else if (phase === 'thinking') { micTitle = 'The panel is considering your answer...' }
    else if (phase === 'speaking') { micTitle = 'A judge is asking a question...' }
    else if (!micOn) { micTitle = 'Tap the mic to answer' }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <FlowLines className="absolute -top-20 right-0 w-[900px] h-[700px] opacity-[0.10] pointer-events-none" />
      {/* top bar */}
      <div className="bg-background/85 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4"><button onClick={() => go('dashboard')}><Logo className="text-[15px]" /></button><span className="text-sm text-muted-foreground hidden md:block">{session.panel_name}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {mmss}</span>
            {timerActive ? (
              <span className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md flex items-center gap-1 ${remaining <= 10 ? 'text-red-300 bg-red-500/15 animate-pulse' : remaining <= 30 ? 'text-amber-300 bg-amber-500/15' : 'text-emerald-300 bg-emerald-500/10'}`}>{String(Math.floor(remaining / 60))}:{String(remaining % 60).padStart(2, '0')}<button onClick={() => startTimer('off')} className="ml-1 opacity-60 hover:opacity-100">✕</button></span>
            ) : (
              <div className="hidden sm:flex items-center gap-1 border border-border rounded-md p-0.5">
                <span className="text-[10px] text-muted-foreground/70 px-1">Round</span>
                {['60', '90'].map((m) => <button key={m} onClick={() => startTimer(m)} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary">{m}s</button>)}
              </div>
            )}
            <Badge variant="outline" className="border-brand/40 text-brand bg-brand/10 text-[10px]">AI SIMULATION</Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setTtsOn((v) => !v)} title="Panel voice">{ttsOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}</Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowT((v) => !v)} title="Transcript"><FileText className={`w-4 h-4 ${showT ? 'text-brand' : ''}`} /></Button>
            <Button size="sm" variant="destructive" className="rounded-lg" onClick={endPitch} disabled={ending}>{ending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'End pitch'}</Button>
          </div>
        </div>
      </div>

      {/* personas stage */}
      <div className="container py-4 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          {personas.map((p) => {
            const conf = avgConfidence(beliefs[p.id]); const isSpeaking = speaker === p.id && phase === 'speaking'
            return (
              <div key={p.id} onClick={() => setDp(p)} className={`rounded-2xl p-3 bg-card border transition-all cursor-pointer hover:border-white/20 ${isSpeaking ? 'border-emerald-400/50 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]' : 'border-border'}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={p.avatar_url} alt={p.name} className="w-11 h-11 rounded-full object-cover border border-border" />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${isSpeaking ? 'bg-brand animate-pulse' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate text-foreground">{p.name}</div><div className="text-[11px] text-muted-foreground truncate">{p.role}</div></div>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
                </div>
                <div className="mt-2.5 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{isSpeaking ? 'speaking' : 'listening'}</span><motion.span key={conf} initial={{ scale: 1.3, color: '#34d399' }} animate={{ scale: 1, color: '#fafafa' }} className="text-sm font-bold tabular-nums">{conf}</motion.span></div>
                <Progress value={conf} className="h-1.5 mt-1" />
              </div>
            )
          })}
        </div>
      </div>

      <PersonaDialog persona={dp} beliefs={dp ? beliefs[dp.id] : null} history={beliefHistory} quotes={dp ? transcript.filter((m) => m.persona_id === dp.id).map((m) => m.content) : []} startupId={session.startup_id} open={!!dp} onOpenChange={(o) => !o && setDp(null)} />

      {/* caption stage */}
      <div className="flex-1 flex flex-col items-center justify-center container relative z-10 pb-40 pt-2">
        <div className="w-full max-w-3xl min-h-[220px] flex items-center justify-center text-center">
          {phase === 'processing' && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin text-brand" /><span className="text-sm">The panel is considering your words…</span></div>
          )}
          {phase === 'listening' && (
            <div className="w-full">
              <div className="flex items-center justify-center gap-1 h-10 mb-4">{[...Array(9)].map((_, i) => <motion.span key={i} className="w-1.5 rounded-full bg-brand" animate={{ height: [8, 26, 8] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }} />)}</div>
              <p className={`text-xl md:text-2xl leading-relaxed ${interim ? 'text-foreground' : 'text-muted-foreground/60'}`}>{interim || 'Listening… make your pitch.'}</p>
              <p className="text-xs text-muted-foreground/60 mt-4">Pause when you finish a point — the panel replies. Ramble too long and they <span className="text-amber-400">cut in</span>.</p>
            </div>
          )}
          {(phase === 'idle' || phase === 'speaking') && caption && caption.who === 'persona' && (
            <motion.div key={caption.text.slice(0, 12)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <div className="flex items-center justify-center gap-3 mb-4">
                {caption.avatar && <img src={caption.avatar} alt={caption.name} className="w-12 h-12 rounded-full object-cover border border-border" />}
                <div className="text-left"><div className="text-sm font-semibold text-foreground flex items-center gap-2">{caption.name}{caption.interrupted && <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[10px]">interjects</Badge>}</div><div className="text-[11px] text-muted-foreground">{caption.role}</div></div>
              </div>
              <p className="text-xl md:text-2xl leading-relaxed text-foreground/95 font-medium">{caption.text}</p>
              {caption.question?.text && <p className="text-lg text-brand mt-4 flex items-center justify-center gap-2"><Target className="w-4 h-4" /> {caption.question.text}</p>}
              <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
                {(caption.contradictions || []).map((c, i) => <span key={i} className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1 border border-red-500/40 text-red-300 bg-red-500/10"><ShieldAlert className="w-3 h-3" /> Contradiction · {c.severity}</span>)}
                {(caption.beliefChanges || []).map((b, i) => { const down = b.new < b.previous; return <span key={i} className={`inline-flex items-center gap-1 text-xs rounded-full px-3 py-1 border ${down ? 'border-red-500/30 text-red-300 bg-red-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>{down ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />} {DIM_LABELS[b.dimension] || b.dimension} {b.previous}→{b.new}</span> })}
              </div>
            </motion.div>
          )}
          {phase === 'idle' && (!caption || caption.who === 'founder') && (
            <div className="text-center">
              <Mic className="w-8 h-8 text-brand mx-auto mb-3" />
              <p className="text-xl text-foreground font-medium">{caption?.who === 'founder' ? 'Heard you.' : 'The floor is yours.'}</p>
              <p className="text-sm text-muted-foreground mt-1">Tap the mic and open your pitch. Speak naturally — like you're in the room.</p>
            </div>
          )}
        </div>
      </div>

      {/* mic dock */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent pt-10 pb-6">
        <div className="container flex flex-col items-center gap-3">
          {!textMode && (
            <>
              <button onClick={micClick} disabled={phase === 'processing'} className={`relative w-20 h-20 rounded-full grid place-items-center transition-all disabled:opacity-50 ${phase === 'listening' ? 'bg-brand text-white mic-pulse' : phase === 'speaking' ? 'bg-secondary text-foreground border border-border' : 'bg-brand text-white hover:scale-105'}`}>
                {phase === 'processing' ? <Loader2 className="w-7 h-7 animate-spin" /> : phase === 'listening' ? <span className="w-6 h-6 rounded-sm bg-white" /> : phase === 'speaking' ? <VolumeX className="w-7 h-7" /> : <Mic className="w-8 h-8" />}
              </button>
              <div className="text-xs text-muted-foreground h-4">{phase === 'idle' ? 'Tap to speak' : phase === 'listening' ? 'Tap to send to the panel' : phase === 'speaking' ? 'Tap to skip' : 'Processing…'}</div>
              {micSupported && <button onClick={() => setTextMode(true)} className="text-[11px] text-muted-foreground/60 hover:text-foreground underline">or type instead</button>}
            </>
          )}
          {textMode && (
            <div className="w-full max-w-2xl">
              {!micSupported && <div className="text-[11px] text-amber-400 mb-2 text-center">Voice isn't supported in this browser — type your pitch below.</div>}
              <div className="flex items-end gap-2">
                <Textarea value={textVal} onChange={(e) => setTextVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }} placeholder="Type what you'd say to the panel…" rows={2} className="bg-card border-border resize-none" disabled={phase === 'processing'} />
                <Button onClick={sendText} disabled={phase === 'processing' || !textVal.trim()} className="rounded-lg h-11">{phase === 'processing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
              </div>
              {micSupported && <button onClick={() => setTextMode(false)} className="text-[11px] text-muted-foreground/60 hover:text-foreground underline mt-2">back to voice</button>}
            </div>
          )}
        </div>
      </div>

      {/* transcript drawer */}
      <AnimatePresence>
        {showT && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.25 }} className="fixed top-14 right-0 bottom-0 w-full max-w-md bg-card border-l border-border z-40 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border"><span className="text-sm font-medium text-foreground">Live transcript</span><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowT(false)}><X className="w-4 h-4" /></Button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcript.length === 0 && <p className="text-sm text-muted-foreground">Your spoken pitch and the panel's replies will appear here as text.</p>}
              {transcript.map((m) => <MessageBubble key={m.id} m={m} personas={personas} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PitchCaption({ m, personas, speaking }) {
  if (m.role === 'founder') {
    return (
      <div className="flex flex-col items-start">
        <span className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">You</span>
        <p className="text-[17px] leading-relaxed text-neutral-800 max-w-2xl whitespace-pre-wrap">{m.content}</p>
      </div>
    )
  }
  const persona = personas.find((p) => p.id === m.persona_id)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border p-4 transition-all ${speaking ? 'border-emerald-300 bg-emerald-50/40 shadow-[0_0_0_3px_rgba(34,197,94,0.10)]' : 'border-neutral-200 bg-[#f7f8f4]'}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <img src={m.avatar_url || persona?.avatar_url} alt={m.personaName} className="w-8 h-8 rounded-full object-cover border border-neutral-200" />
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-semibold text-neutral-900 truncate">{m.personaName}</span>
          <span className="text-[11px] text-neutral-500 truncate">{m.personaRole}</span>
        </div>
        {speaking && <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-brand shrink-0"><Volume2 className="w-3 h-3" /> speaking</span>}
      </div>
      <p className="text-[17px] leading-relaxed text-neutral-800 whitespace-pre-wrap">{m.content}</p>
      {m.question?.text && (
        <div className="mt-3 pt-3 border-t border-neutral-200 text-[15px] text-neutral-900 flex gap-2">
          <Target className="w-4 h-4 shrink-0 mt-0.5 text-brand" /> {m.question.text}
        </div>
      )}
      {(m.contradictions || []).map((c, i) => (
        <div key={i} className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 flex gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div><div className="text-xs font-semibold text-red-700">Contradiction · {c.severity}</div><div className="text-xs text-red-600/80 mt-0.5">{c.explanation}</div></div>
        </div>
      ))}
      {(m.beliefChanges || []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {m.beliefChanges.map((b, i) => {
            const down = b.new < b.previous
            return (
              <span key={i} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${down ? 'border-red-200 text-red-700 bg-red-50' : 'border-emerald-200 text-emerald-700 bg-emerald-50'}`}>
                {down ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {DIM_LABELS[b.dimension] || b.dimension} {b.previous}→{b.new}
              </span>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function MessageBubble({ m, personas }) {
  if (m.role === 'founder') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5">
          <div className="text-[10px] opacity-60 mb-0.5">You</div>
          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
        </div>
      </div>
    )
  }
  const persona = personas.find((p) => p.id === m.persona_id)
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <img src={m.avatar_url || persona?.avatar_url} alt={m.personaName} className="w-9 h-9 rounded-full object-cover border border-border shrink-0 mt-1" />
      <div className="max-w-[85%] space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{m.personaName}</span>
          <span className="text-[11px] text-muted-foreground">{m.personaRole}</span>
        </div>
        <div className="rounded-2xl rounded-tl-md bg-card border border-border px-4 py-3">
          <div className="text-sm whitespace-pre-wrap text-foreground/90">{m.content}</div>
          {m.question?.text && (
            <div className="mt-2.5 pt-2.5 border-t border-border text-sm text-foreground flex gap-2">
              <Target className="w-4 h-4 shrink-0 mt-0.5 text-brand" /> {m.question.text}
            </div>
          )}
        </div>
        {(m.contradictions || []).map((c, i) => (
          <div key={i} className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 flex gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div><div className="text-xs font-semibold text-red-300">Contradiction · {c.severity}</div><div className="text-xs text-red-200/70 mt-0.5">{c.explanation}</div></div>
          </div>
        ))}
        {(m.beliefChanges || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {m.beliefChanges.map((b, i) => {
              const down = b.new < b.previous
              return (
                <span key={i} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${down ? 'border-red-500/30 text-red-300 bg-red-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>
                  {down ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {DIM_LABELS[b.dimension] || b.dimension} {b.previous}→{b.new}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ================================================================== DEBRIEF
function DebriefView({ user, go, sessionId }) {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('analysis')
  const [dp, setDp] = useState(null)

  const load = () => api('/sessions/' + sessionId).then(setSession).catch(() => toast.error('Could not load debrief'))
  useEffect(() => { load() }, [sessionId])

  const resolveGap = async (gapId) => {
    await api('/gaps/update', { method: 'POST', body: { session_id: sessionId, gap_id: gapId, status: 'RESOLVED' } })
    load(); toast.success('Gap marked resolved.')
  }

  if (!session) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
  const v = session.verdict
  if (!v) return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">This session hasn’t been deliberated yet.</p>
        <Button className="mt-4 rounded-lg" onClick={() => go('pitch', { sessionId })}>Resume pitch</Button>
      </div>
    </Shell>
  )

  const delta = v.previous_score != null ? v.final_score - v.previous_score : null
  const gaps = session.gaps || []
  const scByKey = {}; (session.scorecard || []).forEach((s) => { scByKey[s.dimension] = s })

  return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="text-center mb-6">
        <div className="text-xs uppercase tracking-widest text-brand font-medium">Pitch complete</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-1 text-foreground">Here’s where your startup breaks.</h1>
      </div>

      <div className="relative rounded-2xl border border-border surface p-6 mb-6 overflow-hidden">
        <FlowLines className="absolute right-0 top-0 w-1/2 h-full opacity-60" count={14} />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div>
              <div className="flex items-end gap-2">
                <motion.span initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-semibold text-foreground">{v.final_score}</motion.span>
                <span className="text-muted-foreground/70 mb-1">/ 100</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Pitch readiness{delta != null && <span className={delta >= 0 ? 'text-emerald-400 ml-2' : 'text-red-400 ml-2'}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta)} vs last</span>}</div>
            </div>
            <div className="h-12 w-px bg-border" />
            <div><div className="text-xs text-muted-foreground">Confidence</div><div className="text-2xl font-semibold text-foreground">{v.confidence}%</div></div>
          </div>
          <Badge variant="outline" className={`text-base px-4 py-1.5 ${VERDICT_COLOR[v.verdict] || ''}`}>{v.verdict}</Badge>
        </div>
        <div className="relative grid sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-foreground/90"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Strongest: <span className="font-medium">{DIM_LABELS[v.strongest_dimension] || v.strongest_dimension}</span></div>
          <div className="flex items-center gap-2 text-sm text-foreground/90"><AlertTriangle className="w-4 h-4 text-red-400" /> Weakest: <span className="font-medium">{DIM_LABELS[v.weakest_dimension] || v.weakest_dimension}</span></div>
        </div>
        <div className="relative flex flex-wrap gap-2 mt-5">
          <Button className="rounded-lg" onClick={() => go('rewrite', { sessionId })}><Wand2 className="w-4 h-4 mr-1" /> Rewrite with AI</Button>
          <Button variant="outline" className="rounded-lg border-border bg-transparent" onClick={() => shareVerdictCard(session.startup?.name, v)}><Share2 className="w-4 h-4 mr-1" /> Share card</Button>
          <Button variant="outline" className="rounded-lg border-border bg-transparent" onClick={() => go('panels', { startup: session.startup })}>Re-pitch <ArrowRight className="w-4 h-4 ml-1" /></Button>
          <Button variant="outline" className="rounded-lg border-border bg-transparent" onClick={() => go('studio', { startupId: session.startup_id })}>Enter Studio</Button>
          <Button variant="ghost" className="rounded-lg" onClick={() => go('dashboard')}>Back</Button>
        </div>
      </div>

      {(session.panel_personas || []).length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">The panel — tap to inspect:</span>
          {session.panel_personas.map((p) => (
            <button key={p.id} onClick={() => setDp(p)} className="flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-3 py-1 hover:border-white/20 transition-colors">
              <img src={p.avatar_url} alt={p.name} className="w-6 h-6 rounded-full object-cover" />
              <span className="text-xs text-foreground">{p.name}</span>
              <Eye className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
      <PersonaDialog persona={dp} beliefs={dp ? session.beliefs?.[dp.id] : null} history={session.belief_history} quotes={dp ? (session.transcript || []).filter((m) => m.persona_id === dp.id).map((m) => m.content) : []} startupId={session.startup_id} open={!!dp} onOpenChange={(o) => !o && setDp(null)} />

      <div className="flex gap-2 mb-4">
        {[['analysis', 'Gaps & Scorecard'], ['deliberation', 'Panel Deliberation'], ['transcript', 'Transcript']].map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} className={`rounded-lg ${tab === k ? '' : 'border-border bg-transparent'}`} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>

      {tab === 'analysis' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-foreground"><Target className="w-4 h-4 text-brand" /> Prioritized gaps</h3>
            {gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps recorded.</p>}
            {['P0', 'P1', 'P2'].map((sev) => gaps.filter((g) => g.severity === sev).map((g) => (
              <div key={g.id} className={`rounded-2xl border bg-card p-4 ${g.status === 'RESOLVED' ? 'border-emerald-500/30 opacity-70' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={SEV_COLOR[g.severity]}>{g.severity} · {g.category}</Badge>
                  {g.status === 'RESOLVED'
                    ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</span>
                    : <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => resolveGap(g.id)}>Mark resolved</Button>}
                </div>
                <p className="text-sm mt-2 text-foreground/90">{g.why_it_matters}</p>
                <div className="mt-2 text-xs text-muted-foreground"><span className="text-brand font-medium">Action:</span> {g.recommended_action}</div>
                {g.required_evidence && <div className="mt-1 text-xs text-muted-foreground"><span className="text-amber-400 font-medium">Evidence needed:</span> {g.required_evidence}</div>}
              </div>
            )))}
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-foreground"><LineChart className="w-4 h-4 text-brand" /> Scorecard</h3>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              {DIM_ORDER.map((k) => {
                const s = scByKey[k]; const score = s?.score ?? 0
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-sm text-foreground/90"><span>{DIM_LABELS[k]}</span><span className="font-semibold tabular-nums">{score}/10</span></div>
                    <Progress value={score * 10} className="h-1.5 mt-1" />
                    {s?.reason && <p className="text-[11px] text-muted-foreground mt-1">{s.reason}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'deliberation' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 text-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Consensus</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-4">{(v.consensus || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 text-foreground"><Scale className="w-4 h-4 text-amber-400" /> Where the panel disagreed</h3>
            <ul className="mt-3 space-y-2 text-sm">{(v.disagreements || []).map((d, i) => <li key={i} className="text-muted-foreground"><span className="font-medium text-foreground">{d.topic}:</span> {d.positions}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 text-foreground"><Sparkles className="w-4 h-4 text-brand" /> What would change their mind</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-4">{(v.investment_conditions || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold flex items-center gap-2 text-foreground"><AlertTriangle className="w-4 h-4 text-red-400" /> Critical unresolved questions</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-4">{(v.unresolved_questions || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        </div>
      )}

      {tab === 'transcript' && (
        <div className="space-y-4 max-w-3xl">
          {(session.transcript || []).map((m) => <MessageBubble key={m.id} m={m} personas={session.panel_personas || []} />)}
        </div>
      )}
    </Shell>
  )
}

// ================================================================== REWRITE
const PITCH_SECTION_LABELS = {
  opening: 'Opening', problem: 'Problem', customer: 'Customer', solution: 'Solution', market: 'Market',
  traction: 'Traction', business_model: 'Business Model', differentiation: 'Differentiation', moat: 'Moat',
  gtm: 'Go-To-Market', team: 'Team', ask: 'The Ask', closing: 'Closing',
}
const PITCH_SECTION_ORDER = ['opening', 'problem', 'customer', 'solution', 'market', 'traction', 'business_model', 'differentiation', 'moat', 'gtm', 'team', 'ask', 'closing']
const LENGTHS = [['60s', '60 sec'], ['90s', '90 sec'], ['2min', '2 min'], ['5min', '5 min']]

function RewriteView({ user, go, sessionId }) {
  const [session, setSession] = useState(null)
  const [selected, setSelected] = useState({})
  const [length, setLength] = useState('90s')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/sessions/' + sessionId).then((s) => {
      setSession(s)
      const pre = {}; (s.gaps || []).forEach((g) => { if (g.severity === 'P0') pre[g.id] = true })
      setSelected(pre)
    }).catch(() => { toast.error('Could not load session'); go('dashboard') })
  }, [sessionId])

  const generate = async () => {
    setBusy(true)
    try {
      const gap_ids = Object.keys(selected).filter((k) => selected[k])
      const v = await api('/rewrite', { method: 'POST', body: { session_id: sessionId, gap_ids, length } })
      toast.success('Rewrite ready.')
      go('editor', { versionId: v.id })
    } catch (e) { toast.error('Generating your rewrite failed. Try again.') } finally { setBusy(false) }
  }

  if (!session) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
  const gaps = session.gaps || []

  return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => go('debrief', { sessionId })} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Back to debrief</button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2"><Wand2 className="w-5 h-5 text-brand" /> Rewrite with AI</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick the gaps to address. The rewrite is evidence-honest — it never invents numbers and flags anything unproven.</p>

        <div className="rounded-2xl border border-border bg-card p-5 mt-6">
          <div className="text-sm font-medium text-foreground mb-3">Gaps to address</div>
          <div className="space-y-2">
            {gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps recorded — a general rewrite will be produced.</p>}
            {gaps.map((g) => (
              <label key={g.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary border border-border cursor-pointer">
                <input type="checkbox" checked={!!selected[g.id]} onChange={(e) => setSelected((s) => ({ ...s, [g.id]: e.target.checked }))} className="mt-1 accent-emerald-500" />
                <div>
                  <Badge variant="outline" className={SEV_COLOR[g.severity] + ' mb-1'}>{g.severity} · {g.category}</Badge>
                  <div className="text-sm text-foreground/90">{g.why_it_matters}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 mt-4">
          <div className="text-sm font-medium text-foreground mb-3">Pitch length</div>
          <div className="flex gap-2">
            {LENGTHS.map(([k, l]) => (
              <Button key={k} size="sm" variant={length === k ? 'default' : 'outline'} className={`rounded-lg ${length === k ? '' : 'border-border bg-transparent'}`} onClick={() => setLength(k)}>{l}</Button>
            ))}
          </div>
        </div>

        <Button onClick={generate} disabled={busy} className="w-full mt-6 h-11 rounded-lg">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating your rewrite...</> : <>Generate rewrite <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </div>
    </Shell>
  )
}

// ================================================================== EDITOR
function EditorView({ user, go, versionId }) {
  const [version, setVersion] = useState(null)
  const [sections, setSections] = useState({})
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api('/versions/' + versionId).then((v) => { setVersion(v); setSections(v.sections || {}); setTitle(v.title || '') }).catch(() => { toast.error('Could not load version'); go('dashboard') })
  }, [versionId])

  const save = async () => {
    setSaving(true)
    try { await api('/versions/' + versionId, { method: 'PUT', body: { sections, title } }); toast.success('Version saved.') }
    catch (e) { toast.error('Save failed') } finally { setSaving(false) }
  }

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const W = doc.internal.pageSize.getWidth(); const M = 48; let y = 60
      doc.setFontSize(20); doc.setTextColor(20); doc.text('EchoClash — Pitch Document', M, y); y += 22
      doc.setFontSize(12); doc.setTextColor(120); doc.text(title || 'Pitch', M, y); y += 24
      doc.setTextColor(40)
      PITCH_SECTION_ORDER.forEach((k) => {
        const body = (sections[k] || '').trim(); if (!body) return
        if (y > 760) { doc.addPage(); y = 60 }
        doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.text(PITCH_SECTION_LABELS[k], M, y); y += 16
        doc.setFontSize(11); doc.setFont(undefined, 'normal')
        const lines = doc.splitTextToSize(body, W - M * 2)
        lines.forEach((ln) => { if (y > 780) { doc.addPage(); y = 60 } doc.text(ln, M, y); y += 15 })
        y += 12
      })
      doc.setFontSize(9); doc.setTextColor(150); doc.text('Generated by EchoClash · AI Simulation', M, 812)
      download(doc.output('blob'), `${(title || 'pitch').replace(/\s+/g, '_')}.pdf`)
      api('/versions/' + versionId, { method: 'PUT', body: { sections, title } }).catch(() => {})
    } catch (e) { toast.error('PDF export failed') }
  }

  const exportDOCX = async () => {
    try {
      const docx = await import('docx')
      const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx
      const children = [
        new Paragraph({ text: 'EchoClash — Pitch Document', heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun({ text: title || 'Pitch', italics: true, color: '666666' })] }),
        new Paragraph({ text: '' }),
      ]
      PITCH_SECTION_ORDER.forEach((k) => {
        const body = (sections[k] || '').trim(); if (!body) return
        children.push(new Paragraph({ text: PITCH_SECTION_LABELS[k], heading: HeadingLevel.HEADING_2 }))
        children.push(new Paragraph({ children: [new TextRun(body)] }))
        children.push(new Paragraph({ text: '' }))
      })
      const doc = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(doc)
      download(blob, `${(title || 'pitch').replace(/\s+/g, '_')}.docx`)
    } catch (e) { toast.error('DOCX export failed') }
  }

  if (!version) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>

  return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => go('debrief', { sessionId: version.session_id })} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-lg border-border bg-transparent" onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save version'}</Button>
            <Button size="sm" variant="outline" className="rounded-lg border-border bg-transparent" onClick={exportPDF}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" className="rounded-lg border-border bg-transparent" onClick={exportDOCX}><Download className="w-4 h-4 mr-1" /> DOCX</Button>
          </div>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-semibold tracking-tight text-foreground outline-none border-b border-transparent focus:border-border pb-1" />
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground"><Pencil className="w-3 h-3" /> You are the final author — edit any section.</div>

        {version.flagged?.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mt-4">
            <div className="text-sm font-medium text-amber-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Verify before you pitch</div>
            <ul className="mt-2 space-y-1 text-xs text-amber-200/80 list-disc pl-4">{version.flagged.map((f, i) => <li key={i}>{f.text} — <span className="opacity-70">{f.reason}</span></li>)}</ul>
          </div>
        )}

        <div className="space-y-4 mt-6">
          {PITCH_SECTION_ORDER.map((k) => (
            <div key={k} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-xs uppercase tracking-wider text-brand font-medium mb-2">{PITCH_SECTION_LABELS[k]}</div>
              <Textarea value={sections[k] || ''} onChange={(e) => setSections((s) => ({ ...s, [k]: e.target.value }))} className="bg-secondary border-border resize-none" rows={Math.max(2, Math.ceil((sections[k] || '').length / 80))} />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

// ================================================================== STUDIO
function StudioView({ user, go, startupId }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overview')
  const [notes, setNotes] = useState([])
  useEffect(() => { setNotes(getNotes(startupId)) }, [startupId])
  const removeNote = (i) => { const n = notes.slice(); n.splice(i, 1); setNotes(n); saveNotes(startupId, n) }

  const load = useCallback(() => api('/studio?startup_id=' + startupId).then(setData).catch(() => toast.error('Could not load studio')), [startupId])
  useEffect(() => { load() }, [load])

  const toggleAction = async (g) => {
    const next = g.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED'
    await api('/gaps/update', { method: 'POST', body: { session_id: g.session_id, gap_id: g.id, status: next } })
    load()
  }

  if (!data) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
  const s = data.startup || {}
  const ended = data.sessions.filter((x) => x.verdict)
  const latest = ended[ended.length - 1]
  const openGaps = data.gaps.filter((g) => g.status !== 'RESOLVED')
  const p0 = openGaps.filter((g) => g.severity === 'P0')
  const chartData = data.score_history.map((h) => ({ round: 'R' + h.round, score: h.score }))
  const first = data.score_history[0]; const last = data.score_history[data.score_history.length - 1]

  const TABS = [['overview', 'Overview', Building2], ['history', 'Versions', History], ['claims', 'Claims', ListChecks], ['gaps', 'Gaps', Target], ['actions', 'Actions', Check], ['scores', 'Scores', BarChart3], ['compare', 'Compare', GitCompare]]

  return (
    <Shell go={go} logout={() => go('landing')}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-muted-foreground/70">{s.industry} · {s.stage} {s.is_demo && <span className="ml-2 text-brand">DEMO DATA</span>}</div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{s.name}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{s.one_liner}</p>
        </div>
        <Button onClick={() => go('panels', { startup: s })} className="rounded-lg">Re-pitch <ArrowRight className="w-4 h-4 ml-1" /></Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(([k, l, I]) => (
          <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} className={`rounded-lg ${tab === k ? '' : 'border-border bg-transparent'}`} onClick={() => setTab(k)}><I className="w-4 h-4 mr-1" /> {l}</Button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5"><div className="text-xs text-muted-foreground">Latest readiness</div><div className="text-3xl font-semibold text-foreground mt-1">{latest?.verdict?.final_score ?? '—'}</div>{latest?.verdict && <Badge variant="outline" className={'mt-2 ' + (VERDICT_COLOR[latest.verdict.verdict] || '')}>{latest.verdict.verdict}</Badge>}</div>
          <div className="rounded-2xl border border-border bg-card p-5"><div className="text-xs text-muted-foreground">Open critical gaps</div><div className="text-3xl font-semibold text-foreground mt-1">{p0.length}<span className="text-base text-muted-foreground"> P0</span></div><div className="text-xs text-muted-foreground mt-2">{openGaps.length} open in total</div></div>
          <div className="rounded-2xl border border-border bg-card p-5"><div className="text-xs text-muted-foreground">Pitch rounds</div><div className="text-3xl font-semibold text-foreground mt-1">{data.sessions.length}</div><div className="text-xs text-muted-foreground mt-2">{data.versions.length} saved rewrites</div></div>
          <div className="md:col-span-3 rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-medium text-foreground mb-3">Recent sessions</div>
            <div className="space-y-2">
              {data.sessions.slice().reverse().map((x) => (
                <button key={x.id} onClick={() => x.verdict ? go('debrief', { sessionId: x.id }) : go('pitch', { sessionId: x.id })} className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary border border-border hover:border-white/20 text-left">
                  <span className="text-sm text-foreground">Round {x.round_number} · {x.panel_name} {x.is_demo && <span className="text-brand text-xs ml-1">DEMO</span>}</span>
                  <span className="text-xs text-muted-foreground">{x.verdict ? `${x.verdict.verdict} · ${x.verdict.final_score}` : x.status}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-medium text-foreground mb-3 flex items-center gap-2"><Quote className="w-4 h-4 text-brand" /> Your notes {notes.length > 0 && <span className="text-xs text-muted-foreground">({notes.length})</span>}</div>
            {notes.length === 0 && <p className="text-sm text-muted-foreground">Open a persona (tap any investor in the pitch room or debrief) and save their sharpest lines here.</p>}
            <div className="space-y-2">
              {notes.map((n, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl bg-secondary border border-border p-3">
                  <div className="flex-1"><div className="text-[11px] text-brand mb-0.5">{n.persona}</div><p className="text-sm text-foreground/85 italic">“{n.text}”</p></div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeNote(i)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {data.versions.length === 0 && <p className="text-sm text-muted-foreground">No rewrites yet. Open a debrief and click "Rewrite with AI".</p>}
          {data.versions.map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
              <div><div className="text-sm font-medium text-foreground">{v.title}</div><div className="text-xs text-muted-foreground mt-0.5">{v.length} · {new Date(v.created_at).toLocaleString()}</div></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-lg border-border bg-transparent" onClick={() => go('editor', { versionId: v.id })}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'claims' && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="p-3 font-medium">Claim</th><th className="p-3 font-medium">Category</th><th className="p-3 font-medium">Evidence</th><th className="p-3 font-medium">Round</th></tr></thead>
            <tbody>
              {data.claims.length === 0 && <tr><td colSpan={4} className="p-4 text-muted-foreground">No claims captured yet.</td></tr>}
              {data.claims.map((c, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="p-3 text-foreground/90">{c.text}{c.numeric_value != null && <span className="text-muted-foreground"> ({c.numeric_value}{c.unit})</span>}</td>
                  <td className="p-3 text-muted-foreground">{c.category}</td>
                  <td className="p-3"><span className={`text-[11px] rounded-full px-2 py-0.5 border ${c.evidence_status === 'CONTRADICTED' ? 'border-red-500/30 text-red-300 bg-red-500/10' : c.evidence_status === 'SUPPORTED' ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>{c.evidence_status}</span></td>
                  <td className="p-3 text-muted-foreground">R{c.round}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'gaps' && (
        <div className="space-y-3">
          {data.gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps recorded yet.</p>}
          {['P0', 'P1', 'P2'].map((sev) => data.gaps.filter((g) => g.severity === sev).map((g, i) => (
            <div key={sev + i} className={`rounded-2xl border bg-card p-4 ${g.status === 'RESOLVED' ? 'border-emerald-500/30 opacity-70' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={SEV_COLOR[g.severity]}>{g.severity} · {g.category} · R{g.round}</Badge>
                {g.status === 'RESOLVED' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</span>}
              </div>
              <p className="text-sm mt-2 text-foreground/90">{g.why_it_matters}</p>
              <div className="mt-1 text-xs text-muted-foreground"><span className="text-brand font-medium">Action:</span> {g.recommended_action}</div>
            </div>
          )))}
        </div>
      )}

      {tab === 'scores' && (
        <div className="space-y-6">
          {data.score_history.length === 0 && <p className="text-sm text-muted-foreground">No scored sessions yet.</p>}
          {data.score_history.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground mb-4">Readiness trajectory</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={chartData} margin={{ left: -20, right: 10, top: 10 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="round" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#161618', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
                    <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {first && last && first.round !== last.round && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-medium text-foreground mb-3">Round {first.round} → Round {last.round} by dimension</div>
              <div className="space-y-2">
                {DIM_ORDER.map((k) => {
                  const a = first.dims[k] ?? 0; const b = last.dims[k] ?? 0; const d = b - a
                  return (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-foreground/90">{DIM_LABELS[k]}</span>
                      <span className="flex items-center gap-3 tabular-nums"><span className="text-muted-foreground">{a} → {b}</span>
                        <span className={`w-14 text-right ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{d > 0 ? '↑ +' + d : d < 0 ? '↓ ' + d : '—'}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'actions' && (() => {
        const total = data.gaps.length; const resolved = data.gaps.filter((g) => g.status === 'RESOLVED').length
        const pct = total ? Math.round((resolved / total) * 100) : 0
        const R = 34, C = 2 * Math.PI * R
        return (
        <div className="space-y-2">
          <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5 mb-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                <motion.circle cx="40" cy="40" r={R} fill="none" stroke="#22c55e" strokeWidth="7" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - (C * pct) / 100 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
              </svg>
              <div className="absolute inset-0 grid place-items-center"><span className="text-xl font-bold text-foreground tabular-nums">{pct}%</span></div>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Gaps closed across all rounds</div>
              <div className="text-2xl font-semibold text-foreground mt-0.5">{resolved}<span className="text-base text-muted-foreground"> / {total}</span></div>
              <div className="text-xs text-muted-foreground mt-1">Keep closing gaps to lift your readiness score.</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Every recommended action from every round, in one checklist. Tick them off as you fix them — this syncs with your gaps.</p>
          {data.gaps.length === 0 && <p className="text-sm text-muted-foreground">No actions yet. Complete a pitch to generate them.</p>}
          {data.gaps.map((g, i) => (
            <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${g.status === 'RESOLVED' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card hover:border-white/20'}`}>
              <input type="checkbox" checked={g.status === 'RESOLVED'} onChange={() => toggleAction(g)} className="mt-1 accent-emerald-500 w-4 h-4" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={SEV_COLOR[g.severity]}>{g.severity}</Badge>
                  <span className="text-xs text-muted-foreground">{g.category} · R{g.round}</span>
                </div>
                <div className={`text-sm mt-1 ${g.status === 'RESOLVED' ? 'line-through text-muted-foreground' : 'text-foreground/90'}`}>{g.recommended_action}</div>
                {g.required_evidence && g.status !== 'RESOLVED' && <div className="text-xs text-muted-foreground mt-0.5"><span className="text-amber-400">Evidence:</span> {g.required_evidence}</div>}
              </div>
            </label>
          ))}
        </div>
        )
      })()}

      {tab === 'compare' && <CompareRounds sessions={ended} />}
    </Shell>
  )
}

// ================================================================== COMPARE ROUNDS
function CompareRounds({ sessions }) {
  const ordered = [...sessions].sort((a, b) => a.round_number - b.round_number)
  const [aId, setAId] = useState(ordered[0]?.id)
  const [bId, setBId] = useState(ordered[ordered.length - 1]?.id)
  const [aDoc, setADoc] = useState(null)
  const [bDoc, setBDoc] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!aId || !bId) return
    setLoading(true)
    Promise.all([api('/sessions/' + aId), api('/sessions/' + bId)])
      .then(([a, b]) => { setADoc(a); setBDoc(b) })
      .catch(() => toast.error('Could not load rounds'))
      .finally(() => setLoading(false))
  }, [aId, bId])

  if (ordered.length < 2) return <p className="text-sm text-muted-foreground">You need at least two completed rounds to compare. Re-pitch this startup to unlock the side-by-side view.</p>

  const Col = ({ doc }) => {
    if (!doc) return <div className="grid place-items-center py-10"><Loader2 className="w-5 h-5 animate-spin text-brand" /></div>
    const v = doc.verdict
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <div><div className="text-sm font-semibold text-foreground">Round {doc.round_number}</div><div className="text-xs text-muted-foreground">{doc.panel_name}</div></div>
          {v && <div className="text-right"><div className="text-2xl font-bold text-foreground">{v.final_score}</div><Badge variant="outline" className={'text-[10px] ' + (VERDICT_COLOR[v.verdict] || '')}>{v.verdict}</Badge></div>}
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {(doc.transcript || []).map((m) => <MessageBubble key={m.id} m={m} personas={doc.panel_personas || []} />)}
        </div>
      </div>
    )
  }

  const scoreDelta = (aDoc?.verdict && bDoc?.verdict) ? bDoc.verdict.final_score - aDoc.verdict.final_score : null

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={aId} onChange={(e) => setAId(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground">
          {ordered.map((s) => <option key={s.id} value={s.id}>Round {s.round_number} · {s.verdict?.final_score ?? '—'}</option>)}
        </select>
        <ArrowLeftRightIcon />
        <select value={bId} onChange={(e) => setBId(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-foreground">
          {ordered.map((s) => <option key={s.id} value={s.id}>Round {s.round_number} · {s.verdict?.final_score ?? '—'}</option>)}
        </select>
        {scoreDelta != null && <span className={`text-sm font-medium ${scoreDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{scoreDelta >= 0 ? '↑ +' : '↓ '}{Math.abs(scoreDelta)} points</span>}
      </div>
      {aDoc?.scorecard?.length > 0 && bDoc?.scorecard?.length > 0 && (() => {
        const am = {}; aDoc.scorecard.forEach((s) => { am[s.dimension] = s.score })
        const bm = {}; bDoc.scorecard.forEach((s) => { bm[s.dimension] = s.score })
        return (
          <div className="rounded-2xl border border-border bg-card p-5 mb-4">
            <div className="text-sm font-medium text-foreground mb-3">Dimension-by-dimension diff · Round {aDoc.round_number} → Round {bDoc.round_number}</div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {DIM_ORDER.map((k) => {
                const a = am[k] ?? 0, b = bm[k] ?? 0, d = b - a
                return (
                  <div key={k} className="flex items-center gap-3 text-sm">
                    <span className="text-foreground/90 flex-1">{DIM_LABELS[k]}</span>
                    <div className="flex items-center gap-1 w-24">
                      <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-brand" style={{ width: (b * 10) + '%' }} /></div>
                    </div>
                    <span className="tabular-nums text-muted-foreground w-16 text-right">{a} → {b}</span>
                    <span className={`w-12 text-right tabular-nums ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>{d > 0 ? '+' + d : d < 0 ? d : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
      <div className="grid md:grid-cols-2 gap-4">
        <Col doc={aDoc} /><Col doc={bDoc} />
      </div>
    </div>
  )
}

function ArrowLeftRightIcon() { return <GitCompare className="w-4 h-4 text-muted-foreground" /> }
function DemoPitchView({ user, go, sessionId }) {
  const [session, setSession] = useState(null)
  const [visible, setVisible] = useState(0)
  const [beliefs, setBeliefs] = useState({})
  const [speaker, setSpeaker] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    api('/sessions/' + sessionId).then((s) => {
      setSession(s)
      const init = {}; (s.panel_personas || []).forEach((p) => { init[p.id] = {}; DIM_ORDER.forEach((k) => init[p.id][k] = 5) })
      setBeliefs(init)
    }).catch(() => { toast.error('Could not load demo'); go('dashboard') })
  }, [sessionId])

  useEffect(() => {
    if (!session) return
    const full = session.transcript || []
    if (visible >= full.length) return
    const t = setTimeout(() => {
      const msg = full[visible]
      if (msg.role === 'persona') {
        setSpeaker(msg.persona_id)
        if (msg.beliefChanges?.length) {
          setBeliefs((prev) => {
            const next = JSON.parse(JSON.stringify(prev))
            msg.beliefChanges.forEach((b) => { if (next[b.persona_id]) next[b.persona_id][b.dimension] = b.new })
            return next
          })
        }
        setTimeout(() => setSpeaker(null), 1400)
      }
      setVisible((v) => v + 1)
    }, visible === 0 ? 500 : 2600)
    return () => clearTimeout(t)
  }, [session, visible])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [visible])

  if (!session) return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
  const personas = session.panel_personas || []
  const full = session.transcript || []
  const done = visible >= full.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-background/85 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button onClick={() => go('dashboard')}><Logo className="text-[15px]" /></button>
            <span className="text-sm text-muted-foreground hidden md:block">{session.panel_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-brand/40 text-brand bg-brand/10 text-[10px]">DEMO · FlowPay</Badge>
            <Button size="sm" onClick={() => go('debrief', { sessionId })} className="rounded-lg">{done ? 'See the debrief' : 'Skip to debrief'} <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      </div>

      <div className="container py-4">
        <div className="grid grid-cols-3 gap-3">
          {personas.map((p) => {
            const conf = avgConfidence(beliefs[p.id]); const isSpeaking = speaker === p.id
            return (
              <div key={p.id} className={`rounded-2xl p-3 bg-card border transition-all ${isSpeaking ? 'border-emerald-400/50 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]' : 'border-border'}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={p.avatar_url} alt={p.name} className="w-11 h-11 rounded-full object-cover border border-border" />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${isSpeaking ? 'bg-brand animate-pulse' : 'bg-emerald-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold truncate text-foreground">{p.name}</div><div className="text-[11px] text-muted-foreground truncate">{p.role}</div></div>
                </div>
                <div className="mt-2.5 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{isSpeaking ? 'speaking' : 'listening'}</span><motion.span key={conf} initial={{ scale: 1.3, color: '#34d399' }} animate={{ scale: 1, color: '#fafafa' }} className="text-sm font-bold tabular-nums">{conf}</motion.span></div>
                <Progress value={conf} className="h-1.5 mt-1" />
              </div>
            )
          })}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto container pb-6">
        <div className="space-y-4 max-w-4xl mx-auto">
          {full.slice(0, visible).map((m) => <MessageBubble key={m.id} m={m} personas={personas} />)}
          {!done && <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin text-brand" /><span className="text-sm">The panel is deliberating...</span></div>}
          {done && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-brand mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">Pitch complete.</h3>
              <p className="text-muted-foreground mt-1 text-sm">Now see exactly where FlowPay breaks.</p>
              <Button className="mt-4 rounded-lg" onClick={() => go('debrief', { sessionId })}>Open the debrief <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ================================================================== PERSONA DEEP-DIVE
// notes stored client-side per startup
function getNotes(startupId) { try { return JSON.parse(localStorage.getItem('ec_notes_' + startupId) || '[]') } catch (e) { return [] } }
function saveNotes(startupId, arr) { try { localStorage.setItem('ec_notes_' + startupId, JSON.stringify(arr)) } catch (e) {} }

function PersonaDialog({ persona, beliefs, history, quotes, startupId, open, onOpenChange }) {
  if (!persona) return null
  const dims = beliefs || {}
  const moves = (history || []).filter((h) => h.persona_id === persona.id)
  const conf = avgConfidence(dims)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img src={persona.avatar_url} alt={persona.name} className="w-12 h-12 rounded-full object-cover border border-border" />
            <div><div className="text-base">{persona.name}</div><div className="text-xs text-muted-foreground font-normal">{persona.role}</div></div>
            <span className="ml-auto text-2xl font-bold tabular-nums">{conf}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl bg-secondary border border-border p-3">
            <div className="text-[11px] uppercase tracking-wider text-brand font-medium mb-1">Their lens</div>
            <div className="text-sm text-foreground/90">Primary: <span className="font-medium">{DIM_LABELS[persona.primary_lens] || persona.primary_lens}</span> — {persona.lens_desc}</div>
          </div>
          <div className="rounded-xl bg-red-500/10 border border-red-500/25 p-3">
            <div className="text-[11px] uppercase tracking-wider text-red-300 font-medium mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> What they distrust</div>
            <div className="text-sm text-red-100/80">{persona.distrusts}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Belief across dimensions</div>
            <div className="space-y-2">
              {DIM_ORDER.map((k) => (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs text-foreground/90"><span>{DIM_LABELS[k]}</span><span className="tabular-nums">{dims[k] ?? 5}/10</span></div>
                  <Progress value={(dims[k] ?? 5) * 10} className="h-1.5 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
          {moves.length > 0 && (
            <div>
              <div className="text-sm font-medium text-foreground mb-2">How their belief moved</div>
              <div className="space-y-1.5">
                {moves.map((m, i) => {
                  const down = m.new < m.previous
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border shrink-0 ${down ? 'border-red-500/30 text-red-300 bg-red-500/10' : 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'}`}>
                        {down ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />} {DIM_LABELS[m.dimension] || m.dimension} {m.previous}→{m.new}
                      </span>
                      <span className="text-muted-foreground">{m.reason}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {(quotes || []).length > 0 && (
            <div>
              <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-1"><Quote className="w-4 h-4 text-brand" /> What they said — save a quote to your notes</div>
              <div className="space-y-2">
                {quotes.filter(Boolean).map((q, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl bg-secondary border border-border p-2.5">
                    <p className="text-xs text-foreground/85 flex-1 italic">“{q}”</p>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" title="Save to notes" onClick={() => { const n = getNotes(startupId); n.unshift({ persona: persona.name, text: q, ts: Date.now() }); saveNotes(startupId, n); toast.success('Saved to your notes.') }}><Copy className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ================================================================== SHARE CARD
function drawShareCard(startupName, v) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#0a0a0b'; ctx.fillRect(0, 0, 1200, 630)
  // top gradient bar
  const g = ctx.createLinearGradient(0, 0, 1200, 0)
  g.addColorStop(0, '#a3e635'); g.addColorStop(0.5, '#22c55e'); g.addColorStop(1, '#2dd4bf')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 8)
  // flowing lines
  ctx.strokeStyle = g; ctx.globalAlpha = 0.18; ctx.lineWidth = 1.5
  for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(720, 120 + i * 26); ctx.bezierCurveTo(880, 60 + i * 24, 1040, 560 - i * 20, 1220, 200 + i * 22); ctx.stroke() }
  ctx.globalAlpha = 1
  // logo + label
  ctx.fillStyle = '#fafafa'; ctx.font = '700 34px Inter, sans-serif'; ctx.fillText('ECHOCLASH', 64, 96)
  ctx.fillStyle = '#a1a1aa'; ctx.font = '400 22px Inter, sans-serif'; ctx.fillText('AI Investment Committee — pitch debrief', 64, 132)
  // startup
  ctx.fillStyle = '#fafafa'; ctx.font = '600 56px Inter, sans-serif'; ctx.fillText(startupName || 'My Startup', 64, 240)
  // score
  ctx.fillStyle = '#22c55e'; ctx.font = '800 180px Inter, sans-serif'; ctx.fillText(String(v.final_score), 64, 430)
  ctx.fillStyle = '#71717a'; ctx.font = '500 40px Inter, sans-serif'; ctx.fillText('/ 100', 64 + ctx.measureText(String(v.final_score)).width + 24, 430)
  ctx.fillStyle = '#a1a1aa'; ctx.font = '400 26px Inter, sans-serif'; ctx.fillText('pitch readiness', 68, 470)
  // verdict pill
  const vt = v.verdict || ''; ctx.font = '600 30px Inter, sans-serif'
  const pw = ctx.measureText(vt).width + 56
  const isPass = vt === 'Pass'; const isGood = vt.includes('Interest') && !vt.includes('Conditional')
  ctx.fillStyle = isPass ? 'rgba(239,68,68,0.15)' : isGood ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'
  ctx.strokeStyle = isPass ? '#ef4444' : isGood ? '#10b981' : '#f59e0b'
  const px = 64, py = 520
  ctx.beginPath(); ctx.roundRect(px, py, pw, 60, 30); ctx.fill(); ctx.stroke()
  ctx.fillStyle = isPass ? '#fca5a5' : isGood ? '#6ee7b7' : '#fcd34d'; ctx.fillText(vt, px + 28, py + 40)
  // strongest/weakest
  ctx.fillStyle = '#a1a1aa'; ctx.font = '400 22px Inter, sans-serif'
  ctx.fillText(`Strongest: ${DIM_LABELS[v.strongest_dimension] || v.strongest_dimension || '—'}   ·   Weakest: ${DIM_LABELS[v.weakest_dimension] || v.weakest_dimension || '—'}`, 64, 610)
  return c
}

async function shareVerdictCard(startupName, v) {
  try {
    const canvas = drawShareCard(startupName, v)
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'echoclash-verdict.png', { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'My EchoClash verdict', text: `${startupName}: ${v.final_score}/100 — ${v.verdict}` }); return } catch (e) {}
      }
      const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = 'echoclash-verdict.png'; a.click(); URL.revokeObjectURL(url)
      toast.success('Verdict card downloaded.')
    }, 'image/png')
  } catch (e) { toast.error('Could not generate share card') }
}
