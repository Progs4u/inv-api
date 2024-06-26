# Express.js Backend Boilerplate

This is a boilerplate template for a secure Express.js backend server with MongoDB integration, JWT authentication, and HTTPS support.

## Features

- Express.js server with HTTPS support
- MongoDB integration using Mongoose
- JWT authentication
- Rate limiting
- CORS enabled
- Body parsing
- Logging with morgan and mercedlogger
- Nodemon for development
- Dockerfile for containerization

## Prerequisites

- Node.js (v16.20.1 or later recommended)
- MongoDB instance
- OpenSSL for generating SSL certificates

## Getting Started

1. Clone this repository:

git clone https://github.com/your-username/express-backend-boilerplate.git cd express-backend-boilerplate

2. Install dependencies:

npm install

3. Set up environment variables:
Create a `.env` file in the root directory with the following content:

PORT=3000 
DATABASE_URL=mongodb://admin:YourPassword@your-mongodb-host:27017/your-database?authSource=admin 
SECRET=your-jwt-secret

Replace `YourPassword`, `your-mongodb-host`, and `your-database` with your actual MongoDB credentials and details.

4. Generate SSL certificates:

openssl req -x509 -newkey rsa:4096 -keyout ./ssl/key.pem -out ./ssl/cert.pem -days 365 -nodes

This will create self-signed certificates in the `ssl` directory. For production, use certificates from a trusted Certificate Authority.

5. Start the server:
- For development: `npm run test`
- For production: `npm start`

## Docker Support

To build and run the application using Docker:

1. Build the Docker image:

docker build -t express-backend-boilerplate .

2. Run the container:

docker run -p 3000:3000 -v $(pwd):/app express-backend-boilerplate


## API Endpoints

- `GET /`: Hello world route
- `POST /user/signup`: User registration
- `POST /user/login`: User login
- `GET /user/logout`: User logout	
- `GET /protected`: Example protected route (requires authentication)

## Authentication

This boilerplate uses JWT for authentication. To access protected routes, include the JWT token in the Authorization header:

Authorization: Bearer


## Configuration

- Server configuration: `server.js`
- Database connection: `middlewares/db.connection.js`
- Authentication middleware: `middlewares/global.js`
- User model: `models/User.js`

## Security Considerations

- Always use HTTPS in production
- Keep your JWT secret secure and use a strong, unique value
- Regularly update dependencies to patch security vulnerabilities
- Use environment variables for sensitive information, never commit them to version control

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

