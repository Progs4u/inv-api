require("dotenv").config();
const mongoose = require("mongoose");
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { SECRET } = process.env;

// Mock the database connection
jest.mock('../middlewares/db.connection', () => ({
  connection: { on: jest.fn() },
}));

// Mock the User model
jest.mock('../models/User', () => {
  const mongoose = require('mongoose');
  const UserSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: {type: String, required: true},
    token: {type: String},
    role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
    permissions: { type: [String], default: [] }
  });

  UserSchema.methods.updatePermissions = function() {
    const { roles } = require('../utils/permissions');
    this.permissions = roles[this.role] || [];
  };

  UserSchema.pre('save', function(next) {
    if (this.isNew) {
      this.updatePermissions();
    }
    next();
  });

  return mongoose.model('User', UserSchema);
});

const userRouter = require('../controllers/User');
const adminRouter = require('../controllers/Admin');
const User = require('../models/User');

const TEST_DB = process.env.TEST_DB;
if (!TEST_DB) {
  throw new Error('TEST_DB environment variable is not defined');
}

const app = express();
app.use(bodyParser.json());

app.use((req, res, next) => {
    req.context = {
        models: {
            User: User
        }
    };
    next();
});

app.use('/user', userRouter);
app.use('/admin', adminRouter);

describe('Admin Controller', () => {
  let adminToken, managerToken, userToken;

  beforeAll(async () => {
    await mongoose.connect(TEST_DB);
    console.log('Connected to test database:', TEST_DB);

    // Create users for each role
    const adminUser = new User({
      username: 'testadmin',
      password: await bcrypt.hash('adminpass123', 10),
      role: 'admin'
    });
    await adminUser.save();

    const managerUser = new User({
      username: 'testmanager',
      password: await bcrypt.hash('managerpass123', 10),
      role: 'manager'
    });
    await managerUser.save();

    const regularUser = new User({
      username: 'testuser',
      password: await bcrypt.hash('userpass123', 10),
      role: 'user'
    });
    await regularUser.save();

    // Login to get tokens for each role
    const adminLoginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'testadmin', password: 'adminpass123' });
    adminToken = adminLoginResponse.body.token;

    const managerLoginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'testmanager', password: 'managerpass123' });
    managerToken = managerLoginResponse.body.token;

    const userLoginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'testuser', password: 'userpass123' });
    userToken = userLoginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    console.log('Closed test database connection');
  });

  it('should allow admin to update user role', async () => {
    const response = await request(app)
      .post('/admin/update-role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'testuser', role: 'manager' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'User role updated successfully');
    expect(response.body.user).toHaveProperty('role', 'manager');
  });

  it('should not allow manager to update user role', async () => {
    const response = await request(app)
      .post('/admin/update-role')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ username: 'testuser', role: 'admin' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
  });

  it('should not allow regular user to update user role', async () => {
    const response = await request(app)
      .post('/admin/update-role')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: 'testmanager', role: 'user' });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
  });

  it('should allow admin to access protected route', async () => {
    const response = await request(app)
      .get('/admin/test')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Welcome Admin!');
  });

  it('should not allow manager to access admin-only protected route', async () => {
    const response = await request(app)
      .get('/admin/test')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
  });

  it('should not allow regular user to access admin-only protected route', async () => {
    const response = await request(app)
      .get('/admin/test')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
  });
});
