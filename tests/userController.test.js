require("dotenv").config();
const mongoose = require("mongoose");
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { revokeToken } = require("../middlewares/global");
const { isLoggedIn } = require('../middlewares/global');
const { SECRET, TEST_DB } = process.env;


const app = express();
app.use(bodyParser.json());

const User = require('../models/User');

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

  jest.mock('../middlewares/roleCheck', () => () => (req, res, next) => {
    next();
  });
  
  jest.mock('../middlewares/permissionCheck', () => () => (req, res, next) => {
    next();
  });

  app.use((req, res, next) => {
    req.context = {
        models: {
            User: User
        }
    };
    next();
    });

  const userRouter = require('../controllers/User');
  app.use('/user', userRouter);

  const adminRouter = require('../controllers/Admin');
  app.use('/admin', adminRouter);

  app.get('/protected', isLoggedIn, (req, res) => {
    res.status(200).json({
        message: `Protected route. You're currently logged in! Welcome user: ${req.user.username}. Your role is ${req.user.role}`
    });
  });

describe('User Controller', () =>{
  beforeAll(async () => {
    await mongoose.connect(TEST_DB);
  });
  beforeEach(async () => {
    await User.deleteMany({});
  });
  afterAll(async () => {    
    await mongoose.connection.close();

  });

  it('should create a new user', async () => {
    const response = await request(app)
      .post('/user/signup')
      .send({ username: 'testuseruc', password: 'testpass123' });
  
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toHaveProperty('username', 'testuseruc');
    expect(response.body.message).toHaveProperty('role', 'user');
    expect(response.body.message).toHaveProperty('permissions');
    expect(response.body.message.permissions).toContain('read:own');
    expect(response.body.message).toHaveProperty('_id');
    expect(response.body.message).not.toHaveProperty('password');
  });

  it('should not create a user with an existing username', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'existinguser', password: 'pass123'});

    const response = await request(app)
      .post('/user/signup')
      .send({ username: 'existinguser', password: 'anotherpass'});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'User already exists!');
  });

  it('should login a user', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'loginuser', password: 'loginpass'});

    const response = await request(app)
      .post('/user/login')
      .send({ username: 'loginuser', password: 'loginpass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });

  it('should not login with incorrect credentials', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'loginuser', password: 'loginpass'});
    const response = await request(app)
      .post('/user/login')
      .send({ username: 'loginuser', password: 'wrongpass' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Passwords do not match!');
  });

  it('should logout a user', async () => {
    // First, create and login a user
    await request(app)
      .post('/user/signup')
      .send({ username: 'logoutuser', password: 'logoutpass'});
  
    const loginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'logoutuser', password: 'logoutpass' });
    
    const token = loginResponse.body.token;
    console.log(`Token to check: ${token}`);
    // Now attempt to logout
    const response = await request(app)
      .get('/user/logout')
      .set('Authorization', `Bearer ${token}`);
  
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'User logoutuser logged out!');
  });

  it('should not access protected route without token', async () => {
    const response = await request(app)
      .get('/protected');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'No auth header provided');
  });

  it('should access protected route with valid token', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'loginuser', password: 'loginpass'});
    
    const loginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'loginuser', password: 'loginpass' });

    const token = loginResponse.body.token;

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', "Protected route. You're currently logged in! Welcome user: loginuser. Your role is user");
  });

  it('should delete the user\'s own account', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'deleteuser', password: 'testpass' });

    const loginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'deleteuser', password: 'testpass' });

    const token = loginResponse.body.token;

    const deleteResponse = await request(app)
      .delete('/user/delete')
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toHaveProperty('message', 'User account deleted successfully');
});

});
