const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1) Trigger the Google Login Screen
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2) The Callback (Where Google sends user after they log in)
// Notice we made this async so we can query the database!
router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res) => {
        
        // Generate short-lived Access Token
        const accessToken = jwt.sign(
            { userId: req.user.id },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Generate the long-lived Refresh Token
        const refreshToken = jwt.sign(
            { userId: req.user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );
      
        //  NEW USER CHECK 
        // Fetch the user from the database to check when they were created
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        // If the user was created in the last 30 seconds, they are brand new!
        const isNewUser = user && (new Date() - new Date(user.createdAt)) < 30000;

        // Send the tokens back to the client and redirect appropriately
        if (isNewUser) {
            res.redirect(`http://localhost:5173/dashboard?token=${accessToken}&isNew=true`);
        } else {
            res.redirect(`http://localhost:5173/dashboard?token=${accessToken}`);
        }
    }
);

// 3) Get Current User Profile (Protected Route)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: req.user.userId }
           
        });

        if (!userProfile) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(userProfile);
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ error: "Server error while fetching profile" });
    }
});

// 4) Update User Profile (Protected Route)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        const updatedUser = await prisma.user.update({
            where: { id: req.user.userId },
            data: { name }
        });
        
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;