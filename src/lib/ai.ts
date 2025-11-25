const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Fallback tips for common exercises
const FALLBACK_TIPS: Record<string, string> = {
  default: "Focus on proper form, controlled movements, and consistent breathing throughout the exercise.",
  bench: "Keep your feet flat on the floor, shoulder blades pinched together, and lower the bar to mid-chest with control.",
  squat: "Keep your core tight, chest up, and push your knees out over your toes as you descend to parallel.",
  deadlift: "Maintain a neutral spine, drive through your heels, and keep the bar close to your body throughout the lift.",
  press: "Engage your core, avoid arching your back excessively, and press in a slight arc path for shoulder health.",
  curl: "Keep your elbows stationary, avoid swinging, and focus on squeezing at the top of the movement.",
  row: "Retract your shoulder blades, pull to your lower chest/upper abdomen, and avoid using momentum.",
  pull: "Initiate with your lats, not your arms, and focus on pulling your elbows down and back.",
  lunge: "Keep your front knee tracking over your toes and maintain an upright torso throughout the movement.",
  plank: "Keep your body in a straight line from head to heels, engage your core, and breathe steadily.",
};

function getFallbackTip(workoutName: string): string {
  const name = workoutName.toLowerCase();
  for (const [key, tip] of Object.entries(FALLBACK_TIPS)) {
    if (key !== "default" && name.includes(key)) {
      return tip;
    }
  }
  return FALLBACK_TIPS.default;
}

export async function generateWorkoutTip(workoutName: string): Promise<string> {
  // If no API key, return fallback immediately
  if (!GEMINI_API_KEY) {
    console.log("No Gemini API key, using fallback tip");
    return getFallbackTip(workoutName);
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a professional fitness coach. Give one concise, practical tip (2-3 sentences max) for performing the exercise "${workoutName}" with proper form and maximum effectiveness. Focus on form, breathing, or common mistakes to avoid. Do not use markdown formatting.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return getFallbackTip(workoutName);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      return text.trim();
    }

    return getFallbackTip(workoutName);
  } catch (error) {
    console.error("AI tip generation error:", error);
    return getFallbackTip(workoutName);
  }
}

// Async tip generation - doesn't block workout creation
export async function generateWorkoutTipAsync(workoutId: string, workoutName: string): Promise<void> {
  // Import prisma dynamically to avoid circular dependencies
  const { prisma } = await import("./prisma");

  try {
    const tip = await generateWorkoutTip(workoutName);
    await prisma.workout.update({
      where: { id: workoutId },
      data: { aiTip: tip },
    });
  } catch (error) {
    console.error("Failed to update workout tip:", error);
  }
}
