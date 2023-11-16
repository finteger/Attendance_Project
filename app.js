const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const Student = require("./student.js");

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

    });
    
}); 


app.listen(PORT, () => {
    console.log(`Connected to port ${PORT}`);
});