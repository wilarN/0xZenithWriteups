const Express = require('express');
const Morgan = require('morgan');
const BodyParser = require('body-parser');
const stream = require('stream');
const fs = require('fs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { Writable } = stream;
const { insert_new_blogpost,
    create_new_user,
    login_user,
    fetch_all_writeups,
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
        save_uninitialized: true,
        username: ''
    }));

// Rate limiter
const limiter = rateLimit({
    window_ms: 15 * 60 * 1000, // 15 min
    limit: 100, // limit each IP to 100 requests per window_ms
    standard_headers: true,
    legacy_headers: false,
})

app.use(limiter);

// Create a write stream (append mode) to the log file
if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs');
}
const log_stream = fs.createWriteStream('./logs/access.log', { flags: 'a' });

// Use Morgan middleware with the write stream
app.use(Morgan('combined', { stream: log_stream }));


app.get('/', async (req, res) => {
    // If the user is logged in, render the index page with the session data
    if (req.session.username) {

        // Writeups
        const all_writeups = await fetch_all_writeups();
        if(all_writeups){
            res.render('index.ejs', { session: req.session, writeups: all_writeups });
        }else{
            res.render('index.ejs', { session: req.session });
        }
    } else {
        res.render('index.ejs');
    }
});

app.get("/writeups", async (req, res) => {
    // Render the writeups page
    // If session is active, render the page with the session data
    if (req.session.username) {
        // Fetch potential writeups
        const writeups = await fetch_all_writeups();
        if (writeups === false) {
            console.log("Failed to fetch writeups or no writeups found");
            res.render("writeups.ejs", { session: req.session });
        } else {
            res.render("writeups.ejs", {
                session: req.session,
                writeups: writeups
            });
        }
        // Render page
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
                    err_msg: "Invalid username or password",
                    login_mode: true
                });
        }
    });
});

app.get("/usrLogin", (req, res) => {
    // User loginpage
    res.render("index.ejs",
        {
            login_mode: true
        });
});

app.get("/usrSignup", (req, res) => {
    // User signup page
    res.render("index.ejs",
        {
            login_mode: false
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
            console.log(callback);
            console.log(`User ${username} created successfully`);
            // Set the session username to the username
            req.session.username = username;
            // Send user to app.get("/") if login is successful
            res.redirect("/");
        } else {
            // Send user to signup page with err_msg
            res.render("index.ejs",
                {
                    err_msg: "Either the username is already taken, or the password is invalid. Please try again.",
                    login_mode: false
                });
            console.log(`User ${username} attempted to be created but already exists`);
        }
    });
});

app.post("/createWriteup", async (req, res) => {
    if (!req.session.username) {
        res.redirect("/");
    }
    const title = req.body.title;
    const content = req.body.content;
    const author = req.session.username;

    new_post = new blog_post(title, content, author);
    try {
        const result = await insert_new_blogpost(new blog_post(title, content, author));
        if (result) {
            console.log(`Blog post ${title} created successfully by ${author}`);
        } else {
            console.log(`Failed to create blog post ${title}`);
        }
    } catch (err) {
        console.error("Error creating blog post:", err);
    }

    res.redirect("/writeups");
});

app.post("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy();
    res.render("index.ejs");
});

app.get("/logout", (req, res) => {
    res.redirect("/");
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});