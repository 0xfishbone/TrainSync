import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import { app } from "../server/app";
import { registerRoutes } from "../server/routes";

// Track initialization state
let initializationComplete = false;
let initializationError: Error | null = null;

// Declare initPromise first (will be initialized below)
let initPromise: Promise<void>;

// Add initialization middleware FIRST - wait for routes before processing any request
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!initializationComplete && !initializationError) {
    console.log("[Vercel] Waiting for initialization to complete...");
    await initPromise.catch(err => {
      initializationError = err;
    });
  }

  if (initializationError) {
    console.error("[Vercel] Initialization failed:", initializationError);
    return res.status(500).json({
      error: "Server initialization failed",
      message: initializationError.message,
    });
  }

  next();
});

// Initialize routes immediately using IIFE (avoids top-level await)
initPromise = (async () => {
  try {
    console.log("[Vercel] Starting route initialization...");

    // Register all API routes (we don't need the HTTP server return value)
    await registerRoutes(app);

    // Error handling middleware (added AFTER routes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error details server-side
      console.error(`[API Error] ${status}: ${message}`);
      if (process.env.NODE_ENV !== "production") {
        console.error(err.stack);
      }

      // Send safe error response (no stack trace in production)
      res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
      });
    });

    initializationComplete = true;
    console.log("[Vercel] Routes initialized successfully");
  } catch (error: any) {
    console.error("[Vercel] Failed to initialize routes:", error);
    initializationError = error;
    throw error;
  }
})();

// Export Express app directly - Vercel handles it as a serverless function
// The middleware above ensures initialization is complete before processing requests
export default app;
