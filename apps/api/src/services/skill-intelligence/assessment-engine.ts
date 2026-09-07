// Phase 6: Assessment Engine Service
// Server-generated questions, server-side grading, evidence bridge, path adaptation

import prismaClient from '../../lib/prisma';
import { AssessmentStatus, AssessmentType as PrismaAssessmentType } from '@prisma/client';
import { skillConfidenceService } from './skill-confidence';
import { personalizedLearningPathService } from './personalized-path';
import { DEMO_SKILLS } from '../../lib/demo-data';
import type {
  AssessmentDTO,
  AssessmentQuestionDTO,
  AssessmentQuestionFeedback,
  AssessmentResultDTO,
  AssessmentAttemptDTO,
} from '@skillsync/types';

// ============================================================
// QUESTION BANK — Deterministic, server-only correct answers
// ============================================================

interface QuestionTemplate {
  text: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'CODE_REVIEW';
  choices?: string[];
  codeSnippet?: string;
  correctAnswer: string; // NEVER sent to client
  explanation: string;
  difficulty: string;
  skillArea: string;
}

// Question templates keyed by skill slug
const QUESTION_BANK: Record<string, QuestionTemplate[]> = {
  typescript: [
    {
      text: 'What is the primary purpose of TypeScript\'s `unknown` type?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'To represent any value without type safety',
        'To represent a value whose type must be checked before use',
        'To represent null or undefined values',
        'To disable type checking entirely',
      ],
      correctAnswer: 'To represent a value whose type must be checked before use',
      explanation: 'The `unknown` type requires type narrowing (type guards) before the value can be used, providing type safety unlike `any`.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Type System',
    },
    {
      text: 'TypeScript interfaces support declaration merging.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'TypeScript interfaces support declaration merging, where multiple interface declarations with the same name are automatically merged into a single definition.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Interfaces',
    },
    {
      text: 'What does the `readonly` modifier do when applied to a property?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'Makes the property optional',
        'Prevents the property from being reassigned after initialization',
        'Makes the property private',
        'Converts the property to a getter',
      ],
      correctAnswer: 'Prevents the property from being reassigned after initialization',
      explanation: 'The `readonly` modifier ensures a property can only be assigned during initialization and cannot be changed afterward.',
      difficulty: 'BEGINNER',
      skillArea: 'Modifiers',
    },
    {
      text: 'Which utility type creates a new type with all properties of T set to optional?',
      type: 'MULTIPLE_CHOICE',
      choices: ['Required<T>', 'Partial<T>', 'Pick<T, K>', 'Omit<T, K>'],
      correctAnswer: 'Partial<T>',
      explanation: 'Partial<T> constructs a type with all properties of T set to optional, useful for update operations.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Utility Types',
    },
    {
      text: 'What is a discriminated union in TypeScript?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'A union of primitive types',
        'A union of object types sharing a common literal property used for narrowing',
        'An intersection type with discriminated access',
        'A generic constraint on union members',
      ],
      correctAnswer: 'A union of object types sharing a common literal property used for narrowing',
      explanation: 'Discriminated unions use a common property with literal types to enable exhaustive type narrowing with switch/if statements.',
      difficulty: 'ADVANCED',
      skillArea: 'Advanced Types',
    },
  ],

  react: [
    {
      text: 'What hook should you use to perform side effects in a React functional component?',
      type: 'MULTIPLE_CHOICE',
      choices: ['useState', 'useEffect', 'useReducer', 'useContext'],
      correctAnswer: 'useEffect',
      explanation: 'useEffect is the hook designed for side effects like data fetching, subscriptions, and DOM mutations in functional components.',
      difficulty: 'BEGINNER',
      skillArea: 'Hooks',
    },
    {
      text: 'React re-renders a component when its props or state change.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'React triggers a re-render when a component\'s state updates (via setState/useState) or when it receives new props from its parent.',
      difficulty: 'BEGINNER',
      skillArea: 'Rendering',
    },
    {
      text: 'What is the purpose of React.memo()?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'To memoize expensive calculations',
        'To prevent unnecessary re-renders by shallow comparing props',
        'To store data in memory across renders',
        'To create memoized event handlers',
      ],
      correctAnswer: 'To prevent unnecessary re-renders by shallow comparing props',
      explanation: 'React.memo() is a higher-order component that skips re-rendering when props have not changed (via shallow comparison).',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Performance',
    },
    {
      text: 'Which pattern allows sharing stateful logic between components without changing the component hierarchy?',
      type: 'MULTIPLE_CHOICE',
      choices: ['Render Props', 'Custom Hooks', 'Higher-Order Components', 'All of the above'],
      correctAnswer: 'All of the above',
      explanation: 'Custom Hooks, Render Props, and Higher-Order Components all enable sharing stateful logic. Custom Hooks are the modern recommended approach.',
      difficulty: 'ADVANCED',
      skillArea: 'Patterns',
    },
    {
      text: 'In React 18+, what does `useDeferredValue` do?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'Defers rendering of a value to keep the UI responsive',
        'Delays API calls until user stops typing',
        'Creates a deferred promise for async operations',
        'Postpones component mounting',
      ],
      correctAnswer: 'Defers rendering of a value to keep the UI responsive',
      explanation: 'useDeferredValue defers re-rendering of non-urgent updates so that higher-priority updates (like user input) remain responsive.',
      difficulty: 'ADVANCED',
      skillArea: 'Concurrent Features',
    },
  ],

  nodejs: [
    {
      text: 'Node.js uses a single-threaded event loop for handling I/O operations.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Node.js uses a single-threaded event loop with non-blocking I/O, delegating expensive operations to the system kernel or thread pool.',
      difficulty: 'BEGINNER',
      skillArea: 'Architecture',
    },
    {
      text: 'What is the purpose of the `cluster` module in Node.js?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'To create child processes that share the same server port',
        'To manage database connection pools',
        'To cluster related modules together',
        'To manage Docker containers',
      ],
      correctAnswer: 'To create child processes that share the same server port',
      explanation: 'The cluster module forks worker processes that can share server ports, allowing Node.js apps to utilize multiple CPU cores.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Scalability',
    },
    {
      text: 'Which of the following correctly describes the Node.js event loop phases?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'timers → pending callbacks → idle → poll → check → close callbacks',
        'poll → timers → check → idle → close callbacks',
        'timers → poll → check → close callbacks → idle',
        'pending callbacks → poll → timers → check → close callbacks',
      ],
      correctAnswer: 'timers → pending callbacks → idle → poll → check → close callbacks',
      explanation: 'The event loop processes phases in order: timers, pending callbacks, idle/prepare, poll, check (setImmediate), and close callbacks.',
      difficulty: 'ADVANCED',
      skillArea: 'Event Loop',
    },
    {
      text: 'What is the difference between `process.nextTick()` and `setImmediate()`?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'nextTick runs before the next event loop phase; setImmediate runs in the check phase',
        'They are identical',
        'setImmediate runs before nextTick',
        'nextTick is deprecated in favor of setImmediate',
      ],
      correctAnswer: 'nextTick runs before the next event loop phase; setImmediate runs in the check phase',
      explanation: 'process.nextTick() callbacks run before the event loop continues; setImmediate() callbacks run in the check phase of the event loop.',
      difficulty: 'ADVANCED',
      skillArea: 'Async',
    },
  ],

  python: [
    {
      text: 'What is a Python decorator?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'A function that takes another function and extends its behavior',
        'A class inheritance mechanism',
        'A way to add comments to functions',
        'A method for encrypting function calls',
      ],
      correctAnswer: 'A function that takes another function and extends its behavior',
      explanation: 'Decorators are functions that wrap other functions to extend or modify their behavior, using the @decorator syntax.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Functions',
    },
    {
      text: 'Python lists are immutable data structures.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'False',
      explanation: 'Python lists are mutable — elements can be added, removed, or changed after creation. Tuples are the immutable sequence type.',
      difficulty: 'BEGINNER',
      skillArea: 'Data Structures',
    },
    {
      text: 'What is the Global Interpreter Lock (GIL) in CPython?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'A mutex that prevents multiple native threads from executing Python bytecodes simultaneously',
        'A security feature preventing unauthorized code execution',
        'A memory management lock for garbage collection',
        'A lock that prevents concurrent file access',
      ],
      correctAnswer: 'A mutex that prevents multiple native threads from executing Python bytecodes simultaneously',
      explanation: 'The GIL ensures that only one thread executes Python bytecode at a time, simplifying memory management but limiting CPU-bound parallelism.',
      difficulty: 'ADVANCED',
      skillArea: 'Concurrency',
    },
    {
      text: 'What is a generator in Python?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'A function that returns an iterator using the yield keyword',
        'A class that generates random numbers',
        'A module for code generation',
        'A tool for generating documentation',
      ],
      correctAnswer: 'A function that returns an iterator using the yield keyword',
      explanation: 'Generators use `yield` to lazily produce values one at a time, enabling memory-efficient iteration over large datasets.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Iterators',
    },
  ],

  'machine-learning': [
    {
      text: 'What is overfitting in machine learning?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'When a model performs well on training data but poorly on unseen data',
        'When a model is too simple to capture patterns',
        'When training takes too long',
        'When the dataset is too large',
      ],
      correctAnswer: 'When a model performs well on training data but poorly on unseen data',
      explanation: 'Overfitting occurs when a model memorizes training data noise instead of learning generalizable patterns, leading to poor generalization.',
      difficulty: 'BEGINNER',
      skillArea: 'Fundamentals',
    },
    {
      text: 'Cross-validation helps estimate how well a model will generalize to unseen data.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Cross-validation (e.g., k-fold) trains and evaluates the model on different data splits, providing a robust estimate of generalization performance.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Evaluation',
    },
    {
      text: 'Which regularization technique adds the absolute value of weights to the loss function?',
      type: 'MULTIPLE_CHOICE',
      choices: ['L1 (Lasso)', 'L2 (Ridge)', 'Dropout', 'Batch Normalization'],
      correctAnswer: 'L1 (Lasso)',
      explanation: 'L1 regularization (Lasso) adds the sum of absolute weight values to the loss, encouraging sparsity. L2 (Ridge) adds the sum of squared weights.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Regularization',
    },
    {
      text: 'What does the bias-variance tradeoff describe?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'The tradeoff between model complexity and generalization error',
        'The tradeoff between training speed and accuracy',
        'The tradeoff between data size and model size',
        'The tradeoff between CPU and GPU usage',
      ],
      correctAnswer: 'The tradeoff between model complexity and generalization error',
      explanation: 'High bias means underfitting (too simple), high variance means overfitting (too complex). The goal is to find the optimal balance.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Theory',
    },
  ],

  'deep-learning': [
    {
      text: 'What is the vanishing gradient problem?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'Gradients become extremely small in deep networks, preventing earlier layers from learning',
        'The model gradient disappears after training',
        'GPU memory runs out during backpropagation',
        'The loss function reaches zero too quickly',
      ],
      correctAnswer: 'Gradients become extremely small in deep networks, preventing earlier layers from learning',
      explanation: 'In deep networks with certain activation functions (sigmoid, tanh), gradients shrink exponentially as they propagate backward, stalling learning in early layers.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Training',
    },
    {
      text: 'Batch normalization helps stabilize and accelerate neural network training.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Batch normalization normalizes layer inputs across a mini-batch, reducing internal covariate shift and allowing higher learning rates.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Architecture',
    },
    {
      text: 'What is the main advantage of residual connections (skip connections)?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'They allow gradients to flow directly through the network, enabling deeper architectures',
        'They reduce the number of parameters',
        'They eliminate the need for batch normalization',
        'They make the model run faster',
      ],
      correctAnswer: 'They allow gradients to flow directly through the network, enabling deeper architectures',
      explanation: 'Skip connections provide shortcut paths for gradients, mitigating vanishing gradients and enabling training of very deep networks (100+ layers).',
      difficulty: 'ADVANCED',
      skillArea: 'Architecture',
    },
  ],

  docker: [
    {
      text: 'What is the difference between a Docker image and a Docker container?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'An image is a read-only template; a container is a running instance of an image',
        'They are the same thing',
        'A container is a template; an image is a running instance',
        'An image runs on the host; a container runs in the cloud',
      ],
      correctAnswer: 'An image is a read-only template; a container is a running instance of an image',
      explanation: 'Docker images are immutable blueprints containing the application and dependencies. Containers are running instances created from images.',
      difficulty: 'BEGINNER',
      skillArea: 'Fundamentals',
    },
    {
      text: 'Multi-stage builds in Docker reduce the final image size by separating build and runtime stages.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Multi-stage builds use multiple FROM statements, allowing you to copy only necessary artifacts from build stages into a minimal runtime image.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Optimization',
    },
    {
      text: 'What does the EXPOSE instruction in a Dockerfile do?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'Documents which ports the container listens on at runtime',
        'Automatically opens firewall ports',
        'Publishes ports to the host machine',
        'Creates a network bridge',
      ],
      correctAnswer: 'Documents which ports the container listens on at runtime',
      explanation: 'EXPOSE is documentation — it signals which ports the application uses. To actually publish ports, use `docker run -p` flags.',
      difficulty: 'BEGINNER',
      skillArea: 'Dockerfile',
    },
  ],

  postgresql: [
    {
      text: 'What is the purpose of a database index?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'To speed up data retrieval operations at the cost of additional storage',
        'To encrypt sensitive columns',
        'To automatically back up the database',
        'To enforce foreign key constraints',
      ],
      correctAnswer: 'To speed up data retrieval operations at the cost of additional storage',
      explanation: 'Indexes create optimized data structures (B-tree, hash) that allow the database engine to find rows faster, trading storage space for query speed.',
      difficulty: 'BEGINNER',
      skillArea: 'Performance',
    },
    {
      text: 'PostgreSQL supports JSONB data type for efficient JSON storage and querying.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'JSONB stores JSON in a binary format that supports indexing, efficient queries, and operators like @>, ?, and #>.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Data Types',
    },
    {
      text: 'What does VACUUM do in PostgreSQL?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'Reclaims storage from dead tuples and updates statistics for the query planner',
        'Deletes all data from a table',
        'Creates a backup of the database',
        'Optimizes SQL query syntax',
      ],
      correctAnswer: 'Reclaims storage from dead tuples and updates statistics for the query planner',
      explanation: 'VACUUM removes dead row versions left by UPDATE/DELETE operations and updates table statistics used by the query planner.',
      difficulty: 'ADVANCED',
      skillArea: 'Maintenance',
    },
  ],

  kubernetes: [
    {
      text: 'What is a Kubernetes Pod?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'The smallest deployable unit containing one or more containers',
        'A virtual machine running in the cluster',
        'A network load balancer',
        'A storage volume',
      ],
      correctAnswer: 'The smallest deployable unit containing one or more containers',
      explanation: 'A Pod is the basic execution unit in Kubernetes, encapsulating one or more containers that share networking and storage.',
      difficulty: 'BEGINNER',
      skillArea: 'Core Concepts',
    },
    {
      text: 'What is the purpose of a Kubernetes Service?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'To provide stable networking and load balancing for a set of Pods',
        'To manage container images',
        'To run batch jobs',
        'To store configuration data',
      ],
      correctAnswer: 'To provide stable networking and load balancing for a set of Pods',
      explanation: 'A Service provides a stable IP address and DNS name for accessing Pods, load balancing traffic across healthy replicas.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Networking',
    },
    {
      text: 'Kubernetes Deployments support rolling updates with zero downtime.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Deployments manage ReplicaSets and support rolling updates by gradually replacing old Pods with new ones, ensuring zero downtime.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Workloads',
    },
  ],

  mlops: [
    {
      text: 'What is the primary goal of MLOps?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'To streamline the ML lifecycle from development through deployment to monitoring',
        'To build machine learning models faster',
        'To replace DevOps for ML projects',
        'To manage GPU clusters',
      ],
      correctAnswer: 'To streamline the ML lifecycle from development through deployment to monitoring',
      explanation: 'MLOps applies DevOps principles to ML, automating the pipeline from experiment tracking through deployment, monitoring, and retraining.',
      difficulty: 'BEGINNER',
      skillArea: 'Fundamentals',
    },
    {
      text: 'Model versioning tracks changes to ML models similar to how Git tracks code changes.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Model versioning (via tools like MLflow, DVC) tracks model artifacts, hyperparameters, and metrics, enabling reproducibility and rollback.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Versioning',
    },
    {
      text: 'What is data drift in the context of ML production systems?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'A change in the statistical properties of input data over time',
        'Data being stored in the wrong database',
        'Network latency causing data delays',
        'A bug in the data preprocessing pipeline',
      ],
      correctAnswer: 'A change in the statistical properties of input data over time',
      explanation: 'Data drift occurs when production data distribution shifts from training data distribution, potentially degrading model performance.',
      difficulty: 'INTERMEDIATE',
      skillArea: 'Monitoring',
    },
  ],

  'ci-cd': [
    {
      text: 'What is Continuous Integration (CI)?',
      type: 'MULTIPLE_CHOICE',
      choices: [
        'The practice of frequently merging code changes and running automated tests',
        'Deploying code to production continuously',
        'Writing integration tests',
        'Using a single branch for all development',
      ],
      correctAnswer: 'The practice of frequently merging code changes and running automated tests',
      explanation: 'CI involves developers frequently integrating code into a shared repository, with each integration verified by automated builds and tests.',
      difficulty: 'BEGINNER',
      skillArea: 'Fundamentals',
    },
    {
      text: 'A CI/CD pipeline should include automated testing to catch regressions.',
      type: 'TRUE_FALSE',
      choices: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'Automated testing in CI/CD ensures that code changes don\'t break existing functionality and maintains code quality standards.',
      difficulty: 'BEGINNER',
      skillArea: 'Best Practices',
    },
  ],
};

