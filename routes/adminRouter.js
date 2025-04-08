const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const costumerController = require("../controllers/admin/costumerController");
const categoryController = require("../controllers/admin/categoryController");
const { userAuth, adminAuth } = require("../middlewares/auth");

router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashbord);

router.get("/users", costumerController.costumerInfo);

router.get("/blockCustomer", costumerController.customerBlock);
router.get("/unblockCustomer", costumerController.customerUnblock);
//category
router.get("/category", categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);

module.exports = router;
