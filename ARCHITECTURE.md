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
8. [Styling](#styling)
9. [AI Integration](#ai-integration)
10. [State Management](#state-management)
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
| AI | Ollama (local LLM) | - |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth route group (login, register)
│   │   ├── layout.tsx     # Centered layout for auth pages
│   │   ├── login/
│   │   │   └── page.tsx   # Login page
│   │   └── register/
│   │       └── page.tsx   # Registration page
│   ├── (app)/             # Protected app route group
│   │   ├── layout.tsx     # App layout with navigation
│   │   ├── dashboard/
│   │   │   └── page.tsx   # Analytics dashboard
│   │   ├── workouts/
│   │   │   └── page.tsx   # Workout management
│   │   ├── calendar/
│   │   │   └── page.tsx   # Calendar view
│   │   └── today/
│   │       └── page.tsx   # Today's workout player
│   ├── api/               # API routes
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts    # NextAuth handlers
│   │   │   └── register/
│   │   │       └── route.ts    # User registration
│   │   ├── workouts/
│   │   │   ├── route.ts        # GET all, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts    # GET, PUT, DELETE single
│   │   │       └── regenerate-tip/
│   │   │           └── route.ts # Regenerate AI tip
│   │   ├── sessions/
│   │   │   ├── route.ts        # GET all, POST create
│   │   │   └── [id]/
│   │   │       └── route.ts    # PUT, DELETE single
│   │   └── stats/
│   │       └── route.ts        # GET analytics data
│   ├── globals.css        # Global styles & CSS variables
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Root redirect
├── components/
│   ├── ui/                # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   └── tabs.tsx
│   ├── calendar.tsx       # Interactive calendar component
│   ├── navigation.tsx     # Sidebar & mobile nav
│   ├── stats-charts.tsx   # Dashboard charts
│   ├── workout-form.tsx   # Create/edit workout dialog
│   ├── workout-list.tsx   # Workout cards list
│   └── workout-player.tsx # Workout execution UI
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── ollama.ts          # Ollama AI integration
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
┌─────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│    User     │       │     Workout     │       │   WorkoutSession    │
├─────────────┤       ├─────────────────┤       ├─────────────────────┤
│ id (PK)     │──┐    │ id (PK)         │──┐    │ id (PK)             │
│ email       │  │    │ name            │  │    │ date                │
│ name        │  │    │ weight          │  │    │ completed           │
│ password    │  │    │ restTime        │  │    │ setsCompleted       │
│ createdAt   │  │    │ sets            │  │    │ repsPerSet[]        │
│ updatedAt   │  │    │ repsPerSet      │  │    │ weightUsed          │
└─────────────┘  │    │ notes           │  │    │ duration            │
                 │    │ aiTip           │  │    │ workoutId (FK)──────┤
                 │    │ intervalDays    │  │    │ userId (FK)─────────┤
                 │    │ scheduleDays[]  │  │    └─────────────────────┘
                 │    │ startDate       │  │
                 │    │ userId (FK)─────┤  │
                 │    └─────────────────┘  │
                 │                         │
                 └─────────────────────────┘
```

### Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String              // bcrypt hashed
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  workouts         Workout[]
  workoutSessions  WorkoutSession[]
}
```

#### Workout
```prisma
model Workout {
  id            String    @id @default(cuid())
  name          String                // Exercise name
  weight        Float                 // Weight in kg
  restTime      Int                   // Rest between sets (seconds)
  sets          Int                   // Number of sets
  repsPerSet    Int                   // Target reps per set
  notes         String?               // Optional notes
  aiTip         String?   @db.Text    // AI-generated tip
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Scheduling
  intervalDays  Int?                  // Every N days (null = use scheduleDays)
  scheduleDays  Int[]                 // Weekdays [0-6] (Sun-Sat)
  startDate     DateTime  @default(now())

  userId        String
  user          User      @relation(...)
  sessions      WorkoutSession[]
}
```

#### WorkoutSession
```prisma
model WorkoutSession {
  id              String    @id @default(cuid())
  date            DateTime  @default(now())
  completed       Boolean   @default(false)
  setsCompleted   Int       @default(0)
  repsPerSet      Int[]                 // Actual reps per set
  weightUsed      Float?                // Weight used (snapshot)
  duration        Int?                  // Total duration (seconds)

  workoutId       String
  workout         Workout   @relation(...)
  userId          String
  user            User      @relation(...)
}
```

---

## Authentication

### Configuration (`src/lib/auth.ts`)

Uses NextAuth.js v5 with credentials provider:

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // 1. Find user by email
        // 2. Compare password with bcrypt
        // 3. Return user object or null
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt({ token, user }) {
      // Add user.id to token
    },
    session({ session, token }) {
      // Add token.id to session.user
    },
  },
});
```

### Authentication Flow

1. **Registration** (`POST /api/auth/register`)
   - Validates email/password
   - Checks for existing user
   - Hashes password with bcrypt (12 rounds)
   - Creates user in database

2. **Login** (`POST /api/auth/callback/credentials`)
   - NextAuth handles credential validation
   - Issues JWT token stored in HTTP-only cookie
   - Token includes user ID

3. **Session Check**
   - Server components: `const session = await auth()`
   - Client components: Use `next-auth/react` hooks
   - Protected routes: Check session in layout

4. **Logout**
   - Call `signOut()` from `next-auth/react`
   - Clears session cookie

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
| GET | `/api/workouts` | Get all user's workouts |
| POST | `/api/workouts` | Create workout (+ AI tip) |
| GET | `/api/workouts/[id]` | Get single workout |
| PUT | `/api/workouts/[id]` | Update workout |
| DELETE | `/api/workouts/[id]` | Delete workout |
| POST | `/api/workouts/[id]/regenerate-tip` | Get new AI tip |

### Workout Sessions

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sessions` | Get sessions (with date filter) |
| POST | `/api/sessions` | Create session for workout |
| PUT | `/api/sessions/[id]` | Update session progress |
| DELETE | `/api/sessions/[id]` | Delete session |

