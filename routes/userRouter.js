const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
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
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
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
router.get("/newpassword", userController.newPasswordPage);
router.post("/newpassword", userController.newPassword);

module.exports = router;
