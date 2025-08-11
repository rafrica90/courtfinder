# PlayNow - Sports Venue Finder & Game Organization Platform

## 📋 Overview

**PlayNow** is a modern web application that helps sports enthusiasts find venues and organize games. Built with Next.js 15, React 19, and Supabase, it provides a streamlined platform for discovering sports facilities and coordinating pickup games with other players.

## 🎯 Core Features

### 1. **Venue Discovery**
- Browse sports venues by sport type (Tennis, Pickleball, Soccer, etc.)
- Filter venues by location and indoor/outdoor preferences
- View detailed venue information including:
  - Location and address
  - Available amenities (lights, locker rooms, pro shop, etc.)
  - Price estimates
  - Booking terms and conditions
  - Direct booking links

### 2. **Game Organization**
- Host new games at any venue
- Set game parameters:
  - Start time and date
  - Minimum and maximum player counts
  - Public or private visibility
  - Game notes and payment instructions
- Join existing games (waitlist support)

### 3. **Analytics & Tracking**
- Track venue popularity through click analytics
- Monitor user engagement with venues
- Collect data for improving venue recommendations

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.4.6 (App Router)
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS v4
- **TypeScript**: Full type safety throughout the application

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (ready for implementation)
- **API**: Next.js API Routes
- **ORM/Client**: Supabase JavaScript Client

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint with Next.js config
- **Build Tool**: Next.js with Turbopack (development)

## 📁 Project Structure

```
playnow/
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── api/               # API endpoints
│   │   │   ├── clicks/        # Venue click tracking
│   │   │   └── venues/        # Venue data endpoints
│   │   ├── games/             # Game management pages
│   │   │   ├── [id]/          # Individual game details
│   │   │   └── new/           # Create new game
│   │   ├── venues/            # Venue browsing
│   │   │   ├── [id]/          # Individual venue details
│   │   │   └── page.tsx       # Venue listing
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Homepage
│   ├── components/            # Reusable React components
│   │   └── Nav.tsx           # Navigation component
│   └── lib/                   # Utilities and configurations
│       ├── mockData.ts        # Sample data for development
│       ├── types.ts           # TypeScript type definitions
│       └── supabase/          # Supabase client setup
├── supabase/
│   └── schema.sql            # Database schema
├── public/                    # Static assets
└── config files              # Various configuration files
```

## 💾 Database Schema

### Tables

#### **sports**
- `id`: Primary key (text)
- `name`: Sport name
- `slug`: URL-friendly identifier

#### **venues**
- `id`: UUID primary key
- `name`: Venue name
- `sport_id`: Foreign key to sports
- `address`, `city`: Location details
- `latitude`, `longitude`: Geolocation
- `amenities`: Array of available features
- `price_estimate`: Estimated cost
- `photos`: Array of image URLs
- `booking_url`: Direct booking link
- `terms`: Venue-specific terms
- `indoor_outdoor`: Venue type (indoor/outdoor/both)
- `is_public`: Visibility flag

#### **games**
- `id`: UUID primary key
- `venue_id`: Foreign key to venues
- `host_user_id`: Game organizer
- `start_time`: Game scheduled time
- `min_players`, `max_players`: Player limits
- `visibility`: public/private
- `notes`: Additional information
- `cost_instructions`: Payment details

#### **participants**
- `id`: UUID primary key
- `game_id`: Foreign key to games
- `user_id`: Participant identifier
- `status`: joined/waitlist

#### **profiles**
- `user_id`: Primary key
- `display_name`: User's display name
- `sports_preferences`: Array of preferred sports
- `skill_level`: beginner/intermediate/advanced/pro

#### **clicks**
- `id`: UUID primary key
- `venue_id`: Foreign key to venues
- `user_id`: Optional user identifier
- `clicked_at`: Timestamp of click

## 🔌 API Endpoints

### `/api/clicks`
- **GET**: Tracks venue clicks and redirects to booking URL
- Parameters:
  - `venueId`: Venue identifier
  - `redirect`: Target URL for redirection

### `/api/venues` (Ready for implementation)
- Endpoint structure prepared for venue CRUD operations

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn
- Supabase account (for production)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd playnow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Database Setup

1. Create a new Supabase project
2. Run the schema from `supabase/schema.sql` in the SQL editor
3. Configure Row Level Security (RLS) policies as needed

## 📝 Key Components

### Pages

#### **Homepage** (`/`)
- Sport category navigation
- Popular venues showcase
- Quick access to game hosting

#### **Venues** (`/venues`)
- Filterable venue listing
- Sport-specific browsing
- Grid layout with venue cards

#### **Venue Details** (`/venues/[id]`)
- Complete venue information
- Booking link with click tracking
- Game hosting from venue

#### **New Game** (`/games/new`)
- Form for creating games
- Venue selection
- Player limits and visibility settings

### Data Types

The application uses strongly-typed data models:
- `Sport`: Sport categories
- `Venue`: Venue information
- `Game`: Game sessions
- `Participant`: Game participants
- `Profile`: User profiles
- `Click`: Analytics data

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach with breakpoints for tablets and desktops
- **Clean Interface**: Minimalist design with focus on usability
- **Interactive Elements**: Hover effects and smooth transitions
- **Accessible**: Semantic HTML and ARIA attributes where needed

## 🔒 Security Considerations

- Row Level Security (RLS) ready for implementation
- Service role key for server-side operations
- Environment variables for sensitive data
- Input validation on forms

## 🚧 Development Roadmap

### Current MVP Features ✅
- Venue browsing and filtering
- Basic game creation
- Click analytics
- Mock data for development

### Planned Enhancements 🔮
- User authentication and profiles
- Real-time game updates
- Advanced search and filters
- Payment integration
- Mobile app version
- Social features (comments, ratings)
- Email/SMS notifications
- Map integration for venue locations

## 🧪 Testing

Currently using mock data from `lib/mockData.ts` for development. Production will connect to Supabase for live data.

### Running Tests
```bash
npm run lint      # Run ESLint
npm run build     # Build for production
npm run start     # Start production server
```

## 📦 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Other Platforms
The app can be deployed to any platform supporting Next.js:
- AWS Amplify
- Netlify
- Railway
- Self-hosted with Node.js

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

[Add your license information here]

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team

---

**PlayNow** - Making sports more accessible, one game at a time! 🏆
