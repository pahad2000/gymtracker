# GymTracker - Codebase Documentation

A modern, mobile-first workout tracking application built with Next.js, PostgreSQL, and AI-powered workout tips.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [Authentication](#authentication)
5. [API Routes](#api-routes)
6. [Components](#components)
7. [Pages](#pages)
8. [Styling & Theming](#styling--theming)
9. [AI Integration](#ai-integration)
10. [Key Features](#key-features)
11. [Environment Variables](#environment-variables)

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Database | PostgreSQL | - |
| ORM | Prisma | 6.x |
| Authentication | NextAuth.js | 5.x (beta) |
| Styling | Tailwind CSS | 4.x |
| UI Components | Radix UI Primitives | - |
| Charts | Recharts | 3.x |
| Date Utilities | date-fns | 4.x |
| Icons | Lucide React | - |
| AI | Google Gemini API | 1.5 Flash |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth route group (login, register)
│   │   ├── layout.tsx     # Centered layout for auth pages
│   │   ├── login/
│   │   └── register/
│   ├── (app)/             # Protected app route group
│   │   ├── layout.tsx     # App layout with navigation + theme
│   │   ├── dashboard/     # Analytics dashboard
│   │   ├── workouts/      # Workout management
│   │   ├── cycles/        # Workout cycle management
│   │   ├── calendar/      # Calendar view
│   │   ├── today/         # Today's workout player
│   │   └── settings/      # User settings
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth handlers
│   │   ├── workouts/      # Workout CRUD + reorder
│   │   ├── cycles/        # Cycle CRUD
│   │   ├── sessions/      # Session CRUD
│   │   ├── settings/      # User settings
│   │   └── stats/         # Analytics data
│   ├── globals.css        # Global styles & CSS variables
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Root redirect
├── components/
│   ├── ui/                # Reusable UI primitives
│   ├── app-wrapper.tsx    # Theme provider wrapper
│   ├── theme-provider.tsx # Light/dark theme context
│   ├── calendar.tsx       # Interactive calendar
│   ├── navigation.tsx     # Sidebar & mobile nav
│   ├── stats-charts.tsx   # Dashboard charts
│   ├── workout-form.tsx   # Create/edit workout
│   ├── workout-list.tsx   # Workout cards
│   ├── workout-player.tsx # Workout execution
│   ├── cycle-form.tsx     # Create/edit cycle
│   └── ...
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── ai.ts              # Gemini AI integration
│   ├── prisma.ts          # Prisma client singleton
│   └── utils.ts           # Utility functions
├── types/
│   ├── index.ts           # Shared TypeScript types
│   └── next-auth.d.ts     # NextAuth type extensions
prisma/
├── schema.prisma          # Database schema
└── migrations/            # Migration history
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│      User       │       │  WorkoutCycle   │       │       Workout       │
├─────────────────┤       ├─────────────────┤       ├─────────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)             │
│ email           │  │    │ name            │  │    │ name                │
│ name            │  │    │ intervalDays    │  │    │ weight              │
│ password        │  │    │ scheduleDays[]  │  │    │ restTime            │
│ adaptiveMode    │  │    │ startDate       │  │    │ sets, repsPerSet    │
│ themeMode       │  │    │ userId (FK)─────┤  │    │ aiTip               │
│ createdAt       │  │    └─────────────────┘  │    │ intervalDays        │
│ updatedAt       │  │                         │    │ scheduleDays[]      │
└─────────────────┘  │                         │    │ startDate           │
                     │                         │    │ displayOrder        │
                     │                         │    │ cycleId (FK)────────┤
                     │                         │    │ cycleOrder          │
                     │                         │    │ userId (FK)─────────┤
                     │                         │    └─────────────────────┘
                     │                         │
                     │    ┌─────────────────────────────────────┐
                     │    │         WorkoutSession              │
                     │    ├─────────────────────────────────────┤
                     │    │ id (PK)                             │
                     │    │ date, completed                     │
                     │    │ setsCompleted, repsPerSet[]         │
                     │    │ weightUsed, duration                │
                     │    │ workoutId (FK), userId (FK)         │
                     │    └─────────────────────────────────────┘
                     │
                     └────────────────────────────────────────────
```

### Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String              // bcrypt hashed
  adaptiveMode  Boolean   @default(false)
  themeMode     String    @default("auto")  // auto, light, dark
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  workouts         Workout[]
  workoutSessions  WorkoutSession[]
  workoutCycles    WorkoutCycle[]
}
```

#### WorkoutCycle
```prisma
model WorkoutCycle {
  id            String    @id @default(cuid())
  name          String
  intervalDays  Int?
  scheduleDays  Int[]
  startDate     DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  userId        String
  user          User      @relation(...)
  workouts      Workout[]
}
```

#### Workout
```prisma
model Workout {
  id            String    @id @default(cuid())
  name          String
  weight        Float
  restTime      Int
  sets          Int
  repsPerSet    Int
  notes         String?
  aiTip         String?   @db.Text
  intervalDays  Int?
  scheduleDays  Int[]
  startDate     DateTime  @default(now())
  displayOrder  Int       @default(0)

  cycleId       String?
  cycle         WorkoutCycle? @relation(...)
  cycleOrder    Int?

  userId        String
  user          User      @relation(...)
  sessions      WorkoutSession[]
}
```

---

## Authentication

Uses NextAuth.js v5 with JWT strategy:

- **Session Duration:** 30 days
- **Password Hashing:** bcrypt (12 rounds)
- **Storage:** HTTP-only cookie with JWT token

### Protected Routes

The `(app)` layout checks authentication:
```typescript
const session = await auth();
if (!session) redirect("/login");
```

---

## API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create new user |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handlers |

### Workouts
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/workouts` | Get all workouts (ordered by displayOrder) |
| POST | `/api/workouts` | Create workout (async AI tip) |
| GET | `/api/workouts/[id]` | Get single workout |
| PUT | `/api/workouts/[id]` | Update workout |
| DELETE | `/api/workouts/[id]` | Delete workout |
| POST | `/api/workouts/[id]/regenerate-tip` | Regenerate AI tip |
| PUT | `/api/workouts/reorder` | Update display order |

### Cycles
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/cycles` | Get all cycles with workouts |
| POST | `/api/cycles` | Create cycle |
| GET | `/api/cycles/[id]` | Get single cycle |
| PUT | `/api/cycles/[id]` | Update cycle |
| DELETE | `/api/cycles/[id]` | Delete cycle |

### Sessions
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sessions` | Get sessions (with date filter) |
| POST | `/api/sessions` | Create session |
| PUT | `/api/sessions/[id]` | Update session |
| DELETE | `/api/sessions/[id]` | Delete session |

### Settings
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/settings` | Get user settings |
| PUT | `/api/settings` | Update settings |

### Statistics
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats` | Get dashboard analytics |

---

## Key Features

### 1. Workout Cycles
Group workouts to rotate through on a schedule:
- Create a cycle (e.g., "Push Pull Legs")
- Add workouts with specific order
- Workouts rotate on scheduled days

```typescript
// Determines which workout to show on a given date
function getCycleWorkoutForDate(cycle, date) {
  const scheduledDates = getScheduledCycleDatesUpTo(cycle, date);
  const index = (scheduledDates.length - 1) % cycle.workouts.length;
  return cycle.workouts[index];
}
```

### 2. Adaptive Mode
When enabled, incomplete workouts block future scheduled workouts:
- Completion rate = completed / total scheduled to date
- Encourages consistency

### 3. Light/Dark Theme
Three modes available:
- **Auto:** Light 7am-7pm, Dark 7pm-7am
- **Light:** Always light
- **Dark:** Always dark

Managed via `ThemeProvider` context.

### 4. Manual Workout Ordering
Reorder workouts on the Today page:
- Persists to `displayOrder` field
- Respects order across sessions

### 5. AI Workout Tips
Generated using Google Gemini API:
- Async generation (doesn't block workout creation)
- Fallback tips for common exercises
- Regenerate on demand

---

## Styling & Theming

### Design System

**Color Variables:**
```css
/* Dark theme (default) */
--primary: 262 83% 58%        /* Purple accent */
--background: 224 71% 4%       /* Dark background */
--card: 224 71% 6%

/* Light theme */
.light {
  --background: 0 0% 100%
  --card: 0 0% 98%
}
```

### Mobile-First Approach

- Default styles for mobile
- `md:` breakpoint (768px+) for desktop
- Bottom navigation on mobile
- Sidebar navigation on desktop

---

## AI Integration

### Gemini API (`src/lib/ai.ts`)

```typescript
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function generateWorkoutTip(workoutName: string): Promise<string> {
  // Returns tip from Gemini API or fallback
}

export async function generateWorkoutTipAsync(workoutId: string, workoutName: string): Promise<void> {
  // Generates tip and updates workout in background
}
```

### Fallback Tips
Built-in tips for common exercises (bench, squat, deadlift, etc.) used when API is unavailable.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth encryption key |
| `GEMINI_API_KEY` | No | Google Gemini API key (optional) |

### Example `.env`
```bash
DATABASE_URL="postgresql://user@localhost:5432/gymtracker"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
GEMINI_API_KEY="your-gemini-api-key"
```

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run linter

npx prisma migrate dev     # Create/apply migrations
npx prisma studio          # Database GUI
npx prisma generate        # Regenerate client
```

---

## Deployment

1. **Database:** Managed PostgreSQL (Neon recommended)
2. **Hosting:** Vercel (automatic from GitHub)
3. **Environment:** Set all variables in Vercel dashboard
4. **Migrations:** Run against production database before deploy
