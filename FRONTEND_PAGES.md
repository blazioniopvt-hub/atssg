# Frontend Pages & User Flows

> **Status**: IMPLEMENTED — 16 pages in Next.js 14 App Router
> **Framework**: React 18, TypeScript, Tailwind CSS, shadcn/ui
> **Auth**: All pages except `/`, `/auth/*` require authentication via `AuthContext`

---

## Page Inventory

| # | Route | File | Auth | Purpose |
|---|-------|------|------|---------|
| 1 | `/` | `app/page.tsx` | No | Marketing home |
| 2 | `/auth/login` | `app/auth/login/page.tsx` | No | Login form |
| 3 | `/auth/register` | `app/auth/register/page.tsx` | No | Registration form |
| 4 | `/dashboard` | `app/dashboard/page.tsx` | Yes | Main dashboard |
| 5 | `/profile` | `app/profile/page.tsx` | Yes | Profile management |
| 6 | `/settings` | `app/settings/page.tsx` | Yes | Account settings |
| 7 | `/skills` | `app/skills/page.tsx` | Yes | Skill catalog explorer |
| 8 | `/skills/[slug]` | `app/skills/[slug]/page.tsx` | Yes | Skill detail + gap |
| 9 | `/skill-intelligence` | `app/skill-intelligence/page.tsx` | Yes | User skill mgmt + evidence |
| 10 | `/evidence` | `app/evidence/page.tsx` | Yes | Evidence portfolio |
| 11 | `/resumes` | `app/resumes/page.tsx` | Yes | Resume vault |
| 12 | `/resumes/new` | `app/resumes/new/page.tsx` | Yes | Upload resume |
| 13 | `/resumes/[id]/analyze` | `app/resumes/[id]/analyze/page.tsx` | Yes | AI analysis + confirm |
| 14 | `/learning` | `app/learning/page.tsx` | Yes | Learning paths overview |
| 15 | `/learning/[skillSlug]` | `app/learning/[skillSlug]/page.tsx` | Yes | Detailed learning plan |
| 16 | `/ai/analyze` | `app/ai/analyze/page.tsx` | Yes | AI skill extraction |

---

## Detailed Page Documentation

### 1. Home Page (`/`)

**File:** `apps/web/src/app/page.tsx`  
**Auth:** Public  
**Components:** `Button`, `Link`

**UI:**
- Hero: "SkillSync — Intelligent platform for skills discovery and career development"
- Phase badge: "Phase 3: Authentication & Identity" (outdated - now Phase 9)
- Two CTAs: "Sign in" → `/auth/login`, "Create account" → `/auth/register`
- 3-column feature grid: Showcase Skills, Project Portfolio, Discover Opportunities

**User Flow:**
```
Landing → Click "Sign in" → /auth/login
      → Click "Create account" → /auth/register
```

---

### 2. Login Page (`/auth/login`)

**File:** `apps/web/src/app/auth/login/page.tsx`  
**Auth:** Public  
**Components:** `LoginForm` (from `@/components/auth/LoginForm`)

**UI:**
- Centered card (max-w-md)
- Title: "Welcome back"
- LoginForm handles: email, password, submit, error display, link to register

**User Flow:**
```
Enter credentials → Submit → POST /auth/login
  → Success: Set cookie, redirect to /dashboard
  → Error: Display "Invalid email or password"
```

---

### 3. Register Page (`/auth/register`)

**File:** `apps/web/src/app/auth/register/page.tsx`  
**Auth:** Public  
**Components:** `RegisterForm` (from `@/components/auth/RegisterForm`)

**UI:**
- Centered card (max-w-md)
- Title: "Create your account"
- RegisterForm handles: email, username, password, confirm password, display name

**User Flow:**
```
Fill form → Submit → POST /auth/register
  → Success: Set cookie, redirect to /dashboard
  → Error: Display validation/conflict errors
```

---

### 4. Dashboard (`/dashboard`)

