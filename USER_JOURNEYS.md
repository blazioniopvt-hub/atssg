# User Journeys

> **Status**: IMPLEMENTED — End-to-end flows documented for all core features
> **Based on**: Actual implemented pages and API endpoints (Phase 9)

---

## Journey Map Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│  Discover   │────▶│  Onboard     │────▶│  Build Profile │────▶│  Discover & Grow │
│  (Landing)  │     │  (Auth)      │     │  (Skills/Ev)   │     │  (Learning/AI)   │
└─────────────┘     └──────────────┘     └────────────────┘     └──────────────────┘
                           │                    │                       │
                           ▼                    ▼                       ▼
                    ┌─────────────┐     ┌──────────────┐     ┌────────────────┐
                    │  Register   │     │  Add Skills  │     │  AI Extract    │
                    │  / Login    │     │  + Evidence  │     │  Resume Parse  │
                    └─────────────┘     └──────────────┘     └────────────────┘
```

---

## Journey 1: Discovery → Registration

### Entry Points
- Direct: `/` (Home page)
- Referral: `/skills`, `/learning` (redirect to login)
- Invitation: `/auth/register?invite=...` (future)

### Flow

```
User visits / (Home)
    │
    ▼
Sees: "SkillSync — Intelligent platform for skills discovery and career development"
    │
    ▼
Clicks: "Create account" → /auth/register
    │
    ▼
Fills: Email, Username, Password (8+ chars, upper/lower/number/special), Display Name
    │
    ▼
POST /auth/register
    │
    ├── Success (201): Cookie set, redirect to /dashboard
    └── Error (409): "Account exists" → Show inline error
    │
    ▼
Dashboard loads with empty state → Quick Actions visible
```

### Success Criteria
- [ ] Registration completes in <3 clicks
- [ ] Password validation inline (not just on submit)
- [ ] Session cookie set (HttpOnly, Secure, SameSite=Lax)
- [ ] Redirected to dashboard with welcome banner

---

## Journey 2: Returning User Login

### Flow

```
User visits / or /dashboard
    │
    ▼
Redirected to /auth/login (if no session)
    │
    ▼
Enters: Email + Password
    │
    ▼
POST /auth/login
    │
    ├── Success (200): Cookie set, redirect to /dashboard
    ├── Error (401): "Invalid email or password" (generic)
    └── Error (403): "Account not active" → Contact support
    │
    ▼
Dashboard loads with user data
```

### Session Persistence
- Cookie: `skillsync_session` (7-day expiry)
- Auto-refresh: `GET /auth/me` on app load via `AuthContext`
- Logout: `POST /auth/logout` → Cookie cleared, session deleted from DB

---

## Journey 3: Build Skill Profile

### Entry: Dashboard → "Add Skill" quick action

### Flow

```
User on /dashboard
    │
    ▼
Clicks "Add Skill" → /skills (Skill Catalog)
    │
    ▼
Browses/filters skills (search, category, pagination)
    │
    ▼
Clicks skill → /skills/[slug] (Skill Detail)
    │
    ▼
Reviews: Prerequisites, Relationships, Gap Analysis
    │
    ▼
Clicks "Manage Skills" → /skill-intelligence
    │
    ▼
Clicks "Add Skill" modal:
    - Skill selector (currently: skill ID input - UX gap)
    - Proficiency: BEGINNER/INTERMEDIATE/ADVANCED/EXPERT
    - Years Experience: number
    │
    ▼
POST /skill-intelligence/skills
    │
    ├── Creates UserSkill + SELF_REPORTED evidence
    ├── Confidence: 50% baseline
    └── Redirects to updated skills grid
    │
    ▼
User clicks skill card → Detail Modal opens
    │
    ▼
Clicks "Attach Evidence" in modal or visits /evidence
    │
    ▼
Evidence Form:
    - Select target skill
    - Type: PROJECT/CERTIFICATE/ASSESSMENT_RESULT/WORK_EXPERIENCE/PORTFOLIO_ITEM
    - Title, Description, URL
    │
    ▼
