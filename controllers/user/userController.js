const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Wishlist = require("../../models/wishlistSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { now } = require("mongoose");
const { block } = require("sharp");
const PDFDocument = require("pdfkit");
const fs = require("fs");

// home

const loadHome = async (req, res) => {
  try {
    const user = req.session.user;
    const allProducts = await Product.find();
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
    });
    // sort product
    productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
    if (user) {
      const userData = await User.findOne({ _id: user._id });
      return res.render("home", { user: userData, products: productData });
    } else {
      return res.render("home", { products: productData });
    }
  } catch (error) {
    console.log("home page render error");
    res.status(500).send("Home page not found");
  }
};

//signup page

const loadSignup = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect("/");
    }
    return res.render("signup");
  } catch (error) {
    console.log("Signup page render error");
    res.status(500).render("Signup page not found");
  }
};

function genarateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email, otp) {
  console.log("Attempting to send OTP to:", email);
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your otp is ${otp}`,
      html: `<b>Your OTP : ${otp}</b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error in sending email from verification email", error);
    return false;
  }
}

//signup

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, confirmpassword } = req.body;
    if (password !== confirmpassword) {
      return res
        .status(400)
        .render("signup", { message: "Password not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res
        .status(409)
        .render("signup", { message: "User already exists" });
    }
    const otp = genarateOtp();
    const emailSend = await sendVerificationEmail(email, otp);
    if (!emailSend) {
      return res.json("email-error");
    }

    req.session.userOtp = {
      otp,
      createdAt: Date.now(),
    };
    req.session.userData = { name, phone, email, password };

    res.render("verify-otp");
    console.log("otp-send", otp);
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFound");
  }
};

//password hashing

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log("error from password hashing catch", error);
  }
};

//verify signup  otp

const verifyOtp = async (req, res) => {
  try {
    console.log(req.body);
    const { otp } = req.body;
    console.log("typed otp", otp);
    console.log("Session signup OTP:", req.session.userOtp.otp);

    const now = Date.now();
    const expired = now - req.session.userOtp.createdAt;
    if (expired > 60000) {
      return res.status(400).json({ success: false, message: "Otp time out" });
    }
    if (otp != req.session.userOtp.otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again" });
    }

    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);

    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
    });
    await saveUserData.save();
    req.session.user = saveUserData._id;

    res.json({ success: true, redirectUrl: "/" });

    res.on("finish", () => {
      delete req.session.userOtp;
      delete req.session.userData;
    });
  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

//sign up resend otp

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    }

    const otp = genarateOtp();
    req.session.userOtp = {
      otp,
      createdAt: Date.now(),
    };

    // sending email
    const emailSend = sendVerificationEmail(email, otp);
    if (emailSend) {
      console.log("Resend OTP : ", otp);
      res
        .status(200)
        .json({ success: true, message: "Resend otp successfull" });
    } else {
      res.status(500).json({ success: false, message: "Failed to resend otp" });
    }
  } catch (error) {
    console.error("Error in resending otp", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// forgott password verify otp
const fgVerifyOtp = async (req, res) => {
  try {
    console.log("typed otp for forgott password", req.body);
    const { otp } = req.body;
    console.log("Session forgot password OTP:", req.session.userfOtp);
    const now = Date.now();
    const expired = now - req.session.userfOtp.createdAt;
    if (expired > 60000) {
      return res.status(400).json({ success: false, message: "Otp time out" });
    }

    if (otp != req.session.userfOtp.otp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again" });
    }

    const user = await User.findOne({ email: req.session.userEmail });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, redirectUrl: "/newpassword" });

    res.on("finish", () => {
      delete req.session.userfOtp;
      delete req.session.userEmail;
    });
  } catch (error) {
    console.log("error from forgot password opt verify : ", error);
  }
};
// forgott password resend otp
const fgResendOtp = async (req, res) => {
  try {
    const resendEmail = req.session.userEmail;
    if (!resendEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    }

    const otp = genarateOtp();

    req.session.userfOtp = {
      otp,
      createdAt: Date.now(),
    };

    // sending email
    const emailSend = sendVerificationEmail(resendEmail, otp);
    if (emailSend) {
      console.log("Resend OTP For Forgott Password : ", otp);
      res
        .status(200)
        .json({ success: true, message: "Resend otp successfull" });
    } else {
      res.status(500).json({ success: false, message: "Failed to resend otp" });
    }
  } catch (error) {
    console.error("Error in resending forgott password otp", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//login page

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      const message = req.query.message;
      let displayMessage = "";
      if (message === "blocked") {
        displayMessage = "Your account has been blocked";
      }
      return res.render("login", { message: displayMessage });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

//login

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });
    if (!findUser) {
      return res.status(404).render("login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.status(404).render("login", { message: "Blocked by admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.status(404).render("login", { message: "Incorrect password" });
    }

    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.log("error from login", error);
  }
};

