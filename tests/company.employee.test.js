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
let employeeId;
let departmentId;

describe('Company Employee API Endpoints', () => {

  // Setup: Create a test company and department first
  beforeAll(async () => {
    try {
      // Clean up any existing test data
      await prisma.companyEmployee.deleteMany({
        where: {
          employee_id: { contains: 'emp-test' }
        }
      });

      await prisma.department.deleteMany({
        where: {
          code: { contains: 'TEST-DEPT' }
        }
      });

      await prisma.company.deleteMany({
        where: {
          email: { contains: '@employee-test.com' }
        }
      });

      // Create a test company
      const company = await prisma.company.create({
        data: {
          name: "Test Company For Employees",
          registration_number: `EMP-REG-${Date.now()}`,
          email: `company-${Date.now()}@employee-test.com`,
          status: "active",
          subscription_tier: "premium",
          created_by: "test-user"
        }
      });
      companyId = company.id;

      // Create a test department
      const department = await prisma.department.create({
        data: {
          company_id: companyId,
          name: "Test Department",
          code: `TEST-DEPT-${Date.now()}`,
          description: "Test department for employee tests",
          is_active: true
        }
      });
      departmentId = department.id;
    } catch (error) {
      console.error('Error in beforeAll:', error);
    }
  });

  // Cleanup after all tests
  afterAll(async () => {
    try {
      // Delete employees first (foreign key dependency)
      await prisma.companyEmployee.deleteMany({
        where: {
          company_id: companyId
        }
      });

      // Delete departments
      if (departmentId) {
        await prisma.department.delete({
          where: { id: departmentId }
        }).catch(() => {});
      }

      // Then delete the company
      if (companyId) {
        await prisma.company.delete({
          where: { id: companyId }
        }).catch(() => {});
      }

      // Clean up any test data
      await prisma.companyEmployee.deleteMany({
        where: {
          employee_id: { contains: 'emp-test' }
        }
      });

      await prisma.department.deleteMany({
        where: {
          code: { contains: 'TEST-DEPT' }
        }
      });

      await prisma.company.deleteMany({
        where: {
          email: { contains: '@employee-test.com' }
        }
      });
    } catch (error) {
      console.error('Error cleaning up:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  // Create Employee
  it("should create a new employee for a company", async () => {
    const res = await request(app)
      .post(`/api/company/employ/create/${companyId}`)
      .send({
        user_id: "user-123",
        employee_id: `emp-test-${Date.now()}`,
        department_id: departmentId,
        designation: "Software Engineer",
        role: "developer",
        budget_limit: 50000,
        start_date: new Date("2025-01-01T00:00:00Z").toISOString(),
        salary_band: "L3",
        reporting_manager_id: "manager-123",
        employment_type: "full-time",
        status: "active"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('id');
    
    employeeId = res.body.data.employee_id;
  });

  // Get All Employees
  it("should fetch all employees for a company", async () => {
    const res = await request(app).get(`/api/company/employ/get/${companyId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // Get Employee by ID
  it("should fetch employee by ID", async () => {
    const res = await request(app).get(`/api/company/employ/get/${companyId}/${employeeId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.employee_id).toBe(employeeId);
  });

  // Update Employee
  it("should update employee details", async () => {
    const res = await request(app)
      .put(`/api/company/employ/update/${companyId}/${employeeId}`)
      .send({
        designation: "Senior Software Engineer",
        role: "senior developer",
        status: "active"
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.designation).toBe("Senior Software Engineer");
  });

  // Delete Employee
  it("should delete an employee", async () => {
    const res = await request(app).delete(`/api/company/employ/delete/${companyId}/${employeeId}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });

});

describe('Company Employee API Negative Test Cases', () => {
  let testCompanyId;

  beforeAll(async () => {
    try {
      // Create a test company for negative tests
      const company = await prisma.company.create({
        data: {
          name: "Test Company For Negative Employee Tests",
          registration_number: `NEG-EMP-${Date.now()}`,
          email: `negative-employee-${Date.now()}@test.com`,
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
      // Clean up employees
      await prisma.companyEmployee.deleteMany({
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

  it('should fail to create employee with missing required fields', async () => {
    const res = await request(app)
      .post(`/api/company/employ/create/${testCompanyId}`)
      .send({
        user_id: "user-123"
        // Missing employee_id, role, and status
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toContain('"employee_id" is required');
    expect(res.body.details).toContain('"role" is required');
    expect(res.body.details).toContain('"status" is required');
  });

  it('should fail to update employee with invalid fields', async () => {
    // First create an employee
    const createRes = await request(app)
      .post(`/api/company/employ/create/${testCompanyId}`)
      .send({
        user_id: "user-123",
        employee_id: `emp-invalid-${Date.now()}`,
        role: "developer",
        status: "active"
      });

    const testEmployeeId = createRes.body.data.employee_id;

    // Try to update with invalid field
    const res = await request(app)
      .put(`/api/company/employ/update/${testCompanyId}/${testEmployeeId}`)
      .send({
        invalidField: "This should not be allowed"
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toContain('"invalidField" is not allowed');
  });

  it('should fail to fetch non-existent employee', async () => {
    const res = await request(app).get(`/api/company/employ/get/${testCompanyId}/nonexistent-emp-id`);
    
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Invalid CompanyId or EmployeeId');
  });

});