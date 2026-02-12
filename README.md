# FHIR Patient Manager

A web-based CRUD application for managing FHIR R4 Patient resources. Built with Next.js 16, MUI 7, and connected to a live FHIR server.

## Spec

| Area | Details |
|---|---|
| **Purpose** | Create, read, update, delete, and search Patient resources on a FHIR R4 server |
| **FHIR Server** | `https://fhir-bootcamp.medblocks.com/fhir` (configurable) |
| **Patient Fields** | Given Name, Family Name, Gender, Birth Date, Phone |
| **Search** | By name or phone number (auto-detected) |
| **Sorting** | Server-side via FHIR `_sort` parameter on all columns |
| **Pagination** | Server-side with `_count` / `_offset` / `_total=accurate` |
| **Validation** | All fields required; birth date format (YYYY-MM-DD); phone character validation; gender enum (male/female/other/unknown) |
| **Monitoring** | Built-in API log dashboard tracking every FHIR request with method, status, duration, and result |

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| UI | MUI 7.3.8, MUI X DataGrid, MUI X Date Pickers |
| Language | TypeScript 5 |
| Runtime | Node.js 20 |
| Deployment | Docker (multi-stage Alpine build) |

### Project Structure

```
src/
  app/
    patients/          # Patient CRUD routes
    monitoring/        # API monitoring dashboard route
  components/
    PatientList.tsx    # DataGrid with search, sort, pagination
    PatientCreate.tsx  # Create form
    PatientEdit.tsx    # Edit form (GET + PUT)
    PatientForm.tsx    # Shared form component with validation
    PatientShow.tsx    # Detail view
    MonitoringDashboard.tsx  # API operation log viewer
    DashboardLayout.tsx      # Shared sidebar + header layout
  data/
    patients.ts        # FHIR data layer (fetch, convert, validate)
    apiLog.ts          # API log singleton store
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **npm** >= 10

### Install & Run (Development)

```bash
# Clone the repository
git clone https://github.com/phiskus/fhirclient.git
cd fhirclient

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Or manually create .env.local with:
# NEXT_PUBLIC_FHIR_SERVER_URL=https://fhir-bootcamp.medblocks.com/fhir

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Pointing to a Different FHIR Server

Set the `NEXT_PUBLIC_FHIR_SERVER_URL` environment variable in `.env.local`:

```env
NEXT_PUBLIC_FHIR_SERVER_URL=https://your-fhir-server.com/fhir
```

> **Note:** `NEXT_PUBLIC_` variables are inlined at build time. If you change this value, restart the dev server or rebuild for production.

---

## Docker

### Build & Run Locally

```bash
# Build and start with Docker Compose
docker compose up --build

# Or build manually
docker build -t fhirclient .
docker run -p 3000:3000 fhirclient
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Custom FHIR Server URL in Docker

Pass the URL as a build argument:

```bash
docker build \
  --build-arg NEXT_PUBLIC_FHIR_SERVER_URL=https://your-fhir-server.com/fhir \
  -t fhirclient .
```

Or in `docker-compose.yml`:

```yaml
services:
  fhirclient:
    build:
      context: .
      args:
        NEXT_PUBLIC_FHIR_SERVER_URL: https://your-fhir-server.com/fhir
```

---

## Deploy to Cloud Services

### Google Cloud Run

```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and push to Artifact Registry
gcloud artifacts repositories create fhirclient --repository-format=docker --location=europe-west1

docker build -t europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/fhirclient/fhirclient:latest .
docker push europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/fhirclient/fhirclient:latest

# Deploy to Cloud Run
gcloud run deploy fhirclient \
  --image europe-west1-docker.pkg.dev/YOUR_PROJECT_ID/fhirclient/fhirclient:latest \
  --port 3000 \
  --region europe-west1 \
  --allow-unauthenticated
```

Alternatively, use **Cloud Build** to build and deploy in one step:

```bash
gcloud run deploy fhirclient \
  --source . \
  --port 3000 \
  --region europe-west1 \
  --allow-unauthenticated
```

### AWS (ECS / Fargate)

```bash
# Authenticate with ECR
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com

# Create repository
aws ecr create-repository --repository-name fhirclient --region eu-central-1

# Build, tag, and push
docker build -t fhirclient .
docker tag fhirclient:latest YOUR_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com/fhirclient:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com/fhirclient:latest

# Deploy via ECS/Fargate using the AWS Console or CLI
# - Create a task definition referencing the image
# - Create a service in an ECS cluster with Fargate launch type
# - Expose port 3000 via an Application Load Balancer
```

### Azure Container Apps

```bash
# Login and create resources
az login
az group create --name fhirclient-rg --location westeurope
az containerapp env create --name fhirclient-env --resource-group fhirclient-rg --location westeurope

# Build and deploy directly from source
az containerapp up \
  --name fhirclient \
  --resource-group fhirclient-rg \
  --environment fhirclient-env \
  --source . \
  --target-port 3000 \
  --ingress external
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server (requires build) |
| `npm run lint` | Run ESLint |

---

## License

MIT
