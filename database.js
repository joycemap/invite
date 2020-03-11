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
    // Returns 1 if exists, false or 0 if not
    // checkUserExistsByEmail: (pro_email) => {
    //     const status = runQuery(
    //         'SELECT COUNT() as existing FROM users WHERE users.email = ?',
    //         [pro_email],
    //         "get"
    //     )
    //     if (status.success) {
    //         return status.result.existing;
    //     }
    //     return false;
    // },
    getUserByEmail: (email) => { },
    getInvitationFromSenderId: (sender, inviteLink, seen) => {
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
            _db_client.query(`INSERT INTO users (name, link, email) VALUES ('${profile.displayName}','${shortId}','${pro_email}')`,
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

    createNewInvite: (created_at, updated_at, link, senderId, sendermsg, sendername, receiverId) => {
        return new Promise((resolve, reject) => {
            let current = new Date().toISOString();
            _db_client.query(`INSERT INTO invitations (created_at, updated_at, link, senderId, sendermsg, sendername, receiverId) VALUES ('${current}','${current}','${link}','${senderId}','${sendermsg}','${sendername}','${receiverId}')`,
                (err, result) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    const invite = [{
                        created_at: current,
                        updated_at: current,
                        link: link,
                        senderId: senderId,
                        sendermsg: sendermsg,
                        sendername: sendername,
                        receiverId: receiverId
                    }]
                    resolve(invite);
                    console.log("invited")

                }
            )
        })
    },


}

module.exports = {
    getDb,
    initDb,
    getData,
    updateData
}