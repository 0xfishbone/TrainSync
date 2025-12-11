# TrainSync

AI-Powered Training & Nutrition Tracker - Your adaptive training partner that learns from your performance and adjusts your program weekly.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://makersuite.google.com/app/apikey) (FREE)
- `SESSION_SECRET`: Random string for session encryption

### 3. Database Setup

```bash
# Push schema to database
npm run db:push
```

### 4. Run Development Server

```bash
# Terminal 1: Start backend + frontend
npm run dev
```

The app will be available at `http://localhost:5000`

## Features

### Core Features (MVP)
- ✅ **Personalized Program Generation** - AI creates your custom training program
- ✅ **Adaptive Programming** - Adjusts weekly based on actual performance
- ✅ **Workout Timer** - Smart timers with rest period accountability
- ✅ **Photo Meal Logging** - AI analyzes meals in <5 seconds (Gemini vision)
- ✅ **Momentum Score** - Glanceable 0-100 score showing weekly performance
- ✅ **Weekly Reviews** - AI-generated insights and program adjustments

### Technologies
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Gemini 2.0 Flash (FREE tier)
- **PWA**: Service worker, offline support, notifications

## Project Structure

```
TrainSync/
├── client/               # Frontend React app
│   ├── src/
│   │   ├── components/  # UI components (shadcn/ui)
│   │   ├── pages/       # Route pages
│   │   ├── lib/         # Utilities, queryClient
│   │   └── hooks/       # Custom React hooks
│   └── public/          # Static assets
├── server/              # Backend API
│   ├── app.ts          # Express setup
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Data layer
│   └── gemini/         # AI integration
├── shared/             # Shared types & schemas
│   └── schema.ts       # Database schema
├── migrations/         # Database migrations
└── package.json
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server (backend + frontend)
npm run dev:client       # Start frontend only (Vite)

# Database
npm run db:push          # Push schema changes to database
npm run check            # TypeScript type checking

# Production
npm run build            # Build for production
npm run start            # Start production server
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Programs
- `GET /api/programs/current` - Get current week program
- `POST /api/programs/generate` - Generate new program (onboarding)
- `PATCH /api/programs/:id` - Update program

### Workouts
- `POST /api/workouts` - Log workout session
- `GET /api/workouts/:id` - Get workout details
- `GET /api/workouts/history` - Get workout history

### Nutrition
- `POST /api/meals` - Log meal
- `POST /api/meals/analyze` - Analyze meal photo (Gemini)
- `GET /api/nutrition/daily` - Get today's nutrition summary

### Reviews
- `GET /api/reviews/weekly` - Get weekly review
- `POST /api/reviews/generate` - Generate weekly review (Gemini)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) | Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `SESSION_SECRET` | Session encryption key | Yes | - |
| `CRON_SECRET` | Cron endpoint authentication | Yes (prod) | - |
| `FRONTEND_URL` | Frontend URL for CORS | No | * (allow all) |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |

**Generate secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment to Vercel

### Prerequisites
1. Create a [Neon PostgreSQL](https://neon.tech) database (free tier available)
2. Get a [Gemini API key](https://makersuite.google.com/app/apikey) (free tier available)
3. Generate secrets for SESSION_SECRET and CRON_SECRET

### Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Import Project"
   - Select your TrainSync repository
   - Click "Import"

3. **Configure Environment Variables**

   In Vercel Dashboard → Settings → Environment Variables, add:

   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/trainsync?sslmode=require
   GEMINI_API_KEY=your-gemini-api-key
   SESSION_SECRET=generated-secret-1
   CRON_SECRET=generated-secret-2
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app  (optional)
   ```

4. **Deploy Database Schema**

   After first deployment, push schema to your database:
   ```bash
   # Make sure DATABASE_URL in .env points to production database
   npm run db:push
   ```

5. **Configure Vercel Cron (Optional)**

   The app includes a weekly Saturday cron job (7am) for:
   - Weigh-in reminders
   - Weekly performance reviews

   In Vercel Dashboard → Settings → Cron Jobs:
   - Verify `/api/cron/saturday-tasks` is scheduled
   - Add `CRON_SECRET` as Authorization header: `Bearer <your-cron-secret>`

### Vercel Configuration

The project includes `vercel.json` with:
- Build configuration for serverless deployment
- API route rewrites
- CORS headers for API endpoints
- Cron job schedules (Hobby tier: 1 job/day max)

### Architecture Notes

**Serverless-Ready:**
- PostgreSQL session store (not in-memory)
- Stateless API endpoints
- Cron jobs via Vercel Cron API (not node-cron)
- Neon serverless PostgreSQL with connection pooling

## Contributing

This is a personal project. If you'd like to contribute or report issues, please open an issue on GitHub.

## License

MIT
