import {
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type ProgramTemplate,
  type InsertProgramTemplate,
  type CurrentWeekProgram,
  type InsertCurrentWeekProgram,
  type WorkoutSession,
  type InsertWorkoutSession,
  type ExerciseCompleted,
  type InsertExerciseCompleted,
  type MealLog,
  type InsertMealLog,
  type DailyNutrition,
  type InsertDailyNutrition,
  type WeeklyPerformance,
  type InsertWeeklyPerformance,
  type WeeklyReview,
  type InsertWeeklyReview,
  type WeightEntry,
  type InsertWeightEntry,
  type GoalAdjustment,
  type InsertGoalAdjustment,
} from "@shared/schema";
import { randomUUID } from "crypto";

// ============================================================================
// Storage Interface - Comprehensive CRUD Operations
// ============================================================================

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  // Program Templates
  getProgramTemplate(id: string): Promise<ProgramTemplate | undefined>;
  getProgramTemplatesByUser(userId: string): Promise<ProgramTemplate[]>;
  createProgramTemplate(template: InsertProgramTemplate): Promise<ProgramTemplate>;
  updateProgramTemplate(id: string, updates: Partial<InsertProgramTemplate>): Promise<ProgramTemplate | undefined>;

  // Current Week Programs
  getCurrentWeekProgram(userId: string): Promise<CurrentWeekProgram | undefined>;
  getWeekProgramById(id: string): Promise<CurrentWeekProgram | undefined>;
  createWeekProgram(program: InsertCurrentWeekProgram): Promise<CurrentWeekProgram>;
  getWeekProgramsByUser(userId: string, limit?: number): Promise<CurrentWeekProgram[]>;

  // Workout Sessions
  getWorkoutSession(id: string): Promise<WorkoutSession | undefined>;
  getWorkoutSessionsByUser(userId: string, limit?: number): Promise<WorkoutSession[]>;
  getWorkoutSessionsByWeek(weekProgramId: string): Promise<WorkoutSession[]>;
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  updateWorkoutSession(id: string, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined>;

  // Exercises Completed
  getExercisesByWorkout(workoutSessionId: string): Promise<ExerciseCompleted[]>;
  createExerciseCompleted(exercise: InsertExerciseCompleted): Promise<ExerciseCompleted>;

  // Meal Logs
  getMealLog(id: string): Promise<MealLog | undefined>;
  getMealLogsByUser(userId: string, limit?: number): Promise<MealLog[]>;
  getMealLogsByDate(userId: string, date: Date): Promise<MealLog[]>;
  createMealLog(meal: InsertMealLog): Promise<MealLog>;
  updateMealLog(id: string, updates: Partial<InsertMealLog>): Promise<MealLog | undefined>;

  // Daily Nutrition
  getDailyNutrition(userId: string, date: Date): Promise<DailyNutrition | undefined>;
  createDailyNutrition(nutrition: InsertDailyNutrition): Promise<DailyNutrition>;
  updateDailyNutrition(id: string, updates: Partial<InsertDailyNutrition>): Promise<DailyNutrition | undefined>;

  // Weekly Performance
  getWeeklyPerformance(userId: string, weekStartDate: Date): Promise<WeeklyPerformance | undefined>;
  getWeeklyPerformanceHistory(userId: string, limit?: number): Promise<WeeklyPerformance[]>;
  createWeeklyPerformance(performance: InsertWeeklyPerformance): Promise<WeeklyPerformance>;
  updateWeeklyPerformance(id: string, updates: Partial<InsertWeeklyPerformance>): Promise<WeeklyPerformance | undefined>;

  // Weekly Reviews
  getWeeklyReview(userId: string, weekStartDate: Date): Promise<WeeklyReview | undefined>;
  getWeeklyReviewHistory(userId: string, limit?: number): Promise<WeeklyReview[]>;
  createWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview>;

  // Weight Entries
  getWeightEntries(userId: string, limit?: number): Promise<WeightEntry[]>;
  getLatestWeight(userId: string): Promise<WeightEntry | undefined>;
  createWeightEntry(entry: InsertWeightEntry): Promise<WeightEntry>;

  // Goal Adjustments
  getGoalAdjustment(id: string): Promise<GoalAdjustment | undefined>;
  getGoalAdjustmentsByUser(userId: string, limit?: number): Promise<GoalAdjustment[]>;
  getPendingGoalAdjustment(userId: string): Promise<GoalAdjustment | undefined>;
  createGoalAdjustment(adjustment: InsertGoalAdjustment): Promise<GoalAdjustment>;
  updateGoalAdjustment(id: string, updates: Partial<InsertGoalAdjustment>): Promise<GoalAdjustment | undefined>;
}

