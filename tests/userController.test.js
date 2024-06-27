const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const userRouter = require('../controllers/User');
const { createContext } = require('../middlewares/global');

const app = express();
app.use(bodyParser.json());
app.use(createContext);
app.use('/user', userRouter);

describe('User Controller', () => {
  it('should sign up a new user', async () => {
    const response = await request(app)
      .post('/user/signup')
      .send({ username: 'testuser', password: 'testpass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser');
  });

  it('should not sign up a user with an existing username', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'testuser', password: 'testpass' });

    const response = await request(app)
      .post('/user/signup')
      .send({ username: 'testuser', password: 'testpass' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'User already exists!');
  });

  it('should log in a user', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'testuser2', password: 'testpass' });

    const response = await request(app)
      .post('/user/login')
      .send({ username: 'testuser2', password: 'testpass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', 'testuser2');
  });

  it('should not log in a user with wrong password', async () => {
    await request(app)
      .post('/user/signup')
      .send({ username: 'testuser3', password: 'testpass' });

    const response = await request(app)
      .post('/user/login')
      .send({ username: 'testuser3', password: 'wrongpass' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Passwords do not match!');
  });
});
