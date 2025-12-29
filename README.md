# 🗳️ Online Voting System  
A complete Node.js + MySQL voting platform for colleges.  
Includes:

✔ Student Login  
✔ Student Registration  
✔ Admin Login  
✔ Admin Panel (Add Candidates, Reset Votes)  
✔ Secure One-Vote-Per-Student  
✔ Beautiful UI with Background Image  

---

## 🚀 Features

- Students can register & login  
- Students can vote **only once**  
- Admin can:
  - Add candidates  
  - View results  
  - Reset votes  
- Responsive modern UI  

---

## 📌 Run Locally

### 1️⃣ Install Packages
```sh
npm install
```

### 2️⃣ Run Locally
```sh
# set environment variables locally (example)
export DB_HOST=mysql-service
export DB_PORT=3306
export DB_USER=root
export DB_PASS=Rock@2005
export DB_NAME=voting_db
export SESSION_SECRET="change_this_to_a_strong_secret"
export ADMIN_PASSWORD=admin123
npm start
```

---

## ☸️ Deploy to Kubernetes
Follow these steps to deploy to a Minikube or Kubernetes cluster. Make sure `kubectl` is configured and your cluster is running.

1. Apply the MySQL secret (if you plan to use it):

```sh
kubectl apply -f mysql-secret.yaml
```

2. Deploy MySQL (deployment + service):

```sh
kubectl apply -f mysql-deployment.yaml -f mysql-service.yaml
kubectl wait --for=condition=ready pod -l app=mysql --timeout=120s
```

3. Create the application secret (update `app-secret.yaml` with strong values before applying):

```sh
kubectl apply -f app-secret.yaml
```

4. Deploy the voting app and service:

```sh
kubectl apply -f deployment.yaml -f service.yaml
kubectl wait --for=condition=ready pod -l app=voting-app --timeout=120s
```

5. Access the service in Minikube:

```sh
minikube service voting-service
# or use port-forwarding
kubectl port-forward svc/voting-service 3000:3000
# then open http://localhost:3000
```

Notes:
- Replace secret values (`SESSION_SECRET`, `ADMIN_PASSWORD`, `DB_PASS`) with strong values before applying.
- For production, use a persistent volume for MySQL and a production session store (Redis) for sessions.

