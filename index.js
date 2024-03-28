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

BodyParser.urlencoded({ extended: true });

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
    // Morgan log
    res.render("index.ejs");
});

app.get("/writeups", (req, res) => {
    res.render("writeups.ejs");
});

app.get("/login", (req, res) => {
    const query = req.query;
    const username = query.user;
    const password = query.password;
    login_user(username, password, callback => {
        if (callback) {
            res.send("User logged in successfully");
            console.log(`User ${username} logged in successfully`);
        } else {
            res.send("User not found");
            console.log(`User ${username} not found`);
        }
    });
    // Set express session
    req.session.username = username;
    res.render("index.ejs",
        {
            username: req.session.username
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


app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});