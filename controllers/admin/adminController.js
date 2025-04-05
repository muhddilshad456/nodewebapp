const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");

const loadLogin = async (req, res) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin");
    }
    res.render("admin-login", { message: null });
  } catch (error) {}
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findAdmin = await User.findOne({ isAdmin: 1, email: email });
    if (!findAdmin) {
      return res.render("admin-login", { message: "Admin not found" });
    }
    const passwordMatch = await bcrypt.compare(password, findAdmin.password);
    if (!passwordMatch) {
      res.render("admin-login", { message: "Incorrect password" });
    }
    req.session.admin = true;
    res.redirect("/admin");
  } catch (error) {
    console.log("login error", error);
  }
};

const loadDashbord = async (req, res) => {
  try {
    if (req.session.admin) {
      return res.render("dashbord");
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {}
};

module.exports = {
  loadLogin,
  login,
  loadDashbord,
};