POST /skill-intelligence/skills/:skillId/evidence
    │
    ├── Evidence created
    ├── Confidence recalculated (deterministic algorithm)
    └── Verification status: UNVERIFIED
    │
    ▼
User repeats for multiple skills + evidence
```

### Confidence Calculation (Automatic)
```
Base: 0.1 (self-reported)
+ Proficiency: BEGINNER=0.1, INTERMEDIATE=0.3, ADVANCED=0.6, EXPERT=0.85
+ Evidence weights: PROJECT=0.3, CERTIFICATE=0.25, ASSESSMENT=0.4, EXPERIENCE=0.25, PORTFOLIO=0.2
+ Diminishing returns: 80% per additional same-type evidence
+ Verification bonus: 1.2x if VERIFIED
+ Recency bonus: +0.05 per recent (<365 days) evidence, max 3
= Clamped to [0.0, 1.0]
```

### Success Criteria
- [ ] Can add 5+ skills in one session
- [ ] Confidence updates in real-time after evidence
- [ ] Evidence types clearly distinguished
- [ ] Verification status visible

---

## Journey 4: Resume Upload & AI Parsing

### Entry: Dashboard → "Upload Resume" quick action

### Flow

```
User on /dashboard
    │
    ▼
Clicks "Upload Resume" → /resumes/new
    │
    ▼
Drags/drops or selects: PDF/DOCX/TXT (≤10MB)
    │
    ▼
POST /resumes/upload (multipart)
    │
    ├── Uploads to storage (Local/S3)
    ├── Creates Resume record (status: UPLOADED)
    └── Redirects to /resumes/[id]/analyze
    │
    ▼
Analysis Page Loads:
    1. Checks existing analysis (GET /resumes/:id/analysis)
    2. If none: Runs analysis (POST /resumes/:id/analyze)
       - Downloads file from storage
       - Extracts text (pdf-parse/mammoth)
       - Calls AI provider (OpenAI/Anthropic/Local)
       - Parses structured response
       - Stores ResumeAnalysis (JSON)
    │
    ▼
User Reviews Extracted Data:
    ┌─────────────────────────────────────────────────┐
    │ Skills Grid (checkboxes)                        │
    │  ☑ TypeScript (95%)  ☑ React (90%)  ☐ Python   │
    │  Confidence badges, Matched/Unmatched tags      │
    ├─────────────────────────────────────────────────┤
    │ Experiences (read-only)                         │
    │  Senior Engineer @ Acme Corp (2022-present)     │
    ├─────────────────────────────────────────────────┤
    │ Projects / Education (read-only)                │
    └─────────────────────────────────────────────────┘
    │
    ▼
User selects skills → Clicks "Confirm N Selected Skills"
    │
    ▼
POST /resumes/:id/confirm { acceptedSkills: [...] }
    │
    ├── Creates UserSkill for each (INTERMEDIATE, 70% confidence)
    ├── Creates SkillEvidence (WORK_EXPERIENCE, "Parsed from Resume")
    ├── Creates Project for each experience
    └── Redirects to /dashboard (1.5s delay)
    │
    ▼
Dashboard updates: Skills count + Resume count incremented
```

### AI Extraction Details
- **Provider**: OpenAI GPT-4o-mini / Anthropic Claude 3.5 Haiku / Ollama llama3.1:8b
- **Prompt**: Structured extraction with JSON schema
- **Output**: personalInfo, summary, skills[], experiences[], education[], projects[], certifications[]
- **Normalization**: Each skill matched against catalog (exact → alias → no match)

### Success Criteria
- [ ] Upload → Analysis → Confirm in <2 minutes
- [ ] Extracted skills show confidence scores
- [ ] Matched skills link to catalog (auto-add evidence)
- [ ] Unmatched skills flagged for manual review
- [ ] Confirmation creates full profile entries

---

## Journey 5: Skill Gap Analysis & Learning Path

### Entry: Dashboard → "Learning Paths" quick action

### Flow

```
User on /dashboard
    │
    ▼
