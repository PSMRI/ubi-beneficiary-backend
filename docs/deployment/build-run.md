## Docker Deployment Steps

#### 1. Update Environment Variables
Create a `.env` file in the project root with all required variables (see Environment Variable Configuration in [environment-setup.md](../developement/environment-setup.md)).
#### 2. Build and Run Steps
Use Dockerfile suggested above to generate image

```bash
# Build the Docker Image
docker build -t beneficiary-backend .

# Use generated images in docker-compose.yml
# Update and use .env file

# Run the Container
docker-compose up -d
```

#### 3. Docker Files
The following files are present in the repository for deployment:
- **Dockerfile**: [Container configuration](https://github.com/PSMRI/beneficiary-backend/blob/main/Dockerfile)
- **docker-compose.yml**:[Docker compose file](https://github.com/PSMRI/beneficiary-backend/blob/main/docker-compose.yml)