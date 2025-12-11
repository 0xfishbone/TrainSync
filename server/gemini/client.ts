import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================================================
// Gemini AI Client Configuration
// ============================================================================

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not found. AI features will be disabled.");
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Gemini 2.5 Flash model (FREE tier: 1,500 requests/day)
// Note: gemini-1.5-flash models retired by Google
const MODEL_NAME = "gemini-2.5-flash";

// ============================================================================
// Types
// ============================================================================

export interface ProgramGenerationInput {
  name: string;
  age: number;
  currentWeight: number;
  targetWeightMin?: number;
  targetWeightMax?: number;
  primaryGoal: string;
  secondaryGoal?: string;
  sportFocus?: string;
  trainingDaysPerWeek: number;
  availableDays: string[];
  sessionDuration: number;
  equipmentAvailable: string[];
  injuries?: string[];
  exercisesToAvoid?: string[];
  dailyCaloriesTarget: number;
  dailyProteinTarget: number;
  weeklyWeightChangeTarget: number;
}

export interface MealAnalysisInput {
  imageBase64: string;
  mimeType: string; // "image/jpeg", "image/png", etc.
}

export interface MealAnalysisResult {
  foods: string[];
  calories: number;
  protein: number;
  confidence: number; // 0.0 - 1.0
  rawResponse: string;
}

export interface WeeklyReviewInput {
  userContext: {
    age: number;
    currentWeight: number;
    goals: string;
  };
  weekData: {
    workoutsPlanned: number;
    workoutsCompleted: number;
    nutritionDaysHitTarget: number;
    weightStart: number;
    weightEnd: number;
    weightChangeTarget: number;
    avgExtraRest: number;
    patterns: any[];
    weekType?: "excellent" | "good" | "inconsistent" | "bad" | "recovery"; // NEW
    isBadWeek?: boolean; // NEW
    isRecoveryWeek?: boolean; // NEW
    badWeekReasons?: string[]; // NEW
    userNotes?: string; // NEW
  };
}

// ============================================================================
// Gemini API Functions
// ============================================================================

/**
 * Generate a personalized training program based on user profile
 */
