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
  users,
  userProfiles,
  programTemplates,
  currentWeekPrograms,
  workoutSessions,
  exercisesCompleted,
  mealLogs,
  dailyNutrition,
  weeklyPerformance,
  weeklyReviews,
  weightEntries,
  goalAdjustments,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import type { IStorage } from "./storage";

// ============================================================================
// Database Storage Implementation using Drizzle ORM
// ============================================================================

export class DatabaseStorage implements IStorage {
  // ========== Users ==========

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ========== User Profiles ==========

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(insertProfile: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db
      .insert(userProfiles)
      .values(insertProfile as any)
      .returning();
    return profile;
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<InsertUserProfile>
  ): Promise<UserProfile | undefined> {
    const [profile] = await db
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile;
  }

  // ========== Program Templates ==========

  async getProgramTemplate(id: string): Promise<ProgramTemplate | undefined> {
    const [template] = await db
      .select()
      .from(programTemplates)
      .where(eq(programTemplates.id, id));
    return template;
  }

  async getProgramTemplatesByUser(userId: string): Promise<ProgramTemplate[]> {
    return await db
      .select()
      .from(programTemplates)
      .where(eq(programTemplates.userId, userId))
      .orderBy(desc(programTemplates.createdAt));
  }

  async createProgramTemplate(
    insertTemplate: InsertProgramTemplate
  ): Promise<ProgramTemplate> {
    const [template] = await db
      .insert(programTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateProgramTemplate(
    id: string,
    updates: Partial<InsertProgramTemplate>
  ): Promise<ProgramTemplate | undefined> {
    const [template] = await db
      .update(programTemplates)
      .set({ ...updates, modifiedAt: new Date() })
      .where(eq(programTemplates.id, id))
      .returning();
    return template;
  }

  // ========== Current Week Programs ==========

  async getCurrentWeekProgram(userId: string): Promise<CurrentWeekProgram | undefined> {
    const [program] = await db
      .select()
      .from(currentWeekPrograms)
      .where(eq(currentWeekPrograms.userId, userId))
      .orderBy(desc(currentWeekPrograms.weekStartDate))
      .limit(1);
    return program;
  }

  async getWeekProgramById(id: string): Promise<CurrentWeekProgram | undefined> {
    const [program] = await db
      .select()
      .from(currentWeekPrograms)
      .where(eq(currentWeekPrograms.id, id));
    return program;
  }

  async createWeekProgram(
    insertProgram: InsertCurrentWeekProgram
  ): Promise<CurrentWeekProgram> {
    const [program] = await db
      .insert(currentWeekPrograms)
      .values(insertProgram)
      .returning();
    return program;
  }

  async getWeekProgramsByUser(
    userId: string,
    limit: number = 10
  ): Promise<CurrentWeekProgram[]> {
    return await db
      .select()
      .from(currentWeekPrograms)
      .where(eq(currentWeekPrograms.userId, userId))
      .orderBy(desc(currentWeekPrograms.weekStartDate))
      .limit(limit);
  }

  // ========== Workout Sessions ==========

  async getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
    const [session] = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id));
    return session;
  }

  async getWorkoutSessionsByUser(
    userId: string,
    limit: number = 20
  ): Promise<WorkoutSession[]> {
    return await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.workoutDate))
      .limit(limit);
  }

  async getWorkoutSessionsByWeek(weekProgramId: string): Promise<WorkoutSession[]> {
    return await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.weekProgramId, weekProgramId))
      .orderBy(workoutSessions.workoutDate);
  }

  async createWorkoutSession(insertSession: InsertWorkoutSession): Promise<WorkoutSession> {
    const [session] = await db
      .insert(workoutSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateWorkoutSession(
    id: string,
    updates: Partial<InsertWorkoutSession>
  ): Promise<WorkoutSession | undefined> {
    const [session] = await db
      .update(workoutSessions)
      .set(updates)
      .where(eq(workoutSessions.id, id))
      .returning();
    return session;
  }

  // ========== Exercises Completed ==========

  async getExercisesByWorkout(workoutSessionId: string): Promise<ExerciseCompleted[]> {
    return await db
      .select()
      .from(exercisesCompleted)
      .where(eq(exercisesCompleted.workoutSessionId, workoutSessionId))
      .orderBy(exercisesCompleted.completedAt);
  }

  async createExerciseCompleted(
    insertExercise: InsertExerciseCompleted
  ): Promise<ExerciseCompleted> {
    const [exercise] = await db
      .insert(exercisesCompleted)
      .values(insertExercise)
      .returning();
    return exercise;
  }

  // ========== Meal Logs ==========

  async getMealLog(id: string): Promise<MealLog | undefined> {
    const [meal] = await db.select().from(mealLogs).where(eq(mealLogs.id, id));
    return meal;
  }

  async getMealLogsByUser(userId: string, limit: number = 50): Promise<MealLog[]> {
    return await db
      .select()
      .from(mealLogs)
      .where(eq(mealLogs.userId, userId))
      .orderBy(desc(mealLogs.mealDate))
      .limit(limit);
  }

  async getMealLogsByDate(userId: string, date: Date): Promise<MealLog[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(mealLogs)
      .where(
        and(
          eq(mealLogs.userId, userId),
          gte(mealLogs.mealDate, startOfDay),
          lte(mealLogs.mealDate, endOfDay)
        )
      )
      .orderBy(mealLogs.mealDate);
  }

  async createMealLog(insertMeal: InsertMealLog): Promise<MealLog> {
    const [meal] = await db.insert(mealLogs).values(insertMeal as any).returning();
    return meal;
  }

  async updateMealLog(
    id: string,
    updates: Partial<InsertMealLog>
  ): Promise<MealLog | undefined> {
    const [meal] = await db
      .update(mealLogs)
      .set(updates as any)
      .where(eq(mealLogs.id, id))
      .returning();
    return meal;
  }

  // ========== Daily Nutrition ==========

  async getDailyNutrition(userId: string, date: Date): Promise<DailyNutrition | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [nutrition] = await db
      .select()
      .from(dailyNutrition)
      .where(
        and(
          eq(dailyNutrition.userId, userId),
          gte(dailyNutrition.date, startOfDay),
          lte(dailyNutrition.date, endOfDay)
        )
      );
    return nutrition;
  }

  async createDailyNutrition(insertNutrition: InsertDailyNutrition): Promise<DailyNutrition> {
    const [nutrition] = await db
      .insert(dailyNutrition)
      .values(insertNutrition)
      .returning();
    return nutrition;
  }

  async updateDailyNutrition(
    id: string,
    updates: Partial<InsertDailyNutrition>
  ): Promise<DailyNutrition | undefined> {
    const [nutrition] = await db
      .update(dailyNutrition)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dailyNutrition.id, id))
      .returning();
    return nutrition;
  }

  // ========== Weekly Performance ==========

  async getWeeklyPerformance(
    userId: string,
    weekStartDate: Date
  ): Promise<WeeklyPerformance | undefined> {
    const [performance] = await db
      .select()
      .from(weeklyPerformance)
      .where(
        and(
          eq(weeklyPerformance.userId, userId),
          eq(weeklyPerformance.weekStartDate, weekStartDate)
        )
      );
    return performance;
  }

  async getWeeklyPerformanceHistory(
    userId: string,
    limit: number = 12
  ): Promise<WeeklyPerformance[]> {
    return await db
      .select()
      .from(weeklyPerformance)
      .where(eq(weeklyPerformance.userId, userId))
      .orderBy(desc(weeklyPerformance.weekStartDate))
      .limit(limit);
  }

  async createWeeklyPerformance(
    insertPerformance: InsertWeeklyPerformance
  ): Promise<WeeklyPerformance> {
    const [performance] = await db
      .insert(weeklyPerformance)
      .values(insertPerformance as any)
      .returning();
    return performance;
  }

  async updateWeeklyPerformance(
    id: string,
    updates: Partial<InsertWeeklyPerformance>
  ): Promise<WeeklyPerformance | undefined> {
    const [performance] = await db
      .update(weeklyPerformance)
      .set(updates as any)
      .where(eq(weeklyPerformance.id, id))
      .returning();
    return performance;
  }

  // ========== Weekly Reviews ==========

  async getWeeklyReview(userId: string, weekStartDate: Date): Promise<WeeklyReview | undefined> {
    const [review] = await db
      .select()
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, userId),
          eq(weeklyReviews.weekStartDate, weekStartDate)
        )
      );
    return review;
  }

  async getWeeklyReviewHistory(userId: string, limit: number = 12): Promise<WeeklyReview[]> {
    return await db
      .select()
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, userId))
      .orderBy(desc(weeklyReviews.weekStartDate))
      .limit(limit);
  }

  async createWeeklyReview(insertReview: InsertWeeklyReview): Promise<WeeklyReview> {
    const [review] = await db
      .insert(weeklyReviews)
      .values(insertReview)
      .returning();
    return review;
  }

  // ========== Weight Entries ==========

  async getWeightEntries(userId: string, limit: number = 30): Promise<WeightEntry[]> {
    return await db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.userId, userId))
      .orderBy(desc(weightEntries.date))
      .limit(limit);
  }

  async getLatestWeight(userId: string): Promise<WeightEntry | undefined> {
    const [entry] = await db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.userId, userId))
      .orderBy(desc(weightEntries.date))
      .limit(1);
    return entry;
  }

  async createWeightEntry(insertEntry: InsertWeightEntry): Promise<WeightEntry> {
    const [entry] = await db
      .insert(weightEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  // ========== Goal Adjustments ==========

  async getGoalAdjustment(id: string): Promise<GoalAdjustment | undefined> {
    const [adjustment] = await db
      .select()
      .from(goalAdjustments)
      .where(eq(goalAdjustments.id, id));
    return adjustment;
  }

  async getGoalAdjustmentsByUser(
    userId: string,
    limit: number = 20
  ): Promise<GoalAdjustment[]> {
    return await db
      .select()
      .from(goalAdjustments)
      .where(eq(goalAdjustments.userId, userId))
      .orderBy(desc(goalAdjustments.adjustmentDate))
      .limit(limit);
  }

  async getPendingGoalAdjustment(userId: string): Promise<GoalAdjustment | undefined> {
    const [adjustment] = await db
      .select()
      .from(goalAdjustments)
      .where(
        and(
          eq(goalAdjustments.userId, userId),
          isNull(goalAdjustments.userResponse)
        )
      )
      .orderBy(desc(goalAdjustments.adjustmentDate))
      .limit(1);
    return adjustment;
  }

  async createGoalAdjustment(insertAdjustment: InsertGoalAdjustment): Promise<GoalAdjustment> {
    const [adjustment] = await db
      .insert(goalAdjustments)
      .values(insertAdjustment)
      .returning();
    return adjustment;
  }

  async updateGoalAdjustment(
    id: string,
    updates: Partial<InsertGoalAdjustment>
  ): Promise<GoalAdjustment | undefined> {
    const updateData = {
      ...updates,
      ...(updates.userResponse ? { respondedAt: new Date() } : {}),
    };

    const [adjustment] = await db
      .update(goalAdjustments)
      .set(updateData)
      .where(eq(goalAdjustments.id, id))
      .returning();
    return adjustment;
  }
}

export const databaseStorage = new DatabaseStorage();
