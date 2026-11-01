export interface Opportunity {
  id: string;
  type: 'HACKATHON' | 'GRANT' | 'INTERNSHIP';
  title: string;
  organization: string;
  orgKey:
    | 'nebius'
    | 'nvidia'
    | 'mext'
    | 'anthropic'
    | 'cern'
    | 'yc'
    | 'openlab'
    | 'horizon'
    | 'neurips'
    | 'openai'
    | 'google'
    | 'mit'
    | 'meta'
    | 'huggingface'
    | 'linux'
    | 'stanford'
    | 'rust'
    | 'general';
  deadline: string;
  deadlineDate: string;
  match: number;
  description: string;
  skills: string[];
  url?: string;
  location: string;
  award: string;
  /** Countries the source names as eligible or as the host. Empty when not stated. */
  countries?: string[];
  /** Longer facts for the details panel. The card itself shows only the short description. */
  details?: {
    about?: string;
    eligibility?: string;
    timing?: string;
    level?: string[];
    /** ISO date the listing was last checked against its official page (catalog programs). */
    verified?: string;
  };
}

export const OPPORTUNITIES_DATABASE: Opportunity[] = [
  {
    id: 'nebius-nvidia-hackathon',
    type: 'HACKATHON',
    title: 'Nebius x NVIDIA Global AI Hackathon',
    organization: 'Nebius & NVIDIA',
    orgKey: 'nebius',
    deadline: 'Due Oct 30',
    deadlineDate: '2026-10-30',
    match: 94,
    description: 'Build innovative physical AI, multimodal agents, or LLM workflows using Nebius cloud compute and NVIDIA NIM / NeMo stack.',
    skills: ['Python', 'Docker', 'LLMs', 'PyTorch'],
    url: 'https://nebius.com/events',
    location: 'Global / Virtual',
    award: '$50,000 in GPU Compute + Cash',
  },
  {
    id: 'mext-scholarship',
    type: 'GRANT',
    title: 'MEXT Scholarship: Graduate Research in AI',
    organization: 'Ministry of Education, Japan',
    orgKey: 'mext',
    deadline: 'Due Nov 12',
    deadlineDate: '2026-11-12',
    match: 88,
    description: 'Full government sponsorship for graduate research in computer science and applied artificial intelligence at top universities in Japan.',
    skills: ['Research', 'English', 'Python', 'Machine Learning'],
    url: 'https://www.studyinjapan.go.jp/en/smap-stopj-applications-research.html',
    location: 'Tokyo, Japan',
    award: '100% Tuition + Monthly Stipend',
  },
  {
    id: 'ml-engineering-intern',
    type: 'INTERNSHIP',
    title: 'ML Engineering & Systems Intern',
    organization: 'Anthropic',
    orgKey: 'anthropic',
    deadline: 'Due Nov 20',
    deadlineDate: '2026-11-20',
    match: 83,
    description: 'Optimize inference latency and deploy distributed RAG pipelines across GPU clusters. Vector databases and model serving.',
    skills: ['PyTorch', 'Vector DBs', 'SQL', 'Python'],
    url: 'https://www.anthropic.com/careers',
    location: 'San Francisco, CA (Remote eligible)',
    award: '$65 / hour + Relocation stipend',
  },
  {
    id: 'opensource-agents-sprint',
    type: 'HACKATHON',
    title: 'Open-Source AI Agents Sprint',
    organization: 'OpenShell Foundation',
    orgKey: 'general',
    deadline: 'Due Dec 03',
    deadlineDate: '2026-12-03',
    match: 76,
    description: 'Collaborative development of autonomous dev-tools, local sandboxing with OpenShell, and benchmark evaluation for open models.',
    skills: ['Python', 'Go', 'Docker', 'Linux'],
    url: 'https://github.com/NVIDIA/OpenShell',
    location: 'Virtual',
    award: '$25,000 Bounties',
  },
  {
    id: 'student-research-travel-fund',
    type: 'GRANT',
    title: 'NeurIPS / ICRA Student Research Travel Fund',
    organization: 'NeurIPS Foundation',
    orgKey: 'neurips',
    deadline: 'Due Dec 15',
    deadlineDate: '2026-12-15',
    match: 71,
    description: 'Travel and registration grant for undergraduate and masters students presenting peer-reviewed papers at NeurIPS, ICRA, or CVPR.',
    skills: ['Research', 'English', 'Python'],
    url: 'https://neurips.cc/Conferences/2025/FinancialAssistance',
    location: 'North America / Europe',
    award: '$3,500 Conference Travel Grant',
  },
  {
    id: 'backend-intern-go',
    type: 'INTERNSHIP',
    title: 'Backend Systems Developer Intern, Go',
    organization: 'Distributed Systems Corp',
    orgKey: 'general',
    deadline: 'Due Jan 08',
    deadlineDate: '2027-01-08',
    match: 68,
    description: 'High-throughput microservices architecture, gRPC pipelines, distributed caching, and container orchestration with Docker.',
    skills: ['Go', 'Docker', 'gRPC', 'PostgreSQL'],
    location: 'Singapore / Hybrid',
    award: 'Paid Internship',
  },
  {
    id: 'cern-summer-student',
    type: 'INTERNSHIP',
    title: 'CERN Openlab Summer Student Programme',
    organization: 'CERN',
    orgKey: 'cern',
    deadline: 'Due Jan 31',
    deadlineDate: '2027-01-31',
    match: 79,
    description: 'Work on cutting-edge distributed computing, high-performance data processing, and machine learning architectures for LHC experiments.',
    skills: ['Python', 'Linux', 'Docker', 'C++'],
    url: 'https://openlab.cern/',
    location: 'Geneva, Switzerland',
    award: '3,450 CHF / month + Travel',
  },
  {
    id: 'yc-hackathon-2026',
    type: 'HACKATHON',
    title: 'Y Combinator AI Build Sprint',
    organization: 'Y Combinator',
    orgKey: 'yc',
    deadline: 'Due Feb 14',
    deadlineDate: '2027-02-14',
    match: 85,
    description: '48-hour sprint building vertical AI assistants and dev-tools. Top 3 teams receive fast-track interview for the upcoming batch.',
    skills: ['LLMs', 'Python', 'TypeScript', 'Docker'],
    url: 'https://www.ycombinator.com/apply',
    location: 'San Francisco, CA / Hybrid',
    award: '$100,000 Investment + Mentorship',
  },
  {
    id: 'robotics-phys-ai-fellowship',
    type: 'INTERNSHIP',
    title: 'Physical AI & Robotics Research Fellowship',
    organization: 'NVIDIA Robotics Lab',
    orgKey: 'nvidia',
    deadline: 'Due Feb 28',
    deadlineDate: '2027-02-28',
    match: 82,
    description: 'Simulation-to-real transfer, robot embodiment control with NVIDIA Isaac Sim, and multimodal spatial reasoning.',
    skills: ['PyTorch', 'ROS2', 'Python', 'Linux'],
    url: 'https://www.nvidia.com/en-us/about-nvidia/careers/university-recruiting/',
    location: 'Austin, TX / On-site',
    award: '$8,000 / month + Housing',
  },
  {
    id: 'eu-horizon-mobility',
    type: 'GRANT',
    title: 'Horizon Europe Student Research Grant',
    organization: 'European Research Council',
    orgKey: 'horizon',
    deadline: 'Due Mar 15',
    deadlineDate: '2027-03-15',
    match: 74,
    description: 'International student mobility grant supporting collaborative artificial intelligence research and lab stays in Europe.',
    skills: ['Research', 'English', 'Python'],
    url: 'https://marie-sklodowska-curie-actions.ec.europa.eu/',
    location: 'European Union',
    award: '€12,000 Research Fellowship',
  },
  {
    id: 'openai-superalignment-grant',
    type: 'GRANT',
    title: 'OpenAI Superalignment & Safety Research Grant',
    organization: 'OpenAI Safety Initiative',
    orgKey: 'openai',
    deadline: 'Due Mar 30',
    deadlineDate: '2027-03-30',
    match: 81,
    description: 'Academic student grant to support mechanistic interpretability, adversarial robustness, and automated red-teaming research.',
    skills: ['Python', 'PyTorch', 'Research', 'LLMs'],
    url: 'https://openai.com/index/superalignment-fast-grants/',
    location: 'Global / Remote',
    award: '$30,000 Direct Research Grant',
  },
  {
    id: 'deepmind-research-intern',
    type: 'INTERNSHIP',
    title: 'Google DeepMind Research Scientist Intern',
    organization: 'Google DeepMind',
    orgKey: 'google',
    deadline: 'Due Apr 15',
    deadlineDate: '2027-04-15',
    match: 87,
    description: 'Contribute to foundational reasoning models, self-supervised learning, and distributed TPU training clusters.',
    skills: ['Python', 'PyTorch', 'Research', 'C++'],
    url: 'https://deepmind.google/about/careers/',
    location: 'London, UK / New York, NY',
    award: '£5,800 / month + Relocation',
  },
  {
    id: 'mit-emerging-tech-fellowship',
    type: 'GRANT',
    title: 'MIT Media Lab Emerging Tech Visiting Fellowship',
    organization: 'MIT Media Lab',
    orgKey: 'mit',
    deadline: 'Due May 01',
    deadlineDate: '2027-05-01',
    match: 75,
    description: 'Three-month residential fellowship for student builders working on neuro-symbolic AI, edge interfaces, and human-agent interaction.',
    skills: ['Research', 'TypeScript', 'Python', 'ROS2'],
    url: 'https://www.media.mit.edu/',
    location: 'Cambridge, MA',
    award: '$15,000 Stipend + Lab Space',
  },
  {
    id: 'meta-llama-hackathon',
    type: 'HACKATHON',
    title: 'Meta Llama 3 Open Innovation Challenge',
    organization: 'Meta AI',
    orgKey: 'meta',
    deadline: 'Due May 18',
    deadlineDate: '2027-05-18',
    match: 89,
    description: 'Build open-weight agent applications, on-device quantization pipelines, or fine-tuned vertical domain assistants.',
    skills: ['LLMs', 'PyTorch', 'Docker', 'Python'],
    url: 'https://www.llama.com/',
    location: 'Global / Virtual',
    award: '$150,000 in Prizes & Compute',
  },
  {
    id: 'huggingface-robotics-sprint',
    type: 'HACKATHON',
    title: 'Hugging Face Open Robotics & Embodiment Sprint',
    organization: 'Hugging Face & LeRobot',
    orgKey: 'huggingface',
    deadline: 'Due Jun 05',
    deadlineDate: '2027-06-05',
    match: 78,
    description: 'Community sprint building open teleoperation pipelines, dataset curation for humanoid robots, and policy training in PyTorch.',
    skills: ['Python', 'PyTorch', 'ROS2', 'Docker'],
    url: 'https://huggingface.co/lerobot',
    location: 'Virtual',
    award: 'H100 GPU Cluster Hours + Cash',
  },
  {
    id: 'linux-kernel-mentorship',
    type: 'INTERNSHIP',
    title: 'Linux Foundation Systems Kernel Mentorship',
    organization: 'The Linux Foundation',
    orgKey: 'linux',
    deadline: 'Due Jun 20',
    deadlineDate: '2027-06-20',
    match: 72,
    description: 'Full-time mentored engineering on Linux eBPF telemetry, container isolation cgroups, and memory safety subsystem enhancements.',
    skills: ['Linux', 'C++', 'Go', 'Docker'],
    url: 'https://mentorship.lfx.linuxfoundation.org/',
    location: 'Remote',
    award: '$6,000 Stipend / Quarter',
  },
  {
    id: 'stanford-hai-grant',
    type: 'GRANT',
    title: 'Stanford HAI Models in Healthcare & Science Grant',
    organization: 'Stanford Institute for HAI',
    orgKey: 'stanford',
    deadline: 'Due Jul 10',
    deadlineDate: '2027-07-10',
    match: 77,
    description: 'Student funding program supporting interdisciplinary applications of generative models to biological sequence analysis.',
    skills: ['Research', 'Python', 'PyTorch', 'SQL'],
    url: 'https://hai.stanford.edu/research/grant-programs',
    location: 'Stanford, CA / Remote',
    award: '$20,000 Project Budget',
  },
  {
    id: 'rust-foundation-fellowship',
    type: 'GRANT',
    title: 'Rust Foundation Systems Performance Fellowship',
    organization: 'Rust Foundation',
    orgKey: 'rust',
    deadline: 'Due Aug 01',
    deadlineDate: '2027-08-01',
    match: 70,
    description: 'Fellowship for students advancing memory safety in high-concurrency runtimes, WASM sandbox isolation, and compiler codegen.',
    skills: ['Linux', 'Docker', 'Go', 'Research'],
    url: 'https://rustfoundation.org/',
    location: 'Remote',
    award: '$10,000 Fellowship Grant',
  },
];

