const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const pdf = require('pdf-parse');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Initialize the Gemini API client
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Added a hard 5MB limit to protect the server
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// ---------------------------------------------------------
// 1. GENERATE & SAVE INTERVIEW (POST /api/interview/generate)
// ---------------------------------------------------------
router.post('/generate', authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        const { jobRole, techStack, experience } = req.body;

        if (!jobRole || !techStack) {
            return res.status(400).json({ error: "Job role and tech stack are required." });
        }

        // 1) Extract text if resume was uploaded 
        let resumeText = "";
        if (req.file && req.file.buffer) {
            try {
               
                if (pdf && pdf.PDFParse) {
                    const parser = new pdf.PDFParse({ data: req.file.buffer });
                    const pdfData = await parser.getText();
                    resumeText = pdfData.text || "";
                    await parser.destroy().catch(() => {});
                } 
                // Fallback to pdf-parse v1 
                else {
                    const parsePdf = typeof pdf === 'function' ? pdf : pdf.default;
                    if (typeof parsePdf === 'function') {
                        const pdfData = await parsePdf(req.file.buffer);
                        resumeText = pdfData.text || "";
                    } else {
                        console.error("PDF parsing skipped: Unrecognized pdf-parse library structure.");
                    }
                }
            }
            catch(err) {
                console.error("PDF Parsing error:", err);
            }
        }

        // Using  model
        const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `
            You are an expert technical interviewer. Generate a technical interview assessment based on these criteria:
            - Target Job Role: ${jobRole}
            - Core Tech Stack / Skills: ${techStack}
            - Candidate Experience Level: ${experience} years

            ${resumeText ? `
            Additionally, here is the candidate's actual resume text. 
            Tailor some of the questions to their specific past projects, achievements, or listed skills found here:
            """${resumeText}"""
            ` : ''}
            
            Requirements:
            - Generate exactly 15 questions in total.
            - The first 10 questions MUST be multiple-choice type ("type": "mcq") with exactly 4 distinct options.
            - The final 5 questions MUST be detailed open-ended response type ("type": "text"). Do not include options for these.
            - Match the difficulty level perfectly to the candidate's years of experience.
            - IMPORTANT: DO NOT include the correct solution or reveal the answer anywhere in your JSON response output. 
              The 'answer' property field for all questions MUST be strictly returned as an empty string ("").
            
            Return the output strictly as a JSON array matching the schema specification below. Do not wrap it in markdown code blocks.
        `;

        const responseSchema = {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    id: { type: "INTEGER" },
                    type: { type: "STRING", enum: ["mcq", "text"] },
                    text: { type: "STRING" },
                    options: { type: "ARRAY", items: { type: "STRING" } },
                    answer: { type: "STRING" },
                    status: { type: "STRING" }
                },
                required: ["id", "type", "text", "answer", "status"]
            }
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7
            }
        });

        const parsedQuestions = JSON.parse(result.response.text());
        const currentUserId = req.user.userId || req.user.id; 

        const newInterview = await prisma.interview.create({
            data: {
                userId: currentUserId,
                topic: jobRole,
                difficulty: String(experience),
                questions: {
                    create: parsedQuestions.map((q) => ({
                        type: q.type,
                        text: q.text,
                        options: q.options || [], 
                        answer: "", // Clear empty string so answers never leak during test setup
                        status: "not_visited"
                    }))
                }
            }
        });

        res.status(201).json({ interviewId: newInterview.id });

    } catch (error) {
        console.error("CRITICAL GENERATION CRASH LOG:", error);
        
        if (error.status === 503 || error.status === 429) {
            return res.status(error.status).json({ 
                error: "AI service is currently experiencing a temporary demand spike or daily limit lockout. Please wait a moment and try again." 
            });
        }
        res.status(500).json({ error: "Internal server error during generation.", details: error.message });
    }
});

