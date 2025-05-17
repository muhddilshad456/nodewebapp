const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Offer = require("../../models/offerSchema");
const Coupon = require("../../models/couponScema");
const { now } = require("mongoose");

// check out page
const checkoutPage = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return console.log("userId not available");
    }
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "cart is empty or no cart" });
    }

    let address = await Address.findOne({ userId });
    if (!address) {
      address = {
        address: [],
      };
    }

    const couponCode = req.session.couponCode;

    console.log("couponCode", couponCode);

    const applyCoupon = await Coupon.findOne({ couponCode });

    console.log("applyCoupon", applyCoupon);

    const activeOffers = await Offer.find({
      status: "Active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    const cartWithOffer = cart.items.map((item) => {
      let maxDiscount = 0;
      let appliedOffer = null;

      activeOffers.forEach((offer) => {
        const applies =
          (offer.offerType === "product" &&
            offer.targetId.toString() === item.productId._id.toString()) ||
          (offer.offerType === "category" &&
            offer.targetId.toString() === item.productId.category.toString()) ||
          (offer.offerType === "brand" &&
            offer.targetId.toString() === item.productId.brand.toString());

        if (applies && offer.discount > maxDiscount) {
          maxDiscount = offer.discount;
          appliedOffer = offer;
        }
      });

      const offerPrice = Number(item.price) * (1 - maxDiscount / 100);
      const totalOfferPrice = offerPrice * item.quantity;
      const totalRegularPrice = item.price * item.quantity;

      return {
        product: item.productId,
        quantity: item.quantity,
        regularPrice: item.price,
        totalRegularPrice,
        offerPrice,
        totalOfferPrice,
        appliedOffer,
      };
    });

    console.log("================++++");
    console.log("cart with offer", cartWithOffer);

    const grandTotal = cartWithOffer.reduce((acc, product) => {
      return acc + product.totalRegularPrice;
    }, 0);

    let grandOfferTotal = cartWithOffer.reduce((acc, product) => {
      return acc + product.totalOfferPrice;
    }, 0);

    if (applyCoupon) {
      grandOfferTotal =
        Number(grandOfferTotal) * (1 - Number(applyCoupon.discount) / 100);
    }

    let currentDate = new Date();
    const coupon = await Coupon.find({
      status: "Active",
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      minCartValue: { $gte: grandOfferTotal },
    });

    const totalDiscount = grandTotal - grandOfferTotal;

    console.log("grandTotal", grandTotal);
    console.log("grandOfferTotal", grandOfferTotal);
    console.log("coupon", coupon);

    res.render("checkout", {
      cart: cartWithOffer,
      address,
      grandOfferTotal,
      grandTotal,
      totalDiscount,
      coupon,
    });
  } catch (error) {
    console.log("error in checkout page ", error);
  }
};

// coupon apply

const couponApplied = async (req, res) => {
  try {
    const { couponApplied } = req.body;
    const coupon = await Coupon.findOne({ couponCode: couponApplied });
    if (!coupon) {
      return res
        .status(409)
        .json({ success: false, message: "coupon not found" });
    }
    req.session.couponCode = coupon.couponCode;
    res.json({
      success: true,
      message: "Coupon applied successfully",
    });
  } catch (error) {
    console.log("error in coupon apply ", error);
  }
};

// placing order
const placeOrder = async (req, res) => {
  try {
    const { addressId, payment } = req.body;
    const userId = req.session.user;
    console.log("userId", userId);
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
    let address = result?.address?.[0];

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found." });
    }

    const couponCode = req.session.couponCode;

    const coupon = await Coupon.findOne({ couponCode });

    console.log("coupon", coupon);

    const activeOffers = await Offer.find({
      status: "Active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    let finalAmount = 0;

    const orderedItems = cart.items.map((item) => {
      let maxDiscount = 0;
      let offerApplied = null;

      activeOffers.forEach((offer) => {
        const applies =
          (offer.offerType === "product" &&
            offer.targetId.toString() === item.productId._id.toString()) ||
          (offer.offerType === "category" &&
            offer.targetId.toString() === item.productId.category.toString()) ||
          (offer.offerType === "brand" &&
            offer.targetId.toString() === item.productId.brand.toString());

        if (applies && offer.discount > maxDiscount) {
          maxDiscount = offer.discount;
          appliedOffer = offer;
        }
      });

      const regularPrice = Number(item.price);
      const offerPrice = regularPrice * (1 - maxDiscount / 100);
      const totalRegular = regularPrice * item.quantity;
      const totalDiscounted = offerPrice * item.quantity;

      finalAmount += totalDiscounted;

      return {
        productId: item.productId._id,
        quantity: item.quantity,
        price: regularPrice,
        totalPrice: totalRegular,
        offerPrice,
        totalOfferPrice: totalDiscounted,
        status: "Pending",
        offerApplied,
      };
    });

    if (coupon) {
      finalAmount = finalAmount * (1 - coupon.discount / 100);
    }

    for (const item of cart.items) {
      const product = await Product.findOne({ _id: item.productId });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });
      }

      if (item.quantity > product.stockCount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}`,
        });
      }
      product.stockCount -= item.quantity;
      await product.save();
    }

    const newOrder = new Order({
      orderedItems,
      totalAmount: cart.cartTotal,
      finalAmount,
      address,
      userId,
      paymentMethod: payment,
      status: "Pending",
    });
    await newOrder.save();

    cart.cartTotal = 0;
    cart.items = [];

    await cart.save();

    delete req.session.couponCode;
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

    res.render("orderPlaced", {
      order,
    });
  } catch (error) {
    console.error("Error rendering order success page:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  checkoutPage,
  couponApplied,
  placeOrder,
  orderSuccessPage,
};
