# Clerk Authentication Setup

## Step 1: Create Clerk Account

1. Go to https://clerk.com
2. Sign up for a free account
3. Click "Create Application"
4. Name it "Money Tracker"
5. Choose your preferred social login providers (Google, GitHub, etc.)

## Step 2: Get API Keys

After creating the application:

1. Go to **API Keys** in the left sidebar
2. Copy the following values:
   - **Publishable Key** (starts with `pk_test_`)
   - **JWKS URL** (usually `https://your-app-id.clerk.accounts.dev/.well-known/jwks.json`)

## Step 3: Configure Backend

Edit `backend/.env` and replace the placeholder:

```bash
CLERK_JWKS_URL="https://your-actual-app-id.clerk.accounts.dev/.well-known/jwks.json"
```

## Step 4: Configure Frontend

Edit `frontend/.env` and replace the placeholder:

```bash
VITE_CLERK_PUBLISHABLE_KEY="pk_test_your-actual-key-here"
```

## Step 5: Run Database Migration

The database will auto-migrate on startup, but you can manually trigger it:

```bash
cd backend
.venv/bin/python -c "from database import init_db; init_db()"
```

## Step 6: Start the Servers

```bash
# Terminal 1 - Backend
cd backend
.venv/bin/uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Step 7: Test

1. Visit http://localhost:5173
2. You should see the Clerk sign-in page
3. Sign up with a new account or use a social provider
4. After signing in, you'll see the Money Tracker app
5. All your expenses will be isolated to your user account

## Troubleshooting

### "CLERK_JWKS_URL not configured" error
- Make sure you've set the JWKS URL in `backend/.env`
- Restart the backend server after changing .env files

### "Missing Clerk Publishable Key" error
- Make sure you've set the publishable key in `frontend/.env`
- Vite requires restarting the dev server after changing .env files

### 401 Unauthorized errors
- Check that your Clerk JWKS URL is correct
- Make sure you're signed in to the app
- Try signing out and signing back in

## Multi-User Testing

To test multi-user isolation:

1. Sign in with one account, create some expenses
2. Sign out (click your profile picture in header)
3. Sign in with a different account
4. Verify you don't see the first user's expenses