export async function generateProgram(input: ProgramGenerationInput): Promise<any> {
  if (!genAI) {
    throw new Error("Gemini API not configured. Set GEMINI_API_KEY environment variable.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `You are an expert fitness coach creating a personalized training program.

USER PROFILE:
- Name: ${input.name}
- Age: ${input.age}
- Current Weight: ${input.currentWeight}kg
- Target Weight: ${input.targetWeightMin || input.targetWeightMax}kg
- Primary Goal: ${input.primaryGoal}
- Secondary Goal: ${input.secondaryGoal || "None"}
- Sport Focus: ${input.sportFocus || "General fitness"}
- Training Days: ${input.trainingDaysPerWeek} days/week on ${input.availableDays.join(", ")}
- Session Duration: ${input.sessionDuration} minutes
- Equipment: ${input.equipmentAvailable.join(", ")}
${input.injuries?.length ? `- Injuries/Limitations: ${input.injuries.join(", ")}` : ""}
${input.exercisesToAvoid?.length ? `- Avoid: ${input.exercisesToAvoid.join(", ")}` : ""}

NUTRITION TARGETS:
- Daily Calories: ${input.dailyCaloriesTarget}
- Daily Protein: ${input.dailyProteinTarget}g
- Weekly Weight Change Target: ${input.weeklyWeightChangeTarget > 0 ? "+" : ""}${input.weeklyWeightChangeTarget}kg

TASK:
Create a complete weekly training program in JSON format with this structure:

{
  "programName": "descriptive name",
  "weeklyStructure": {
    "monday": {
      "sessionName": "e.g., Upper Strength",
      "type": "strength|cardio|conditioning",
      "duration": 60,
      "exercises": [
        {
          "name": "Exercise Name",
          "type": "timed|reps",
          "sets": 3,
          "reps": "10-12",
          "weight": 20,
          "restTime": 120,
          "workTime": 0,
          "rounds": 0,
          "instructions": "Form cues",
          "progression": {
            "type": "weight|reps|rounds",
            "amount": 2,
            "conditions": "when feeling Good for 2 weeks"
          }
        }
      ]
    }
  },
  "progressionStrategy": "overall strategy",
  "deloadStrategy": "when/how to deload",
  "weeklyFocus": "what to focus on this program",
  "nutritionGuidance": "nutrition tips"
}

IMPORTANT:
- Match equipment to user's available equipment only
- Respect injury limitations
- Age-appropriate progression (conservative for 35+)
- Set realistic baseline weights/intensities
- Include warm-up in first exercise if needed
- Provide clear progression rules
- Return ONLY valid JSON, no markdown formatting`;

  try {
    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 3000,
      },
    });

    const response = result.response;
    const text = response.text();

    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const programData = JSON.parse(cleanedText);
    return programData;
  } catch (error: any) {
    console.error("Program generation error:", error);
    throw new Error(`Failed to generate program: ${error.message}`);
  }
}

/**
 * Analyze a meal photo and extract nutritional information
 */
export async function analyzeMealPhoto(input: MealAnalysisInput): Promise<MealAnalysisResult> {
  if (!genAI) {
    throw new Error("Gemini API not configured. Set GEMINI_API_KEY environment variable.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `Analyze this meal photo and provide nutritional information.

TASK:
Identify the foods and estimate calories and protein in JSON format:

{
  "foods": ["food item 1", "food item 2"],
  "calories": 450,
  "protein": 25,
  "confidence": 0.8
}

RULES:
- Be conservative with calorie estimates (better to underestimate)
- List main food items
- Provide reasonable confidence (0.0-1.0)
- If unclear, state "Unable to identify" in foods array
- Return ONLY valid JSON, no markdown`;

  try {
    const imagePart = {
      inlineData: {
        data: input.imageBase64,
        mimeType: input.mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart], {
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300,
      },
    });

    const response = result.response;
    const text = response.text();

    // Remove markdown code blocks if present
    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysisData = JSON.parse(cleanedText);

    return {
      foods: analysisData.foods || [],
      calories: analysisData.calories || 0,
      protein: analysisData.protein || 0,
      confidence: analysisData.confidence || 0.5,
      rawResponse: text,
    };
  } catch (error: any) {
    console.error("Meal analysis error:", error);
    throw new Error(`Failed to analyze meal: ${error.message}`);
  }
}

/**
 * Generate weekly program adjustments based on performance
 */
export async function generateProgramAdjustments(
  userContext: any,
  previousWeekPerformance: any,
  currentProgram: any
): Promise<any> {
  if (!genAI) {
    throw new Error("Gemini API not configured. Set GEMINI_API_KEY environment variable.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // Determine week classification context
  const weekType = previousWeekPerformance.weekType || "good";
  const isBadWeek = previousWeekPerformance.isBadWeek || false;
  const isRecoveryWeek = previousWeekPerformance.isRecoveryWeek || false;

  // Build week-type-specific context
  let weekTypeContext = "";
  if (isBadWeek && previousWeekPerformance.badWeekReasons) {
    weekTypeContext = `\nWEEK CLASSIFICATION: BAD WEEK
Reasons: ${previousWeekPerformance.badWeekReasons.join(", ")}
User Notes: ${previousWeekPerformance.userNotes || "None"}
IMPORTANT: This was a tough week. DO NOT penalize or push harder. Be supportive.`;
  } else if (isRecoveryWeek) {
    weekTypeContext = `\nWEEK CLASSIFICATION: RECOVERY WEEK
This was a recovery week with simplified goals (4 workouts instead of 6).
IMPORTANT: Celebrate completion! Recovery is about rebuilding momentum, not pushing limits.`;
  } else if (weekType === "excellent") {
    weekTypeContext = `\nWEEK CLASSIFICATION: EXCELLENT WEEK (90%+ performance)
User crushed it this week! Consider progression if appropriate.`;
  } else if (weekType === "inconsistent") {
    weekTypeContext = `\nWEEK CLASSIFICATION: INCONSISTENT WEEK (50-70% completion)
Performance was spotty. Focus on consistency before progression.`;
  }

  const prompt = `You are an expert coach adjusting a training program based on actual performance.

USER CONTEXT:
Age: ${userContext.age}
Current Weight: ${userContext.currentWeight}kg
Goals: ${userContext.goals}
${weekTypeContext}

LAST WEEK'S PERFORMANCE:
- Workouts Completed: ${previousWeekPerformance.workoutsCompleted}/${previousWeekPerformance.workoutsPlanned}
- Nutrition: ${previousWeekPerformance.nutritionDaysHitTarget}/7 days on target
- Weight Change: ${previousWeekPerformance.weightChange}kg (target: ${previousWeekPerformance.weightChangeTarget}kg)
- Avg Extra Rest: ${previousWeekPerformance.avgExtraRest}s
- Exercise Feelings: ${JSON.stringify(previousWeekPerformance.exerciseFeelings || {})}

CURRENT PROGRAM:
${JSON.stringify(currentProgram, null, 2)}

TASK:
Provide specific adjustments for next week in JSON format:

{
  "adjustments": {
    "exerciseName1": {
      "action": "increase_weight|maintain|decrease_weight|increase_volume|decrease_volume",
      "from": "current value",
      "to": "new value",
      "reasoning": "why this change"
    }
  },
  "weeklyFocus": "what to focus on this week",
  "nutritionGuidance": "specific nutrition advice",
  "restReminder": "if extra rest is an issue"
}

RULES:
- BAD WEEK: Maintain or reduce. DO NOT increase anything. Focus message: "This week is about showing up."
- RECOVERY WEEK: If completed successfully, return to normal volume but maintain weights. Celebrate!
- EXCELLENT WEEK: Consider small progression (2.5-5% weight increase) if form was easy
- INCONSISTENT WEEK: Maintain everything. Focus on completion consistency
- Increase weight only if exercise marked "Easy" for 2+ weeks AND hitting top of rep range
- Maintain if marked "Good" consistently
- Decrease if marked "Hard" or failing reps
- Consider age (conservative for 35+)
- Consider nutrition quality (don't push hard if nutrition poor)
- Consider extra rest patterns (too much = weight too heavy OR focus issue)
- Return ONLY valid JSON`;

  try {
    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800,
      },
    });

    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const adjustments = JSON.parse(cleanedText);

    return adjustments;
  } catch (error: any) {
    console.error("Program adjustment error:", error);
    throw new Error(`Failed to generate adjustments: ${error.message}`);
  }
}

/**
 * Generate weekly review with insights and recommendations
 */
export async function generateWeeklyReview(input: WeeklyReviewInput): Promise<any> {
  if (!genAI) {
    throw new Error("Gemini API not configured. Set GEMINI_API_KEY environment variable.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const weightChange = input.weekData.weightEnd - input.weekData.weightStart;
  const workoutCompletion = (input.weekData.workoutsCompleted / input.weekData.workoutsPlanned) * 100;
  const nutritionConsistency = (input.weekData.nutritionDaysHitTarget / 7) * 100;

  // Determine week classification and build context
  const weekType = input.weekData.weekType || "good";
  const isBadWeek = input.weekData.isBadWeek || false;
  const isRecoveryWeek = input.weekData.isRecoveryWeek || false;

  // Build week-type-specific coaching instructions
  let weekTypeInstructions = "";

  if (isBadWeek && input.weekData.badWeekReasons) {
    weekTypeInstructions = `
WEEK TYPE: BAD WEEK
User indicated these reasons: ${input.weekData.badWeekReasons.join(", ")}
User notes: "${input.weekData.userNotes || "None provided"}"

CRITICAL COACHING INSTRUCTIONS FOR BAD WEEKS:
- DO NOT criticize or show disappointment
- DO NOT mention "getting back on track" or "doing better"
- DO focus on empathy: "Life happens. This is normal."
- DO normalize the experience: "Tough weeks are part of the journey."
- DO look forward: "Next week is a fresh start with simplified goals."
- Tone must be: supportive, understanding, no-penalty
- aiSummaryText should acknowledge their honesty and reassure them
- Avoid any language that implies failure or falling behind`;
  } else if (isRecoveryWeek) {
    weekTypeInstructions = `
WEEK TYPE: RECOVERY WEEK
This was a recovery week with reduced goals (4 workouts instead of 6, easier nutrition targets).

COACHING INSTRUCTIONS FOR RECOVERY WEEKS:
- CELEBRATE any completion, even if imperfect
- Focus on: "You showed up when it was hard. That's what matters."
- Acknowledge: "Recovery is about rebuilding momentum, not perfection."
- If they completed 4/4 workouts: "You crushed the recovery week! Ready to level back up."
- If they completed 2-3/4: "Progress! You're rebuilding. Keep going."
- Tone must be: encouraging, celebratory, momentum-focused
- aiSummaryText should celebrate their resilience`;
  } else if (weekType === "excellent") {
    weekTypeInstructions = `
WEEK TYPE: EXCELLENT WEEK (90%+ performance)

COACHING INSTRUCTIONS FOR EXCELLENT WEEKS:
- CELEBRATE hard! Use words like: "crushed", "dominated", "incredible"
- Acknowledge their discipline and consistency
- Suggest they're ready for progression if weights felt easy
- Tone must be: enthusiastic, proud, motivating
- aiSummaryText should pump them up and acknowledge their dedication`;
  } else if (weekType === "inconsistent") {
    weekTypeInstructions = `
WEEK TYPE: INCONSISTENT WEEK (50-70% completion)

COACHING INSTRUCTIONS FOR INCONSISTENT WEEKS:
- Acknowledge what they DID accomplish (glass half full)
- Gently probe: "What got in the way? Can we remove obstacles?"
- Focus on: "Let's aim for consistency this week. Small wins add up."
- Avoid harsh language, but be honest about need for more consistency
- Tone must be: realistic, solution-focused, encouraging
- aiSummaryText should motivate toward consistency without guilt`;
  }

  const prompt = `You are an empathetic fitness coach providing a weekly review.

USER: ${input.userContext.age}yo, ${input.userContext.currentWeight}kg
GOALS: ${input.userContext.goals}

WEEK SUMMARY:
- Workouts: ${input.weekData.workoutsCompleted}/${input.weekData.workoutsPlanned} (${workoutCompletion.toFixed(0)}%)
- Nutrition: ${input.weekData.nutritionDaysHitTarget}/7 days hit targets (${nutritionConsistency.toFixed(0)}%)
- Weight: ${input.weekData.weightStart}kg → ${input.weekData.weightEnd}kg (${weightChange >= 0 ? "+" : ""}${weightChange.toFixed(1)}kg, target: ${input.weekData.weightChangeTarget >= 0 ? "+" : ""}${input.weekData.weightChangeTarget}kg)
- Avg Extra Rest: ${input.weekData.avgExtraRest}s
${weekTypeInstructions}

TASK:
Generate a week-type-appropriate review in JSON format:

{
  "tone": "encouraging|supportive|celebratory|concerned|neutral",
  "weightSummary": "1 sentence about weight progress (adjust tone to week type)",
  "workoutSummary": "1 sentence about training (adjust tone to week type)",
  "nutritionSummary": "1 sentence about eating (adjust tone to week type)",
  "patternsDetected": [
    {
      "observation": "what you noticed",
      "significance": "why it matters"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific thing to do",
      "reasoning": "why this helps",
      "expectedImpact": "what improves"
    }
  ],
  "aiSummaryText": "2-3 sentence motivational summary (MUST match week type tone)"
}

TONE GUIDE BY WEEK TYPE:
- BAD WEEK: tone = "supportive" - No criticism, only empathy and looking forward
- RECOVERY WEEK: tone = "encouraging" - Celebrate showing up, acknowledge resilience
- EXCELLENT WEEK: tone = "celebratory" - Enthusiastic praise, acknowledge hard work
- INCONSISTENT WEEK: tone = "encouraging" - Acknowledge what worked, focus on consistency
- GOOD WEEK: tone = "encouraging" - Positive reinforcement, keep momentum

CRITICAL: Match your language precisely to the week type instructions above.

Return ONLY valid JSON`;

  try {
    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
      },
    });

    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const review = JSON.parse(cleanedText);

    return review;
  } catch (error: any) {
    console.error("Weekly review generation error:", error);
    throw new Error(`Failed to generate review: ${error.message}`);
  }
}

/**
 * Analyze voice-transcribed meal text
 */
export async function analyzeMealText(mealText: string): Promise<MealAnalysisResult> {
  if (!genAI) {
    throw new Error("Gemini API not configured. Set GEMINI_API_KEY environment variable.");
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const prompt = `Analyze this meal description and estimate nutrition.

MEAL: "${mealText}"

TASK:
Provide nutritional estimates in JSON format:

{
  "foods": ["food1", "food2"],
  "calories": 450,
  "protein": 25,
  "confidence": 0.7
}

RULES:
- Be conservative (better to underestimate)
- Use common portion sizes if not specified
- Return ONLY valid JSON`;

  try {
    const result = await model.generateContent(prompt, {
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 200,
      },
    });

    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysisData = JSON.parse(cleanedText);

    return {
      foods: analysisData.foods || [],
      calories: analysisData.calories || 0,
      protein: analysisData.protein || 0,
      confidence: analysisData.confidence || 0.6,
      rawResponse: text,
    };
  } catch (error: any) {
    console.error("Meal text analysis error:", error);
    throw new Error(`Failed to analyze meal text: ${error.message}`);
  }
}
