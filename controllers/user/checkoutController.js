const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Offer = require("../../models/offerSchema");
const Coupon = require("../../models/couponScema");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("dotenv").config();
const { now } = require("mongoose");
const Wallet = require("../../models/walletSchema");

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

    let currentDate = new Date();
    const applyCoupon = await Coupon.findOne({
      couponCode,
      status: "Active",
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    const activeOffers = await Offer.find({
      status: "Active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    const cartWithOffer = cart.items
      .map((item) => {
        if (!item.productId) return null;
        let maxDiscount = 0;
        let appliedOffer = null;

        activeOffers.forEach((offer) => {
          const applies =
            (offer.offerType === "product" &&
              offer.targetId.toString() === item.productId._id.toString()) ||
            (offer.offerType === "category" &&
              offer.targetId.toString() ===
                item.productId.category.toString()) ||
            (offer.offerType === "brand" &&
              offer.targetId.toString() === item.productId.brand.toString());

          if (applies && offer.discount > maxDiscount) {
            maxDiscount = offer.discount;
            appliedOffer = offer;
          }
        });

        let maxDiscountAmount = 0;
        if (appliedOffer) {
          const discountAmount = (item.price * maxDiscount) / 100;
          maxDiscountAmount = Math.min(
            discountAmount,
            appliedOffer.maxDiscount
          );
        }

        const offerPrice = Number(item.price) - maxDiscountAmount;
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
      })
      .filter((item) => item !== null);

    const grandTotal = cartWithOffer.reduce((acc, product) => {
      return acc + product.totalRegularPrice;
    }, 0);

    let grandOfferTotal = cartWithOffer.reduce((acc, product) => {
      return acc + product.totalOfferPrice;
    }, 0);

    if (applyCoupon && grandOfferTotal >= applyCoupon.minCartValue) {
      const couponDiscount = (grandOfferTotal * applyCoupon.discount) / 100;
      const maxCouponDiscount = Math.min(
        couponDiscount,
        applyCoupon.maxDiscount
      );
      grandOfferTotal = Number(grandOfferTotal) - Number(maxCouponDiscount);
    } else {
      delete req.session.couponCode;
    }

    const coupon = await Coupon.find({
      status: "Active",
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      minCartValue: { $lte: grandOfferTotal },
    });

    const totalDiscount = grandTotal - grandOfferTotal;

    res.render("checkout", {
      cart: cartWithOffer,
      address,
      grandOfferTotal,
      grandTotal,
      totalDiscount,
      coupon,
      couponCode,
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

// remove coupon

const couponRemove = async (req, res) => {
  try {
    delete req.session.couponCode;
    res.json({ success: true, message: "Coupon removed successfully" });
  } catch (error) {
    console.log("error in coupon remove ", error);
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

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    const wallet = await Wallet.findOne({ userId });

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

    let currentDate = new Date();
    const applyCoupon = await Coupon.findOne({
      couponCode,
      status: "Active",
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    const activeOffers = await Offer.find({
      status: "Active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    let finalAmount = 0;

    const orderedItems = cart.items
      .map((item) => {
        if (!item.productId) return null;
        let maxDiscount = 0;
        let offerApplied = null;

        activeOffers.forEach((offer) => {
          const applies =
            (offer.offerType === "product" &&
              offer.targetId.toString() === item.productId._id.toString()) ||
            (offer.offerType === "category" &&
              offer.targetId.toString() ===
                item.productId.category.toString()) ||
            (offer.offerType === "brand" &&
              offer.targetId.toString() === item.productId.brand.toString());

          if (applies && offer.discount > maxDiscount) {
            maxDiscount = offer.discount;
            offerApplied = offer;
          }
        });

        let maxDiscountAmount = 0;
        if (offerApplied) {
          const discountAmount = (item.price * maxDiscount) / 100;
          maxDiscountAmount = Math.min(
            discountAmount,
            offerApplied.maxDiscount
          );
        }

        const regularPrice = Number(item.price);
        const offerPrice = Number(item.price) - maxDiscountAmount;
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
      })
      .filter((item) => item !== null);

    if (applyCoupon && finalAmount >= applyCoupon.minCartValue) {
      const couponDiscount = (finalAmount * applyCoupon.discount) / 100;
      const maxCouponDiscount = Math.min(
        couponDiscount,
        applyCoupon.maxDiscount
      );
      finalAmount = Number(finalAmount) - Number(maxCouponDiscount);
    } else {
      delete req.session.couponCode;
    }

    const razorpayIns = new Razorpay({
      key_id: process.env.RZ_KEY_ID,
      key_secret: process.env.RZ_KEY_SECRET,
    });

    if (payment === "razorpay") {
      const razorpayOrder = await razorpayIns.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `order_rcptid_${Math.floor(Math.random() * 10000)}`,
      });
      return res.json({
        success: true,
        orderType: "razorpay",
        rzOrderId: razorpayOrder.id,
        finalAmount,
        key_id: process.env.RZ_KEY_ID,
      });
    }

    if (payment === "cod" || payment === "wallet") {
      if (payment === "cod" && finalAmount > 1000) {
        return res.status(403).json({
          success: false,
          message: "COD not allowed for order above 1000",
        });
      }
      if (payment === "wallet") {
        if (!wallet || wallet.balance < finalAmount) {
          return res
            .status(402)
            .json({ success: false, message: "Insuffitient balace in wallet" });
        }
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
      if (payment === "wallet") {
        wallet.balance -= newOrder.finalAmount;
        wallet.transactions.push({
          amount: newOrder.finalAmount,
          type: "Debit",
          method: "OrderPayment",
          status: "Completed",
          orderId: newOrder._id,
        });
        await wallet.save();
      }

      delete req.session.couponCode;
      res.json({
        success: true,
        redirectUrl: `/orderSuccess?orderId=${newOrder._id}`,
      });
    }
  } catch (error) {
    console.error("Error from placing order:", error);
    res.status(500).json({ success: false, message: "Failed to place order." });
  }
};

// razor pay verify payment
const rzVerifyPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
    } = req.body;
    // create signeture
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RZ_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "signature not match" });
    }

    const result = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );
    let address = result?.address?.[0];

    if (!address) {
      return res
        .status(400)
        .json({ success: false, message: "Address not found" });
    }

    const couponCode = req.session.couponCode;

    const coupon = await Coupon.findOne({ couponCode });

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
          offerApplied = offer;
        }
      });

      let maxDiscountAmount = 0;
      if (offerApplied) {
        const discountAmount = (item.price * maxDiscount) / 100;
        maxDiscountAmount = Math.min(discountAmount, offerApplied.maxDiscount);
      }

      const regularPrice = Number(item.price);
      const offerPrice = Number(item.price) - maxDiscountAmount;
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
      userId,
      totalAmount: cart.cartTotal,
      finalAmount,
      address,
      status: "Pending",
      paymentMethod: "razorpay",
      paymentId: razorpay_payment_id,
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
    console.error("Error from razor pay verify payment :", error);
    res.status(500).json({ success: false, message: "Failed to place order." });
  }
};

