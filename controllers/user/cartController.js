const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { now } = require("mongoose");

const addToCart = async (req, res) => {
  try {
    console.log("hihihihihi");
    console.log("data of add to cart : ", req.body);
  } catch (error) {
    console.log("error from add to cart ", error);
  }
};

module.exports = {
  addToCart,
};
