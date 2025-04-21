const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const loadProductDetailes = async (req, res) => {
  try {
    console.log("hi");
    const userId = req.session.user;
    console.log("userid :", userId);
    const userData = await User.findById(userId);
    console.log("userData ", userData);
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    const findCategory = product.category;

    //recomented products

    const recomendedProduct = await Product.find({
      category: findCategory._id,
      _id: { $ne: productId },
    }).limit(4);

    res.render("productDetailes", {
      user: userData,
      products: product,
      quantity: product.stockCount,
      category: findCategory,
      recomendedProduct,
    });
  } catch (error) {
    console.log("error from product detailes catch", error);
  }
};

module.exports = { loadProductDetailes };
