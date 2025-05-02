const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
//brand info
const brandInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const brandData = await Brand.find({
      name: { $regex: ".*" + search + ".*", $options: "i" },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    res.render("brand", {
      brand: brandData,
      currentPage: page,
      totalPages,
      totalBrands,
    });
  } catch (error) {
    console.error("Error in brand info", error);
  }
};

// add brand

const addBrand = async (req, res) => {
  console.log("Incoming body:", req.body);
  const { name, description } = req.body;
  try {
    if (!name || !description) {
      console.log("name and description is empty");
      return res.status(400).json({ message: "name and description is empty" });
    }
    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ error: "brand already exists" });
    }
    const newBrand = new Brand({
      name,
      description,
    });
    await newBrand.save();
    return res.json({ message: "brand added successfully" });
  } catch (error) {
    console.log("error from add brand catch ", error);
    return res.status(500).json({ error: "internal server error" });
  }
};

//edit brand

const editBrand = async (req, res) => {
  const { editId, editName, editDescription } = req.body;
  try {
    if (!editId || !editName || !editDescription) {
      return res
        .status(400)
        .json({ error: "ID, name, and description are required" });
    }

    const existingBrand = await Brand.findOne({
      name: editName,
    });
    if (existingBrand) {
      return res.status(400).json({ error: "brand name already exists" });
    }
    const updatedBrand = await Brand.findByIdAndUpdate(
      editId,
      { name: editName, description: editDescription },
      { new: true, runValidators: true }
    );
    if (!updatedBrand) {
      return res.status(404).json({ error: "brand not found" });
    }
    return res.json({ message: "brand added successfully" });
  } catch (error) {
    return res.status(500).json({ error: "internal server error" });
  }
};

// block unblock brand

const brandBlock = async (req, res) => {
  try {
    let id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/brand");
  } catch (error) {}
};

const brandUnblock = async (req, res) => {
  try {
    let id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/brand");
  } catch (error) {}
};

module.exports = {
  brandInfo,
  addBrand,
  brandBlock,
  brandUnblock,
  editBrand,
};
