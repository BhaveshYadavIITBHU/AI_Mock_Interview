require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// 1. Initialize the app exactly ONCE
const app = express();
const PORT = process.env.PORT || 5000;

// 2. Global Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

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
// Protected routes (Notice we apply authenticateToken here, so ALL routes inside interview.js are automatically protected)
app.use('/api/interview', authenticateToken, interviewRoutes);

// 6. Health Check Route
app.get('/', (req, res) => {
    res.json({ message: "AI Mock Interview Backend is Live!" });
});

// 7. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});