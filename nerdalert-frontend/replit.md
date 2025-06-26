# NerdAlert Cyberpunk AI Chat Interface

## Overview

This is a full-stack web application featuring a cyberpunk-themed chat interface for "NerdAlert", an AI agent specializing in pop culture, geek culture, movies, TV shows, comics, and technology. The application combines a React frontend with a Node.js/Express backend, using in-memory storage and forwarding requests to the external NerdAlert API. Features Ethereum wallet integration via WalletConnect.

## System Architecture

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns:

- **Frontend**: React 19 with TypeScript, using Vite as the build tool
- **Backend**: Node.js with Express.js server (proxy to NerdAlert API)
- **Storage**: In-memory message storage (no database required)
- **Wallet Integration**: WalletConnect/Wagmi for Ethereum wallet connections
- **Agent Hosting**: Configurable for EternalAI network, traditional cloud, or local development
- **Styling**: Tailwind CSS with custom cyberpunk theming
- **UI Components**: Radix UI components via shadcn/ui
- **State Management**: TanStack Query for API state management

## Key Components

### Frontend Architecture
- **Framework**: React 19 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom cyberpunk color scheme and animations
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **API Client**: TanStack Query for server state management and caching

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL via Neon Database serverless connection
- **API Design**: RESTful endpoints for chat functionality
- **Proxy Integration**: Forwards requests to external NerdAlert API on localhost:80

### Database Schema
- **Users Table**: Basic user management with username/password fields
- **Messages Table**: Chat message storage with role, content, and timestamps
- **Validation**: Zod schemas for runtime type validation

## Data Flow

1. **User Input**: User types message in cyberpunk-themed chat interface
2. **Frontend Processing**: Message sent via TanStack Query mutation
3. **Backend Routing**: Express server receives message at `/api/prompt-sync`
4. **Message Storage**: User message stored in memory
5. **External API**: Request forwarded to NerdAlert agent (EternalAI network, cloud, or local)
6. **Response Processing**: AI response received and stored in memory
7. **Frontend Update**: UI updates with new messages via query invalidation

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL connection
- **@tanstack/react-query**: Server state management
- **drizzle-orm**: Type-safe ORM for database operations
- **@radix-ui/**: Comprehensive UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing for React

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type checking and development experience
- **drizzle-kit**: Database migration and schema management
- **esbuild**: Fast JavaScript bundler for server builds

## Deployment Strategy

The application is configured for deployment on Replit with autoscaling:

- **Development**: `npm run dev` starts both client and server in development mode
- **Build Process**: Vite builds frontend assets, esbuild bundles server code
- **Production**: `npm start` runs the production server
- **Database**: Uses Neon Database for managed PostgreSQL hosting
- **Environment**: Requires `DATABASE_URL` environment variable

The Replit configuration includes:
- Node.js 20 runtime
- PostgreSQL 16 module
- Autoscale deployment target
- Parallel workflow execution

## Changelog

```
Changelog:
- June 25, 2025. Initial setup
- June 25, 2025. Simplified architecture - removed database dependencies, using in-memory storage
- June 25, 2025. Added WalletConnect integration for Ethereum wallet connections
- June 25, 2025. Updated UI with crypto theming and sidebar chat management
- June 25, 2025. Added EternalAI network integration support for decentralized agent hosting
- June 25, 2025. Prepared GitHub repository files and upload instructions
- June 25, 2025. Reset git state to resolve Git plugin conflicts
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```