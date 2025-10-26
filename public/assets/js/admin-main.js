// public/assets/js/admin-main.js

// Import all necessary modules for the admin dashboard
import { AdminController } from "./controllers/AdminController.js";
import { AdminView } from "./views/AdminView.js";
import { ProductController } from "./controllers/ProductController.js";
import { ProductView } from "./views/ProductView.js";
import { AdminModel } from "./models/AdminModel.js";
import { ProductModel } from "./models/ProductModel.js";
import { AdminOrdersModelV2 } from "./models/AdminOrdersModelV2.js";
import { uuid } from "./utils/uuid.js";

// Expose globally if needed for debugging or specific integrations
window.AdminController = AdminController;
window.AdminView = AdminView;
window.ProductController = ProductController;
window.ProductView = ProductView;
window.AdminModel = AdminModel;
window.ProductModel = ProductModel;
window.AdminOrdersModelV2 = AdminOrdersModelV2;
window.uuid = uuid;

// Initialize the AdminController when the DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => {
  AdminController.init();
});
