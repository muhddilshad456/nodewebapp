const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const costumerController = require("../controllers/admin/costumerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController = require("../controllers/admin/orderController");
const { userAuth, adminAuth } = require("../middlewares/auth");
// login
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
// logout
router.get("/logout", adminController.adminLogout);
// dash bord
router.get("/", adminAuth, adminController.loadDashbord);
//user managment
router.get("/users", adminAuth, costumerController.costumerInfo);
router.get("/blockCustomer", adminAuth, costumerController.customerBlock);
router.get("/unblockCustomer", adminAuth, costumerController.customerUnblock);
//category managment
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.get("/blockCategory", adminAuth, categoryController.categoryBlock);
router.get("/unblockCategory", adminAuth, categoryController.categoryUnblock);
router.post("/editCategory", adminAuth, categoryController.editCategory);

//brand managment
router.get("/brand", adminAuth, brandController.brandInfo);
router.post("/addBrand", adminAuth, brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.brandBlock);
router.get("/unblockBrand", adminAuth, brandController.brandUnblock);
router.post("/editBrand", adminAuth, brandController.editBrand);

//product management
router.get("/productList", adminAuth, productController.listProduct);
router.get("/addproductpage", adminAuth, productController.addProductPage);
router.post(
  "/addProduct",
  adminAuth,
  productController.uploadFields,
  productController.addProduct
);
router.get("/editProduct/:id", adminAuth, productController.editProductPage);
router.post(
  "/editProduct",
  adminAuth,
  productController.uploadFields,
  productController.editProduct
);

router.get("/blockProducts", adminAuth, productController.productBlock);
router.get("/unblockProducts", adminAuth, productController.productUnblock);

//order managment
router.get("/orders", adminAuth, orderController.orderPage);
router.get("/orderDetailes/:id", adminAuth, orderController.orderDetailesPage);
router.post("/orderStatus", adminAuth, orderController.orderStatus);
router.post("/confirmReturn", adminAuth, orderController.confirmReturn);
router.post(
  "/acceptSingleItemReturn",
  adminAuth,
  orderController.acceptSingleItemReturn
);
router.post(
  "/updateSingleItemStatus",
  adminAuth,
  orderController.updateSingleItemStatus
);

module.exports = router;