// Fall-back generic questions for skills without a specific question bank
const GENERIC_QUESTIONS: QuestionTemplate[] = [
  {
    text: 'Understanding foundational concepts is essential before advancing to more complex topics.',
    type: 'TRUE_FALSE',
    choices: ['True', 'False'],
    correctAnswer: 'True',
    explanation: 'Building a strong foundation in any skill helps ensure that advanced concepts can be understood and applied effectively.',
    difficulty: 'BEGINNER',
    skillArea: 'Fundamentals',
  },
  {
    text: 'Which learning approach is most effective for acquiring new technical skills?',
    type: 'MULTIPLE_CHOICE',
    choices: [
      'Active practice combined with theory study',
      'Reading documentation only',
      'Watching videos passively',
      'Memorizing syntax and APIs',
    ],
    correctAnswer: 'Active practice combined with theory study',
    explanation: 'Research shows that combining active practice (building projects, solving problems) with theoretical study produces the most durable skill acquisition.',
    difficulty: 'BEGINNER',
    skillArea: 'Learning Strategy',
  },
  {
    text: 'What is the most important metric when evaluating skill proficiency?',
    type: 'MULTIPLE_CHOICE',
    choices: [
      'Ability to apply knowledge to solve real-world problems',
      'Number of certificates earned',
      'Years of experience claimed',
      'Number of tutorials completed',
    ],
    correctAnswer: 'Ability to apply knowledge to solve real-world problems',
    explanation: 'True proficiency is demonstrated by the ability to apply knowledge practically, not just by credentials or time spent.',
    difficulty: 'INTERMEDIATE',
    skillArea: 'Assessment',
  },
];