// razorpay payment failed
const paymentFailed = async (req, res) => {
  try {
    const { rzOrderId, addressId } = req.body;

    const userId = req.session.user;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    const existingOrder = await Order.findOne({
      userId,
      paymentMethod: "razorpay",
      status: "Payment failed",
      razorpayOrderId: rzOrderId,
    });

    if (existingOrder) {
      return res.json({
        success: true,
        redirectUrl: `/paymentFailedPage?orderId=${existingOrder._id}`,
      });
    }

    const result = await Address.findOne(
      { userId, "address._id": addressId },
      { "address.$": 1 }
    );
    let address = result?.address?.[0];

    if (!address) {
      return res
        .status(400)
        .json({ success: false, message: "Address not found" });
    }

    const couponCode = req.session.couponCode;

    const coupon = await Coupon.findOne({ couponCode });

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
          offerApplied = offer;
        }
      });

      let maxDiscountAmount = 0;
      if (offerApplied) {
        const discountAmount = (item.price * maxDiscount) / 100;
        maxDiscountAmount = Math.min(discountAmount, offerApplied.maxDiscount);
      }

      const regularPrice = Number(item.price);
      const offerPrice = Number(item.price) - maxDiscountAmount;
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
        status: "Payment failed",
        offerApplied,
      };
    });

    if (coupon) {
      finalAmount = finalAmount * (1 - coupon.discount / 100);
    }

    const newOrder = new Order({
      orderedItems,
      userId,
      totalAmount: cart.cartTotal,
      finalAmount,
      address,
      status: "Payment failed",
      paymentMethod: "razorpay",
      razorpayOrderId: rzOrderId,
    });

    await newOrder.save();

    cart.cartTotal = 0;
    cart.items = [];

    await cart.save();
    delete req.session.couponCode;

    return res.json({
      success: true,
      redirectUrl: `/paymentFailedPage?orderId=${newOrder._id}`,
    });
  } catch (error) {
    console.error("Error from razor pay  payment failed :", error);
    res.status(500).json({ success: false, message: "Failed to place order." });
  }
};

