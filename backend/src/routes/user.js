const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true, avatar: true }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// Update user profile name
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const { name } = req.body;
        
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name }
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

module.exports = router;