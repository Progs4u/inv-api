const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const userRouter = require('../controllers/User');
const { createContext } = require('../middlewares/global');
const { User } = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
app.use(bodyParser.json());
app.use(createContext);
app.use('/user', userRouter);

describe('Password Reset', () => {
  beforeAll(async () => {
    // Setup initial user
    await User.create({ username: 'resetuser', password: await bcrypt.hash('resetpass', 10), email: 'resetuser@example.com' });
  });

  it('should request password reset', async () => {
    const response = await request(app)
      .post('/user/request-reset')
      .send({ email: 'resetuser@example.com' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('resetToken');
    expect(response.body).toHaveProperty('resetUrl');
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
});
