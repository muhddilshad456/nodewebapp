const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Offer = require("../../models/offerSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { now } = require("mongoose");
const Wishlist = require("../../models/wishlistSchema");

// add to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const quantityNum = Number(quantity);
    const userId = req.session.user;
    const product = await Product.findById(productId);
    const wishlist = await Wishlist.findOne({
      userId,
      "products.productId": productId,
    });

    if (quantity > product.stockCount || product.stockCount === 0) {
      return res
        .status(409)
        .json({ success: false, message: "No stock available" });
    }

    if (!product || product.isBlocked) {
      return res
        .status(404)
        .json({ success: false, message: "product not found" });
    }

    const totalPrice = product.productAmount * quantityNum;

    let cart = await Cart.findOne({ userId });
    // if cart not exist
    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId: product._id,
            quantity: quantityNum,
            price: product.productAmount,
            totalPrice,
          },
        ],
      });
      await cart.save();
      if (wishlist) {
        wishlist.products.pull({ productId });
        await wishlist.save();
      }
      return res.json({
        success: true,
        message: "product added to cart successfully",
      });
    }
    // check produ in cart exist or not
    const existingProduct = cart.items.find((item) => {
      return item.productId.toString() === productId;
    });
    if (existingProduct) {
      if (existingProduct.quantity + quantityNum > product.stockCount) {
        return res
          .status(409)
          .json({ success: false, message: "No stock available" });
      }
      existingProduct.quantity += quantityNum;
      existingProduct.totalPrice =
        existingProduct.quantity * product.productAmount;
      await cart.save();
      if (wishlist) {
        wishlist.products.pull({ productId });
        await wishlist.save();
      }
      return res.json({
        success: true,
        message: "item add to cart successfully",
      });
    } else {
      cart.items.push({
        productId: product._id,
        quantity: quantityNum,
        price: product.productAmount,
        totalPrice,
      });
      await cart.save();
      if (wishlist) {
        wishlist.products.pull({ productId });
        await wishlist.save();
      }
      return res.json({
        success: true,
        message: "item added to cart successfully",
      });
    }
  } catch (error) {
    console.log("error from add to cart ", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// cart page rendering
const cartPage = async (req, res) => {
  try {
    const userId = req.session.user;
    let cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart) {
      cart = {
        items: [],
        cartTotal: 0,
      };
    } else {
      cart.cartTotal = cart.items.reduce(
        (total, item) => total + item.totalPrice,
        0
      );
      await cart.save();
    }

    // offer
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    const cartWithOffer = cart.items.map((item) => {
      let maxDiscount = 0;
      let appliedOffer = null;

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
          appliedOffer = offer;
        }
      });

      const offerPrice = item.productAmount * (1 - maxDiscount / 100);
      const totalOfferPrice = offerPrice * item.quantity;

      return {
        product: item,
        quantity: item.quantity,
        originalPrice: item.price,
        offerPrice,
        totalOfferPrice,
        offer: appliedOffer,
      };
    });
    console.log("cart with offer : ", cartWithOffer);
    res.render("cart", { cart: cartWithOffer });
  } catch (error) {
    console.log("error from cart page rendering", error);
  }
};

//delete product cart

const deleteCartItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(404)
        .json({ success: false, message: "user not found" });
    }
    await Cart.updateOne({ userId }, { $pull: { items: { productId } } });
    res.json({ success: true, message: "item deleted successfully" });
  } catch (error) {
    console.log("error in delete cart item : ", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting cart item",
    });
  }
};
// cart updation
const updateCartQuantity = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const userId = req.session.user;
    const cart = await Cart.findOne({ userId });
    const cartItem = cart.items.find((i) => i._id.toString() === itemId);
    if (!cartItem) return res.status(404).json({ error: "Item not found" });
    const product = await Product.findOne({ _id: cartItem.productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (quantity > product.stockCount) {
      return res.status(409).json({ message: "No stock available" });
    }

    cartItem.quantity = quantity;
    const newPrice = quantity * cartItem.price;
    cartItem.totalPrice = newPrice;

    const cartTotal = cart.items.reduce(
      (total, item) => total + item.totalPrice,
      0
    );
    cart.cartTotal = cartTotal;
    await cart.save();
    res.json({ message: "cart updated successfully", newPrice, cartTotal });
  } catch (error) {
    console.log("error from update cart quantity : ", error);
  }
};
module.exports = {
  addToCart,
  cartPage,
  deleteCartItem,
  updateCartQuantity,
};
