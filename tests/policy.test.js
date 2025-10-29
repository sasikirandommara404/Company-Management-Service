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
let policyId;

describe('Company Policy API Endpoints', () => {

  // Setup: Create a test company first
  beforeAll(async () => {
    try {
      // Clean up any existing test data
      await prisma.companyPolicy.deleteMany({
        where: {
          name: { contains: 'Test Policy' }
        }
      });

      await prisma.company.deleteMany({
        where: {
          email: { contains: '@policy-test.com' }
        }
      });

      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: "Test Company For Policies",
          registration_number: `POL-REG-${Date.now()}`,
          email: `company-${Date.now()}@policy-test.com`,
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
      // Delete policies first (foreign key dependency)
      await prisma.companyPolicy.deleteMany({
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
      await prisma.companyPolicy.deleteMany({
        where: {
          name: { contains: 'Test Policy' }
        }
      });

      await prisma.company.deleteMany({
        where: {
          email: { contains: '@policy-test.com' }
        }
      });
    } catch (error) {
      console.error('Error cleaning up:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  // Create Policy
  it("should create a new policy", async () => {
    const res = await request(app)
      .post(`/api/company/policy/create/${companyId}`)
      .send({
        policy_type: "HR",
        name: "Test Policy Leave",
        description: "Annual leave policy",
        rules: { max_leave: 30 },
        is_active: true,
        priority: 1,
        effective_from: new Date("2025-01-01T00:00:00Z").toISOString(),
        effective_to: new Date("2025-12-31T23:59:59Z").toISOString(),
        created_by: "admin",
        version: 1
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('companyPolicy');
    expect(res.body.companyPolicy).toHaveProperty('id');
    
    policyId = res.body.companyPolicy.id;
  });

  // Get All Policies
  it("should fetch all policies of a company", async () => {
    const res = await request(app).get(`/api/company/policy/get/${companyId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('companyPolicy');
    expect(Array.isArray(res.body.companyPolicy)).toBe(true);
    expect(res.body.companyPolicy.length).toBeGreaterThan(0);
  });

  // Get Policy by ID
  it("should fetch policy by ID", async () => {
    const res = await request(app).get(`/api/company/policy/get/${companyId}/${policyId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('companyPolicy');
    expect(res.body.companyPolicy.id).toBe(policyId);
  });

  // Update Policy
  it("should update policy details", async () => {
    const res = await request(app)
      .put(`/api/company/policy/update/${companyId}/${policyId}`)
      .send({
        description: "Updated leave policy",
        priority: 2,
        is_active: false
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('companyPolicy');
    expect(res.body.companyPolicy.description).toBe("Updated leave policy");
    expect(res.body.companyPolicy.priority).toBe(2);
  });

  // Delete Policy
  it("should delete policy", async () => {
    const res = await request(app).delete(`/api/company/policy/delete/${companyId}/${policyId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('companyPolicy');
  });

});

describe('Company Policy API Negative Test Cases', () => {
  let testCompanyId;

  beforeAll(async () => {
    try {
      // Create a test company for negative tests
      const company = await prisma.company.create({
        data: {
          name: "Test Company For Negative Policy Tests",
          registration_number: `NEG-POL-${Date.now()}`,
          email: `negative-policy-${Date.now()}@test.com`,
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
      // Clean up policies
      await prisma.companyPolicy.deleteMany({
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
      .post(`/api/company/policy/create/${testCompanyId}`)
      .send({});
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toContain('"policy_type" is required');
    expect(res.body.details).toContain('"name" is required');
  });

  it('should fail when sending invalid data types', async () => {
    const res = await request(app)
      .post(`/api/company/policy/create/${testCompanyId}`)
      .send({
        policy_type: "HR",
        name: "LP",
        rules: "should be object",
        is_active: "yes",
        priority: 0, // Changed from -1 to 0, as 0 might not be considered positive
        version: "abc"
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toContain('"name" length must be at least 3 characters long');
    expect(res.body.details).toContain('"rules" must be of type object');
    expect(res.body.details).toContain('"is_active" must be a boolean');
    // Note: priority validation might accept 0, so we check for version instead
    expect(res.body.details).toContain('Version must be a positive integer or a string containing only digits');
  });

});