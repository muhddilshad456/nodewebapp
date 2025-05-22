const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const { now } = require("mongoose");
const Wallet = require("../../models/walletSchema");

const walletPage = async (req, res) => {
  try {
    const userId = req.session.user;
    let wallet = await Wallet.findOne({ userId }).populate("userId");
    if (!wallet) {
      const newWallet = new Wallet({
        userId,
        balance: 0,
        transactions: [],
      });

      await newWallet.save();

      wallet = newWallet;
    }
    if (wallet.transactions && wallet.transactions.length > 0) {
      wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    res.render("wallet", { wallet });
  } catch (error) {
    console.log("error from wallet render page", error);
    res
      .status(500)
      .json({ message: "Something went wrong loading your wallet." });
  }
};

module.exports = {
  walletPage,
};