**File:** `apps/web/src/app/dashboard/page.tsx`  
**Auth:** Required (redirects to `/auth/login`)  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Link`, `AuthContext`

**Data Fetching (parallel):**
- `skillIntelligenceApi.getSummary()` → SkillIntelligenceSummary
- `resumeApi.list()` → Resume[]

**UI Sections:**
1. **Welcome Banner** — Gradient header with display name
2. **Metrics Row (4 cards):**
   - Total Skills (🎯)
   - Verified Skills (⚡)
   - Resumes Uploaded (📜)
   - Overall Confidence (📈)
3. **Quick Actions (4 buttons):**
   - Add Skill → `/skills`
   - Attach Evidence → `/evidence`
   - Upload Resume → `/resumes/new`
   - Learning Paths → `/learning`
4. **Main Grid (2/3 + 1/3):**
   - **Left:** Top Verified Skills table (skill name, proficiency, confidence %, verification badge) + Recent Resumes (filename, date, "View Analysis" link)
   - **Right:** Account Overview (avatar, name, email, role, status) + Edit Profile / Settings links

**User Flow:**
```
Load → Parallel fetch summary + resumes
  → Click "Add Skill" → /skills
  → Click "Attach Evidence" → /evidence
  → Click "Upload Resume" → /resumes/new
  → Click "Learning Paths" → /learning
  → Click skill row → (no navigation, inline)
  → Click "View Analysis" on resume → /resumes/[id]/analyze
  → Click "Edit Profile" → /profile
  → Click "Settings" → /settings
```

---

### 5. Profile Page (`/profile`)

**File:** `apps/web/src/app/profile/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Link`, `AuthContext`

**State:** `displayName`, `headline`, `bio`, `location`, `websiteUrl`

**UI:**
- Form with fields: Display Name, Professional Headline, Bio (textarea), Location, Website URL
- "Save Profile" button (simulated - no actual API call yet)
- **Profile Card Preview** — Live preview of profile card with avatar, name, headline, role, status, email, location

**User Flow:**
```
Load → Pre-fill displayName from user.displayName
  → Edit fields → Click "Save Profile" → Simulated save (setTimeout 400ms)
  → Success toast → Preview updates live
```

**Note:** Profile API not fully implemented — save is simulated.

---

### 6. Settings Page (`/settings`)

**File:** `apps/web/src/app/settings/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `AuthContext`, `logout()`

**UI:**
- **Account & Security** — Grid: Email, Username, System Role (badge), Account Status (badge)
- **Active Session** — Current session info (HTTP-only cookie), "Sign Out Of Session" button

**User Flow:**
```
Load → Display user info from AuthContext
  → Click "Sign Out Of Session" → logout() → redirect to /auth/login
```

---

### 7. Skill Catalog Explorer (`/skills`)

**File:** `apps/web/src/app/skills/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Input`, `Link`, `skillGraphApi`

**State:** `skills[]`, `searchQuery`, `categoryFilter`, `currentPage`, `totalPages`

**Data:** `skillGraphApi.listSkills({ limit, offset, category, search })`

**UI:**
- Header: "Skill Catalog Explorer"
- Search input + Category dropdown (12 categories)
- Grid of skill cards (4 cols XL):
  - Skill name + verified badge (✓)
  - Category badge + subcategory badge
  - Demand level badge (HIGH/CRITICAL = default variant)
  - "Details →" link to `/skills/[slug]`
- Pagination controls

**User Flow:**
```
Load → Fetch page 1
  → Search/type → Debounced fetch (onSubmit)
  → Change category → Reset page, fetch
  → Click pagination → Fetch page
  → Click skill card → /skills/[slug]
```

---

### 8. Skill Detail Page (`/skills/[slug]`)

**File:** `apps/web/src/app/skills/[slug]/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Link`, `skillGraphApi`, `skillIntelligenceApi`

**Tabs:** Overview | Relationships | Skill Gap

**Data Fetching:**
- `skillGraphApi.getSkill(slug)` → SkillDetail
- `skillGraphApi.getRelationships(slug)` → SkillRelationshipDTO[]
- **Lazy:** `skillGraphApi.getGap(slug)` on Gap tab click

**UI - Overview Tab:**
- Back link, skill name, description
- Badges: Verified, Category, Subcategory, Demand Level
- Skill info grid: Category, Subcategory, Demand, Verified, Created date
- "Manage Skills" button → `/skill-intelligence`

**UI - Relationships Tab:**
- Grouped by type (PREREQUISITE, SUBSKILL, SPECIALIZATION, COMPLEMENTARY, RELATED)
- Each group: Badge + count, grid of related skill cards with strength bar

**UI - Skill Gap Tab:**
- Loading spinner → Gap analysis
- 3 metric cards: Known (green), Partial (yellow), Missing (red)
- Prerequisites breakdown table: Skill, Status badge, Proficiency, Required strength
- Missing prerequisites section with links to each skill

**User Flow:**
```
Load → Fetch skill + relationships
  → Click "Relationships" tab → View grouped relationships
  → Click "Skill Gap" tab → Fetch gap analysis
  → Click related skill → /skills/[related-slug]
  → Click missing prerequisite → /skills/[missing-slug]
  → Click "Manage Skills" → /skill-intelligence
```

