const User = require("../../models/userSchema");
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

const signup = async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const newUser = new User({ name, email, phone, password });
    console.log(newUser);
    await newUser.save();
    return res.redirect("/signup");
  } catch (error) {
    console.error("Error for save user", error);
    res.status(500), send("Internal server error");
  }
};

module.exports = {
  loadHome,
  loadSignup,
  signup,
};
