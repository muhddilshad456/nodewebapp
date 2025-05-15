const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Offer = require("../../models/offerSchema");

const loadProductDetailes = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const productId = req.query.id;
    const product = await Product.findById(productId).populate(
      "category brand"
    );
    const findCategory = product.category;

    //recomented products

    const recomendedProduct = await Product.find({
      category: findCategory._id,
      _id: { $ne: productId },
    }).limit(4);

    // offer
    const currentDate = new Date();

    const activeOffers = await Offer.find({
      status: "Active",
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
    });

    console.log("Active offers : ", activeOffers);

    let maxDiscount = 0;
    let appliedOffer = null;

    activeOffers.forEach((offer) => {
      const applies =
        (offer.offerType === "product" &&
          offer.targetId == product._id.toString()) ||
        (offer.offerType === "category" &&
          offer.targetId == product.category._id.toString()) ||
        (offer.offerType === "brand" &&
          offer.targetId == product.brand._id.toString());

      if (applies && offer.discount > maxDiscount) {
        maxDiscount = offer.discount;
        appliedOffer = offer;
      }
    });

    const productWithOffer = {
      ...product.toObject(),
      originalPrice: product.productAmount,
      offerPrice: product.productAmount * (1 - maxDiscount / 100),
      offer: appliedOffer,
    };

    console.log("product with offer:", productWithOffer);

    res.render("productDetailes", {
      user: userData,
      products: productWithOffer,
      quantity: product.stockCount,
      category: findCategory,
      recomendedProduct,
    });
  } catch (error) {
    console.log("error from product detailes catch", error);
  }
};

module.exports = { loadProductDetailes };
