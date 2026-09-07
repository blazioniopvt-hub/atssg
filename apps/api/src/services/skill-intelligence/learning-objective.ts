// Learning Objective Engine
// Generates concrete, capability-driven learning objectives based on target role, current proficiency, and skill gaps

import type { LearningObjectiveDTO, ProficiencyLevel } from '@skillsync/types';

export interface ObjectiveGenerationContext {
  skillId: string;
  skillName: string;
  skillSlug: string;
  category?: string;
  subcategory?: string | null;
  currentProficiency?: ProficiencyLevel | string;
  targetProficiency: ProficiencyLevel | string;
  roleTitle?: string;
  gapSeverity?: string;
}

// Curated capability objectives for core industry technologies
const CURATED_OBJECTIVES: Record<string, Record<string, { title: string; objective: string }>> = {
  docker: {
    INTERMEDIATE: {
      title: 'Docker Containerization & Multi-Stage Builds',
      objective: 'Build, configure, and optimize containerized production applications using Docker, multi-stage Dockerfiles, Docker Compose, networking, and persistent volume mounts.',
    },
    ADVANCED: {
      title: 'Advanced Docker & Container Security Optimization',
      objective: 'Implement rootless containers, distroless runtime images, container vulnerability scanning, layer caching optimization, and microservice orchestration networks.',
    },
    EXPERT: {
      title: 'Production Container Runtime & Orchestration Architecture',
      objective: 'Architect enterprise-scale container runtime environments, custom buildkit configurations, cross-compilation pipelines, and low-latency container networking.',
    },
  },
  kubernetes: {
    INTERMEDIATE: {
      title: 'Kubernetes Workload Orchestration Fundamentals',
      objective: 'Deploy and manage distributed microservices using Pods, Deployments, Services, ConfigMaps, Secrets, Ingress controllers, and basic horizontal pod autoscaling.',
    },
    ADVANCED: {
      title: 'Production Kubernetes Architecture & Helm Deployments',
      objective: 'Design resilient Kubernetes clusters using Helm charts, StatefulSets, persistent storage classes, network policies, RBAC security, and automated rolling updates.',
    },
    EXPERT: {
      title: 'Enterprise Kubernetes Platform & Custom Operators',
      objective: 'Engineer multi-cluster Kubernetes platforms, develop custom Kubernetes Operators with CRDs, configure service meshes (Istio/Linkerd), and fine-tune scheduling topologies.',
    },
  },
  'machine-learning': {
    INTERMEDIATE: {
      title: 'Applied Machine Learning Pipelines & Validation',
      objective: 'Implement supervised and unsupervised machine learning algorithms using scikit-learn, feature engineering pipelines, cross-validation, regularization, and performance metrics.',
    },
    ADVANCED: {
      title: 'Advanced Predictive Modeling & Ensemble Architectures',
      objective: 'Engineer gradient boosting machines, advanced hyperparameter optimization (Optuna), model interpretability (SHAP/LIME), and leakage-free feature transformers.',
    },
    EXPERT: {
      title: 'Production Machine Learning System Architecture',
      objective: 'Architect end-to-end predictive systems handling large-scale tabular and non-linear data distributions with automated drift detection and continuous retraining loops.',
    },
  },
  'deep-learning': {
    INTERMEDIATE: {
      title: 'Deep Learning with PyTorch & Neural Networks',
      objective: 'Construct, train, and evaluate multi-layer perceptrons, convolutional neural networks (CNNs), and loss functions using PyTorch and GPU-accelerated computing.',
    },
    ADVANCED: {
      title: 'Modern Deep Architectures & Transfer Learning',
      objective: 'Fine-tune Transformer backbones, implement attention mechanisms, utilize mixed-precision training (FP16/BF16), and master gradient accumulation for large models.',
    },
    EXPERT: {
      title: 'Large-Scale Deep Learning & Distributed Training',
      objective: 'Scale model training across multi-GPU/multi-node clusters with DeepSpeed/FSDP, design custom attention kernels, and optimize throughput for frontier architectures.',
    },
  },
  mlops: {
    INTERMEDIATE: {
      title: 'MLOps Pipeline Automation & Model Registry',
      objective: 'Automate model training workflows using tools like MLflow and DVC, manage reproducible experiment tracking, model artifact registries, and automated evaluation metrics.',
    },
    ADVANCED: {
      title: 'End-to-End MLOps & Model Serving Infrastructure',
      objective: 'Deploy low-latency model inference servers (Triton/FastAPI), build feature stores, configure continuous integration for machine learning (CML), and monitor prediction drift.',
    },
    EXPERT: {
      title: 'Enterprise AI Platform & Production Serving Architecture',
      objective: 'Architect enterprise-grade automated MLOps platforms with automated rollback, canary model deployments, tensor parallelism, and SLA-guaranteed inference clusters.',
    },
  },
  python: {
    INTERMEDIATE: {
      title: 'Idiomatic Python & Object-Oriented Design',
      objective: 'Write clean, modular Python utilizing type annotations, context managers, generators, pytest suites, and standard library data structures.',
    },
    ADVANCED: {
      title: 'Advanced Asynchronous Python & Concurrency',
      objective: 'Build high-performance asynchronous microservices using asyncio, multiprocessing, concurrency primitives, memory profiling, and custom decorators.',
    },
    EXPERT: {
      title: 'Python Systems Architecture & Performance Optimization',
      objective: 'Optimize CPython execution with Cython/C extensions, understand GIL internals, profile CPU/memory bottlenecks, and build high-throughput distributed systems.',
    },
  },
  typescript: {
    INTERMEDIATE: {
      title: 'Structured TypeScript & Generic Programming',
      objective: 'Develop robust applications using TypeScript generics, utility types, discriminated unions, interface modeling, and strict compiler configurations.',
    },
    ADVANCED: {
      title: 'Advanced Type-Level Programming & AST Architecture',
      objective: 'Master conditional types, template literal types, mapped types, type inference with infer, and build production-grade end-to-end typed APIs.',
    },
    EXPERT: {
      title: 'Enterprise TypeScript Frameworks & Meta-Programming',
      objective: 'Architect enterprise TypeScript monorepos, design custom compiler plugins, type-safe DSLs, and high-performance zero-overhead runtime validation engines.',
    },
  },
  react: {
    INTERMEDIATE: {
      title: 'Modern Component Architecture & State Management',
      objective: 'Develop scalable React applications with custom hooks, functional component patterns, component lifecycle optimization, and accessible UI components.',
    },
    ADVANCED: {
      title: 'React Server Components & Performance Optimization',
      objective: 'Architect Next.js full-stack applications with React Server Components, streaming SSR, Suspense boundaries, bundle size optimization, and memoization.',
    },
    EXPERT: {
      title: 'Enterprise Frontend Architecture & Design Systems',
      objective: 'Architect modular design systems, micro-frontends, custom reconciliation hooks, and performance-critical rendering engines for enterprise web platforms.',
    },
  },
  nodejs: {
    INTERMEDIATE: {
      title: 'RESTful API Engineering & Async Runtime',
      objective: 'Construct robust backend services in Node.js with event loops, stream processing, structured logging, middleware pipelines, and relational database integrations.',
    },
    ADVANCED: {
      title: 'High-Throughput Node.js Microservices & Worker Threads',
      objective: 'Architect distributed Node.js services utilizing Worker Threads, clustering, backpressure management in streams, memory leak diagnosis, and security hardening.',
    },
    EXPERT: {
      title: 'High-Concurrency Event-Driven Distributed Systems',
      objective: 'Design distributed event-driven backends with zero-downtime clustering, custom TCP/HTTP servers, and ultra-low latency event processing.',
    },
  },
  postgresql: {
    INTERMEDIATE: {
      title: 'Relational Database Schema Design & Querying',
      objective: 'Design normalized database schemas, write complex joins and window functions, configure foreign keys, indexes, transactions, and migration workflows.',
    },
    ADVANCED: {
      title: 'PostgreSQL Performance Tuning & Indexing Strategies',
      objective: 'Analyze query execution plans with EXPLAIN ANALYZE, configure B-tree/GIN/GiST indexes, connection pooling (PgBouncer), partitioning, and concurrency controls.',
    },
    EXPERT: {
      title: 'High-Availability PostgreSQL & Distributed Clustering',
      objective: 'Architect streaming replication, physical standby failovers, point-in-time recovery (PITR), sharding with Citus, and enterprise disaster recovery topologies.',
    },
  },
  'ci-cd': {
    INTERMEDIATE: {
      title: 'Automated CI/CD Pipeline Implementation',
      objective: 'Create automated GitHub Actions/GitLab CI workflows for automated testing, linting, Docker image building, artifact caching, and basic environment deployments.',
    },
    ADVANCED: {
      title: 'Multi-Environment GitOps & Progressive Delivery',
      objective: 'Implement GitOps deployment pipelines with ArgoCD, automated blue/green and canary deployments, secret management with Vault, and automated security scans.',
    },
    EXPERT: {
      title: 'Enterprise Delivery Platform & Supply Chain Security',
      objective: 'Design organization-wide software supply chain security (SLSA, Cosign), zero-trust deployment runners, and automated release orchestration at scale.',
    },
  },
  'network-security': {
    INTERMEDIATE: {
      title: 'Network Defense & Traffic Inspection Protocols',
      objective: 'Configure firewall rules, analyze packet captures with Wireshark, inspect TCP/IP traffic flows, and enforce secure communication with TLS/SSL certificates.',
    },
    ADVANCED: {
      title: 'Zero Trust Network Architecture & Intrusion Detection',
      objective: 'Deploy Snort/Suricata IDS/IPS engines, implement Zero Trust network segmentation, configure VPNs/WireGuard tunnels, and mitigate DDoS vectors.',
    },
    EXPERT: {
      title: 'Enterprise Perimeter Defense & Security Operations',
      objective: 'Architect global hybrid-cloud perimeter defenses, software-defined perimeters (SDP), deep protocol inspection, and resilient network failover matrices.',
    },
  },
};

