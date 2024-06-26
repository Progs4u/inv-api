require("dotenv").config(); // importing dotenv
const jwt = require("jsonwebtoken"); // importing jsonwebtoken

const User = require("../models/User"); // importing user model
const { log } = require('mercedlogger'); // importing mercedlogger's log function

// SET SECRET FOR JWT
const { SECRET } = process.env;

const createContext = (req, res, next) =>  {
    // making objects accessable to all routes
    req.context = {
        models: {
            User
        }
    }
    log.green("CONTEXT", "Context created");
    next();
}

// BLACKLISTED TOKEN SET
const tokenBlacklist = new Set();
const revokeToken = (token) => {
    tokenBlacklist.add(token);
}

const isLoggedIn = async (req, res, next) => {
    try {
        if (req.headers.authorization) {
            // check if token exists, exclude word bearer
            const token = req.headers.authorization.split(" ")[1];
            if (token) {
                if (tokenBlacklist.has(token)) {
                    return res.status(401).json({ error: "Token is blacklisted!" });
                }
                const payload = await jwt.verify(token, SECRET);
                if (payload) {
                    req.user = payload;
                    log.green("TOKEN", "Token verified");
                    next();
                } else {
                    // invalid token
                    res.status(401).json({ error: "Token is invalid!" });
                }
            } else {
                // malformed header
                res.status(401).json({ error: "Malformed auth header" });
            }
        } else {
            // invalid header
            res.status(401).json({ error: "No auth header provided" });
        }
    } catch (error) {
        // verification error
        //console.error("Token error", error);
        log.red("TOKEN", "Token verification failed!");
        res.status(401).json({ error: "Token verification failed!" });

    }
}

// EXPORT MIDDLEWARE
module.exports = {
    createContext,
    isLoggedIn,
    revokeToken
}