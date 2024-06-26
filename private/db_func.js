const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const { blog_post } = require('./blogpost.js');
const mysql = require('mysql2/promise');

//* If object of db is not created, create new class of db
class db {
    constructor() {
        this.pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'writeups_gothenburg_central_v_231',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
}

// Create new object of db
db_conn = new db();

// Create new db if it doesnt exist
function db_validation() {
    db_conn.pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to MySQL:', err.message);
            return;
        }
        console.log('Connected to MySQL database.');
        connection.release();
    });

    return db_conn.pool;
}

async function insert_new_blogpost(blog_post) {
    // Check if the post already exists
    try {
        const row = await fetch_post_by_name(blog_post.title);

        if (row) {
            console.log("Post with this title already exists");
            return false;
        } else {
            console.log("Inserting new blog post");
            await db_conn.pool.execute('INSERT INTO blogs (title, content, author, post_date) VALUES (?, ?, ?, ?)', [blog_post.title, blog_post.content, blog_post.author, new Date()]);
            return true;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function delete_writeup_by_id(id, user) {
    // Check if its the author of the post
    const post = await fetch_writeup_by_id(id);
    if (post.author != user) {
        return false;
    }
    try {
        const connection = await db_conn.pool.getConnection();
        const [rows, fields] = await connection.execute('DELETE FROM blogs WHERE _id = ?', [id]);
        connection.release();
        if (rows.affectedRows > 0)
            return true;
        else
            return false;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function fetch_post_by_name(title, callback) {
    // Fetch the post by its title
    try {
        const connection = await db_conn.pool.getConnection(); // Get a connection from the pool
        const [rows, fields] = await connection.execute('SELECT * FROM blogs WHERE title = ?', [title]);
        connection.release();
        return rows[0];
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function login_user(username, password, callback) {
    //* Main login function, checks if the user exists and if the password is correct
    try {
        const connection = await db_conn.pool.getConnection();
        const [rows, fields] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        connection.release();
        if (rows.length > 0) {
            if (bcrypt.compareSync(password, rows[0].password)) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    } catch (err) {
        console.error(err);
        callback(false);
    }
}

async function create_new_user(username, password, callback) {
    //* Check if the user already exists
    user_exists(username, async (exists) => {
        if (exists) {
            console.log(`User ${username} already exists, cannot create a new user with the same username`);
            callback(false);
        } else {
            // Hash password with bcrypt
            const salt = bcrypt.genSaltSync(10);
            password = bcrypt.hashSync(password, salt);

            try {
                // Insert new user into database
                const connection = await db_conn.pool.getConnection();
                const [rows, fields] = await connection.execute('INSERT INTO users (username, password, reg_date) VALUES (?, ?, ?)', [username, password, new Date()]);
                connection.release();
                if (rows.affectedRows > 0) {
                    console.log(`User ${username} created successfully`);
                    callback(true);
                } else {
                    console.log(`Failed to create user ${username}`);
                    callback(false);
                }
            } catch (err) {
                console.error(err);
                callback(false);
            }
        }
    });
}

async function fetch_all_users(){
    //* Fetch all users from the database
    try {
        const connection = await db_conn.pool.getConnection();
        const [all_users, fields] = await connection.execute('SELECT * FROM users');
        connection.release();
        if (all_users) {
            return all_users;
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function user_exists(username, callback) {
    //* Check if the user exists in the database
    try {
        const connection = await db_conn.pool.getConnection();
        const [rows, fields] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        connection.release();
        if (rows.length > 0) {
            callback(true);
        } else {
            callback(false);
        }
    } catch (err) {
        console.error(err);
        callback(false);
    }
}

async function fetch_all_writeups() {
    //* Fetch all posts from the database
    try {
        const connection = await db_conn.pool.getConnection();
        const [all_posts, fields] = await db_conn.pool.execute('SELECT * FROM blogs');
        connection.release();
        if (all_posts) {
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
    //* Fetch the post by its id
    try {
        const connection = await db_conn.pool.getConnection();
        const [post, fields] = await connection.execute('SELECT * FROM blogs WHERE _id = ?', [id]);
        connection.release();
        if (post) {
            return post[0];
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function update_writeup_by_id(id, title, content) {
    try{
        // Update the post
        console.log("AOAO", id, title, content);
        const connection = await db_conn.pool.getConnection();
        const [rows, fields] = await connection.execute('UPDATE blogs SET title = ?, content = ? WHERE _id = ?', [title, content, id]);
        connection.release();
        if (rows.affectedRows > 0) {
            return true;
        } else {
            return false;
        }
    } catch(err){
        // Catch potential errors
        console.error(err);
        return false;
    }
}

async function fetch_amount_of_writeups_by_user(username) {
    //* Fetch the amount of writeups by a specific user 
    try {
        const connection = await db_conn.pool.getConnection();
        const [rows, fields] = await connection.execute('SELECT * FROM blogs WHERE author = ?', [username]);
        connection.release();
        return rows.length;
    } catch (err) {
        console.error(err);
        return 0;
    }
}

async function is_admin(username) {
    //* Check if the user is an admin
    try {
        const connection = await db_conn.pool.getConnection();
        const [rows, fields] = await connection.execute('SELECT * FROM users WHERE username = ? AND admin = 1', [username]);
        connection.release();
        if (rows.length > 0) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        console.error(err);
        return false;
    }
}

// Export the functions
module.exports = {
    insert_new_blogpost,
    create_new_user,
    login_user,
    fetch_all_writeups,
    fetch_writeup_by_id,
    delete_writeup_by_id,
    fetch_all_users,
    fetch_amount_of_writeups_by_user,
    is_admin,
    update_writeup_by_id,
}