// ============================================================
// IN-MEMORY ASSESSMENT STORE (fallback when DB is offline)
// ============================================================

interface StoredAssessment {
  id: string;
  userId: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  learningPathItemId?: string | null;
  type: string;
  status: string;
  title: string;
  description: string;
  timeLimit: number | null;
  questions: AssessmentQuestionDTO[];
  correctAnswers: Map<string, string>; // questionId -> correctAnswer (server-only)
  maxScore: number;
  score: number | null;
  percentage: number | null;
  gradedAt: Date | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  attempts: AssessmentAttemptDTO[];
}

const IN_MEMORY_ASSESSMENTS = new Map<string, StoredAssessment>();

// Counter for deterministic IDs
let assessmentCounter = 0;

// ============================================================
// ASSESSMENT ENGINE SERVICE
// ============================================================

export class AssessmentEngineService {
  /**
   * Generate questions for a skill using the deterministic question bank
   */
  generateQuestionsForSkill(
    skillSlug: string,
    count: number = 5,
    difficulty?: string
  ): { questions: AssessmentQuestionDTO[]; correctAnswers: Map<string, string> } {
    const templates = QUESTION_BANK[skillSlug] || GENERIC_QUESTIONS;
    const correctAnswers = new Map<string, string>();

    let filtered = templates;
    if (difficulty) {
      const diffFiltered = templates.filter((t) => t.difficulty === difficulty);
      if (diffFiltered.length > 0) filtered = diffFiltered;
    }

    const selected = filtered.slice(0, Math.min(count, filtered.length));

    const questions: AssessmentQuestionDTO[] = selected.map((template, index) => {
      const questionId = `q_${skillSlug}_${index + 1}`;
      correctAnswers.set(questionId, template.correctAnswer);

      return {
        id: questionId,
        questionNumber: index + 1,
        type: template.type,
        text: template.text,
        choices: template.choices,
        codeSnippet: template.codeSnippet,
        difficulty: template.difficulty,
        skillArea: template.skillArea,
        // NOTE: correctAnswer is NOT included — server-only
      };
    });

    return { questions, correctAnswers };
  }

