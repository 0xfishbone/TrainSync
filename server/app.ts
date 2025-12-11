import { type Server } from "node:http";

import express, { type Express, type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import { registerRoutes } from "./routes";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";

// Augment express-session with custom SessionData
declare module "express-session" {
  interface SessionData {
    userId: string; // UUID string
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Validate required environment variables
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

export const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || true
    : true,
  credentials: true,
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Configure session middleware with PostgreSQL store for serverless
const PgSession = connectPgSimple(session);
const sessionStore = process.env.NODE_ENV === "production"
  ? new PgSession({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      tableName: "user_sessions",
      createTableIfMissing: true,
    })
  : undefined; // Use MemoryStore for development

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error details server-side
    log(`Error ${status}: ${message}`, "error");
    if (process.env.NODE_ENV !== "production") {
      console.error(err.stack);
    }

    // Send safe error response (no stack trace in production)
    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);

    // Note: Cron jobs moved to Vercel Cron API endpoints
    // See vercel.json for cron schedules and server/routes.ts for endpoints:
    // - GET /api/cron/saturday-tasks (Saturday 7am) - Weigh-in + Weekly Review
  });
}
