const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderedItems: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      totalPrice: {
        type: Number,
        required: true,
      },
      offerPrice: {
        type: Number,
        required: true,
      },
      totalOfferPrice: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Return requisted",
          "Returned",
          "Payment failed",
        ],
        default: "Placed",
      },
      returnReason: {
        type: String,
        default: "",
      },
      returnRequestedAt: {
        type: Date,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  // discount: {
  //   type: Number,
  //   default: 0,
  // },
  paymentId: {
    type: String,
    required: false,
  },
  paymentVerified: {
    type: Boolean,
    default: false,
    required: false,
  },
  razorpayOrderId: {
    type: String,
    required: false,
  },
  address: {
    name: { type: String, required: true },
    city: { type: String, required: true },
    streetAddress: { type: String, required: true },
    appartment: { type: String },
    state: { type: String, required: true },
    postcode: { type: String, required: true },
    phone: { type: String, required: true },
    altPhone: { type: String },
  },

  // invoiceDate: {
  //   type: Date,
  // },
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Return requisted",
      "Returned",
      "Payment failed",
    ],
  },
  returnReason: {
    type: String,
    default: "",
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["cod", "razorpay", "wallet"],
  },
  // couppenApplied: {
  //   type: Boolean,
  //   default: false,
  // },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