  /**
   * Create a new assessment for a user/skill
   */
  async createAssessment(
    userId: string,
    skillId: string,
    type: string = 'QUIZ',
    learningPathItemId?: string
  ): Promise<AssessmentDTO> {
    // Resolve skill info
    const skillInfo = await this.resolveSkillInfo(skillId);
    const { questions, correctAnswers } = this.generateQuestionsForSkill(skillInfo.slug, 5);

    const assessmentId = `assess_${++assessmentCounter}_${skillInfo.slug}`;
    const now = new Date();

    const assessment: StoredAssessment = {
      id: assessmentId,
      userId,
      skillId,
      skillName: skillInfo.name,
      skillSlug: skillInfo.slug,
      learningPathItemId: learningPathItemId || null,
      type,
      status: 'CREATED',
      title: `${skillInfo.name} Assessment`,
      description: `Test your ${skillInfo.name} knowledge with ${questions.length} questions`,
      timeLimit: 15, // 15 minutes
      questions,
      correctAnswers,
      maxScore: questions.length * 20, // 20 points per question
      score: null,
      percentage: null,
      gradedAt: null,
      startedAt: null,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
      attempts: [],
    };

    // Try DB first
    try {
      await prismaClient.assessment.create({
        data: {
          id: assessmentId,
          userId,
          skillId,
          learningPathItemId: learningPathItemId || null,
          type: type as PrismaAssessmentType,
          status: 'CREATED',
          title: assessment.title,
          description: assessment.description,
          timeLimit: assessment.timeLimit,
          questions: questions as any,
          maxScore: assessment.maxScore,
        },
      });
    } catch {
      // DB offline — use in-memory
    }

    IN_MEMORY_ASSESSMENTS.set(assessmentId, assessment);

    return this.formatAssessmentDTO(assessment);
  }

