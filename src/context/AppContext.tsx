import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Opportunity,
  calculateOpportunityMatch,
} from '../db/opportunities';
import {
  UserProfile,
  loadUserProfile,
  saveUserProfile,
  clearUserProfile,
  EMPTY_USER_PROFILE,
} from '../db/userProfile';
import {
  MemoryEntry,
  SkillItem,
  LogEntry,
  INITIAL_SKILLS,
} from '../data';
import { CATALOG_SKILLS } from '../db/quizCatalog';
import { catalogToOpportunities } from '../lib/catalog';
import { clearMembership } from '../lib/cohorts';
import { networkClient } from '../lib/network';

interface PrivacySettings {
  storeMemoryLocal: boolean;
  restrictOpenShellSandbox: boolean;
  sendUnmaskedCloudApis: boolean;
}

interface AppContextType {
  userProfile: UserProfile;
  opportunities: Opportunity[];
  skills: SkillItem[];
  memoryEntries: MemoryEntry[];
  logs: LogEntry[];
  privacySettings: PrivacySettings;
  maskedCountThisSession: number;
  fieldsMaskedPerRequest: number;
  activeHoveredMemoryId: string;
  isTavilyScanning: boolean;
  /** True once the first radar load has finished, whether or not it found anything. */
  radarReady: boolean;
  activeQuizSkill: SkillItem | null;
  selectedOpportunityForDraft: Opportunity | null;
  selectedOpportunityForGaps: Opportunity | null;
  isOnboardingOpen: boolean;

  // Backend simulation decoupling
  openShellStatus: 'ACTIVE' | 'PAUSED';
  nebiusApiStatus: 'CONNECTED' | 'STANDBY';
  toggleOpenShellStatus: () => void;
  toggleNebiusApiStatus: () => void;

