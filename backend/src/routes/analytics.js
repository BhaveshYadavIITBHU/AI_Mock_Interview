const express = require('express');
const {PrismaClient} = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

//Get user analytics (GET /analytics)
router.get('/',async(req,res)=>{

    try{
        // 1) Fetch all completed interviews for the user

        const interviews = await prisma.interview.findMany({
            where:{
                userId : req.user.userId,
                score : {not:null} // Only count finished interviews
            }
        });

        // 2) Calculate total interviews
        const totalInterviews = interviews.length;

        // 3) Calculate average score
        const averageScore = totalInterviews>0 ?Math.round(interviews.reduce((acc,curr)=> acc+curr.score,0)/totalInterviews):0;

        //Send the aggregated data back to power frontent dashboard

        res.json({
            totalInterviews,
            averageScore,
            recentInterviews : interviews.slice(0,5) // Send the 5 most recent interview
        });
    }
    catch(error){
       console.error(error);
       res.status(500).json({ error : "Failed to fetch analytics"});
    }
});

module.exports =  router;