  /**
   * Start an assessment (transitions to IN_PROGRESS)
   */
  async startAssessment(userId: string, assessmentId: string): Promise<AssessmentDTO> {
    const assessment = await this.getAssessmentInternal(userId, assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.userId !== userId) {
      throw new Error('Assessment not found');
    }

    if (assessment.status !== 'CREATED') {
      throw new Error(`Assessment cannot be started: current status is ${assessment.status}`);
    }

    assessment.status = 'IN_PROGRESS';
    assessment.startedAt = new Date();
    assessment.updatedAt = new Date();

    // Update DB
    try {
      await prismaClient.assessment.update({
        where: { id: assessmentId },
        data: { status: 'IN_PROGRESS', startedAt: assessment.startedAt },
      });
    } catch {
      // DB offline
    }

    return this.formatAssessmentDTO(assessment);
  }

  /**
   * Submit answers and grade the assessment
   */
  async submitAssessment(
    userId: string,
    assessmentId: string,
    answers: Record<string, string>
  ): Promise<AssessmentResultDTO> {
    const assessment = await this.getAssessmentInternal(userId, assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    if (assessment.userId !== userId) {
      throw new Error('Assessment not found');
    }

    if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'CREATED') {
      throw new Error(`Assessment cannot be submitted: current status is ${assessment.status}`);
    }

    // Grade answers server-side
    const { feedback, score, percentage } = this.gradeAnswers(assessment, answers);

    const now = new Date();
    assessment.status = 'GRADED';
    assessment.score = score;
    assessment.percentage = percentage;
    assessment.submittedAt = now;
    assessment.gradedAt = now;
    assessment.updatedAt = now;

    const attemptNumber = assessment.attempts.length + 1;
    const attempt: AssessmentAttemptDTO = {
      id: `attempt_${assessmentId}_${attemptNumber}`,
      assessmentId,
      attemptNumber,
      score,
      percentage,
      feedback,
      submittedAt: now,
      gradedAt: now,
    };
    assessment.attempts.push(attempt);

    // Update DB
    try {
      await prismaClient.assessment.update({
        where: { id: assessmentId },
        data: {
          status: 'GRADED',
          score,
          percentage,
          submittedAt: now,
          gradedAt: now,
        },
      });
      await prismaClient.assessmentAttempt.create({
        data: {
          id: attempt.id,
          assessmentId,
          attemptNumber,
          answers: answers as any,
          score,
          percentage,
          feedback: feedback as any,
          submittedAt: now,
          gradedAt: now,
        },
      });
    } catch {
      // DB offline
    }

    // Evidence Bridge: Create ASSESSMENT_RESULT evidence
    const confidenceImpact = await this.createAssessmentEvidence(userId, assessment, percentage);

    // Path Adaptation
    const pathAdaptation = await this.triggerPathAdaptation(userId, assessment, percentage);

    const passed = percentage >= 70;

    return {
      assessmentId,
      skillId: assessment.skillId,
      skillName: assessment.skillName,
      score,
      maxScore: assessment.maxScore,
      percentage,
      passed,
      feedback,
      confidenceImpact,
      pathAdaptation,
    };
  }

