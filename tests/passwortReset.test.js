require("dotenv").config();
const mongoose = require("mongoose");
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
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
    email: {type: String, required: true},
    token: {type: String},
    role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
    permissions: { type: [String], default: [] },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date } 
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

describe('Password Reset', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB);
    console.log('Connected to test database:', TEST_DB);

    await User.deleteMany({});
    await User.create({ username: 'resetuser', password: await bcrypt.hash('resetpass', 10), email: 'resetuser@example.com' });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    console.log('Closed test database connection');
  });

  it('should request password reset', async () => {
    const response = await request(app)
      .post('/user/request-reset')
      .send({ username: 'resetuser' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('resetToken');
    expect(response.body).toHaveProperty('resetUrl');
  });

  it('should not request password reset for non-existent user', async () => {
    const response = await request(app)
      .post('/user/request-reset')
      .send({ username: 'nonexistentuser' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'User not found.');
  });



  it('should not reset password with invalid token', async () => {
    const response = await request(app)
      .post('/user/reset/invalidtoken')
      .send({ password: 'newresetpass' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password reset token is invalid or has expired.');
  });

  it('should not reset password to the same old password', async () => {
    // First, request a password reset
    const requestResponse = await request(app)
      .post('/user/request-reset')
      .send({ username: 'resetuser' });
  
    expect(requestResponse.status).toBe(200);
    const { resetToken } = requestResponse.body;
  
    // Attempt to reset the password to the same value
    const response = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: 'resetpass' });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'New password must be different from the old password.');
  });
  
  it('should reset password', async () => {
    const resetToken = crypto.randomBytes(20).toString('hex');
    await User.findOneAndUpdate({ username: 'resetuser' }, { resetPasswordToken: resetToken, resetPasswordExpires: Date.now() + 3600000 });

    const response = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: 'newresetpass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Password has been reset.');
  });

  it('should not reset password with expired token', async () => {
    const user = await User.findOne({ username: 'resetuser' });
    const expiredToken = jwt.sign({ id: user._id }, SECRET, { expiresIn: '0s' });
    
    const response = await request(app)
      .post(`/user/reset/${expiredToken}`)
      .send({ password: 'newpassword123' });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password reset token is invalid or has expired.');
  });
  
  it('should not reset password with malformed token', async () => {
    const response = await request(app)
      .post(`/user/reset/malformedtoken123`)
      .send({ password: 'newpassword123' });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password reset token is invalid or has expired.');
  });
  
  it('should not reset password with empty password', async () => {
    const requestResponse = await request(app)
      .post('/user/request-reset')
      .send({ username: 'resetuser' });
  
    const { resetToken } = requestResponse.body;
  
    const response = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: '' });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password cannot be empty.');
  });
  
  it('should not reset password with password too short', async () => {
    const requestResponse = await request(app)
      .post('/user/request-reset')
      .send({ username: 'resetuser' });
  
    const { resetToken } = requestResponse.body;
  
    const response = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: 'short' });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password must be at least 8 characters long.');
  });
  
  it('should not allow multiple password resets with the same token', async () => {
    const requestResponse = await request(app)
      .post('/user/request-reset')
      .send({ username: 'resetuser' });
  
    const { resetToken } = requestResponse.body;
  
    // First reset attempt
    const firstResponse = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: 'validnewpassword123' });
  
    expect(firstResponse.status).toBe(200);
  
    // Second reset attempt with the same token
    const secondResponse = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: 'anothernewpassword123' });
  
    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body).toHaveProperty('error', 'Password reset token is invalid or has expired.');
  });
  
  it('should not reset password for a user that does not exist', async () => {
    const nonExistentUser = new User({ username: 'nonexistent', password: 'dummy' });
    const resetToken = crypto.randomBytes(20).toString('hex');
    nonExistentUser.resetPasswordToken = resetToken;
    nonExistentUser.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  
    const response = await request(app)
      .post(`/user/reset/${resetToken}`)
      .send({ password: 'newpassword123' });
  
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Password reset token is invalid or has expired.');
  });
  
});
