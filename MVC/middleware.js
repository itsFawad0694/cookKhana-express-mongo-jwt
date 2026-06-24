const { User } = require("./model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// function to handle signup form validation
const signupErr = async (req, res, next) => {
  const { username, email, pass, confirm_pass } = req.body;

  const signuperrors = [];

  // Username validation
  if (!username || !username.trim()) {
    signuperrors.push("Enter Username!");
  }

  if (username && username.length < 5) {
    signuperrors.push("Username must be more than 5 characters!");
  }

  // Email validation
  if (!email || !email.trim()) {
    signuperrors.push("Enter Email!");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check existing email
  if (email && !emailRegex.test(email)) {
    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      signuperrors.push("Email Already Exists!");
    }
  }

  // Password validation
  if (!pass) {
    signuperrors.push("Enter Password!");
  }

  if (pass < 5) {
    signuperrors.push("Password must be more than 5 characters!");
  }

  if (pass && pass !== confirm_pass) {
    signuperrors.push("Both Passwords must Match!");
  }

  // Render errors
  if (signuperrors.length > 0) {
    console.log(signuperrors)
    return res.render("signup", {
      signupErrs: signuperrors,
    });
  }

  next();
};
//login Error
const loginErr = async (req, res, next) => {
  const { email, pass } = req.body;

  const loginErrors = [];

  // Email validation
  if (!email || !email.trim()) {
    loginErrors.push("Enter Email!");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email && !emailRegex.test(email)) {
    loginErrors.push("Invalid Email!");
  }

  // Password validation
  if (!pass || !pass.trim()) {
    loginErrors.push("Enter Password!");
  }

  // Stop if basic validation fails
  if (loginErrors.length > 0) {
    return res.render("login", {
      loginErrs: loginErrors,
    });
  }

  // Find user
  const userDetail = await User.findOne({ email });

  if (!userDetail) {
    loginErrors.push("Invalid Email!");

    return res.render("login", {
      loginErrs: loginErrors,
    });
  }

  // Compare password
  const match = await bcrypt.compare(pass, userDetail.password);

  if (!match) {
    loginErrors.push("Wrong Password!");

    return res.render("login", {
      loginErrs: loginErrors,
    });
  }

  next();
};

const My_Secret = process.env.JWT_SECRETKEY;
//create jwt token
const createToken = (id,username) => {
  const maxAge = 5 * 60;
  return jwt.sign({ id,username }, My_Secret, {
    expiresIn: maxAge,
  });
};

//login auth to protects private routes
const auth = (req, res, next) => {

  const token = req.cookies.jwt;

  if (token) {

    jwt.verify(token, My_Secret, (err, decoded) => {

      if (err) {

        console.log(err.message);

        return res.redirect("/login");

      }

      req.user = decoded;

      next();

    });

  } else {

    return res.redirect("/login");

  }

};
//middleware to avoid login user to access login,signup page

const alreadyAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, My_Secret, (err, decodedToken) => {
      if (err) {
        return next();
      }

      return res.redirect("/");
    });
  } else {
    next();
  }
};

//recipe Error Handling
const recipeError = (req, res, next) => {

  let recipeErrors = [];

  const {
      title,
      steps,
      ingredients,
      cookingTime,
      category,
      difficulty
  } = req.body;

  // Title
  if (!title || !title.trim()) {
      recipeErrors.push("Enter Title!");
  }

  // Details
  if (!steps || steps.trim() === "" || steps === "<p><br></p>") {
      recipeErrors.push("Enter Recipe Details!");
  }

  // Ingredients
  if (!ingredients || !ingredients.trim()) {
      recipeErrors.push("Enter Ingredients!");
  }

  // Cooking Time
  if (!cookingTime || Number(cookingTime) <= 0) {
      recipeErrors.push("Enter Valid Cooking Time!");
  }

  // Category
  if (!category) {
      recipeErrors.push("Select Category!");
  }

  // Difficulty
  if (!difficulty) {
      recipeErrors.push("Select Difficulty!");
  }

  if (recipeErrors.length > 0) {
      req.recipeErrors = recipeErrors;
  }

  next();
};
module.exports = {
  signupErr,
  loginErr,
  createToken,
  auth,
  alreadyAuth,
  recipeError,
};
