import "dotenv/config";
import { app } from "../server/app";
import { registerRoutes } from "../server/routes";
import { type Request, Response, NextFunction } from "express";

// Register all API routes
await registerRoutes(app);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error details server-side
  console.error(`Error ${status}: ${message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Send safe error response (no stack trace in production)
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// Export Express app as Vercel serverless function
// Note: Do NOT call server.listen() - Vercel handles the server lifecycle
export default app;
