import express from "express";
import { createCompanyController, getCompanyController, getCompanyByIdController, updateCompanyController, deleteCompanyController } from "../controllers/company.controller.js";
import validate from "../middleware/validator.js";
import { authenticateToken,authorizeCompanyAccess } from "../middleware/auth.js";
import {companyValidation,updateCompanySchema}  from "../validations/company.validation.js";


const router = express.Router();
router.post("/create",authenticateToken,authorizeCompanyAccess, validate(companyValidation), createCompanyController);
router.get("/get", authenticateToken,authorizeCompanyAccess, getCompanyController);
router.get("/get/:id", authenticateToken,authorizeCompanyAccess, getCompanyByIdController);
router.put("/update/:id",authenticateToken,authorizeCompanyAccess, validate(updateCompanySchema), updateCompanyController);
router.delete("/delete/:id", authenticateToken,authorizeCompanyAccess, deleteCompanyController);
export default router;
