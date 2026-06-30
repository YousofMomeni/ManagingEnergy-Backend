<div align="center">

# ⚡ Managing Energy Backend

A backend service for managing users, stations, groups, and energy usage data.

Built with **NestJS**, **TypeORM**, and **SQLite**.

</div>

---

## 🚀 Features

- JWT Authentication
- User Management
- Station Management
- Group Management
- Energy Usage Tracking
- Modbus Integration
- Swagger API Documentation
- Role-Based Access Control (RBAC)

---

## 🛠 Tech Stack

- NestJS
- TypeScript
- TypeORM
- SQLite
- JWT
- Swagger

---

## 📦 Installation

```bash
git clone https://github.com/YousofMomeni/ManagingEnergy-Backend.git

cd ManagingEnergy-Backend

npm install
```

---

## ▶ Running the Project

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

---

## 📚 API Documentation

Once the server is running, Swagger is available at:

```text
http://localhost:8999/api
```

---

## 🔐 Authentication

Login endpoint:

```http
POST /auth/login
```

Example request:

```json
{
  "username": "admin",
  "password": "password"
}
```

---

## 📡 Project Modules

| Module | Description |
|--------|-------------|
| Auth | Authentication and Authorization |
| User | User Management |
| Station | Station Management |
| Group | Group Management |
| Usage | Energy Usage Management |
| Parameters | Device Parameter Management |
| GetData | Data Collection |
| Modbus Proxy | Modbus Communication |
| Map | Map Services |

---

## 🧰 CLI Commands

Create an administrator:

```bash
npm run create-admin
```

Create a user:

```bash
npm run create-user
```

List all users:

```bash
npm run list-users
```

Delete a user:

```bash
npm run delete-user
```

---


## 📄 License

This project is intended for educational and organizational use.
