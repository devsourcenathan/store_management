# Phase 3: Authentication & Authorization - Setup Guide

## Overview
This guide covers the complete authentication and authorization implementation for the Stock Management PWA.

## Backend Setup

### 1. Environment Configuration

Ensure your `.env` file has the following JWT configuration:

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

**Security Note:** In production, use strong, randomly generated secrets:
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Authentication Flow

The application uses JWT (JSON Web Tokens) for authentication:

1. **Login**: User provides email/password
2. **Validation**: Backend validates credentials
3. **Token Generation**: JWT access token created (15min expiry)
4. **Response**: Token + user data returned
5. **Storage**: Frontend stores token in localStorage
6. **Requests**: Token sent in Authorization header

### 3. Role-Based Access Control (RBAC)

Three roles are supported:

- **OWNER**: Full access to everything
  - Manage users
  - Manage organization settings
  - All MANAGER permissions

- **MANAGER**: Operational access
  - CRUD products, categories
  - Manage stock
  - View sales and reports
  - Cannot manage users

- **STAFF**: Limited access
  - View products
  - Create sales
  - Limited stock operations (view only)
  - Cannot modify products or settings

### 4. Using Guards and Decorators

#### Protect Routes with JWT Guard

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)  // All routes require authentication
export class ProductsController {
  // ...
}
```

#### Restrict by Role

```typescript
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';

@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)  // Only OWNER and MANAGER
async create(@Body() data: CreateProductDto) {
  // ...
}
```

#### Access Current User

```typescript
import { CurrentUser, CurrentOrganization } from '@/common/decorators/user.decorator';

@Get('my-products')
@UseGuards(JwtAuthGuard)
async getMyProducts(
  @CurrentUser() user: any,
  @CurrentOrganization() organizationId: string,
) {
  // user contains: { id, email, organizationId, role }
  // organizationId is extracted for convenience
}
```

## Frontend Setup

### 1. Environment Configuration

Create `.env` file (copy from `.env.example`):

```env
VITE_API_URL=http://localhost:3000/api
```

### 2. Authentication Flow

The frontend uses React Context for auth state:

```typescript
// Login
const { login } = useAuth();
await login(email, password);

// Access user
const { user } = useAuth();
console.log(user.firstName, user.role);

// Logout
const { logout } = useAuth();
logout();
```

### 3. Protected Routes

Routes are automatically protected:

```typescript
// In router.tsx
<Route
  path="/"
  element={
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  }
>
  {/* Protected routes */}
</Route>
```

### 4. API Requests

The API client automatically adds auth tokens:

```typescript
// No need to manually add token
const products = await api.get('/products');

// Token is added by interceptor:
// headers: { Authorization: 'Bearer <token>' }
```

## Testing Authentication

### 1. Test Login

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@demo.com",
    "password": "password123"
  }'

# Expected response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "owner@demo.com",
    "firstName": "John",
    "lastName": "Owner",
    "role": "OWNER",
    "organizationId": "..."
  }
}
```

### 2. Test Protected Endpoint

```bash
# Get token from login response
TOKEN="your-access-token"

# Make authenticated request
curl http://localhost:3000/api/organizations/current \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Role Restrictions

```bash
# Login as STAFF
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@demo.com",
    "password": "password123"
  }'

# Try to access OWNER-only endpoint (should fail)
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $STAFF_TOKEN"
```

## Demo Credentials

Use these credentials for testing:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Owner | owner@demo.com | password123 | Full access |
| Manager | manager@demo.com | password123 | Operational access |
| Staff | staff@demo.com | password123 | Limited access |

## Security Best Practices

### 1. Token Storage

✅ **DO:**
- Store tokens in localStorage for web apps
- Clear tokens on logout
- Validate token expiry

❌ **DON'T:**
- Store tokens in cookies without httpOnly flag
- Store sensitive data in tokens
- Share tokens between users

### 2. Password Security

✅ **DO:**
- Use bcrypt for hashing (already implemented)
- Enforce minimum password length (6+ characters)
- Consider password complexity requirements

❌ **DON'T:**
- Store plain text passwords
- Log passwords
- Send passwords in URLs

### 3. API Security

✅ **DO:**
- Use HTTPS in production
- Validate all inputs
- Implement rate limiting
- Log authentication attempts

❌ **DON'T:**
- Expose detailed error messages
- Allow unlimited login attempts
- Skip input validation

## Troubleshooting

### Issue: "Unauthorized" on all requests

**Solution:**
1. Check if token is in localStorage: `localStorage.getItem('access_token')`
2. Verify token is valid (not expired)
3. Check API URL in `.env`
4. Verify backend is running

### Issue: "Invalid credentials" on login

**Solution:**
1. Verify email/password are correct
2. Check database has seeded users
3. Verify bcrypt is working correctly
4. Check backend logs for errors

### Issue: "Forbidden" on specific routes

**Solution:**
1. Check user role: `user.role`
2. Verify route requires correct role
3. Check `@Roles()` decorator on endpoint
4. Verify `RolesGuard` is applied

## Next Steps

After authentication is working:

1. **Test all roles**: Login as OWNER, MANAGER, STAFF
2. **Test protected routes**: Verify access control
3. **Test offline mode**: Ensure auth persists offline
4. **Implement password reset**: Add forgot password flow
5. **Add 2FA**: Consider two-factor authentication

## Additional Resources

- [JWT.io](https://jwt.io/) - Decode and verify JWTs
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [React Context](https://react.dev/reference/react/useContext)