//logout

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/redirect");
  }
};

//shop page

const loadShopPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });
    const wishlist = await Wishlist.findOne({ userId: user });
    const categoryIds = categories.map((category) => category._id);
    const brandIds = brands.map((brand) => brand._id);
    const wishlistProductIds = wishlist
      ? wishlist.products.map((item) => item.productId.toString())
      : [];
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    let { search, sort, brandFil, categoryFil, minPrice, maxPrice } = req.query;
    if (!minPrice) {
      minPrice = 0;
    }

    if (!maxPrice) {
      maxPrice = Infinity;
    }

    let filter = {
      isBlocked: false,

      category: { $in: categoryIds },
      brand: { $in: brandIds },
      $and: [
        { productAmount: { $gte: minPrice } },
        { productAmount: { $lte: maxPrice } },
      ],
    };

    if (categoryFil && categoryFil !== "") {
      filter.category = categoryFil;
    }

    if (brandFil && brandFil !== "") {
      filter.brand = brandFil;
    }

    if (search && search.trim() !== "") {
      filter.productName = { $regex: search.trim(), $options: "i" };
    }

    let sortOptions = {};

    switch (sort) {
      case "A-Z":
        sortOptions = { productName: 1 };
        break;
      case "Z-A":
        sortOptions = { productName: -1 };
        break;
      case "Price:low-high":
        sortOptions = { productAmount: 1 };
        break;
      case "Price:high-low":
        sortOptions = { productAmount: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // count products
    const totalProducts = await Product.countDocuments(filter);

    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shop", {
      user: userData,
      products,
      category: categories,
      brand: brands,
      totalProducts,
      totalPages,
      page,
      categoryFil,
      brandFil,
      sort,
      minPrice,
      maxPrice,
      search,
      wishlistProductIds,
    });
  } catch (error) {
    console.log("error from shop rendering page : ", error);
  }
};

//forget password

const forgetPasswordPage = async (req, res) => {
  try {
    res.render("fpassword");
  } catch (error) {
    console.log("error in rendering forgott password page ", error);
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);

    // check is eamil exist
    if (!email) {
      return res.status(400).send("Email is required.");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    const otp = genarateOtp();
    req.session.userfOtp = {
      otp,
      createdAt: Date.now(),
    };
    req.session.userEmail = email;

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(500).send("Failed to send OTP. Please try again.");
    }

    console.log("OTP for forget password :", otp);

    res.render("fg-verify-otp");
  } catch (error) {
    console.error("Error in forgetPassword:", error);
  }
};
//new password page
const newPasswordPage = async (req, res) => {
  try {
    res.render("newPasswordPage");
  } catch (error) {}
};

const newPassword = async (req, res) => {
  try {
    console.log(req.body);
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).send("All fields are required.");
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send("Passwords do not match.");
    }

    if (!req.session.userEmail) {
      return res
        .status(400)
        .send("Session expired. Please request a new reset link.");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOne({
      email: req.session.userEmail,
      isAdmin: false,
    });
    if (!user) {
      return res.status(404).send("User not found.");
    }

    user.password = hashedPassword;
    await user.save();

    delete req.session.userEmail;

    res.redirect("/login");
  } catch (error) {}
};

//user profile

const userProfilePage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    res.render("userProfile", {
      user: userData,
    });
  } catch (error) {
    console.log("error from user profile page ", error);
  }
};

//edit profile

