// server.js
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const say = require("say");
const fs = require("fs");
const path = require("path");

const app = express();

// ✅ CORS configuration
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
};

// Apply to all routes
app.use(cors(corsOptions));
app.use(express.json());



const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAX8gSiUt_C7ylqVtzSzGrPrB--v77rxoc";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// TTS endpoint
app.post("/tts", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // 1️⃣ Generate text using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    let geminiText = result.response.text();
    geminiText = geminiText.replace(/[^a-zA-Z. ]+/g, ""); // clean text

    // 2️⃣ Generate TTS
    const tmpWav = path.join(__dirname, `tmp_${Date.now()}.wav`);
    const voice = "Microsoft Zira Desktop"; // adjust if needed
    const speed = 0.8;

    say.export(geminiText, voice, speed, tmpWav, (err) => {
      if (err) {
        console.error("TTS generation failed:", err);
        return res.status(500).json({ error: "TTS generation failed", details: err.message });
      }

      // 3️⃣ Stream file to client
      res.setHeader("Content-Type", "audio/wav");
      const readStream = fs.createReadStream(tmpWav);
      readStream.pipe(res);

      // Cleanup after streaming
      readStream.on("close", () => {
        fs.unlink(tmpWav, () => {});
      });
    });

  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Gemini API failed", details: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

