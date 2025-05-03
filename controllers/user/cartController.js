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
    const { productId, quantity } = req.body;
    const quantityNum = Number(quantity);
    const userId = req.session.user;
    const product = await Product.findById(productId);

    if (!product || product.isBlocked) {
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
// cart page rendering
const cartPage = async (req, res) => {
  try {
    const userId = req.session.user;
    let cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      cart = {
        items: [],
        cartTotal: 0,
      };
    } else {
      cart.cartTotal = cart.items.reduce(
        (total, item) => total + item.totalPrice,
        0
      );
      await cart.save();
    }

    res.render("cart", { cart });
  } catch (error) {
    console.log("error from cart page rendering", error);
  }
};

//delete product cart

const deleteCartItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;
    if (!userId) {
      return res.status(404).json({ message: "user not found" });
    }
    await Cart.updateOne({ userId }, { $pull: { items: { productId } } });
    res.json({ message: "item deleted successfully" });
  } catch (error) {
    console.log("error in delete cart item : ", error);
    res.status(500).json({ message: "Server error while deleting cart item" });
  }
};
// cart updation
const updateCartQuantity = async (req, res) => {
  try {
    console.log("adjust quantity : ", req.body);
    const { itemId, quantity } = req.body;
    const userId = req.session.user;
    const cart = await Cart.findOne({ userId });
    const cartItem = cart.items.find((i) => i._id.toString() === itemId);
    if (!cartItem) return res.status(404).json({ error: "Item not found" });
    const newPrice = quantity * cartItem.price;
    cartItem.quantity = quantity;
    cartItem.totalPrice = newPrice;
    const cartTotal = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );
    cart.cartTotal = cartTotal;
    await cart.save();
    res.json({ message: "cart updated successfully", newPrice, cartTotal });
  } catch (error) {
    console.log("error from update cart quantity : ", error);
  }
};
module.exports = {
  addToCart,
  cartPage,
  deleteCartItem,
  updateCartQuantity,
};
