# GymTracker

A modern, minimalist workout tracking application built with Next.js, PostgreSQL, and AI-powered tips.

## Features

- **Smart Workout Management**: Create weight-based and cardio workouts with flexible scheduling
- **Workout Cycles**: Group workouts into rotating cycles (e.g., Push/Pull/Legs)
- **Built-in Rest Timer**: Automatic countdown between sets
- **AI-Powered Tips**: Get exercise form tips powered by Google Gemini
- **Progress Analytics**: Track completion rates, total sets/reps, and weight progression
- **Interactive Calendar**: Visualize your workout schedule
- **Dark/Light Theme**: Auto, light, or dark theme modes
- **Mobile-First**: Optimized for use in the gym

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Charts**: Recharts
- **AI**: Google Gemini 1.5 Flash

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or use Neon for cloud PostgreSQL)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/gymtracker.git
cd gymtracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/gymtracker"
AUTH_SECRET="your-secret-key-at-least-32-chars"
GEMINI_API_KEY="your-google-gemini-api-key"  # Optional
```

Generate `AUTH_SECRET` with:
```bash
openssl rand -base64 32
```

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Key Features Explained

### Workout Types

- **Weight-based**: Track weight, sets, reps, and rest time (e.g., Bench Press)
- **Time-based (Cardio)**: Track duration for cardio exercises (e.g., Running, Cycling)

### Scheduling

Two scheduling modes:
- **Specific Days**: Schedule for certain weekdays (Mon, Wed, Fri)
- **Interval**: Every N days from a start date

### Workout Cycles

Group multiple workouts to rotate through on a schedule. Perfect for:
- Push/Pull/Legs splits
- Upper/Lower body rotations
- Any custom rotation program

### Session Selection

When no workouts are scheduled for today, select complete sessions from any past day to repeat those workouts.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login/register pages
│   ├── (app)/             # Protected app pages
│   └── api/               # API routes
├── components/
│   ├── ui/                # Reusable UI primitives
│   └── *.tsx              # Feature components
├── lib/
│   ├── auth.ts            # NextAuth configuration
│   ├── ai.ts              # Gemini API integration
│   ├── prisma.ts          # Database client
│   └── utils.ts           # Utility functions
└── types/                 # TypeScript type definitions
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical documentation
- [GUIDE.md](./GUIDE.md) - Beginner-friendly guide
- [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) - System design analysis
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run linter

npx prisma studio    # Open database GUI
npx prisma migrate dev  # Create/apply migrations
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy
5. Run migrations against production database

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
