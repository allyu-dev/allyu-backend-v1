# allyu-backend
Backend API for Allyu, an AI-powered technical English learning platform for IT professionals.

## Deployment

For the academic AWS deployment using Lightsail Containers, private ECR and
Terraform, see [the deployment guide](docs/DEPLOYMENT_AWS.md). Kubernetes manifests
in `k8s/` remain available for phase 2. Local Compose still uses
`serviceAccountKey.json`; Lightsail uses `FIREBASE_SERVICE_ACCOUNT_JSON`.
