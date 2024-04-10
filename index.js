const Express = require('express');
const Morgan = require('morgan');
const BodyParser = require('body-parser');
const stream = require('stream');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { Writable } = stream;
const { insert_new_blogpost,
    create_new_user,
    login_user,
    fetch_all_writeups,
    fetch_writeup_by_id,
    delete_writeup_by_id,
    fetch_all_users
} = require('./private/db_func.js');
const { blog_post } = require('./private/blogpost.js');

const app = Express();
const PORT = 9999;

// Body parser
app.use(BodyParser.urlencoded({ extended: true }));

// Helmet
app.use(helmet(
    {
        contentSecurityPolicy: false,
    }
));

// Compression
app.use(compression());

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
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
  });

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
        all_writeups.reverse();
        if (all_writeups) {
            res.render('index.ejs', {
                session: req.session,
                writeups: all_writeups
            });
        } else {
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
            // reverse the writeups so the newest is at the top
            writeups.reverse();

            res.render("writeups.ejs", {
                session: req.session,
                writeups: writeups,
            });
        }
        // Render page
    } else {
        // Otherwise just the default page with the signup/login message
        res.render("writeups.ejs");
    }
});

app.post("/fullview", async (req, res) => {
    if (!req.session.username) {
        res.redirect("/");
    }

    // Retrieve the post_id from the form data
    const post_id = req.body.post_id;
    const del_post_id = req.body.del_post_id;

    if (del_post_id) {
        console.log(`Deleting post ${del_post_id}`);

        // Delete the post
        console.log(`Deleting post ${del_post_id}, User requesting delete: ${req.session.username}`)
        const result = await delete_writeup_by_id(del_post_id, req.session.username);
        console.log(result);
        if (result) {
            console.log(`Post ${del_post_id} deleted successfully`);
            res.redirect("/writeups");
            return;
        } else {
            console.log(`Failed to delete post ${del_post_id}`);
            res.redirect("/writeups");
            return;
        }
    }

    // Now you can use the post_id to fetch the details of the selected post from your data source (e.g., database)
    // Perform any necessary operations based on the post_id
    if (post_id) {
        // Fetch the post information
        const post = await fetch_writeup_by_id(post_id);

        if (post) {
            res.render("fullview.ejs", {
                post: post,
                session: req.session,
            });
        } else {
            console.log(`Failed to fetch post with id ${post_id}`);
            res.redirect("/writeups");
        }
    } else {
        res.redirect("/");
    }
});

app.post("/login", (req, res) => {
    if(req.session.username) {
        res.redirect("/");
    }

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
    if(req.session.username) {
        res.redirect("/");
    }
    // User loginpage
    res.render("index.ejs",
        {
            login_mode: true
        });
});

app.get("/usrSignup", (req, res) => {
    if(req.session.username) {
        res.redirect("/");
    }
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
    if(req.session.username) {
        res.redirect("/");
    }
    const username = req.body.username;
    const password = req.body.password;
    create_new_user(username, password, callback => {
        if (callback) {
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

// All users
app.get("/allusers", async (req, res) => {
    if (!req.session.username) {
        res.redirect("/");
    }

    // Fetch all users
    const all_users = await fetch_all_users();
    console.log(all_users);
    if (all_users) {
        res.render("allusers.ejs", {
            session: req.session,
            users: all_users
        });
    } else {
        res.redirect("/");
    }
});

app.post("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy();
    res.render("index.ejs");
});

app.get("/logout", (req, res) => {
    // Destroy the session
    req.session.destroy();
    res.redirect("/");
});

// All other routes
app.get('*', (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});