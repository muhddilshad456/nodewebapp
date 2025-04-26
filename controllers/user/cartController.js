const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { now } = require("mongoose");

const addToCart = async (req, res) => {
  try {
    console.log("data of add to cart : ", req.body);
    const { productId, quantity } = req.body;
    const quantityNum = Number(quantity);
    const userId = req.session.user;
    const product = await Product.findById(productId);
    console.log("product to add to cart : ", product);
    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }

    const totalPrice = product.productAmount * quantityNum;

    let cart = await Cart.findOne({ userId });
    // if cart not exist
    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId: product._id,
            quantity: quantityNum,
            price: product.productAmount,
            totalPrice,
          },
        ],
      });
      await cart.save();
      return res.json({ message: "product added to cart successfully" });
    }
    // check produ in cart exist or not
    const existingProduct = cart.items.find((item) => {
      return item.productId.toString() === productId;
    });
    if (existingProduct) {
      existingProduct.quantity += quantityNum;
      existingProduct.totalPrice =
        existingProduct.quantity * product.productAmount;
      await cart.save();
      return res.json({ message: "item add to cart successfully" });
    } else {
      cart.items.push({
        productId: product._id,
        quantity: quantityNum,
        price: product.productAmount,
        totalPrice,
      });
      await cart.save();
      return res.json({ message: "item added to cart successfully" });
    }
  } catch (error) {
    console.log("error from add to cart ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  addToCart,
};
