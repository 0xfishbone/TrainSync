import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { databaseStorage as storage } from "./database-storage";
import bcrypt from "bcryptjs";
import {
  insertUserSchema,
  insertUserProfileSchema,
  insertProgramTemplateSchema,
  insertCurrentWeekProgramSchema,
  insertWorkoutSessionSchema,
  insertExerciseCompletedSchema,
  insertMealLogSchema,
  insertWeightEntrySchema,
} from "@shared/schema";
import { requireAuth, type AuthRequest } from "./middleware/auth";

// ============================================================================
// Route Handlers
// ============================================================================

export async function registerRoutes(app: Express, options?: { serverless?: boolean }): Promise<Server | void> {

  // ==========================================================================
  // AUTH ROUTES
  // ==========================================================================

  // Register new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);

      // Validate password length
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });

      // Create session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Create session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        username: user.username,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Check authentication status
  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({
      authenticated: true,
      userId: req.session.userId,
    });
  });

  // ==========================================================================
  // USER PROFILE ROUTES
  // ==========================================================================

  // Get user profile
  app.get("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create user profile (onboarding)
  app.post("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profileData = insertUserProfileSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const profile = await storage.createUserProfile(profileData);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update user profile
  app.patch("/api/profile", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.updateUserProfile(req.user!.id, req.body);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==========================================================================
  // PROGRAM ROUTES
  // ==========================================================================

  // Get current week program
  app.get("/api/programs/current", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const program = await storage.getCurrentWeekProgram(req.user!.id);
      if (!program) {
        return res.status(404).json({ error: "No current program found" });
      }
      res.json(program);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate new program (calls Gemini AI)
  app.post("/api/programs/generate", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found. Complete onboarding first." });
      }

      // Import Gemini client
      const { generateProgram } = await import("./gemini/client");

      // Generate program using Gemini AI
      const programData = await generateProgram({
        name: profile.name,
        age: profile.age,
        currentWeight: profile.currentWeight,
        targetWeightMin: profile.targetWeightMin || undefined,
        targetWeightMax: profile.targetWeightMax || undefined,
        primaryGoal: profile.primaryGoal,
        secondaryGoal: profile.secondaryGoal || undefined,
        sportFocus: profile.sportFocus || undefined,
        trainingDaysPerWeek: profile.trainingDaysPerWeek,
        availableDays: profile.availableDays,
        sessionDuration: profile.sessionDuration,
        equipmentAvailable: profile.equipmentAvailable,
        injuries: profile.injuries || undefined,
        exercisesToAvoid: profile.exercisesToAvoid || undefined,
        dailyCaloriesTarget: profile.dailyCaloriesTarget,
        dailyProteinTarget: profile.dailyProteinTarget,
        weeklyWeightChangeTarget: profile.weeklyWeightChangeTarget,
      });

      // Save program template
      const template = await storage.createProgramTemplate({
        userId: req.user!.id,
        profileId: profile.id,
        programName: programData.programName,
        createdBy: "ai",
        version: 1,
        weeklyStructure: programData.weeklyStructure,
        progressionStrategy: programData.progressionStrategy,
        deloadStrategy: programData.deloadStrategy,
        notes: programData.weeklyFocus,
      });

      // Create first week program
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekProgram = await storage.createWeekProgram({
        userId: req.user!.id,
        templateId: template.id,
        weekNumber: 1,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        previousWeekId: undefined,
        workouts: programData.weeklyStructure,
        aiAdjustments: null,
        weeklyFocus: programData.weeklyFocus,
        nutritionGuidance: programData.nutritionGuidance,
      });

      res.json({ template, weekProgram });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create program template
  app.post("/api/programs/template", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const templateData = insertProgramTemplateSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const template = await storage.createProgramTemplate(templateData);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create week program
  app.post("/api/programs/week", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const programData = insertCurrentWeekProgramSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const program = await storage.createWeekProgram(programData);
      res.json(program);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get program history
  app.get("/api/programs/history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const programs = await storage.getWeekProgramsByUser(req.user!.id, limit);
      res.json(programs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // WORKOUT ROUTES
  // ==========================================================================

  // Get workout session
  app.get("/api/workouts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const session = await storage.getWorkoutSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }

      // Check ownership
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create workout session
  app.post("/api/workouts", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const sessionData = insertWorkoutSessionSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const session = await storage.createWorkoutSession(sessionData);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update workout session
  app.patch("/api/workouts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const session = await storage.getWorkoutSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }

      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updated = await storage.updateWorkoutSession(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get workout history
  app.get("/api/workouts", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const sessions = await storage.getWorkoutSessionsByUser(req.user!.id, limit);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get today's completed exercises
  app.get("/api/workouts/today", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day

      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999); // End of day

      // Get all workout sessions for today
      const allSessions = await storage.getWorkoutSessionsByUser(req.user!.id, 100);
      const todaysSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.workoutDate);
        return sessionDate >= today && sessionDate <= endOfDay;
      });

      // Get all exercise completions for today's sessions
      const completedExercises: Array<{
        exerciseName: string;
        completedAt: Date;
        feeling: string | null;
        sets: number | null;
        weight: number | null;
      }> = [];

      for (const session of todaysSessions) {
        const exercises = await storage.getExercisesByWorkout(session.id);
        for (const exercise of exercises) {
          completedExercises.push({
            exerciseName: exercise.exerciseName,
            completedAt: exercise.completedAt || session.workoutDate,
            feeling: exercise.feeling,
            sets: exercise.sets,
            weight: exercise.weight,
          });
        }
      }

      res.json({
        completed: completedExercises,
        totalCompleted: completedExercises.length,
      });
    } catch (error: any) {
      console.error("Error fetching today's workouts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create workout session (simplified endpoint for workout.tsx)
  app.post("/api/workouts/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { date, sessionName, completed, duration, totalVolume } = req.body;

      // Get current week program for weekProgramId
      const currentProgram = await storage.getCurrentWeekProgram(req.user!.id);
      if (!currentProgram) {
        return res.status(404).json({ error: "No current program found" });
      }

      // Create workout session with schema-compliant data
      const sessionData = {
        userId: req.user!.id,
        weekProgramId: currentProgram.id,
        workoutDate: new Date(date),
        workoutType: "strength", // Default, can be enhanced later
        sessionName: sessionName || "Workout",
        status: completed ? "completed" : "in_progress",
        durationMinutes: duration || 0,
        exercises: [], // Will be populated by exercise endpoint
        notes: null,
        aiSummary: null,
        completedAt: completed ? new Date() : null,
      };

      const session = await storage.createWorkoutSession(sessionData);
      res.json(session);
    } catch (error: any) {
      console.error("Error creating workout session:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Save individual exercise completion
  app.post("/api/workouts/exercises", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { sessionId, exerciseName, setsCompleted, avgWeight, difficulty } = req.body;

      // Verify session exists and belongs to user
      const session = await storage.getWorkoutSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Workout session not found" });
      }
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Create exercise completion record
      const exerciseData = {
        workoutSessionId: sessionId,
        exerciseName,
        exerciseType: "reps", // Default
        sets: setsCompleted,
        reps: null,
        weight: avgWeight || null,
        rounds: null,
        workTime: null,
        restTime: null,
        targetRestTime: null,
        actualRestTime: null,
        extraRestTime: null,
        feeling: difficulty?.toLowerCase() || null,
        notes: null,
      };

      const exercise = await storage.createExerciseCompleted(exerciseData);
      res.json(exercise);
    } catch (error: any) {
      console.error("Error creating exercise completion:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ==========================================================================
  // MEAL & NUTRITION ROUTES
  // ==========================================================================

  // Analyze meal photo (Gemini AI)
  app.post("/api/meals/analyze", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { imageBase64, mimeType, mealText } = req.body;

      const { analyzeMealPhoto, analyzeMealText } = await import("./gemini/client");

      let analysisResult;

      if (imageBase64 && mimeType) {
        // Photo analysis
        analysisResult = await analyzeMealPhoto({ imageBase64, mimeType });
      } else if (mealText) {
        // Text/voice analysis
        analysisResult = await analyzeMealText(mealText);
      } else {
        return res.status(400).json({ error: "Provide either imageBase64 or mealText" });
      }

      res.json(analysisResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create meal log
  app.post("/api/meals", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const mealData = insertMealLogSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const meal = await storage.createMealLog(mealData);

      // Update daily nutrition
      const today = new Date();
      let dailyNutrition = await storage.getDailyNutrition(req.user!.id, today);

      if (!dailyNutrition) {
        // Get profile for targets
        const profile = await storage.getUserProfile(req.user!.id);
        if (!profile) {
          return res.status(404).json({ error: "Profile not found" });
        }

        dailyNutrition = await storage.createDailyNutrition({
          userId: req.user!.id,
          date: today,
          caloriesTarget: profile.dailyCaloriesTarget,
          proteinTarget: profile.dailyProteinTarget,
          caloriesActual: meal.finalCalories || meal.calories,
          proteinActual: meal.finalProtein || meal.protein,
          mealsCount: 1,
          hitTarget: false,
          trainingDay: false,
        });
      } else {
        // Update existing
        const updatedCalories = dailyNutrition.caloriesActual + (meal.finalCalories || meal.calories);
        const updatedProtein = dailyNutrition.proteinActual + (meal.finalProtein || meal.protein);

        dailyNutrition = (await storage.updateDailyNutrition(dailyNutrition.id, {
          caloriesActual: updatedCalories,
          proteinActual: updatedProtein,
          mealsCount: dailyNutrition.mealsCount + 1,
          hitTarget: updatedCalories >= dailyNutrition.caloriesTarget * 0.95,
        }))!;
      }

      res.json({ meal, dailyNutrition });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get today's nutrition summary
  app.get("/api/nutrition/today", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const today = new Date();
      const nutrition = await storage.getDailyNutrition(req.user!.id, today);
      const meals = await storage.getMealLogsByDate(req.user!.id, today);

      if (!nutrition) {
        // Get profile for targets
        const profile = await storage.getUserProfile(req.user!.id);
        if (!profile) {
          return res.status(404).json({ error: "Profile not found" });
        }

        return res.json({
          caloriesTarget: profile.dailyCaloriesTarget,
          proteinTarget: profile.dailyProteinTarget,
          caloriesActual: 0,
          proteinActual: 0,
          mealsCount: 0,
          meals: [],
        });
      }

      res.json({ ...nutrition, meals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get meal history
  app.get("/api/meals", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const meals = await storage.getMealLogsByUser(req.user!.id, limit);
      res.json(meals);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // WEIGHT TRACKING ROUTES
  // ==========================================================================

  // Get weight history
  app.get("/api/weight", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const entries = await storage.getWeightEntries(req.user!.id, limit);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get latest weight
  app.get("/api/weight/latest", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const entry = await storage.getLatestWeight(req.user!.id);
      if (!entry) {
        return res.status(404).json({ error: "No weight entries found" });
      }
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Log weight
  app.post("/api/weight", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const entryData = insertWeightEntrySchema.parse({
        ...req.body,
        userId: req.user!.id,
        date: new Date(req.body.date || Date.now()),
      });

      const entry = await storage.createWeightEntry(entryData);

      // Update user profile current weight
      await storage.updateUserProfile(req.user!.id, {
        currentWeight: entry.weight,
      });

      res.json(entry);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ==========================================================================
  // WEEKLY PERFORMANCE & REVIEW ROUTES
  // ==========================================================================

  // Get weekly performance
  app.get("/api/performance/weekly", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const weekStartDate = req.query.date
        ? new Date(req.query.date as string)
        : new Date(); // Default to current week

      const performance = await storage.getWeeklyPerformance(req.user!.id, weekStartDate);
      if (!performance) {
        return res.status(404).json({ error: "No performance data for this week" });
      }

      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get performance history
  app.get("/api/performance/history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const history = await storage.getWeeklyPerformanceHistory(req.user!.id, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get weekly review
  app.get("/api/reviews/weekly", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const weekStartDate = req.query.date
        ? new Date(req.query.date as string)
        : new Date();

      const review = await storage.getWeeklyReview(req.user!.id, weekStartDate);
      if (!review) {
        return res.status(404).json({ error: "No review found for this week" });
      }

      res.json(review);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate weekly review (Gemini AI)
  app.post("/api/reviews/generate", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Get or create weekly performance data
      const { weekStartDate } = req.body;
      const weekStart = weekStartDate ? new Date(weekStartDate) : new Date();

      const performance = await storage.getWeeklyPerformance(req.user!.id, weekStart);
      if (!performance) {
        return res.status(404).json({ error: "No performance data for this week. Complete some workouts first." });
      }

      const { generateWeeklyReview } = await import("./gemini/client");

      const reviewData = await generateWeeklyReview({
        userContext: {
          age: profile.age,
          currentWeight: profile.currentWeight,
          goals: `${profile.primaryGoal}${profile.secondaryGoal ? `, ${profile.secondaryGoal}` : ""}`,
        },
        weekData: {
          workoutsPlanned: performance.workoutsPlanned,
          workoutsCompleted: performance.workoutsCompleted,
          nutritionDaysHitTarget: performance.nutritionDaysHitTarget,
          weightStart: performance.weightStart || profile.currentWeight,
          weightEnd: performance.weightEnd || profile.currentWeight,
          weightChangeTarget: profile.weeklyWeightChangeTarget,
          avgExtraRest: performance.avgExtraRest || 0,
          patterns: (performance.momentumBreakdown || []) as any[],
        },
      });

      // Save review
      const review = await storage.createWeeklyReview({
        userId: req.user!.id,
        weekPerformanceId: performance.id,
        weekStartDate: performance.weekStartDate,
        weekEndDate: performance.weekEndDate,
        weightSummary: reviewData.weightSummary,
        workoutSummary: reviewData.workoutSummary,
        nutritionSummary: reviewData.nutritionSummary,
        patternsDetected: reviewData.patternsDetected,
        recommendations: reviewData.recommendations,
        aiSummaryText: reviewData.aiSummaryText,
        aiModelUsed: "gemini-2.0-flash-exp",
        tone: reviewData.tone,
        confidence: 0.8,
      });

      res.json(review);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get review history
  app.get("/api/reviews/history", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const history = await storage.getWeeklyReviewHistory(req.user!.id, limit);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // WEEKLY ADJUSTMENTS
  // ==========================================================================

  // Generate weekly program adjustments (Gemini AI)
  app.post("/api/programs/adjustments/generate", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Get current week program
      const currentProgram = await storage.getCurrentWeekProgram(req.user!.id);
      if (!currentProgram) {
        return res.status(404).json({ error: "No current program found" });
      }

      // Get weekly performance
      const performance = await storage.getWeeklyPerformance(req.user!.id, currentProgram.weekStartDate);
      if (!performance) {
        return res.status(404).json({ error: "No performance data for this week. Complete some workouts first." });
      }

      // Get recent weight entries
      const weightEntries = await storage.getWeightEntries(req.user!.id, 7);
      const weekStartWeight = weightEntries[weightEntries.length - 1]?.weight || profile.currentWeight;
      const currentWeight = weightEntries[0]?.weight || profile.currentWeight;
      const weightChange = currentWeight - weekStartWeight;

      // Prepare performance data
      const previousWeekPerformance = {
        workoutsCompleted: performance.workoutsCompleted,
        workoutsPlanned: performance.workoutsPlanned,
        nutritionDaysHitTarget: performance.nutritionDaysHitTarget,
        weightChange,
        weightChangeTarget: profile.weeklyWeightChangeTarget,
        avgExtraRest: performance.avgExtraRest || 0,
        exerciseFeelings: performance.momentumBreakdown || [],
      };

      const userContext = {
        age: profile.age,
        currentWeight: profile.currentWeight,
        goals: `${profile.primaryGoal}${profile.secondaryGoal ? `, ${profile.secondaryGoal}` : ""}`,
      };

      const { generateProgramAdjustments } = await import("./gemini/client");

      const adjustments = await generateProgramAdjustments(
        userContext,
        previousWeekPerformance,
        currentProgram.workouts
      );

      res.json({
        adjustments: adjustments.adjustments || {},
        weeklyFocus: adjustments.weeklyFocus || "Continue building strength and consistency",
        nutritionGuidance: adjustments.nutritionGuidance || "Stay on track with your nutrition targets",
        restReminder: adjustments.restReminder || null,
        currentWeekNumber: currentProgram.weekNumber,
      });
    } catch (error: any) {
      console.error("Error generating adjustments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Apply weekly adjustments to create next week's program
  app.post("/api/programs/adjustments/apply", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { adjustments } = req.body;

      // Get current week program
      const currentProgram = await storage.getCurrentWeekProgram(req.user!.id);
      if (!currentProgram) {
        return res.status(404).json({ error: "No current program found" });
      }

      // Clone current workouts structure
      const nextWeekWorkouts = JSON.parse(JSON.stringify(currentProgram.workouts));

      // Apply adjustments to each day's exercises
      for (const [day, workout] of Object.entries(nextWeekWorkouts)) {
        const dayWorkout = workout as any;
        if (dayWorkout.exercises) {
          for (let i = 0; i < dayWorkout.exercises.length; i++) {
            const exercise = dayWorkout.exercises[i];
            const adjustment = adjustments[exercise.name];

            if (adjustment) {
              // Apply the adjustment based on action type
              switch (adjustment.action) {
                case "increase_weight":
                  if (exercise.weight) {
                    exercise.weight = parseFloat(adjustment.to);
                  }
                  break;
                case "decrease_weight":
                  if (exercise.weight) {
                    exercise.weight = parseFloat(adjustment.to);
                  }
                  break;
                case "increase_volume":
                  if (exercise.sets) {
                    exercise.sets = parseInt(adjustment.to);
                  } else if (exercise.rounds) {
                    exercise.rounds = parseInt(adjustment.to);
                  }
                  break;
                case "decrease_volume":
                  if (exercise.sets) {
                    exercise.sets = parseInt(adjustment.to);
                  } else if (exercise.rounds) {
                    exercise.rounds = parseInt(adjustment.to);
                  }
                  break;
                case "maintain":
                  // No changes needed
                  break;
              }
            }
          }
        }
      }

      // Create next week's program
      const nextWeekStart = new Date(currentProgram.weekEndDate);
      nextWeekStart.setDate(nextWeekStart.getDate() + 1); // Day after current week ends
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

      const nextWeekProgram = await storage.createWeekProgram({
        userId: req.user!.id,
        templateId: currentProgram.templateId,
        weekNumber: currentProgram.weekNumber + 1,
        weekStartDate: nextWeekStart,
        weekEndDate: nextWeekEnd,
        previousWeekId: currentProgram.id,
        workouts: nextWeekWorkouts,
        aiAdjustments: JSON.stringify(adjustments),
        weeklyFocus: req.body.weeklyFocus || "Continue making progress",
        nutritionGuidance: req.body.nutritionGuidance || currentProgram.nutritionGuidance,
      });

      res.json(nextWeekProgram);
    } catch (error: any) {
      console.error("Error applying adjustments:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ==========================================================================
  // GOAL TRACKING & ADJUSTMENTS
  // ==========================================================================

  // Get goal progress
  app.get("/api/goal/progress", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const { calculateGoalProgress, calculateActualWeeklyRate } = await import("@shared/utils/goalTracking");

      // Get weight entries
      const weightEntries = await storage.getWeightEntries(req.user!.id, 30);
      const mappedEntries = weightEntries.map(w => ({ weight: w.weight, date: new Date(w.date) }));

      const actualWeeklyRate = calculateActualWeeklyRate(mappedEntries);

      const progress = calculateGoalProgress({
        goalStartWeight: profile.goalStartWeight || profile.currentWeight,
        goalStartDate: profile.goalStartDate ? new Date(profile.goalStartDate) : new Date(),
        currentWeight: profile.currentWeight,
        targetWeightMin: profile.targetWeightMin || profile.currentWeight,
        targetWeightMax: profile.targetWeightMax || profile.currentWeight,
        goalWeeklyRate: profile.goalWeeklyRate || profile.weeklyWeightChangeTarget,
        actualWeeklyRate,
        primaryGoal: profile.primaryGoal as any,
      });

      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get detected patterns
  app.get("/api/patterns", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 12;
      const history = await storage.getWeeklyPerformanceHistory(req.user!.id, limit);

      const { detectPatterns, prioritizeInterventions } = await import("@shared/utils/patternDetection");

      const mappedHistory = history.map(w => ({
        weekStartDate: new Date(w.weekStartDate),
        weekType: (w.weekType || "good") as any,
        momentumScore: w.momentumScore,
        workoutCompletionRate: w.workoutCompletionRate,
        nutritionConsistencyRate: w.nutritionConsistencyRate,
        weightChange: w.weightChange,
        weightChangeTarget: w.weightChangeTarget || 0,
        isBadWeek: w.isBadWeek || false,
        isRecoveryWeek: w.isRecoveryWeek || false,
      }));

      const patterns = detectPatterns(mappedHistory);
      const interventions = prioritizeInterventions(patterns);

      res.json({ patterns, interventions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get pending goal adjustment
  app.get("/api/goal/adjustment/pending", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const pending = await storage.getPendingGoalAdjustment(req.user!.id);
      if (!pending) {
        return res.status(404).json({ error: "No pending goal adjustment" });
      }
      res.json(pending);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Respond to goal adjustment
  app.post("/api/goal/adjustment/:id/respond", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { response, notes, modifiedGoal } = req.body; // response: "accepted" | "declined" | "modified"

      const adjustment = await storage.getGoalAdjustment(req.params.id);
      if (!adjustment || adjustment.userId !== req.user!.id) {
        return res.status(404).json({ error: "Adjustment not found" });
      }

      // Update adjustment
      const updated = await storage.updateGoalAdjustment(req.params.id, {
        userResponse: response,
        userNotes: notes,
      });

      // If accepted or modified, update user profile goal
      if (response === "accepted" || response === "modified") {
        const newGoal = response === "modified" ? modifiedGoal : adjustment.newGoal;

        await storage.updateUserProfile(req.user!.id, {
          targetWeightMin: newGoal.targetMin,
          targetWeightMax: newGoal.targetMax,
          goalWeeklyRate: newGoal.weeklyRate,
          goalStartDate: new Date(), // Reset goal start date
          goalStartWeight: (await storage.getUserProfile(req.user!.id))?.currentWeight,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update bad week context
  app.patch("/api/performance/:id/context", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { reasons, notes } = req.body;

      // Verify ownership
      const performance = await storage.getWeeklyPerformanceHistory(req.user!.id, 100);
      const target = performance.find(p => p.id === req.params.id);

      if (!target) {
        return res.status(404).json({ error: "Performance record not found" });
      }

      // Update bad week context
      const updated = await storage.updateWeeklyPerformance(req.params.id, {
        badWeekReasons: reasons || [],
        userNotes: notes || null,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Check Saturday weigh-in requirement
  app.get("/api/weighin/required", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { checkWeighInRequired } = await import("./jobs/saturday-weighin");
      const result = await checkWeighInRequired(req.user!.id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // MOMENTUM SCORE
  // ==========================================================================

  // Calculate current momentum score
  app.get("/api/momentum", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Import momentum calculator
      const { calculateMomentumScore, getMomentumTier, calculateStreak, getRecommendedAction } = await import("@shared/utils/momentum");

      // Get last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get workout sessions from last 7 days
      const workoutSessions = await storage.getWorkoutSessionsByUser(req.user!.id, 100);
      const recentWorkouts = workoutSessions.filter(
        w => new Date(w.workoutDate) >= sevenDaysAgo && w.completedAt !== null
      );

      // Get meal logs from last 7 days
      const mealLogs = await storage.getMealLogsByUser(req.user!.id, 100);
      const recentMeals = mealLogs.filter(m => new Date(m.mealDate) >= sevenDaysAgo);

      // Get recent weight entries
      const weightEntries = await storage.getWeightEntries(req.user!.id, 7);
      const weekStartWeight = weightEntries[weightEntries.length - 1]?.weight || profile.currentWeight;
      const currentWeight = weightEntries[0]?.weight || profile.currentWeight;
      const actualWeightChange = currentWeight - weekStartWeight;

      // Calculate average calorie deviation
      let totalDeviation = 0;
      let deviationCount = 0;

      for (const meal of recentMeals) {
        const caloriesEaten = meal.finalCalories || meal.calories;
        const deviation = Math.abs(caloriesEaten - profile.dailyCaloriesTarget / 3) / (profile.dailyCaloriesTarget / 3);
        totalDeviation += deviation;
        deviationCount++;
      }

      const avgCalorieDeviation = deviationCount > 0 ? totalDeviation / deviationCount : 0;

      // Calculate streak
      const activityDates = [
        ...recentWorkouts.map(w => new Date(w.workoutDate)),
        ...recentMeals.map(m => new Date(m.mealDate)),
      ];
      const streak = calculateStreak(activityDates);

      // Get scheduled workouts count from current program
      const currentProgram = await storage.getCurrentWeekProgram(req.user!.id);
      const scheduledWorkouts = currentProgram
        ? Object.keys(currentProgram.workouts || {}).length
        : profile.trainingDaysPerWeek;

      // Calculate momentum score
      const score = calculateMomentumScore({
        workoutsCompleted: recentWorkouts.length,
        workoutsScheduled: scheduledWorkouts,
        mealsLogged: recentMeals.length,
        targetMealsPerDay: 3, // Default 3 meals per day
        weeklyWeightChange: actualWeightChange,
        targetWeightChange: profile.weeklyWeightChangeTarget,
        averageCalorieDeviation: Math.min(avgCalorieDeviation, 1),
        currentStreak: streak,
      });

      const tier = getMomentumTier(score);
      const recommendedAction = getRecommendedAction({
        workoutsCompleted: recentWorkouts.length,
        workoutsScheduled: scheduledWorkouts,
        mealsLogged: recentMeals.length,
        targetMealsPerDay: 3,
        weeklyWeightChange: actualWeightChange,
        targetWeightChange: profile.weeklyWeightChangeTarget,
        averageCalorieDeviation: Math.min(avgCalorieDeviation, 1),
        currentStreak: streak,
      });

      res.json({
        score,
        tier: tier.tier,
        emoji: tier.emoji,
        message: tier.message,
        color: tier.color,
        streak,
        recommendedAction,
        breakdown: {
          workoutsCompleted: recentWorkouts.length,
          workoutsScheduled: scheduledWorkouts,
          mealsLogged: recentMeals.length,
          weeklyWeightChange: actualWeightChange,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================================================
  // VERCEL CRON JOBS
  // ==========================================================================

  // Combined Saturday tasks (weigh-in + weekly review)
  // Called by Vercel Cron every Saturday at 7am (see vercel.json)
  app.get("/api/cron/saturday-tasks", async (_req: Request, res: Response) => {
    try {
      // Verify cron secret for security
      const cronSecret = _req.headers.authorization?.replace("Bearer ", "");
      if (cronSecret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: "Unauthorized - Invalid cron secret" });
      }

      const results = {
        weighInProcessed: 0,
        weeklyReviewsGenerated: 0,
        errors: [] as string[],
      };

      // Get all user IDs
      const userIds = await storage.getAllUserIds();

      // Process weigh-in reminders for all users
      const { checkWeighInRequired } = await import("./jobs/saturday-weighin");
      for (const userId of userIds) {
        try {
          await checkWeighInRequired(userId);
          results.weighInProcessed++;
        } catch (error: any) {
          results.errors.push(`Weigh-in failed for ${userId}: ${error.message}`);
        }
      }

      // Process weekly reviews for all users
      const { generateWeeklyPerformance } = await import("./jobs/weekly-review");
      for (const userId of userIds) {
        try {
          await generateWeeklyPerformance(userId);
          results.weeklyReviewsGenerated++;
        } catch (error: any) {
          results.errors.push(`Weekly review failed for ${userId}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Only create HTTP server for traditional deployment, not serverless
  if (options?.serverless) {
    return; // Serverless doesn't need HTTP server creation
  }

  const httpServer = createServer(app);
  return httpServer;
}