  // Actions
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setIsOnboardingOpen: (open: boolean) => void;
  setActiveHoveredMemoryId: (id: string) => void;
  runTavilySearch: () => void;
  openSkillQuiz: (skill: SkillItem) => void;
  closeSkillQuiz: () => void;
  verifySkill: (skillId: string, score: number) => void;
  addMemoryEntry: (category: MemoryEntry['category'], text: string, targets: string[]) => void;
  updateMemoryEntry: (id: string, text: string) => void;
  deleteMemoryEntry: (id: string) => void;
  togglePrivacySetting: (key: keyof PrivacySettings) => void;
  addLog: (tag: LogEntry['tag'], message: string, isWarning?: boolean) => void;
  triggerBlockedSandboxAction: () => void;
  setSelectedOpportunityForDraft: (opp: Opportunity | null) => void;
  setSelectedOpportunityForGaps: (opp: Opportunity | null) => void;
  incrementMaskedCount: (count?: number) => void;
  getRawMemoryMarkdown: () => string;
  resetToDefaultProfile: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const MEMORY_STORAGE_KEY = 'qadam_memory_md';
const LEGACY_MEMORY_STORAGE_KEY = 'pathfinder_memory_md';

function serializeMemoryToMarkdown(entries: MemoryEntry[]): string {
  let md = '# QADAM Local Agent Memory (MEMORY.md)\n\n';
  const categories = ['PREFERENCES', 'CONSTRAINTS', 'SKILLS', 'GOALS'] as const;

  categories.forEach((cat) => {
    md += `## ${cat}\n`;
    const inCat = entries.filter((e) => e.category === cat);
    if (inCat.length === 0) {
      md += '_No records registered._\n\n';
    } else {
      inCat.forEach((e) => {
        md += `- [${e.timestamp}] ${e.text} <!-- targets:${e.targets.join(',')} -->\n`;
      });
      md += '\n';
    }
  });

  return md;
}

function parseMemoryFromMarkdown(md: string): MemoryEntry[] {
  try {
    const lines = md.split('\n');
    let currentCat: MemoryEntry['category'] = 'PREFERENCES';
    const entries: MemoryEntry[] = [];
    let counter = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) {
        const catName = trimmed.replace('## ', '').trim() as MemoryEntry['category'];
        if (['PREFERENCES', 'CONSTRAINTS', 'SKILLS', 'GOALS'].includes(catName)) {
          currentCat = catName;
        }
      } else if (trimmed.startsWith('- [')) {
        const match = trimmed.match(/- \[([^\]]+)\] (.*?)(?:<!-- targets:(.*?) -->)?$/);
        if (match) {
          const timestamp = match[1];
          const text = match[2].trim();
          const targets = match[3] ? match[3].split(',').map((t) => t.trim()) : [];
          entries.push({
            id: `mem-${counter++}`,
            category: currentCat,
            timestamp,
            text,
            targets,
          });
        }
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load user profile from dedicated user_profile DB storage
  const [userProfile, setUserProfileState] = useState<UserProfile>(() => {
    return loadUserProfile();
  });

  const [isOnboardingOpen, setIsOnboardingOpenState] = useState<boolean>(false);

  const setIsOnboardingOpen = (open: boolean) => {
    setIsOnboardingOpenState(open);
  };
  const [skills, setSkills] = useState<SkillItem[]>(() => {
    const profile = loadUserProfile();
    return [...INITIAL_SKILLS, ...CATALOG_SKILLS].map((item) => {
      if (profile.skills && profile.skills.some((ps) => ps.toLowerCase() === item.name.toLowerCase())) {
        return { ...item, status: 'UNVERIFIED' as const };
      }
      return { ...item, status: 'MISSING' as const };
    });
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeHoveredMemoryId, setActiveHoveredMemoryId] = useState<string>('');
  const [isTavilyScanning, setIsTavilyScanning] = useState<boolean>(false);
  const [radarReady, setRadarReady] = useState(false);
  const [activeQuizSkill, setActiveQuizSkill] = useState<SkillItem | null>(null);
  const [selectedOpportunityForDraft, setSelectedOpportunityForDraft] = useState<Opportunity | null>(null);
  const [selectedOpportunityForGaps, setSelectedOpportunityForGaps] = useState<Opportunity | null>(null);
  const [maskedCountThisSession, setMaskedCountThisSession] = useState<number>(0);
  const fieldsMaskedPerRequest = 0;

  // Backend simulation status decoupling
  const [openShellStatus, setOpenShellStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED');
  const [nebiusApiStatus, setNebiusApiStatus] = useState<'CONNECTED' | 'STANDBY'>('STANDBY');

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    storeMemoryLocal: true,
    restrictOpenShellSandbox: true,
    sendUnmaskedCloudApis: false,
  });

  const verifiedSkillNames = useMemo(() => {
    return skills.filter((s) => s.status === 'VERIFIED').map((s) => s.name);
  }, [skills]);

  // Load opportunities from dedicated DB service
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [serverOpportunities, setServerOpportunities] = useState<Opportunity[] | null>(null);

  // Re-rank opportunities whenever user skills or verified skills change
  useEffect(() => {
    const entries = serverOpportunities ?? [];
    setOpportunities(entries.map((opp) => ({
      ...opp,
      match: opp.skills.length ? calculateOpportunityMatch(opp.skills, userProfile.skills, verifiedSkillNames) : 0,
    })));
  }, [userProfile.skills, verifiedSkillNames, serverOpportunities]);

  // Load agent memory from localStorage (100% empty on fresh state)
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(MEMORY_STORAGE_KEY) || localStorage.getItem(LEGACY_MEMORY_STORAGE_KEY);
      if (saved) {
        return parseMemoryFromMarkdown(saved);
      }
    } catch (e) {
      console.warn('localStorage memory read failed:', e);
    }
    return [];
  });

  // Keep localStorage synchronized with memoryEntries
  useEffect(() => {
    try {
      const md = serializeMemoryToMarkdown(memoryEntries);
      localStorage.setItem(MEMORY_STORAGE_KEY, md);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [memoryEntries]);

  const addLog = (tag: LogEntry['tag'], message: string, isWarning = false) => {
    const now = new Date();
    const timeStr = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join(':');

    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: timeStr,
        tag,
        message,
        isWarning,
      },
    ]);
  };

  const toggleOpenShellStatus = () => {
    setOpenShellStatus((prev) => {
      const next = prev === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      addLog('SANDBOX', `OpenShell runtime simulation state: ${next}`);
      return next;
    });
  };

  const toggleNebiusApiStatus = () => {
    setNebiusApiStatus((prev) => {
      const next = prev === 'CONNECTED' ? 'STANDBY' : 'CONNECTED';
      addLog('MODEL', `Nebius API connection simulation state: ${next}`);
      return next;
    });
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfileState((prev) => {
      const next: UserProfile = {
        ...prev,
        ...updates,
        isOnboarded: true,
      };

      saveUserProfile(next);

      // Automatically sync skill status if user selected Docker or PyTorch
      if (updates.skills) {
        setSkills((sList) =>
          sList.map((s) => {
            if (updates.skills?.includes(s.name) && s.status === 'MISSING') {
              return { ...s, status: 'UNVERIFIED' };
            }
            return s;
          })
        );
      }

      addLog('SYSTEM', `User profile updated: ${next.name} (${next.university || 'Offline'})`);
      addLog('MODEL', 'Re-computing opportunity compatibility matrix for updated profile');
      return next;
    });
  };

  const resetToDefaultProfile = () => {
    clearUserProfile();
    // Logging out also ends cohort access and the account session on this device.
    clearMembership();
    networkClient?.auth.signOut().catch(() => undefined);
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_MEMORY_STORAGE_KEY);
    localStorage.removeItem('qadam_user');
    localStorage.removeItem('pathfinder_user');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('qadam_memory_entries');
    localStorage.removeItem('pathfinder_memory_entries');
    localStorage.removeItem('qadam_teammates');
    localStorage.removeItem('pathfinder_teammates');
    localStorage.removeItem('qadam_teams');
    localStorage.removeItem('pathfinder_teams');
    localStorage.removeItem('qadam_network_chats');
    localStorage.removeItem('pathfinder_network_chats');
    setMemoryEntries([]);
    setActiveHoveredMemoryId('');
    setUserProfileState(EMPTY_USER_PROFILE);
    setIsOnboardingOpen(true);
    // Unconditionally reload window so whole application resets cleanly to onboarding
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const incrementMaskedCount = (count = 4) => {
    setMaskedCountThisSession((prev) => prev + count);
  };

  // The verified program catalog. A failure here never hides the dated feed.
  const loadCatalog = async (today: string): Promise<Opportunity[]> => {
    try {
      const response = await fetch('/data/programs.json', { cache: 'no-store' });
      if (!response.ok) return [];
      return catalogToOpportunities(await response.json(), today);
    } catch {
      return [];
    }
  };

  const runTavilySearch = async () => {
    if (isTavilyScanning) return;
    setIsTavilyScanning(true);
    let catalog: Opportunity[] = [];
    try {
      catalog = await loadCatalog(new Date().toISOString().slice(0, 10));
      // Local development may use the read-only API. Production reads a static
      // file published by the scheduled GitHub Actions scan.
      const localApi = import.meta.env.DEV && import.meta.env.VITE_QADAM_API_URL;
      const url = localApi
        ? `${import.meta.env.VITE_QADAM_API_URL.replace(/\/$/, '')}/api/opportunities`
        : '/data/opportunities.json';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Radar data responded ${response.status}`);
      const data = await response.json() as { results?: Array<{
        id: string; type: Opportunity['type']; title: string; organization: string;
        deadline: string | null; url: string; eligibility: string; skills: string[]; summary?: string; location?: string; countries?: string[]; deadlineEvidence?: string;
      }> } | Array<{
        id: string; type: Opportunity['type']; title: string; organization: string;
        deadline: string | null; url: string; eligibility: string; skills: string[]; summary?: string; location?: string; countries?: string[]; deadlineEvidence?: string;
      }>;
      const results = Array.isArray(data) ? data : data.results;
      if (!Array.isArray(results)) throw new Error('Radar data format is invalid');
      if (results.length === 0) {
        setServerOpportunities(catalog);
        addLog('SYSTEM', 'No sourced opportunities have been published yet.');
        return;
      }
      // A skipped or failed scheduled run must not show an expired deadline.
      const today = new Date().toISOString().slice(0, 10);
      const currentResults = results.filter((item) =>
        item.deadline && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline) && item.deadline >= today &&
        item.organization && !/^unknown$/i.test(item.organization.trim()) &&
        item.title && !/^unknown$/i.test(item.title.trim()) &&
        /^https:\/\/[^\s]+$/i.test(item.url || ''));
      // Older feeds could contain duplicate ids; React needs unique keys.
      const seenIds = new Set<string>();
      const uniqueId = (id: string) => {
        let next = id, n = 2;
        while (seenIds.has(next)) next = `${id}-${n++}`;
        seenIds.add(next);
        return next;
      };
      const mapped: Opportunity[] = currentResults.map((item) => ({
        id: uniqueId(item.id),
        type: item.type,
        title: item.title,
        organization: item.organization,
        orgKey: 'general',
        deadline: item.deadline ? `Due ${item.deadline}` : 'Deadline: see official page',
        deadlineDate: item.deadline || '',
        match: 0,
        // The card shows the short summary. The eligibility quote and the deadline quote from the
        // source page go to the details panel.
        description: item.summary || 'Details and eligibility are on the official page.',
        skills: item.skills || [],
        url: item.url,
        // Location and countries come from the source text; empty when not stated.
        location: item.location || '',
        countries: item.countries || [],
        award: '',
        details: {
          about: item.summary,
          eligibility: item.eligibility && item.eligibility !== 'check source' ? item.eligibility : undefined,
          timing: item.deadlineEvidence ? `The source page says: "${item.deadlineEvidence}"` : undefined,
        },
      }));
      // Dated feed items first, then the catalog. A catalog entry with the same link as a feed item is skipped.
      const feedUrls = new Set(mapped.map((item) => item.url));
      const merged = [...mapped, ...catalog.filter((item) => !feedUrls.has(item.url))];
      setServerOpportunities(merged);
      addLog('SYSTEM', `Loaded ${mapped.length} sourced opportunities and ${merged.length - mapped.length} catalog programs`);
    } catch (err) {
      // The dated feed is down, but the verified catalog can still be shown.
      setServerOpportunities((prev) => prev ?? catalog);
      addLog('SYSTEM', err instanceof Error ? `Radar unavailable: ${err.message}` : 'Radar unavailable');
    } finally {
      setIsTavilyScanning(false);
      setRadarReady(true);
    }
  };

  useEffect(() => {
    void runTavilySearch();
  }, []);

  const openSkillQuiz = (skill: SkillItem) => {
    setActiveQuizSkill(skill);
  };

  const closeSkillQuiz = () => {
    setActiveQuizSkill(null);
  };

  const verifySkill = (skillId: string, score: number) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, status: 'VERIFIED', score } : s))
    );

    const targetSkill = skills.find((s) => s.id === skillId);
    const skillName = targetSkill ? targetSkill.name : skillId;

    // Ensure skill is also in user's profile skills
    setUserProfileState((prev) => {
      const updatedSkills = prev.skills.includes(skillName)
        ? prev.skills
        : [...prev.skills, skillName];
      const updated = {
        ...prev,
        skills: updatedSkills,
      };
      saveUserProfile(updated);
      return updated;
    });

    addLog('SANDBOX', `Skill Lab test passed: ${skillName} marked as VERIFIED (${score}%)`);
    addLog('SYSTEM', `ATS resume index updated with verified ${skillName} badge`);
  };

  const addMemoryEntry = (category: MemoryEntry['category'], text: string, targets: string[]) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newEntry: MemoryEntry = {
      id: `mem-${Date.now()}`,
      category,
      timestamp: dateStr,
      text,
      targets: targets.length > 0 ? targets : ['target-nebius'],
    };

    setMemoryEntries((prev) => [newEntry, ...prev]);
    setActiveHoveredMemoryId(newEntry.id);
    addLog('SYSTEM', `Updated local MEMORY.md: added entry in [${category}]`);
  };

  const updateMemoryEntry = (id: string, text: string) => {
    setMemoryEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
    addLog('SYSTEM', `Updated local MEMORY.md entry ${id}`);
  };

  const deleteMemoryEntry = (id: string) => {
    setMemoryEntries((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeHoveredMemoryId === id && filtered.length > 0) {
        setActiveHoveredMemoryId(filtered[0].id);
      }
      return filtered;
    });
    addLog('SYSTEM', `Deleted entry ${id} from local MEMORY.md`);
  };

  const togglePrivacySetting = (key: keyof PrivacySettings) => {
    if (key === 'sendUnmaskedCloudApis') return; // strictly forbidden
    setPrivacySettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      addLog('SANDBOX', `Security setting changed: ${key} = ${next[key]}`);
      return next;
    });
  };

  const triggerBlockedSandboxAction = () => {
    addLog(
      'SANDBOX WARNING',
      'Agent attempted access to /root/system → BLOCKED BY OPENSHELL',
      true
    );
    addLog('SYSTEM', 'Security policy enforced: Sandbox directory confinement active');
  };

  const getRawMemoryMarkdown = () => {
    return serializeMemoryToMarkdown(memoryEntries);
  };

  return (
    <AppContext.Provider
      value={{
        userProfile,
        opportunities,
        skills,
        memoryEntries,
        logs,
        privacySettings,
        maskedCountThisSession,
        fieldsMaskedPerRequest,
        activeHoveredMemoryId,
        isTavilyScanning,
        radarReady,
        activeQuizSkill,
        selectedOpportunityForDraft,
        selectedOpportunityForGaps,
        isOnboardingOpen,
        openShellStatus,
        nebiusApiStatus,
        toggleOpenShellStatus,
        toggleNebiusApiStatus,
        updateUserProfile,
        setIsOnboardingOpen,
        setActiveHoveredMemoryId,
        runTavilySearch,
        openSkillQuiz,
        closeSkillQuiz,
        verifySkill,
        addMemoryEntry,
        updateMemoryEntry,
        deleteMemoryEntry,
        togglePrivacySetting,
        addLog,
        triggerBlockedSandboxAction,
        setSelectedOpportunityForDraft,
        setSelectedOpportunityForGaps,
        incrementMaskedCount,
        getRawMemoryMarkdown,
        resetToDefaultProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