export class LearningObjectiveService {
  /**
   * Generates an explainable, capability-focused learning objective for a skill gap.
   */
  generateObjective(context: ObjectiveGenerationContext): LearningObjectiveDTO {
    const targetProficiency = (context.targetProficiency || 'INTERMEDIATE').toUpperCase();
    const currentProficiency = context.currentProficiency ? String(context.currentProficiency).toUpperCase() : 'BEGINNER';
    const slug = (context.skillSlug || context.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');

    // 1. Check curated catalog
    const skillCurated = CURATED_OBJECTIVES[slug];
    if (skillCurated) {
      const proficiencyMatch = skillCurated[targetProficiency] || skillCurated.INTERMEDIATE || skillCurated.ADVANCED;
      if (proficiencyMatch) {
        return {
          skillId: context.skillId,
          skillName: context.skillName,
          title: proficiencyMatch.title,
          objective: proficiencyMatch.objective,
          targetProficiency,
          currentProficiency,
          estimatedMinutes: this.calculateEstimatedMinutes(currentProficiency, targetProficiency),
        };
      }
    }

    // 2. Deterministic Template Fallback for any skill in taxonomy
    const actionVerb = targetProficiency === 'EXPERT'
      ? 'Architect and optimize'
      : targetProficiency === 'ADVANCED'
      ? 'Master production implementation of'
      : 'Build foundational and practical proficiency in';

    const subcategoryText = context.subcategory ? ` within ${context.subcategory}` : '';
    const title = `${actionVerb} ${context.skillName}`;
    const objective = `Acquire hands-on mastery of ${context.skillName}${subcategoryText}, progressing from ${currentProficiency.toLowerCase()} to ${targetProficiency.toLowerCase()} proficiency through validated implementation, best practices, and production-oriented workflows.`;

    return {
      skillId: context.skillId,
      skillName: context.skillName,
      title,
      objective,
      targetProficiency,
      currentProficiency,
      estimatedMinutes: this.calculateEstimatedMinutes(currentProficiency, targetProficiency),
    };
  }

  /**
   * Calculate realistic estimated learning duration in minutes based on proficiency leap
   */
  private calculateEstimatedMinutes(currentProficiency: string, targetProficiency: string): number {
    const profRank: Record<string, number> = {
      NONE: 0,
      BEGINNER: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
      EXPERT: 4,
    };

    const current = profRank[currentProficiency] ?? 0;
    const target = profRank[targetProficiency] ?? 2;
    const delta = Math.max(1, target - current);

    // Each proficiency level leap requires ~180 minutes of focused active learning
    return delta * 180;
  }
}

export const learningObjectiveService = new LearningObjectiveService();
