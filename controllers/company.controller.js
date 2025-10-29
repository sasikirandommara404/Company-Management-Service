import { createCompany, getCompany, getCompanyById, updateCompany, deleteCompany } from "../services/company.service.js";
import { AppError } from "../utils/Apperror.js";
import logger from "../logger.js"; 

// Create Company
export const createCompanyController = async (req, res, next) => {
    try {
        const companyData = req.body;

        if (!companyData || Object.keys(companyData).length === 0) {
            throw new AppError(400,"Company data is required",);
        }

        const company = await createCompany(companyData);

        if (!company) {
            throw new AppError(400,"Company not created",);
        }

        res.status(201).json({
            success: true,
            message: "Company created successfully",
            company,
        });
    } catch (error) {
        next(error);
    }
};


export const getCompanyController = async (req, res, next) => {
    try {
        const companies = await getCompany();

        if (!companies || companies.length === 0) {
            throw new AppError(404,"No companies found",);
        }

        res.status(200).json({
            success: true,
            message: "Companies fetched successfully",
            companies,
        });
    } catch (error) {
        next(error);
    }
};


export const getCompanyByIdController = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new AppError(400,"Company ID is required");
        }

        const company = await getCompanyById(id);

        if (!company) {
            throw new AppError(404,"Company not found");
        }

        res.status(200).json({
            success: true,
            message: "Company fetched successfully",
            company,
        });
    } catch (error) {
        next(error);
    }
};


export const updateCompanyController = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            throw new AppError(400,"Company ID is required");
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            throw new AppError(400,"No update data provided");
        }

        const allowedFields = [
            "name", "email", "phone", "website", "industry",
            "address", "logo_url", "status", "subscription_tier",
            "billing_info", "settings", "updated_by", "version"
        ];

        const filteredData = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });

        if (Object.keys(filteredData).length === 0) {
            throw new AppError(400,"No valid fields provided for update");
        }

        const company = await updateCompany(id, filteredData);

        if (!company) {
            throw new AppError(404,"Company not found");
        }

        res.status(200).json({
            success: true,
            message: "Company updated successfully",
            updatedFields: Object.keys(filteredData),
            company,
        });
    } catch (error) {
        next(error);
    }
};


export const deleteCompanyController = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new AppError(400,"Company ID is required");
        }

        const company = await deleteCompany(id);

        if (!company) {
            throw new AppError(404,"Company not found");
        }

        res.status(200).json({
            success: true,
            message: "Company deleted successfully",
            company,
        });
    } catch (error) {
        next(error);
    }
};
