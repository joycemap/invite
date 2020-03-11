require('dotenv').config();
/**
* ===================================
* Third-party Libraries
* ===================================
*/
const express = require("express");
const pg = require('pg');
const app = express();
var session = require("express-session");
const path = require("path");
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
var shortid = require("shortid");
const bodyParser = require("body-parser");
var nodemailer = require("nodemailer");

/**
* ===================================
* Local Libraries
* ===================================
*/
const initDb = require("./database").initDb;
const getDb = require("./database").getDb;
const getUsers = require("./database").getUsers;
const getData = require("./database").getData;
const updateData = require("./database").updateData;
const config = require("./config.json");

/**
* ===================================
* Global Variables
* ===================================
*/
let pro_email = "";
var sess = {
    user: {}
};

//check to see if we have this heroku environment variable
if (process.env.IS_PROD) {

    app.enable("trust proxy");
    const express_enforces_ssl = require("express-enforces-ssl");
    app.use(express_enforces_ssl());
    app.use(bodyParser.json()); // to support JSON-encoded bodies
    app.use(
        bodyParser.urlencoded({
            // to support URL-encoded bodies
            extended: true
        })
    );

}
/**
* ===================================
* Set our client folder and view
* ===================================
*/

app.set('views', __dirname + '/views');
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

/**
* ===================================
* Maintain a session
* ===================================
*/
app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: true,
        proxy: true,
        cookie: {
            secure: true,
            maxAge: 3600000
        }
    })
);

/**
* ===================================
* Initialize Passport App - https://github.com/jaredhanson/passport-facebook
* ===================================
*/
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
// Deserialize user from the sessions
passport.deserializeUser((user, done) => done(null, user));
//passport middleware
passport.use(
    new FacebookStrategy(
        {
            clientID: process.env.clientID,
            clientSecret: process.env.clientSecret,
            callbackURL:
                "http://referfriends.herokuapp.com/auth/facebook/callback",
            // "http://localhost:5000/auth/facebook/callback",
            profileFields: ["id", "displayName", "photos", "email"],
            enableProof: true
        },

        function (accessToken, refreshToken, profile, done) {
            pro_email = profile.emails[0].value;
            getData.loadHomeByEmail(sess, pro_email)
                .then(session => {
                    let shortId = shortid.generate();
                    while (shortId.indexOf('-') >= 0) {
                        shortId = shortid.generate();
                    }
                    updateData.createUser(profile, shortId, pro_email).then(result => {
                        done(null, { result })
                    }).catch(err => { console.log(err) })
                })
        })
)
//             const userProfileExists = getData.checkUserExistsByEmail(pro_email);
//             let user = null;

//             getData.loadHomeByEmail(sess, pro_email)
//                 .then(session => {
//                     let shortId = shortid.generate();
//                     while (shortId.indexOf('-') >= 0) {
//                         shortId = shortid.generate();
//                     }
//             if(userProfileExists)
//                   user Object
//                   {name: profile.displayName,
//                   link: shortId,
//                   email: pro_email
//                  }
//                 user = getData.getUserByEmail(pro_email);
//                 done(null, {rows: [{ name: profile.displayName, link: shortId, email: pro_email }] });
//             }else{
//                     updateData.createUser(profile, shortId, pro_email).then(result => {
//                         done(null, { result })
//                     }).catch(err => { console.log(err) })
//                 })
//         })
// )

/**
* ===================================
* Allow cross origin requests
* ===================================
*/

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

/**
* ===================================
* Index route - Link to Authenticate
* ===================================
*/
app.get("/", (req, res) => {
    res.render("Index");
});

/**
* ===================================
* Test route - to see if app renders
* ===================================
*/
app.get("/test", (req, res) => {
    res.send("OK");
});
/**
* ===================================
* Facebook Auth Callback
* ===================================
*/
app.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect: "/home",
        failureRedirect: "/auth/facebook",
    })
);

app.get(
    "/auth/facebook",
    passport.authenticate("facebook", { scope: "email" })
);

/**
* ===================================
* After Facebook Auth - Home route
* ===================================
*/
app.get("/home", (req, res) => {
    getData.loadHomeByEmail(sess, pro_email)
        .then(result => {
            res.render("Home", {
                name: sess.user.name,
                link: sess.user.link,
                email: sess.user.email
            });
        })
        .catch(err => { res.send('error auth') })

});

/**
* ===================================
* Invite Route
* ===================================
*/
app.post("/invite", (req, res) => {
    let senderId = req.body.link,
        sendermsg = req.body.msg,
        receiverId = req.body.to,
        link = shortid.generate();
    sendername = req.body.name,
        created_at = new Date().toISOString();
    updated_at = new Date().toISOString();

    console.log("app.post/invite");

    updateData.createNewInvite(created_at, updated_at, link, senderId, sendermsg, sendername, receiverId)
        .then((result => {
            sendEmail(receiverId, senderId, link, sendermsg, sendername);
            res.send("invited");

        })
        )
});

/**
* ===================================
* Invitations - Not needed; see Home view
* ===================================
*/
app.get("/myInvitations", (req, res) => {
    let link = req.query.link
    console.log(link)
    getData.getInvitationFromInviteLink(link)
        .then((result) => {
            res.status(200).send(result);
        })
        .catch(err => {
            res.send(err);
        });
});

/**
* ===================================
* Send Email function
* ===================================
*/
function sendEmail(_to, _from, _link, sendermsg, sendername) {

    var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.email,
            pass: process.env.password
        }
    });
    //clientUrl is the website to direct users to
    // let clientUrl = `http://localhost:5000/?invite/${_from}-${_link}`;
    let clientUrl = `https://tpshop.herokuapp.com/?invite/${_from}-${_link}`;
    var mailOptions = {
        from: "roseliao1230@gmail.com",
        to: _to,
        subject: "You have been Invited to Awesome App",
        html: `<p> ${sendername} says ${sendermsg}. </p>
        Your invitation link is: <a href='${clientUrl}'> ${clientUrl}</a>`
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            return console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
}
/**
* =======================================
* Invitation view (not needed; see email)
* ======================================
*/
// app.get("/?invite/:id", (req, res) => {
//     console.log(req.params);
//     let sender = req.params.id
//         .trim()
//         .split("-")[0]
//         .trim();
//     let inviteLink = req.params.id
//         .trim()
//         .split("-")[1]
//         .trim();
//     console.log(sender);
//     console.log(inviteLink);
//     getInvitationFromSenderId(sender, inviteLink)
//         .then((result) => { res.send(result) })
//         .catch((err) => { res.send(err) })
// });

/**
* ===================================
* Logout
* ===================================
*/
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})

/**
* ===================================
* Listen to requests on port 5000
* ===================================
*/
const PORT = process.env.PORT || 5000;

initDb((err) => {
    if (err) {
        throw err;
    }
    app.listen(PORT, () => console.log('~~~ Tuning in to the waves of port ' + PORT + ' ~~~'));

})
