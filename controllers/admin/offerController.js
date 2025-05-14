const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Offer = require("../../models/offerSchema");

// offer page rendering
const offerPage = async (req, res) => {
  try {
    const product = await Product.find({ isBlocked: false });
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isListed: true });

    const search = req.query.search || "";

    const offer = await Offer.find({
      offerName: { $regex: ".*" + search + ".*", $options: "i" },
    });

    res.render("offer", {
      product,
      category,
      brand,
      offer,
    });
  } catch (error) {
    console.log("error from offer page render", error);
  }
};

// addd new offer

const addOffer = async (req, res) => {
  try {
    console.log("add offer data", req.body);
    const {
      offerName,
      description,
      offerType,
      itemSelect,
      startDate,
      endDate,
      discount,
      status,
    } = req.body;

    const offer = await Offer.findOne({ offerName });

    if (offer) {
      res.status(409).json({ success: true, message: "Offer already exist" });
    }

    const newOffer = new Offer({
      offerName,
      description,
      offerType,
      targetId: itemSelect,
      startDate,
      endDate,
      discount,
      status,
    });

    await newOffer.save();
    res.json({ success: true, message: "Offer added successfully" });
  } catch (error) {
    console.log("error from add offer", error);
  }
};

module.exports = {
  offerPage,
  addOffer,
};
