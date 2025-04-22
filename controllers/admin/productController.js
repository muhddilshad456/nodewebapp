const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../../public", "Uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

// Define uploadFields middleware
const uploadFields = upload.fields([
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
]);

const listProduct = async (req, res) => {
  try {
    console.log(req.query.search);
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;

    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      console.log("Error in listing product");
    }
  } catch (error) {
    console.log("error from catch of product listing", error);
  }
};

const addProduct = async (req, res) => {
  try {
    // Log for debugging
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);

    const {
      productName,
      productDescription,
      brand,
      category,
      productAmount,
      stockCount,
    } = req.body;

    // Extract image paths
    const files = req.files || {};
    const image1 = files.image1 ? `/Uploads/${files.image1[0].filename}` : null;
    const image2 = files.image2 ? `/Uploads/${files.image2[0].filename}` : null;
    const image3 = files.image3 ? `/Uploads/${files.image3[0].filename}` : null;

    // Combine images into array
    const productImage = [image1, image2, image3].filter((img) => img !== null);

    // Validate required fields (match frontend)
    if (!productName || !/^[a-zA-Z\s]+$/.test(productName)) {
      return res.status(400).render("addProducts", {
        error: "Invalid or missing product name",
        cat: await Category.find({ isListed: true }),
        brand: await Brand.find({ isBlocked: false }),
      });
    }
    if (!productDescription || !/^[a-zA-Z\s]+$/.test(productDescription)) {
      return res.status(400).render("addProducts", {
        error: "Invalid or missing description",
        cat: await Category.find({ isListed: true }),
        brand: await Brand.find({ isBlocked: false }),
      });
    }
    if (!productAmount || isNaN(productAmount)) {
      return res.status(400).render("addProducts", {
        error: "Invalid product amount",
        cat: await Category.find({ isListed: true }),
        brand: await Brand.find({ isBlocked: false }),
      });
    }
    if (!stockCount || isNaN(stockCount)) {
      return res.status(400).render("addProducts", {
        error: "Invalid stock count",
        cat: await Category.find({ isListed: true }),
        brand: await Brand.find({ isBlocked: false }),
      });
    }

    // Save product
    const product = new Product({
      productName,
      productDescription,
      brand: brand || "",
      category: category || "",
      productAmount: Number(productAmount),
      stockCount: Number(stockCount),
      productImage,
    });

    await product.save();

    console.log("Saved product:", {
      productName,
      productDescription,
      brand,
      category,
      productAmount,
      stockCount,
      productImage,
    });

    res.redirect("/admin/productList");
  } catch (error) {
    console.error("Error in addProduct:", error);
    res.status(500).render("addProducts", {
      error: "Server error",
      cat: await Category.find({ isListed: true }),
      brand: await Brand.find({ isBlocked: false }),
    });
  }
};
// add product page
const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("addProducts", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error in addProductPage:", error);
  }
};

//edit product page

const editProductPage = async (req, res) => {
  try {
    const proId = req.params.id;
    const product = await Product.findById(proId)
      .populate("category")
      .populate("brand");
    console.log("product to edit : ", product);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("editProduct", {
      cat: category,
      brand,
      product,
    });
  } catch (error) {
    console.log("catch error from product edit page ", error);
  }
};

//edit product

const editProduct = async (req, res) => {
  try {
    console.log("Incoming product edit values", req.body);
    console.log("Uploaded files:", req.files || "No files uploaded");

    const {
      productId,
      productName,
      productDescription,
      category,
      productAmount,
      stockCount,
    } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }
    if (
      !productName ||
      !productDescription ||
      !productAmount ||
      !stockCount ||
      !category
    ) {
      return res.status(400).json({ message: "Required fields are missing" });
    }
    const updateData = {
      productName,
      productDescription,
      productAmount: Number(productAmount),
      stockCount: Number(stockCount),
      category,
    };

    if (req.files && Object.keys(req.files).length > 0) {
      const imagePaths = [];
      ["image1", "image2", "image3"].forEach((key) => {
        if (req.files[key] && req.files[key][0]) {
          imagePaths.push(`/Uploads/${req.files[key][0].filename}`);
        }
      });
      updateData.productImage = imagePaths;
    } else {
      const currentProduct = await Product.findById(productId);
      if (currentProduct) {
        updateData.productImage = currentProduct.productImage;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.redirect("/admin/ProductList");
  } catch (error) {
    console.log("error from product edit ", error);
  }
};

// block unblock products

const productBlock = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {}
};

const productUnblock = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {}
};

module.exports = {
  listProduct,
  addProduct,
  addProductPage,
  editProduct,
  editProductPage,
  uploadFields,
  productBlock,
  productUnblock,
};
