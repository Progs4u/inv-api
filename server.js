// IMPORT MAJOR PACKAGES
require('dotenv').config(); // load .env

// HTTPS SUPPORT
const https = require('https'); // import https for attaching the app server ontop of https
const fs = require('fs'); // import fs for reading cert files

// Read SSL certificate
const privateKey = fs.readFileSync('./ssl/key.pem', 'utf-8');
const certificate = fs.readFileSync('./ssl/cert.pem', 'utf-8');
const credentials = { key: privateKey, cert: certificate };

const express = require("express") // import express framework
const morgan = require("morgan") // import morgan debuger
const cors = require("cors") // import cors middleware
const { log } = require('mercedlogger') // import mercedlogger's log function
const bodyParser = require("body-parser") // import body-parser middleware

// ENV VARIABLES WITH DEFAULT VALUES
const { PORT = 3000 } = process.env // get port from .env

// APPLICATION OBJECT
const app = express() // create express app

// GLOBAL MIDDLEWARE
app.use(cors()) // use cors middleware
app.use(morgan("dev")) // use morgan debuger
app.use(bodyParser.urlencoded({ extended: true})) // use body-parser middleware
app.use(bodyParser.json()) // use body-parser middleware JSON output

// CREATE CONTEXT GLOBALLY
const { createContext } = require("./middlewares/global")
app.use(createContext);

// Prevent app from crashing if validation fails MIDDLEWARE | to be combined with express-validator for forms
app.use((err, req, res, next) => { // catch the error stack if it exists within a req chain
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  // ROUTES
app.get("/", (req, res) => {
    res.send("Hello from the API Server!")
})
// import user routes / controller
app.use("/user", require("./controllers/User"));

// import isloggedin middleware
const { isLoggedIn } = require("./middlewares/global");
const { createPrivateKey } = require('crypto');
// test protected route
app.get("/protected", isLoggedIn, (req, res) => {
    res.json({
        message: "Protected route. You need to be logged in to access this route!"});
});

// Create HTTPS server
const httpsServer = https.createServer(credentials, app);

// APP LISTENER
httpsServer.listen(PORT, () => log.green("SERVER STATUS", `Listening on port ${PORT}`))