Clicks "Learning Paths" → /learning
    │
    ▼
Browses skill catalog (same as /skills but with selection)
    │
    ▼
Selects target skill → Learning plan loads inline
    │
    ▼
Readiness Badge: READY / PARTIAL / FOUNDATION_REQUIRED
    │
    ▼
Gap Summary (4 metrics):
    - Known (green): Prereqs user has at sufficient level
    - Partial (yellow): Prereqs user has but below threshold
    - Missing (red): Prereqs user doesn't have
    - Foundation Required (orange): Critical missing prereqs
    │
    ▼
Prioritized Gaps List:
    Each gap shows: Skill, Status, Priority, Required Strength, Reason
    │
    ▼
Learning Path (Topological Milestones):
    Milestone 1: Python (INTERMEDIATE) → 20 hrs
    Milestone 2: Linear Algebra (BEGINNER) → 15 hrs
    Milestone 3: Statistics (INTERMEDIATE) → 25 hrs
    ...
    Milestone N: Machine Learning (ADVANCED) → 40 hrs
    │
    ▼
Resources per Milestone:
    - Courses, Books, Videos, Documentation
    - Filtered by type, difficulty, verified source
    │
    ▼
Clicks "View Full Page" → /learning/[skillSlug]
    │
    ▼
Detailed view with all sections expanded
```

### Readiness Logic
```
GET /learning/plan/:skillId
    │
    ▼
1. Get target skill prerequisites (PREREQUISITE edges)
2. Get user's UserSkill records
3. For each prereq:
   - KNOWN: User has skill, confidence ≥ 70%, proficiency ≥ required
   - PARTIAL: User has skill but confidence < 70% or proficiency < required
   - MISSING: User doesn't have skill
   - FOUNDATION_REQUIRED: MISSING + strength ≥ 0.8 (critical path)
4. Topological sort by prerequisite chain
5. Assign target proficiency per milestone
6. Fetch LearningResources for each prereq skill
```

### Success Criteria
- [ ] Readiness assessment accurate to user's actual skills
- [ ] Prioritized gaps actionable (not just list)
- [ ] Learning path follows prerequisite topology
- [ ] Resources relevant and high-quality
- [ ] Can navigate from gap → skill detail → add skill

---

## Journey 6: AI Skill Extraction from Text

### Entry: `/ai/analyze` (direct navigation or future: "Extract from LinkedIn")

### Flow

```
User visits /ai/analyze
    │
    ▼
Pastes experience text:
    "I built a computer vision attendance system using Python,
    OpenCV, and TensorFlow for my university capstone project.
    I also have 2 years of experience with React and TypeScript
    building scalable web applications."
    │
    ▼
Optional: Adds context "Senior capstone project"
    │
    ▼
Clicks "Analyze Skills"
    │
    ▼
POST /ai/skills/extract
    │
    ├── Creates AIExtractionJob
    ├── Calls provider with prompt
    └── Returns structured skills
    │
    ▼
Results Displayed:
    ┌─────────────────────────────────────────────┐
    │ Python        ✓ Matched: Python (100%)     │
    │ Computer Vis  ✓ Matched: Computer Vision   │
    │ TensorFlow    ✓ Matched: TensorFlow        │
    │ React         ✓ Matched: React             │
    │ TypeScript    ✓ Matched: TypeScript        │
    │ Each: Extraction confidence, Match reason  │
    └─────────────────────────────────────────────┘
    │
    ▼
User clicks matched skills to select
    │
    ▼
Clicks "Add N Selected Skills to Profile"
    │
    ▼
For each: POST /skill-intelligence/skills { skillId, proficiency: BEGINNER }
    │
    ▼
Skills added with SELF_REPORTED evidence
    │
    ▼
