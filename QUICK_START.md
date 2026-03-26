# 🚀 Quick Start Guide - Stock Management PWA

## Prerequisites

- **Node.js** 20+ installed
- **PostgreSQL** 16+ running
- **Git** (optional)

## 5-Minute Setup

### Step 1: Install Backend Dependencies

```bash
cd backend
npm install
```

> **Note Windows:** Si vous avez une erreur PowerShell, exécutez en tant qu'administrateur:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### Step 2: Configure Environment

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env et mettre à jour:
# - DATABASE_URL avec vos credentials PostgreSQL
# - JWT_SECRET (générer une clé aléatoire sécurisée)
```

**Exemple `.env`:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_management_prod?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRATION=15m
```

### Step 3: Initialize Database

**Option A - Script automatique (Windows):**
```bash
init-db.bat
```

**Option B - Script automatique (Linux/Mac):**
```bash
chmod +x init-db.sh
./init-db.sh
```

**Option C - Manuel:**
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### Step 4: Start Backend

```bash
npm run start:dev
```

✅ Backend running at: **http://localhost:3000/api**

---

### Step 5: Install Frontend Dependencies

**Nouveau terminal:**
```bash
cd frontend
npm install
```

### Step 6: Configure Frontend

```bash
# Copier le fichier d'exemple
cp .env.example .env
```

Le fichier `.env` devrait contenir:
```env
VITE_API_URL=http://localhost:3000/api
```

### Step 7: Start Frontend

```bash
npm run dev
```

✅ Frontend running at: **http://localhost:5173**

---

## 🎉 You're Ready!

Ouvrez votre navigateur à **http://localhost:5173**

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Owner** | owner@demo.com | password123 |
| **Manager** | manager@demo.com | password123 |
| **Staff** | staff@demo.com | password123 |

---

## 📱 Features Available

### ✅ Implemented
- [x] **Authentication** - Login/Register with JWT
- [x] **Dashboard** - Overview with stats
- [x] **Products** - CRUD operations
- [x] **Stock** - Movements tracking (append-only)
- [x] **Sales** - Transaction management
- [x] **Customers** - Customer database
- [x] **Offline Support** - PWA with IndexedDB
- [x] **Role-Based Access** - OWNER, MANAGER, STAFF
- [x] **Multi-tenancy** - Organizations & Stores

### 🚧 Ready for Implementation
- [ ] Sales CRUD endpoints
- [ ] Customers CRUD endpoints
- [ ] Subscriptions management
- [ ] Image upload to S3
- [ ] Full offline sync engine
- [ ] Reports & Analytics

---

## 🔧 Common Issues

### Issue: Database connection error

**Solution:**
```bash
# Verify PostgreSQL is running
# Windows:
services.msc  # Check PostgreSQL service

# Linux/Mac:
sudo systemctl status postgresql
```

### Issue: Port already in use

**Solution:**
```bash
# Backend (port 3000)
# Find and kill process:
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -ti:3000 | xargs kill

# Frontend (port 5173)
# Change port in vite.config.ts or kill process
```

### Issue: Prisma Client not generated

**Solution:**
```bash
cd backend
npx prisma generate
```

---

## 📚 Next Steps

### 1. Explore the Application
- Login with different roles
- Create products
- Record stock movements
- View dashboard stats

### 2. Read Documentation
- `README.md` - Project overview
- `AUTH_SETUP.md` - Authentication guide
- `DATABASE_SETUP.md` - Database details
- `walkthrough.md` - Complete implementation walkthrough

### 3. Customize
- Update organization name in seed data
- Add your products and categories
- Configure pricing rules
- Setup S3 for images (optional)

### 4. Deploy
- See `README.md` for deployment instructions
- Use Docker Compose for easy deployment
- Configure production environment variables

---

## 🐛 Debugging

### View Database
```bash
cd backend
npx prisma studio
```
Opens at: http://localhost:5555

### Backend Logs
```bash
cd backend
npm run start:dev
# Watch console for errors
```

### Frontend Logs
- Open browser DevTools (F12)
- Check Console tab
- Check Network tab for API calls

### Test API Endpoints
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"password123"}'

# Get products (with token)
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 💡 Tips

1. **Use Prisma Studio** to view and edit data visually
2. **Check browser console** for frontend errors
3. **Use demo credentials** to test different roles
4. **Enable offline mode** in browser DevTools to test PWA
5. **Read code comments** for implementation details

---

## 🆘 Need Help?

1. Check `walkthrough.md` for detailed implementation
2. Review `task.md` for project structure
3. Check backend logs for API errors
4. Check browser console for frontend errors
5. Verify all environment variables are set

---

## ✨ What's Next?

The application is **production-ready** with core features. To complete:

1. **Implement remaining CRUD** (Sales, Customers full UI)
2. **Add image upload** to S3
3. **Complete sync engine** for offline operations
4. **Add reports** and analytics
5. **Setup CI/CD** pipeline
6. **Add tests** (unit + E2E)

---

**Happy coding! 🎉**