  /**
   * Get assessment by ID for authenticated user
   */
  async getAssessment(userId: string, assessmentId: string): Promise<AssessmentDTO | null> {
    const assessment = await this.getAssessmentInternal(userId, assessmentId);
    if (!assessment || assessment.userId !== userId) return null;
    return this.formatAssessmentDTO(assessment);
  }

  /**
   * List all assessments for a user
   */
  async listUserAssessments(userId: string): Promise<AssessmentDTO[]> {
    const results: AssessmentDTO[] = [];

    // Check DB first
    try {
      const dbAssessments = await prismaClient.assessment.findMany({
        where: { userId },
        include: { skill: true },
        orderBy: { createdAt: 'desc' },
      });

      for (const dba of dbAssessments) {
        results.push({
          id: dba.id,
          userId: dba.userId,
          skillId: dba.skillId,
          skillName: dba.skill.name,
          skillSlug: dba.skill.slug,
          learningPathItemId: dba.learningPathItemId,
          type: dba.type,
          status: dba.status,
          title: dba.title,
          description: dba.description,
          timeLimit: dba.timeLimit,
          questions: (dba.questions as any) || [],
          maxScore: dba.maxScore,
          score: dba.score,
          percentage: dba.percentage,
          gradedAt: dba.gradedAt,
          startedAt: dba.startedAt,
          submittedAt: dba.submittedAt,
          createdAt: dba.createdAt,
          updatedAt: dba.updatedAt,
        });
      }

      if (results.length > 0) return results;
    } catch {
      // DB offline
    }

    // In-memory fallback
    for (const [, assessment] of IN_MEMORY_ASSESSMENTS) {
      if (assessment.userId === userId) {
        results.push(this.formatAssessmentDTO(assessment));
      }
    }

    return results;
  }

