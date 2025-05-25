const User = require("../../models/userSchema");

const referralPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);

    res.render("referralPage", { user });
  } catch (error) {
    console.log("error from referral page rendering", error);
  }
};

module.exports = {
  referralPage,
};
