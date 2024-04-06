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
            db.run('CREATE TABLE IF NOT EXISTS blog (id INTEGER PRIMARY KEY, title TEXT, content TEXT, author TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
            db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        });
    });
    return db;
}

async function insert_new_blogpost(blog_post) {
    try {
        const row = await fetch_post_by_name(blog_post.title);

        if (row) {
            console.log("Post with this title already exists");
            return false;
        } else {
            console.log("Inserting new blog post");
            await new Promise((resolve, reject) => { // Promise to prevent error even though it worked.
                db.run('INSERT INTO blog (title, content, author) VALUES (?, ?, ?)', [blog_post.title, blog_post.content, blog_post.author], function (err) {
                    if (err) {
                        console.error(err.message);
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            });
            return true;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function fetch_post_by_name(title, callback) {
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
    // Check if the user already exists
    user_exists(username, (exists) => {
        if (exists) {
            console.log(`User ${username} already exists, cannot create a new user with the same username`);
            callback(false);
        } else {
            // Hash password with bcrypt
            const salt = bcrypt.genSaltSync(10);
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
    });
}

async function user_exists(username, callback) {
    db_conn.db.serialize(() => {
        db_conn.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                console.error(err.message);
                callback(false);
            }
            if (row) {
                console.log(`User ${username} already exists`);
                callback(true);
            } else {
                console.log(`User ${username} does not exist`);
                callback(false);
            }
        });
    });
}

async function fetch_all_writeups() {
    try {
        const all_posts = await new Promise((resolve, reject) => {
            db_conn.db.all('SELECT * FROM blog', (err, rows) => {
                if (err) {
                    console.error(err.message);
                    reject(err);

                } else {
                    resolve(rows);
                }
            });
        });
        if(all_posts){
            return all_posts;
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function fetch_writeup_by_id(id) {
    try {
        const post = await new Promise((resolve, reject) => {
            db_conn.db.get('SELECT * FROM blog WHERE id = ?', [id], (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
        return post;
    } catch (err) {
        console.error(err);
        return false;
    }
}

module.exports = {
    insert_new_blogpost,
    create_new_user,
    login_user,
    fetch_all_writeups,
    fetch_writeup_by_id,
}