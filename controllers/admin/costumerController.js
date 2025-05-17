const User = require("../../models/userSchema");

const costumerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 3;
    const userDate = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdOn: -1 })
      .exec();

    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } },
        { email: { $regex: ".*" + search + ".*" } },
      ],
    }).countDocuments();

    const totalPages = Math.ceil(count / limit);
    res.render("customers", {
      data: userDate,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.log("error from costomer info", error);
  }
};

const customerBlock = async (req, res) => {
  try {
    let id = req.query.id;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).send("User not found");
    }
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    delete req.session.user;
    res.redirect("/admin/users");
  } catch (error) {
    console.log("error in costumer block");
  }
};

const customerUnblock = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { isBlocked: false });
    res.redirect("/admin/users");
  } catch (error) {
    console.log("error in costomer unblock");
  }
};

module.exports = {
  costumerInfo,
  customerBlock,
  customerUnblock,
};
