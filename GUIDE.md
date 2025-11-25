# GymTracker - Beginner's Guide to the Codebase

This guide explains how the GymTracker application works, written for developers who may not be familiar with the specific technologies used (Next.js, Prisma, NextAuth, etc.).

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [How the App is Organized](#how-the-app-is-organized)
3. [Understanding Next.js](#understanding-nextjs)
4. [The Database Layer](#the-database-layer)
5. [User Authentication](#user-authentication)
6. [API Endpoints](#api-endpoints)
7. [The User Interface](#the-user-interface)
8. [How Data Flows](#how-data-flows)
9. [Styling with Tailwind](#styling-with-tailwind)
10. [Workout Scheduling Logic](#workout-scheduling-logic)
11. [Workout Cycles](#workout-cycles)
12. [The AI Tips Feature](#the-ai-tips-feature)
13. [Theme System](#theme-system)
14. [Adaptive Mode](#adaptive-mode)

---

## The Big Picture

GymTracker is a **full-stack web application** that lets users:
1. Create an account and log in
2. Define workouts (exercises with sets, reps, weight, schedule)
3. View scheduled workouts on a calendar
4. Execute workouts with a timer and progress tracking
5. See analytics about their workout history

### Technology Overview

Think of the app as having three main layers:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                   │
│  React components that users see and interact with      │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP requests
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Server)                     │
│  API routes that process requests and return data       │
└─────────────────────────────────────────────────────────┘
                            ↕ SQL queries
┌─────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                │
│  Stores all user data, workouts, and sessions           │
└─────────────────────────────────────────────────────────┘
```

**What makes this special:** Next.js lets us write both frontend AND backend code in the same project. No separate server needed!

---

## How the App is Organized

```
src/
├── app/        ← Pages and API routes (Next.js convention)
├── components/ ← Reusable UI pieces
├── lib/        ← Utility code (database, auth, helpers)
└── types/      ← TypeScript type definitions
```

### The `app/` Directory

This is where Next.js magic happens. The folder structure directly maps to URLs:

```
app/
├── page.tsx              → URL: /
├── login/
│   └── page.tsx          → URL: /login
├── dashboard/
│   └── page.tsx          → URL: /dashboard
├── api/
│   └── workouts/
│       └── route.ts      → URL: /api/workouts (API endpoint)
```

**Key insight:** If you create a folder with a `page.tsx` file, Next.js automatically creates a webpage at that URL. No routing configuration needed!

---

## Understanding Next.js

### What is Next.js?

Next.js is a **framework built on top of React**. React alone only handles the UI - Next.js adds:
- File-based routing (folders = URLs)
- Server-side rendering (pages can load data before sending to browser)
- API routes (backend endpoints in the same project)
- Automatic code splitting (only loads what's needed)

### Server vs Client Components

In Next.js, components can run in two places:

**Server Components** (default):
- Run on the server before sending HTML to browser
- Can directly access database
- Can't use browser features (onClick, useState)
- Faster initial page load

**Client Components** (marked with `"use client"`):
- Run in the browser
- Can use React hooks (useState, useEffect)
- Can respond to user interactions
- Required for interactive features

```tsx
// Server Component (default) - runs on server
export default async function DashboardPage() {
  const data = await fetchFromDatabase();  // Direct DB access!
  return <div>{data}</div>;
}

// Client Component - runs in browser
"use client";
export default function Counter() {
  const [count, setCount] = useState(0);  // Browser-only hook
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Route Groups

Folders wrapped in parentheses like `(auth)` or `(app)` are **route groups**:
- They organize code but DON'T affect the URL
- `app/(auth)/login/page.tsx` → URL is `/login`, not `/auth/login`
- Each group can have its own `layout.tsx` (shared wrapper)

We use route groups to:
- `(auth)` - Login/register pages with centered layout, no navigation
- `(app)` - Main app pages with sidebar navigation, requires login

---

## The Database Layer

### What is PostgreSQL?

PostgreSQL (or "Postgres") is a **relational database** - it stores data in tables with rows and columns, like a spreadsheet. Tables can reference each other (a workout belongs to a user).

### What is Prisma?

Prisma is an **ORM (Object-Relational Mapper)**. Instead of writing raw SQL:

```sql
SELECT * FROM users WHERE email = 'test@example.com';
```

You write JavaScript/TypeScript:

```typescript
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' }
});
```

Prisma converts your code to SQL automatically.

### The Schema File

`prisma/schema.prisma` defines your database structure:

```prisma
model User {
  id       String    @id @default(cuid())  // Primary key, auto-generated
  email    String    @unique               // Must be unique
  name     String?                         // Optional (? means nullable)
  password String                          // Required

  workouts Workout[]                       // One user has many workouts
}

model Workout {
  id     String @id @default(cuid())
  name   String
  weight Float                             // Decimal number

  userId String                            // Foreign key
  user   User   @relation(...)             // Links to User table
}
```

**Key concepts:**
- `@id` - Primary key (unique identifier for each row)
- `@unique` - No duplicates allowed
- `?` after type - Field is optional (can be null)
- `[]` after type - Array/list of items
- Relations connect tables (User has many Workouts)

### Migrations

When you change the schema, you run:
```bash
npx prisma migrate dev --name describe_your_change
```

This:
1. Compares your schema to the database
2. Generates SQL to update the database
3. Runs that SQL
4. Saves the migration for version control

### The Prisma Client

`src/lib/prisma.ts` creates a single database connection:

```typescript
import { PrismaClient } from "@prisma/client";

// Create one client and reuse it (singleton pattern)
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
```

**Why singleton?** In development, code reloads frequently. Creating a new connection each time would exhaust the database connection limit.

---

## User Authentication

### What is Authentication?

Authentication answers: "Who is this user?" It involves:
1. **Registration** - Creating a new account
2. **Login** - Proving you are who you claim to be
3. **Sessions** - Remembering you're logged in between requests

### What is NextAuth?

NextAuth.js handles all the complex authentication logic:
- Secure password handling
- Session management
- Cookie security
- CSRF protection

### How Login Works

```
1. User enters email + password
2. Browser sends POST request to /api/auth/callback/credentials
3. NextAuth calls our "authorize" function:

   async authorize(credentials) {
     // Find user in database
     const user = await prisma.user.findUnique({
       where: { email: credentials.email }
     });

     // Check password (bcrypt compares hashes)
     const valid = await bcrypt.compare(credentials.password, user.password);

     // Return user if valid, null if not
     return valid ? user : null;
   }

4. If valid, NextAuth creates a JWT token
5. Token stored in HTTP-only cookie (browser can't read it with JavaScript)
6. Future requests include this cookie automatically
```

### Password Hashing

We NEVER store plain passwords. `bcrypt` creates a one-way hash:

```typescript
// Registration - hash the password
const hashedPassword = await bcrypt.hash("user's password", 12);
// Result: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.fX5E5F5F5F5F5F"

// Login - compare password to hash
const isMatch = await bcrypt.compare("user's password", hashedPassword);
// Returns true or false
```

The "12" is the "salt rounds" - higher = more secure but slower.

### Protected Routes

The app layout (`src/app/(app)/layout.tsx`) checks if user is logged in:

```typescript
export default async function AppLayout({ children }) {
  const session = await auth();  // Get current session

  if (!session) {
    redirect("/login");  // Not logged in? Go to login page
  }

  return (
    <div>
      <Navigation />
      {children}
    </div>
  );
}
```

Every page inside `(app)/` folder inherits this check.

---

## API Endpoints

### What are API Routes?

API routes are backend endpoints that:
- Receive HTTP requests (GET, POST, PUT, DELETE)
- Process data (validate, transform, save to database)
- Return JSON responses

In Next.js, files named `route.ts` in the `app/api/` folder become API endpoints.

### Anatomy of an API Route

```typescript
// app/api/workouts/route.ts

// GET /api/workouts - Fetch all workouts
export async function GET() {
  // 1. Check if user is logged in
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Query database
  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id }  // Only this user's workouts
  });

  // 3. Return JSON response
  return NextResponse.json(workouts);
}

// POST /api/workouts - Create new workout
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON body from request
  const body = await request.json();

  // Create in database
  const workout = await prisma.workout.create({
    data: {
      name: body.name,
      weight: parseFloat(body.weight),
      // ... other fields
      userId: session.user.id  // Link to current user
    }
  });

  return NextResponse.json(workout);
}
```

### HTTP Methods Explained

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Read data | Get list of workouts |
| POST | Create new | Create a workout |
| PUT | Update existing | Edit workout details |
| DELETE | Remove | Delete a workout |

### Dynamic Routes

`[id]` in folder names captures URL parameters:

```
app/api/workouts/[id]/route.ts

URL: /api/workouts/abc123
                   ^^^^^^
                   params.id = "abc123"
```

```typescript
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // Get the ID from URL

  await prisma.workout.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
```

---

## The User Interface

### Component Structure

UI is built from **React components** - reusable pieces of interface:

```
Page (full screen)
└── Card (container)
    ├── CardHeader
    │   └── CardTitle (text)
    └── CardContent
        ├── Input (text field)
        └── Button (clickable)
```

### How Components Work

A component is a function that returns JSX (HTML-like syntax):

```tsx
// Simple component
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Usage
<Greeting name="World" />  // Renders: <h1>Hello, World!</h1>
```

### State Management

**State** is data that can change over time:

```tsx
"use client";

import { useState } from "react";

function Counter() {
  // useState returns [currentValue, setterFunction]
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

**useEffect** runs code when component loads or dependencies change:

```tsx
function WorkoutList() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This runs once when component mounts
    async function loadWorkouts() {
      const response = await fetch("/api/workouts");
      const data = await response.json();
      setWorkouts(data);
      setLoading(false);
    }
    loadWorkouts();
  }, []);  // Empty array = run once on mount

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {workouts.map(workout => (
        <li key={workout.id}>{workout.name}</li>
      ))}
    </ul>
  );
}
```

### UI Component Library

We use **Radix UI** for complex interactive components:

```tsx
// Radix provides unstyled, accessible components
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
  <Dialog.Trigger>Open Modal</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />  {/* Dark background */}
    <Dialog.Content>   {/* Modal window */}
      <Dialog.Title>Edit Workout</Dialog.Title>
      {/* Form content */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Why Radix?**
- Handles accessibility (keyboard navigation, screen readers)
- Manages focus correctly
- No built-in styles (we add our own with Tailwind)

---

## How Data Flows

### Creating a Workout (Full Flow)

```
1. USER ACTION
   User fills out form and clicks "Create"

2. CLIENT COMPONENT (workout-form.tsx)
   const handleSubmit = async (e) => {
     e.preventDefault();
     await onSubmit({
       name: formData.name,
       weight: parseFloat(formData.weight),
       // ...
     });
   };

3. PAGE COMPONENT (workouts/page.tsx)
   const handleCreate = async (workout) => {
     await fetch("/api/workouts", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(workout)
     });
     fetchWorkouts();  // Refresh list
   };

4. API ROUTE (api/workouts/route.ts)
   export async function POST(request) {
     const body = await request.json();
     const workout = await prisma.workout.create({
       data: { ...body, userId: session.user.id }
     });
     return NextResponse.json(workout);
   }

5. DATABASE
   INSERT INTO workouts (id, name, weight, ...) VALUES (...)

6. RESPONSE flows back up the chain
   API → Page → Form closes → List refreshes
```

### Fetching Data (Typical Pattern)

```tsx
"use client";

export default function WorkoutsPage() {
  // 1. State for data and loading
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Fetch function (wrapped in useCallback for optimization)
  const fetchWorkouts = useCallback(async () => {
    const response = await fetch("/api/workouts");
    const data = await response.json();
    setWorkouts(data);
    setLoading(false);
  }, []);

  // 3. Fetch on component mount
  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // 4. Show loading state
  if (loading) {
    return <Spinner />;
  }

  // 5. Render data
  return <WorkoutList workouts={workouts} />;
}
```

---

## Styling with Tailwind

### What is Tailwind CSS?

Tailwind is a **utility-first CSS framework**. Instead of writing CSS:

```css
.card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

You apply utility classes directly:

```html
<div class="bg-white rounded-lg p-4 shadow-sm">
```

### Common Tailwind Classes

| Class | CSS Equivalent |
|-------|---------------|
| `p-4` | `padding: 1rem` |
| `m-2` | `margin: 0.5rem` |
| `mt-4` | `margin-top: 1rem` |
| `flex` | `display: flex` |
| `items-center` | `align-items: center` |
| `justify-between` | `justify-content: space-between` |
| `text-lg` | `font-size: 1.125rem` |
| `font-bold` | `font-weight: 700` |
| `bg-primary` | `background-color: var(--primary)` |
| `rounded-xl` | `border-radius: 0.75rem` |
| `hover:bg-muted` | On hover, apply bg-muted |
| `md:flex` | On medium screens+, display flex |

### Responsive Design

Prefix classes with breakpoint to apply only at that size:

```html
<!-- Mobile: stack vertically, Desktop: side by side -->
<div class="flex flex-col md:flex-row">
  <div>Left</div>
  <div>Right</div>
</div>
```

Breakpoints:
- (no prefix) = mobile first (all sizes)
- `sm:` = 640px and up
- `md:` = 768px and up
- `lg:` = 1024px and up

### CSS Variables

`globals.css` defines color variables:

```css
:root {
  --primary: 262 83% 58%;     /* HSL values for purple */
  --background: 224 71% 4%;   /* Dark blue-gray */
}
```

Used in Tailwind as:
```html
<button class="bg-primary text-primary-foreground">
```

---

## Workout Scheduling Logic

### Two Schedule Types

Users can schedule workouts two ways:

1. **Interval** - Every N days (e.g., every 2 days)
2. **Specific Days** - On certain weekdays (e.g., Mon, Wed, Fri)

### How It's Stored

```typescript
model Workout {
  intervalDays  Int?     // e.g., 2 (every 2 days), or null
  scheduleDays  Int[]    // e.g., [1, 3, 5] (Mon, Wed, Fri)
  startDate     DateTime // When schedule begins
}
```

### Checking if Workout is Scheduled

```typescript
// src/lib/utils.ts

function isWorkoutScheduledForDate(workout, date) {
  // If date is before workout start date, not scheduled
  if (date < workout.startDate) return false;

  // Option 1: Specific weekdays
  if (workout.scheduleDays.length > 0) {
    // getDay() returns 0-6 (Sun-Sat)
    return workout.scheduleDays.includes(date.getDay());
  }

  // Option 2: Every N days
  if (workout.intervalDays > 0) {
    // Calculate days since start
    const daysDiff = daysBetween(workout.startDate, date);
    // Check if it's an interval day (remainder is 0)
    return daysDiff % workout.intervalDays === 0;
  }

  return false;
}
```

### Calendar Integration

The calendar uses this function to show workout indicators:

```tsx
// For each day in the calendar
const scheduledWorkouts = workouts.filter(workout =>
  isWorkoutScheduledForDate(workout, day)
);

// If any workouts scheduled, show indicator
if (scheduledWorkouts.length > 0) {
  return <DumbbellIcon />;
}
```

---

## Workout Cycles

### What are Workout Cycles?

Cycles let you group workouts to rotate through on a schedule. For example, a "Push Pull Legs" cycle with three workouts scheduled every 2 days would:
- Day 1: Push workout
- Day 3: Pull workout
- Day 5: Legs workout
- Day 7: Push workout (back to start)

### How Cycles Work

```typescript
// Determining which workout in a cycle to show
function getCycleWorkoutForDate(cycle, date) {
  // Count how many scheduled days have passed
  const scheduledDates = getScheduledCycleDatesUpTo(cycle, date);

  // Rotate through workouts
  const index = (scheduledDates.length - 1) % cycle.workouts.length;

  return cycle.workouts[index];
}
```

### Database Structure

Workouts can optionally belong to a cycle:
```prisma
model Workout {
  cycleId     String?        // Which cycle (if any)
  cycleOrder  Int?           // Position in cycle (0, 1, 2...)
  cycle       WorkoutCycle?  // Relationship
}
```

---

## The AI Tips Feature

### What is Google Gemini?

Gemini is Google's AI model. We use the free tier of Gemini 1.5 Flash to generate workout tips.

### How Tips are Generated

```typescript
// src/lib/ai.ts

async function generateWorkoutTip(workoutName) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Give a brief fitness tip for: ${workoutName}` }]
        }]
      })
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

### Async Generation

Tips are generated **asynchronously** - they don't block workout creation:

```typescript
// In POST /api/workouts
const workout = await prisma.workout.create({ ... });

// Fire and forget - tip updates in background
generateWorkoutTipAsync(workout.id, workout.name);

return NextResponse.json(workout);  // Returns immediately
```

### Fallback Tips

If the API is unavailable, built-in tips are used:
```typescript
const FALLBACK_TIPS = {
  bench: "Keep your feet flat, shoulder blades pinched...",
  squat: "Keep your core tight, chest up...",
  default: "Focus on proper form and breathing."
};
```

---

## Theme System

### How Theming Works

The app supports three theme modes:
- **Auto**: Light during day (7am-7pm), dark at night
- **Light**: Always light theme
- **Dark**: Always dark theme

### Implementation

```typescript
// ThemeProvider context
function ThemeProvider({ children, initialThemeMode }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (themeMode === "auto") {
      const hour = new Date().getHours();
      setTheme(hour >= 7 && hour < 19 ? "light" : "dark");
    } else {
      setTheme(themeMode);
    }

    // Apply to HTML element
    document.documentElement.classList.add(theme);
  }, [themeMode]);
}
```

### CSS Variables

Themes are defined using CSS variables:
```css
/* Dark theme (default) */
:root {
  --background: 224 71% 4%;
  --foreground: 210 20% 98%;
}

/* Light theme */
.light {
  --background: 0 0% 100%;
  --foreground: 224 71% 4%;
}
```

---

## Adaptive Mode

### What is Adaptive Mode?

When enabled, incomplete workouts block future scheduled workouts. This ensures you don't skip ahead without finishing previous workouts.

### How It Works

```typescript
function isWorkoutAvailableAdaptive(workout, date, allSessions) {
  // Find oldest incomplete session for this workout
  const oldestIncomplete = getOldestIncompleteSessionDate(workoutSessions);

  // If there's an incomplete session, only that date is available
  if (oldestIncomplete) {
    return date === oldestIncomplete;
  }

  // Otherwise, normal scheduling applies
  return isWorkoutScheduledForDate(workout, date);
}
```

### Completion Rate Calculation

In adaptive mode:
```
Completion Rate = Completed Workouts / Total Scheduled to Date
```

Rather than completed / created sessions.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database structure definition |
| `src/lib/prisma.ts` | Database connection |
| `src/lib/auth.ts` | Authentication configuration |
| `src/lib/utils.ts` | Helper functions |
| `src/lib/ollama.ts` | AI integration |
| `src/app/layout.tsx` | Root HTML structure |
| `src/app/globals.css` | Global styles and CSS variables |
| `src/app/(app)/layout.tsx` | Protected routes wrapper |
| `src/components/ui/*` | Reusable UI components |

---

## Common Patterns in This Codebase

### 1. Fetch-on-Mount Pattern
```tsx
useEffect(() => {
  fetchData();
}, [fetchData]);
```

### 2. Loading State Pattern
```tsx
if (loading) return <Loader2 className="animate-spin" />;
```

### 3. Form Submission Pattern
```tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await apiCall();
    onSuccess();
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### 4. Protected API Route Pattern
```tsx
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### 5. Conditional Rendering Pattern
```tsx
{condition ? <ComponentA /> : <ComponentB />}
```

---

## Getting Help

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Radix UI Docs**: https://www.radix-ui.com/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
