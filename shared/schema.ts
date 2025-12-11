import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// USERS & PROFILES
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: integer("age").notNull(),

  // Current state
  currentWeight: real("current_weight").notNull(), // kg - latest weigh-in

  // Goal tracking (NEW)
  goalStartWeight: real("goal_start_weight"), // kg - starting weight when goal began
  goalStartDate: timestamp("goal_start_date"), // when goal was set
  targetWeightMin: real("target_weight_min"), // kg - minimum target (renamed for clarity)
  targetWeightMax: real("target_weight_max"), // kg - maximum target
  goalWeeklyRate: real("goal_weekly_rate"), // kg per week - target pace
  actualWeeklyRate: real("actual_weekly_rate"), // kg per week - calculated from weigh-ins
  goalEstimatedCompletion: timestamp("goal_estimated_completion"), // calculated completion date

  // Program phase tracking (NEW)
  currentPhase: text("current_phase"), // "baseline" | "growth" | "strength" | "maintenance"
  phaseStartDate: timestamp("phase_start_date"),

  // Goal history (NEW)
  goalHistory: jsonb("goal_history"), // [{startDate, endDate, targetMin, targetMax, achieved, reason}]

  // Goals & Focus
  primaryGoal: text("primary_goal").notNull(), // "strength", "cardio", "weight_gain", "weight_loss"
  secondaryGoal: text("secondary_goal"),
  sportFocus: text("sport_focus"), // "boxing", "mma", "general"

  // Training schedule
  trainingDaysPerWeek: integer("training_days_per_week").notNull(),
  availableDays: jsonb("available_days").$type<string[]>().notNull(), // ["monday", "wednesday", ...]
  sessionDuration: integer("session_duration").notNull(), // minutes
  preferredTrainingTime: text("preferred_training_time"), // "morning", "afternoon", "evening"
  trainingLocation: text("training_location"), // "gym", "home", "outdoor"
  equipmentAvailable: jsonb("equipment_available").$type<string[]>().notNull(), // ["dumbbells", "barbell", ...]
  injuries: jsonb("injuries").$type<string[]>(), // ["knee", "shoulder", ...]
  exercisesToAvoid: jsonb("exercises_to_avoid").$type<string[]>(), // exercise names

  // Nutrition (aligned to goal)
  dailyCaloriesTarget: integer("daily_calories_target").notNull(),
  dailyProteinTarget: integer("daily_protein_target").notNull(),
  weeklyWeightChangeTarget: real("weekly_weight_change_target").notNull(), // kg, positive for gain, negative for loss

  // Preferences
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  hapticsEnabled: boolean("haptics_enabled").notNull().default(true),
  units: text("units").notNull().default("metric"), // "metric" or "imperial"

  // Meta
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// PROGRAMS & TEMPLATES
// ============================================================================

export const programTemplates = pgTable("program_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  programName: text("program_name").notNull(),
  createdBy: text("created_by").notNull(), // "ai" or "user"
  version: integer("version").notNull().default(1),
  weeklyStructure: jsonb("weekly_structure").notNull(), // Complete program structure
  progressionStrategy: text("progression_strategy"),
  deloadStrategy: text("deload_strategy"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  modifiedAt: timestamp("modified_at").notNull().defaultNow(),
});

