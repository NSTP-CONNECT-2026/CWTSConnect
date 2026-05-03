# NSTPConnect - Render Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Prepare Your Repository
```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy to Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**
   - **Name**: `nstp-connect` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `chmod +x render-build.sh && ./render-build.sh`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (for testing)

### 3. Set Environment Variables

In Render dashboard, go to **Environment** tab and add:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SESSION_SECRET=your_very_secure_session_secret_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_gmail_app_password
```

### 4. Database Setup

**Before first use, run these SQL scripts in your Supabase SQL Editor:**

1. **`cmo_requirements_schema.sql`** - Adds CMO compliance features
2. **`add_location_coordinates.sql`** - Adds map integration support
3. **`supabase_storage_setup.sql`** - Sets up file storage (run simplified version)

### 5. Test Your Deployment

1. **Wait for build to complete** (usually 2-3 minutes)
2. **Visit your app URL**: `https://your-app-name.onrender.com`
3. **Test key features:**
   - Student registration/login
   - Profile creation with map
   - Dashboard access
   - CMO requirements upload

## 🔧 Important Notes

### Free Tier Limitations
- **Cold starts**: App sleeps after 15 minutes of inactivity
- **Build time**: Limited to 500 build minutes/month
- **Bandwidth**: 100GB/month

### Production Considerations
- **Session Storage**: Uses in-memory sessions (will reset on restart)
- **File Uploads**: Stored in Supabase Storage
- **Database**: Supabase PostgreSQL (persistent)

### Troubleshooting

**Build Fails:**
- Check build logs in Render dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

**App Won't Start:**
- Check environment variables are set correctly
- Verify Supabase connection
- Check server logs for errors

**Database Errors:**
- Ensure SQL migration scripts are run
- Check Supabase connection string
- Verify database permissions

## 📱 Post-Deployment Checklist

- [ ] App loads successfully
- [ ] Student registration works
- [ ] Login/logout functions
- [ ] Profile creation with map integration
- [ ] Dashboard displays correctly
- [ ] CMO requirements upload (after storage setup)
- [ ] Email notifications work
- [ ] Mobile responsive design

## 🎉 Your NSTPConnect is Live!

Once deployed, your application will be available at:
`https://your-app-name.onrender.com`

Students can now:
- Register and create profiles
- Use interactive maps for location selection
- Access their dashboard
- Upload CMO requirements
- Receive email notifications