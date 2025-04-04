const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");

const loadLogin = async (req, res) => {
  try {
    if (req.session.admin) {
      return res.redirect("/admin/dashboard");
    }
    res.render("admin-login", { message: null });
  } catch (error) {}
};

const login = async (req, res) => {
  try {
    console.log("hi");
    const { email, password } = req.body;
    const findAdmin = await User.findOne({ isAdmin: 1, email: email });
    if (!findAdmin) {
      console.log("1st");
      return res.render("admin-login", { message: "Admin not found" });
    }
    const passwordMatch = await bcrypt.compare(password, findAdmin.password);
    if (!passwordMatch) {
      console.log(passwordHash);
      console.log(findAdmin.password);
      console.log(findAdmin.email);

      res.render("admin-login", { message: "Incorrect password" });
    }
    console.log("hihi");
    req.session.admin = findAdmin._id;
    res.redirect("/dashbord");
  } catch (error) {}
};

module.exports = {
  loadLogin,
  login,
};
