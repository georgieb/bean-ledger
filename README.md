# ☕ Bean Ledger

A professional coffee roasting and brewing management system with integrated AI recommendations.

## 📋 Project Overview

Bean Ledger is a production-grade application designed for coffee enthusiasts who want to track, analyze, and optimize their roasting and brewing processes. Built on an immutable ledger architecture, it provides complete audit trails, data integrity, and powerful analytics.

### Key Features

- **🗂️ Immutable Ledger System**: All state changes recorded as immutable entries
- **📊 Smart Inventory Management**: Track roasted and green coffee with automatic calculations
- **📅 Roast Schedule Management**: Plan, execute, and track roast sessions
- **☕ Enhanced Brew Logging**: Detailed brew parameters and tasting evaluations  
- **🤖 AI-Powered Recommendations**: Claude AI provides brew recipes and roast profiles
- **📈 Analytics & Insights**: Comprehensive data analysis and trends
- **⚙️ Equipment Profiles**: Manage grinder, roaster, and brewer settings
- **📱 Responsive Design**: Optimized for mobile, tablet, and desktop

## 🏗️ Architecture

### Immutable Ledger Pattern

All state changes are recorded as immutable ledger entries. Current state is calculated from ledger history, providing:

- **Complete Audit Trails**: Every action is permanently recorded
- **Undo/Rollback Capability**: Reconstruct state at any point in time
- **Time-Series Analytics**: Historical data analysis and trends
- **Data Integrity**: Tamper-proof record keeping
- **Historical Reconstruction**: Replay events to understand changes

### Core Entities

- **Ledger Entries**: Immutable records of all actions
- **Coffee Batches**: Roasted and green coffee inventory
- **Equipment**: User's roasting and brewing equipment
- **Brew Ratings**: Detailed tasting evaluations
- **User Preferences**: Personalized settings and defaults
- **AI Recommendations**: Claude-generated suggestions and advice

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth + Row Level Security)
- **AI**: Anthropic Claude API
- **Icons**: Lucide React
- **Utilities**: date-fns, Zod validation, Sonner notifications

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bean-ledger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your actual values:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key  
   - `ANTHROPIC_API_KEY`: Your Anthropic API key (server-only)

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000) in your browser**

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler check

## 🗄️ Database Configuration

### Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database migrations** (will be provided in Stage 2)

3. **Set up Row Level Security policies** (will be provided in Stage 2)

4. **Configure authentication** settings in the Supabase dashboard

### Database Schema

The application uses a comprehensive schema with:

- **ledger**: Immutable audit log of all actions
- **coffee_batches**: Coffee inventory and details  
- **equipment**: User equipment profiles
- **brew_ratings**: Detailed tasting evaluations
- **user_preferences**: Personalized user settings
- **ai_recommendations**: AI suggestion history

## 🚀 Deployment to Vercel

### Environment Variables Checklist

Ensure these are set in your Vercel deployment:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- [ ] `ANTHROPIC_API_KEY`

### Deploy Steps

1. **Connect your repository** to Vercel
2. **Set environment variables** in the Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev", 
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

## 🔐 Security Considerations

- **Row Level Security**: All database tables protected by RLS policies
- **Server-only API Keys**: Anthropic API key never exposed to client
- **Input Validation**: Zod schemas validate all user input
- **Authentication**: Supabase Auth with secure session management
- **HTTPS Only**: All production traffic encrypted

## 🧪 API Rate Limits & Costs

### Anthropic Claude API

- **Rate Limits**: Varies by plan (see Anthropic documentation)
- **Cost Optimization**: Requests cached and batched where possible
- **Fallbacks**: Graceful degradation if API unavailable

### Supabase

- **Free Tier**: 500MB database, 5GB bandwidth
- **Scaling**: Automatic scaling with usage-based pricing

## 🐛 Troubleshooting

### Common Issues

**"Cannot read properties of undefined"**
- Ensure environment variables are set correctly
- Check that Supabase project is active

**API Rate Limit Errors**  
- Check Anthropic API key and usage limits
- Implement request throttling if needed

**Database Connection Issues**
- Verify Supabase URL and keys
- Check that RLS policies are configured

**Build Errors**
- Run `npm run typecheck` to identify TypeScript issues
- Ensure all dependencies are installed

### Getting Help

1. Check this README for setup instructions
2. Review error messages and logs carefully
3. Check environment variable configuration  
4. Verify database migrations are applied
5. Test with a fresh `.env.local` file

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch** from main
2. **Make changes** following the established patterns
3. **Run tests** and type checking
4. **Create a pull request** with detailed description

### Code Standards

- **TypeScript Strict Mode**: All code must pass strict type checking
- **Component Structure**: Follow established patterns for consistency
- **Error Handling**: Always handle errors gracefully
- **Performance**: Optimize for production use
- **Security**: Follow security best practices

### Commit Message Format

- `feat: Add feature name`
- `fix: Fix bug description` 
- `refactor: Refactor component/function`
- `docs: Update documentation`
- `style: UI/styling changes`
- `chore: Maintenance tasks`

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Authentication pages
│   ├── (protected)/       # Protected app pages  
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── inventory/        # Inventory management
│   ├── schedule/         # Roast scheduling
│   ├── history/          # History and analytics
│   ├── brew/             # Brew logging
│   ├── equipment/        # Equipment management
│   └── ai/               # AI recommendation components
└── lib/                  # Utilities and configurations
    ├── types.ts          # TypeScript type definitions
    ├── supabase.ts       # Supabase client configuration
    └── utils.ts          # Utility functions
```

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Anthropic Claude** for AI recommendations
- **Supabase** for backend infrastructure
- **Vercel** for hosting and deployment
- **Next.js** team for the excellent framework
- Coffee community for inspiration and feedback

---

**Made with ☕ and ❤️ for the coffee community**