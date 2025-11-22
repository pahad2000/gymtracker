const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function generateWorkoutTip(workoutName: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: `You are a professional fitness coach. Give one concise, practical tip (2-3 sentences max) for performing the exercise "${workoutName}" with proper form and maximum effectiveness. Focus on form, breathing, or common mistakes to avoid.`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate tip");
    }

    const data = await response.json();
    return data.response || "Focus on proper form and controlled movements.";
  } catch (error) {
    console.error("Ollama error:", error);
    return "Focus on proper form, controlled movements, and consistent breathing throughout the exercise.";
  }
}
