const Express = require('express');
const Morgan = require('morgan');
const { insert_new_blogpost } = require('./private/db_func.js');
const { blog_post } = require('./private/blogpost.js');

const app = Express();
const PORT = 9999;

app.use(Morgan('dev'));
app.use(Express.static('public'));

app.get('/', (req, res) => {
    res.render("index.ejs");
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});