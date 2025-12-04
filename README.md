# Distributed Fault Tolerance

## Prerequisites
- **Node.js**
- **npm**: Installed automatically with Node.js.
- **Docker Desktop** or **Docker Engine**
- **Docker Compose**: Comes with Docker Desktop.

## Installation
Run the following commands on any terminal to install the dependencies needed for each service:
```
cd frontend
npm install
```
```
cd ../services/auth-service
npm install
```
```
cd ../services/course-service
npm install
```
```
cd ../services/course-service
npm install
```
```
cd ../services/enroll-service
npm install
```
```
cd ../services/grade-service
npm install
```

## Usage
After the installation process, ensure that Docker is running, then build and run the entire system:
```
docker-compose up --build
```

Once the containers finish building, the web application (frontend) is accessible at: https://localhost:3000 (`3000:3000`)

Each backend service also run on their own internal ports:
- **Auth Service**: `4000:4000`
- **Course Service**: `4001:4001`
- **Enroll Service**: `4002:4002`
- **Grade Service**: `4003:4003`

The running containers may also be viewed or managed directly from Docker Desktop.


