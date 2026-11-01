export interface MemoryEntry {
  id: string;
  category: 'PREFERENCES' | 'CONSTRAINTS' | 'SKILLS' | 'GOALS';
  timestamp: string;
  text: string;
  targets: string[];
}

export interface MatrixTarget {
  id: string;
  type: 'Opportunity' | 'Constraint';
  label: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SkillItem {
  id: string;
  name: string;
  status: 'VERIFIED' | 'UNVERIFIED' | 'MISSING';
  score?: number;
  reason: string;
  resourceTitle: string;
  resourceUrl: string;
  quizQuestions: QuizQuestion[];
}

export interface LogEntry {
  id: string;
  time: string;
  tag: 'SYSTEM' | 'SANDBOX' | 'MODEL' | 'SANDBOX WARNING';
  message: string;
  isWarning?: boolean;
}

export interface UserProfile {
  name: string;
  location: string;
  email: string;
  phone: string;
  nationalId: string;
  github: string;
  linkedin: string;
  university: string;
  major: string;
  degree: string;
  years: string;
  role: string;
  skills: string[];
  goals: string[];
  cvText?: string;
  strengths: string[];
  gaps: string[];
  isOnboarded: boolean;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: '',
  location: '',
  email: '',
  phone: '',
  nationalId: '',
  github: '',
  linkedin: '',
  university: '',
  major: '',
  degree: 'B.S. in Computer Science',
  years: '2023 - 2027',
  role: 'Undergraduate CS Student',
  skills: [],
  goals: [],
  cvText: '',
  strengths: [],
  gaps: [],
  isOnboarded: false,
};

export const POPULAR_SKILLS = [
  'Python',
  'Go',
  'Docker',
  'PyTorch',
  'Vector DBs',
  'LLMs',
  'TypeScript',
  'SQL',
  'Linux',
  'Git',
  'C++',
  'ROS2',
  'gRPC',
  'PostgreSQL',
  'Research',
  'English',
];

export const CAREER_GOALS = [
  'Global Hackathons & Bounties',
  'Graduate Research Scholarships Abroad',
  'ML Engineering & Systems Internships',
  'Physical AI & Humanoid Robotics',
  'Conference Travel Grants (NeurIPS/CVPR)',
  'Open-Source Developer Grants',
];

export const INITIAL_SKILLS: SkillItem[] = [
  {
    id: 'docker',
    name: 'Docker',
    status: 'MISSING',
    reason: 'Critical for containerized hackathon submissions and OpenShell deployment.',
    resourceTitle: 'Docker Deep Dive & Multi-Stage Builds',
    resourceUrl: 'https://docs.docker.com/develop/develop-images/multistage-build/',
    quizQuestions: [
      {
        question: 'Which Dockerfile instruction creates a lean production image by copying artifacts from a build stage?',
        options: [
          'COPY --from=builder /app/dist /usr/share/nginx/html',
          'RUN export ARTIFACTS=/app/dist',
          'STAGE prod FROM builder',
          'EXTRACT /app/dist TO /html',
        ],
        correctIndex: 0,
        explanation: 'Multi-stage builds use COPY --from=<stage> to transfer only compiled binaries without build tools.',
      },
      {
        question: 'How do you prevent a containerized agent from writing outside its assigned scratch volume in Docker?',
        options: [
          'Add --privileged flag at runtime',
          'Mount root filesystem as --read-only and mount a tmpfs on /scratch',
          'Set ENV PERMISSIVE=false in Dockerfile',
          'Use bridge networking exclusively',
        ],
        correctIndex: 1,
        explanation: 'Passing --read-only with an isolated tmpfs ensures all writes outside the target directory are rejected by the kernel.',
      },
      {
        question: 'What is the primary difference between CMD and ENTRYPOINT in an OpenShell container?',
        options: [
          'CMD executes as root while ENTRYPOINT executes as nobody',
          'ENTRYPOINT defines the immutable executable while CMD provides default overrideable arguments',
          'ENTRYPOINT is only supported in Docker Swarm',
          'CMD runs before container networking initializes',
        ],
        correctIndex: 1,
        explanation: 'ENTRYPOINT sets the binary to invoke, while CMD supplies parameters that the CLI can override.',
      },
      {
        question: 'Which Linux namespace provides network stack isolation for sandboxed microservices?',
        options: [
          'pid namespace',
          'net namespace',
          'user namespace',
          'mnt namespace',
        ],
        correctIndex: 1,
        explanation: 'The net namespace isolates network interfaces, routing tables, and port bindings.',
      },
    ],
  },
  {
    id: 'pytorch',
    name: 'PyTorch',
    status: 'MISSING',
    reason: 'Required for custom model evaluation and GPU tensor manipulation.',
    resourceTitle: 'PyTorch 2.x Tensor Internals & CUDA Acceleration',
    resourceUrl: 'https://pytorch.org/tutorials/beginner/basics/intro.html',
    quizQuestions: [
      {
        question: 'What does torch.no_grad() achieve during model inference?',
        options: [
          'Disables autograd engine to eliminate gradient tracking memory overhead',
          'Quantizes all FP32 weights to INT8 on the fly',
          'Pins memory directly to GPU VRAM',
          'Disables CUDA synchronization checks',
        ],
        correctIndex: 0,
        explanation: 'torch.no_grad() deactivates the gradient tape calculation, drastically saving GPU memory and accelerating forward passes.',
      },
      {
        question: 'When transferring a batch to an NVIDIA GPU, which call ensures non-blocking asynchronous memory transfer?',
        options: [
          'batch.cuda(sync=False)',
          'batch.to(device, non_blocking=True)',
          'torch.async_copy(batch, device)',
          'batch.pin_memory().transfer()',
        ],
        correctIndex: 1,
        explanation: 'batch.to(device, non_blocking=True) overlaps data transfer with GPU computation when memory is pinned.',
      },
      {
        question: 'Which method compiles a PyTorch computational graph into optimized kernel code in PyTorch 2.0+?',
        options: [
          'torch.jit.trace()',
          'torch.compile()',
          'torch.export.graph()',
          'torch.optimize.cuda()',
        ],
        correctIndex: 1,
        explanation: 'torch.compile() uses TorchDynamo and Inductor to generate efficient fused Triton kernels.',
      },
      {
        question: 'What is the correct way to zero gradients before backward propagation?',
        options: [
          'optimizer.zero_grad(set_to_none=True)',
          'model.reset_weights()',
          'torch.autograd.backward(zero=True)',
          'loss.detach_()',
        ],
        correctIndex: 0,
        explanation: 'set_to_none=True is faster than writing zeros because it frees the tensor memory rather than overwriting it.',
      },
    ],
  },
  {
    id: 'vector-dbs',
    name: 'Vector databases',
    status: 'MISSING',
    reason: 'Essential for embedding retrieval and fast semantic indexing.',
    resourceTitle: 'Approximate Nearest Neighbor & HNSW Indexing',
    resourceUrl: 'https://www.pinecone.io/learn/series/faiss/hnsw/',
    quizQuestions: [
      {
        question: 'What data structure enables Hierarchical Navigable Small World (HNSW) to achieve logarithmic search time?',
        options: [
          'Multi-layer proximity graph with skipping connections across sparse to dense layers',
          'B-Tree indexed by inverted term frequencies',
          'Bloom filter coupled with LSM-Trees',
          'Quadtree partition based on K-means centroids',
        ],
        correctIndex: 0,
        explanation: 'HNSW builds layered graphs where upper layers have long-range links and lower layers have dense local connections.',
      },
      {
        question: 'Which distance metric is invariant to vector magnitude when comparing normalized embeddings?',
        options: [
          'Manhattan distance (L1)',
          'Dot Product (Inner Product)',
          'Chebyshev distance',
          'Hamming distance',
        ],
        correctIndex: 1,
        explanation: 'For unit-length normalized vectors, the dot product is mathematically identical to cosine similarity.',
      },
      {
        question: 'What is the primary role of a re-ranking model (cross-encoder) in a hybrid RAG pipeline?',
        options: [
          'Generate vector embeddings for all database documents',
          'Score retrieved candidate pairs jointly with full self-attention for precision',
          'Compress 1536-dim vectors into binary codes',
          'Manage distributed sharding across nodes',
        ],
        correctIndex: 1,
        explanation: 'Cross-encoders process query and document together through cross-attention, providing accurate ranking for top-k candidates.',
      },
      {
        question: 'What technique reduces memory footprint of vector indices by mapping vectors to centroid codes?',
        options: [
          'Product Quantization (PQ)',
          'Singular Value Decomposition (SVD)',
          'Gradients Clipping',
          'Fourier Transformation',
        ],
        correctIndex: 0,
        explanation: 'Product Quantization divides vectors into sub-vectors and quantizes each with codebook centroids.',
      },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    status: 'MISSING',
    reason: 'Core language verified via GitHub AST analysis and hackathon benchmark.',
    resourceTitle: 'Advanced Python AsyncIO & Performance',
    resourceUrl: 'https://docs.python.org/3/library/asyncio.html',
    quizQuestions: [
      {
        question: 'Which Python standard module provides cooperative multitasking via coroutines and event loops?',
        options: ['asyncio', 'multiprocessing', 'concurrent.futures', 'threading'],
        correctIndex: 0,
        explanation: 'asyncio provides the foundation for asynchronous I/O and event loop scheduling.',
      },
    ],
  },
  {
    id: 'llms',
    name: 'LLMs',
    status: 'MISSING',
    reason: 'Essential for physical AI agents, tool invocation, and structured reasoning pipelines.',
    resourceTitle: 'Large Language Model Function Calling & Structured Output Guidelines',
    resourceUrl: 'https://docs.nebius.ai/token-api',
    quizQuestions: [
      {
        question: 'Which sampling parameter controls token candidate selection by choosing from the smallest set whose cumulative probability reaches threshold p?',
        options: ['Top-p (Nucleus sampling)', 'Temperature', 'Frequency penalty', 'Presence penalty'],
        correctIndex: 0,
        explanation: 'Top-p truncates the token vocabulary dynamically to the most probable nucleus whose cumulative sum is p.',
      },
      {
        question: 'When designing an agentic loop, what technique provides deterministic schema compliance for model tool calls?',
        options: ['Structured outputs with JSON Schema enforcement', 'Increasing temperature to 1.5', 'Regex post-filtering alone', 'Greedy token decoding without schema'],
        correctIndex: 0,
        explanation: 'JSON Schema constrained decoding guarantees grammar adherence at token sampling time.',
      },
    ],
  },
  {
    id: 'go',
    name: 'Go',
    status: 'MISSING',
    reason: 'High-throughput microservices, distributed agents, and container daemon runtime development.',
    resourceTitle: 'Go Concurrency Patterns: Channels & Select',
    resourceUrl: 'https://go.dev/blog/pipelines',
    quizQuestions: [
      {
        question: 'What occurs if a Go goroutine sends data to an unbuffered channel when there is no active receiver?',
        options: [
          'The sending goroutine blocks until another goroutine receives the value',
          'A runtime panic is thrown immediately',
          'The sent value is dropped silently',
          'The channel automatically buffers the item in heap memory',
        ],
        correctIndex: 0,
        explanation: 'Unbuffered channels are synchronous and block the sender until a receiver is ready to take the value.',
      },
      {
        question: 'Which standard Go package provides cancellation and deadline propagation across API boundaries?',
        options: ['context', 'sync', 'runtime', 'os/signal'],
        correctIndex: 0,
        explanation: 'The context package carries deadlines, cancellation signals, and request-scoped values across API boundaries.',
      },
    ],
  },
  {
    id: 'linux',
    name: 'Linux',
    status: 'MISSING',
    reason: 'Foundation for container sandboxing, process confinement (namespaces & cgroups), and GPU cluster operations.',
    resourceTitle: 'Linux Namespaces and Control Groups (cgroups v2)',
    resourceUrl: 'https://man7.org/linux/man-pages/man7/namespaces.7.html',
    quizQuestions: [
      {
        question: 'Which Linux kernel mechanism enforces hard memory and CPU limits on sandboxed processes?',
        options: ['cgroups (Control Groups)', 'chroot', 'ptrace', 'iptables'],
        correctIndex: 0,
        explanation: 'cgroups organize processes hierarchically and enforce resource limits on memory, CPU, and I/O.',
      },
      {
        question: 'Which command displays active GPU compute processes and memory allocation across NVIDIA hardware?',
        options: ['nvidia-smi', 'nvtop -u', 'lspci -v', 'htop --gpu'],
        correctIndex: 0,
        explanation: 'nvidia-smi is the standard system management interface for NVIDIA GPU monitoring.',
      },
    ],
  },
  {
    id: 'ros2',
    name: 'ROS2',
    status: 'MISSING',
    reason: 'Essential middleware for physical AI, robot embodiment, sensor fusion, and spatial simulation.',
    resourceTitle: 'ROS 2 DDS Middleware & Node Architecture',
    resourceUrl: 'https://docs.ros.org/en/humble/index.html',
    quizQuestions: [
      {
        question: 'What underlying communication protocol standard powers ROS 2 discovery and publish-subscribe messaging?',
        options: ['DDS (Data Distribution Service)', 'HTTP/2 REST', 'gRPC exclusively', 'WebSockets'],
        correctIndex: 0,
        explanation: 'ROS 2 is built on top of DDS (Data Distribution Service) for peer-to-peer real-time communication.',
      },
      {
        question: 'Which ROS 2 communication paradigm should be used for long-running preemptible tasks that provide feedback?',
        options: ['Actions (Action servers & clients)', 'Topics', 'Services', 'Parameters'],
        correctIndex: 0,
        explanation: 'ROS 2 Actions provide goal specification, progress feedback, and cancellation for long tasks.',
      },
    ],
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    status: 'MISSING',
    reason: 'Mathematical foundations of gradient descent, representation learning, and empirical validation.',
    resourceTitle: 'Foundations of Modern Machine Learning & Generalization',
    resourceUrl: 'https://ml-cheatsheet.readthedocs.io/',
    quizQuestions: [
      {
        question: 'Which regularization technique randomly zeroes activations during training to prevent co-adaptation?',
        options: ['Dropout', 'Batch Normalization', 'Gradient Clipping', 'L1 Sparsity'],
        correctIndex: 0,
        explanation: 'Dropout sets random neuron activations to zero during training steps to prevent co-adaptation.',
      },
      {
        question: 'What metric is least biased by heavy negative class imbalance when evaluating binary classifiers?',
        options: ['PR AUC (Precision-Recall Area Under Curve)', 'ROC AUC', 'Raw Accuracy', 'Mean Squared Error'],
        correctIndex: 0,
        explanation: 'PR AUC focuses on the minority positive class without being inflated by true negative volume.',
      },
    ],
  },
  {
    id: 'research',
    name: 'Research',
    status: 'MISSING',
    reason: 'Rigorous empirical evaluation, literature synthesis, and peer-reviewed scientific methodology.',
    resourceTitle: 'Reproducible ML Research & Empirical Validation Protocols',
    resourceUrl: 'https://paperswithcode.com/about',
    quizQuestions: [
      {
        question: 'What is the primary method to guard against data snooping and target leakage during pipeline development?',
        options: [
          'Strict dataset split before any feature normalization or fitting',
          'Evaluating solely on training loss',
          'Applying PCA before splitting data',
          'Using k-fold cross-validation without validation holds',
        ],
        correctIndex: 0,
        explanation: 'Splitting data into train/val/test before computing any transformation statistics prevents data leakage.',
      },
      {
        question: 'What should be reported alongside benchmark test scores to establish empirical validity?',
        options: [
          'Confidence intervals or standard deviation across multiple random seeds',
          'Only the maximum single-run score',
          'Training convergence epoch',
          'GPU cluster hostnames',
        ],
        correctIndex: 0,
        explanation: 'Reporting variance and confidence intervals across seeds proves statistical significance and reproducibility.',
      },
    ],
  },
  {
    id: 'sql',
    name: 'SQL',
    status: 'MISSING',
    reason: 'Relational query execution, analytical indexing, and metadata filtering for RAG pipelines.',
    resourceTitle: 'PostgreSQL Indexing & Query Execution Plans',
    resourceUrl: 'https://use-the-index-luke.com/',
    quizQuestions: [
      {
        question: 'Which SQL command reveals the internal query optimizer execution plan without executing side-effects?',
        options: ['EXPLAIN', 'ANALYZE PLAN', 'OPTIMIZE QUERY', 'SHOW EXECUTION'],
        correctIndex: 0,
        explanation: 'EXPLAIN displays the optimizer execution plan and estimated disk costs.',
      },
      {
        question: 'Which window function assigns unique sequential integers to rows within a partition starting from 1?',
        options: ['ROW_NUMBER()', 'RANK()', 'DENSE_RANK()', 'LEAD()'],
        correctIndex: 0,
        explanation: 'ROW_NUMBER() assigns a unique, sequential number to each row within a partition.',
      },
    ],
  },
];

export const INITIAL_MEMORY: MemoryEntry[] = [];

// Rules an agent entry can be tied to. They never go out of date. Opportunities are added from the
// live Radar when the Memory page opens, so no expired listing is ever offered.
export const CONSTRAINT_TARGETS: MatrixTarget[] = [
  { id: 'target-rule-english', type: 'Constraint', label: 'Rule: draft applications in English' },
  { id: 'target-rule-review', type: 'Constraint', label: 'Rule: review drafts before submission' },
  { id: 'target-rule-sandbox', type: 'Constraint', label: 'Constraint: sandbox isolation verified' },
];

export const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    time: '08:00:02',
    tag: 'SYSTEM',
    message: 'Initiating Tavily web search for upcoming hackathons…',
  },
  {
    id: 'log-2',
    time: '08:00:03',
    tag: 'SANDBOX',
    message: 'OpenShell checked file access → APPROVED',
  },
  {
    id: 'log-3',
    time: '08:00:04',
    tag: 'MODEL',
    message: 'Routing prompt to nvidia/Nemotron-3.5-Lightning…',
  },
  {
    id: 'log-4',
    time: '08:00:06',
    tag: 'SYSTEM',
    message: 'Tavily returned 18 results · 10 matched to student profile',
  },
  {
    id: 'log-5',
    time: '08:00:07',
    tag: 'SANDBOX',
    message: 'PII anonymizer masked 4 fields before cloud call → OK',
  },
  {
    id: 'log-6',
    time: '08:00:09',
    tag: 'MODEL',
    message: 'Match scoring complete · opportunities ranked against your profile',
  },
  {
    id: 'log-7',
    time: '08:00:11',
    tag: 'SANDBOX WARNING',
    message: 'Agent attempted access to /root/system → BLOCKED BY OPENSHELL',
    isWarning: true,
  },
  {
    id: 'log-8',
    time: '08:00:11',
    tag: 'SYSTEM',
    message: 'Action denied · continuing inside /workspace/qadam',
  },
  {
    id: 'log-9',
    time: '08:00:14',
    tag: 'SYSTEM',
    message: 'Morning digest sent',
  },
];

// Dynamic calculation of match score based on user skills & verified badges
export function calculateOpportunityMatch(
  opportunitySkills: string[],
  userSkills: string[],
  verifiedSkills: string[] = ['Python']
): number {
  if (opportunitySkills.length === 0) return 75;

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

  const ratio = matchedWeight / totalWeight;
  // Scale between 58% and 96%
  const score = Math.round(58 + ratio * 38);
  return Math.min(98, Math.max(55, score));
}
