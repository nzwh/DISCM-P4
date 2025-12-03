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

Once the containers finish building, the web application (frontend) is accessible at: \
https://localhost:3000 (3000:3000)

Each backend service is also accessible through their respective URLs:
- **Course Service**: https://localhost:4001 (4001:4001)
- **Enroll Service**: https://localhost:4002 (4002:4002)
- **Grade Service**: https://localhost:4003 (4003:4003)

A simple health endpoint for each service may also be accessed to verify if it is currently running by attaching /health at the end of the URL. For example: \
https://localhost:4001/health

The running containers may also be viewed or managed directly from Docker Desktop.