**Query Parameters for GET /api/sessions:**
- `startDate`: ISO date string
- `endDate`: ISO date string

### Statistics

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stats` | Get dashboard analytics |

**Response includes:**
- `totalCompleted`: Number of completed sessions
- `completionRate`: Percentage (0-100)
- `totalSets`: Sum of all completed sets
- `totalReps`: Sum of all completed reps
- `monthlyStats`: Last 6 months activity
- `weightProgress`: Weight history per workout

---

## Components

### UI Components (`src/components/ui/`)

Built on Radix UI primitives with Tailwind styling:

| Component | Based On | Purpose |
|-----------|----------|---------|
| `Button` | Native | Actions with variants (default, destructive, outline, ghost, success) |
| `Input` | Native | Text input with consistent styling |
| `Label` | `@radix-ui/react-label` | Form labels |
| `Card` | Native | Content containers |
| `Dialog` | `@radix-ui/react-dialog` | Modal dialogs |
| `Checkbox` | `@radix-ui/react-checkbox` | Toggle inputs |
| `Select` | `@radix-ui/react-select` | Dropdown selection |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | Action menus |
| `Tabs` | `@radix-ui/react-tabs` | Tab navigation |

### Application Components

#### `Calendar` (`src/components/calendar.tsx`)
Interactive monthly calendar showing scheduled workouts.

**Props:**
```typescript
interface CalendarProps {
  workouts: Workout[];
  sessions: WorkoutSession[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}
```

**Features:**
- Month navigation
- Visual indicators for scheduled workouts
- Green checkmark for completed days
- Highlights today and selected date

#### `WorkoutForm` (`src/components/workout-form.tsx`)
Dialog for creating/editing workouts.

**Props:**
```typescript
interface WorkoutFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (workout: WorkoutFormData) => Promise<void>;
  initialData?: Workout;
}
```

**Fields:**
- Exercise name
- Weight (kg)
- Rest time (seconds)
- Sets count
- Reps per set
- Notes (optional)
- Schedule type (interval or specific days)

#### `WorkoutList` (`src/components/workout-list.tsx`)
Displays workout cards with edit/delete actions.

**Props:**
```typescript
interface WorkoutListProps {
  workouts: Workout[];
  onEdit: (workout: Workout) => void;
  onDelete: (id: string) => void;
}
```

#### `WorkoutPlayer` (`src/components/workout-player.tsx`)
Interactive workout execution interface.

**Props:**
```typescript
interface WorkoutPlayerProps {
  sessions: WorkoutSession[];
  onUpdateSession: (sessionId: string, data: UpdateData) => Promise<void>;
  onRegenerateTip: (workoutId: string) => Promise<void>;
}
```

**Features:**
- Overall progress bar
- Current workout display with weight
- Set-by-set progress indicators
- "Complete Set" button
- Rest timer with pause/skip
- AI tip display
- Upcoming workouts list

#### `Navigation` (`src/components/navigation.tsx`)
Responsive navigation component.

**Desktop:** Fixed sidebar with:
- Logo
- Nav links (Dashboard, Workouts, Calendar, Today)
- Sign out button

**Mobile:** Fixed bottom bar with icon navigation

#### `StatsCharts` (`src/components/stats-charts.tsx`)
Dashboard analytics visualizations.

**Props:**
```typescript
interface StatsChartsProps {
  monthlyStats: MonthlyStats[];
  weightProgress: WeightProgress[];
}
```

**Charts:**
1. **Monthly Activity Bar Chart**
   - Total sessions vs completed
   - Last 6 months

2. **Weight Progress Line Chart**
   - Per-workout weight over time
   - Workout selector dropdown

---

## Pages

### Route Groups

**`(auth)`** - Public authentication pages
- Centered layout with gradient background
- No navigation

**`(app)`** - Protected application pages
- Requires authentication (redirects to /login)
- Includes navigation sidebar/bottom bar
- Max-width container with padding

### Page Details

#### `/login`
- Email/password form
- Link to registration
- Error handling for invalid credentials

#### `/register`
- Name/email/password form
- Password minimum 6 characters
- Redirects to login on success

#### `/dashboard`
- Stats cards grid (completed, rate, sets, reps)
- Monthly activity chart
- Weight progress chart

#### `/workouts`
- "Add Workout" button
- Workout cards list
- Edit/delete via dropdown menu
- Create/edit modal

#### `/calendar`
- Month view calendar
- Selected date workout details
- Completion status indicators

#### `/today`
- Shows today's scheduled workouts
- "Start Workout" button creates sessions
- Workout player for execution
- "All Done" state when complete

---

## Styling

### Design System

**Colors (CSS Variables):**
```css
--primary: 262 83% 58%        /* Purple accent */
--background: 224 71% 4%       /* Dark background */
--card: 224 71% 6%             /* Slightly lighter */
--muted: 215 28% 17%           /* Muted elements */
--destructive: 0 62% 50%       /* Red for errors */
```

**Border Radius:**
```css
--radius: 0.75rem              /* Base radius */
/* Components use rounded-xl (1rem) and rounded-2xl (1.5rem) */
```

### Mobile-First Approach

1. **Breakpoints:**
   - Default: Mobile styles
   - `md:` (768px+): Desktop adaptations

2. **Navigation:**
   - Mobile: Bottom fixed bar (64px height)
   - Desktop: Left sidebar (256px width)

3. **Content:**
   - Padding: `p-4` mobile, `p-6` desktop
   - Main content offset: `pb-20` mobile (for bottom nav)

4. **Safe Areas:**
   - `.safe-area-pb` class for iOS home indicator

### Component Patterns

**Cards:**
```tsx
<Card className="rounded-2xl border shadow-sm hover:shadow-md transition-all">
```

**Buttons:**
```tsx
<Button variant="default" size="lg" className="rounded-xl shadow-lg shadow-primary/25">
```

**Inputs:**
```tsx
<Input className="h-11 rounded-xl border-input focus:ring-2 focus:ring-ring">
```

---

## AI Integration

### Ollama Setup (`src/lib/ollama.ts`)

```typescript
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function generateWorkoutTip(workoutName: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    body: JSON.stringify({
      model: "llama3.2",
      prompt: `You are a professional fitness coach. Give one concise,
               practical tip (2-3 sentences max) for performing the
               exercise "${workoutName}" with proper form...`,
      stream: false,
    }),
  });

  const data = await response.json();
  return data.response || "Focus on proper form...";
}
```

### Usage

1. **On Workout Creation:**
   - AI tip generated automatically
   - Stored in `workout.aiTip`

2. **On Name Change:**
   - Tip regenerated during update

3. **Manual Regeneration:**
   - User clicks refresh button
   - Calls `/api/workouts/[id]/regenerate-tip`

### Fallback

If Ollama is unavailable, returns default tip:
```
"Focus on proper form, controlled movements, and consistent breathing throughout the exercise."
```

---

## State Management

### Server State

All data fetching uses standard `fetch()` with manual refetching:

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

const fetchData = useCallback(async () => {
  const res = await fetch("/api/...");
  const json = await res.json();
  setData(json);
  setLoading(false);
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Client State

Local component state for:
- Form inputs
- Modal open/close
- Timer state
- Current workout index

### Session State

NextAuth handles session via:
- JWT token in HTTP-only cookie
- Server: `await auth()`
- Layouts check session for protection

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth encryption key |
| `OLLAMA_URL` | No | Ollama server URL (default: http://localhost:11434) |

### Example `.env`
```bash
DATABASE_URL="postgresql://user@localhost:5432/gymtracker"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
OLLAMA_URL="http://localhost:11434"
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Prisma commands
npx prisma migrate dev     # Create/apply migrations
npx prisma studio          # Open database GUI
npx prisma generate        # Regenerate client
npx prisma db push         # Push schema (no migration)
```

---

## Deployment Considerations

1. **Database:** Use managed PostgreSQL (Neon, Supabase, Railway)
2. **Environment:** Set `AUTH_SECRET` to secure random value
3. **Ollama:** Either self-host or remove AI features
4. **Build:** `npm run build` creates optimized production build
5. **Platform:** Deploy to Vercel, Railway, or any Node.js host
