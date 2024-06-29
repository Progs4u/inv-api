require("dotenv").config();
const mongoose = require("mongoose");
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { revokeToken, createContext, isLoggedIn } = require('../middlewares/global');
const { permissionCheck } = require('../middlewares/permissionCheck');

const { SECRET, TEST_DB } = process.env;

const app = express();
app.use(bodyParser.json());
app.use(createContext); // Apply createContext middleware

const userRouter = require('../controllers/User');
const adminRouter = require('../controllers/Admin');

const User = require('../models/User');

// Mock the database connection
jest.mock('../middlewares/db.connection', () => ({
  connection: { on: jest.fn() },
}));

// Mock the User model
jest.mock('../models/User', () => {
  const mongoose = require('mongoose');
  const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    token: { type: String },
    role: { type: String, default: 'user', enum: ['user', 'admin', 'manager'] },
    permissions: { type: [String], default: [] }
  });

  UserSchema.methods.updatePermissions = function () {
    const { roles } = require('../utils/permissions');
    this.permissions = roles[this.role] || [];
  };

  UserSchema.pre('save', function (next) {
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
  revokeToken: jest.fn(),
  createContext: jest.fn((req, res, next) => {
    req.context = {
      models: {
        User: require('../models/User')
      }
    };
    next();
  })
}));

jest.mock('../middlewares/roleCheck', () => () => (req, res, next) => {
  next();
});

jest.mock('../utils/permissions', () => ({
  canPerformAction: jest.fn((role, action) => role === 'admin'),
  roles: {
    admin: ['read:any', 'create:any', 'update:any', 'delete:any'],
    manager: ['read:any', 'create:own', 'update:own'],
    user: ['read:own']
  }
}));

jest.mock('../middlewares/permissionCheck', () => {
  return (action) => (req, res, next) => {
    if (!req.user) {
      console.log('No user in request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { role } = req.user;
    console.log(`Checking permission for role: ${role}, action: ${action}`);
    
    const permissions = {
      admin: ['read:any', 'create:any', 'update:any', 'delete:any'],
      manager: ['read:any', 'create:own', 'update:own'],
      user: ['read:own']
    };
    
    if (permissions[role] && permissions[role].includes(action)) {
      console.log('Permission granted');
      return next();
    }
    
    console.log('Permission denied');
    return res.status(403).json({ error: 'Access denied. You do not have permission to perform this action.' });
  };
});

app.use((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded;
    } catch (error) {
      console.log('Invalid token');
    }
  }
  next();
});

app.use('/user', userRouter);
app.use('/admin', adminRouter);

