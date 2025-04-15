const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const { userAuth, adminAuth } = require("../middlewares/auth");

// router.get("/pageNotFound", userController.pageNotFound);

//home and shop
router.get("/", userController.loadHome);
router.get("/shop", userController.loadShopPage);
//signup
router.get("/signup", userController.loadSignup);
router.post("/signup", userController.signup);
//otp
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);
//google
router.get(
  "/auth/google",
  userAuth,
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  userAuth,
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

module.exports = router;
