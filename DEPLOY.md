# Deployment Guide: Yandex Cloud

This guide describes how to deploy the `signBridgeStorage` application to Yandex Cloud.

## 1. Repository Strategy: Monorepo
**Recommendation:** Keep Frontend and Backend in the **same repository** (Monorepo).

**Why?**
*   **Simplicity:** You can deploy everything with a single `docker-compose.yml`.
*   **Atomic Updates:** Changes to the API and Frontend usually happen together. Keeping them in sync is easier in one repo.
*   **Development:** Easier to run the full stack locally.

## 2. Deployment Options

### Option A: VM + Docker Compose (Easiest)
This mirrors your local setup. You rent a VM, install Docker, and run your app.

**Steps:**
1.  **Create VM:** Create a Virtual Machine in Yandex Compute Cloud (e.g., Ubuntu 22.04).
2.  **Install Docker:** SSH into the VM and install Docker & Docker Compose.
3.  **Clone Repo:** `git clone <your-repo-url>`
4.  **Configure Env:** Copy `.env.example` to `.env`.
    *   **DB_HOST**: Use the specific host provided by Yandex (click "Hosts" in the cluster dashboard). it usually looks like `rc1a-xyz...mdb.yandexcloud.net`.
    *   **DB_USER**: `user1`
    *   **DB_PASS**: (The password you set)
    *   **DB_NAME**: `db1`
    *   **DATABASE_URL**: For Yandex Managed DB, you need SSL.
        *   **Note:** The Docker image now automatically includes the Yandex CA cert at `/app/certs/root.crt`.
        *   String format: `postgresql+asyncpg://user1:password@rc1a-xyz.mdb.yandexcloud.net:6432/db1?ssl=verify-full&sslrootcert=/app/certs/root.crt`
        *   **Important**: Note the port `6432` is common for the connection pooler (Odyssey), or `5432` for direct access.
5.  **Run:** `docker-compose -f docker-compose.prod.yml up -d --build`

> **Note:** I have created `docker-compose.prod.yml` in the repo. It handles the production build (Nginx for frontend, production settings for API).

### 3. Yandex Managed PostgreSQL Specifics
You created a cluster with **Public access: No**.
*   **Implication:** You CANNOT connect to this DB from your laptop directly.
*   **Deployment:** You **MUST** deploy your application (the VM from Option A) into the **SAME VPC Network** (`default`) and **SAME Availability Zone** (or enable accessing different zones) as the database.
*   **Security Group:** Ensure the Security Group allows ingress on port 6432/5432 from your VM's internal IP.

### Option B: Managed Containers (Serverless Containers / K8s) (Advanced)
Better for scaling, but requires building and pushing images to Yandex Container Registry (CR).

1.  Create Yandex Container Registry.
2.  Build & Push Backend Image: `docker build -t cr.yandex/<registry-id>/app:v1 .`
3.  Build & Push Frontend Image: `docker build -t cr.yandex/<registry-id>/frontend:v1 frontend/`
4.  Deploy Revision to Serverless Containers.

---

## 3. Recommended First Step: Git Setup

Initialize your repository and commit your code.

```bash
# Check status (you have many untracked files)
git status

# Add all files (respecting .gitignore)
git add .

# Commit
git commit -m "Initial commit: Complete SignBridge Storage MVP"

# Push to Yandex Cloud Source Repositories (or GitHub/GitLab)
git remote add origin <your-repo-url>
git push -u origin master
```