---

### 9. Skill Intelligence Page (`/skill-intelligence`)

**File:** `apps/web/src/app/skill-intelligence/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `SkillIntelligenceCard`, `SkillIntelligenceSummaryComponent`, `EvidenceList`, `Badge`, `Input`, `Button`, `Card`, `skillIntelligenceApi`

**State:** `summary`, `skills[]`, `selectedSkill`, `searchQuery`, `proficiencyFilter`, `addingSkill`, `newSkill`

**Data:**
- `getSummary()` → SkillIntelligenceSummary
- `getSkills()` → SkillIntelligenceItem[]

**UI:**
- Header: Title + "Add Skill" button (opens modal)
- **Summary Component** — Dashboard stats
- **Skills Grid** (3 cols):
  - Search input + Proficiency filter dropdown
  - `SkillIntelligenceCard` per skill: name, category, proficiency, confidence %, verification status, evidence types, evidence count
  - Click card → Opens detail modal

**Detail Modal (on skill click):**
- Header: Skill name, category, close button
- 3 metric cards: Confidence %, Evidence count, Years experience
- Proficiency + Verification status badges
- Evidence Types badges
- **EvidenceList** component — Full CRUD for evidence
- Actions: "Update Proficiency" (to ADVANCED), "Remove Skill"

**Add Skill Modal:**
- Skill ID input (should be dropdown - current UX gap)
- Proficiency dropdown, Years experience number input
- Submit → `addSkill()` → refetch

**User Flow:**
```
Load → Fetch summary + skills
  → Search/filter skills
  → Click "Add Skill" → Fill modal → Submit → Refetch
  → Click skill card → Modal opens
    → View evidence, add/update/delete evidence
    → Update proficiency → Refetch
    → Remove skill → Confirm → Refetch
    → Close modal
```

---

### 10. Evidence Portfolio (`/evidence`)

**File:** `apps/web/src/app/evidence/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `skillIntelligenceApi`

**State:** `userSkills[]`, `selectedSkillId`, `evidenceType`, `title`, `description`, `url`, `submitting`, `successMsg`, `errorMsg`

**UI - Left Column (Add Evidence Form):**
- Skill selector dropdown (from userSkills)
- Evidence type dropdown: PROJECT, CERTIFICATE, ASSESSMENT_RESULT, WORK_EXPERIENCE, PORTFOLIO_ITEM
- Title (required), Description (textarea), URL (optional)
- "Attach Evidence" button → `addEvidence()` → Refetch

**UI - Right Column (Evidence Inventory):**
- Per skill card: Skill name, proficiency, confidence score, evidence types
- Evidence list showing hardcoded "Self-reported skill declaration" (SELF_REPORTED)
- Note: EvidenceList component not fully integrated here

**User Flow:**
```
Load → Fetch user skills
  → Select skill + fill form → Submit → Success toast + Refetch
  → View evidence inventory (read-only in current implementation)
```

---

### 11. Resume Vault (`/resumes`)

**File:** `apps/web/src/app/resumes/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Link`, `resumeApi`

**State:** `resumes[]`, `isLoading`, `error`

**Data:** `resumeApi.list()` → Resume[] with analysis status

**UI:**
- Header: "Resume Vault & AI Parser" + "Upload New Resume" → `/resumes/new`
- Empty state: Upload illustration + "Upload Your First Resume" button
- List: Filename, file size, date, status badge, "Analyze & Review" → `/resumes/[id]/analyze`, "Delete" (confirm)

**User Flow:**
```
Load → Fetch resumes
  → Click "Upload New Resume" → /resumes/new
  → Click "Analyze & Review" → /resumes/[id]/analyze
  → Click "Delete" → Confirm → DELETE /resumes/:id → Refetch
```

---

### 12. Upload Resume (`/resumes/new`)

**File:** `apps/web/src/app/resumes/new/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Link`, `resumeApi`

**Features:**
- Drag-and-drop zone with visual feedback
- File input (accept: .pdf, .docx, .txt)
- 10MB size limit
- Upload progress state

**User Flow:**
```
Load → Drag file or click "Select File From Computer"
  → File validation (type, size)
  → Uploading... → POST /resumes/upload (multipart)
  → Success → Redirect to /resumes/[resumeId]/analyze
  → Error → Display error message
```

---

### 13. Resume Analysis (`/resumes/[id]/analyze`)

