const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Offer = require("../../models/offerSchema");
const { now } = require("mongoose");

// wishlist page rendering
const wishlistPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const wishlist = await Wishlist.findOne({ userId }).populate(
      "products.productId"
    );

    const activeOffers = await Offer.find({
      status: "Active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    const wishListWithOffer = wishlist?.products?.length
      ? wishlist.products
          .map((item) => {
            if (!item.productId) return null;
            let maxDiscount = 0;
            let appliedOffer = null;

            activeOffers.forEach((offer) => {
              const applies =
                (offer.offerType === "product" &&
                  offer.targetId.toString() ===
                    item.productId._id.toString()) ||
                (offer.offerType === "category" &&
                  offer.targetId.toString() ===
                    item.productId.category.toString()) ||
                (offer.offerType === "brand" &&
                  offer.targetId.toString() ===
                    item.productId.brand.toString());

              if (applies && offer.discount > maxDiscount) {
                maxDiscount = offer.discount;
                appliedOffer = offer;
              }
            });

            let maxDiscountAmount = 0;
            if (appliedOffer) {
              const discountAmount =
                (item.productId.productAmount * maxDiscount) / 100;
              maxDiscountAmount = Math.min(
                discountAmount,
                appliedOffer.maxDiscount
              );
            }

            const offerPrice =
              Number(item.productId.productAmount) - maxDiscountAmount;

            return {
              product: item,
              offerPrice,
              offer: appliedOffer,
            };
          })
          .filter((item) => item !== null)
      : [];

    res.render("wishlist", { wishlist: wishListWithOffer });
  } catch (error) {
    console.log("error from wishlist page", error);
    res.status(500).render("errorPage", { message: "Something went wrong." });
  }
};

// add to wishlist

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      const newWishlist = new Wishlist({
        userId,
        products: [{ productId }],
      });
      await newWishlist.save();

      return res.json({
        success: true,
        message: "Product added to wishlist successfully",
      });
    }

    const existingProduct = await Wishlist.findOne({
      userId,
      "products.productId": productId,
    });
    if (existingProduct) {
      return res
        .status(409)
        .json({ success: false, message: "Product already exist in wishlist" });
    }

    wishlist.products.push({ productId });
    await wishlist.save();

    res.json({
      success: true,
      message: "Product added to wishlist successfully",
    });
  } catch (error) {
    console.log("error from add to wishlist", error);
  }
};

// remove item from wishlist

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found" });
    }

    wishlist.products.pull({ productId });
    await wishlist.save();

    res.json({ success: true, message: "Item removed successfully..!" });
  } catch (error) {
    console.log("error from removing item from wishlist", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  wishlistPage,
  addToWishlist,
  removeFromWishlist,
};
