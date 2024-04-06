const Express = require('express');
const Morgan = require('morgan');
const BodyParser = require('body-parser');
const stream = require('stream');
const fs = require('fs');
const session = require('express-session');
const { Writable } = stream;
const { insert_new_blogpost,
    create_new_user,
    login_user,
} = require('./private/db_func.js');
const { blog_post } = require('./private/blogpost.js');

const app = Express();
const PORT = 9999;

// Body parser
app.use(BodyParser.urlencoded({ extended: true }));

// Morgan
app.use(Morgan('dev'));
app.set('view engine', 'ejs');
app.use(Express.static('public'));
app.use(Express.json());

// Create a session 
app.use(session
    ({
        secret: 'secret',
        resave: true,
        saveUninitialized: true,
        username: ''
    }));


// Create a write stream (append mode) to the log file
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}
const logStream = fs.createWriteStream('./logs/access.log', { flags: 'a' });

// Use Morgan middleware with the write stream
app.use(Morgan('combined', { stream: logStream }));


app.get('/', (req, res) => {
    // If the user is logged in, render the index page with the session data
    if (req.session.username) {
        res.render('index.ejs', { session: req.session });
    } else {
        res.render('index.ejs');
    }
});

app.get("/writeups", (req, res) => {
    // Render the writeups page
    // If session is active, render the page with the session data
    if (req.session.username) {
        res.render("writeups.ejs", { session: req.session });
    } else {
        // Otherwise just the default page with the signup/login message
        res.render("writeups.ejs");
    }
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    login_user(username, password, callback => {
        if (callback) {
            console.log(`User ${username} logged in successfully`);
            // Set the session username to the username
            req.session.username = username;
            // Send user to app.get("/") if login is successful
            console.log(req.session);
            res.redirect("/");
        }
        else {
            // Send user to app.get("/") if login fails
            res.render("index.ejs",
                {
                    errMSG: "Invalid username or password",
                    loginMode: true
                });
        }
    });
});

app.get("/usrLogin", (req, res) => {
    // User loginpage
    res.render("index.ejs",
        {
            loginMode: true
        });
});

app.get("/usrSignup", (req, res) => {
    // User signup page
    res.render("index.ejs",
        {
            loginMode: false
        });
});

// Create a new user from the terminal interface
app.get("/createnewuser", (req, res) => {
    // Fetch the query parameters
    const query = req.query;
    const username = query.user;
    const password = query.password;
    create_new_user(username, password, callback => {
        if (callback) {
            res.send("User created successfully");
            console.log(`User ${username} created successfully`);
        } else {
            res.send("User already exists");
            console.log(`User ${username} attempted to be created but already exists`);
        }
    });
});

app.get("/terminal", (req, res) => {
    res.render("terminal.ejs");
});

app.post("/signup", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(username, password);
    create_new_user(username, password, callback => {
        if (callback) {
            console.log(`User ${username} created successfully`);
            // Set the session username to the username
            req.session.username = username;
            // Send user to app.get("/") if login is successful
            res.redirect("/");
        } else {
            // Send user to signup page with errMsg
            res.render("index.ejs",
                {
                    errMSG: "Either the username is already taken, or the password is invalid. Please try again.",
                    loginMode: false
                });
            console.log(`User ${username} attempted to be created but already exists`);
        }
    });
});

app.post("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy();
    res.render("index.ejs");
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});