# Reddit Marketing Post for GymTracker

## Title Option 1 (r/fitness, r/bodybuilding)
**I built a free, open-source workout tracker that doesn't suck [No ads, No subscriptions]**

## Title Option 2 (r/fitness, r/GYM)
**Tired of overpriced workout apps? I made a completely free alternative**

## Title Option 3 (r/webdev, r/SideProject)
**Built a full-stack fitness tracker with Next.js, PostgreSQL, and AI tips**

---

## Post Body

Hey everyone!

After getting frustrated with expensive workout apps loaded with features I never use (seriously, who needs a social network in their gym app?), I built **GymTracker** - a minimalist, powerful workout tracker that's **100% free and open source**.

### What makes it different?

**🎯 Actually Free**
- No subscriptions, no freemium BS
- No ads or data selling
- Self-host it or use the free hosted version
- Full source code available

**💪 Both Weights & Cardio**
- Track traditional lifting (weight, sets, reps, rest time)
- Track cardio workouts (duration-based)
- One app for your entire routine

**🔄 Workout Cycles**
- Create rotating programs (Push/Pull/Legs, Upper/Lower, etc.)
- The app automatically rotates through your workouts
- Perfect for structured training programs

**🤖 AI Form Tips**
- Get exercise-specific tips powered by Google Gemini
- Like having a PT in your pocket
- Regenerate tips if you want different advice

**📊 Clean Analytics**
- Track completion rate, total volume
- Weight progression charts
- No confusing metrics you don't care about

**⏱️ Built-in Rest Timer**
- Auto-starts after each set
- Pause, skip, or let it count down
- Stay focused, not fumbling with phone timers

**📅 Smart Scheduling**
- Schedule by specific days (Mon/Wed/Fri)
- Or by intervals (every 2 days)
- Calendar view shows your plan at a glance

**📱 Mobile-First**
- Designed for the gym floor
- Big buttons, clear text
- Works great on phones (obviously)

### Tech Stack (for the devs)

Built with modern tools:
- **Next.js 16** (App Router)
- **TypeScript** for type safety
- **PostgreSQL** + Prisma ORM
- **Tailwind CSS** for styling
- **Google Gemini API** for AI tips
- **Deployed on Vercel** (free tier)

### Try it / Deploy it

**Hosted version**: [your-vercel-url].vercel.app

**Self-host**:
```bash
git clone https://github.com/yourusername/gymtracker
npm install
# Set up .env with DATABASE_URL and AUTH_SECRET
npx prisma migrate dev
npm run dev
```

Full deployment guide included for Vercel + Neon (both free tiers).

### Why I built this

I just wanted something simple:
- Add my workouts
- See when I should do them
- Track my progress
- Not pay $10/month for the privilege

Couldn't find it, so I built it. Figured others might want it too.

### What's next?

Planning to add:
- Exercise library with form videos
- Workout templates
- Data export
- Progress photos (maybe)

But keeping it simple is the goal. No bloat.

---

**Links:**
- Live Demo: [your-url]
- GitHub: [your-repo]
- Docs: [link to README]

Happy to answer questions! Also open to feature requests, but fair warning: I'm biased toward simplicity.

---

## Suggested Subreddits

| Subreddit | Best Title | Notes |
|-----------|-----------|-------|
| r/fitness | Option 1 or 2 | Focus on free/no-ads angle |
| r/bodybuilding | Option 1 | Emphasize progress tracking |
| r/GYM | Option 2 | Casual tone works best |
| r/homegym | Option 1 | Self-hosting angle resonates |
| r/SideProject | Option 3 | Tech-focused, show the stack |
| r/webdev | Option 3 | Highlight Next.js/modern stack |
| r/selfhosted | "Built a self-hostable workout tracker..." | Emphasize privacy/control |
| r/reactjs | "Built a full-stack Next.js app..." | Focus on React/Next.js |

## Tips for Posting

1. **Include screenshots** if posting to fitness subreddits
2. **Be humble** - "I built this for myself, thought I'd share"
3. **Respond to comments quickly** in first hour
4. **Don't spam** - max 2-3 subreddits per day
5. **Follow subreddit rules** - some require [Project] tags
6. **Time it right** - Post 9-11 AM EST or 6-8 PM EST for best visibility

## Follow-up Comments Template

When people ask "What's different from [App X]?":

> Good question! Main differences:
> - Completely free (no premium tier)
> - No social features (just tracking)
> - Supports both weights AND cardio
> - Open source (you own your data)
> - Much simpler UI (by design)
>
> I'm not trying to compete with [App X] - they're great if you need all those features. This is for people who want something minimal.

When people ask about monetization:

> Not monetizing it. Built it for myself, hosting costs ~$0 on free tiers (Vercel + Neon). If it grows beyond free tiers, I might add optional donations, but the code will always be free to self-host.

When people report bugs:

> Thanks for catching that! Mind opening an issue on GitHub? [link]
> Or if you're comfortable, the bug fix is probably pretty simple - PRs welcome!
