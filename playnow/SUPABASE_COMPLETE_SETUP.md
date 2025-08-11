# 📋 Complete Supabase Setup Checklist

## 🗄️ **1. Database Tables Setup**

### **Required Tables** (Run `schema.sql`):
- [ ] **sports** - Sport types catalog
- [ ] **venues** - Venue listings
- [ ] **games** - Game sessions
- [ ] **participants** - Game participants
- [ ] **profiles** - User profiles
- [ ] **clicks** - Analytics tracking

### **Database Extensions**:
- [ ] Enable `pg_trgm` extension for fuzzy text search
- [ ] Enable `uuid-ossp` or `pgcrypto` for UUID generation

### **Indexes for Performance**:
- [ ] Venue search indexes (name, address, city)
- [ ] Sports array GIN index
- [ ] Game venue foreign key index
- [ ] Unique constraint on (venue name + address)

## 🔐 **2. Authentication Setup**

### **Auth Settings**:
- [ ] Enable Email/Password authentication
- [ ] Configure email templates:
  - [ ] Confirmation email
  - [ ] Password reset email
  - [ ] Magic link email
- [ ] Set redirect URLs:
  ```
  Site URL: https://your-app.railway.app
  Redirect URLs: 
    - https://your-app.railway.app/
    - https://your-app.railway.app/sign-in
    - https://your-app.railway.app/games
  ```
- [ ] Configure JWT expiry (recommended: 1 hour)
- [ ] Enable email confirmation (optional but recommended)
- [ ] Set up custom SMTP (optional for custom emails)

## 🛡️ **3. Row Level Security (RLS)**

### **Enable RLS on all tables**:
```sql
-- Enable RLS
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
```

### **Create Security Policies**:

#### **Venues** (Public read, admin write):
```sql
-- Everyone can view public venues
CREATE POLICY "Public venues are viewable by everyone" 
ON venues FOR SELECT 
USING (is_public = true);

-- Only admins can insert/update/delete venues
CREATE POLICY "Only admins can manage venues" 
ON venues FOR ALL 
USING (auth.jwt() ->> 'role' = 'admin');
```

#### **Games** (Public read, authenticated write):
```sql
-- Everyone can view games
CREATE POLICY "Games are viewable by everyone" 
ON games FOR SELECT 
USING (true);

-- Authenticated users can create games
CREATE POLICY "Authenticated users can create games" 
ON games FOR INSERT 
WITH CHECK (auth.uid()::text = host_user_id);

-- Only hosts can update their games
CREATE POLICY "Hosts can update their games" 
ON games FOR UPDATE 
USING (auth.uid()::text = host_user_id);

-- Only hosts can delete their games
CREATE POLICY "Hosts can delete their games" 
ON games FOR DELETE 
USING (auth.uid()::text = host_user_id);
```

#### **Participants** (Authenticated only):
```sql
-- Authenticated users can view all participants
CREATE POLICY "Authenticated users can view participants" 
ON participants FOR SELECT 
TO authenticated 
USING (true);

-- Users can join games (insert themselves)
CREATE POLICY "Users can join games" 
ON participants FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

-- Users can leave games (delete themselves)
CREATE POLICY "Users can leave games" 
ON participants FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);
```

#### **Profiles** (Users own their profiles):
```sql
-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id);
```

#### **Clicks** (Public write, admin read):
```sql
-- Anyone can track clicks
CREATE POLICY "Anyone can track clicks" 
ON clicks FOR INSERT 
USING (true);

-- Only admins can view click analytics
CREATE POLICY "Only admins can view clicks" 
ON clicks FOR SELECT 
USING (auth.jwt() ->> 'role' = 'admin');
```

## 🗂️ **4. Storage Buckets**

### **Create Storage Buckets**:
- [ ] **venue-images** bucket:
  ```sql
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('venue-images', 'venue-images', true);
  ```
- [ ] **user-avatars** bucket:
  ```sql
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('user-avatars', 'user-avatars', true);
  ```

### **Storage Policies**:
```sql
-- Public can view venue images
CREATE POLICY "Public venue images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'venue-images');

-- Admins can upload venue images
CREATE POLICY "Admin venue image upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'venue-images' AND auth.jwt() ->> 'role' = 'admin');

-- Users can upload their own avatars
CREATE POLICY "Users can upload avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'user-avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🔧 **5. Database Functions & Triggers**

### **Auto-create user profile on signup**:
```sql
-- Function to create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **Auto-update participant count**:
```sql
-- Add participant_count column to games
ALTER TABLE games ADD COLUMN IF NOT EXISTS participant_count INT DEFAULT 0;

-- Function to update count
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE games 
    SET participant_count = (
      SELECT COUNT(*) FROM participants 
      WHERE game_id = NEW.game_id AND status = 'joined'
    )
    WHERE id = NEW.game_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE games 
    SET participant_count = (
      SELECT COUNT(*) FROM participants 
      WHERE game_id = OLD.game_id AND status = 'joined'
    )
    WHERE id = OLD.game_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_game_participant_count
AFTER INSERT OR UPDATE OR DELETE ON participants
FOR EACH ROW EXECUTE FUNCTION update_participant_count();
```