// ============================================================================
// In-Memory Storage Implementation
// ============================================================================

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<string, UserProfile>;
  private programTemplates: Map<string, ProgramTemplate>;
  private currentWeekPrograms: Map<string, CurrentWeekProgram>;
  private workoutSessions: Map<string, WorkoutSession>;
  private exercisesCompleted: Map<string, ExerciseCompleted>;
  private mealLogs: Map<string, MealLog>;
  private dailyNutrition: Map<string, DailyNutrition>;
  private weeklyPerformance: Map<string, WeeklyPerformance>;
  private weeklyReviews: Map<string, WeeklyReview>;
  private weightEntries: Map<string, WeightEntry>;
  private goalAdjustments: Map<string, GoalAdjustment>;

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.programTemplates = new Map();
    this.currentWeekPrograms = new Map();
    this.workoutSessions = new Map();
    this.exercisesCompleted = new Map();
    this.mealLogs = new Map();
    this.dailyNutrition = new Map();
    this.weeklyPerformance = new Map();
    this.weeklyReviews = new Map();
    this.weightEntries = new Map();
    this.goalAdjustments = new Map();
  }

  // ========== Users ==========

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // ========== User Profiles ==========

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return Array.from(this.userProfiles.values()).find((profile) => profile.userId === userId);
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const id = randomUUID();
    const profile: UserProfile = {
      ...insertProfile,
      id,
      updatedAt: new Date(),
    };
    this.userProfiles.set(id, profile);
    return profile;
  }

  async updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return undefined;

    const updated: UserProfile = {
      ...profile,
      ...updates,
      updatedAt: new Date(),
    };
    this.userProfiles.set(profile.id, updated);
    return updated;
  }

  // ========== Program Templates ==========

  async getProgramTemplate(id: string): Promise<ProgramTemplate | undefined> {
    return this.programTemplates.get(id);
  }

  async getProgramTemplatesByUser(userId: string): Promise<ProgramTemplate[]> {
    return Array.from(this.programTemplates.values())
      .filter((template) => template.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createProgramTemplate(insertTemplate: InsertProgramTemplate): Promise<ProgramTemplate> {
    const id = randomUUID();
    const template: ProgramTemplate = {
      ...insertTemplate,
      id,
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    this.programTemplates.set(id, template);
    return template;
  }

  async updateProgramTemplate(id: string, updates: Partial<InsertProgramTemplate>): Promise<ProgramTemplate | undefined> {
    const template = this.programTemplates.get(id);
    if (!template) return undefined;

    const updated: ProgramTemplate = {
      ...template,
      ...updates,
      modifiedAt: new Date(),
    };
    this.programTemplates.set(id, updated);
    return updated;
  }

  // ========== Current Week Programs ==========

  async getCurrentWeekProgram(userId: string): Promise<CurrentWeekProgram | undefined> {
    const programs = Array.from(this.currentWeekPrograms.values())
      .filter((program) => program.userId === userId)
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());

    return programs[0];
  }

  async getWeekProgramById(id: string): Promise<CurrentWeekProgram | undefined> {
    return this.currentWeekPrograms.get(id);
  }

  async createWeekProgram(insertProgram: InsertCurrentWeekProgram): Promise<CurrentWeekProgram> {
    const id = randomUUID();
    const program: CurrentWeekProgram = {
      ...insertProgram,
      id,
      generatedAt: new Date(),
    };
    this.currentWeekPrograms.set(id, program);
    return program;
  }

  async getWeekProgramsByUser(userId: string, limit: number = 10): Promise<CurrentWeekProgram[]> {
    return Array.from(this.currentWeekPrograms.values())
      .filter((program) => program.userId === userId)
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())
      .slice(0, limit);
  }

  // ========== Workout Sessions ==========

  async getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
    return this.workoutSessions.get(id);
  }

  async getWorkoutSessionsByUser(userId: string, limit: number = 20): Promise<WorkoutSession[]> {
    return Array.from(this.workoutSessions.values())
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.workoutDate.getTime() - a.workoutDate.getTime())
      .slice(0, limit);
  }

  async getWorkoutSessionsByWeek(weekProgramId: string): Promise<WorkoutSession[]> {
    return Array.from(this.workoutSessions.values())
      .filter((session) => session.weekProgramId === weekProgramId)
      .sort((a, b) => a.workoutDate.getTime() - b.workoutDate.getTime());
  }

  async createWorkoutSession(insertSession: InsertWorkoutSession): Promise<WorkoutSession> {
    const id = randomUUID();
    const session: WorkoutSession = {
      ...insertSession,
      id,
      startedAt: new Date(),
    };
    this.workoutSessions.set(id, session);
    return session;
  }

  async updateWorkoutSession(id: string, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined> {
    const session = this.workoutSessions.get(id);
    if (!session) return undefined;

    const updated: WorkoutSession = {
      ...session,
      ...updates,
    };
    this.workoutSessions.set(id, updated);
    return updated;
  }

  // ========== Exercises Completed ==========

  async getExercisesByWorkout(workoutSessionId: string): Promise<ExerciseCompleted[]> {
    return Array.from(this.exercisesCompleted.values())
      .filter((exercise) => exercise.workoutSessionId === workoutSessionId)
      .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());
  }

  async createExerciseCompleted(insertExercise: InsertExerciseCompleted): Promise<ExerciseCompleted> {
    const id = randomUUID();
    const exercise: ExerciseCompleted = {
      id,
      workoutSessionId: insertExercise.workoutSessionId,
      exerciseName: insertExercise.exerciseName,
      exerciseType: insertExercise.exerciseType,
      sets: insertExercise.sets ?? null,
      reps: insertExercise.reps ?? null,
      weight: insertExercise.weight ?? null,
      rounds: insertExercise.rounds ?? null,
      workTime: insertExercise.workTime ?? null,
      restTime: insertExercise.restTime ?? null,
      targetRestTime: insertExercise.targetRestTime ?? null,
      actualRestTime: insertExercise.actualRestTime ?? null,
      extraRestTime: insertExercise.extraRestTime ?? null,
      feeling: insertExercise.feeling ?? null,
      notes: insertExercise.notes ?? null,
      completedAt: new Date(),
    };
    this.exercisesCompleted.set(id, exercise);
    return exercise;
  }

  // ========== Meal Logs ==========

  async getMealLog(id: string): Promise<MealLog | undefined> {
    return this.mealLogs.get(id);
  }

  async getMealLogsByUser(userId: string, limit: number = 50): Promise<MealLog[]> {
    return Array.from(this.mealLogs.values())
      .filter((meal) => meal.userId === userId)
      .sort((a, b) => b.mealDate.getTime() - a.mealDate.getTime())
      .slice(0, limit);
  }

  async getMealLogsByDate(userId: string, date: Date): Promise<MealLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.mealLogs.values())
      .filter(
        (meal) =>
          meal.userId === userId &&
          meal.mealDate >= startOfDay &&
          meal.mealDate <= endOfDay
      )
      .sort((a, b) => a.mealDate.getTime() - b.mealDate.getTime());
  }

  async createMealLog(insertMeal: InsertMealLog): Promise<MealLog> {
    const id = randomUUID();
    const meal: MealLog = {
      id,
      userId: insertMeal.userId,
      mealDate: insertMeal.mealDate,
      mealType: insertMeal.mealType,
      loggingMethod: insertMeal.loggingMethod,
      photoStored: insertMeal.photoStored ?? null,
      photoKey: insertMeal.photoKey ?? null,
      foodsIdentified: insertMeal.foodsIdentified ? [...insertMeal.foodsIdentified] : null,
      calories: insertMeal.calories,
      protein: insertMeal.protein,
      aiAnalysis: insertMeal.aiAnalysis ?? null,
      aiModelUsed: insertMeal.aiModelUsed ?? null,
      confidenceScore: insertMeal.confidenceScore ?? null,
      manuallyAdjusted: insertMeal.manuallyAdjusted ?? null,
      finalCalories: insertMeal.finalCalories ?? null,
      finalProtein: insertMeal.finalProtein ?? null,
      notes: insertMeal.notes ?? null,
      loggedAt: new Date(),
    };
    this.mealLogs.set(id, meal);
    return meal;
  }

  async updateMealLog(id: string, updates: Partial<InsertMealLog>): Promise<MealLog | undefined> {
    const meal = this.mealLogs.get(id);
    if (!meal) return undefined;

    const updated: MealLog = {
      ...meal,
      ...updates,
    };
    this.mealLogs.set(id, updated);
    return updated;
  }

  // ========== Daily Nutrition ==========

  async getDailyNutrition(userId: string, date: Date): Promise<DailyNutrition | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.dailyNutrition.values()).find(
      (nutrition) =>
        nutrition.userId === userId &&
        nutrition.date >= startOfDay &&
        nutrition.date <= endOfDay
    );
  }

  async createDailyNutrition(insertNutrition: InsertDailyNutrition): Promise<DailyNutrition> {
    const id = randomUUID();
    const nutrition: DailyNutrition = {
      id,
      userId: insertNutrition.userId,
      date: insertNutrition.date,
      caloriesTarget: insertNutrition.caloriesTarget,
      proteinTarget: insertNutrition.proteinTarget,
      caloriesActual: insertNutrition.caloriesActual ?? 0,
      proteinActual: insertNutrition.proteinActual ?? 0,
      mealsCount: insertNutrition.mealsCount ?? 0,
      hitTarget: insertNutrition.hitTarget ?? null,
      trainingDay: insertNutrition.trainingDay ?? null,
      remindersSent: insertNutrition.remindersSent ?? null,
      updatedAt: new Date(),
    };
    this.dailyNutrition.set(id, nutrition);
    return nutrition;
  }

  async updateDailyNutrition(id: string, updates: Partial<InsertDailyNutrition>): Promise<DailyNutrition | undefined> {
    const nutrition = this.dailyNutrition.get(id);
    if (!nutrition) return undefined;

    const updated: DailyNutrition = {
      ...nutrition,
      ...updates,
      updatedAt: new Date(),
    };
    this.dailyNutrition.set(id, updated);
    return updated;
  }

  // ========== Weekly Performance ==========

  async getWeeklyPerformance(userId: string, weekStartDate: Date): Promise<WeeklyPerformance | undefined> {
    return Array.from(this.weeklyPerformance.values()).find(
      (performance) =>
        performance.userId === userId &&
        performance.weekStartDate.getTime() === weekStartDate.getTime()
    );
  }

  async getWeeklyPerformanceHistory(userId: string, limit: number = 12): Promise<WeeklyPerformance[]> {
    return Array.from(this.weeklyPerformance.values())
      .filter((performance) => performance.userId === userId)
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())
      .slice(0, limit);
  }

  async createWeeklyPerformance(insertPerformance: InsertWeeklyPerformance): Promise<WeeklyPerformance> {
    const id = randomUUID();
    const performance: WeeklyPerformance = {
      id,
      userId: insertPerformance.userId,
      weekStartDate: insertPerformance.weekStartDate,
      weekEndDate: insertPerformance.weekEndDate,
      workoutsPlanned: insertPerformance.workoutsPlanned,
      workoutsCompleted: insertPerformance.workoutsCompleted,
      workoutCompletionRate: insertPerformance.workoutCompletionRate,
      missedDays: insertPerformance.missedDays ? [...insertPerformance.missedDays] : null,
      nutritionDaysHitTarget: insertPerformance.nutritionDaysHitTarget,
      nutritionConsistencyRate: insertPerformance.nutritionConsistencyRate,
      avgCalories: insertPerformance.avgCalories ?? null,
      avgProtein: insertPerformance.avgProtein ?? null,
      weightStart: insertPerformance.weightStart ?? null,
      weightEnd: insertPerformance.weightEnd ?? null,
      weightChange: insertPerformance.weightChange ?? null,
      weightChangeTarget: insertPerformance.weightChangeTarget ?? null,
      weightStatus: insertPerformance.weightStatus ?? null,
      currentStreak: insertPerformance.currentStreak ?? null,
      longestStreak: insertPerformance.longestStreak ?? null,
      avgFeeling: insertPerformance.avgFeeling ?? null,
      avgExtraRest: insertPerformance.avgExtraRest ?? null,
      momentumScore: insertPerformance.momentumScore,
      momentumBreakdown: insertPerformance.momentumBreakdown ?? null,
      highlights: insertPerformance.highlights ? [...insertPerformance.highlights] : null,
      issues: insertPerformance.issues ? [...insertPerformance.issues] : null,
      // New fields
      weekType: insertPerformance.weekType ?? null,
      weekTypeConfidence: insertPerformance.weekTypeConfidence ?? null,
      isBadWeek: insertPerformance.isBadWeek ?? null,
      badWeekReasons: insertPerformance.badWeekReasons ? [...insertPerformance.badWeekReasons] : null,
      userNotes: insertPerformance.userNotes ?? null,
      isRecoveryWeek: insertPerformance.isRecoveryWeek ?? null,
      recoveryFromWeek: insertPerformance.recoveryFromWeek ?? null,
      programAdjusted: insertPerformance.programAdjusted ?? null,
      adjustmentType: insertPerformance.adjustmentType ?? null,
      createdAt: new Date(),
    };
    this.weeklyPerformance.set(id, performance);
    return performance;
  }

  async updateWeeklyPerformance(id: string, updates: Partial<InsertWeeklyPerformance>): Promise<WeeklyPerformance | undefined> {
    const performance = this.weeklyPerformance.get(id);
    if (!performance) return undefined;

    const updated: WeeklyPerformance = {
      ...performance,
      ...updates,
      badWeekReasons: updates.badWeekReasons ? [...updates.badWeekReasons] : performance.badWeekReasons,
    };
    this.weeklyPerformance.set(id, updated);
    return updated;
  }

  // ========== Weekly Reviews ==========

  async getWeeklyReview(userId: string, weekStartDate: Date): Promise<WeeklyReview | undefined> {
    return Array.from(this.weeklyReviews.values()).find(
      (review) =>
        review.userId === userId &&
        review.weekStartDate.getTime() === weekStartDate.getTime()
    );
  }

  async getWeeklyReviewHistory(userId: string, limit: number = 12): Promise<WeeklyReview[]> {
    return Array.from(this.weeklyReviews.values())
      .filter((review) => review.userId === userId)
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime())
      .slice(0, limit);
  }

  async createWeeklyReview(insertReview: InsertWeeklyReview): Promise<WeeklyReview> {
    const id = randomUUID();
    const review: WeeklyReview = {
      id,
      userId: insertReview.userId,
      weekPerformanceId: insertReview.weekPerformanceId,
      weekStartDate: insertReview.weekStartDate,
      weekEndDate: insertReview.weekEndDate,
      weightSummary: insertReview.weightSummary ?? null,
      workoutSummary: insertReview.workoutSummary ?? null,
      nutritionSummary: insertReview.nutritionSummary ?? null,
      patternsDetected: insertReview.patternsDetected ?? null,
      recommendations: insertReview.recommendations ?? null,
      aiSummaryText: insertReview.aiSummaryText ?? null,
      aiModelUsed: insertReview.aiModelUsed ?? null,
      tone: insertReview.tone ?? null,
      confidence: insertReview.confidence ?? null,
      // New fields
      isBadWeekReview: insertReview.isBadWeekReview ?? null,
      badWeekMessage: insertReview.badWeekMessage ?? null,
      recoveryRecommendations: insertReview.recoveryRecommendations ?? null,
      goalAdjustmentSuggested: insertReview.goalAdjustmentSuggested ?? null,
      goalAdjustmentReason: insertReview.goalAdjustmentReason ?? null,
      suggestedGoalChange: insertReview.suggestedGoalChange ?? null,
      goalAdjustmentId: insertReview.goalAdjustmentId ?? null,
      consecutiveBadWeeks: insertReview.consecutiveBadWeeks ?? null,
      streakStatus: insertReview.streakStatus ?? null,
      interventionTriggered: insertReview.interventionTriggered ?? null,
      interventionType: insertReview.interventionType ?? null,
      generatedAt: new Date(),
    };
    this.weeklyReviews.set(id, review);
    return review;
  }

  // ========== Weight Entries ==========

  async getWeightEntries(userId: string, limit: number = 30): Promise<WeightEntry[]> {
    return Array.from(this.weightEntries.values())
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  async getLatestWeight(userId: string): Promise<WeightEntry | undefined> {
    const entries = await this.getWeightEntries(userId, 1);
    return entries[0];
  }

  async createWeightEntry(insertEntry: InsertWeightEntry): Promise<WeightEntry> {
    const id = randomUUID();
    const entry: WeightEntry = {
      id,
      userId: insertEntry.userId,
      weight: insertEntry.weight,
      date: insertEntry.date,
      notes: insertEntry.notes ?? null,
      createdAt: new Date(),
    };
    this.weightEntries.set(id, entry);
    return entry;
  }

  // ========== Goal Adjustments ==========

  async getGoalAdjustment(id: string): Promise<GoalAdjustment | undefined> {
    return this.goalAdjustments.get(id);
  }

  async getGoalAdjustmentsByUser(userId: string, limit: number = 20): Promise<GoalAdjustment[]> {
    return Array.from(this.goalAdjustments.values())
      .filter((adjustment) => adjustment.userId === userId)
      .sort((a, b) => b.adjustmentDate.getTime() - a.adjustmentDate.getTime())
      .slice(0, limit);
  }

  async getPendingGoalAdjustment(userId: string): Promise<GoalAdjustment | undefined> {
    return Array.from(this.goalAdjustments.values())
      .filter((adjustment) => adjustment.userId === userId && adjustment.userResponse === null)
      .sort((a, b) => b.adjustmentDate.getTime() - a.adjustmentDate.getTime())[0];
  }

  async createGoalAdjustment(insertAdjustment: InsertGoalAdjustment): Promise<GoalAdjustment> {
    const id = randomUUID();
    const adjustment: GoalAdjustment = {
      id,
      userId: insertAdjustment.userId,
      adjustmentDate: insertAdjustment.adjustmentDate ?? new Date(),
      triggerType: insertAdjustment.triggerType,
      triggerReason: insertAdjustment.triggerReason,
      weeklyPerformanceId: insertAdjustment.weeklyPerformanceId ?? null,
      previousGoal: insertAdjustment.previousGoal,
      newGoal: insertAdjustment.newGoal,
      userResponse: insertAdjustment.userResponse ?? null,
      userNotes: insertAdjustment.userNotes ?? null,
      aiModelUsed: insertAdjustment.aiModelUsed ?? null,
      confidence: insertAdjustment.confidence ?? null,
      createdAt: new Date(),
      respondedAt: insertAdjustment.respondedAt ?? null,
    };
    this.goalAdjustments.set(id, adjustment);
    return adjustment;
  }

  async updateGoalAdjustment(id: string, updates: Partial<InsertGoalAdjustment>): Promise<GoalAdjustment | undefined> {
    const adjustment = this.goalAdjustments.get(id);
    if (!adjustment) return undefined;

    const updated: GoalAdjustment = {
      ...adjustment,
      ...updates,
      respondedAt: updates.userResponse ? new Date() : adjustment.respondedAt,
    };
    this.goalAdjustments.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
