const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// home

const loadHome = async (req, res) => {
  try {
    const user = req.session.user;
    const allProducts = await Product.find();
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      stockCount: { $gt: 0 },
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
      return res.render("signup", { message: "Password not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", { message: "User already exists" });
    }
    const otp = genarateOtp();
    const emailSend = await sendVerificationEmail(email, otp);
    if (!emailSend) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
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

//verify otp

const verifyOtp = async (req, res) => {
  try {
    console.log(req.body);
    const { otp } = req.body;
    console.log("typed otp", otp);
    console.log("Session signup OTP:", req.session.userOtp);
    console.log("Session forgot password OTP:", req.session.userfOtp);

    if (req.session.userEmail) {
      if (otp != req.session.userfOtp) {
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
      });
    } else if (req.session.userData) {
      if (otp != req.session.userOtp) {
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
    } else {
      return res.status(400).json({
        success: false,
        message: "Session expired or invalid request",
      });
    }
  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

//resend otp

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    }

    const otp = genarateOtp();
    req.session.userOtp = otp;

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
    console.error("Error in sending otp", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//login page

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
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
      return res.render("login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "Blocked by admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }

    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {}
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
    const categoryIds = categories.map((category) => category._id);
    const brandIds = brands.map((brand) => brand._id);
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
      stockCount: { $gt: 0 },
      category: { $in: categoryIds },
      // brand: { $in: brandIds },
      $and: [
        { productAmount: { $gte: minPrice } },
        { productAmount: { $lte: maxPrice } },
      ],
    };

    if (categoryFil) {
      filter.category = categoryFil;
    }

    if (brandFil) {
      filter.brand = brandFil;
    }

    let sortOptions = {};

    switch (sort) {
      case "":
        sortOptions = { createdAt: -1 };
        break;
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

    // const categoriesWithIds = categories.map((category) => ({
    //   _id: category._id,
    //   name: category.name,
    // }));

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
    });
  } catch (error) {}
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
    req.session.userfOtp = otp;
    req.session.userEmail = email;

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(500).send("Failed to send OTP. Please try again.");
    }

    console.log("OTP for forget password:", otp);

    res.render("verify-otp");
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
  } catch (error) {}
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
  } catch (error) {}
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
  } catch (error) {}
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
  forgetPassword,
  forgetPasswordPage,
  newPasswordPage,
  newPassword,
  userProfilePage,
  editPersonalInfo,
  editEmail,
  addressPage,
  addAddressPage,
  addAddress,
  editAddressPage,
  editAddress,
  deleteAddress,
};