## 📊 **6. Initial Data Setup**

### **Run in Order**:
1. [ ] Run `schema.sql` - Creates all tables
2. [ ] Run `01-add-sport-column.sql` - Adds sport column
3. [ ] Import venues: `npm run import:venues` (after setting env vars)
4. [ ] Run test data scripts (optional):
   - [ ] `02-insert-test-venue.sql`
   - [ ] `03-insert-test-game.sql`
   - [ ] `05-add-participants.sql`

## ⚙️ **7. API Configuration**

### **Environment Variables in Railway**:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **API Settings**:
- [ ] Enable Rate Limiting in Supabase dashboard
- [ ] Configure CORS if needed
- [ ] Set up API keys rotation schedule

## 🔍 **8. Monitoring & Analytics**

### **Enable in Supabase**:
- [ ] Database metrics
- [ ] API request logs
- [ ] Auth event logs
- [ ] Error tracking

### **Set up alerts for**:
- [ ] Failed login attempts > 5 per minute
- [ ] Database connection pool exhaustion
- [ ] Storage quota usage > 80%
- [ ] API rate limit violations

## 🚀 **9. Performance Optimization**

### **Database Optimization**:
- [ ] Analyze query performance
- [ ] Add missing indexes based on usage:
  ```sql
  -- Check slow queries
  SELECT * FROM pg_stat_statements 
  ORDER BY total_time DESC 
  LIMIT 10;
  ```
- [ ] Set up connection pooling (PgBouncer)
- [ ] Configure appropriate connection limits

### **Caching Strategy**:
- [ ] Enable Supabase CDN for storage
- [ ] Configure appropriate cache headers
- [ ] Consider Redis for session/game state

## 📧 **10. Email & Notifications**

### **Email Templates**:
- [ ] Welcome email
- [ ] Game reminder (1 hour before)
- [ ] Game cancelled notification
- [ ] Waitlist promotion notification

### **Setup Custom SMTP** (Optional):
```
SMTP Host: smtp.sendgrid.net (or your provider)
SMTP Port: 587
SMTP User: apikey
SMTP Pass: your-api-key
From Email: noreply@courtfinder.app
```

## ✅ **11. Testing Checklist**

### **Test Each Feature**:
- [ ] User registration with email confirmation
- [ ] Password reset flow
- [ ] Create a game
- [ ] Join a game
- [ ] Leave a game
- [ ] Search venues
- [ ] Track clicks
- [ ] Upload images (if enabled)

### **Security Tests**:
- [ ] Try accessing other users' data
- [ ] Test SQL injection in search
- [ ] Verify rate limiting works
- [ ] Check RLS policies are enforced

## 🔄 **12. Backup & Recovery**

### **Set Up**:
- [ ] Daily automated backups
- [ ] Point-in-time recovery enabled
- [ ] Test restore procedure
- [ ] Document recovery steps

## 📝 **Quick Setup Script**

Run this in Supabase SQL Editor for basic setup:

```sql
-- 1. Enable RLS on all tables
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

-- 2. Create basic policies (adjust as needed)
CREATE POLICY "Public read venues" ON venues FOR SELECT USING (true);
CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Auth create games" ON games FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth join games" ON participants FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Create search function (if not exists)
-- (Already in schema.sql)

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_start_time ON games(start_time);
CREATE INDEX IF NOT EXISTS idx_participants_game_user ON participants(game_id, user_id);

-- Test the setup
SELECT 'Setup complete!' as status;
```

## 🎯 **Priority Order**

1. **Critical** (Do First):
   - Run `schema.sql`
   - Enable RLS
   - Create basic security policies
   - Set environment variables

2. **Important** (Do Second):
   - Configure authentication
   - Import venue data
   - Test basic functionality

3. **Nice to Have** (Do Later):
   - Storage buckets
   - Email templates
   - Analytics tracking
   - Performance optimization

---

**Note:** This checklist covers everything needed for a production-ready Supabase setup. Start with the critical items and add more features as needed.