Redirect/refresh to show updated profile
```

### Success Criteria
- [ ] Extraction completes in <5 seconds
- [ ] Matched skills link to catalog automatically
- [ ] Unmatched skills clearly marked
- [ ] One-click add to profile
- [ ] Extraction job stored for history

---

## Journey 7: Skill Catalog Exploration

### Entry: `/skills` (from nav or dashboard)

### Flow

```
User on /skills
    │
    ▼
Sees paginated grid of all skills (20/page)
    │
    ▼
Filters: Search "React" + Category "PROGRAMMING"
    │
    ▼
Clicks skill card → /skills/[slug]
    │
    ▼
Tabs: Overview | Relationships | Skill Gap
    │
    ├── Overview: Description, category, demand, verified
    ├── Relationships: Grouped by type (Prereq, Subskill, etc.)
    │   Clicks related skill → navigates to that skill
    └── Skill Gap: Personal gap analysis (if authenticated)
        Shows readiness, gaps, missing prereqs
    │
    ▼
From any skill: "Manage Skills" → /skill-intelligence
```

---

## Journey 8: Project Portfolio

### Entry: Dashboard → future "Projects" quick action

### Current State (Partial)
- Projects created via: Resume confirm (experiences → projects)
- API: `/skill-intelligence/projects` CRUD
- UI: Not yet built (no `/projects` page)

### Planned Flow
```
User creates project:
    - Title, description, repo/live URLs, dates
    - Links skills (ProjectSkill)
    - Invites collaborators (ProjectMember)
    │
    ▼
Project appears in portfolio
    │
    ▼
Skills linked to project → Can attach as evidence
    (POST /skill-intelligence/skills/:skillId/evidence with type=PROJECT)
    │
    ▼
Evidence verified → Confidence boost + PROJECT_DEMONSTRATED
```

---

## Journey 9: Opportunity Discovery (Future)

### Planned (Phase 11)
```
User visits /opportunities
    │
    ▼
Filters: Type (JOB/INTERNSHIP), Remote, Skills, Location
    │
    ▼
Sees match score based on skill profile
    │
    ▼
Clicks opportunity → Details
    │
    ▼
Applies: Cover letter + Resume selection
    │
    ▼
POST /opportunities/:id/apply
    │
    ▼
Tracks application status in dashboard
```

---

## Cross-Journey Touchpoints

| Touchpoint | Journeys | Purpose |
|------------|----------|---------|
| `/dashboard` | All | Central hub, metrics, quick actions |
| `/skill-intelligence` | 3, 4, 5, 6 | Single source of truth for skills |
| `/skills/[slug]` | 3, 5, 7 | Skill details + personal gap |
| `/resumes/[id]/analyze` | 4 | Bridge resume → profile |
| `/learning` + `/learning/[slug]` | 5 | Gap → Path → Resources |
| `/ai/analyze` | 6 | Free-text → Structured skills |

---

## Error & Edge Case Handling

| Scenario | Current Handling | User Experience |
|----------|------------------|-----------------|
| Session expired | Redirect to `/auth/login` | Seamless re-auth |
| AI provider down | `503 AI_NOT_CONFIGURED` | "Service unavailable, try later" |
| Resume parse fails | `500 ANALYSIS_FAILED` | "Re-run Analysis" button |
| Skill not in catalog | Normalization: `matched: false` | Manual add option |
| Duplicate skill add | `409 CONFLICT` | "Already in profile" toast |
| Evidence validation fail | `400 BAD_REQUEST` | Inline form errors |
| Network error | React error boundary | "Something went wrong" |

---

## Metrics to Track (Future)

| Journey | Key Metrics |
|---------|-------------|
| Registration | Completion rate, time-to-dashboard |
| Skill Profile | Skills/user, evidence/skill, avg confidence |
| Resume Parse | Upload→Confirm rate, skills extracted/resume |
| Learning | Plans generated, milestones completed |
| AI Extract | Extractions/user, match rate, add-to-profile rate |