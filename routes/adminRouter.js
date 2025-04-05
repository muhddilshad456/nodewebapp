const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const costumerController = require("../controllers/admin/costumerController");
const { userAuth, adminAuth } = require("../middlewares/auth");

router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashbord);

router.get("/users", adminAuth, costumerController.costumerInfo);

module.exports = router;