// razorpay payment failed page
const paymentFailedPage = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const order = await Order.findById(orderId);
    res.render("paymentFailedPage", { order });
  } catch (error) {
    console.error(
      "Error from razor pay  payment failed page rendering:",
      error
    );
    res.status(500).json({ success: false, message: "Failed to place order." });
  }
};
// renderRetryPaymentPage
const renderRetryPaymentPage = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const order = await Order.findById(orderId);

    if (!order || order.status !== "Payment failed") {
      return res.render("errorPage", { message: "Invalid order for retry" });
    }

    res.render("retryCheckout", {
      razorpayOrder: order,
      key_id: process.env.RZ_KEY_ID,
    });
  } catch (error) {
    console.error("Error from razor pay  renderRetryPaymentPage:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to renderRetryPaymentPage." });
  }
};
// razorpay retry payment
const retryPayment = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const order = await Order.findById(orderId);
    const userId = req.session.user;

    if (!order || order.status !== "Payment failed") {
      return res.status(400).render("errorPage", { message: "Invalid order" });
    }

    const razorpayIns = new Razorpay({
      key_id: process.env.RZ_KEY_ID,
      key_secret: process.env.RZ_KEY_SECRET,
    });

    const razorpayOrder = await razorpayIns.orders.create({
      amount: Math.round(order.finalAmount * 100),
      currency: "INR",
      receipt: `retry_${orderId}`,
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      redirectUrl: `/retryRazorpay?orderId=${order._id}`,
    });
  } catch (error) {
    console.error("Error from razor pay  payment retry:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retry payment order." });
  }
};

// razorpay verify retry payment
const verifyRetryPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "order not found" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RZ_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid signature" });
    }

    for (item of order.orderedItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "product not fond for quandity reduction",
        });
      }

      if (item.quantity > product.stockCount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName}`,
        });
      }
      item.status = "Pending";
      product.stockCount -= item.quantity;
      await product.save();
    }

    order.status = "Pending";
    order.paymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.paymentVerified = true;

    await order.save();
    res.json({
      success: true,
      redirectUrl: `/orderSuccess?orderId=${order._id}`,
    });
  } catch (error) {
    console.error("Error from razor pay retry payment verify:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify retry payment order.",
    });
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
  couponRemove,
  placeOrder,
  rzVerifyPayment,
  orderSuccessPage,
  paymentFailed,
  paymentFailedPage,
  retryPayment,
  verifyRetryPayment,
  renderRetryPaymentPage,
};
