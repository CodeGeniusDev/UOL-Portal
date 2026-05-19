
async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.error) {
            console.error("API Error:", data.error.message);
            return;
        }
        console.log("Available models from API:");
        data.models.forEach((m) => console.log(`- ${m.name} (${m.displayName})`));
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}

listModels();