// ---------------------------------------------------------
// 2. GET INTERVIEW HISTORY
// ---------------------------------------------------------
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const history = await prisma.interview.findMany({
            where: { userId: req.user.userId || req.user.id },
            include: { questions: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// ---------------------------------------------------------
// 3. GET SPECIFIC SESSION
// ---------------------------------------------------------
router.get('/session/:id', authenticateToken, async (req, res) => {
    try {
        const interview = await prisma.interview.findUnique({
            where: { id: req.params.id },
            include: { questions: true } 
        });
        res.json(interview);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch details" });
    }
});

// ---------------------------------------------------------
// 4. SUBMIT AND GRADE INTERVIEW 
// ---------------------------------------------------------
router.post('/session/:id/submit', authenticateToken, async (req, res) => {
    try {
        const { answers } = req.body; 
        const interviewId = req.params.id;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: "No answers provided for grading." });
        }
        
        const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `
            You are an expert technical interviewer and evaluator. 
            Analyze the following submitted answers from a technical interview session. 
            Grade the candidate's answers critically based on standard industry benchmarks for their target role.
            
            Submission Data to Evaluate: 
            ${JSON.stringify(answers)}

            Requirements:
            1. Calculate an overall total performance score between 0 and 100.
            2. Review each individual question and provide a numeric rating (0 to 10) and robust professional textual feedback explaining why. Make sure to reference the question database ID string ("id") accurately in the response array so we can match it back to our records.
            
            Return the output strictly matching the JSON schema parameters provided below. Do not include markdown code ticks.
        `;

        const gradingSchema = {
            type: "OBJECT",
            properties: {
                overallScore: { type: "INTEGER" },
                evaluations: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            questionId: { type: "STRING" }, 
                            rating: { type: "INTEGER" },
                            feedback: { type: "STRING" }
                        },
                        required: ["questionId", "rating", "feedback"]
                    }
                }
            },
            required: ["overallScore", "evaluations"]
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: gradingSchema,
                temperature: 0.2 
            }
        });

        let rawText = result.response.text().trim();
        if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```json/, "").replace(/^```/, "").trim();
        }
        
        let evaluationData;
        try {
            evaluationData = JSON.parse(rawText);
        } catch (e) {
            console.error("AI grading payload failed parsing validation. Raw text:", rawText);
            return res.status(500).json({ error: "AI grading output failed structural validation checks." });
        }

        // 1) Save overall calculated score
        await prisma.interview.update({
            where: { id: interviewId },
            data: { score: evaluationData.overallScore }
        });

        // 2) Write user answers alongside AI ratings and textual feedback items back down to Question entries
        await Promise.all(
            answers.map(async (userAns) => {
                const matchingEval = evaluationData.evaluations.find(
                    (ev) => String(ev.questionId) === String(userAns.id)
                );

                return prisma.question.update({
                    where: { id: userAns.id },
                    data: {
                        answer: userAns.answer || "", 
                        rating: matchingEval ? matchingEval.rating : 0, 
                        aiFeedback: matchingEval ? matchingEval.feedback : "No feedback generated." 
                    }
                });
            })
        );

        res.json({ score: evaluationData.overallScore });
    } catch (error) {
        console.error("CRITICAL SUBMISSION CRASH LOG:", error);
        if (error.status === 503 || error.status === 429) {
            return res.status(error.status).json({ 
                error: "AI service is busy or you have reached your daily request quota. Please wait a moment and try again." 
            });
        }
        res.status(500).json({ error: "Failed to grade interview due to an internal server exception.", details: error.message });
    }
});

// ---------------------------------------------------------
// 5. GET DASHBOARD ANALYTICS
// ---------------------------------------------------------
router.get('/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userInterviews = await prisma.interview.findMany({
            where: { userId, score: { not: null } },
            select: { score: true }
        });

        const total = userInterviews.length;
        const avg = total > 0 ? Math.round(userInterviews.reduce((a, b) => a + b.score, 0) / total) : 0;

        res.json({ totalInterviews: total, averageScore: avg });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File too large (Max 5MB)." });
    }
    next(error);
});

module.exports = router;