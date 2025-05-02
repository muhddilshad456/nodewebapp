const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const { now } = require("mongoose");

const checkoutPage = async (req, res) => {
  try {
    res.render("checkout");
  } catch (error) {
    console.log("error in checkout page ", error);
  }
};

module.exports = {
  checkoutPage,
};
