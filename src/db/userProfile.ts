import { QUIZ_CATALOG } from './quizCatalog.data';

export interface NotificationSettings {
  telegram: boolean;
  telegramHandle: string;
  discord: boolean;
  discordWebhook: string;
}

export interface UserProfile {
  name: string;
  surname: string;
  email: string;
  password?: string;
  phone?: string;
  nationalId?: string;
  github?: string;
  linkedin?: string;
  university: string;
  major: string;
  degree?: string;
  years?: string;
  location: string;
  role: string;
  skills: string[];
  goals: string[];
  // Where the person wants to study or work. Empty means anywhere.
  destinations?: string[];
  cvText?: string;
  resumeFileName?: string;
  avatarUrl?: string;
  avatarPreset?: 'emerald' | 'indigo' | 'amber' | 'cyan' | 'purple' | 'rose';
  isPublic: boolean;
  isOnboarded: boolean;
  notifications?: NotificationSettings;
}

// Where a student may want to go. Each name is matched against the countries and location a
// listing's source states (see destinationRank in location.ts).
export const DESTINATION_CHOICES = [
  'Japan',
  'United States',
  'United Kingdom',
  'Europe',
  'South Korea',
  'Canada',
  'Australia',
  'Singapore',
  'China',
  'Online',
] as const;

export const USER_ROLES = [
  'Student / Learner',
  'Researcher / Academic',
  'Software Engineer / Builder',
  'AI Practitioner',
  'Startup Founder / Creator',
] as const;

export const POPULAR_TECH_STACK = [
  'Python',
  'PyTorch',
  'Docker',
  'LLMs',
  'Vector DBs',
  'TypeScript',
  'React',
  'Go',
  'C++',
  'Rust',
  'CUDA',
  'TensorRT',
  'Linux',
  'Git',
  'SQL',
  'PostgreSQL',
  'Redis',
  'gRPC',
  'ROS2',
  'Isaac Sim',
  'Kubernetes',
  'FastAPI',
  'LangChain',
  'LlamaIndex',
  'Hugging Face',
  'JAX',
  'Research',
  'English',
];

// Full searchable skill catalog for autocomplete inputs (popular stack first).
export const SKILLS_DATABASE: string[] = Array.from(
  new Set([
    ...POPULAR_TECH_STACK,
    // Every skill that has a verification quiz
    ...QUIZ_CATALOG.map((t) => t.name),
    // Languages
    'JavaScript', 'Java', 'Kotlin', 'Swift', 'C', 'C#', 'Scala', 'Ruby', 'PHP', 'Dart',
    'Julia', 'R', 'MATLAB', 'Haskell', 'Elixir', 'Lua', 'Zig', 'Solidity', 'Bash', 'PowerShell',
    'Assembly', 'Fortran', 'OCaml', 'Perl', 'Objective-C', 'WebAssembly', 'Verilog', 'VHDL',
    // ML / AI
    'TensorFlow', 'Keras', 'scikit-learn', 'NumPy', 'Pandas', 'Polars', 'SciPy', 'Matplotlib',
    'OpenCV', 'XGBoost', 'LightGBM', 'CatBoost', 'ONNX', 'Triton', 'vLLM', 'TGI', 'Ollama',
    'llama.cpp', 'DeepSpeed', 'Megatron-LM', 'PyTorch Lightning', 'Transformers', 'Diffusers',
    'PEFT / LoRA', 'RLHF', 'Reinforcement Learning', 'Computer Vision', 'NLP', 'Speech Recognition',
    'Multimodal Models', 'RAG', 'Prompt Engineering', 'AI Agents', 'Fine-tuning', 'Quantization',
    'MLOps', 'MLflow', 'Weights & Biases', 'DVC', 'Kubeflow', 'Ray', 'Dask', 'Spark', 'PySpark',
    'NVIDIA NIM', 'NeMo', 'TensorRT-LLM', 'cuDNN', 'Numba', 'OpenAI API', 'Anthropic API',
    'Gemini API', 'DSPy', 'CrewAI', 'AutoGen', 'LangGraph', 'Semantic Kernel', 'Haystack',
    'Pinecone', 'Weaviate', 'Qdrant', 'Milvus', 'Chroma', 'FAISS', 'pgvector', 'Elasticsearch',
    // Robotics / Physical AI
    'ROS', 'Gazebo', 'MuJoCo', 'PyBullet', 'Omniverse', 'SLAM', 'Motion Planning', 'Embedded C',
    'Arduino', 'Raspberry Pi', 'Jetson', 'FPGA', 'Control Theory', 'Sensor Fusion',
    // Web / Mobile
    'Next.js', 'Vue', 'Nuxt', 'Svelte', 'Angular', 'Tailwind CSS', 'HTML', 'CSS', 'Node.js',
    'Express', 'NestJS', 'Deno', 'Bun', 'Django', 'Flask', 'Spring Boot', 'Ruby on Rails',
    'Laravel', '.NET', 'GraphQL', 'REST APIs', 'WebSockets', 'React Native', 'Flutter',
    'SwiftUI', 'Jetpack Compose', 'Electron', 'Tauri', 'Three.js', 'WebGL', 'Vite', 'Webpack',
    // Data / Infra
    'MySQL', 'SQLite', 'MongoDB', 'Cassandra', 'ClickHouse', 'DuckDB', 'Snowflake', 'BigQuery',
    'Kafka', 'RabbitMQ', 'NATS', 'Airflow', 'dbt', 'Terraform', 'Ansible', 'Helm', 'Nginx',
    'AWS', 'GCP', 'Azure', 'Nebius Cloud', 'Cloudflare', 'Vercel', 'Firebase', 'Supabase',
    'CI/CD', 'GitHub Actions', 'GitLab CI', 'Jenkins', 'Prometheus', 'Grafana', 'OpenTelemetry',
    'Distributed Systems', 'Microservices', 'System Design', 'Networking', 'Cybersecurity',
    'Penetration Testing', 'Cryptography', 'Blockchain', 'Web3',
    // Fundamentals / Soft
    'Algorithms', 'Data Structures', 'Linear Algebra', 'Statistics', 'Probability',
    'Calculus', 'Optimization', 'Competitive Programming', 'Unit Testing', 'Technical Writing',
    'Public Speaking', 'Product Management', 'UI/UX Design', 'Figma', 'Data Analysis',
    'Data Visualization', 'Excel', 'Tableau', 'Power BI', 'Kazakh', 'Russian', 'Korean',
    'Japanese', 'German', 'Chinese', 'IELTS', 'TOEFL',
  ])
);

