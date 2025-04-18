const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const costumerController = require("../controllers/admin/costumerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const { userAuth, adminAuth } = require("../middlewares/auth");
// login
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
// logout
router.get("/logout", adminController.adminLogout);
// dash bord
router.get("/", adminAuth, adminController.loadDashbord);
//user managment
router.get("/users", costumerController.costumerInfo);
router.get("/blockCustomer", costumerController.customerBlock);
router.get("/unblockCustomer", costumerController.customerUnblock);
//category managment
router.get("/category", categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.get("/blockCategory", categoryController.categoryBlock);
router.get("/unblockCategory", categoryController.categoryUnblock);

//product management
router.get("/productList", adminAuth, productController.listProduct);
router.get("/addproductpage", adminAuth, productController.addProductPage);
router.post(
  "/addProduct",
  adminAuth,
  productController.uploadFields,
  productController.addProduct
);
router.get("/blockProducts", productController.productBlock);
router.get("/unblockProducts", productController.productUnblock);

module.exports = router;
