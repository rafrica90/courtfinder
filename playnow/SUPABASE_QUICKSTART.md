# 🚀 Supabase Quick Start Guide

## **What You Need to Do RIGHT NOW** 

### **Step 1: Create Tables** (5 minutes)
1. Go to Supabase Dashboard → SQL Editor
2. Copy ALL contents from `supabase/schema.sql`
3. Paste and run it
4. ✅ This creates all 6 tables + indexes + search function

### **Step 2: Enable Security** (2 minutes)
Run this in SQL Editor:
```sql
-- Enable Row Level Security
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;

-- Basic policies to get started
CREATE POLICY "Anyone can read venues" ON venues FOR SELECT USING (true);
CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = host_user_id);
CREATE POLICY "Only hosts can update their games" ON games FOR UPDATE TO authenticated USING (auth.uid()::text = host_user_id);
CREATE POLICY "Only hosts can delete their games" ON games FOR DELETE TO authenticated USING (auth.uid()::text = host_user_id);
CREATE POLICY "Authenticated users can view participants" ON participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join games" ON participants FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can leave games" ON participants FOR DELETE TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "Anyone can track clicks" ON clicks FOR INSERT USING (true);
```

### **Step 3: Configure Authentication** (3 minutes)
1. Go to Authentication → Settings
2. Set these:
   - **Site URL**: `https://your-app.railway.app` (your Railway URL)
   - **Add to Redirect URLs**:
     - `https://your-app.railway.app/**`
     - `http://localhost:3000/**` (for local dev)
3. Under Email Auth:
   - ✅ Enable Email Confirmations (recommended)
   - ✅ Use default email templates (or customize later)

### **Step 4: Get Your Keys** (1 minute)
1. Go to Settings → API
2. Copy these values for Railway:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### **Step 5: Import Venue Data** (2 minutes)
After setting environment variables in Railway:
```bash
# In your local terminal
cd playnow
npm run import:venues
```
This imports 100+ real venues from `venues.json`

## **That's It! Your App is Ready! 🎉**

---

## **Optional But Recommended**

### **Add User Profile Trigger** (Makes user experience better)
```sql
-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **Add Test Data** (For testing)
Run these SQL files in order:
1. `supabase/02-insert-test-venue.sql`
2. `supabase/03-insert-test-game.sql` 
3. `supabase/05-add-participants.sql`

Then visit `/games/g1` to see the test game!

### **Performance Boost** (When you have users)
```sql
-- Add these indexes when you have 1000+ games
CREATE INDEX idx_games_start_time ON games(start_time);
CREATE INDEX idx_participants_game_user ON participants(game_id, user_id);
```

---

## **Common Issues & Fixes**

### **"Database not configured" error**
→ Environment variables not set in Railway

### **Can't sign up/sign in**
→ Check Authentication settings, ensure email confirmations are configured

### **Can't create/join games**
→ RLS policies not created or user not authenticated

### **No venues showing**
→ Run `npm run import:venues` after setting env vars

### **500 errors on API routes**
→ Check Supabase connection, ensure service role key is set

---

## **Testing Your Setup**

1. **Sign Up**: Create a test account
2. **Browse Venues**: Should see 100+ venues
3. **Create Game**: Pick a venue, set time, create game
4. **Join Game**: Use another account to join
5. **Search**: Try searching for "tennis" or "basketball"

---

## **Next Steps**

Once everything works:
1. Customize email templates (Authentication → Email Templates)
2. Set up custom domain
3. Enable rate limiting (Settings → API)
4. Set up database backups (Settings → Backups)
5. Monitor usage (Reports → API Logs)

---

**Need Help?** 
- Check `/supabase/README.md` for detailed setup
- See `SUPABASE_COMPLETE_SETUP.md` for full checklist
- Supabase Discord: https://discord.supabase.com