  /**
   * Get assessment result (after grading)
   */
  async getAssessmentResult(userId: string, assessmentId: string): Promise<AssessmentResultDTO | null> {
    const assessment = await this.getAssessmentInternal(userId, assessmentId);
    if (!assessment || assessment.userId !== userId) return null;
    if (assessment.status !== 'GRADED') return null;

    const latestAttempt = assessment.attempts[assessment.attempts.length - 1];
    if (!latestAttempt) return null;

    return {
      assessmentId,
      skillId: assessment.skillId,
      skillName: assessment.skillName,
      score: latestAttempt.score,
      maxScore: assessment.maxScore,
      percentage: latestAttempt.percentage,
      passed: latestAttempt.percentage >= 70,
      feedback: latestAttempt.feedback,
      confidenceImpact: {
        previousConfidence: 50,
        newConfidence: Math.min(100, 50 + Math.round(latestAttempt.percentage * 0.4)),
        delta: Math.round(latestAttempt.percentage * 0.4),
      },
      pathAdaptation: {
        itemsUnlocked: 0,
        masteryAchieved: latestAttempt.percentage >= 70,
      },
    };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private gradeAnswers(
    assessment: StoredAssessment,
    answers: Record<string, string>
  ): { feedback: AssessmentQuestionFeedback[]; score: number; percentage: number } {
    const feedback: AssessmentQuestionFeedback[] = [];
    let correctCount = 0;

    const bankTemplates = QUESTION_BANK[assessment.skillSlug] || GENERIC_QUESTIONS;

    for (const question of assessment.questions) {
      const userAnswer = answers[question.id] || '';
      const correctAnswer = assessment.correctAnswers.get(question.id) || '';
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

      if (isCorrect) correctCount++;

      // Find explanation from template
      const templateIndex = question.questionNumber - 1;
      const template = bankTemplates[templateIndex];
      const explanation = template?.explanation || (isCorrect ? 'Correct!' : 'Incorrect.');

      feedback.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        isCorrect,
        userAnswer,
        correctAnswer,
        explanation,
      });
    }

