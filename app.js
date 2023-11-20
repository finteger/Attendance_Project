const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const Student = require("./student.js");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const secretKey = 'your_secret_key';

const app = express();
const PORT = 3000;

const url = `mongodb+srv://ToddN:Password123@cluster0.5x5qoad.mongodb.net/`;

mongoose.connect(url)
    .then(() => {
        console.log("Connected to MongoDB Cluster.");
    })
    .catch((err) =>{
        console.log(`Error connecting to the database. ${err}`);
});


app.set("views", "./views");
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.static("public/css"));
app.use(express.static("public/images"));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());


function authenticateToken(req, res, next){

    const token = req.cookies.jwt;

    if(token) {
        jwt.verify(token, secretKey, (err, decoded) =>{
            if(err) {
                res.status(401).send('Invalid Token');
            }
          //req.userId = decoded;
        });
       next();
    } else {
    res.status(401).send('You are not authorized to access this page.');
    }
 }   


app.get("/", authenticateToken,  (req, res) =>{
    res.render("home");
});


app.get("/register", (req, res) =>{
    res.render("register");
});

app.post("/register", async (req, res) => {

     const {email, password, confirmPassword} = req.body;   
     const user = await Student.findOne({email});

    if(user){
        res.status(400).send('Username already exists.  Please try again.');
        return;
    }

    if(password != confirmPassword){
        res.status(400).send("Passwords do not match.");
        return;
    }

    bcrypt.hash(req.body.password, 10, (err, hashedPassword) =>{

    const user = new Student({
        email: req.body.email,
        password: hashedPassword,
    });

    user.save();

    res.redirect("/login");

    if(err){
        console.error("Error while hashing password:", err);
        res.status(500).send("Internal Server Error");
        return;
    }

    }); 
}); 

app.get("/login", (req, res) =>{
    res.render("login");
});


app.post("/login", async (req, res) =>{
    //shorthand 
    const {email, password} = req.body;

    //Find user in the database by email
    const user = await Student.findOne({email});

    if(!user){
        //user is not found
    res.status(401).send('Invalid username or password.');
    return;
    }


    //Create a sign a JSON web token
    const unique = user._id.toString();

    const token = jwt.sign(unique, secretKey);

    //Set the token as a cookie
    res.cookie('jwt', token, {maxAge: 5 * 60 * 1000, httpOnly: true});



    bcrypt.compare(password, user.password, (err, result) =>{
        if(result){
            //Passwords do match & successful
            res.redirect("/");
        } else if (!result){
            res.status(401).send('Invalid username or password.');
        } else {
            res.status(500).send('Internal Server Error:', err);
        }
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('jwt');

    res.redirect("/login");
});



app.listen(PORT, () => {
    console.log(`Connected to port ${PORT}`);
});