export function calculateOpportunityMatch(
  opportunitySkills: string[],
  userSkills: string[],
  verifiedSkills: string[] = []
): number {
  // If user has not configured skills, match is 0 (uncalculated)
  if (!userSkills || userSkills.length === 0) return 0;
  if (!opportunitySkills || opportunitySkills.length === 0) return 50;

  let totalWeight = 0;
  let matchedWeight = 0;

  opportunitySkills.forEach((skill) => {
    const weight = 1.0;
    totalWeight += weight;

    const lowerSkill = skill.toLowerCase();
    const hasSkill = userSkills.some(
      (us) => us.toLowerCase() === lowerSkill || lowerSkill.includes(us.toLowerCase())
    );
    const isVerified = verifiedSkills.some(
      (vs) => vs.toLowerCase() === lowerSkill || lowerSkill.includes(vs.toLowerCase())
    );

    if (isVerified) {
      matchedWeight += 1.0;
    } else if (hasSkill) {
      matchedWeight += 0.75;
    }
  });

  if (matchedWeight === 0) return 15;

  const ratio = matchedWeight / totalWeight;
  const score = Math.round(35 + ratio * 61);
  return Math.min(98, Math.max(20, score));
}

export function fetchAllOpportunities(userSkills: string[] = [], verifiedSkills: string[] = []): Opportunity[] {
  return OPPORTUNITIES_DATABASE.map((opp) => ({
    ...opp,
    match: calculateOpportunityMatch(opp.skills, userSkills, verifiedSkills),
  }));
}

