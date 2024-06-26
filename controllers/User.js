require("dotenv").config(); // import dotenv
const { Router } = require('express'); // import express router
const bcrypt = require("bcrypt"); // import bcrypt
const jwt = require("jsonwebtoken"); // import jsonwebtoken
const { body, validationResult } = require("express-validator"); // import express-validator

const router = Router(); // create express router for route bundle

//ENV VARIABLES WITH DEFAULTS
const { SECRET } = process.env;

//RATE LIMITER FOR AVOIDING BRUTFORCE ATTACKS
const rateLimit = require('express-rate-limit');
const { log } = require('mercedlogger');
const { isLoggedIn, revokeToken } = require("../middlewares/global");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

const refreshLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many refresh attempts from this IP, please try again after 1 hour'
});

//Signup test route
router.get("/signup", (req, res) => {
    res.json({ message: "Signup route. Use POST statement with username and password to register!" });
})

//Signup post - create new user
router.post("/signup", [
    //validation of username and password fields
    body("username").notEmpty().withMessage("Username cannot be empty!"),
    body("password").notEmpty().withMessage("Password cannot be empty!")
], async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }    

    //import context model for User
    const { User } = req.context.models;

    //create user object
    try {
        //check if user already exists
        if (await User.findOne({ username: req.body.username })) {
            return res.status(400).json({ error: "User already exists!" });
        }

        // hash the password
        req.body.password = await bcrypt.hash(req.body.password, 10);
        // create a new user
        const user = await User.create(req.body);
        // send new user as response
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Something went wrong!" });
    }
});

//Login route to verify a user and get a token
router.post("/login", loginLimiter, [
    //validation of username and password
    body("username").notEmpty().withMessage("Username cannot be empty!"),
    body("password").notEmpty().withMessage("Password cannot be empty!")
], async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }    

    //import context model for User
    const { User } = req.context.models;
    try {
        // check if user exists
        const user = await User.findOne({ username: req.body.username });
        // log login-attempt by anyone
        log.red("LOGIN", `Login attempt by ${req.body.username}`);

        //handle user
        if (user) {
            //check if password matches
            const result = await bcrypt.compare(req.body.password, user.password);
            if (result) {
                //sign token and send it in response
                const token = jwt.sign({ username: user.username }, SECRET, {
                    algorithm: "HS256", // algorithm used for header and payload encryption
                    allowInsecureKeySizes: true, // allow bigger key sizes - will check later what it exactly mean
                    expiresIn: "8h" // token will expire in 8 hours
                });

                //log user for reference
                log.yellow("LOGIN", `User ${user.username} logged in!`);
                
                //add token to user object
                user.token = token;

                //save object and send both (token, user) in response
                await user.save();
                res.json({ token, user });
            } else {
                // if passwords do not match
                res.status(401).json({ error: "Passwords do not match!" });
            }
        } else {
            // if user does not exist
            res.status(401).json({ error: "User not found!" });
        }
    } catch (error) {
        // if something went wrong
        res.status(500).json({ error: "Something went wrong!" });
    }
});

router.post("/logout", isLoggedIn, (req, res) => {
    //receive token from the header, remove bearer argument
    const token = req.headers.authorization.split(" ")[1];
    //if token is valid, revoke it
    revokeToken(token);
    res.json({ message: `User ${req.user.username} logged out!` });
});

module.exports = router;