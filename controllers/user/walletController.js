const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const { now } = require("mongoose");
const Wallet = require("../../models/walletSchema");

const walletPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const wallet = await Wallet.findOne({ userId }).populate("userId");
    res.render("wallet", { wallet });
  } catch (error) {
    console.log("error from wallet render page", error);
  }
};

module.exports = {
  walletPage,
};
