const sqlite3 = require('sqlite3');
const { blog_post } = require('./blogpost.js');

// If object of db is not created, create new class of db
class db {
    constructor(){
        this.db = db_validation();
    }
}

db_conn = new db();

// Create new db if it doesnt exist
function db_validation(){
    db = new sqlite3.Database('blog.sqlite', (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connected to the database.');
        db.serialize(() => {
            db.run('CREATE TABLE IF NOT EXISTS blog (id INTEGER PRIMARY KEY, title TEXT, content TEXT)');
        });
    });
    return db;
}

function insert_new_blogpost(blog_post){
    if(fetch_post_by_name(blog_post.title)){
        console.log("Post with this title already exists");
        return;
    }
    db_conn.db.serialize(() => {
        db_conn.db.run('INSERT INTO blog (title, content) VALUES (?, ?)', [blog_post.title, blog_post.content]);
    });
}

function fetch_post_by_name(title){
    db_conn.db.serialize(() => {
        db_conn.db.get('SELECT * FROM blog WHERE title = ?', [title], (err, row) => {
            if (err) {
                console.error(err.message);
            }
            return row;
        });
    });
}

module.exports = {
    insert_new_blogpost
}