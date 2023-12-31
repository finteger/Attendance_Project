const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const Student = require("./student.js");
const Record = require("./record.js");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const swaggerui = require("swagger-ui-express");
const swaggerjsdoc = require("swagger-jsdoc");
const swaggerdocs = require("./swagger.js");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const fs = require('fs');
const path = require("path");

const secretKey = 'your_secret_key';

const app = express();
const PORT = 3000;

const url = `mongodb+srv://YourUsername:YourPassword@cluster0.5x5qoad.mongodb.net/`;

mongoose.connect(url)
    .then(() => {
        console.log("Connected to MongoDB Cluster.");
    })
    .catch((err) =>{
        console.log(`Error connecting to the database. ${err}`);
});


app.set("views", "./views");
app.set("view engine", "ejs");


const apiLimiter = rateLimit({
windowsMS: 1 * 60 * 1000, //15 Minutes
max: 15,
standardHeaders: true,
legacyHeaders: false,
});

const morganJSONFormat = () => JSON.stringify({
    method: ':method',
    url: ':url',
    http_version: ':http-version',
    remote_addr: ':remote-addr',
    response_time: ':response-time ms',
    status: ':status',
    content_length: 'res[content-length]',
    timestamp: ':date[iso]',
    user_agent: ':user-agent',
});

const logFilePath = path.join(__dirname, 'access.log');

const accessLogStream = fs.createWriteStream(logFilePath, {flags: 'a'});



const options = {

definition: {
        openapi: "3.1.0",
        info: {
            title: "Attendance Project",
            version: "1.0.0",
            description: 
            "Api documentation for the attendance project",
            license: {
                name: "License: MIT",
                url: "https://spdx.org/licenses/MIT.html",
                    },
                },
                servers: [
                    {
                    url: "https://localhost:3000",
                    }
              ]
        },
    apis: ["./*.js"]
};

const specs = swaggerjsdoc(options);

app.use(
"/api/docs",
swaggerui.serve,
swaggerui.setup(specs, {explorer: true})
);

app.use(morgan(morganJSONFormat(), {stream: accessLogStream}))
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


app.get("/", authenticateToken,  async (req, res) =>{
    
    try{
    const students = await Record.find({});
    /* ellipsis or "spread operator", '...' used for spreading the students
       array individually for the Math.max function */
    const maxAttendanceCount = Math.max(...students.map(r => r.attendanceCount));

    res.render("home", {students, maxAttendanceCount});

    } catch(error){
        res.status(500).send("Internal Server Error.", error);
    }

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
        console.error("Error while hashing password:", finderr);
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

app.post("/addstudent", async (req, res) => {
    try{
        const student = new Record({
            name: req.body.name,
            email: req.body.email,
        });
        student.save();

        res.redirect("/");
    }catch(error){

        res.status(500).send("Internal Server Error", error);
    }
});

app.post("/deletestudent", async (req, res) => {

    try{
    const studentName = req.body.name;
    const result = await Record.deleteOne({name: studentName});

    } catch(error){

        res.status(500).send("Internal Server Error", error);
    }
    
});


app.post("/updatestudent", async (req, res) =>{

    const attendanceDate = req.body.attendanceDate;
    const length = req.body.attendance ? req.body.attendance.length : 0;

    try{

        for(let i = 0; i < length; i++){
            const studentId = req.body.attendance[i];
            const result = await Record.findByIdAndUpdate(
                studentId,
                {
                 $inc: {attendanceCount: 1},
                 $set: {attendanceDate: new Date(attendanceDate)}   
                },
                {new: true},
            );
        }

        res.redirect("/");

    } catch (error){

        res.status(500).send("An error occurred updating student record.", error);

    }
});

app.post("/reset", async (req, res) =>{

    try{
        const students = await Record.find({});

        for (let i = 0; i < students.length; i++){
            students[i].attendanceCount = 0;
            await students[i].save();
        }

       res.redirect("/"); 

    }catch(error){
        res.status(500).send("Internal Server Error", error);
    }
});


app.get("/api/records",  apiLimiter, async (req, res) =>{

    try{
       const records = await Record.find().exec(); 
       res.json(records);

    }catch(error){
        res.status(500).send({error: 'An error occured while fetching records.'});
    }
});

app.post("/api/addstudent", apiLimiter,  async (req, res) =>{

    try{
        const student = new Record({
            name: req.body.name,
            email: req.body.email,
        });
        await student.save();

        res.status(200).json({message: 'Student added successfully', student: student});
    }catch(error){
        res.status(500).send("Internal Server Error", error);
    }

});


app.listen(PORT, () => {
    console.log(`Connected to port ${PORT}`);
});
