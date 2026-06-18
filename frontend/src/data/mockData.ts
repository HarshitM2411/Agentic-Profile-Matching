import type { Candidate, JobRequirements, MatchReport } from '../types/agent'

export const DEFAULT_REQUIREMENTS: JobRequirements = {
  must_have: ['React', 'JavaScript', '3+ years experience'],
  nice_to_have: ['TypeScript', 'Next.js', 'unit testing'],
  role_level: 'Senior',
  domain: 'Frontend Engineering',
}

export const REFINED_REQUIREMENTS: JobRequirements = {
  must_have: ['React', 'JavaScript', '3+ years experience', 'TypeScript'],
  nice_to_have: ['Next.js', 'unit testing'],
  role_level: 'Senior',
  domain: 'Frontend Engineering',
}

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`

export const MOCK_CANDIDATES: Record<string, Candidate> = {
  john_doe: {
    id: 'john_doe',
    name: 'John Doe',
    role: 'Senior Frontend Engineer',
    score: 0.92,
    skills: ['React', 'TypeScript', 'Next.js'],
    yearsExperience: 5,
    avatar: avatar('John Doe'),
    strengths: [
      'Full match on React and TypeScript with 5 years experience',
      'Led React 18 migration for 1M+ user platform',
      'Active contributor to open-source UI libraries',
    ],
    gaps: ['Limited recent Python backend experience'],
    suggestions: ['Probe system design depth in final round'],
    evidence: [
      '"Built production React + TypeScript apps serving 1M+ users"',
      '"5 years frontend engineering with Next.js and micro-frontends"',
    ],
    verdict: 'HIRE',
  },
  jane_smith: {
    id: 'jane_smith',
    name: 'Jane Smith',
    role: 'Frontend Developer',
    score: 0.78,
    skills: ['React', 'Vue', 'JavaScript'],
    yearsExperience: 4,
    avatar: avatar('Jane Smith'),
    strengths: ['Strong React experience across 4 years', 'Solid component architecture skills'],
    gaps: ['No TypeScript experience listed', 'Primary framework experience includes Vue'],
    suggestions: ['Assess willingness to adopt TypeScript quickly'],
    evidence: ['"4 years building React and Vue SPAs at scale"'],
    verdict: 'BORDERLINE',
  },
  alex_kumar: {
    id: 'alex_kumar',
    name: 'Alex Kumar',
    role: 'Frontend Developer',
    score: 0.71,
    skills: ['React', 'JavaScript'],
    yearsExperience: 2,
    avatar: avatar('Alex Kumar'),
    strengths: ['Solid React fundamentals', 'Good JavaScript depth for mid-level work'],
    gaps: ['Only 2 years experience — below 3+ requirement', 'No TypeScript exposure'],
    suggestions: ['Consider for mid-level pipeline if senior bar is flexible'],
    evidence: ['"2 years React development in agile product teams"'],
    verdict: 'NO-HIRE',
  },
  priya_nair: {
    id: 'priya_nair',
    name: 'Priya Nair',
    role: 'Full Stack Engineer',
    score: 0.68,
    skills: ['Angular', 'React', 'TypeScript'],
    yearsExperience: 6,
    avatar: avatar('Priya Nair'),
    strengths: ['6 years experience', 'TypeScript proficiency'],
    gaps: ['Angular is primary framework, not React-first profile'],
    verdict: 'NO-HIRE',
  },
  sam_wilson: {
    id: 'sam_wilson',
    name: 'Sam Wilson',
    role: 'Junior Frontend Developer',
    score: 0.55,
    skills: ['React'],
    yearsExperience: 1,
    avatar: avatar('Sam Wilson'),
    strengths: ['Early React exposure'],
    gaps: ['Only 1 year experience', 'Missing senior-level depth'],
    verdict: 'NO-HIRE',
  },
}

export const INITIAL_SHORTLIST = [
  'john_doe',
  'jane_smith',
  'alex_kumar',
  'priya_nair',
  'sam_wilson',
]

export const REFINED_SHORTLIST = [
  'john_doe',
  'priya_nair',
  'jane_smith',
  'alex_kumar',
  'sam_wilson',
]

export const REFINED_SCORES: Record<string, number> = {
  john_doe: 0.92,
  priya_nair: 0.74,
  jane_smith: 0.61,
  alex_kumar: 0.58,
  sam_wilson: 0.45,
}

export const REFINED_DELTAS = {
  jane_smith: {
    positionChange: -3,
    scoreChange: -0.17,
    reason: 'TypeScript moved to must-have; Jane has no TS experience',
  },
  priya_nair: {
    positionChange: 2,
    scoreChange: 0.06,
    reason: 'TypeScript match boosts Priya despite React-not-primary gap',
  },
}

export const MATCH_REPORTS: Record<string, MatchReport> = {
  john_doe: {
    overallScore: 92,
    breakdown: { mustHaves: 95, niceToHaves: 90, experience: 95, domain: 88 },
    strengths: MOCK_CANDIDATES.john_doe.strengths,
    gaps: MOCK_CANDIDATES.john_doe.gaps,
    suggestions: MOCK_CANDIDATES.john_doe.suggestions ?? [],
    evidence: MOCK_CANDIDATES.john_doe.evidence ?? [],
  },
  jane_smith: {
    overallScore: 78,
    breakdown: { mustHaves: 70, niceToHaves: 65, experience: 85, domain: 80 },
    strengths: MOCK_CANDIDATES.jane_smith.strengths,
    gaps: MOCK_CANDIDATES.jane_smith.gaps,
    suggestions: MOCK_CANDIDATES.jane_smith.suggestions ?? [],
    evidence: MOCK_CANDIDATES.jane_smith.evidence ?? [],
    previousRank: 2,
    previousScore: 78,
  },
  alex_kumar: {
    overallScore: 71,
    breakdown: { mustHaves: 65, niceToHaves: 40, experience: 55, domain: 70 },
    strengths: MOCK_CANDIDATES.alex_kumar.strengths,
    gaps: MOCK_CANDIDATES.alex_kumar.gaps,
    suggestions: MOCK_CANDIDATES.alex_kumar.suggestions ?? [],
    evidence: MOCK_CANDIDATES.alex_kumar.evidence ?? [],
  },
  priya_nair: {
    overallScore: 68,
    breakdown: { mustHaves: 60, niceToHaves: 70, experience: 85, domain: 55 },
    strengths: MOCK_CANDIDATES.priya_nair.strengths,
    gaps: MOCK_CANDIDATES.priya_nair.gaps,
    suggestions: ['Evaluate React depth in a technical screen'],
    evidence: ['"6 years full-stack engineering across Angular and React projects"'],
  },
  sam_wilson: {
    overallScore: 55,
    breakdown: { mustHaves: 50, niceToHaves: 30, experience: 30, domain: 65 },
    strengths: MOCK_CANDIDATES.sam_wilson.strengths,
    gaps: MOCK_CANDIDATES.sam_wilson.gaps,
    suggestions: ['Revisit in 12–18 months after more production experience'],
    evidence: ['"1 year React development on a consumer product team"'],
  },
}

export const INTERVIEW_QUESTIONS: Record<string, string[]> = {
  john_doe: [
    'Walk us through the React 18 migration you led — what were the biggest technical risks?',
    'How do you structure TypeScript types across a large micro-frontend codebase?',
    'Describe a performance bottleneck you diagnosed in a React app and how you fixed it.',
    'How do you mentor junior engineers on component architecture?',
    'What trade-offs would you consider when choosing Next.js vs. a custom build setup?',
  ],
}

export const SUGGESTION_CHIPS = [
  'Find React devs with 3+ years',
  'Compare top 3',
  'Why did John rank higher than Jane?',
]

export const QUICK_ACTIONS = [
  'Add TypeScript as must-have',
  'Compare top 3',
  'Show interview questions',
  'Give me the final recommendation',
]

export const THINKING_STEPS = [
  'Parse JD',
  'Extract Requirements',
  'Search Resumes',
  'Rank',
  'Generate Report',
]

export const RADAR_DIMENSIONS = ['React', 'TypeScript', 'Experience', 'Next.js', 'Domain Fit']

export const RADAR_DATA = [
  { skill: 'React', John: 95, Jane: 88, Alex: 75, fullMark: 100 },
  { skill: 'TypeScript', John: 92, Jane: 20, Alex: 15, fullMark: 100 },
  { skill: 'Experience', John: 95, Jane: 80, Alex: 55, fullMark: 100 },
  { skill: 'Next.js', John: 85, Jane: 60, Alex: 40, fullMark: 100 },
  { skill: 'Domain Fit', John: 90, Jane: 75, Alex: 65, fullMark: 100 },
]