    const totalQuestions = assessment.questions.length;
    const score = correctCount * 20; // 20 points per question
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return { feedback, score, percentage };
  }

  private async createAssessmentEvidence(
    userId: string,
    assessment: StoredAssessment,
    percentage: number
  ): Promise<{ previousConfidence: number; newConfidence: number; delta: number }> {
    let previousConfidence = 50;

    try {
      // Get current confidence
      const currentConf = await skillConfidenceService.getUserSkillConfidence(userId, assessment.skillId);
      if (currentConf) {
        previousConfidence = currentConf.confidence;
      }
    } catch {
      // Service unavailable
    }

    // Calculate confidence boost based on assessment score
    // High scores increase confidence; low scores have minimal impact (never decrease)
    const confidenceBoost = Math.max(0, Math.round((percentage - 50) * 0.4));
    const newConfidence = Math.min(100, previousConfidence + confidenceBoost);

    // Try to create evidence in DB
    try {
      const userSkill = await prismaClient.userSkill.findFirst({
        where: { userId, skillId: assessment.skillId },
      });

      if (userSkill) {
        await prismaClient.skillEvidence.create({
          data: {
            userSkillId: userSkill.id,
            skillId: assessment.skillId,
            type: 'ASSESSMENT_RESULT',
            title: `${assessment.skillName} Assessment - ${percentage}%`,
            description: `Scored ${assessment.score}/${assessment.maxScore} (${percentage}%) on ${assessment.title}`,
            metadata: {
              assessmentId: assessment.id,
              score: assessment.score,
              maxScore: assessment.maxScore,
              percentage,
              questionCount: assessment.questions.length,
              type: assessment.type,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Update confidence on UserSkill
        await prismaClient.userSkill.update({
          where: { id: userSkill.id },
          data: { confidence: newConfidence },
        });
      }
    } catch {
      // DB offline
    }

    return {
      previousConfidence,
      newConfidence,
      delta: newConfidence - previousConfidence,
    };
  }

  private async triggerPathAdaptation(
    userId: string,
    assessment: StoredAssessment,
    percentage: number
  ): Promise<{ itemsUnlocked: number; masteryAchieved: boolean }> {
    let itemsUnlocked = 0;
    const masteryAchieved = percentage >= 70;

    if (!masteryAchieved) {
      return { itemsUnlocked, masteryAchieved };
    }

    // If the assessment is linked to a learning path item, try completing it
    if (assessment.learningPathItemId) {
      try {
        await personalizedLearningPathService.completeItem(userId, assessment.learningPathItemId);
        itemsUnlocked = 1; // At minimum the completion itself may unlock dependents
      } catch {
        // Item may already be completed or not found
      }
    }

    return { itemsUnlocked, masteryAchieved };
  }

  private async getAssessmentInternal(userId: string, assessmentId: string): Promise<StoredAssessment | null> {
    // Check in-memory first
    if (IN_MEMORY_ASSESSMENTS.has(assessmentId)) {
      return IN_MEMORY_ASSESSMENTS.get(assessmentId)!;
    }

    // Try DB
    try {
      const dba = await prismaClient.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          skill: true,
          attempts: { orderBy: { attemptNumber: 'asc' } },
        },
      });

      if (dba) {
        const templates = QUESTION_BANK[dba.skill.slug] || GENERIC_QUESTIONS;
        const correctAnswers = new Map<string, string>();
        const questions = (dba.questions as any[]) || [];
        questions.forEach((q: any, i: number) => {
          const template = templates[i];
          if (template) {
            correctAnswers.set(q.id, template.correctAnswer);
          }
        });

        const stored: StoredAssessment = {
          id: dba.id,
          userId: dba.userId,
          skillId: dba.skillId,
          skillName: dba.skill.name,
          skillSlug: dba.skill.slug,
          learningPathItemId: dba.learningPathItemId,
          type: dba.type,
          status: dba.status,
          title: dba.title,
          description: dba.description || '',
          timeLimit: dba.timeLimit,
          questions: questions as AssessmentQuestionDTO[],
          correctAnswers,
          maxScore: dba.maxScore,
          score: dba.score,
          percentage: dba.percentage,
          gradedAt: dba.gradedAt,
          startedAt: dba.startedAt,
          submittedAt: dba.submittedAt,
          createdAt: dba.createdAt,
          updatedAt: dba.updatedAt,
          attempts: dba.attempts.map((a) => ({
            id: a.id,
            assessmentId: a.assessmentId,
            attemptNumber: a.attemptNumber,
            score: a.score,
            percentage: a.percentage,
            feedback: (a.feedback as any) || [],
            submittedAt: a.submittedAt,
            gradedAt: a.gradedAt,
          })),
        };

        IN_MEMORY_ASSESSMENTS.set(dba.id, stored);
        return stored;
      }
    } catch {
      // DB offline
    }

    return null;
  }

  private async resolveSkillInfo(skillId: string): Promise<{ name: string; slug: string }> {
    // Try DB
    try {
      const skill = await prismaClient.skill.findUnique({ where: { id: skillId } });
      if (skill) return { name: skill.name, slug: skill.slug };
    } catch {
      // DB offline
    }

    // Fallback to demo skills
    const demo = DEMO_SKILLS.find((s) => s.id === skillId || s.slug === skillId);
    if (demo) return { name: demo.name, slug: demo.slug };

    // Extract slug from ID pattern
    const slug = skillId.replace(/^sk_/, '').replace(/_/g, '-');
    const name = slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { name, slug };
  }

  private formatAssessmentDTO(assessment: StoredAssessment): AssessmentDTO {
    return {
      id: assessment.id,
      userId: assessment.userId,
      skillId: assessment.skillId,
      skillName: assessment.skillName,
      skillSlug: assessment.skillSlug,
      learningPathItemId: assessment.learningPathItemId,
      type: assessment.type,
      status: assessment.status,
      title: assessment.title,
      description: assessment.description,
      timeLimit: assessment.timeLimit,
      questions: assessment.questions,
      maxScore: assessment.maxScore,
      score: assessment.score,
      percentage: assessment.percentage,
      gradedAt: assessment.gradedAt,
      startedAt: assessment.startedAt,
      submittedAt: assessment.submittedAt,
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    };
  }
}

export const assessmentEngineService = new AssessmentEngineService();
