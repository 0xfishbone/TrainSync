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
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `SESSION_SECRET` | Session encryption key | Yes | - |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |

## Contributing

This is a personal project. If you'd like to contribute or report issues, please open an issue on GitHub.

## License

MIT
