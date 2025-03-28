const mongoose = require("mongoose");
const { Shcema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    required: true,
  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.objectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      type: Number,
      default: 0,
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmound: {
    type: Number,
    required: true,
  },
  address: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  invoiceDate: {
    type: Date,
  },
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
  couppenApplied: {
    type: Boolean,
    default: false,
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
