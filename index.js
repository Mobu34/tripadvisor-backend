const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase = require("crypto-js/enc-base64");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(formidable());
app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", {
  firstName: String,
  lastName: String,
  email: String,
  hash: String,
  salt: String,
  description: String,
});

const api_key = process.env.MAILGUN_API_KEY;
const domain = process.env.MAILGUN_DOMAIN;
const mailgun = require("mailgun-js")({ apiKey: api_key, domain });

app.post("/form", async (req, res) => {
  const { firstName, lastName, email, password, description } = req.fields;
  try {
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(encBase);

    const newUser = new User({
      firstName,
      lastName,
      email,
      hash,
      salt,
      description,
    });

    await newUser.save();

    // création de l'objet data
    const dataForMailgun = {
      from: "no-reply <form@no-reply.form.com>",
      to: email,
      subject: "Votre formulaire a bien été envoyé aux équipes concernées",
      text:
        "Bonjour,\nVotre demande a été envoyé et les équipes vous répondront incessemment sous peu.\nCordialement,",
    };

    // envoi de l'objet via mailgun
    mailgun.messages().send(dataForMailgun, (err, body) => {
      if (!err) {
        return res.json(body);
      } else {
        res.status(401).json(err);
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.all("*", (req, res) => {
  res.status(404).json("Page not found");
});

app.listen(process.env.PORT, () => {
  console.log("Server has started ...");
});
