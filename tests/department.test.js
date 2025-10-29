import { jest } from '@jest/globals';
import request from 'supertest';
import prisma from '../db/db.js';

// Mock the auth middleware BEFORE importing app
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
let departmentId;

describe('Company Department API Endpoints', () => {

  // Setup: Create a test company first
  beforeAll(async () => {
    try {
      // Clean up any existing test data
      await prisma.department.deleteMany({
        where: {
          code: { contains: 'DEPT-' }
        }
      });

      await prisma.company.deleteMany({
        where: {
          email: { contains: '@dept-test.com' }
        }
      });

      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: "Test Company For Departments",
          registration_number: `DEPT-REG-${Date.now()}`,
          email: `company-${Date.now()}@dept-test.com`,
          status: "active",
          subscription_tier: "premium",
          created_by: "test-user"
        }
      });
      companyId = company.id;
    } catch (error) {
      console.error('Error in beforeAll:', error);
    }
  });

  // Cleanup after all tests
  afterAll(async () => {
    try {
      // Delete departments first (foreign key dependency)
      await prisma.department.deleteMany({
        where: {
          company_id: companyId
        }
      });

      // Then delete the company
      if (companyId) {
        await prisma.company.delete({
          where: { id: companyId }
        }).catch(() => {});
      }

      // Clean up any test data
      await prisma.department.deleteMany({
        where: {
          code: { contains: 'DEPT-' }
        }
      });

      await prisma.company.deleteMany({
        where: {
          email: { contains: '@dept-test.com' }
        }
      });
    } catch (error) {
      console.error('Error cleaning up:', error);
    } finally {
      await prisma.$disconnect();
    }
  });
  
  // Create Department
  it("should create a new department", async () => {
    const res = await request(app)
      .post(`/api/company/department/create/${companyId}`)
      .send({
        name: "Engineering",
        code: `DEPT-${Date.now().toString().slice(-8)}`, // Shorter code to meet validation
        description: "Engineering department",
        cost_center: "CC100",
        budget_allocated: 100000,
        budget_used: 50000,
        manager_id: "manager123",
        level: 1,
        path: "Engineering",
        is_active: true
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    
    departmentId = res.body.data.id;
  });

  // Get All Departments
  it("should fetch all departments of a company", async () => {
    const res = await request(app).get(`/api/company/department/get/${companyId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Get Department by ID
  it("should fetch department by ID", async () => {
    const res = await request(app).get(`/api/company/department/get/${companyId}/${departmentId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.id).toBe(departmentId);
  });

  // Update Department
  it("should update department details", async () => {
    const res = await request(app)
      .put(`/api/company/department/update/${companyId}/${departmentId}`)
      .send({
        description: "Updated Engineering department",
        budget_allocated: 120000,
        is_active: false
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.description).toBe("Updated Engineering department");
    expect(res.body.data.budget_allocated).toBe(120000);
  });

  // Delete Department
  it("should delete department", async () => {
    const res = await request(app).delete(`/api/company/department/delete/${companyId}/${departmentId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });

});

describe('Company Department API Negative Test Cases', () => {
  let testCompanyId;

  beforeAll(async () => {
    try {
      // Create a test company for negative tests
      const company = await prisma.company.create({
        data: {
          name: "Test Company For Negative Dept Tests",
          registration_number: `NEG-DEPT-${Date.now()}`,
          email: `negative-dept-${Date.now()}@test.com`,
          status: "active",
          subscription_tier: "basic",
          created_by: "test-user"
        }
      });
      testCompanyId = company.id;
    } catch (error) {
      console.error('Error creating test company:', error);
    }
  });

  afterAll(async () => {
    try {
      // Clean up departments
      await prisma.department.deleteMany({
        where: {
          company_id: testCompanyId
        }
      });

      // Delete test company
      if (testCompanyId) {
        await prisma.company.delete({
          where: { id: testCompanyId }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error cleaning up negative tests:', error);
    }
  });

  it('should fail when sending empty object for create', async () => {
    const res = await request(app)
      .post(`/api/company/department/create/${testCompanyId}`)
      .send({});
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toContain('"name" is required');
    expect(res.body.details).toContain('"code" is required');
  });

  it('should fail when sending invalid field types', async () => {
    const res = await request(app)
      .post(`/api/company/department/create/${testCompanyId}`)
      .send({
        name: "E",
        code: "C",
        budget_allocated: -1000,
        budget_used: -50,
        is_active: "yes"
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toContain('"name" length must be at least 2 characters long');
    expect(res.body.details).toContain('"code" length must be at least 2 characters long');
    expect(res.body.details).toContain('"budget_allocated" must be a positive number');
    expect(res.body.details).toContain('"budget_used" must be greater than or equal to 0');
    expect(res.body.details).toContain('"is_active" must be a boolean');
  });

});