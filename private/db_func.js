const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const { blog_post } = require('./blogpost.js');

// If object of db is not created, create new class of db
class db {
    constructor() {
        this.db = db_validation();
    }
}

db_conn = new db();

// Create new db if it doesnt exist
function db_validation() {
    db = new sqlite3.Database('blog.sqlite', (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the database.');
        db.serialize(() => {
            db.run('CREATE TABLE IF NOT EXISTS blog (id INTEGER PRIMARY KEY, title TEXT, content TEXT)');
            db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
        });
    });
    return db;
}

function insert_new_blogpost(blog_post) {
    if (fetch_post_by_name(blog_post.title)) {
        console.log("Post with this title already exists");
        return;
    }
    db_conn.db.serialize(() => {
        db_conn.db.run('INSERT INTO blog (title, content) VALUES (?, ?)', [blog_post.title, blog_post.content]);
    });
}

function fetch_post_by_name(title) {
    db_conn.db.serialize(() => {
        db_conn.db.get('SELECT * FROM blog WHERE title = ?', [title], (err, row) => {
            if (err) {
                console.error(err.message);
            }
            return row;
        });
    });
}

function login_user(username, password, callback) {
    // Attempt to login a user with the given username and password
    db_conn.db.serialize(() => {
        db_conn.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                console.error(err.message);
                callback(false); // Call the callback with false if an error occurred
            } else {
                if (row) {
                    // Check if the password is correct
                    if (bcrypt.compareSync(password, row.password)) {
                        callback(true); // Call the callback with true if the password is correct
                    } else {
                        callback(false); // Call the callback with false if the password is incorrect
                    }
                } else {
                    callback(false); // Call the callback with false if the user doesn't exist
                }
            }
        });
    });
}

function create_new_user(username, password, callback) {
    // Attempt to create a new user in db if it doesn't exist

    // Hash password with bcrypt
    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    password = bcrypt.hashSync(password, salt);

    // Insert the new user into the db
    db_conn.db.serialize(() => {
        db_conn.db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], (err) => {
            if (err) {
                console.error(err.message);
                callback(false); // Call the callback with false if an error occurred
            } else {
                callback(true); // Call the callback with true if the operation was successful
            }
        });
    });
}

module.exports = {
    insert_new_blogpost,
    create_new_user,
    login_user,
}