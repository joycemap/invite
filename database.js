const pg = require('pg');
const { Client } = require("pg");
const assert = require("assert");
const config = require("./config.json");

// Variable that holds the database client
let _db_client;
let db_config;
if (process.env.IS_PROD) {
    const params = url.parse(process.env.DATABASE_URL);
    const auth = params.auth.split(':');

    db_config = {
        user: auth[0],
        password: auth[1],
        host: params.hostname,
        port: params.port,
        database: params.pathname.split('/')[1],
        ssl: true
    }
}
else {
    db_config = {
        user: 'joyce',
        host: '127.0.0.1',
        database: 'invite',
        port: 5432,
        ssl: false
    };
}


function initDb(callback) {
    console.dir(config);
    if (_db_client) {
        console.warn("Initializing DB again");
        return callback(null, _db_client);
    }

    const pool = new pg.Pool(db_config);
    pool.on('error', function (err) {
        console.log('idle client error', err.message, err.stack);
    });

    const client = new Client(db_config);
    client.connect();
    _db_client = client;
    return callback(null, _db_client);

}

function getDb() {
    assert.ok(_db_client, "Postgresql not initialized!");
    return _db_client;
}

var getData = {
    checkUser: () => {
        return new Promise((resolve,reject) => {
            _db_client.query(``,(err, doc)=>{
                if(err){ reject(err); }
                if(doc.rows > 0){ resolve(true); }
                resolve(false);
            });

        });
    },
    getUserByEmail: (email) => { },
    getInvitationFromSenderId: (sender, inviteLink) => {
        return new Promise((resolve, reject) => {
            _db_client.query(`SELECT * FROM invitations WHERE senderid='${sender}' AND link='${inviteLink}'`,
                (err, doc) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    const result = doc.rows[0];
                    const seen = new Date().toISOString();
                    _db_client.query(`UPDATE invitations SET updated_at='${seen}' WHERE senderid='${sender}' AND link='${inviteLink}'`, (err, doc) => {
                        if (err) {
                            console.log(err);
                            reject(err);
                        }
                        resolve(result);
                    })
                }
            )
        });
    },

    getInvitationFromInviteLink: (link) => {
        return new Promise((resolve, reject) => {
            _db_client.query(`SELECT * from invitations where senderId='${link}'`,
                (err, doc) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    resolve(doc.rows)
                })
        });
    },

    loadHomeByEmail: (sess, pro_email) => {
        return new Promise((resolve, reject) => {
            // How is pro email stored?

            _db_client.query(`SELECT * FROM users WHERE email='${pro_email}'`,
                (err, doc) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    if (doc.rows.length >= 1) {
                        sess.user = doc.rows[0];
                        resolve(sess);
                    }
                    reject(sess);
                });
        })

    }
}

var updateData = {

    createUser: (profile, shortId, pro_email) => {
        return new Promise((resolve, reject) => {
            _db_client.query(`INSERT INTO users (name, link, email) VALUES ('${
                profile.displayName
                }','${shortId}','${pro_email}')`,
                (err, res) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    const value = [{
                        name: profile.displayName,
                        link: shortId,
                        email: pro_email
                    }]
                    resolve(value);
                }
            );
        })
    },

    createNewInvite: (data) => {
        return new Promise((resolve, reject) => {   
            _db_client.query(`
            INSERT INTO invitations (created_at, updated_at, link, senderId, sendermsg,senderName,receiverId) 
            VALUES ('${data.current}','${data.current}','${data.newLink}','${data.senderId}','${data.senderMsg}','${data.senderName}','${data.receiverId}')`,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }

                    // const invites = [{
                    //     created_at: data.current,
                    //     updated_at: data.current,
                    //     newLink: shortId,
                    //     senderId: sess.user.id,
                    //     sendermsg: req.body.msg,
                    //     senderName: req.body.name,
                    //     receiverId: req.body.to
                    // }]

                    resolve();
                    sendEmail(receiverId, senderId, newLink);

                }
            )
        })
    }
}

module.exports = {
    getDb,
    initDb,
    getData,
    updateData
}