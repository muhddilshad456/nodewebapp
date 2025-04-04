const User = require("../../models/userSchema");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const loadHome = async (req, res) => {
  try {
    return res.render("home");
  } catch (error) {
    console.log("home page render error");
    res.status(500).send("Home page not found");
  }
};

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

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const verifyOtp = async (req, res) => {
  try {
    console.log(req.body);
    const { otp } = req.body;
    console.log(otp);
    if (otp === req.session.userOtp) {
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
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again " });
    }
  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};

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

module.exports = {
  loadHome,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
};