export const currentWeekPrograms = pgTable("current_week_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => programTemplates.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  previousWeekId: varchar("previous_week_id"),
  workouts: jsonb("workouts").notNull(), // This week's workouts with exercises
  aiAdjustments: jsonb("ai_adjustments"), // Changes made by AI
  weeklyFocus: text("weekly_focus"),
  nutritionGuidance: text("nutrition_guidance"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// ============================================================================
// WORKOUT SESSIONS
// ============================================================================

export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekProgramId: varchar("week_program_id").notNull().references(() => currentWeekPrograms.id, { onDelete: "cascade" }),
  workoutDate: timestamp("workout_date").notNull(),
  workoutType: text("workout_type").notNull(), // "cardio", "strength", "conditioning"
  sessionName: text("session_name").notNull(),
  status: text("status").notNull().default("in_progress"), // "in_progress", "completed", "skipped"
  durationMinutes: integer("duration_minutes"),
  exercises: jsonb("exercises").notNull(), // Array of completed exercises with details
  notes: text("notes"),
  aiSummary: text("ai_summary"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const exercisesCompleted = pgTable("exercises_completed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workoutSessionId: varchar("workout_session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  exerciseType: text("exercise_type").notNull(), // "timed", "reps"
  sets: integer("sets"),
  reps: integer("reps"),
  weight: real("weight"), // kg
  rounds: integer("rounds"),
  workTime: integer("work_time"), // seconds
  restTime: integer("rest_time"), // seconds
  targetRestTime: integer("target_rest_time"), // seconds
  actualRestTime: integer("actual_rest_time"), // seconds
  extraRestTime: integer("extra_rest_time"), // seconds (actualRestTime - targetRestTime)
  feeling: text("feeling"), // "easy", "good", "hard"
  notes: text("notes"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

// ============================================================================
// NUTRITION & MEALS
// ============================================================================

export const mealLogs = pgTable("meal_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealDate: timestamp("meal_date").notNull(),
  mealType: text("meal_type").notNull(), // "breakfast", "lunch", "dinner", "snack"
  loggingMethod: text("logging_method").notNull(), // "photo", "voice", "text"
  photoStored: boolean("photo_stored").default(false),
  photoKey: text("photo_key"), // IndexedDB key or storage path
  foodsIdentified: jsonb("foods_identified").$type<string[]>(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(), // grams
  aiAnalysis: jsonb("ai_analysis"), // Full AI response
  aiModelUsed: text("ai_model_used"),
  confidenceScore: real("confidence_score"),
  manuallyAdjusted: boolean("manually_adjusted").default(false),
  finalCalories: integer("final_calories"),
  finalProtein: integer("final_protein"),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").notNull().defaultNow(),
});

export const dailyNutrition = pgTable("daily_nutrition", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  caloriesTarget: integer("calories_target").notNull(),
  proteinTarget: integer("protein_target").notNull(),
  caloriesActual: integer("calories_actual").notNull().default(0),
  proteinActual: integer("protein_actual").notNull().default(0),
  mealsCount: integer("meals_count").notNull().default(0),
  hitTarget: boolean("hit_target").default(false),
  trainingDay: boolean("training_day").default(false),
  remindersSent: integer("reminders_sent").default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// WEEKLY PERFORMANCE & REVIEWS
// ============================================================================

export const weeklyPerformance = pgTable("weekly_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  workoutsPlanned: integer("workouts_planned").notNull(),
  workoutsCompleted: integer("workouts_completed").notNull(),
  workoutCompletionRate: real("workout_completion_rate").notNull(), // 0.0 - 1.0
  missedDays: jsonb("missed_days").$type<string[]>(),
  nutritionDaysHitTarget: integer("nutrition_days_hit_target").notNull(),
  nutritionConsistencyRate: real("nutrition_consistency_rate").notNull(), // 0.0 - 1.0
  avgCalories: integer("avg_calories"),
  avgProtein: integer("avg_protein"),
  weightStart: real("weight_start"),
  weightEnd: real("weight_end"),
  weightChange: real("weight_change"),
  weightChangeTarget: real("weight_change_target"),
  weightStatus: text("weight_status"), // "on_track", "above_target", "below_target"
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  avgFeeling: real("avg_feeling"), // 0.0 - 1.0
  avgExtraRest: integer("avg_extra_rest"), // seconds
  momentumScore: integer("momentum_score").notNull(), // 0-100
  momentumBreakdown: jsonb("momentum_breakdown"), // Detailed score components
  highlights: jsonb("highlights").$type<string[]>(),
  issues: jsonb("issues").$type<string[]>(),

  // Week classification (NEW)
  weekType: text("week_type"), // "excellent" | "good" | "inconsistent" | "bad" | "recovery"
  weekTypeConfidence: real("week_type_confidence"), // 0.0-1.0

  // Bad week context (NEW)
  isBadWeek: boolean("is_bad_week").default(false),
  badWeekReasons: jsonb("bad_week_reasons").$type<string[]>(), // ["work_busy", "travel", "sick"]
  userNotes: text("user_notes"), // Free-form explanation from "What Happened?" screen

  // Recovery tracking (NEW)
  isRecoveryWeek: boolean("is_recovery_week").default(false),
  recoveryFromWeek: varchar("recovery_from_week"), // References previous week ID

  // Program adjustment tracking (NEW)
  programAdjusted: boolean("program_adjusted").default(false),
  adjustmentType: text("adjustment_type"), // "progress" | "maintain" | "pause" | "recovery"

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const weeklyReviews = pgTable("weekly_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekPerformanceId: varchar("week_performance_id").notNull().references(() => weeklyPerformance.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  weightSummary: text("weight_summary"),
  workoutSummary: text("workout_summary"),
  nutritionSummary: text("nutrition_summary"),
  patternsDetected: jsonb("patterns_detected"),
  recommendations: jsonb("recommendations"), // Array of prioritized actions
  aiSummaryText: text("ai_summary_text"),
  aiModelUsed: text("ai_model_used"),
  tone: text("tone"), // "encouraging", "concerned", "neutral"
  confidence: real("confidence"),

  // Bad week handling (NEW)
  isBadWeekReview: boolean("is_bad_week_review").default(false),
  badWeekMessage: text("bad_week_message"), // Supportive message for bad weeks
  recoveryRecommendations: jsonb("recovery_recommendations"), // Specific recovery steps

  // Goal adjustment suggestions (NEW)
  goalAdjustmentSuggested: boolean("goal_adjustment_suggested").default(false),
  goalAdjustmentReason: text("goal_adjustment_reason"),
  suggestedGoalChange: jsonb("suggested_goal_change"), // { targetMin, targetMax, weeklyRate }
  goalAdjustmentId: varchar("goal_adjustment_id").references(() => goalAdjustments.id, { onDelete: "set null" }),

  // Pattern insights (NEW)
  consecutiveBadWeeks: integer("consecutive_bad_weeks").default(0),
  streakStatus: text("streak_status"), // "building", "maintaining", "broken", "recovering"
  interventionTriggered: boolean("intervention_triggered").default(false),
  interventionType: text("intervention_type"), // "recovery_week" | "goal_adjustment" | "check_in"

  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// ============================================================================
// WEIGHT TRACKING
// ============================================================================

export const weightEntries = pgTable("weight_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weight: real("weight").notNull(), // kg
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// GOAL ADJUSTMENTS
// ============================================================================

export const goalAdjustments = pgTable("goal_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  adjustmentDate: timestamp("adjustment_date").notNull().defaultNow(),

  // Trigger information
  triggerType: text("trigger_type").notNull(), // "ai_suggestion" | "user_initiated" | "pattern_detected"
  triggerReason: text("trigger_reason").notNull(), // Explanation of why adjustment was suggested
  weeklyPerformanceId: varchar("weekly_performance_id").references(() => weeklyPerformance.id, { onDelete: "set null" }),

  // Goal changes
  previousGoal: jsonb("previous_goal").notNull(), // { targetMin, targetMax, weeklyRate }
  newGoal: jsonb("new_goal").notNull(), // { targetMin, targetMax, weeklyRate }

  // User response
  userResponse: text("user_response"), // "accepted" | "declined" | "modified" | null (pending)
  userNotes: text("user_notes"), // Optional explanation from user

  // Metadata
  aiModelUsed: text("ai_model_used"),
  confidence: real("confidence"), // 0.0-1.0 for AI suggestions

  createdAt: timestamp("created_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// ============================================================================
// SCHEMAS & TYPES
// ============================================================================

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true,
});

export const insertProgramTemplateSchema = createInsertSchema(programTemplates).omit({
  id: true,
  createdAt: true,
  modifiedAt: true,
});

export const insertCurrentWeekProgramSchema = createInsertSchema(currentWeekPrograms).omit({
  id: true,
  generatedAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  startedAt: true,
});

export const insertExerciseCompletedSchema = createInsertSchema(exercisesCompleted).omit({
  id: true,
  completedAt: true,
});

export const insertMealLogSchema = createInsertSchema(mealLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertDailyNutritionSchema = createInsertSchema(dailyNutrition).omit({
  id: true,
  updatedAt: true,
});

export const insertWeeklyPerformanceSchema = createInsertSchema(weeklyPerformance).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyReviewSchema = createInsertSchema(weeklyReviews).omit({
  id: true,
  generatedAt: true,
});

export const insertWeightEntrySchema = createInsertSchema(weightEntries).omit({
  id: true,
  createdAt: true,
});

export const insertGoalAdjustmentSchema = createInsertSchema(goalAdjustments).omit({
  id: true,
  createdAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type ProgramTemplate = typeof programTemplates.$inferSelect;
export type InsertProgramTemplate = z.infer<typeof insertProgramTemplateSchema>;

export type CurrentWeekProgram = typeof currentWeekPrograms.$inferSelect;
export type InsertCurrentWeekProgram = z.infer<typeof insertCurrentWeekProgramSchema>;

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;

export type ExerciseCompleted = typeof exercisesCompleted.$inferSelect;
export type InsertExerciseCompleted = z.infer<typeof insertExerciseCompletedSchema>;

export type MealLog = typeof mealLogs.$inferSelect;
export type InsertMealLog = z.infer<typeof insertMealLogSchema>;

export type DailyNutrition = typeof dailyNutrition.$inferSelect;
export type InsertDailyNutrition = z.infer<typeof insertDailyNutritionSchema>;

export type WeeklyPerformance = typeof weeklyPerformance.$inferSelect;
export type InsertWeeklyPerformance = z.infer<typeof insertWeeklyPerformanceSchema>;

export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type InsertWeeklyReview = z.infer<typeof insertWeeklyReviewSchema>;

export type WeightEntry = typeof weightEntries.$inferSelect;
export type InsertWeightEntry = z.infer<typeof insertWeightEntrySchema>;

export type GoalAdjustment = typeof goalAdjustments.$inferSelect;
export type InsertGoalAdjustment = z.infer<typeof insertGoalAdjustmentSchema>;
