const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const say = require("say");
const stream = require("stream");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAX8gSiUt_C7ylqVtzSzGrPrB--v77rxoc";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.post("/tts", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    // 1️⃣ Generate text using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    let geminiText = result.response.text();
    geminiText = geminiText.replace(/[^a-zA-Z. ]+/g, "");

    // 2️⃣ Generate TTS and send as response
    // say.export only works with files, so workaround: generate temp file and stream then delete
    const tmpWav = `tmp_${Date.now()}.wav`;
    const voice = "Microsoft Zira Desktop";
    const speed = 0.8;

    say.export(geminiText, voice, speed, tmpWav, (err) => {
      if (err) return res.status(500).json({ error: "TTS generation failed", details: err.message });

      // Stream file to client
      res.setHeader("Content-Type", "audio/wav");
      const readStream = fs.createReadStream(tmpWav);
      readStream.pipe(res);
      readStream.on("close", () => fs.unlink(tmpWav, () => {}));
    });

  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Gemini API failed", details: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
