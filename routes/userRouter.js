const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const passport = require("passport");
const { userAuth, adminAuth } = require("../middlewares/auth");

// router.get("/pageNotFound", userController.pageNotFound);

//home and shop
router.get("/", userController.loadHome);
router.get("/shop", userController.loadShopPage);

//product detailes page
router.get("/productDetailes", productController.loadProductDetailes);
//signup
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
//otp
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
//google
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login?message=blocked",
  }),
  (req, res) => {
    req.session.user = req.user._id;
    res.redirect("/");
  }
);
//login
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
//logout
router.get("/logout", userController.logout);

//forget password

router.get("/forgetpassword", userController.forgetPasswordPage);
router.post("/forgetpassword", userController.forgetPassword);
router.post("/fg-verify-otp", userController.fgVerifyOtp);
router.post("/fg-resend-otp", userController.fgResendOtp);
router.get("/newpassword", userController.newPasswordPage);
router.post("/newpassword", userController.newPassword);

// user profile
router.get("/userProfile", userAuth, userController.userProfilePage);
router.post("/editEmail", userAuth, userController.editEmail);
router.post("/verify-email-otp", userAuth, userController.verifyEmailOtp);
router.post("/resend-email-otp", userAuth, userController.resendEmailOtp);
router.post("/editPersonalInfo", userAuth, userController.editPersonalInfo);
router.get("/address", userAuth, userController.addressPage);
router.get("/addAddress", userAuth, userController.addAddressPage);
router.post("/addAddress", userAuth, userController.addAddress);
router.get("/editAddress/:id", userAuth, userController.editAddressPage);
router.post("/editAddress", userAuth, userController.editAddress);
router.get("/deleteAddress/:id", userAuth, userController.deleteAddress);
router.get("/changePassword", userAuth, userController.changePasswordPage);
router.post("/changePassword", userAuth, userController.changePassword);
router.get("/orderList", userAuth, userController.orderListPage);
router.get(
  "/userOrderDetailes/:id",
  userAuth,
  userController.userOrderDetailes
);
router.post("/cancelOrder", userAuth, userController.cancelOrder);
router.post("/returnReq", userAuth, userController.returnReq);
router.get("/invoice/:id", userAuth, userController.invoiceDownload);
router.post("/cancelSingleItem", userAuth, userController.cancelSingleItem);
router.post(
  "/singleItemReturnReq",
  userAuth,
  userController.returnReqSingleItem
);
//cart
router.post("/addToCart", userAuth, cartController.addToCart);
router.get("/cart", userAuth, cartController.cartPage);
router.post("/deleteCartItem", userAuth, cartController.deleteCartItem);
router.post("/updateCartQuantity", userAuth, cartController.updateCartQuantity);
// check out
router.get("/checkout", userAuth, checkoutController.checkoutPage);
router.post("/placeOrder", userAuth, checkoutController.placeOrder);
// order success page
router.get("/orderSuccess", userAuth, checkoutController.orderSuccessPage);
module.exports = router;
