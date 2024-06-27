const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const adminRouter = require('../controllers/Admin');
const { createContext, isLoggedIn } = require('../middlewares/global');
const { User } = require('../models/User');

const app = express();
app.use(bodyParser.json());
app.use(createContext);
app.use('/admin', isLoggedIn, adminRouter);

describe('Admin Controller', () => {
  let token;
  beforeAll(async () => {
    // Setup initial admin user
    await User.create({ username: 'admin', password: await bcrypt.hash('adminpass', 10), role: 'admin' });
    const response = await request(app)
      .post('/user/login')
      .send({ username: 'admin', password: 'adminpass' });
    token = response.body.token;
  });

  it('should update a user role', async () => {
    await User.create({ username: 'user1', password: await bcrypt.hash('userpass', 10), role: 'user' });

    const response = await request(app)
      .post('/admin/update-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'user1', role: 'manager' });

    expect(response.status).toBe(200);
    expect(response.body.user).toHaveProperty('role', 'manager');
  });
});
