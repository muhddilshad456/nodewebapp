const Category = require("../../models/categorySchema");
//category info
const categoryInfo = async (req, res) => {
  try {
    console.log("hihih");
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({
      name: { $regex: ".*" + search + ".*" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
    });
  } catch (error) {
    console.error("Error in category info", error);
  }
};

// add category

const addCategory = async (req, res) => {
  console.log("Incoming body:", req.body);
  const { name, description } = req.body;
  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "category already exists" });
    }
    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();
    return res.json({ message: "category added successfully" });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
};

// block unblock category

const categoryBlock = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {}
};

const categoryUnblock = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {}
};

module.exports = {
  categoryInfo,
  addCategory,
  categoryBlock,
  categoryUnblock,
};
