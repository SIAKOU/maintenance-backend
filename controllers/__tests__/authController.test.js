const { login } = require('../authController');
const httpMocks = require('node-mocks-http');

jest.mock('../../models', () => ({
  User: { findOne: jest.fn() },
  AuditLog: { create: jest.fn() },
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  role: 'admin',
  isActive: true,
  validatePassword: jest.fn(),
  update: jest.fn(),
};

describe('authController.login', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if validation fails', async () => {
    const req = httpMocks.createRequest({
      body: { email: '', password: '' },
    });
    const res = httpMocks.createResponse();
    await login(req, res);
    expect(res.statusCode).toBe(400);
    expect(res._getJSONData()).toHaveProperty('error');
  });

  it('should return 401 if user not found', async () => {
    require('../../models').User.findOne.mockResolvedValue(null);
    const req = httpMocks.createRequest({
      body: { email: 'notfound@example.com', password: 'pass1234' },
    });
    const res = httpMocks.createResponse();
    await login(req, res);
    expect(res.statusCode).toBe(401);
    expect(res._getJSONData()).toHaveProperty('error');
  });

  it('should return 401 if password is invalid', async () => {
    require('../../models').User.findOne.mockResolvedValue(mockUser);
    mockUser.validatePassword.mockResolvedValue(false);
    const req = httpMocks.createRequest({
      body: { email: 'test@example.com', password: 'wrongpass' },
    });
    const res = httpMocks.createResponse();
    await login(req, res);
    expect(res.statusCode).toBe(401);
    expect(res._getJSONData()).toHaveProperty('error');
  });

  it('should return 200 and a token if login is successful', async () => {
    require('../../models').User.findOne.mockResolvedValue(mockUser);
    mockUser.validatePassword.mockResolvedValue(true);
    mockUser.update.mockResolvedValue();
    const req = httpMocks.createRequest({
      body: { email: 'test@example.com', password: 'pass1234' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    });
    const res = httpMocks.createResponse();
    process.env.JWT_SECRET = 'testsecret';
    await login(req, res);
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toHaveProperty('token');
    expect(res._getJSONData()).toHaveProperty('user');
  });
}); 