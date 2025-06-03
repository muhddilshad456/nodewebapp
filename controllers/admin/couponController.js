const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Offer = require("../../models/offerSchema");
const Coupon = require("../../models/couponScema");

// coupon page rendering
const couponPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = limit * (page - 1);

    const coupon = await Coupon.find({
      couponCode: { $regex: ".*" + search + ".*", $options: "i" },
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCoupons = await Coupon.countDocuments({
      couponCode: { $regex: ".*" + search + ".*", $options: "i" },
    });

    const totalPages = Math.ceil(totalCoupons / limit);
    res.render("coupon", {
      coupon,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log("error from coupon page render", error);
  }
};

// add coupon
const addCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      description,
      minCartValue,
      startDate,
      endDate,
      discount,
      maxDiscount,
    } = req.body;

    if (
      !couponCode ||
      !minCartValue ||
      !startDate ||
      !endDate ||
      !discount ||
      !maxDiscount
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const coupon = await Coupon.findOne({ couponCode });
    if (coupon) {
      return res
        .status(409)
        .json({ success: false, message: "Coupon already exist" });
    }
    const newCoupon = new Coupon({
      couponCode,
      description,
      minCartValue,
      startDate,
      endDate,
      discount,
      maxDiscount,
    });
    await newCoupon.save();
    res.json({ success: true, message: "Coupon added successfully" });
  } catch (error) {
    console.log("error from coupon add ", error);
    res
      .status(500)
      .json({ success: false, message: "Something went wrong", error });
  }
};

// edit coupon
const editCoupon = async (req, res) => {
  try {
    const {
      minCartValue,
      couponCode,
      description,
      startDate,
      endDate,
      discount,
      couponId,
      maxDiscount,
    } = req.body;

    if (
      !couponCode ||
      !minCartValue ||
      !startDate ||
      !endDate ||
      !discount ||
      !couponId ||
      !maxDiscount
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    coupon.couponCode = couponCode;
    coupon.minCartValue = minCartValue;
    coupon.discount = discount;
    coupon.endDate = endDate;
    coupon.startDate = startDate;
    coupon.description = description;
    coupon.maxDiscount = maxDiscount;

    await coupon.save();
    res.json({ success: true, message: "Coupon updated successfully" });
  } catch (error) {
    console.log("error from coupon edit ", error);
    res
      .status(500)
      .json({ success: false, message: "Something went wrong", error });
  }
};

// disable coupon
const disableCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;
    const coupon = await Coupon.findById(couponId);

    coupon.status = "Disabled";
    await coupon.save();
    res.json({ success: true, message: "Coupon disabled successfully" });
  } catch (error) {
    console.log("error from coupon disable ", error);
    res
      .status(500)
      .json({ success: false, message: "Something went wrong", error });
  }
};

// enable coupon
const enableCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;
    const coupon = await Coupon.findById(couponId);

    coupon.status = "Active";
    await coupon.save();
    res.json({ success: true, message: "Coupon enabled successfully" });
  } catch (error) {
    console.log("error from coupon enable ", error);
    res
      .status(500)
      .json({ success: false, message: "Something went wrong", error });
  }
};
module.exports = {
  couponPage,
  addCoupon,
  editCoupon,
  disableCoupon,
  enableCoupon,
};
