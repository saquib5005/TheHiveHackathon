import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { PANELS, DIMENSIONS, DIM_KEYS, getPanel, initialBeliefs } from '@/lib/personas'

// ---------- Mongo ----------
let client
let db
async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}
function json(data, status = 200) { return cors(NextResponse.json(data, { status })) }
export async function OPTIONS() { return cors(new NextResponse(null, { status: 200 })) }

// ---------- LLM ----------
async function callLLM(messages, { maxTokens = 2200, temperature = 0.7 } = {}) {
  const base = process.env.INTEGRATION_PROXY_URL || 'https://integrations.emergentagent.com'
  const res = await fetch(base + '/llm/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EMERGENT_LLM_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'claude-sonnet-4-5-20250929',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`LLM ${res.status}: ${t.slice(0, 200)}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

function extractJSON(text) {
  if (!text) return null
  let t = text.trim()
  // strip markdown fences if present
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) t = fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  const slice = t.slice(start, end + 1)
  try { return JSON.parse(slice) } catch (e) { return null }
}

async function callLLMJson(messages, opts) {
  // one attempt + one stricter retry
  let raw = await callLLM(messages, opts)
  let parsed = extractJSON(raw)
  if (parsed) return parsed
  const retryMessages = [
    ...messages,
    { role: 'assistant', content: raw.slice(0, 1000) },
    { role: 'user', content: 'That was not valid JSON. Respond again with ONLY a single valid minified JSON object and nothing else. No markdown, no prose.' },
  ]
  raw = await callLLM(retryMessages, { ...(opts || {}), temperature: 0.2 })
  parsed = extractJSON(raw)
  return parsed
}

// ---------- Prompt builders ----------
const DIM_LINE = DIMENSIONS.map((d) => `${d.key} (${d.label})`).join(', ')

function personaBlock(panel) {
  return panel.personas.map((p) => (
    `- id="${p.id}" | ${p.name}, ${p.role}\n` +
    `  lens: primary=${p.primary_lens}, secondary=${p.secondary_lens} (${p.lens_desc})\n` +
    `  style: directness ${p.style.directness}/10, aggressiveness ${p.style.aggressiveness}/10, numbers_focus ${p.style.numbers_focus}/10\n` +
    `  distrusts: ${p.distrusts}\n` +
    `  question_priorities: ${p.question_priorities.join(' > ')}`
  )).join('\n')
}

function startupMemory(s) {
  const f = (k, v) => (v ? `  ${k}: ${v}\n` : '')
  return (
    f('Name', s.name) + f('Founder', s.founder) + f('Industry', s.industry) + f('Stage', s.stage) +
    f('One-liner', s.one_liner) + f('Problem', s.problem) + f('Customer', s.customer) +
    f('Solution', s.solution) + f('Business model', s.business_model) + f('Pricing', s.pricing) +
    f('Revenue', s.revenue) + f('Customers', s.customers) + f('CAC', s.cac) + f('Retention', s.retention) +
    f('Market size', s.market_size) + f('Competitors', s.competitors) + f('Differentiation', s.differentiation) +
    f('Moat', s.moat) + f('GTM', s.gtm) + f('Traction', s.traction) + f('Fundraising', s.fundraising_status) +
    f('Evidence', s.evidence)
  ) || '  (no structured data provided)\n'
}

function turnSystemPrompt(panel) {
  return `You are the simulation engine for EchoClash, a ruthless adversarial startup-pitch simulator. You control an AI investment panel of exactly 3 distinct personas evaluating a founder's LIVE pitch. You behave like a top-tier investment committee: sharp, specific, numerically rigorous, never flattering. You catch vague claims and numerical inconsistencies instantly.

ACTIVE PANEL: ${panel.name} (${panel.tagline}).
PERSONAS (honor each persona's lens, style and distrusts precisely; different personas ask different questions):
${personaBlock(panel)}

BELIEF DIMENSIONS (each scored 0-10 per persona): ${DIM_LINE}.

YOUR JOB each time the founder speaks:
1. CLAIM EXTRACTION: pull out factual/numeric claims from the founder's latest message. Category is one of: Problem, Customer, Market, Competition, Product, Differentiation, Moat, Traction, Business Model, Unit Economics, GTM, Scalability, Feasibility, Team, Evidence, Novelty.
2. CONTRADICTION DETECTION: compare each new claim against ALL prior claims, INCLUDING derived math. Examples: total_spend / customers = CAC; revenue / customers = ARPU; if numbers conflict, flag it. severity is HIGH, MEDIUM or LOW. Be precise and quote the numbers.
3. BELIEF UPDATE: adjust scores for the personas whose lens is affected, with a concrete one-line reason. Contradictions, hand-waving and unsupported big claims LOWER scores; specific credible evidence RAISES them. Only include dimensions that actually changed. Keep changes realistic (usually 1-3 points).
4. RESPOND AS ONE PERSONA: choose the single persona (by lens ownership + escalation + fairness) who should speak now. Write a short in-character reply (2-4 sentences) that reacts to what was just said and reference specific numbers where relevant, then ask ONE hard follow-up question. Stay in character (use their directness/aggressiveness).
5. DECISION STATE: one of listening, probing, skeptical, warming, convinced, unconvinced.

Money is in INR (\u20b9). Return ONLY one valid minified JSON object, no markdown, exactly this shape:
{"claims_extracted":[{"text":"","category":"","numeric_value":null,"unit":"","confidence":"high|medium|low","evidence_status":"SUPPORTED|PARTIALLY_SUPPORTED|UNSUPPORTED|CONTRADICTED|UNKNOWN"}],"contradictions_detected":[{"new_claim":"","prior_claim":"","conflict_type":"","severity":"HIGH|MEDIUM|LOW","affected_dimensions":[""],"explanation":""}],"belief_updates":[{"persona_id":"","dimension":"","previous":5,"new":4,"reason":""}],"responding_persona":"","response":"","question":{"text":"","reason":"","target_dimension":"","escalation_level":"ask|challenge|cross_reference|consequence|decision"},"decision_state":{"state":"","reason":""}}
Use only the persona ids and dimension keys given above.`
}

function buildTurnUser(session, startup, founderMessage) {
  const priorClaims = (session.claims || []).map((c) => `- [${c.category}] ${c.text}${c.numeric_value != null ? ` (=${c.numeric_value}${c.unit || ''})` : ''} [${c.evidence_status}]`).join('\n') || '  (none yet)'
  const beliefs = Object.entries(session.beliefs || {}).map(([pid, dims]) => {
    return `  ${pid}: ` + DIM_KEYS.map((k) => `${k}=${dims[k]}`).join(' ')
  }).join('\n')
  const contradictions = (session.contradictions || []).map((c) => `- ${c.explanation || c.conflict_type} [${c.severity}]`).join('\n') || '  (none yet)'
  const transcript = (session.transcript || []).slice(-12).map((m) => {
    if (m.role === 'founder') return `FOUNDER: ${m.content}`
    return `${m.personaName} (${m.personaRole}): ${m.content}${m.question?.text ? ' Q: ' + m.question.text : ''}`
  }).join('\n') || '  (pitch just started)'

  let memoryBlock = ''
  if (session.memory && (session.memory.claims?.length || session.memory.gaps?.length)) {
    const mClaims = (session.memory.claims || []).slice(0, 25).map((c) => `- ${c}`).join('\n') || '  (none)'
    const mGaps = (session.memory.gaps || []).map((g) => `- [${g.severity} ${g.category}] ${g.why_it_matters} (${g.status})`).join('\n') || '  (none)'
    memoryBlock = `\nMEMORY FROM PRIOR PITCH ROUNDS (this is round ${session.round_number}; the panel REMEMBERS these):\nPrior claims:\n${mClaims}\nPrior gaps (note which are now resolved vs still open):\n${mGaps}\nLast round score: ${session.memory.last_score ?? 'n/a'}\n`
  }

  return `STARTUP MEMORY:\n${startupMemory(startup)}${memoryBlock}\nPRIOR CLAIMS (this session):\n${priorClaims}\n\nOPEN CONTRADICTIONS:\n${contradictions}\n\nCURRENT BELIEF SCORES (persona: dim=score):\n${beliefs}\n\nCONVERSATION SO FAR:\n${transcript}\n\nFOUNDER JUST SAID:\n"""${founderMessage}"""\n\nProcess this turn now. Return the JSON object.`
}

function deliberationSystem(panel) {
  return `You are the deliberation engine for EchoClash. The pitch to the ${panel.name} has ended. Three personas now deliberate and produce a final verdict and a founder debrief. Be brutally honest and specific \u2014 this is meant to help the founder find exactly where the startup breaks.

PERSONAS:\n${personaBlock(panel)}\n\nBELIEF DIMENSIONS: ${DIM_LINE}.\n\nProduce: consensus, disagreements between personas (and why), investment conditions, the strongest and weakest dimension, critical unresolved questions, a weighted final_score 0-100, a confidence 0-100, and a verdict which is EXACTLY one of: "Strong Interest", "Interest", "Conditional Interest", "Needs More Evidence", "Pass".\nAlso produce GAPS the founder must fix, each with severity P0 (critical, blocks investment), P1 (important) or P2 (notable), classified by category, with transcript_evidence, why_it_matters, recommended_action and required_evidence.\nAlso produce a SCORECARD: for each of the 10 dimensions give a 0-10 score (aggregate across the panel), and a one-line reason.\n\nMoney is INR (\u20b9). Return ONLY one valid minified JSON object, no markdown, exactly this shape:\n{"final_score":0,"confidence":0,"verdict":"","consensus":[""],"disagreements":[{"topic":"","positions":""}],"investment_conditions":[""],"strongest_dimension":"","weakest_dimension":"","unresolved_questions":[""],"gaps":[{"category":"","severity":"P0|P1|P2","panel_source":"","transcript_evidence":"","why_it_matters":"","recommended_action":"","required_evidence":""}],"scorecard":[{"dimension":"","score":0,"reason":""}]}\nUse only the dimension keys given above in scorecard.`
}

function buildDeliberationUser(session, startup) {
  const claims = (session.claims || []).map((c) => `- [${c.category}] ${c.text}${c.numeric_value != null ? ` (=${c.numeric_value}${c.unit || ''})` : ''} [${c.evidence_status}]`).join('\n') || '  (none)'
  const contradictions = (session.contradictions || []).map((c) => `- ${c.explanation || c.conflict_type} [${c.severity}] affects ${(c.affected_dimensions || []).join(',')}`).join('\n') || '  (none)'
  const beliefs = Object.entries(session.beliefs || {}).map(([pid, dims]) => `  ${pid}: ` + DIM_KEYS.map((k) => `${k}=${dims[k]}`).join(' ')).join('\n')
  const transcript = (session.transcript || []).map((m) => m.role === 'founder' ? `FOUNDER: ${m.content}` : `${m.personaName}: ${m.content}${m.question?.text ? ' Q: ' + m.question.text : ''}`).join('\n')
  return `STARTUP:\n${startupMemory(startup)}\nCLAIMS:\n${claims}\n\nCONTRADICTIONS:\n${contradictions}\n\nFINAL BELIEF SCORES:\n${beliefs}\n\nFULL TRANSCRIPT:\n${transcript}\n\nDeliberate and return the JSON verdict + gaps + scorecard now.`
}

// ---------- Rewrite ----------
const PITCH_SECTIONS = ['opening', 'problem', 'customer', 'solution', 'market', 'traction', 'business_model', 'differentiation', 'moat', 'gtm', 'team', 'ask', 'closing']
const LENGTH_LABELS = { '60s': '60-second', '90s': '90-second', '2min': '2-minute', '5min': '5-minute', 'custom': 'concise' }

function rewriteSystem(lengthKey) {
  const label = LENGTH_LABELS[lengthKey] || 'concise'
  return `You are an expert startup pitch writer for EchoClash. Rewrite the founder's pitch so it directly addresses the investment panel's objections and the selected gaps, tuned for a ${label} spoken pitch.

STRICT HONESTY RULES:
- NEVER invent customers, revenue, traction, statistics, evidence, partnerships, or numbers that are not present in the startup memory or the transcript.
- Where evidence is missing but needed, insert a bracketed placeholder EXACTLY like [INSERT: your customer acquisition cohort data here].
- Any claim that is currently unsupported must be rephrased honestly or flagged.
- The founder is the final author; be specific and credible, never generic.

Money is INR (\u20b9). Return ONLY one valid minified JSON object, no markdown, exactly this shape:
{"title":"","sections":{"opening":"","problem":"","customer":"","solution":"","market":"","traction":"","business_model":"","differentiation":"","moat":"","gtm":"","team":"","ask":"","closing":""},"flagged":[{"text":"","reason":""}]}
Each section is one short paragraph (empty string if genuinely not applicable). "flagged" lists any lines that rest on unproven claims the founder must verify.`
}

function buildRewriteUser(session, startup, gaps) {
  const v = session.verdict
  const gapText = (gaps || []).map((g) => `- [${g.severity} ${g.category}] ${g.why_it_matters} -> action: ${g.recommended_action}${g.required_evidence ? ' | evidence needed: ' + g.required_evidence : ''}`).join('\n') || '  (none selected)'
  const objections = (session.transcript || []).filter((m) => m.role === 'persona').map((m) => `- ${m.personaName}: ${m.question?.text || m.content}`).slice(0, 10).join('\n')
  const claims = (session.claims || []).map((c) => `- [${c.category}] ${c.text} [${c.evidence_status}]`).join('\n') || '  (none)'
  return `STARTUP MEMORY:\n${startupMemory(startup)}\nPANEL VERDICT: ${v ? v.verdict + ' (score ' + v.final_score + ')' : 'n/a'}\n\nGAPS TO ADDRESS:\n${gapText}\n\nPANEL OBJECTIONS / QUESTIONS:\n${objections}\n\nKNOWN CLAIMS + EVIDENCE STATUS:\n${claims}\n\nWrite the rewritten pitch now. Return the JSON object.`
}

// ---------- Demo (FlowPay scripted, zero external calls) ----------
const DEMO_SCORECARD_1 = [
  { dimension: 'problem', score: 7, reason: 'Clear, real pain for small merchants accepting digital payments.' },
  { dimension: 'market', score: 4, reason: '\u20b94,000cr TAM asserted top-down with no methodology.' },
  { dimension: 'founder', score: 5, reason: 'Credible but numbers slipped under questioning.' },
  { dimension: 'differentiation', score: 5, reason: 'Faster settlement is a feature, not yet a wedge.' },
  { dimension: 'defensibility', score: 4, reason: 'Merchant relationships are not a durable moat yet.' },
  { dimension: 'distribution', score: 4, reason: 'Only paid acquisition shown; no repeatable channel.' },
  { dimension: 'economics', score: 3, reason: 'CAC contradiction: \u20b920,000/50 = \u20b9400, not \u20b9200.' },
  { dimension: 'scalability', score: 6, reason: 'UPI rails scale, execution unproven at volume.' },
  { dimension: 'novelty', score: 5, reason: 'Crowded UPI space; incremental novelty.' },
  { dimension: 'feasibility', score: 6, reason: 'Product exists and works for 50 merchants.' },
]
const DEMO_SCORECARD_2 = [
  { dimension: 'problem', score: 7, reason: 'Problem re-confirmed with sharper ICP.' },
  { dimension: 'market', score: 5, reason: 'Bottom-up TAM now shown, still needs sourcing.' },
  { dimension: 'founder', score: 6, reason: 'Corrected CAC openly with cohort data \u2014 credibility up.' },
  { dimension: 'differentiation', score: 6, reason: 'Settlement speed tied to measurable merchant value.' },
  { dimension: 'defensibility', score: 5, reason: 'Early network effects between merchants emerging.' },
  { dimension: 'distribution', score: 6, reason: 'Referral loop within merchant clusters shown.' },
  { dimension: 'economics', score: 6, reason: 'CAC reconciled to \u20b9400 with a path to \u20b9250.' },
  { dimension: 'scalability', score: 6, reason: 'Unchanged; volume still to prove.' },
  { dimension: 'novelty', score: 5, reason: 'Unchanged.' },
  { dimension: 'feasibility', score: 7, reason: 'Retention data now provided.' },
]

function demoBeliefs(scorecard) {
  const vc = getPanel('vc')
  const b = {}
  for (const p of vc.personas) { b[p.id] = {}; for (const k of DIM_KEYS) b[p.id][k] = scorecard.find((s) => s.dimension === k)?.score ?? 5 }
  return b
}

function buildDemoSession1(startup_id, user_id) {
  const now = Date.now()
  const t = (i) => new Date(now - (60000 * (20 - i)))
  const transcript = [
    { id: uuidv4(), role: 'founder', content: 'FlowPay is a UPI-based B2B payments platform for small merchants in India. The market is huge \u2014 about \u20b94,000 crore. Our CAC is just \u20b9200 and we already have 50 paying merchants.', ts: t(1) },
    { id: uuidv4(), role: 'persona', persona_id: 'richard', personaName: 'Richard Harmon', personaRole: 'Market Skeptic', content: '\u20b94,000 crore is a headline, not a market. Walk me through how you built that number \u2014 top-down slices of "UPI in India" are worthless to me.', question: { text: 'What is your bottom-up TAM: number of target merchants \u00d7 realistic revenue per merchant?', target_dimension: 'market', escalation_level: 'challenge' }, contradictions: [], beliefChanges: [{ persona_id: 'richard', dimension: 'market', previous: 5, new: 4, reason: 'TAM asserted top-down with no methodology.' }], ts: t(2) },
    { id: uuidv4(), role: 'founder', content: 'We got those first 50 merchants by spending around \u20b920,000 last quarter on acquisition.', ts: t(3) },
    { id: uuidv4(), role: 'persona', persona_id: 'priya', personaName: 'Priya Sundaram', personaRole: 'Economics Auditor', content: 'Stop right there. \u20b920,000 divided by 50 merchants is \u20b9400 per acquisition \u2014 that is double the \u20b9200 CAC you opened with. Which number is real?', question: { text: 'Give me the actual blended CAC with the spend and the cohort it acquired.', target_dimension: 'economics', escalation_level: 'cross_reference' }, contradictions: [{ id: uuidv4(), severity: 'HIGH', conflict_type: 'derived_numeric', new_claim: 'Spent \u20b920,000 to acquire 50 merchants', prior_claim: 'CAC is \u20b9200', affected_dimensions: ['economics', 'founder'], explanation: '\u20b920,000 / 50 merchants = \u20b9400 actual CAC, not the \u20b9200 claimed \u2014 a 2x understatement.' }], beliefChanges: [{ persona_id: 'priya', dimension: 'economics', previous: 5, new: 3, reason: 'CAC understated by 2x under scrutiny.' }, { persona_id: 'priya', dimension: 'founder', previous: 5, new: 4, reason: 'Headline numbers did not reconcile.' }], ts: t(4) },
    { id: uuidv4(), role: 'founder', content: 'Fair \u2014 blended CAC is closer to \u20b9400 right now. Our moat is our merchant relationships and faster settlement times.', ts: t(5) },
    { id: uuidv4(), role: 'persona', persona_id: 'james', personaName: 'James Wei', personaRole: 'Moat Investor', content: 'Relationships and speed are features a funded competitor copies in a quarter. I need switching costs or a compounding advantage, not goodwill.', question: { text: 'What structurally stops a merchant from leaving for a faster/cheaper rail next month?', target_dimension: 'defensibility', escalation_level: 'challenge' }, contradictions: [], beliefChanges: [{ persona_id: 'james', dimension: 'defensibility', previous: 5, new: 4, reason: 'No durable switching cost articulated.' }], ts: t(6) },
  ]
  const claims = [
    { id: uuidv4(), startup_id, session_id: null, text: 'UPI-based B2B payments platform for small merchants', category: 'Product', numeric_value: null, unit: '', confidence: 'high', evidence_status: 'PARTIALLY_SUPPORTED', created_at: t(1) },
    { id: uuidv4(), startup_id, session_id: null, text: 'Market is ~\u20b94,000 crore', category: 'Market', numeric_value: 4000, unit: 'crore INR', confidence: 'low', evidence_status: 'UNSUPPORTED', created_at: t(1) },
    { id: uuidv4(), startup_id, session_id: null, text: 'CAC is \u20b9200', category: 'Unit Economics', numeric_value: 200, unit: 'INR', confidence: 'low', evidence_status: 'CONTRADICTED', created_at: t(1) },
    { id: uuidv4(), startup_id, session_id: null, text: 'Spent \u20b920,000 acquiring 50 merchants', category: 'Unit Economics', numeric_value: 400, unit: 'INR CAC', confidence: 'high', evidence_status: 'SUPPORTED', created_at: t(3) },
  ]
  const contradictions = [transcript[3].contradictions[0]]
  const gaps = [
    { id: uuidv4(), session_id: null, startup_id, category: 'Unit Economics', severity: 'P0', panel_source: 'Priya Sundaram', transcript_evidence: '\u20b920,000 / 50 = \u20b9400 CAC vs \u20b9200 claimed', why_it_matters: 'Your headline CAC is understated 2x; every downstream LTV/payback number is now suspect.', recommended_action: 'Publish a real cohort: spend, merchants acquired, blended CAC, and payback period.', required_evidence: 'Quarterly acquisition spend + cohort size + retention curve', status: 'OPEN', created_at: t(4) },
    { id: uuidv4(), session_id: null, startup_id, category: 'Distribution', severity: 'P1', panel_source: 'Richard Harmon', transcript_evidence: 'Only paid acquisition shown', why_it_matters: 'No repeatable, low-cost channel means CAC will rise as you scale.', recommended_action: 'Show one organic/referral channel with early conversion data.', required_evidence: 'Channel-level acquisition breakdown', status: 'OPEN', created_at: t(4) },
    { id: uuidv4(), session_id: null, startup_id, category: 'Moat', severity: 'P1', panel_source: 'James Wei', transcript_evidence: '"moat is relationships and faster settlement"', why_it_matters: 'Features are copyable; without switching costs you have no defensibility.', recommended_action: 'Identify a compounding advantage (network effects, data, integrations).', required_evidence: 'Evidence of switching cost or network effect', status: 'OPEN', created_at: t(6) },
    { id: uuidv4(), session_id: null, startup_id, category: 'Traction', severity: 'P2', panel_source: 'Priya Sundaram', transcript_evidence: 'No retention data offered', why_it_matters: 'Retention determines whether \u20b9400 CAC ever pays back.', recommended_action: 'Provide monthly merchant retention / churn.', required_evidence: 'Retention cohort table', status: 'OPEN', created_at: t(4) },
  ]
  const verdict = {
    final_score: 61, previous_score: null, confidence: 64, verdict: 'Needs More Evidence',
    consensus: ['The merchant pain is real and worth solving', 'The current numbers do not yet reconcile'],
    disagreements: [{ topic: 'Upside', positions: 'Richard sees a modest market until TAM is proven; James is more open if a moat emerges.' }],
    investment_conditions: ['A reconciled CAC with cohort data', 'One repeatable non-paid channel', 'A credible switching cost story'],
    strongest_dimension: 'problem', weakest_dimension: 'economics',
    unresolved_questions: ['What is the true blended CAC and payback?', 'What is the bottom-up TAM?', 'Why won\u2019t merchants churn to a cheaper rail?'],
    created_at: t(7),
  }
  return {
    id: uuidv4(), user_id, startup_id, panel_id: 'vc', panel_name: 'VC Investment Committee',
    status: 'ended', mode: 'demo', round_number: 1, is_demo: true,
    transcript: transcript.map((m) => ({ ...m })), claims, contradictions, beliefs: demoBeliefs(DEMO_SCORECARD_1),
    belief_history: [], verdict, gaps, scorecard: DEMO_SCORECARD_1, started_at: t(0), ended_at: t(8),
  }
}

function buildDemoSession2(startup_id, user_id) {
  const now = Date.now()
  const t = (i) => new Date(now - (60000 * (10 - i)))
  const transcript = [
    { id: uuidv4(), role: 'founder', content: 'Back again. Since last time: blended CAC is \u20b9400, and I can show the cohort \u2014 \u20b920,000 across 50 merchants last quarter, with 88% still active this quarter. Referrals inside merchant clusters now drive 30% of new signups at near-zero cost.', ts: t(1) },
    { id: uuidv4(), role: 'persona', persona_id: 'priya', personaName: 'Priya Sundaram', personaRole: 'Economics Auditor', content: 'Thank you \u2014 that reconciles. \u20b9400 CAC with 88% retention gives a defensible payback. Now show me the path to \u20b9250 as referrals grow.', question: { text: 'What CAC do you model at 1,000 merchants and why?', target_dimension: 'economics', escalation_level: 'ask' }, contradictions: [], beliefChanges: [{ persona_id: 'priya', dimension: 'economics', previous: 3, new: 6, reason: 'CAC reconciled and retention provided.' }, { persona_id: 'priya', dimension: 'founder', previous: 4, new: 6, reason: 'Corrected numbers openly.' }], ts: t(2) },
    { id: uuidv4(), role: 'persona', persona_id: 'richard', personaName: 'Richard Harmon', personaRole: 'Market Skeptic', content: 'The referral loop is the first real distribution signal I\u2019ve seen from you. Bottom-up TAM still needs a source, but this is progress.', question: { text: 'How many merchant clusters exist in your first two cities?', target_dimension: 'market', escalation_level: 'ask' }, contradictions: [], beliefChanges: [{ persona_id: 'richard', dimension: 'distribution', previous: 4, new: 6, reason: 'Referral channel shown with data.' }, { persona_id: 'richard', dimension: 'market', previous: 4, new: 5, reason: 'Bottom-up framing improved.' }], ts: t(3) },
  ]
  const gaps = [
    { id: uuidv4(), session_id: null, startup_id, category: 'Moat', severity: 'P1', panel_source: 'James Wei', transcript_evidence: 'Referral loop emerging', why_it_matters: 'Network effects are forming but not yet proven durable.', recommended_action: 'Quantify cross-merchant network value and retention lift.', required_evidence: 'Cohort retention by referral vs paid', status: 'OPEN', created_at: t(3) },
    { id: uuidv4(), session_id: null, startup_id, category: 'Market', severity: 'P2', panel_source: 'Richard Harmon', transcript_evidence: 'TAM still needs a source', why_it_matters: 'A sourced bottom-up TAM unlocks the venture-scale question.', recommended_action: 'Cite merchant counts per city from a credible source.', required_evidence: 'Bottom-up TAM with citations', status: 'OPEN', created_at: t(3) },
  ]
  const verdict = {
    final_score: 74, previous_score: 61, confidence: 71, verdict: 'Conditional Interest',
    consensus: ['CAC now reconciles and retention is strong', 'A real referral channel is emerging'],
    disagreements: [{ topic: 'Moat', positions: 'James wants proof the network effect is durable; Priya is satisfied on economics.' }],
    investment_conditions: ['Prove the referral loop is durable', 'Source the bottom-up TAM'],
    strongest_dimension: 'feasibility', weakest_dimension: 'novelty',
    unresolved_questions: ['Is the referral network effect durable at scale?', 'What is the sourced bottom-up TAM?'],
    created_at: t(4),
  }
  return {
    id: uuidv4(), user_id, startup_id, panel_id: 'vc', panel_name: 'VC Investment Committee',
    status: 'ended', mode: 'demo', round_number: 2, is_demo: true,
    transcript: transcript.map((m) => ({ ...m })), claims: [], contradictions: [], beliefs: demoBeliefs(DEMO_SCORECARD_2),
    belief_history: [], verdict, gaps, scorecard: DEMO_SCORECARD_2, started_at: t(0), ended_at: t(5),
  }
}

// ---------- Mentor + Incubator seed data ----------
function genSlots() {
  // 4-6 dates across the next 7 days, each with 2-4 time options
  const TIMES = ['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM']
  const nDays = 4 + Math.floor(Math.random() * 3) // 4-6
  const dayOffsets = []
  for (let d = 1; d <= 7 && dayOffsets.length < nDays; d++) { if (Math.random() > 0.25) dayOffsets.push(d) }
  while (dayOffsets.length < 4) { const r = 1 + Math.floor(Math.random() * 7); if (!dayOffsets.includes(r)) dayOffsets.push(r) }
  dayOffsets.sort((a, b) => a - b)
  return dayOffsets.map((off) => {
    const dt = new Date(); dt.setDate(dt.getDate() + off)
    const date = dt.toISOString().slice(0, 10)
    const shuffled = [...TIMES].sort(() => Math.random() - 0.5)
    const times = shuffled.slice(0, 2 + Math.floor(Math.random() * 3)).sort()
    return { date, times }
  })
}

function mentorSeed() {
  const raw = [
    { name: 'Aarti Menon', title: 'Ex-Sequoia India · Fintech GTM', city: 'Bangalore', rating: 4.9, experience_tier: 'Veteran', years_experience: 16, hourly_rate: 10000, expertise: ['Fundraising', 'Fintech', 'GTM', 'Unit Economics'], img: 5, bio: 'Former partner at a top-tier VC. Helped 40+ fintech startups sharpen their fundraising narrative and close Series A rounds.', sessions_done: 320, companies_helped: 48 },
    { name: 'Rohan Kapoor', title: 'Founder, 2x exits · SaaS', city: 'Bangalore', rating: 4.8, experience_tier: 'Veteran', years_experience: 14, hourly_rate: 8500, expertise: ['SaaS', 'Product', 'Scaling', 'Hiring'], img: 12, bio: 'Built and sold two B2B SaaS companies. Now advises founders on product-led growth and the first 10 enterprise deals.', sessions_done: 210, companies_helped: 33 },
    { name: 'Priya Sundaram', title: 'CFO-in-Residence · Unit Economics', city: 'Chennai', rating: 4.9, experience_tier: 'Veteran', years_experience: 18, hourly_rate: 9000, expertise: ['Finance', 'Unit Economics', 'Fundraising', 'Metrics'], img: 20, bio: 'Fractional CFO for 25+ startups. Obsessed with CAC/LTV truth, burn discipline and investor-grade financial models.', sessions_done: 280, companies_helped: 41 },
    { name: 'Karthik Rao', title: 'Growth Lead · D2C & Marketplaces', city: 'Chennai', rating: 4.7, experience_tier: 'Seasoned', years_experience: 10, hourly_rate: 6000, expertise: ['Growth', 'D2C', 'Marketing', 'Retention'], img: 33, bio: 'Scaled two D2C brands past ₹100cr ARR. Deep on performance marketing, retention loops and marketplace supply.', sessions_done: 165, companies_helped: 27 },
    { name: 'Neha Agarwal', title: 'Product Coach · Ex-Flipkart', city: 'Mumbai', rating: 4.8, experience_tier: 'Seasoned', years_experience: 11, hourly_rate: 7000, expertise: ['Product', 'UX', 'Roadmap', 'PLG'], img: 45, bio: 'Led 0→1 product teams at a leading marketplace. Helps founders find product-market fit and prioritise ruthlessly.', sessions_done: 190, companies_helped: 30 },
    { name: 'Vikram Sethi', title: 'Angel Investor · Deeptech', city: 'Mumbai', rating: 4.6, experience_tier: 'Veteran', years_experience: 20, hourly_rate: 9500, expertise: ['Deeptech', 'Fundraising', 'Strategy', 'Hardware'], img: 51, bio: 'Active angel with 30+ investments in deeptech and hardware. Guides founders through the long road to defensibility.', sessions_done: 140, companies_helped: 22 },
    { name: 'Sanjana Iyer', title: 'Brand & Storytelling · Ex-agency', city: 'Delhi', rating: 4.7, experience_tier: 'Seasoned', years_experience: 9, hourly_rate: 4500, expertise: ['Branding', 'Pitch', 'Content', 'PR'], img: 47, bio: 'Turns messy founder decks into crisp stories investors remember. Former creative director for consumer brands.', sessions_done: 205, companies_helped: 36 },
    { name: 'Aditya Bose', title: 'Engineering Advisor · Scaling', city: 'Delhi', rating: 4.5, experience_tier: 'Emerging', years_experience: 7, hourly_rate: 3500, expertise: ['Engineering', 'Architecture', 'Hiring', 'DevOps'], img: 15, bio: 'Staff engineer turned advisor. Helps early teams make pragmatic tech choices and hire their first engineers.', sessions_done: 95, companies_helped: 18 },
    { name: 'Meera Nair', title: 'Legal & Compliance · Startups', city: 'Bangalore', rating: 4.6, experience_tier: 'Seasoned', years_experience: 12, hourly_rate: 5000, expertise: ['Legal', 'Compliance', 'Term Sheets', 'ESOP'], img: 44, bio: 'Startup lawyer who has papered 100+ rounds. Demystifies term sheets, cap tables and ESOP pools for founders.', sessions_done: 175, companies_helped: 52 },
    { name: 'Arjun Malhotra', title: 'Sales Leader · B2B Enterprise', city: 'Bangalore', rating: 4.8, experience_tier: 'Seasoned', years_experience: 13, hourly_rate: 6500, expertise: ['Sales', 'Enterprise', 'GTM', 'Negotiation'], img: 68, bio: 'Built enterprise sales orgs from scratch. Coaches founders on landing lighthouse customers and pricing enterprise deals.', sessions_done: 150, companies_helped: 25 },
  ]
  return raw.map((m) => ({
    id: uuidv4(), name: m.name, title: m.title, city: m.city, rating: m.rating,
    experience_tier: m.experience_tier, years_experience: m.years_experience,
    hourly_rate: m.hourly_rate, currency: 'INR', expertise: m.expertise, bio: m.bio,
    sessions_done: m.sessions_done, companies_helped: m.companies_helped,
    photo_url: `https://i.pravatar.cc/400?img=${m.img}`,
    available_slots: genSlots(), created_at: new Date(),
  }))
}

function incubatorSeed() {
  const raw = [
    { name: 'NASSCOM 10,000 Startups', type: 'incubator', city: 'Bangalore', focus_areas: ['saas', 'fintech', 'ai'], stage_support: ['idea', 'pre-seed', 'seed'], grants_available: true, grant_details: 'Cloud credits + up to ₹10L in kind support for early-stage startups', program_duration: 'Rolling', notable_alumni: ['Zoho reboot cohort', 'Signzy'], website_url: 'https://10000startups.com', description: 'India\u2019s largest startup enablement program by NASSCOM, offering mentorship, funding connects, market access and cloud credits.' },
    { name: 'IIM Bangalore NSRCEL', type: 'incubator', city: 'Bangalore', focus_areas: ['social', 'healthtech', 'saas'], stage_support: ['idea', 'seed'], grants_available: true, grant_details: 'Up to ₹25L for idea-stage startups via the incubation grant', program_duration: '6 months', notable_alumni: ['Unacademy', 'Vogo'], website_url: 'https://nsrcel.org', description: 'The startup hub at IIM Bangalore supporting founders through pre-incubation, incubation and women-focused programs.' },
    { name: 'IISc Incubation (SID)', type: 'incubator', city: 'Bangalore', focus_areas: ['deeptech', 'hardware', 'healthtech'], stage_support: ['idea', 'pre-seed'], grants_available: true, grant_details: 'Deeptech grants and lab access for science-led startups', program_duration: '12 months', notable_alumni: ['Tonbo Imaging', 'Sedemac'], website_url: 'https://sid.iisc.ac.in', description: 'The Society for Innovation and Development at IISc, incubating deeptech and science-based ventures with lab infrastructure.' },
    { name: 'Axilor Ventures', type: 'accelerator', city: 'Bangalore', focus_areas: ['fintech', 'saas', 'healthtech'], stage_support: ['seed', 'series-a'], grants_available: false, grant_details: '', program_duration: '100 days', notable_alumni: ['Cropin', 'MyLoanCare'], website_url: 'https://axilor.com', description: 'Founded by Infosys co-founders, Axilor runs a structured accelerator and seed funding program for early-stage startups.' },
    { name: 'T-Hub (Bangalore chapter)', type: 'incubator', city: 'Bangalore', focus_areas: ['saas', 'mobility', 'ai'], stage_support: ['pre-seed', 'seed'], grants_available: true, grant_details: 'Corporate innovation grants via partner programs', program_duration: '3-6 months', notable_alumni: ['Skylark Drones', 'Marut Drones'], website_url: 'https://t-hub.co', description: 'One of India\u2019s largest innovation ecosystems connecting startups to corporates, investors and mentors.' },
    { name: 'Razorpay Rize', type: 'accelerator', city: 'Bangalore', focus_areas: ['fintech', 'saas'], stage_support: ['idea', 'pre-seed', 'seed'], grants_available: true, grant_details: 'Zero-fee payments + community grants for early founders', program_duration: 'Cohort-based', notable_alumni: ['Rize cohort startups'], website_url: 'https://razorpay.com/rize', description: 'Razorpay\u2019s community-led accelerator helping founders build, incorporate and scale with fintech infrastructure.' },
    { name: '1947 Rise', type: 'incubator', city: 'Bangalore', focus_areas: ['consumer', 'saas', 'ai'], stage_support: ['idea', 'seed'], grants_available: false, grant_details: '', program_duration: '4 months', notable_alumni: ['Emerging consumer brands'], website_url: 'https://1947rise.com', description: 'A founder-first incubator focused on consumer and tech startups, offering mentorship and investor access.' },
    { name: 'IIT Madras Incubation Cell', type: 'incubator', city: 'Chennai', focus_areas: ['deeptech', 'hardware', 'ai'], stage_support: ['idea', 'pre-seed', 'seed'], grants_available: true, grant_details: 'Up to ₹30L deeptech grant + lab and prototyping support', program_duration: '12 months', notable_alumni: ['Ather Energy', 'Detect Technologies'], website_url: 'https://incubation.iitm.ac.in', description: 'One of India\u2019s top deeptech incubators, home to landmark hardware and mobility startups out of IIT Madras.' },
    { name: 'IITM Research Park', type: 'incubator', city: 'Chennai', focus_areas: ['deeptech', 'healthtech', 'hardware'], stage_support: ['seed', 'series-a'], grants_available: true, grant_details: 'Research grants and industry collaboration funding', program_duration: 'Flexible', notable_alumni: ['GUVI', 'Planys Technologies'], website_url: 'https://respark.iitm.ac.in', description: 'India\u2019s first university-based research park, enabling deep collaboration between academia and industry.' },
    { name: 'Villgro', type: 'incubator', city: 'Chennai', focus_areas: ['social', 'healthtech', 'agritech'], stage_support: ['idea', 'seed'], grants_available: true, grant_details: 'Up to ₹40L seed grants for impact startups', program_duration: '18 months', notable_alumni: ['Skymet', 'Bempu'], website_url: 'https://villgro.org', description: 'One of the world\u2019s oldest social enterprise incubators, funding and mentoring impact-first startups.' },
    { name: 'StartupTN', type: 'accelerator', city: 'Chennai', focus_areas: ['saas', 'consumer', 'agritech'], stage_support: ['idea', 'pre-seed', 'seed'], grants_available: true, grant_details: 'Tamil Nadu seed grant fund and pilot support', program_duration: 'Rolling', notable_alumni: ['TN startup cohort'], website_url: 'https://startuptn.in', description: 'The Tamil Nadu government\u2019s startup mission driving funding, policy and ecosystem support across the state.' },
  ]
  return raw.map((i) => ({
    id: uuidv4(), name: i.name, type: i.type, city: i.city, description: i.description,
    website_url: i.website_url, logo_url: '', focus_areas: i.focus_areas, stage_support: i.stage_support,
    grants_available: i.grants_available, grant_details: i.grant_details, program_duration: i.program_duration,
    notable_alumni: i.notable_alumni, created_at: new Date(),
  }))
}

async function ensureMentors(db) {
  const n = await db.collection('mentors').countDocuments()
  if (n === 0) await db.collection('mentors').insertMany(mentorSeed())
}
async function ensureIncubators(db) {
  const n = await db.collection('incubators').countDocuments()
  if (n === 0) await db.collection('incubators').insertMany(incubatorSeed())
}

// ---------- Route ----------
async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // health
    if (route === '/' || route === '/root') return json({ message: 'EchoClash API' })

    // ---- DEEPGRAM: browser STT auth. Prefer a short-lived scoped token (secure).
    //      Falls back to the raw key via the browser 'token' subprotocol if the key
    //      lacks permission to mint tokens (prototype only). ----
    if (route === '/deepgram/token' && method === 'GET') {
      if (!process.env.DEEPGRAM_API_KEY) return json({ error: 'deepgram_not_configured' }, 500)
      try {
        const dg = await fetch('https://api.deepgram.com/v1/auth/grant', {
          method: 'POST',
          headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ttl_seconds: 60 }),
          cache: 'no-store',
        })
        const b = await dg.json().catch(() => ({}))
        if (dg.ok && b.access_token) return json({ token: b.access_token, expiresIn: b.expires_in, mode: 'bearer' })
      } catch (e) { /* fall through to raw-key fallback */ }
      return json({ key: process.env.DEEPGRAM_API_KEY, mode: 'token' })
    }

    // ---- DEEPGRAM: TTS (Aura-2 high quality voices) ----
    if (route === '/deepgram/tts' && method === 'POST') {
      if (!process.env.DEEPGRAM_API_KEY) return json({ error: 'deepgram_not_configured' }, 500)
      const body = await request.json().catch(() => ({}))
      const text = String(body?.text || '').trim()
      const ALLOWED = new Set(['aura-2-thalia-en', 'aura-2-orpheus-en', 'aura-2-helios-en', 'aura-2-andromeda-en', 'aura-2-arcas-en', 'aura-2-aurora-en'])
      const model = ALLOWED.has(body?.model) ? body.model : 'aura-2-thalia-en'
      if (!text) return json({ error: 'text required' }, 400)
      const clipped = text.slice(0, 1800)
      const dg = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`, {
        method: 'POST',
        headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clipped }),
      })
      if (!dg.ok) { const t = await dg.text().catch(() => ''); return json({ error: 'deepgram_tts_failed', detail: t.slice(0, 200) }, dg.status) }
      const buf = await dg.arrayBuffer()
      const res = new NextResponse(buf, { status: 200 })
      res.headers.set('Content-Type', dg.headers.get('content-type') || 'audio/mpeg')
      res.headers.set('Cache-Control', 'no-store')
      res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
      return res
    }

    // ---- AUTH (dev bypass, tiered) ----
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body || {}
      const ACCOUNTS = {
        'test@example.com': { password: 'password123', name: 'Founder', tier: 'pro', pitch_limit: 5 },
        'phoenix123@gmail.com': { password: 'phoenix123', name: 'Phoenix', tier: 'free', pitch_limit: 1 },
      }
      const acct = ACCOUNTS[email]
      if (!acct || acct.password !== password) {
        return json({ error: 'Invalid credentials' }, 401)
      }
      let user = await db.collection('users').findOne({ email })
      if (!user) {
        user = { id: uuidv4(), email, name: acct.name, tier: acct.tier, pitch_limit: acct.pitch_limit, created_at: new Date() }
        await db.collection('users').insertOne(user)
      } else {
        // ensure tier/limit fields exist (existing users predate subscription)
        const set = {}
        if (user.tier == null) set.tier = acct.tier
        if (user.pitch_limit == null) set.pitch_limit = acct.pitch_limit
        if (Object.keys(set).length) { await db.collection('users').updateOne({ id: user.id }, { $set: set }); Object.assign(user, set) }
      }
      return json({ id: user.id, email: user.email, name: user.name, tier: user.tier, pitch_limit: user.pitch_limit })
    }

    // ---- SUBSCRIPTION ----
    // usage: how many live pitch sessions has this user consumed vs their limit
    if (route === '/usage' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('user_id')
      if (!userId) return json({ error: 'user_id required' }, 400)
      const user = await db.collection('users').findOne({ id: userId })
      const tier = user?.tier || 'free'
      const limit = user?.pitch_limit ?? (tier === 'pro' ? 5 : 1)
      const used = await db.collection('sessions').countDocuments({ user_id: userId, mode: 'live' })
      return json({ tier, limit, used, remaining: Math.max(0, limit - used), can_pitch: used < limit })
    }

    // dummy upgrade (no real payment) -> promote user to pro
    if (route === '/subscription/upgrade' && method === 'POST') {
      const body = await request.json()
      const { user_id, plan } = body || {}
      if (!user_id) return json({ error: 'user_id required' }, 400)
      const limit = plan === 'unlimited' ? 999 : 5
      await db.collection('users').updateOne({ id: user_id }, { $set: { tier: 'pro', pitch_limit: limit, upgraded_at: new Date() } })
      const user = await db.collection('users').findOne({ id: user_id })
      return json({ id: user.id, email: user.email, name: user.name, tier: user.tier, pitch_limit: user.pitch_limit })
    }

    // ---- PANELS ----
    if (route === '/panels' && method === 'GET') {
      const publicPanels = PANELS.map((p) => ({
        id: p.id, name: p.name, tagline: p.tagline, description: p.description,
        focus: p.focus, difficulty: p.difficulty, dimensions: p.dimensions,
        personas: p.personas.map((pe) => ({
          id: pe.id, name: pe.name, role: pe.role, avatar_url: pe.avatar_url,
          primary_lens: pe.primary_lens, lens_desc: pe.lens_desc, distrusts: pe.distrusts,
        })),
      }))
      return json({ panels: publicPanels, dimensions: DIMENSIONS })
    }

    // ---- STARTUPS ----
    if (route === '/startups' && method === 'POST') {
      const body = await request.json()
      if (!body.user_id || !body.name) return json({ error: 'user_id and name required' }, 400)
      const startup = {
        id: uuidv4(), user_id: body.user_id,
        name: body.name, founder: body.founder || '', industry: body.industry || '',
        stage: body.stage || '', one_liner: body.one_liner || '', problem: body.problem || '',
        customer: body.customer || '', solution: body.solution || '', business_model: body.business_model || '',
        pricing: body.pricing || '', revenue: body.revenue || '', customers: body.customers || '',
        cac: body.cac || '', retention: body.retention || '', market_size: body.market_size || '',
        competitors: body.competitors || '', differentiation: body.differentiation || '', moat: body.moat || '',
        gtm: body.gtm || '', traction: body.traction || '', fundraising_status: body.fundraising_status || '',
        evidence: body.evidence || '', created_at: new Date(), updated_at: new Date(),
      }
      await db.collection('startups').insertOne(startup)
      const { _id, ...clean } = startup
      return json(clean)
    }

    if (route === '/startups' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('user_id')
      const q = userId ? { user_id: userId } : {}
      const rows = await db.collection('startups').find(q).sort({ created_at: -1 }).limit(100).toArray()
      return json(rows.map(({ _id, ...r }) => r))
    }

    // /startups/:id
    if (path[0] === 'startups' && path[1] && method === 'GET') {
      const s = await db.collection('startups').findOne({ id: path[1] })
      if (!s) return json({ error: 'not found' }, 404)
      const { _id, ...clean } = s
      return json(clean)
    }

    // ---- SESSIONS ----
    if (route === '/sessions' && method === 'POST') {
      const body = await request.json()
      const { user_id, startup_id, panel_id } = body || {}
      if (!startup_id || !panel_id) return json({ error: 'startup_id and panel_id required' }, 400)
      const panel = getPanel(panel_id)
      if (!panel) return json({ error: 'invalid panel' }, 400)
      const startup = await db.collection('startups').findOne({ id: startup_id })
      if (!startup) return json({ error: 'startup not found' }, 404)
      // ---- subscription gate: cap live pitch sessions per user by tier ----
      if (user_id) {
        const u = await db.collection('users').findOne({ id: user_id })
        const limit = u?.pitch_limit ?? (u?.tier === 'pro' ? 5 : 1)
        const used = await db.collection('sessions').countDocuments({ user_id, mode: 'live' })
        if (used >= limit) {
          return json({ error: 'pitch_limit_reached', tier: u?.tier || 'free', limit, used, message: `You have used all ${limit} pitch session${limit === 1 ? '' : 's'} on your ${u?.tier || 'free'} plan.` }, 402)
        }
      }
      const priorCount = await db.collection('sessions').countDocuments({ startup_id })
      // build re-pitch memory from prior ended sessions
      const priorSessions = await db.collection('sessions').find({ startup_id, status: 'ended' }).sort({ ended_at: 1 }).toArray()
      let memory = null
      if (priorSessions.length) {
        const claimSet = new Set()
        const gaps = []
        for (const ps of priorSessions) {
          for (const c of (ps.claims || [])) claimSet.add(`[${c.category}] ${c.text}${c.numeric_value != null ? ` (=${c.numeric_value}${c.unit || ''})` : ''}`)
          for (const g of (ps.gaps || [])) gaps.push({ category: g.category, severity: g.severity, why_it_matters: g.why_it_matters, status: g.status })
        }
        const last = priorSessions[priorSessions.length - 1]
        memory = { claims: Array.from(claimSet).slice(0, 40), gaps, last_score: last?.verdict?.final_score ?? null }
      }
      const session = {
        id: uuidv4(), user_id: user_id || null, startup_id, panel_id,
        panel_name: panel.name, status: 'active', mode: 'live', round_number: priorCount + 1,
        transcript: [], claims: [], contradictions: [], beliefs: initialBeliefs(panel),
        belief_history: [], verdict: null, gaps: [], scorecard: [], memory,
        started_at: new Date(), ended_at: null,
      }
      await db.collection('sessions').insertOne(session)
      const { _id, ...clean } = session
      return json(clean)
    }

    if (path[0] === 'sessions' && path[1] && method === 'GET') {
      const s = await db.collection('sessions').findOne({ id: path[1] })
      if (!s) return json({ error: 'not found' }, 404)
      const startup = await db.collection('startups').findOne({ id: s.startup_id })
      const panel = getPanel(s.panel_id)
      const { _id, ...clean } = s
      return json({ ...clean, startup: startup ? (({ _id, ...r }) => r)(startup) : null, panel_personas: panel ? panel.personas : [] })
    }

    if (path[0] === 'sessions' && path[1] === undefined && method === 'GET') {
      const url = new URL(request.url)
      const startupId = url.searchParams.get('startup_id')
      const q = startupId ? { startup_id: startupId } : {}
      const rows = await db.collection('sessions').find(q).sort({ started_at: -1 }).limit(50).toArray()
      return json(rows.map(({ _id, transcript, ...r }) => ({ ...r, turns: (transcript || []).length })))
    }

    // ---- PITCH TURN (core) ----
    if (route === '/pitch/turn' && method === 'POST') {
      const body = await request.json()
      const { session_id, message } = body || {}
      if (!session_id || !message) return json({ error: 'session_id and message required' }, 400)
      const session = await db.collection('sessions').findOne({ id: session_id })
      if (!session) return json({ error: 'session not found' }, 404)
      const startup = await db.collection('startups').findOne({ id: session.startup_id })
      const panel = getPanel(session.panel_id)
      if (!panel) return json({ error: 'invalid panel' }, 400)

      const messages = [
        { role: 'system', content: turnSystemPrompt(panel) },
        { role: 'user', content: buildTurnUser(session, startup, message) },
      ]

      let result
      try {
        result = await callLLMJson(messages)
      } catch (e) {
        return json({ error: 'ai_unavailable', detail: String(e.message || e) }, 502)
      }
      if (!result || !result.response) {
        return json({ error: 'ai_bad_response' }, 502)
      }

      // resolve responding persona
      let persona = panel.personas.find((p) => p.id === result.responding_persona) || panel.personas[0]

      const now = new Date()
      // founder message
      const founderMsg = { id: uuidv4(), role: 'founder', content: message, ts: now }

      // apply belief updates
      const beliefs = session.beliefs || initialBeliefs(panel)
      const beliefChanges = []
      for (const u of (result.belief_updates || [])) {
        if (!u || !u.persona_id || !u.dimension) continue
        if (!beliefs[u.persona_id]) continue
        if (!DIM_KEYS.includes(u.dimension)) continue
        const prev = beliefs[u.persona_id][u.dimension]
        let nv = Number(u.new)
        if (isNaN(nv)) continue
        nv = Math.max(0, Math.min(10, Math.round(nv)))
        beliefs[u.persona_id][u.dimension] = nv
        beliefChanges.push({ persona_id: u.persona_id, dimension: u.dimension, previous: prev, new: nv, reason: u.reason || '' })
      }

      // claims
      const newClaims = (result.claims_extracted || []).map((c) => ({
        id: uuidv4(), startup_id: session.startup_id, session_id,
        text: c.text || '', category: c.category || 'Evidence',
        numeric_value: (c.numeric_value === '' || c.numeric_value === undefined) ? null : c.numeric_value,
        unit: c.unit || '', confidence: c.confidence || 'medium',
        evidence_status: c.evidence_status || 'UNKNOWN', created_at: now,
      }))

      // contradictions
      const newContradictions = (result.contradictions_detected || []).map((c) => ({
        id: uuidv4(), session_id,
        new_claim: c.new_claim || '', prior_claim: c.prior_claim || '',
        conflict_type: c.conflict_type || '', severity: c.severity || 'MEDIUM',
        affected_dimensions: c.affected_dimensions || [], explanation: c.explanation || '',
        resolution_status: 'OPEN', created_at: now,
      }))

      const personaMsg = {
        id: uuidv4(), role: 'persona',
        persona_id: persona.id, personaName: persona.name, personaRole: persona.role, avatar_url: persona.avatar_url,
        content: result.response, question: result.question || null,
        contradictions: newContradictions, beliefChanges,
        decision_state: result.decision_state || null, ts: now,
      }

      await db.collection('sessions').updateOne({ id: session_id }, {
        $push: { transcript: { $each: [founderMsg, personaMsg] }, claims: { $each: newClaims }, contradictions: { $each: newContradictions }, belief_history: { $each: beliefChanges.map((b) => ({ ...b, ts: now })) } },
        $set: { beliefs },
      })

      return json({
        persona_message: personaMsg,
        beliefs,
        belief_changes: beliefChanges,
        contradictions: newContradictions,
        claims: newClaims,
        decision_state: result.decision_state || null,
      })
    }

    // ---- END PITCH -> DELIBERATION ----
    if (route === '/pitch/end' && method === 'POST') {
      const body = await request.json()
      const { session_id } = body || {}
      if (!session_id) return json({ error: 'session_id required' }, 400)
      const session = await db.collection('sessions').findOne({ id: session_id })
      if (!session) return json({ error: 'session not found' }, 404)
      if (session.verdict) {
        const { _id, ...clean } = session
        return json({ verdict: session.verdict, gaps: session.gaps, scorecard: session.scorecard })
      }
      const startup = await db.collection('startups').findOne({ id: session.startup_id })
      const panel = getPanel(session.panel_id)

      const messages = [
        { role: 'system', content: deliberationSystem(panel) },
        { role: 'user', content: buildDeliberationUser(session, startup) },
      ]
      let result
      try {
        result = await callLLMJson(messages, { maxTokens: 2600 })
      } catch (e) {
        return json({ error: 'ai_unavailable', detail: String(e.message || e) }, 502)
      }
      if (!result || !result.verdict) return json({ error: 'ai_bad_response' }, 502)

      // previous score for delta
      const prevSession = await db.collection('sessions').find({ startup_id: session.startup_id, verdict: { $ne: null } }).sort({ ended_at: -1 }).limit(1).toArray()
      const previous_score = prevSession[0]?.verdict?.final_score ?? null

      const gaps = (result.gaps || []).map((g) => ({
        id: uuidv4(), session_id, startup_id: session.startup_id,
        category: g.category || '', severity: g.severity || 'P1', panel_source: g.panel_source || '',
        transcript_evidence: g.transcript_evidence || '', why_it_matters: g.why_it_matters || '',
        recommended_action: g.recommended_action || '', required_evidence: g.required_evidence || '',
        status: 'OPEN', created_at: new Date(),
      }))

      const verdict = {
        final_score: Math.round(Number(result.final_score) || 0),
        previous_score,
        confidence: Math.round(Number(result.confidence) || 0),
        verdict: result.verdict,
        consensus: result.consensus || [],
        disagreements: result.disagreements || [],
        investment_conditions: result.investment_conditions || [],
        strongest_dimension: result.strongest_dimension || '',
        weakest_dimension: result.weakest_dimension || '',
        unresolved_questions: result.unresolved_questions || [],
        created_at: new Date(),
      }
      const scorecard = (result.scorecard || []).map((s) => ({
        dimension: s.dimension, score: Number(s.score) || 0, reason: s.reason || '',
      }))

      await db.collection('sessions').updateOne({ id: session_id }, {
        $set: { verdict, gaps, scorecard, status: 'ended', ended_at: new Date() },
      })
      return json({ verdict, gaps, scorecard })
    }

    // ---- GAP status update ----
    if (route === '/gaps/update' && method === 'POST') {
      const body = await request.json()
      const { session_id, gap_id, status } = body || {}
      await db.collection('sessions').updateOne(
        { id: session_id, 'gaps.id': gap_id },
        { $set: { 'gaps.$.status': status || 'RESOLVED' } }
      )
      return json({ ok: true })
    }

    // ---- AI REWRITE ----
    if (route === '/rewrite' && method === 'POST') {
      const body = await request.json()
      const { session_id, gap_ids, length } = body || {}
      if (!session_id) return json({ error: 'session_id required' }, 400)
      const session = await db.collection('sessions').findOne({ id: session_id })
      if (!session) return json({ error: 'session not found' }, 404)
      const startup = await db.collection('startups').findOne({ id: session.startup_id })
      const allGaps = session.gaps || []
      let selected = allGaps.filter((g) => (gap_ids || []).includes(g.id))
      if (!selected.length) selected = allGaps.filter((g) => g.severity === 'P0')
      if (!selected.length) selected = allGaps

      const messages = [
        { role: 'system', content: rewriteSystem(length || '90s') },
        { role: 'user', content: buildRewriteUser(session, startup, selected) },
      ]
      let result
      try { result = await callLLMJson(messages, { maxTokens: 2600 }) }
      catch (e) { return json({ error: 'ai_unavailable', detail: String(e.message || e) }, 502) }
      if (!result || !result.sections) return json({ error: 'ai_bad_response' }, 502)

      const version = {
        id: uuidv4(), startup_id: session.startup_id, session_id,
        title: result.title || `${startup?.name || 'Pitch'} — rewrite`,
        sections: result.sections, flagged: result.flagged || [],
        length: length || '90s', score: session.verdict?.final_score ?? null,
        addressed_gaps: selected.map((g) => ({ id: g.id, category: g.category, severity: g.severity })),
        created_at: new Date(), updated_at: new Date(),
      }
      await db.collection('pitch_versions').insertOne(version)
      const { _id, ...clean } = version
      return json(clean)
    }

    if (path[0] === 'versions' && path[1] && method === 'GET') {
      const v = await db.collection('pitch_versions').findOne({ id: path[1] })
      if (!v) return json({ error: 'not found' }, 404)
      const { _id, ...clean } = v
      return json(clean)
    }

    if (route === '/versions' && method === 'GET') {
      const url = new URL(request.url)
      const startupId = url.searchParams.get('startup_id')
      const q = startupId ? { startup_id: startupId } : {}
      const rows = await db.collection('pitch_versions').find(q).sort({ created_at: -1 }).limit(50).toArray()
      return json(rows.map(({ _id, ...r }) => r))
    }

    if (path[0] === 'versions' && path[1] && method === 'PUT') {
      const body = await request.json()
      const set = { updated_at: new Date() }
      if (body.sections) set.sections = body.sections
      if (body.title) set.title = body.title
      await db.collection('pitch_versions').updateOne({ id: path[1] }, { $set: set })
      const v = await db.collection('pitch_versions').findOne({ id: path[1] })
      const { _id, ...clean } = v
      return json(clean)
    }

    // ---- FOUNDER STUDIO aggregate ----
    if (route === '/studio' && method === 'GET') {
      const url = new URL(request.url)
      const startupId = url.searchParams.get('startup_id')
      if (!startupId) return json({ error: 'startup_id required' }, 400)
      const startup = await db.collection('startups').findOne({ id: startupId })
      const sessions = await db.collection('sessions').find({ startup_id: startupId }).sort({ started_at: 1 }).toArray()
      const versions = await db.collection('pitch_versions').find({ startup_id: startupId }).sort({ created_at: -1 }).toArray()

      const claims = []
      const gaps = []
      const score_history = []
      for (const s of sessions) {
        for (const c of (s.claims || [])) claims.push({ ...c, round: s.round_number, session_id: s.id })
        for (const g of (s.gaps || [])) gaps.push({ ...g, round: s.round_number, session_id: s.id })
        if (s.verdict) {
          const dims = {}; (s.scorecard || []).forEach((sc) => { dims[sc.dimension] = sc.score })
          score_history.push({ round: s.round_number, session_id: s.id, score: s.verdict.final_score, verdict: s.verdict.verdict, dims })
        }
      }
      const sessionSummaries = sessions.map(({ _id, transcript, ...r }) => ({ id: r.id, round_number: r.round_number, status: r.status, mode: r.mode, panel_name: r.panel_name, is_demo: r.is_demo || false, started_at: r.started_at, verdict: r.verdict ? { final_score: r.verdict.final_score, verdict: r.verdict.verdict } : null, turns: (transcript || []).length }))
      return json({
        startup: startup ? (({ _id, ...r }) => r)(startup) : null,
        sessions: sessionSummaries,
        claims: claims.map(({ _id, ...c }) => c),
        gaps: gaps.map(({ _id, ...g }) => g),
        versions: versions.map(({ _id, ...v }) => v),
        score_history,
      })
    }

    // ---- DEMO seed (FlowPay) ----
    if (route === '/demo/seed' && method === 'POST') {
      const body = await request.json()
      const user_id = body?.user_id || null
      let startup = await db.collection('startups').findOne({ user_id, is_demo: true, name: 'FlowPay' })
      if (startup) {
        const sessions = await db.collection('sessions').find({ startup_id: startup.id }).sort({ round_number: 1 }).toArray()
        const { _id, ...cleanStartup } = startup
        return json({ startup: cleanStartup, session_ids: sessions.map((s) => s.id) })
      }
      startup = {
        id: uuidv4(), user_id, is_demo: true,
        name: 'FlowPay', founder: 'Demo Founder', industry: 'Fintech', stage: 'Seed',
        one_liner: 'UPI-based B2B payments platform for small merchants in India',
        problem: 'Small merchants struggle to accept and reconcile digital payments reliably',
        customer: 'Small B2B merchants in tier-2 Indian cities', solution: 'One-tap UPI collection + instant settlement + reconciliation',
        business_model: 'Take rate per transaction', pricing: '0.4% per transaction', revenue: 'Early revenue',
        customers: '50', cac: '\u20b9200 (claimed)', retention: 'Not yet shown', market_size: '\u20b94,000 crore (top-down)',
        competitors: 'Razorpay, PhonePe for Business', differentiation: 'Faster settlement', moat: 'Merchant relationships',
        gtm: 'Paid acquisition', traction: '50 paying merchants', fundraising_status: 'Raising seed', evidence: 'Limited',
        created_at: new Date(), updated_at: new Date(),
      }
      await db.collection('startups').insertOne(startup)
      const s1 = buildDemoSession1(startup.id, user_id)
      const s2 = buildDemoSession2(startup.id, user_id)
      // stamp session_id into claims
      s1.claims = (s1.claims || []).map((c) => ({ ...c, session_id: s1.id }))
      s1.gaps = (s1.gaps || []).map((g) => ({ ...g, session_id: s1.id }))
      s2.gaps = (s2.gaps || []).map((g) => ({ ...g, session_id: s2.id }))
      await db.collection('sessions').insertMany([s1, s2])
      const { _id, ...cleanStartup } = startup
      return json({ startup: cleanStartup, session_ids: [s1.id, s2.id] })
    }

    // ==================================================== MENTORS
    if (route === '/mentors/seed' && method === 'POST') {
      await ensureMentors(db)
      const n = await db.collection('mentors').countDocuments()
      return json({ ok: true, count: n })
    }
    if (route === '/mentors' && method === 'GET') {
      await ensureMentors(db)
      const url = new URL(request.url)
      const city = url.searchParams.get('city')
      const expertise = url.searchParams.get('expertise')
      const tier = url.searchParams.get('experience_tier')
      const q = {}
      if (city && city !== 'All') q.city = city
      if (tier && tier !== 'All') q.experience_tier = tier
      if (expertise && expertise !== 'All') q.expertise = expertise
      const rows = await db.collection('mentors').find(q).sort({ rating: -1 }).limit(100).toArray()
      return json(rows.map(({ _id, ...r }) => r))
    }
    if (path[0] === 'mentors' && path[1] && method === 'GET') {
      await ensureMentors(db)
      const m = await db.collection('mentors').findOne({ id: path[1] })
      if (!m) return json({ error: 'not found' }, 404)
      const { _id, ...clean } = m
      return json(clean)
    }

    // ==================================================== BOOKINGS
    if (route === '/bookings' && method === 'POST') {
      const body = await request.json()
      const { user_id, mentor_id, startup_id, date, time } = body || {}
      if (!mentor_id || !date || !time) return json({ error: 'mentor_id, date and time required' }, 400)
      const mentor = await db.collection('mentors').findOne({ id: mentor_id })
      if (!mentor) return json({ error: 'mentor not found' }, 404)
      const booking = {
        id: uuidv4(), user_id: user_id || null, mentor_id,
        mentor_name: mentor.name, mentor_title: mentor.title, mentor_photo: mentor.photo_url, mentor_city: mentor.city,
        startup_id: startup_id || null, date, time, duration: 60,
        amount: mentor.hourly_rate, currency: 'INR', status: 'confirmed', created_at: new Date(),
      }
      await db.collection('bookings').insertOne(booking)
      const { _id, ...clean } = booking
      return json(clean)
    }
    if (route === '/bookings' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('user_id')
      const q = userId ? { user_id: userId } : {}
      const rows = await db.collection('bookings').find(q).sort({ created_at: -1 }).limit(100).toArray()
      return json(rows.map(({ _id, ...r }) => r))
    }

    // ==================================================== INCUBATORS
    if (route === '/incubators/seed' && method === 'POST') {
      await ensureIncubators(db)
      const n = await db.collection('incubators').countDocuments()
      return json({ ok: true, count: n })
    }
    if (route === '/incubators' && method === 'GET') {
      await ensureIncubators(db)
      const url = new URL(request.url)
      const city = url.searchParams.get('city')
      const stage = url.searchParams.get('stage_support')
      const type = url.searchParams.get('type')
      const q = {}
      if (city && city !== 'All') q.city = city
      if (type && type !== 'All') q.type = type
      if (stage && stage !== 'All') q.stage_support = stage
      const rows = await db.collection('incubators').find(q).sort({ name: 1 }).limit(100).toArray()
      return json(rows.map(({ _id, ...r }) => r))
    }
    if (path[0] === 'incubators' && path[1] && method === 'GET') {
      await ensureIncubators(db)
      const i = await db.collection('incubators').findOne({ id: path[1] })
      if (!i) return json({ error: 'not found' }, 404)
      const { _id, ...clean } = i
      return json(clean)
    }

    // ==================================================== CONNECTION REQUESTS
    if (route === '/connection-requests' && method === 'POST') {
      const body = await request.json()
      const { user_id, incubator_id, startup_name, startup_stage, message } = body || {}
      if (!incubator_id || !startup_name) return json({ error: 'incubator_id and startup_name required' }, 400)
      const inc = await db.collection('incubators').findOne({ id: incubator_id })
      if (!inc) return json({ error: 'incubator not found' }, 404)
      const cr = {
        id: uuidv4(), user_id: user_id || null, incubator_id, incubator_name: inc.name,
        incubator_city: inc.city, incubator_type: inc.type,
        startup_name, startup_stage: startup_stage || '', message: message || '',
        status: 'pending', created_at: new Date(),
      }
      await db.collection('connection_requests').insertOne(cr)
      const { _id, ...clean } = cr
      return json(clean)
    }
    if (route === '/connection-requests' && method === 'GET') {
      const url = new URL(request.url)
      const userId = url.searchParams.get('user_id')
      const q = userId ? { user_id: userId } : {}
      const rows = await db.collection('connection_requests').find(q).sort({ created_at: -1 }).limit(100).toArray()
      return json(rows.map(({ _id, ...r }) => r))
    }

    return json({ error: `Route ${route} not found` }, 404)
  } catch (error) {
    console.error('API Error:', error)
    return json({ error: 'Internal server error', detail: String(error?.message || error) }, 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