**File:** `apps/web/src/app/resumes/[id]/analyze/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Link`, `resumeApi`

**State:** `analysis`, `loading`, `analyzing`, `error`, `selectedSkills`, `selectedExperiences`, `confirming`, `confirmedMsg`

**Data Loading:**
1. Try `resumeApi.getAnalysis(resumeId)` — existing analysis
2. If none → `resumeApi.analyze(resumeId)` — run fresh analysis

**UI - Action Bar:**
- "Select All / Deselect All" skills toggle
- "Confirm N Selected Skills →" button (disabled if none selected)

**UI - Extracted Skills Grid (3 cols):**
- Checkbox card per skill: Name, Confidence %, "ACCEPT/SKIP" badge
- Click card → Toggle selection

**UI - Work Experience & Projects/Education (2 cols):**
- Read-only display of extracted experiences, projects, education

**User Flow:**
```
Load → Check existing analysis → Run analysis if needed
  → Review extracted skills → Toggle checkboxes
  → Click "Confirm N Selected Skills" → POST /resumes/:id/confirm
  → Success → "Added N skills to profile" → Redirect to /dashboard (1.5s)
  → Error → "Re-run Analysis" button
```

---

### 14. Learning Paths Overview (`/learning`)

**File:** `apps/web/src/app/learning/page.tsx`  
**Auth:** Required  
**Components:** `AppShell`, `Card`, `Button`, `Badge`, `Input`, `GapItemComponent`, `LearningMilestoneComponent`, `LearningResourceCard`, `ReadinessBadge`, `skillGraphApi`, `learningApi`

**State:** `skills[]`, `searchQuery`, `categoryFilter`, `selectedSkill`, `learningPlan`, pagination

**Data:**
- `skillGraphApi.listSkills()` for skill selector
- `learningApi.getPlan(skillId)` when skill selected

**UI - Skill Selector:**
- Search + Category filter + Pagination
- Grid of skill cards → Click to select

**UI - Learning Plan Display (when skill selected):**
- "View Full Page" → `/learning/[slug]`
- ReadinessBadge (large)
- 4 metric cards: Known, Partial, Missing, Foundation Required
- **Prioritized Gaps** — `GapItemComponent` list
- **Learning Path** — `LearningMilestoneComponent` list
- **Resources** — `LearningResourceCard` grid

**User Flow:**
```
Load → Fetch skills
  → Search/filter/select skill
  → Fetch learning plan for skill
  → View plan inline
  → Click "View Full Page" → /learning/[skillSlug]
```

---

### 15. Detailed Learning Plan (`/learning/[skillSlug]`)

**File:** `apps/web/src/app/learning/[skillSlug]/page.tsx`  
**Auth:** Required  
**Components:** Modular components (SkillHeader, ReadinessSection, GapSummary, PrioritizedGaps, LearningPathSection, ResourcesSection, LearningPlanContent)

**Data:**
- `skillGraphApi.getSkill(slug)` → Skill
- `learningApi.getPlan(skillId)` → LearningPlanResult

**UI Sections (vertical stack):**
1. **SkillHeader** — Name, category, subcategory, demand, verified badges, description
2. **ReadinessSection** — Large ReadinessBadge
3. **GapSummary** — 4 metric cards (Known, Partial, Missing, Foundation)
4. **PrioritizedGaps** — GapItemComponent list
5. **LearningPathSection** — Milestones with difficulty badge, progress (X of Y completed)
6. **ResourcesSection** — LearningResourceCard grid (or empty state)

**Loading States:** Skeleton spinner for skill, separate spinner for plan

**Error States:** Skill not found, plan generation failed

**User Flow:**
```
Load → Fetch skill by slug
  → Fetch learning plan
  → View all sections
  → Click resource card → External link
  → Click gap skill → /skills/[gap-slug]
  → Click milestone skill → /skills/[milestone-slug]
```

---

### 16. AI Skill Analysis (`/ai/analyze`)

**File:** `apps/web/src/app/ai/analyze/page.tsx`  
**Auth:** Required  
**Components:** `Card`, `Button`, `Input`, `Textarea`, `aiApi`

**State:** `text`, `context`, `isLoading`, `result`, `error`, `selectedSkills`, `isSubmitting`

**UI - Input Form:**
- Textarea: "Your Experience / Project Description / Resume Text" (min 10, max 50000 chars)
- Input: "Additional Context" (optional)
- "Analyze Skills" button (disabled if < 10 chars)

