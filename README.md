# Inventory Management System API

## Overview
The Inventory Management System API is designed to manage inventory items, user authentication, and administrative controls in a secure and efficient manner. This API serves as the backend for an inventory management application and is built using Node.js, Express.js, and MongoDB.

## Features
- **Material Management**: (Planned) Add, edit, and delete materials, track inventory levels in real-time.
- **User Authentication**: Secure registration and login, role-based access control.
- **Administrative Controls**: Manage users, roles, and system settings.
- **Password Reset**: Allow users to reset their password securely.
- **Notifications**: (Planned) Real-time alerts for low inventory levels and user activities.
- **Localization**: (Planned) Support for multiple languages.

## Technology Stack
- **Frontend**: Svelte, TailwindCSS
- **Backend**: Express.js, MongoDB with Mongoose

## Setup Instructions

### Prerequisites
- Node.js (>= 14.x)
- MongoDB
- SSL Certificates (for HTTPS support)

### Installation
1. Clone the repository:
    ```sh
    git clone https://github.com/Progs4u/inv-api.git
    cd inv-api
    ```
2. Install dependencies:
    ```sh
    npm install
    ```
3. Create a `.env` file in the root directory and configure the following variables:
    ```env
    PORT=3001
    DATABASE_URL=mongodb://<username>:<password>@<host>:<port>/<database>?authSource=admin
    SECRET=your_jwt_secret_key
    ```
4. Add SSL certificates in the `ssl` directory:
    - `ssl/key.pem`
    - `ssl/cert.pem`

### Running the Application
1. Start the server:
    ```sh
    npm start
    ```
2. The server will be running at `https://localhost:3001`.

## API Endpoints

### User Endpoints
- **POST /user/signup**: Register a new user.
    - Request body:
        ```json
        {
            "username": "string",
            "password": "string"
        }
        ```
    - Response:
        ```json
        {
            "username": "string",
            "password": "string",
            "token": "string"
        }
        ```

- **POST /user/login**: Log in a user.
    - Request body:
        ```json
        {
            "username": "string",
            "password": "string"
        }
        ```
    - Response:
        ```json
        {
            "token": "string",
            "user": {
                "username": "string"
            }
        }
        ```

- **POST /user/logout**: Log out a user (requires authentication).
    - Header:
        ```json
        {
            "Authorization": "Bearer <token>"
        }
        ```
    - Response:
        ```json
        {
            "message": "User <username> logged out!"
        }
        ```

- **POST /user/request-reset**: Request a password reset token.
    - Request body:
        ```json
        {
            "email": "string"
        }
        ```
    - Response:
        ```json
        {
            "message": "Password reset token generated.",
            "resetToken": "string",
            "resetUrl": "string"
        }
        ```

- **POST /user/reset/:token**: Reset the password using the reset token.
    - Request body:
        ```json
        {
            "password": "string"
        }
        ```
    - Response:
        ```json
        {
            "message": "Password has been reset."
        }
        ```

### Protected Endpoints
- **GET /protected**: Access protected resource (requires authentication).
    - Header:
        ```json
        {
            "Authorization": "Bearer <token>"
        }
        ```
    - Response:
        ```json
        {
            "message": "Protected route. You need to be logged in to access this route!"
        }
        ```

## Usage Examples
- **Signup a new user**:
    ```sh
    curl -X POST https://localhost:3001/user/signup -d '{"username": "testuser", "password": "testpass"}' -H "Content-Type: application/json"
    ```
- **Login a user**:
    ```sh
    curl -X POST https://localhost:3001/user/login -d '{"username": "testuser", "password": "testpass"}' -H "Content-Type: application/json"
    ```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
This project is licensed under the ISC License.
