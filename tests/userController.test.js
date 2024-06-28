require("dotenv").config();
const mongoose = require("mongoose");
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { isLoggedIn } = require('../middlewares/global');
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
    email: {type: String, required: true},
    token: {type: String},
    role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
    permissions: { type: [String], default: [] }
  });
  return mongoose.model('User', UserSchema);
});

const userRouter = require('../controllers/User');
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

app.get('/protected', isLoggedIn, (req, res) => {
  res.status(200).json({
      message: `Protected route. You're currently logged in! Welcome user: ${req.user.username}. Your role is ${req.user.role}`
  });
});

describe('User Controller', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB);
    console.log('Connected to test database:', TEST_DB);

    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
    console.log('Closed test database connection');
  });

  it('should create a new user', async () => {
    const response = await request(app)
      .post('/user/signup')
      .send({ username: 'testuser', password: 'testpass123', email: 'test@example.com' });
  
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toHaveProperty('username', 'testuser');
    expect(response.body.message).toHaveProperty('role', 'user');
    expect(response.body.message).not.toHaveProperty('password');
  });
  
  it('should not create a user with an existing username', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'existinguser', password: 'pass123', email: 'existing@example.com' });

    const response = await request(app)
      .post('/user/signup')
      .send({ username: 'existinguser', password: 'anotherpass', email: 'another@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'User already exists!');
  });

  it('should login a user', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'loginuser', password: 'loginpass', email: 'login@example.com' });

    const response = await request(app)
      .post('/user/login')
      .send({ username: 'loginuser', password: 'loginpass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });

  it('should not login with incorrect credentials', async () => {
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
      .send({ username: 'logoutuser', password: 'logoutpass', email: 'logout@example.com' });
  
    const loginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'logoutuser', password: 'logoutpass' });
  
    const token = loginResponse.body.token;
  
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

  // Add more test cases as needed
});
