require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// 1. Initialize the app exactly ONCE
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Global Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ai-mock-interview-xnfn.onrender.com'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(null, true); // Fallback gracefully for preview deployments
        }
    },
    credentials: true
}));

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(cookieParser());

// Rate Limiting for Interview Generation to protect AI quotas
const generationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 generation requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: "Too many interview requests generated from this IP. Please wait a few minutes before trying again." 
    }
});

// 3. Load Passport & Custom Middleware
require('./config/passport');
const authenticateToken = require('./middleware/authMiddleware');

// 4. Import Routes
const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interview');

// 5. Connect Routes
// Public/Auth routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

// Apply rate limiter specifically to interview generation
app.use('/api/interview/generate', generationLimiter);

// Protected routes (Protected by authenticateToken)
app.use('/api/interview', authenticateToken, interviewRoutes);

// 6. Health Check Route
app.get('/', (req, res) => {
    res.json({ message: "AI Mock Interview Backend is Live!" });
});

// 7. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});