**UI - Results:**
- Grid of skill cards:
  - Original name + Matched/Unmatched badge
  - Reason, Extraction confidence %, Match confidence %
  - Click card → Toggle selection (only matched skills)
- "Add N Selected Skill(s) to Profile" button → POST to `/api/skill-intelligence/skills` (direct fetch)

**UI - Instructions Card:**
- Tips for best results
- Note about AI confidence vs actual proficiency

**User Flow:**
```
Load → Enter text + context → Click "Analyze Skills"
  → POST /ai/skills/extract → Display results
  → Click matched skill cards to select
  → Click "Add N Selected Skills" → Loop POST /skill-intelligence/skills
  → Clear form on success
```

---

## Shared Components

### Layout
- **AppShell** (`components/layout/AppShell.tsx`) — Sidebar navigation, header, user menu, responsive

### Auth
- **AuthContext** (`context/AuthContext.tsx`) — `user`, `isLoading`, `isAuthenticated`, `login()`, `register()`, `logout()`, `refreshUser()`
- **LoginForm** / **RegisterForm** — Formik-style controlled forms with validation

### Skill Intelligence
- **SkillIntelligenceCard** — Skill display with metrics
- **SkillIntelligenceSummaryComponent** — Dashboard stats
- **EvidenceList** — Evidence CRUD (used in skill-intelligence modal)
- **Badges** — ConfidenceBadge, ProficiencyBadge, EvidenceTypeBadge, VerificationStatusBadge

### Learning
- **GapItemComponent** — Prioritized gap display with priority badge
- **LearningMilestoneComponent** — Milestone with target proficiency, status
- **LearningResourceCard** — Resource with type, difficulty, provider, rating
- **ReadinessBadge** — READY/PARTIAL/FOUNDATION_REQUIRED with colors

---

## Navigation Flow Diagram

```
                    ┌─────────────┐
                    │     /       │
                    │   (Home)    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌─────────────┐           ┌─────────────┐
        │ /auth/login │           │/auth/register│
        └──────┬──────┘           └──────┬──────┘
               │                         │
               └───────────┬─────────────┘
                           ▼
                    ┌─────────────┐
                    │ /dashboard  │
                    └──────┬──────┘
                           │
        ┌────────┬────────┼────────┬────────┬────────┐
        ▼        ▼        ▼        ▼        ▼        ▼
   ┌────────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────┐
   │/skills │ │/skill│ │/evid- │ │/res- │ │/learn │ │/ai/  │
   │        │ │-intel│ │ence   │ │umes  │ │ing    │ │analyze│
   └────┬───┘ └───┬──┘ └───┬───┘ └───┬──┘ └───┬───┘ └──┬──┘
        │         │        │         │         │        │
        ▼         ▼        ▼         ▼         ▼        ▼
   ┌────────┐ ┌──────┐ ┌───────┐ ┌──────┐ ┌───────┐ ┌──────┐
   │/skills/│ │(modal)│ │(form) │ │/new  │ │/learn/│ │(result)│
   │[slug]  │ │      │ │       │ │      │ │[slug] │ │      │
   └────────┘ └──────┘ └───────┘ └────┬─┘ └───────┘ └──────┘
                                      │
                                      ▼
                                 ┌──────────┐
                                 │/resumes/ │
                                 │[id]/     │
                                 │analyze   │
                                 └──────────┘
```

---

## State Management Pattern

All pages follow this pattern:

```typescript
// 1. Auth check
const { user, isLoading: authLoading } = useAuth();
useEffect(() => { if (!authLoading && !user) router.push('/auth/login'); }, [user, authLoading, router]);

// 2. Data fetching
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const fetchData = async () => { ... };
useEffect(() => { if (user) fetchData(); }, [user, ...deps]);

// 3. Loading/Error/Empty states
if (authLoading) return <Spinner />;
if (!user) return null;
if (loading) return <Spinner />;
if (error) return <ErrorMessage />;
if (!data || data.length === 0) return <EmptyState />;

// 4. Render with interactive state
return <AppShell>...</AppShell>;
```

---

## Known UX Gaps

1. **Add Skill Modal** — Uses raw skill ID input instead of searchable dropdown
2. **Evidence Page** — EvidenceList component not fully integrated (shows hardcoded self-reported only)
3. **Profile Save** — Simulated, no actual API call
4. **Skill Catalog** — No "Add to My Skills" button from catalog
5. **Learning Plan** — No persistence of LearningPlan to database (generated on-demand)
6. **Mobile Navigation** — AppShell sidebar collapses but hamburger menu not implemented