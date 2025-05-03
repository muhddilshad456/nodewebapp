const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const { now } = require("mongoose");

const checkoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    let address = await Address.findOne({ userId });
    if (!address) {
      address = {
        address: [],
      };
    }
    res.render("checkout", {
      cart,
      address,
    });
  } catch (error) {
    console.log("error in checkout page ", error);
  }
};

// placing order
const placeOrder = async (req, res) => {
  try {
    console.log("detiles for placing order : ", req.body);
    const { addressId, payment } = req.body;
    const userId = req.session.user;
    console.log("userId", userId);
    const cart = await Cart.findOne({ userId });
    const totalAmount = cart.cartTotal;
    const address = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );
    console.log("address", address);
    console.log("cart", cart);
    console.log("total amound", totalAmount);
    res.json({ success: true, redirectUrl: "/orderSuccess" });
  } catch (error) {
    console.log("error from placing order ", error);
  }
};

const orderSuccessPage = async (req, res) => {
  try {
    res.render("orderPlaced");
  } catch (error) {
    console.log("error from oreder success page rendering : ", error);
  }
};

module.exports = {
  checkoutPage,
  placeOrder,
  orderSuccessPage,
};
