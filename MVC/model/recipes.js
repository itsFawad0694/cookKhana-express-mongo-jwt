const mongoose = require('mongoose');
const { Schema } = mongoose;

//make Schema for user table
const recipeSchema = new Schema({

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
  
    author: {
      type: String,
      required: true
    },
  
    title: {
      type: String,
      required: true
    },
  
    detail: {
      type: String
    },
  
    ingredients: [{
      type: String
    }],
  
    cookingTime: {
      type: Number
    },
  
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"]
    },
  
    category: {
      type: String
    },
  
    image: {
      type: String
    }
  
  }, { timestamps: true });
//make model of scheme
const Recipe = mongoose.model('recipe',recipeSchema)

module.exports = {Recipe}