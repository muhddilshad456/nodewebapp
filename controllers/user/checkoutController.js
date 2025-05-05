const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
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
    const { addressId, payment } = req.body;
    const userId = req.session.user;
    if (!addressId || !payment || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required data." });
    }

    const cart = await Cart.findOne({ userId });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cart is empty." });
    }

    const result = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );
    let address = result?.address?.[0]?._id;

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found." });
    }
    const orderedItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      status: "Delivered",
    }));
    const newOrder = new Order({
      orderedItems,
      totalAmount: cart.cartTotal,
      address,
      paymentMethod: payment,
      status: "Delivered",
    });
    await newOrder.save();
    res.json({
      success: true,
      redirectUrl: `/orderSuccess?orderId=${newOrder._id}`,
    });
  } catch (error) {
    console.error("Error from placing order:", error);
    res.status(500).json({ success: false, message: "Failed to place order." });
  }
};
// order success page
const orderSuccessPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.orderId;
    if (!orderId || !userId) {
      return res
        .status(400)
        .send("Invalid request: Missing order ID or user session.");
    }

    const order = await Order.findOne({ _id: orderId }).populate(
      "orderedItems.productId"
    );
    if (!order) {
      return res.status(404).send("Order not found.");
    }
    const addressDoc = await Address.findOne(
      { userId, "address._id": order.address },
      { "address.$": 1 }
    );
    const address = addressDoc?.address?.[0];

    if (!address) {
      return res.status(404).send("Address not found.");
    }

    res.render("orderPlaced", {
      order,
      address,
    });
  } catch (error) {
    console.error("Error rendering order success page:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  checkoutPage,
  placeOrder,
  orderSuccessPage,
};
