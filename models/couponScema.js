const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number,
    required: true,
  },
  minCartValue: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Active", "Disabled"],
    default: "Active",
  },
  description: {
    type: String,
    required: false,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
