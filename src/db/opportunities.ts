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
