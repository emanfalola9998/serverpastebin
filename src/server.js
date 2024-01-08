const express = require('express')
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
// const dbConfig = require('./dbConfig');
const dotenv = require('dotenv'); // Import dotenv

// Load environment variables from .env file
dotenv.config()

let pool

const checkRemoteConnection = async () => {
    try {
        const tempPool = new Pool({
            connectionString: process.env.connectionString,
            ssl: {
                rejectUnauthorized: false, // Set to true in production with a valid certificate
            },
        });

        // Try connecting and immediately end the connection
        await tempPool.connect();
        tempPool.end();

        return true;
    } catch (error) {
        console.error('Failed to connect to the remote server:', error.message);
        return false;
    }
};

// Perform the check and choose the database pool during server startup
(async () => {
    if (await checkRemoteConnection()) {
        // If remote connection is successful, use remote pool
        pool = new Pool({
            connectionString: process.env.connectionString,
            ssl: {
                rejectUnauthorized: false, // Set to true in production with a valid certificate
            },
        });
    } else {
        // If remote connection fails, use a fallback local pool
        pool = new Pool({
            user: process.env.user,
            password: process.env.password,
            host: process.env.host,
            port: process.env.port,
            database: process.env.database,
        });
    }

    //middleware
    app.use(cors())
    app.use(express.json())

    //ROUTES//

    //create a todo

    app.get("/pastes", async (req, res) => {
        // const result = await pool.query('SELECT * FROM pastes ORDER BY time DESC LIMIT 10');
        const result = await pool.query('SELECT * FROM pastes ');
        res.json(result.rows);
    });

    //get paste with id
    app.get("/pastes/:id", async (req, res) => {
        const id = parseInt(req.params.id)
        const text = ('SELECT * FROM pastes WHERE id = $1')
        const value = [`${id}`]
        const result = await pool.query(text, value)
        res.json(result.rows)
    })


    //post new paste
    app.post("/pastes", async (req, res) => {
        const { language, code, title } = req.body;
        const text = 'INSERT INTO pastes (language, code, title) VALUES ($1, $2 , $3) RETURNING * ';
        const value = [`${language}`, `${code}`, `${title}`];
        const result = await pool.query(text, value);
        const createdPaste = result.rows[0]
        res.status(201).json({
            status: "sucess",
            data: {
                paste: createdPaste,
            }
        });
    });

    //edit existing paste
    app.put("/pastes/:id", async (req, res) => {
        const id = parseInt(req.params.id)
        const { language, code, title } = req.body;
        const text = 'UPDATE pastes SET language = $1, code = $2 , title = $4 WHERE id = $3 RETURNING *';
        const value = [`${language}`, `${code}`, `${id}`, `${title}`];
        const result = await pool.query(text, value);

        if (result.rowCount === 1) {
            const editedPaste = result.rows[0]
            res.status(200).json({
                status: "success",
                data: {
                    paste: editedPaste
                },
            });
        } else {
            res.status(404).json({
                status: "fail",
                data: {
                    id: "Cannot find paste"
                },
            })
        }
    });

    //delete existing paste
    app.delete("/pastes/:id", async (req, res) => {
        const id = parseInt(req.params.id);
        const text = "DELETE FROM pastes WHERE id = $1";
        const value = [`${id}`];
        const result = await pool.query(text, value);

        if (result.rowCount === 1) {
            res.status(200).json({
                status: "success",
            });
        } else {
            res.status(404).json({
                status: "fail",
                data: {
                    id: "Could not find a paste with that id",
                },
            });
        }
    })

    // get all comments
    app.get('/pastes/:id/comments', async (req, res) => {
        const id = parseInt(req.params.id);
        const text = 'SELECT comment, commentid FROM comments JOIN pastes ON (id = pasteid) WHERE pasteid = $1'
        const value = [`${id}`]
        const result = await pool.query(text, value);
        res.json(result.rows);
    });




    // add a new comment 

    app.post("/pastes/:id", async (req, res) => {
        const id = parseInt(req.params.id)
        const { comments } = req.body;
        const text = 'INSERT INTO comments (pasteid, comment) VALUES ((SELECT id FROM pastes WHERE id = $1), $2) RETURNING *';
        const value = [`${id}`, `${comments}`];
        const result = await pool.query(text, value);
        const createdComment = result.rows[0]
        res.status(201).json({
            status: "sucess",
            data: {
                comment: createdComment,
            }
        });
    });


    // delete an existing comment
    app.delete("/pastes/:id/comments/:commentid", async (req, res) => {
        const id = parseInt(req.params.id);
        const commentid = parseInt(req.params.commentid)
        const text = "DELETE FROM comments WHERE pasteid = $1 AND commentid = $2";
        const value = [`${id}`, `${commentid}`];
        const result = await pool.query(text, value);

        if (result.rowCount === 1) {
            res.status(200).json({
                status: "success",
            });
        } else {
            res.status(404).json({
                status: "fail",
                data: {
                    id: "Could not find a paste with that id",
                },
            });
        }
    })

    //Start the server on the given port


    const porthost = process.env.porthost || 5000;
    if (!porthost) {
        throw 'Missing PORT environment variable.  Set it in .env file.';
    }
    app.listen(porthost, () => {
        console.log(`Server is up and running on port ${porthost}`);
    });

})()