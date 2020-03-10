require('dotenv').config();

// Required third-party libraries
const express = require("express");
const pg = require('pg');
const app = express();
var session = require("express-session");
const path = require("path");
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;

const bodyParser = require("body-parser");
const expressReact = require('express-react-views');
var nodemailer = require("nodemailer");


// Local libraries
const initDb = require("./database").initDb;
const getData = require("./database").getData;
const updateData = require("./database").updateData;

const config = require("./config.json");

let pro_email = "";
var sess = {
    user: {}
};


// Check to see if we are running on heroku
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


// Set our client folder and view
// Set react-views to be the default view engine
const reactEngine = expressReact.createEngine();
app.set('views', __dirname + '/views');
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

// Maintain a session
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

// Initialize passport app
app.use(passport.initialize());
app.use(passport.session());


// Invitations cannot be saved to database.

// 2. How to prevent duplicate entries from being created in users table everytime the use logs in? 






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
                "http://localhost:3000/auth/facebook/callback",
            // "https://tpshop.herokuapp.com/auth/facebook/callback",
            profileFields: ["id", "displayName", "photos", "email"],
            enableProof: true
        },

        /**
         * @Joyce Finish the section here by creating the proper object for the done function
         */
        function (accessToken, refreshToken, profile, done) {
            // We get the above 4 things from facebook
            // First we will check if the user is in our database. If not we will add the user and give done callback.
            let email = profile.emails[0].value;
            const userProfileExists = getData.checkUserExistsByEmail(email);
            let user = null;
            if(userProfileExists){
                /**
                 * user Object
                 * {
                 *   
                 * uuid: 'uuid-goes-here',
                 * 
                 * email: 'email-goes-here',
                 * 
                 * inviteCode: 'invite-code-goes-here'
                 * }
                 */
                user = getData.getUserByEmail(email);
                done(null, {rows: [{


                 }]});
            }
            else{
                user = updateData.createUser(email)
                if(user){
                    done(null, {})
                }
                throw Error("Critical error has occured in user profile creation")
                
            }
           
        })
)


// Allow cross origin requests
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

// Index route
app.get("/", (req, res) => {
    res.render("Index");
});

// Test route
app.get("/test", (req, res) => {
    res.send("OK");
});
// Facebook callback url
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

function isLoggedIn(req, res, next) {
    console.log(req.isAuthenticated());
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) return next();
    // if they aren't redirect them to the home page
    res.redirect("/");
  }

// After authentication - home route
app.get("/home", isLoggedIn, (req, res) => {
    res.render("home", {
        // We removed name to simplify
        name: "Default Name",
        link: req.user.rows[0].link,
        email: req.user.rows[0].email
    })

});

// Invite route
app.post("/invite", (req, res) => {
    const data = {
        senderId: req.body.link,
        // Should be the receiver email
        receiver: req.body.to
    };
    // Before we send out the invite, already create the profile for the prospective user
    newUser = updateData.createUser(receiver);
    sendInviteEmail(data.receiver, data.senderId, newUser);
    res.send("Invite Sent!")
    
});


// User invitations, we will only return a count of the user invitations
app.get("/myInvitations", (req, res) => {
    const inviteCode = req.query.link
    const userId = ;
    getData.GetInvitationCountByInviteCode(userId)
        res.status(200).send({
            count: result
        })
});

// Send invite email link
function sendInviteEmail(_to, _from, receivingUser) {
    console.log(process.env.password)

    var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.email,
            pass: process.env.password
        }
    });
<<<<<<< HEAD
    //clientUrl is the website to direct users to
    let clientUrl = `https://tpshop.herokuapp.com/?invite/${_from}-${_link}`;
=======
    const inviteCode = get;
    // clientUrl is the website to direct users to
    let clientUrl = `https://tpshop.herokuapp.com/invite/${inviteCode}-${receivingUser.uuid}`;
>>>>>>> 8f6e6ceb0b1172b9b547269b0b9d9514240f8234
    var mailOptions = {
        from: "roseliao1230@gmail.com",
        to: _to,
        subject: "You have been Invited to Awesome App",
        html: `<p> Your invitation link is: <a href='${clientUrl}'> ${clientUrl}</a>`
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            return console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
}
// Invitation view
app.get("/invite/:id", (req, res) => {
    // Split the url param id into inviteCode and newUserUuid
    let inviteCode = req.params.id
    .trim()
    .split("-")[0]
    .trim();
  let newUserUuid = req.params.id
    .trim()
    .split("-")[1]
    .trim();

    const inviteCodeExists = getData.checkInviteCodeIsValid(inviteCode);

    if(inviteCodeExists){
        const user = getData.getUserByInviteCode(inviteCode);
        updateData.addReferral(user.uuid, newUserUuid)
        /**
         * @Joyce may have to change the sendername and sendermsg to some other user-defined string
         */
        res.render("invite", {sendername: user.email, sendermsg: "Welcome"});
        
    }
    else{
        res.send("invite", {sendername: "No one", sendermsg: "No invite code exists"});
    }
        
});

// Logout
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})

/**
* ===================================
* Listen to requests on port 3000
* ===================================
*/
const PORT = process.env.PORT || 3000;

initDb((err) => {
    if (err) {
        throw err;
    }
    app.listen(PORT, () => console.log('~~~ Tuning in to the waves of port ' + PORT + ' ~~~'));
})


// No proper onClose means that DB could be corrupted
// let onClose = function () {
//     server.close(() => {
//         console.log('Process terminated')
//         // allModels.pool.end(() => console.log('Shut down db connection pool'));
//     })
// };

// process.on('SIGTERM', onClose);
// process.on('SIGINT', onClose);