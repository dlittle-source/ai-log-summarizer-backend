require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 5000;

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env file");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

app.use(cors());
app.use(limiter);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI Log Summarizer API is running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "ai-log-summarizer-api",
    version: "1.0.1",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { logs } = req.body;

    if (!logs || typeof logs !== "string" || logs.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: "Please provide valid logs with at least 10 characters.",
      });
    }

    const prompt = `
You are an expert DevOps and Cloud Engineer.

Analyze the following logs and return ONLY valid JSON.

Logs:
${logs}

Return this JSON structure:
{
  "summary": "plain English summary of what happened",
  "likely_root_cause": "most likely root cause",
  "severity": "Low | Medium | High | Critical",
  "recommended_fix_steps": [
    "step 1",
    "step 2",
    "step 3"
  ],
  "prevention_tips": [
    "tip 1",
    "tip 2"
  ]
}
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    const rawText = response.output_text;
    const analysis = JSON.parse(rawText);

    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("AI analysis failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to summarize logs. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI Log Summarizer API running on port ${PORT}`);
});