const editPersonalInfo = async (req, res) => {
  try {
    console.log("edit personal info : ", req.body);
    const { editId, name, phone } = req.body;
    const updateData = {
      name,
      phone,
    };
    await User.updateOne({ _id: editId }, { $set: updateData });
    res.redirect("/userProfile");
  } catch (error) {
    console.log("error in personal info editing catch ", error);
    res.status(500).send("Internal server error");
  }
};

// edit email

const editEmail = async (req, res) => {
  try {
    console.log("edit email ", req.body);
    const { editEmailId, email } = req.body;
    const otp = genarateOtp();
    console.log("OTP for changing email : ", otp);
    const emailSend = await sendVerificationEmail(email, otp);
    req.session.emailOtp = {
      code: otp,
      createdAt: Date.now(),
    };
    req.session.emailToApply = email;
    res.render("verify-email-otp");
  } catch (error) {
    console.log("Error from edit email catch", error);
  }
};

//verify change email otp

const verifyEmailOtp = async (req, res) => {
  try {
    const now = Date.now();
    const expired = now - req.session.emailOtp.createdAt;
    if (expired > 60000) {
      delete req.session.emailOtp;
    }
    const { otp } = req.body;
    if (
      !req.session ||
      !req.session.emailOtp ||
      !req.session.user ||
      !req.session.emailToApply
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Session expired or invalid" });
    }
    console.log("typed email change otp", otp);
    console.log("Session signup OTP:", req.session.emailOtp.code);

    if (String(otp) !== String(req.session.emailOtp.code)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again" });
    }

    const userId = req.session.user;
    const emailToApply = req.session.emailToApply;
    const user = await User.findById(userId);
    console.log("hi");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.email === emailToApply) {
      return res.status(400).json({
        success: false,
        message: "This is already your current email",
      });
    }
    console.log("hihi");

    const changeEmail = await User.updateOne(
      { _id: userId },
      { $set: { email: emailToApply } }
    );
    console.log("hi2");

    // Clear session OTP and email
    delete req.session.emailOtp;
    delete req.session.emailToApply;
    console.log("hi3");

    res.json({ success: true, redirectUrl: "/userProfile" });
    console.log("end");
  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const resendEmailOtp = async (req, res) => {
  try {
    const email = req.session.emailToApply;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    }

    const otp = genarateOtp();

    req.session.emailOtp = {
      code: otp,
      createdAt: Date.now(),
    };

    const emailSend = sendVerificationEmail(email, otp);
    if (emailSend) {
      console.log("Resend OTP For Changing Email : ", otp);
      res
        .status(200)
        .json({ success: true, message: "Resend otp successfull" });
    } else {
      res.status(500).json({ success: false, message: "Failed to resend otp" });
    }
  } catch (error) {
    console.error("Error in sending otp", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//adress

const addressPage = async (req, res) => {
  try {
    if (!req.session.user) {
      console.log("Session or userId missing");
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }
    const userId = req.session.user;

    const findUser = await User.findOne({ _id: userId });
    if (!findUser) {
      console.log("User not found for userId:", userId);
      return res.status(404).json({ message: "User not found" });
    }
    const user = findUser._id;
    console.log("user : ", user);
    const userAddress = await Address.findOne({ userId: user });
    console.log("userAddress", userAddress);
    res.render("address", {
      user: userId,
      addressData: userAddress,
    });
  } catch (error) {
    console.log("error from address page catch ", error);
  }
};

//add address

const addAddressPage = async (req, res) => {
  try {
    res.render("addAddress");
  } catch (error) {
    console.log("error from address page : ", error);
  }
};

const addAddress = async (req, res) => {
  try {
    const {
      name,
      state,
      streetAddress,
      appartment,
      city,
      postcode,
      phone,
      altPhone,
    } = req.body;

    const userId = req.session.user;

    let userAddress = await Address.findOne({ userId });

    if (userAddress) {
      userAddress.address.push({
        name,
        city,
        streetAddress,
        appartment,
        state,
        postcode,
        phone,
        altPhone,
      });
      await userAddress.save();
    } else {
      userAddress = new Address({
        userId,
        address: [
          {
            name,
            city,
            streetAddress,
            appartment,
            state,
            postcode,
            phone,
            altPhone,
          },
        ],
      });
      await userAddress.save();
    }
    res.redirect("/address");
  } catch (error) {
    console.log("error in catch of add address", error);
  }
};

// edit Address

const editAddressPage = async (req, res) => {
  try {
    let addressId = req.params.id;
    const addresscol = await Address.findOne({ "address._id": addressId });
    if (!addresscol) {
      return res.status(404).send("Address collection not found");
    }
    const address = addresscol.address.find((addr) => addr._id == addressId);
    if (!address) {
      return res.status(404).send("Address not found");
    }

    res.render("editAddress", { address });
  } catch (error) {}
};

const editAddress = async (req, res) => {
  try {
    const {
      addressId,
      name,
      state,
      streetAddress,
      appartment,
      city,
      postcode,
      phone,
      altPhone,
    } = req.body;

    const updateData = {
      "address.$.name": name,
      "address.$.state": state,
      "address.$.streetAddress": streetAddress,
      "address.$.appartment": appartment,
      "address.$.city": city,
      "address.$.postcode": postcode,
      "address.$.phone": phone,
      "address.$.altPhone": altPhone,
    };
    await Address.updateOne(
      { "address._id": addressId },
      {
        $set: updateData,
      }
    );

    res.redirect("/address");
  } catch (error) {
    console.log("error from edit address catch", error);
  }
};

//delete address

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    await Address.updateOne(
      { "address._id": addressId },
      {
        $pull: { address: { _id: addressId } },
      }
    );
    res.redirect("/address");
  } catch (error) {
    console.log("error in delete address console", error);
  }
};

//change Password

const changePasswordPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (user.googleId) {
      return res.render("googlePasswordErrorPage");
    }
    res.render("changePassword");
  } catch (error) {
    console.log("error from change passsword page ", error);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.status(404).json({ message: "password is not match" });
    }
    if (currentPassword == newPassword) {
      return res.status(200).json({
        success: false,
        message:
          "Your new password must be different from your current password.",
      });
    }
    const userId = req.session.user;
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(200).json({
        success: false,
        message: "The current password you entered is incorrect.",
      });
    }
    const hashedPassword = await securePassword(newPassword);
    await User.updateOne(
      { _id: userId },
      { $set: { password: hashedPassword } }
    );
    return res.json({ success: true, redirectUrl: "/userProfile" });
  } catch (error) {
    console.log("error from change passsword  ", error);
  }
};
// order listing
const orderListPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const search = req.query.search || "";
    const order = await Order.find({
      userId,
      orderId: { $regex: ".*" + search + ".*", $options: "i" },
    });
    res.render("orderListing", { orders: order });
  } catch (error) {
    console.log("error from order listing page ", error);
  }
};

