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
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = limit * (page - 1);

    const offer = await Offer.find({
      offerName: { $regex: ".*" + search + ".*", $options: "i" },
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalOffers = await Offer.countDocuments({
      offerName: { $regex: ".*" + search + ".*", $options: "i" },
    });

    const totalPages = Math.ceil(totalOffers / limit);

    res.render("offer", {
      product,
      category,
      brand,
      offer,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.log("error from offer page render", error);
  }
};

// addd new offer

const addOffer = async (req, res) => {
  try {
    const {
      offerName,
      description,
      offerType,
      itemSelect,
      startDate,
      endDate,
      discount,
      maxDiscount,
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
      maxDiscount,
    });

    await newOffer.save();
    res.json({ success: true, message: "Offer added successfully" });
  } catch (error) {
    console.log("error from add offer", error);
  }
};

// edit offer

const editOffer = async (req, res) => {
  try {
    const {
      eofferName,
      edescription,
      eofferType,
      eitemSelect,
      estartDate,
      eendDate,
      ediscount,
      eofferId,
      emaxDiscount,
    } = req.body;

    const offer = await Offer.findById(eofferId);

    offer.offerName = eofferName;
    offer.description = edescription;
    offer.discount = ediscount;
    offer.startDate = estartDate;
    offer.endDate = eendDate;
    offer.offerType = eofferType;
    offer.targetId = eitemSelect;
    offer.maxDiscount = emaxDiscount;

    await offer.save();
    res.json({ success: true, message: "Offer edited successfully" });
  } catch (error) {
    console.log("error from edit offer", error);
  }
};

// disable offer

const disableOffer = async (req, res) => {
  try {
    const { offerId } = req.body;
    const offer = await Offer.findById(offerId);
    offer.status = "Disabled";
    await offer.save();
    res.json({ success: true, message: "Offer disabled successfully" });
  } catch (error) {
    console.log("error from disable offer", error);
  }
};

// enable offer
const enableOffer = async (req, res) => {
  try {
    const { offerId } = req.body;
    const offer = await Offer.findById(offerId);
    offer.status = "Active";
    await offer.save();
    res.json({ success: true, message: "Offer enabled successfully" });
  } catch (error) {
    console.log("error from enable offer", error);
  }
};
module.exports = {
  offerPage,
  addOffer,
  editOffer,
  disableOffer,
  enableOffer,
};
