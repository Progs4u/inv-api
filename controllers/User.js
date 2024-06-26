const User = require ("../models/User");
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
        // ensuring that user will be within user group during creation
        req.body.role = 'user'
        // hash the password
        req.body.password = await bcrypt.hash(req.body.password, 10);
        // create a new user
        const user = await User.create(req.body);
        log.white("SIGNUP", `User ${user.username} created`);
        
        const userResponse = user.toObject();
        delete userResponse.password;

        // send new user as response
        res.status(200).json({ message: userResponse});
    } catch (error) {
        console.error("Error creating user:", error);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ error: "Something went wrong!", details: error.message });
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
        log.yellow("LOGIN", `Login attempt by ${req.body.username}`);

        //handle user
        if (user) {
            //check if password matches
            const result = await bcrypt.compare(req.body.password, user.password);
            if (result) {
                //sign token and send it in response
                const token = jwt.sign({ username: user.username, role: user.role}, SECRET, {
                    algorithm: "HS256", // algorithm used for header and payload encryption
                    allowInsecureKeySizes: true, // allow bigger key sizes - will check later what it exactly mean
                    expiresIn: "8h" // token will expire in 8 hours
                });

                //log user for reference
                log.white("LOGIN", `User ${user.username} logged in!`);
                
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

router.get("/logout", isLoggedIn, (req, res) => {
    //receive token from the header, remove bearer argument
    const token = req.headers.authorization.split(" ")[1];
    //if token is valid, revoke it
    revokeToken(token);
    log.white("LOGOUT", `User ${req.user.username} logged out and token revoked!`);
    res.status(200).json({ message: `User ${req.user.username} logged out!` });
});


const crypto = require('crypto');

// Request password reset
router.post('/request-reset', [
  body('username').notEmpty().withMessage('Username cannot be empty!'),
  body('password').notEmpty().withMessage('Please enter a new password.').isLength({ min: 8, max: 100 }).withMessage('Password must be between 8 and 100 characters!'),
 
], async (req, res) => {
    const { User } = req.context.models;
    const { username } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now

    await user.save();

  res.json({
    message: 'Password reset token generated.',
    resetToken,
    resetUrl: `https://localhost:3001/reset/${resetToken}`
  });
});

// Reset password
router.post('/reset/:token', async (req, res) => {
    try {
      const { User } = req.context.models;
      const { token } = req.params;
      const { password } = req.body;
  
      // Check for empty password
      if (!password || password.trim() === '') {
        return res.status(400).json({ error: 'Password cannot be empty.' });
      }
  
      // Check password length
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
  
      // Find user by reset token and check if it's expired
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
  
      if (!user) {
        return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
      }
  
      // At this point, we know we have a valid user with a valid token
  
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({ error: 'New password must be different from the old password.' });
      }
  
      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
  
      await user.save();
  
      res.json({ message: 'Password has been reset.' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: 'An error occurred while resetting the password.' });
    }
  });
  

  router.post('/create-admin', [
    body('username').notEmpty().withMessage('Username cannot be empty!'),
    body('password').notEmpty().withMessage('Please enter a password.'),
  ], async (req, res) => {
    const { User } = req.context.models;
    const { username, password } = req.body;
  
    try {
      console.log('Received request to create admin:', { username });
  
      if (!password || password.trim() === '') {
        return res.status(400).json({ error: 'Password cannot be empty.' });
      }
  
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
  
      const existingAdmin = await User.findOne({ role: 'admin' });
      console.log('Existing admin:', existingAdmin);
  
      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin user already exists!' });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username,
        password: hashedPassword,
        role: 'admin'
      });
  
      console.log('New admin user object:', user);
      await user.save();
      console.log('Admin user saved successfully');
  
      return res.status(200).json({ message: 'Admin user created successfully', user: user.toObject() });
    } catch (error) {
      console.error('Error in create-admin route:', error);
      res.status(500).json({ error: 'Something went wrong!', details: error.message });
    }
  });



    // Delete own account
    router.delete('/delete', isLoggedIn, async (req, res) => {
        const { User } = req.context.models;
        try {
            const user = await User.findOneAndDelete({ username: req.user.username });
            console.log(user);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            log.white("DELETE USER", `User ${req.user.username} deleted their own account`);
            res.json({ message: 'User account deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Something went wrong!' });
        }
    });


    

module.exports = router;