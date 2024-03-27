const Express = require('express');
const Morgan = require('morgan');
const BodyParser = require('body-parser');
const stream = require('stream');
const fs = require('fs');
const { Writable } = stream;
const { insert_new_blogpost } = require('./private/db_func.js');
const { blog_post } = require('./private/blogpost.js');

const app = Express();
const PORT = 9999;

BodyParser.urlencoded({ extended: true });

app.use(Morgan('dev'));
app.set('view engine', 'ejs');
app.use(Express.static('public'));
app.use(Express.json());

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

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});