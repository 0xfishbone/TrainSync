import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import { app } from "../server/app";
import { registerRoutes } from "../server/routes";

// Initialize routes - this needs to happen before the first request
let routesInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (routesInitialized) return;

  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    try {
      // Register all API routes (we don't need the HTTP server return value)
      await registerRoutes(app);

      // Error handling middleware
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

      routesInitialized = true;
      console.log("[Vercel Serverless] Routes initialized successfully");
    } catch (error) {
      console.error("[Vercel Serverless] Failed to initialize routes:", error);
      throw error;
    }
  })();

  await initializationPromise;
}

// Wrap the Express app to ensure initialization before handling requests
async function handler(req: Request, res: Response) {
  await ensureInitialized();
  return app(req, res);
}

// Export as Vercel serverless function
// Note: Do NOT call server.listen() - Vercel handles the server lifecycle
export default handler;
