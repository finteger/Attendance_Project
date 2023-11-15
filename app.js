const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

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


app.get("/register", (req, res) =>{
    res.render("register");
});













app.listen(PORT, () => {
    console.log(`Connected to port ${PORT}`);
});