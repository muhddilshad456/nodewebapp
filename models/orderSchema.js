const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
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
      status: {
        type: String,
        enum: ["Placed", "Delivered", "Returned", "Cancelled"],
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
  // discount: {
  //   type: Number,
  //   default: 0,
  // },
  // finalAmound: {
  //   type: Number,
  //   required: true,
  // },
  address: {
    type: Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  // invoiceDate: {
  //   type: Date,
  // },
  status: {
    type: String,
    required: true,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "return requist",
      "returned",
    ],
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  // couppenApplied: {
  //   type: Boolean,
  //   default: false,
  // },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
