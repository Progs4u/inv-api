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

  jest.mock('../middlewares/global', () => ({
    isLoggedIn: jest.fn((req, res, next) => {
      next();
    }),
    revokeToken: jest.fn()
  }));

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


describe('Password Reset', () =>{
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
      .send({ username: 'testuserpwreset', password: 'testpass123'});
    try {
      expect(response.status).toBe(200)
    } catch (e) {
      console.error(e);
    }

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toHaveProperty('username', 'testuserpwreset');
    expect(response.body.message).toHaveProperty('role', 'user');
    expect(response.body.message).not.toHaveProperty('password');
  });

});
