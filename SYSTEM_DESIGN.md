# GymTracker - System Design Analysis

A comprehensive technical analysis of the GymTracker workout tracking application architecture, data flows, and system design decisions.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Database Design](#3-database-design)
4. [API Architecture](#4-api-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Data Flow Patterns](#6-data-flow-patterns)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Performance Analysis](#8-performance-analysis)
9. [Security Considerations](#9-security-considerations)
10. [Scalability Analysis](#10-scalability-analysis)
11. [Trade-offs & Design Decisions](#11-trade-offs--design-decisions)
12. [Recommendations](#12-recommendations)

---

## 1. Executive Summary

GymTracker is a full-stack fitness workout tracking application built with a modern JAMstack-inspired architecture. The system enables users to:

- Create and manage workout routines with flexible scheduling
- Execute workouts with real-time progress tracking and rest timers
- Organize workouts into rotating cycles (e.g., Push/Pull/Legs splits)
- View analytics and progress visualization
- Receive AI-generated exercise form tips

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 16 (App Router) | Full-stack React with API routes, SSR/SSG capabilities |
| Language | TypeScript 5 | Type safety, better DX, fewer runtime errors |
| Database | PostgreSQL | ACID compliance, relational integrity, JSON support |
| ORM | Prisma 6 | Type-safe queries, migrations, schema management |
| Auth | NextAuth.js 5 | JWT sessions, extensible providers, built-in security |
| Styling | Tailwind CSS 4 | Utility-first, small bundle, rapid development |
| UI | Radix UI + shadcn/ui | Accessible primitives, customizable components |
| Charts | Recharts | React-native charting, responsive, customizable |
| AI | Google Gemini 1.5 Flash | Free tier, fast inference, exercise knowledge |

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Next.js App Router                            ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           ││
│  │  │  Today   │ │Dashboard │ │ Workouts │ │ Calendar │    ...    ││
│  │  │  Page    │ │  Page    │ │   Page   │ │   Page   │           ││
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           ││
│  │       │            │            │            │                  ││
│  │  ┌────▼────────────▼────────────▼────────────▼─────┐           ││
│  │  │              Shared Components                   │           ││
│  │  │  WorkoutPlayer | WorkoutForm | Calendar | Nav   │           ││
│  │  └─────────────────────────────────────────────────┘           ││
│  └─────────────────────────────────────────────────────────────────┘│
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/REST
┌───────────────────────────────▼─────────────────────────────────────┐
│                           API LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                   Next.js API Routes                             ││
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ ││
│  │  │ /api/today │ │/api/stats  │ │/api/workouts│ │/api/sessions │ ││
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘ ││
│  │        └──────────────┴──────────────┴───────────────┘         ││
│  │                              │                                  ││
│  │  ┌───────────────────────────▼──────────────────────────────┐  ││
│  │  │                    Auth Middleware                        │  ││
│  │  │              (NextAuth JWT Validation)                    │  ││
│  │  └───────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │   Prisma ORM     │───▶│   PostgreSQL     │                       │
│  │   (Type-safe)    │    │   (Primary DB)   │                       │
│  └──────────────────┘    └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Google Gemini API                            │   │
│  │              (AI-powered exercise tips)                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
User Action → React Component → fetch() → API Route → Auth Check → Prisma → PostgreSQL
                    ▲                                                          │
                    └──────────────────── JSON Response ◄──────────────────────┘
```

### 2.3 Component Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Public routes (login, register)
│   │   └── layout.tsx          # Centered auth layout
│   ├── (app)/                  # Protected routes
│   │   ├── layout.tsx          # App shell with navigation
│   │   ├── today/              # Workout execution
│   │   ├── dashboard/          # Analytics
│   │   ├── workouts/           # Workout management
│   │   ├── cycles/             # Cycle management
│   │   ├── calendar/           # Schedule view
│   │   └── settings/           # User preferences
│   └── api/                    # REST endpoints
├── components/
│   ├── ui/                     # Primitive components (Button, Card, etc.)
│   └── *.tsx                   # Feature components (WorkoutPlayer, etc.)
├── lib/
│   ├── auth.ts                 # NextAuth configuration
│   ├── prisma.ts               # Database client singleton
│   ├── ai.ts                   # Gemini API integration
│   └── utils.ts                # Scheduling logic, helpers
└── types/
    └── index.ts                # Shared TypeScript types
```

---

## 3. Database Design

### 3.1 Entity-Relationship Diagram

```
┌─────────────────────┐
│        User         │
├─────────────────────┤
│ id (PK)             │──────────────┬────────────────┬─────────────────┐
│ email (unique)      │              │                │                 │
│ name                │              │                │                 │
│ password (hashed)   │              │                │                 │
│ adaptiveMode        │              │                │                 │
│ themeMode           │              │                │                 │
│ createdAt           │              │                │                 │
│ updatedAt           │              │                │                 │
└─────────────────────┘              │                │                 │
                                     │ 1:N            │ 1:N             │ 1:N
                                     ▼                ▼                 ▼
                        ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
                        │  WorkoutCycle   │  │     Workout     │  │ WorkoutSession  │
                        ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
                        │ id (PK)         │  │ id (PK)         │  │ id (PK)         │
                        │ name            │  │ name            │  │ date            │
                        │ intervalDays    │  │ weight          │  │ completed       │
                        │ scheduleDays[]  │  │ restTime        │  │ setsCompleted   │
                        │ startDate       │  │ sets            │  │ repsPerSet[]    │
                        │ userId (FK)     │  │ repsPerSet      │  │ weightUsed      │
                        └────────┬────────┘  │ notes           │  │ duration        │
                                 │           │ aiTip           │  │ workoutId (FK)  │
                                 │ 1:N       │ intervalDays    │  │ userId (FK)     │
                                 │           │ scheduleDays[]  │  └────────┬────────┘
                                 │           │ startDate       │           │
                                 │           │ cycleId (FK)?   │◄──────────┘
                                 └──────────▶│ cycleOrder      │    N:1
                                             │ displayOrder    │
                                             │ userId (FK)     │
                                             └─────────────────┘
```

### 3.2 Schema Design Decisions

| Decision | Rationale |
|----------|-----------|
| **CUID for IDs** | URL-safe, sortable, no collision risk vs UUID |
| **Array fields for schedules** | PostgreSQL native arrays, simpler than join tables |
| **Nullable cycleId** | Workouts can be standalone or part of cycles |
| **Cascade deletes** | User deletion removes all data; workout deletion removes sessions |
| **SetNull for cycle removal** | Preserve workouts when cycle is deleted |
| **Separate scheduleDays/intervalDays** | Two scheduling modes: specific days vs. intervals |

### 3.3 Indexes

```sql
-- Performance indexes added
CREATE INDEX "workout_cycles_userId_idx" ON "workout_cycles"("userId");
CREATE INDEX "workouts_userId_idx" ON "workouts"("userId");
CREATE INDEX "workouts_userId_displayOrder_idx" ON "workouts"("userId", "displayOrder");
CREATE INDEX "workout_sessions_userId_idx" ON "workout_sessions"("userId");
CREATE INDEX "workout_sessions_userId_date_idx" ON "workout_sessions"("userId", "date");
CREATE INDEX "workout_sessions_workoutId_idx" ON "workout_sessions"("workoutId");
```

### 3.4 Data Integrity Constraints

- **User.email**: Unique constraint prevents duplicate accounts
- **Foreign keys**: Enforce referential integrity
- **Cascade rules**: Automatic cleanup on parent deletion
- **Default values**: Sensible defaults (adaptiveMode: false, displayOrder: 0)

---

## 4. API Architecture

### 4.1 Endpoint Summary

| Endpoint | Methods | Purpose | Optimizations |
|----------|---------|---------|---------------|
| `/api/auth/register` | POST | User registration | - |
| `/api/auth/[...nextauth]` | GET, POST | Auth handlers | JWT caching |
| `/api/today` | GET | Today page data | **5 queries → 1 endpoint** |
| `/api/calendar` | GET | Calendar data | **3 queries → 1 endpoint** |
| `/api/stats` | GET | Dashboard analytics | Parallel queries |
| `/api/workouts` | GET, POST | Workout CRUD | Async AI tips |
| `/api/workouts/[id]` | GET, PUT, DELETE | Single workout | Conditional tip regen |
| `/api/workouts/[id]/regenerate-tip` | POST | Refresh AI tip | - |
| `/api/workouts/reorder` | PUT | Update order | Batch update |
| `/api/cycles` | GET, POST | Cycle CRUD | Nested workouts |
| `/api/cycles/[id]` | GET, PUT, DELETE | Single cycle | - |
| `/api/sessions` | GET, POST | Session CRUD | Date filtering |
| `/api/sessions/[id]` | PUT, DELETE | Single session | - |
| `/api/settings` | GET, PUT | User settings | Selective fields |

### 4.2 API Design Patterns

**1. Composite Endpoints (BFF Pattern)**
```typescript
// /api/today - Aggregates 5 queries into 1 response
const [user, workouts, cycles, todaySessions, allSessions] = await Promise.all([
  prisma.user.findUnique({ ... }),
  prisma.workout.findMany({ ... }),
  prisma.workoutCycle.findMany({ ... }),
  prisma.workoutSession.findMany({ ... }),  // Today only
  prisma.workoutSession.findMany({ ... }),  // All for adaptive mode
]);
```

**2. Async Background Processing**
```typescript
// AI tip generation doesn't block workout creation
const workout = await prisma.workout.create({ data: { aiTip: "Generating tip..." } });
generateWorkoutTipAsync(workout.id, name).catch(console.error);  // Fire and forget
return NextResponse.json(workout);  // Immediate response
```

**3. Optimistic Updates Support**
```typescript
// Client updates UI immediately, syncs in background
setSessions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
await fetch(`/api/sessions/${id}`, { method: "PUT", body: JSON.stringify(data) });
```

### 4.3 Request/Response Patterns

**Standard Success Response:**
```json
{
  "id": "clx...",
  "name": "Bench Press",
  "weight": 80,
  ...
}
```

**Standard Error Response:**
```json
{
  "error": "Failed to create workout"
}
```

**Status Codes:**
- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

---

## 5. Frontend Architecture

### 5.1 Component Hierarchy

```
RootLayout
└── AppWrapper (client boundary)
    └── ThemeProvider (context)
        ├── AuthLayout
        │   ├── LoginPage
        │   └── RegisterPage
        └── AppLayout
            ├── Navigation
            └── Page Content
                ├── TodayPage
                │   └── WorkoutPlayer
                ├── DashboardPage
                │   └── StatsCharts
                ├── WorkoutsPage
                │   ├── WorkoutList
                │   └── WorkoutForm (modal)
                ├── CyclesPage
                │   └── CycleForm (modal)
                ├── CalendarPage
                │   └── Calendar
                └── SettingsPage
```

### 5.2 State Management

| State Type | Location | Example |
|------------|----------|---------|
| Server data | Component useState | workouts, sessions |
| UI state | Component useState | loading, formOpen |
| Form data | Component useState | Controlled inputs |
| Theme | React Context | themeMode, theme |
| Auth | NextAuth session | session.user |

**No global state library** - deliberate simplicity for app scope.

### 5.3 Data Fetching Pattern

```typescript
// Standard pattern across all pages
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(true);

const fetchData = useCallback(async () => {
  try {
    const res = await fetch("/api/endpoint");
    const json = await res.json();
    setData(json);
  } catch (error) {
    console.error("Failed to fetch:", error);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

### 5.4 Scheduling Logic (Client-Side)

```typescript
// Determines if workout should appear today
function isWorkoutScheduledForDate(workout, date): boolean {
  if (date < workout.startDate) return false;

  if (workout.scheduleDays.length > 0) {
    return workout.scheduleDays.includes(date.getDay());
  }

  if (workout.intervalDays) {
    const daysDiff = differenceInDays(date, workout.startDate);
    return daysDiff % workout.intervalDays === 0;
  }

  return false;
}

// Cycle rotation: A → B → C → A → B → C
function getCycleWorkoutIndexForDate(cycle, date, totalWorkouts): number {
  const scheduledDates = getScheduledCycleDatesUpTo(cycle, date);
  return (scheduledDates.length - 1) % totalWorkouts;
}
```

---

## 6. Data Flow Patterns

### 6.1 Today Page - Workout Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PAGE LOAD                                     │
│  GET /api/today ──▶ { settings, workouts, cycles, sessions }        │
│                                                                      │
│  Client filters workouts by:                                         │
│  1. isWorkoutScheduledForDate() - schedule check                    │
│  2. isWorkoutAvailableAdaptive() - adaptive mode check              │
│  3. getCycleWorkoutForDate() - cycle rotation                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    START WORKOUT                                     │
│  User clicks "Start Today's Workout"                                │
│                                                                      │
│  For each scheduled workout without session:                        │
│    POST /api/sessions { workoutId } ──▶ Create WorkoutSession       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKOUT PLAYER                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Set Progress: [■■■□□] 3/5 sets                             │    │
│  │  Current: Set 4 of 5 @ 80kg                                 │    │
│  │                                                              │    │
│  │  [Complete Set] ──▶ Optimistic Update ──▶ PUT /api/sessions │    │
│  │                      setSessions(...)      { setsCompleted } │    │
│  │                                                              │    │
│  │  If all sets done:                                          │    │
│  │    PUT /api/sessions { completed: true }                    │    │
│  │    Move to next workout                                     │    │
│  │                                                              │    │
│  │  [Rest Timer] 90s countdown between sets                    │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Adaptive Mode Flow

```
Normal Mode:                          Adaptive Mode:
─────────────                         ──────────────
Monday: Workout A (scheduled)         Monday: Workout A (scheduled)
Tuesday: Workout B (scheduled)        Tuesday: Workout A (blocked - A incomplete)
Wednesday: Workout A (scheduled)      Wednesday: Workout A (still blocked)

                                      User completes A on Wednesday

                                      Thursday: Workout B (now available)
```

### 6.3 Cycle Rotation Flow

```
Cycle: "Push Pull Legs" with 3 workouts
Schedule: Every Monday, Wednesday, Friday

Week 1:
  Mon (Day 1): Push    ← index = (1-1) % 3 = 0
  Wed (Day 2): Pull    ← index = (2-1) % 3 = 1
  Fri (Day 3): Legs    ← index = (3-1) % 3 = 2

Week 2:
  Mon (Day 4): Push    ← index = (4-1) % 3 = 0
  Wed (Day 5): Pull    ← index = (5-1) % 3 = 1
  Fri (Day 6): Legs    ← index = (6-1) % 3 = 2
```

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Login      │────▶│   NextAuth    │────▶│   Database   │
│   Form       │     │   Handler     │     │   (bcrypt)   │
└──────────────┘     └───────┬───────┘     └──────────────┘
                             │
                     ┌───────▼───────┐
                     │  JWT Token    │
                     │  (30-day exp) │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐
                     │  HTTP-only    │
                     │  Cookie       │
                     └───────────────┘
```

### 7.2 Authorization Pattern

Every API route follows this pattern:

```typescript
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // All queries filtered by userId
  const data = await prisma.workout.findMany({
    where: { userId: session.user.id },  // User can only see own data
  });

  return NextResponse.json(data);
}
```

### 7.3 Security Configuration

```typescript
// src/lib/auth.ts
export const authConfig = {
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },  // 30 days
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (token.id) session.user.id = token.id;
      return session;
    },
  },
};
```

---

## 8. Performance Analysis

### 8.1 Optimizations Implemented

| Optimization | Before | After | Impact |
|--------------|--------|-------|--------|
| Today page API calls | 5 calls | 1 call | ~80% fewer requests |
| Calendar page API calls | 3 calls | 1 call | ~66% fewer requests |
| Stats API queries | Sequential | Parallel | ~3x faster |
| Session updates | Full refetch | Optimistic | Instant UI feedback |
| AI tip generation | Blocking | Async | No creation delay |
| Database indexes | None | 6 indexes | Faster queries |

### 8.2 Database Query Performance

**Indexed Queries (Fast):**
```sql
-- User's workouts (uses userId index)
SELECT * FROM workouts WHERE "userId" = 'xxx' ORDER BY "displayOrder";

-- Date range sessions (uses composite index)
SELECT * FROM workout_sessions
WHERE "userId" = 'xxx' AND "date" BETWEEN '2024-01-01' AND '2024-01-31';
```

**Potential N+1 Issues:**
```typescript
// Cycles with workouts - nested include (handled by Prisma)
prisma.workoutCycle.findMany({
  include: { workouts: { orderBy: { cycleOrder: "asc" } } }
});
// Prisma generates efficient JOIN query
```

### 8.3 Bundle Size Considerations

- Recharts: ~200KB (consider lazy loading for dashboard)
- date-fns: Tree-shakeable (only imports used functions)
- Radix UI: Individual packages (no bloat)
- Lucide: Individual icon imports

### 8.4 Rendering Performance

```typescript
// Current: No memoization
const scheduledWorkouts = getAvailableWorkouts();  // Recalculates on every render

// Improvement: Memoize expensive calculations
const scheduledWorkouts = useMemo(
  () => getAvailableWorkouts(),
  [workouts, cycles, adaptiveMode, allSessions]
);
```

---

## 9. Security Considerations

### 9.1 Current Security Measures

| Measure | Implementation | Status |
|---------|---------------|--------|
| Password hashing | bcrypt (12 rounds) | ✅ Implemented |
| JWT sessions | HTTP-only cookies | ✅ Implemented |
| SQL injection | Prisma parameterized queries | ✅ Protected |
| XSS | React auto-escaping | ✅ Protected |
| CSRF | Same-origin + NextAuth | ✅ Protected |
| Authorization | Per-request userId check | ✅ Implemented |

### 9.2 Security Gaps

| Gap | Risk | Recommendation |
|-----|------|----------------|
| No rate limiting | Brute force attacks | Implement rate limiting on auth endpoints |
| No input validation | Invalid data, injection | Add Zod schemas for all inputs |
| No audit logging | No attack detection | Log auth events and sensitive operations |
| No account lockout | Password guessing | Lock after N failed attempts |
| Verbose errors | Information leakage | Standardize error responses |

### 9.3 Recommended Input Validation

```typescript
// Using Zod for type-safe validation
const WorkoutSchema = z.object({
  name: z.string().min(1).max(100),
  weight: z.number().positive().max(1000),
  restTime: z.number().int().min(0).max(600),
  sets: z.number().int().min(1).max(20),
  repsPerSet: z.number().int().min(1).max(100),
  notes: z.string().max(1000).optional(),
  intervalDays: z.number().int().min(1).max(365).optional(),
  scheduleDays: z.array(z.number().int().min(0).max(6)).optional(),
});
```

---

## 10. Scalability Analysis

### 10.1 Current Bottlenecks

| Component | Limit | Issue |
|-----------|-------|-------|
| Sessions table | Large datasets | No pagination, fetches all |
| Stats calculation | O(n) date iterations | CPU-bound for long history |
| AI tip generation | API rate limits | Gemini free tier quotas |
| Connection pooling | Default limits | May exhaust under load |

### 10.2 Scaling Strategy

**Vertical Scaling (Current Architecture):**
- Increase database connection pool size
- Add database read replicas
- Upgrade Vercel plan for more serverless capacity

**Horizontal Scaling (Future):**
```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌────────────┐   ┌────────────┐   ┌────────────┐
    │  Vercel    │   │  Vercel    │   │  Vercel    │
    │  Instance  │   │  Instance  │   │  Instance  │
    └──────┬─────┘   └──────┬─────┘   └──────┬─────┘
           └─────────────────┼─────────────────┘
                             ▼
                    ┌────────────────┐
                    │   PostgreSQL   │
                    │   (Primary)    │
                    └────────┬───────┘
                             │
                    ┌────────▼───────┐
                    │   Read Replica │
                    └────────────────┘
```

### 10.3 Caching Strategy (Not Implemented)

**Recommended Implementation:**
```typescript
// Redis caching layer
const cacheKey = `user:${userId}:today`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await fetchFromDatabase();
await redis.setex(cacheKey, 300, JSON.stringify(data));  // 5 min TTL
return data;
```

### 10.4 Growth Projections

| Users | Workouts/User | Sessions/User/Month | Total Records |
|-------|---------------|---------------------|---------------|
| 100 | 10 | 30 | 33,000 |
| 1,000 | 10 | 30 | 330,000 |
| 10,000 | 10 | 30 | 3,300,000 |

At 10,000 users, pagination and query optimization become critical.

---

## 11. Trade-offs & Design Decisions

### 11.1 Architecture Trade-offs

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| **Monolithic API** | Simple deployment, shared code | Harder to scale independently |
| **JWT sessions** | Stateless, no session store needed | Can't invalidate individual sessions |
| **Client-side scheduling logic** | Reduces server load | Logic duplication risk |
| **No global state** | Simpler mental model | Prop drilling, refetch overhead |
| **Async AI tips** | Fast workout creation | Tips appear delayed |

### 11.2 Data Model Trade-offs

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| **Arrays for schedules** | Simple queries, no joins | Limited query flexibility |
| **Nullable cycleId** | Flexible workout organization | Complex null handling |
| **Session per workout/day** | Detailed tracking | Many records over time |
| **Store reps as array** | Per-set tracking | More storage than aggregates |

### 11.3 Why These Choices?

1. **Next.js App Router**: Best-in-class React framework, Vercel optimization
2. **PostgreSQL over MongoDB**: Relational data (users → workouts → sessions)
3. **Prisma over raw SQL**: Type safety, migrations, developer experience
4. **JWT over sessions**: Stateless API, simpler infrastructure
5. **No Redux**: App state is mostly server data, not shared client state

---

## 12. Recommendations

### 12.1 Short-term Improvements

**Priority 1 - Reliability:**
- [ ] Add error boundaries for graceful failures
- [ ] Implement toast notifications for user feedback
- [ ] Add retry logic for failed API requests

**Priority 2 - Security:**
- [ ] Add Zod input validation to all API routes
- [ ] Implement rate limiting (e.g., `@upstash/ratelimit`)
- [ ] Add audit logging for sensitive operations

**Priority 3 - Performance:**
- [ ] Add pagination to sessions/workouts lists
- [ ] Implement React Query/SWR for caching
- [ ] Memoize expensive calculations

### 12.2 Medium-term Improvements

**Code Quality:**
- [ ] Add integration tests for API routes
- [ ] Add E2E tests with Playwright
- [ ] Set up error monitoring (Sentry)

**Features:**
- [ ] Exercise library with preset tips
- [ ] Workout templates/sharing
- [ ] Progress photos storage
- [ ] Export data functionality

### 12.3 Long-term Architecture Evolution

**If scaling becomes necessary:**

```
Current:                        Future:
─────────                       ───────
┌─────────────┐                ┌─────────────┐
│  Monolith   │                │   API GW    │
│  Next.js    │                └──────┬──────┘
└─────────────┘                       │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
                    ┌──────────┐ ┌──────────┐ ┌──────────┐
                    │ Auth     │ │ Workouts │ │ Sessions │
                    │ Service  │ │ Service  │ │ Service  │
                    └──────────┘ └──────────┘ └──────────┘
```

**Consider microservices when:**
- Team grows beyond 5 developers
- Different components need independent scaling
- Deployment frequency varies by feature

---

## Appendix A: API Quick Reference

```
Auth:
  POST /api/auth/register        - Create account
  POST /api/auth/signin          - Login (NextAuth)
  POST /api/auth/signout         - Logout (NextAuth)

Workouts:
  GET    /api/workouts           - List all
  POST   /api/workouts           - Create new
  GET    /api/workouts/:id       - Get one
  PUT    /api/workouts/:id       - Update
  DELETE /api/workouts/:id       - Delete
  PUT    /api/workouts/reorder   - Update order
  POST   /api/workouts/:id/regenerate-tip - Refresh AI tip

Cycles:
  GET    /api/cycles             - List all with workouts
  POST   /api/cycles             - Create new
  GET    /api/cycles/:id         - Get one
  PUT    /api/cycles/:id         - Update
  DELETE /api/cycles/:id         - Delete

Sessions:
  GET    /api/sessions           - List (with date filter)
  POST   /api/sessions           - Create new
  PUT    /api/sessions/:id       - Update progress
  DELETE /api/sessions/:id       - Delete

Aggregates:
  GET    /api/today              - Today page data
  GET    /api/calendar           - Calendar page data
  GET    /api/stats              - Dashboard analytics

Settings:
  GET    /api/settings           - Get user settings
  PUT    /api/settings           - Update settings
```

---

## Appendix B: Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:pass@host:5432/gymtracker"
AUTH_SECRET="generate-with-openssl-rand-base64-32"

# Optional
GEMINI_API_KEY="your-google-ai-api-key"  # Falls back to hardcoded tips
```

---

*Document generated: November 2024*
*Last updated: Based on codebase analysis*