// order detailes
const userOrderDetailes = async (req, res) => {
  try {
    const orderId = req.params.id;
    if (!orderId) {
      return res
        .status(404)
        .json({ success: false, message: "order id not found" });
    }
    const order = await Order.findOne({ _id: orderId }).populate(
      "orderedItems.productId"
    );
    res.render("userOrderDetailes", { order });
  } catch (error) {
    console.log("error from user detailes page", error);
  }
};

// cancel order

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required." });
    }
    console.log("order id", orderId);
    const order = await Order.findOne({ _id: orderId });
    console.log("order: ", order);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    if (order.status !== "Pending" && order.status !== "Processing") {
      return res.status(400).json({
        success: false,
        message: "Only pending or processing orders can be cancelled.",
      });
    }

    order.status = "Cancelled";

    for (const item of order.orderedItems) {
      item.status = "Cancelled";
    }

    await order.save();

    for (const item of order.orderedItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stockCount += item.quantity;
        await product.save();
      }
    }
    return res
      .status(200)
      .json({ success: true, message: "Order cancelled successfully." });
  } catch (error) {
    console.log("error from cancel order ", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

//return req from user

const returnReq = async (req, res) => {
  try {
    const { reson, orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    order.status = "Return requisted";
    order.returnReason = reson;

    for (const item of order.orderedItems) {
      if (
        item.status !== "Return requisted" &&
        item.status !== "Returned" &&
        order.status !== "Cancelled"
      )
        item.status = "Return requisted";
    }
    await order.save();
    return res.json({
      success: true,
      message: "Return requested successfully",
    });
  } catch (error) {
    console.log("error from return request", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
};

// download invoice

const invoiceDownload = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId)
      .populate("orderedItems.productId")
      .populate("userId");
    if (!order || order.status !== "Delivered") {
      return res.status(404).send("Invoice not available for this order.");
    }

    const generateInvoice = (order, res) => {
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${order.orderId}.pdf`
      );
      doc.pipe(res);

      // === Header ===
      doc
        .fontSize(26)
        .fillColor("#333")
        .text("WATCHSY", { align: "center", underline: true });
      doc.moveDown(0.5);

      doc.fontSize(18).fillColor("#000").text("INVOICE", { align: "center" });
      doc.moveDown();

      // === Order Info ===
      doc.fontSize(12).fillColor("#333");
      doc.text(`Order ID: ${order.orderId}`, { continued: true });
      doc.text(`   Date: ${order.createdOn.toDateString()}`);
      doc.text(`Customer Name: ${order.userId.name}`);
      doc.moveDown(1);

      // === Table Header ===
      doc.fontSize(14).fillColor("#000").text("Items:", { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor("#333");

      // === Item Rows ===
      order.orderedItems.forEach((item, index) => {
        const product = item.productId;
        doc.text(
          `${index + 1}. ${product.productName}\n    Quantity: ${
            item.quantity
          }\n   Price: Rs.${product.productAmount}\n`,
          { lineGap: 4 }
        );
      });

      doc.moveDown(1);

      // === Summary ===
      doc
        .fontSize(12)
        .fillColor("#000")
        .text(`Subtotal: Rs.${order.totalAmount}`, { align: "right" });

      doc.text(`Discount: Rs.${order.totalAmount - order.finalAmount}`, {
        align: "right",
      });

      doc
        .fontSize(14)
        .fillColor("#000")
        .text(`Total Payable: Rs.${order.finalAmount}`, {
          align: "right",
          underline: true,
        });

      doc.moveDown(2);

      // === Footer ===
      doc
        .fontSize(10)
        .fillColor("#888")
        .text("Thank you for shopping with WATCHSY!", { align: "center" });

      doc.end();
    };
    generateInvoice(order, res);
  } catch (error) {
    console.error("error from dowload invoice", error);
  }
};

//cancel single item
const cancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.body;
    const order = await Order.findById(orderId);
    if (!order || order.orderedItems.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    const item = order.orderedItems.find((i) => i._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in order" });
    }
    if (item.status === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Item already cancelled" });
    }
    const product = await Product.findById(item.productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    item.status = "Cancelled";

    if (order.orderedItems.every((item) => item.status === "Cancelled")) {
      order.status = "Cancelled";
    }
    await order.save();

    product.stockCount += item.quantity;
    await product.save();
    return res.json({ success: true, message: "Item cancelled successfully" });
  } catch (error) {
    console.error("error from cancelSingleItem", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling the item.",
    });
  }
};

// return request for single product

const returnReqSingleItem = async (req, res) => {
  try {
    const { orderId, itemId, reason } = req.body;
    if (!orderId || !itemId || !reason) {
      return res
        .status(400)
        .json({ success: false, message: "data not reached" });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "order not found" });
    }
    const item = order.orderedItems.find((i) => i._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "item for updation not found" });
    }
    item.status = "Return requisted";
    item.returnReason = reason;

    if (
      order.orderedItems.every((item) => item.status === "Return requisted")
    ) {
      order.status = "Return requisted";
    }
    await order.save();

    return res.json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("error from returnReqSingleItem", error);

    return res
      .status(500)
      .json({ success: false, message: "something went wrong" });
  }
};
module.exports = {
  loadHome,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  loadShopPage,
  fgVerifyOtp,
  fgResendOtp,
  forgetPassword,
  forgetPasswordPage,
  newPasswordPage,
  newPassword,
  userProfilePage,
  editPersonalInfo,
  editEmail,
  verifyEmailOtp,
  resendEmailOtp,
  addressPage,
  addAddressPage,
  addAddress,
  editAddressPage,
  editAddress,
  deleteAddress,
  changePasswordPage,
  changePassword,
  orderListPage,
  userOrderDetailes,
  returnReq,
  cancelOrder,
  invoiceDownload,
  cancelSingleItem,
  returnReqSingleItem,
};