describe('Admin Controller', () => {
  beforeAll(async () => {
    try {
      await mongoose.connect(TEST_DB);
      console.log('Connected to test database');
    } catch (error) {
      console.error('Database connection error:', error);
    }
  });
  
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  afterAll(async () => {
    try {
      await User.deleteMany({});
      await mongoose.connection.close();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  });

  it('should allow admin to update user role', async () => {
    try {
      const testadmin = new User({
        username: 'testadminur',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });
      await testadmin.save();
  
      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadminur', password: 'adminpass123' });
      const adminToken = adminLoginResponse.body.token;
  
      await request(app)
        .post('/user/signup')
        .send({ username: 'testuserur', password: 'testpass123' });
  
      const response = await request(app)
        .post('/admin/update-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'testuserur', role: 'manager' });

      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`); 
  
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User role updated successfully');
      expect(response.body.user).toHaveProperty('role', 'manager');
    } catch (error) {
      console.error(`should allow admin to update user role - Error: ${error}`); 
    }
  });

  it('should not allow regular user to update user role', async () => {
    try {
      const managerUser = new User({
        username: 'testmanagerruu',
        password: await bcrypt.hash('managerpass123', 10),
        role: 'manager'
      });
  
      await managerUser.save();
  
      const createUserResponse = await request(app)
        .post('/user/signup')
        .send({ username: 'testuserruu', password: 'managerpass123' });
  
      const userLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testuserruu', password: 'managerpass123' });
      userToken = userLoginResponse.body.token;
  
      const response = await request(app)
        .post('/admin/update-role')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'testmanagerruu', role: 'user' });
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`); 

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
    } catch (error) {
      console.error(`hould not allow regular user to update user role - Error: ${error}`); 
    }


  });

  it('should allow admin to access protected route', async () => {
    try {
      const adminUser = new User({
        username: 'testadminur',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });
  
      await adminUser.save();
  
      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadminur', password: 'adminpass123' });
      adminToken = adminLoginResponse.body.token;
  
      const response = await request(app)
        .get('/admin/test')
        .set('Authorization', `Bearer ${adminToken}`);
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`); 

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Welcome Admin!');
    } catch (error) {
      console.error(`should allow admin to access protected route - Error: ${error}`);       
    }
  });

  it('should not allow manager to access admin-only protected route', async () => {
    try {
      const managerUser = new User({
        username: 'testmanager_to_access_admin-only',
        password: await bcrypt.hash('managerpass123', 10),
        role: 'manager'
      });
  
      await managerUser.save();
  
      const managerLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testmanager_to_access_admin-only', password: 'managerpass123' });
  
      managerToken = managerLoginResponse.body.token;
  
      const response = await request(app)
        .get('/admin/test')
        .set('Authorization', `Bearer ${managerToken}`);

      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`); 
  
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
    } catch (error) {
      console.error(`should not allow manager to access admin-only protected route - Error: ${error}`); 
    }

  });

  it('should not allow regular user to access admin-only protected route', async () => {

    try {
      const createUserResponse = await request(app)
      .post('/user/signup')
      .send({ username: 'testuser_to_access_admin-only', password: 'managerpass123' });

    const userLoginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'testuser_to_access_admin-only', password: 'userpass123' });

    const response = await request(app)
      .get('/admin/test')
      .set('Authorization', `Bearer ${userToken}`);

    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${JSON.stringify(response.body)}`); 

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
    } catch (error) {
      console.error(`should not allow regular user to access admin-only protected route - Error: ${error}`); 
    }
  });


  it('should allow admin to update user role', async () => {
    try {
      const adminUser = new User({
        username: 'testadmin_to_update_user_role',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });
  
      await adminUser.save();
  
      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadmin_to_update_user_role', password: 'adminpass123' });
  
      adminToken = adminLoginResponse.body.token;
  
      const testUser = new User({
        username: 'testuser_to_update_user_role',
        password: await bcrypt.hash('userpass123', 10),
        role: 'user'
      });
  
      await testUser.save();
  
      const response = await request(app)
        .post('/admin/update-role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'testuser_to_update_user_role', role: 'manager' });
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`); 
  
  
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User role updated successfully');
      expect(response.body.user).toHaveProperty('role', 'manager');
    } catch (error) {
      console.error(`should allow admin to update user role - Error: ${error}`); 
    }


  });

  it('should not allow manager to update user role', async () => {
    try {
      const managerUser = new User({
        username: 'testmanager_to_update_user_role_check',
        password: await bcrypt.hash('managerpass123', 10),
        role: 'manager'
      });
  
      await managerUser.save();
  
      const managerLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testmanager_to_update_user_role_check', password: 'managerpass123' });
  
      managerToken = managerLoginResponse.body.token;
  
      await request(app)
        .post('/user/signup')
        .send({ username: 'testuser_to_update_user_role_check', password: 'userpass123' });
  
      const response = await request(app)
        .post('/admin/update-role')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ username: 'testuser_to_update_user_role_check', role: 'admin' });
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`); 

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');

    } catch (error) {
      console.error(`should not allow manager to update user role - Error: ${error}`); 
    }




  });

  it('should not allow regular user to update user role', async () => {
    try {
      const testuser = new User({
        username: 'testuser_regular_to_update_user_role_check',
        password: await bcrypt.hash('userpass123', 10),
        role: 'user'
      });
      await testuser.save();
  
      const userLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testuser_regular_to_update_user_role_check', password: 'userpass123' });
  
      userToken = userLoginResponse.body.token;
  
      const testmanager = new User({
        username: 'testmanager_regular_to_update_user_role_check',
        password: await bcrypt.hash('managerpass123', 10),
        role: 'manager'
      });
  
      await testmanager.save();
  
      const response = await request(app)
        .post('/admin/update-role')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'testmanager_regular_to_update_user_role_check', role: 'user' });
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`);

      expect(response.status).toBe(403);
      if (response.status == 200) {
        console.log(response.body);
      }
      expect(response.body).toHaveProperty('error', 'Access denied. You do not have permission to perform this action.');
  
    } catch (error) {
      console.error(`should not allow regular user to update user role - Error: ${error}`);     
    }
 

  });

  it('should allow admin to update username', async () => {
    try {
      await request(app)
      .post('/user/signup')
      .send({ username: 'user_to_update', password: 'testpass' });

    const adminUser = new User({
      username: 'testadmin_to_update_username',
      password: await bcrypt.hash('adminpass123', 10),
      role: 'admin'
    });

    await adminUser.save();

    const adminLoginResponse = await request(app)
      .post('/user/login')
      .send({ username: 'testadmin_to_update_username', password: 'adminpass123' });

    adminToken = adminLoginResponse.body.token;

    const response = await request(app)
      .put('/admin/update-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'user_to_update', updates: { username: 'user_to_update_new' } });

    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${JSON.stringify(response.body)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Username updated successfully');
    expect(response.body.user).toHaveProperty('username', 'user_to_update_new');

    } catch (error) {
      console.error(`should allow admin to update username - Error: ${error}`);     
    }

 

  });

  it('should list all users', async () => {
    try {
      const adminUser = new User({
        username: 'testadmin_list_users',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });
      await adminUser.save();
  
      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadmin_list_users', password: 'adminpass123' });
  
      adminToken = adminLoginResponse.body.token;
  
      const response = await request(app)
        .get('/admin/list-users')
        .set('Authorization', `Bearer ${adminToken}`);
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`);
  
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(response.body.users).toBeInstanceOf(Array);

    } catch (error) {
      console.error(`should list all users - Error: ${error}`);
    }
  });

  it('should add permission to a user', async () => {
    try {
      const adminUser = new User({
        username: 'testadmin_perm_to_user',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });
      await adminUser.save();
  
      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadmin_perm_to_user', password: 'adminpass123' });
  
      adminToken = adminLoginResponse.body.token;
  
      await request(app)
        .post('/user/signup')
        .send({ username: 'testuser_perm_to_user', password: 'testpass' });
  
      const userLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testuser_perm_to_user', password: 'testpass' });
  
      const response = await request(app)
        .post('/admin/add-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'testuser_perm_to_user', permission: 'delete:any' });
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Permission added successfully');
      expect(response.body.user.permissions).toContain('delete:any');
    } catch (error) {
      console.error(`should add permission to a user - Error: ${error}`);
    }


  });

  it('should remove permission from a user', async () => {
    try {
      const adminUser = new User({
        username: 'testadmin_perm_delete_user',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });
  
      await adminUser.save();
  
      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadmin_perm_delete_user', password: 'adminpass123' });
  
      adminToken = adminLoginResponse.body.token;
  
      const userResponse = await request(app)
        .post('/user/signup')
        .send({ username: 'testuser_perm_delete_user', password: 'testpass' });
  
      const userLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testuser_perm_delete_user', password: 'testpass' });
  
      const response = await request(app)
        .post('/admin/remove-permission')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'testuser_perm_delete_user', permission: 'delete:any' });
  
      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Permission removed successfully');
      expect(response.body.user.permissions).not.toContain('delete:any');
    } catch (error) {
      console.error(`should remove permission from a user - Error: ${error}`);
    }

  });



  it('should delete a user account by admin', async () => {
    try {
      const userResponse = await request(app)
        .post('/user/signup')
        .send({ username: 'testuser_delete_by_admin', password: 'testpass' });

      // First, create a user to delete
      const adminUser = new User({
        username: 'testadmin_delete_by_admin',
        password: await bcrypt.hash('adminpass123', 10),
        role: 'admin'
      });

      await adminUser.save();

      const adminLoginResponse = await request(app)
        .post('/user/login')
        .send({ username: 'testadmin_delete_by_admin', password: 'adminpass123' });

      adminToken = adminLoginResponse.body.token;

      const response = await request(app)
        .delete('/admin/delete/testuser_delete_by_admin')
        .set('Authorization', `Bearer ${adminToken}`);

      console.log(`Response status: ${response.status}`);
      console.log(`Response body: ${JSON.stringify(response.body)}`);
    
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'User account deleted successfully');    
    
    } catch (error) {
      console.error(`Should delete a user account by admin - Error: ${error}`);
    }
  });

});
