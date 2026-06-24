const express = require("express");
require("dotenv").config(); //this wil allow to use process.env anywhere in the server
const app = express();
const PORT = process.env.PORT || 8000;
const multer = require("multer");  //to handle image files
const path = require("path");
const mongoose = require("mongoose");
const { connectDB } = require("./MVC/model/db");
const { User } = require("./MVC/model/user");
const { Recipe } = require("./MVC/model/recipes");
const {
  signupErr,
  loginErr,
  createToken,
  auth,
  alreadyAuth,
  recipeError,
} = require("./MVC/middleware");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser"); //without cookie-parser req.cookies give undefine

//middleware
app.use(express.json()); //use to make sure json is handle
//use this middleware to get data directly from html form
app.use(express.urlencoded({ extended: true }));
//use this middleware to allow relavent path
app.use(express.static("public"));
//middleware for images
app.use("/uploads", express.static("uploads"));


//handle images  [//handle image () by storing it in disk]
const storage = multer.diskStorage({

  destination: (req, file, cb) => {
      cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
      cb(
          null,
          Date.now() + path.extname(file.originalname)
      );
  }

});

//validation to only allow image no exe or other file
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {

      const allowed = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp"
      ];

      if (allowed.includes(file.mimetype)) {
          cb(null, true);
      } else {
          cb(new Error("Only images are allowed"));
      }

  }
});



//to make sure we dont get undefine jwt token error and instead redirect to login if not login
app.use(cookieParser());

//we can put this code in dbconnect becasue we only want the server to listen when user is connected to db
app.listen(PORT, (err) => {
  if (err) return err;
  console.log("Server is Running at http://localhost:" + PORT);
});

//connect to database
connectDB();

//ejs
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // this is to define that our ejs files are in this path from root

//Routes
app.get("/", auth, async (req, res) => {
  try {
    // const data = await Recipe.find() //to get all the data from Recipe model (we apply function on model)
    const data = await Recipe.find().sort({ createdAt: -1 }); //sort in decending order
    // res.send(data)
    // const {author,title,detail} = data
    res.render("showallrecipe", { recipes: data });
  } catch (error) {
    res.render("showallrecipe", { error: error });
  }
});

//login
app.get("/login", alreadyAuth, (req, res) => {
  const error = req.query.err;
  const msg = req.query.msg;
  res.render("login", { error: error, msg: msg });
});

//signup
app.get("/signup", alreadyAuth, (req, res) => {
  res.render("signup");
});


//post signup
app.post("/signup", signupErr, async (req, res) => {
  //get data from body
  const { username, email, pass } = req.body;
  //   console.log(data);

  try {
    const saltRounds = 10;
    const hashPass = await bcrypt.hash(pass, saltRounds);
    //make instance of User object
    const user = new User({
      username: username,
      email: email,
      password: hashPass,
    });

    //now save it
    const result = await user.save();

    res.redirect("/login?msg=Register Successfully!");
  } catch (error) {
    console.log(error);
    res.redirect("/signup?msg=Something went wrong");
  }
});

//login post
app.post("/login", loginErr, async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email });
  const token = createToken(user._id, user.username);
  const maxAge = 5 * 60;
  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: maxAge * 1000,
  });

  res.redirect("/");
});

//recipe
app.get("/recipe", auth, async (req, res) => {
  res.render("postrecipes");
});


//add recipe
app.post("/recipe", auth,upload.single("image"), recipeError, async (req, res) => {
  if (req.recipeErrors) {
    return res.render("postrecipes", {
      recipeErr: req.recipeErrors,
      recipes: [],
    });
  }

  const { title, steps,cookingTime,category,difficulty } = req.body;

  const ingredients = req.body.ingredients
  .split("\n")
  .map(item => item.trim())
  .filter(item => item !== "");

  const recipe = new Recipe({
    userId: req.user.id,
    author: req.user.username.toUpperCase(),
    title: title,
    detail: steps,
    ingredients,
    cookingTime: cookingTime,
    category:category,
    difficulty: difficulty,
    image: req.file?.filename
  });

  const result = await recipe.save();
  // console.log(result)
  res.redirect("/showallrecipes");
});

//show all recipes
app.get("/showallrecipes", auth, async (req, res) => {
  try {
    // const data = await Recipe.find() //to get all the data from Recipe model (we apply function on model)
    const recipes = await Recipe.find().sort({ createdAt: -1 }); //sort in decending order
    // res.send(data)
    // const {author,title,detail} = data
    res.render("showallrecipe", { recipes: recipes ,
      error: recipes.length === 0 ? "No Data Available!" : null,
     });
  } catch (error) {
    res.render("showallrecipe", { error: error });
  }
});

//get user posts
app.get("/myrecipes", auth, async (req, res) => {
  try {
    const recipes = await Recipe.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    return res.render("userPost", {
      recipes: recipes || [],
      error: recipes.length === 0 ? "No Data Available!" : null,
    });
  } catch (error) {
    return res.render("userPost", {
      recipes: [],
      error: "Something went wrong",
    });
  }
});
//delete user Post
app.post("/postDelete/:id", auth, async (req, res) => {
  await Recipe.findOneAndDelete({
    _id: req.params.id,
    author: req.user.username.toUpperCase(),
  });

  res.redirect("/");
});

//update function (first get data to display on screen)
app.get("/updatePost/:id", auth, async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!recipe) {
      return res.redirect("/");
    }
    // console.log(recipe)
    res.render("updateRecipe", {
      recipe: recipe,
    });
  } catch (error) {
    res.redirect("/");
  }
});

//update post
app.post(
  "/updatePost/:id",
  auth,
  upload.single("image"),
  recipeError,
  async (req, res) => {

    if (req.recipeErrors) {

      return res.render("updateRecipe", {
        recipe: {
          _id: req.params.id,
          title: req.body.title,
          detail: req.body.steps,
          ingredients: req.body.ingredients,
          cookingTime: req.body.cookingTime,
          category: req.body.category,
          difficulty: req.body.difficulty
        },
        recipeErr: req.recipeErrors,
      });

    }

    const ingredients = req.body.ingredients
      ? req.body.ingredients
          .split("\n")
          .map(item => item.trim())
          .filter(item => item)
      : [];

    const updateData = {
      title: req.body.title,
      detail: req.body.steps,
      ingredients,
      cookingTime: req.body.cookingTime,
      category: req.body.category,
      difficulty: req.body.difficulty
    };

    // Update image only if a new one was uploaded
    if (req.file) {
      updateData.image = req.file.filename;
    }

    await Recipe.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      updateData
    );

    res.redirect("/myrecipes");
  }
);
//read detail
app.get("/recipeDetail/:id", auth, async (req, res) => {

  try {

    const recipe = await Recipe.findById(req.params.id);

    if (!recipe) {

      console.log("recipe does not exist");

      return res.redirect("/");

    }

    res.render("recipeDetail", {
      recipe: recipe,
    });

  } catch (error) {

    res.redirect("/");

  }

});

//LOGOUT
app.post("/logout", (req, res) => {

  res.clearCookie("jwt",{
    httpOnly: true
  });

  res.redirect("/login");

});
//if no page is found use this
app.use((req, res) => {
  res.status(404).render("404");
});
