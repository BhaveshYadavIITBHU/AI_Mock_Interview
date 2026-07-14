const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback"
},
async(accessToken,refreshToken,profile,done)=>{
    try{
        //Check if the user already exits in our database
        let user = await prisma.user.findUnique({
            where:{googleId : profile.id}
        });

        // If they are new ,create an account for them

        if(!user){ 
            user = await prisma.user.create({
                data:{
                    googleId: profile.id,
                    name : profile.displayName,
                    email: profile.emails[0].value,
                }
            });
        }
     
     // Pass the user object to the next step
       return done(null,user);
    }
    catch(error){
        return done(error,null);
    }
}
));