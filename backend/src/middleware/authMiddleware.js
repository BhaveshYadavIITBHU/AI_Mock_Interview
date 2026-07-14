const jwt = require('jsonwebtoken');

const authenticateToken = (req,res,next) =>{
    // 1) Get the token from the request header
    const authHeader = req.headers['authorization'];

    // The header usually looks like "Bearer eyJhbGci..." so we split it to get just the token
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        return res.status(401).json({
            error: "Access Denied. No token provided"
        });
    }

    //2) Verify the token using your secret key
    jwt.verify(token,process.env.JWT_SECRET,(err,user)=>{
        if(err){
            return res.status(403).json({
                  error:"Invalid or expired token."
            });
        }

        //3) If valid ,attach the decode user info to the request and move to the next step
        req.user = user;
        next();
    });

};

module.exports = authenticateToken;