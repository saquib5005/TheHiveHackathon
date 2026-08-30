// EchoClash persona + panel seed data (server + client shared shapes)

export const DIMENSIONS = [
  { key: 'problem', label: 'Problem Severity' },
  { key: 'market', label: 'Market Attractiveness' },
  { key: 'founder', label: 'Founder Credibility' },
  { key: 'differentiation', label: 'Differentiation' },
  { key: 'defensibility', label: 'Defensibility' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'economics', label: 'Unit Economics' },
  { key: 'scalability', label: 'Scalability' },
  { key: 'novelty', label: 'Novelty' },
  { key: 'feasibility', label: 'Feasibility' },
];

export const DIM_KEYS = DIMENSIONS.map((d) => d.key);

const A = 'https://static.prod-images.emergentagent.com/jobs/bd1aa4f0-753c-48b5-b19b-8d917cb2cea0/images/';

export const PANELS = [
  {
    id: 'shark',
    name: 'Commercial Panel',
    tagline: 'Shark Tank-style',
    description: 'Deal-hungry operators who care about revenue, margins and whether people will actually pay. Fast, blunt, commercial.',
    focus: ['Revenue', 'Willingness to pay', 'Traction', 'Deal structure'],
    difficulty: 'Medium',
    dimensions: ['economics', 'distribution', 'feasibility'],
    personas: [
      {
        id: 'rajiv', name: 'Rajiv Malhotra', role: 'Commercial Investor', avatar_url: A + 'ea0868de235c0d4342b479d4c4f57d80c93ddf6f1e34cb2f2e1fb4fb8cc69ea2.jpeg',
        primary_lens: 'economics', secondary_lens: 'problem',
        lens_desc: 'revenue, margins, real willingness to pay',
        distrusts: 'vague revenue and "customers love it" claims with no rupees attached',
        style: { directness: 9, aggressiveness: 7, numbers_focus: 8 },
        question_priorities: ['unsupported_claim', 'investment_risk', 'contradiction'],
        weights: { economics: 22, market: 10, problem: 12, differentiation: 8, defensibility: 6, distribution: 10, scalability: 10, founder: 8, novelty: 4, feasibility: 10 },
        risk_tolerance: 5,
      },
      {
        id: 'zara', name: 'Zara Chen', role: 'Traction Skeptic', avatar_url: A + '6ef7feafdd67a98cb630e734019debb16e5d96a08b182fbf97facbf5dc68330b.jpeg',
        primary_lens: 'distribution', secondary_lens: 'problem',
        lens_desc: 'customers, retention, proof of real demand',
        distrusts: 'inflated growth numbers and retention with no cohort evidence',
        style: { directness: 8, aggressiveness: 8, numbers_focus: 7 },
        question_priorities: ['missing_evidence', 'unsupported_claim', 'weakness'],
        weights: { distribution: 20, market: 12, problem: 10, differentiation: 8, defensibility: 6, economics: 12, scalability: 12, founder: 8, novelty: 4, feasibility: 8 },
        risk_tolerance: 4,
      },
      {
        id: 'diego', name: 'Diego Navarro', role: 'Negotiator', avatar_url: A + 'e442ba5c30fbf393432a79d508962df46e75fa515a69a20b0dc4ff542631c4aa.jpeg',
        primary_lens: 'feasibility', secondary_lens: 'defensibility',
        lens_desc: 'valuation, deal structure, founder leverage',
        distrusts: 'unjustified valuations and founders with no leverage or fallback',
        style: { directness: 9, aggressiveness: 6, numbers_focus: 6 },
        question_priorities: ['investment_risk', 'weakness', 'clarification'],
        weights: { feasibility: 16, economics: 16, market: 10, problem: 8, differentiation: 10, defensibility: 12, distribution: 8, scalability: 8, founder: 8, novelty: 4 },
        risk_tolerance: 6,
      },
    ],
  },
  {
    id: 'vc',
    name: 'VC Investment Committee',
    tagline: 'Venture scale',
    description: 'A hard, numerically rigorous committee. They think in fund returns, TAM defensibility and unit-economics truth. Hardest room.',
    focus: ['Market size', 'CAC / LTV', 'Moat', 'Venture scale'],
    difficulty: 'Hard',
    dimensions: ['market', 'economics', 'defensibility'],
    personas: [
      {
        id: 'richard', name: 'Richard Harmon', role: 'Market Skeptic', avatar_url: A + 'abffbe8c8a082dbe05e0a583c36c3a1faa66ec41276995ee209372cd6c214140.jpeg',
        primary_lens: 'market', secondary_lens: 'scalability',
        lens_desc: 'market size, timing, competition, venture-scale potential',
        distrusts: 'top-down TAM inflation and "if we get 1% of a huge market" logic',
        style: { directness: 8, aggressiveness: 7, numbers_focus: 8 },
        question_priorities: ['unsupported_claim', 'contradiction', 'investment_risk'],
        weights: { market: 24, scalability: 14, problem: 12, differentiation: 10, defensibility: 8, distribution: 8, economics: 8, founder: 6, novelty: 6, feasibility: 4 },
        risk_tolerance: 6,
      },
      {
        id: 'priya', name: 'Priya Sundaram', role: 'Economics Auditor', avatar_url: A + 'bebb91537fe0de801dfb80b0259a2de1b25cc6cf9fba8c974c05b4ca99646e63.jpeg',
        primary_lens: 'economics', secondary_lens: 'feasibility',
        lens_desc: 'CAC, LTV, margins, burn and numerical consistency',
        distrusts: 'CAC/LTV numbers that do not reconcile with spend and customer counts',
        style: { directness: 9, aggressiveness: 8, numbers_focus: 10 },
        question_priorities: ['contradiction', 'missing_evidence', 'unsupported_claim'],
        weights: { economics: 28, market: 8, problem: 8, differentiation: 6, defensibility: 6, distribution: 10, scalability: 12, founder: 6, novelty: 2, feasibility: 14 },
        risk_tolerance: 3,
      },
      {
        id: 'james', name: 'James Wei', role: 'Moat Investor', avatar_url: A + 'bd67f4d138895d1456171979c2b9afc03a2cd746db3583b168c2f62ff2782930.jpeg',
        primary_lens: 'defensibility', secondary_lens: 'differentiation',
        lens_desc: 'defensibility, proprietary advantage, switching costs',
        distrusts: 'me-too products with no real moat or switching costs',
        style: { directness: 7, aggressiveness: 6, numbers_focus: 5 },
        question_priorities: ['weakness', 'unsupported_claim', 'clarification'],
        weights: { defensibility: 24, differentiation: 18, novelty: 10, scalability: 12, market: 10, problem: 8, economics: 6, distribution: 6, founder: 4, feasibility: 2 },
        risk_tolerance: 5,
      },
    ],
  },
  {
    id: 'operator',
    name: 'Founder / Operator Panel',
    tagline: 'Builders & operators',
    description: 'People who have actually built and shipped. They probe product depth, distribution reality and whether you are the right founder for this.',
    focus: ['Product depth', 'Distribution', 'Execution', 'Founder-market-fit'],
    difficulty: 'Medium-Hard',
    dimensions: ['feasibility', 'distribution', 'founder'],
    personas: [
      {
        id: 'maya', name: 'Maya Torres', role: 'Product Operator', avatar_url: A + '939ee96d28e8f53c78442796a46664f4ebc9b869c7010b27f87ba7cc3fd6c876.jpeg',
        primary_lens: 'feasibility', secondary_lens: 'differentiation',
        lens_desc: 'product depth, UX, execution quality',
        distrusts: 'shallow products described in buzzwords with no real depth',
        style: { directness: 7, aggressiveness: 5, numbers_focus: 5 },
        question_priorities: ['weakness', 'clarification', 'missing_evidence'],
        weights: { feasibility: 20, differentiation: 16, problem: 14, novelty: 10, scalability: 10, distribution: 8, economics: 6, defensibility: 8, market: 4, founder: 4 },
        risk_tolerance: 6,
      },
      {
        id: 'marcus', name: 'Marcus Osei', role: 'GTM Operator', avatar_url: A + 'b08f465e94d65ed5b21c557a1f5df12fcd277a13f5155f8edbed5d90770d03bd.jpeg',
        primary_lens: 'distribution', secondary_lens: 'economics',
        lens_desc: 'acquisition, distribution, first 100 customers',
        distrusts: 'no repeatable acquisition channel beyond "word of mouth"',
        style: { directness: 8, aggressiveness: 6, numbers_focus: 7 },
        question_priorities: ['missing_evidence', 'unsupported_claim', 'weakness'],
        weights: { distribution: 24, economics: 14, market: 10, scalability: 12, problem: 10, differentiation: 8, defensibility: 6, founder: 6, novelty: 4, feasibility: 6 },
        risk_tolerance: 5,
      },
      {
        id: 'helen', name: 'Helen Vasquez', role: 'Founder-Market-Fit', avatar_url: A + '8a67618b96ea964ac54e32b25601b219f5fddfac352519052f4c90e740881d3a.jpeg',
        primary_lens: 'founder', secondary_lens: 'problem',
        lens_desc: 'domain insight and execution credibility',
        distrusts: 'founders with no earned insight into the problem they picked',
        style: { directness: 6, aggressiveness: 4, numbers_focus: 4 },
        question_priorities: ['clarification', 'weakness', 'missing_evidence'],
        weights: { founder: 22, problem: 16, feasibility: 12, differentiation: 10, distribution: 8, market: 8, defensibility: 6, economics: 6, scalability: 6, novelty: 6 },
        risk_tolerance: 6,
      },
    ],
  },
];

export const HERO_IMAGE = A + '5892b5c1d1046d2dd0347044960c6808143deb8888fe48d1b4cb9efcbf0ba009.jpeg';

export function getPanel(id) {
  return PANELS.find((p) => p.id === id) || null;
}

export function initialBeliefs(panel) {
  const b = {};
  for (const persona of panel.personas) {
    b[persona.id] = {};
    for (const k of DIM_KEYS) b[persona.id][k] = 5;
  }
  return b;
}