export const CAREER_OBJECTIVES = [
  'MEXT Scholarship (Japan)',
  'University Admissions Abroad',
  'Top GPA (4.0 Track)',
  'Global Hackathons & Bounties',
  'Graduate Research Scholarships Abroad',
  'ML Engineering & Systems Internships',
  'Physical AI & Humanoid Robotics',
  'Conference Travel Grants (NeurIPS/CVPR)',
  'Open-Source Developer Grants',
  'Undergraduate Exchange Programs',
  'Summer Schools & Research Camps',
  'Startup Accelerators & Incubators',
  'Big Tech Software Internships',
  'Competitive Programming (ICPC, Olympiads)',
  'AI Safety & Alignment Fellowships',
  'Cloud & GPU Compute Credits',
  'Remote Freelance & Paid Bounties',
];

export const EMPTY_USER_PROFILE: UserProfile = {
  name: '',
  surname: '',
  email: '',
  password: '',
  phone: '',
  nationalId: '',
  github: '',
  linkedin: '',
  university: '',
  major: '',
  degree: '',
  years: '',
  location: '',
  role: 'Student / Learner',
  skills: [],
  goals: [],
  destinations: [],
  cvText: '',
  avatarUrl: '',
  avatarPreset: 'emerald',
  isPublic: false,
  isOnboarded: false,
  notifications: {
    telegram: false,
    telegramHandle: '',
    discord: false,
    discordWebhook: '',
  },
};

export const STORAGE_KEY = 'qadam_user';
export const LEGACY_STORAGE_KEY = 'pathfinder_user';
export const ORIGINAL_LEGACY_KEY = 'user_profile';

export function isProfileValid(profile: Partial<UserProfile> | null | undefined): boolean {
  if (!profile) return false;
  const firstName = (profile.name || '').trim();
  if (!firstName || firstName.length < 2) return false;
  if (firstName.toLowerCase() === 'candidate' || firstName.toLowerCase() === 'new candidate') return false;
  if (!profile.isOnboarded) return false;
  return true;
}

export function loadUserProfile(): UserProfile {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY) ||
      localStorage.getItem(ORIGINAL_LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const candidateProfile: UserProfile = {
          ...EMPTY_USER_PROFILE,
          ...parsed,
          notifications: {
            ...EMPTY_USER_PROFILE.notifications,
            ...(parsed.notifications || {}),
          },
        };
        if (isProfileValid(candidateProfile)) {
          return candidateProfile;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to parse user profile from storage:', err);
  }
  return EMPTY_USER_PROFILE;
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    const serialized = JSON.stringify(profile);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('Failed to save user profile to storage:', err);
  }
}

export function clearUserProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(ORIGINAL_LEGACY_KEY);
    localStorage.removeItem('qadam_memory_entries');
    localStorage.removeItem('pathfinder_memory_entries');
    localStorage.removeItem('qadam_teammates');
    localStorage.removeItem('pathfinder_teammates');
    localStorage.removeItem('qadam_teams');
    localStorage.removeItem('pathfinder_teams');
    localStorage.removeItem('qadam_network_chats');
    localStorage.removeItem('pathfinder_network_chats');
  } catch (err) {
    console.warn('Failed to clear user profile:', err);
  }
}
