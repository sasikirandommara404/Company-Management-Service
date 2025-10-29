import { jest } from '@jest/globals';
import request from 'supertest';
import prisma from '../db/db.js';

// Mock the auth middleware BEFORE importing app (ES Module style)
const mockAuthenticateToken = (req, res, next) => {
    req.user = { 
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin'
    };
    next();
};

const mockAuthorizeCompanyAccess = (req, res, next) => {
    next();
};

// Mock the module
jest.unstable_mockModule('../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken,
    authorizeCompanyAccess: mockAuthorizeCompanyAccess
}));

// Now import app AFTER mocking
const { default: app } = await import('../app.js');

let companyId;
const testEmail = `test-${Date.now()}@techcorp.com`;

describe('Company API Endpoints', () => {
    // Clean up before all tests
    beforeAll(async () => {
        try {
            // Delete any existing test companies
            await prisma.company.deleteMany({
                where: {
                    OR: [
                        { email: { contains: '@techcorp.com' } },
                        { email: { contains: '@tech.com' } },
                        { name: { contains: 'Tech Corp' } }
                    ]
                }
            });
        } catch (error) {
            console.error('Error cleaning up before tests:', error);
        }
    });

    // Clean up after all tests
    afterAll(async () => {
        try {
            // Delete the created test company if it exists
            if (companyId) {
                await prisma.company.delete({
                    where: { id: companyId }
                }).catch(() => {
                    // Ignore error if already deleted
                });
            }

            // Clean up any remaining test data
            await prisma.company.deleteMany({
                where: {
                    OR: [
                        { email: { contains: '@techcorp.com' } },
                        { email: { contains: '@tech.com' } },
                        { name: { contains: 'Tech Corp' } }
                    ]
                }
            });
        } catch (error) {
            console.error('Error cleaning up after tests:', error);
        } finally {
            await prisma.$disconnect();
        }
    });

    it("should create a new company", async () => {
        const res = await request(app).post('/api/company/create').send({
            "name": "Tech Corp",
            "registration_number": `R${Date.now()}`,
            "email": testEmail,
            "phone": "1234567990",
            "website": "https://techcorp.com",
            "industry": "Technology",
            "address": {
                "street": "123 Tech Street",
                "city": "Silicon Valley",
                "state": "CA",
                "zip": "94105",
                "country": "USA"
            },
            "logo_url": "https://techcorp.com/logo.png",
            "status": "active",
            "subscription_tier": "premium",
            "billing_info": {
                "tax_id": "TAX123456",
                "billing_address": {
                    "street": "123 Billing St",
                    "city": "San Francisco",
                    "state": "CA",
                    "zip": "94105",
                    "country": "USA"
                }
            },
            "settings": {
                "timezone": "PST",
                "currency": "USD",
                "notifications": true
            },
            "created_by": "admin-user-id",
            "version": 1
        });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('company');
        expect(res.body.company).toHaveProperty('id');
        
        // Store companyId for subsequent tests
        companyId = res.body.company.id;
        expect(companyId).toBeDefined();
    });

    it("should fetch all companies", async () => {
        const res = await request(app).get('/api/company/get');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('companies');
        expect(Array.isArray(res.body.companies)).toBe(true);
        expect(res.body.companies.length).toBeGreaterThan(0);
    });

    it("should fetch company by ID", async () => {
        expect(companyId).toBeDefined();
        const res = await request(app).get(`/api/company/get/${companyId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('company');
        expect(res.body.company.id).toBe(companyId);
        expect(res.body.company.email).toBe(testEmail);
    });

    it("should update company details", async () => {
        expect(companyId).toBeDefined();
        const res = await request(app).put(`/api/company/update/${companyId}`).send({
            phone: "0987654321",
            website: "https://new.techcorp.com",
            updated_by: "admin-user-id-2",
            "version": 2
        });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('company');
        expect(res.body.company.phone).toBe("0987654321");
        expect(res.body.company.website).toBe("https://new.techcorp.com");
    });

    it("should delete company", async () => {
        expect(companyId).toBeDefined();
        const res = await request(app).delete(`/api/company/delete/${companyId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('company');
        
        // Verify deletion
        const verifyRes = await request(app).get(`/api/company/get/${companyId}`);
        expect(verifyRes.statusCode).toBe(404);
        
        // Clear companyId since it's deleted
        companyId = null;
    });
});

describe('Company API Negative Test Cases', () => {
    // Clean up after negative tests
    afterAll(async () => {
        try {
            await prisma.company.deleteMany({
                where: {
                    OR: [
                        { registration_number: { contains: 'REG' } },
                        { name: 'A' }
                    ]
                }
            });
        } catch (error) {
            console.error('Error cleaning up after negative tests:', error);
        }
    });

    it('should fail when sending empty object', async () => {
        const res = await request(app)
            .post('/api/company/create')
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('details');
        expect(res.body.details).toContain('"name" is required');
        expect(res.body.details).toContain('"registration_number" is required');
        expect(res.body.details).toContain('"email" is required');
        expect(res.body.details).toContain('"status" is required');
        expect(res.body.details).toContain('"subscription_tier" is required');
    });

    it('should fail when sending invalid email and phone', async () => {
        const res = await request(app)
            .post('/api/company/create')
            .send({
                name: "A",
                registration_number: "REG001",
                email: "invalid-email",
                phone: "1234abc",
                status: "active",
                subscription_tier: "premium"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.details).toContain('"name" length must be at least 2 characters long');
        expect(res.body.details).toContain('"email" must be a valid email');
        expect(res.body.details).toContain('"phone" with value "1234abc" fails to match the required pattern: /^[0-9]{10,15}$/');
    });

    it('should fail when sending invalid status or subscription_tier', async () => {
        const res = await request(app)
            .post('/api/company/create')
            .send({
                name: "Tech Corp",
                registration_number: "REG123",
                email: "test@tech.com",
                status: "unknown_status",
                subscription_tier: "gold"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.details).toContain('"status" must be one of [active, inactive, suspended]');
        expect(res.body.details).toContain('"subscription_tier" must be one of [free, basic, premium, enterprise]');
    });

    it('should fail when sending nested object in wrong format', async () => {
        const res = await request(app)
            .post('/api/company/create')
            .send({
                name: "Tech Corp",
                registration_number: "REG123",
                email: "test@tech.com",
                status: "active",
                subscription_tier: "premium",
                address: "this should be object"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.details).toContain('"address" must be of type object');
    });

    it('should fail when trying to fetch non-existent company', async () => {
        const nonExistentId = 'non-existent-id-12345';
        const res = await request(app).get(`/api/company/get/${nonExistentId}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('should fail when trying to update non-existent company', async () => {
        const nonExistentId = 'non-existent-id-12345';
        const res = await request(app)
            .put(`/api/company/update/${nonExistentId}`)
            .send({ phone: "1234567890" });
        
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('should fail when trying to delete non-existent company', async () => {
        const nonExistentId = 'non-existent-id-12345';
        const res = await request(app).delete(`/api/company/delete/${nonExistentId}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });
});