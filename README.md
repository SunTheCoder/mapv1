# CEC Interactive Map Demo

An interactive mapping application built with Next.js that visualizes EPA data and tribal nations across different regions of the United States.

## Features

- Interactive map visualization using React-Leaflet
- Real-time EPA data integration with ArcGIS services
- Regional overlays with state and county boundaries
- Tribal reservation locations and details
- Caching system for improved performance
- Edge runtime support for handling long-running requests

## Tech Stack

- Next.js 15.1.6
- React 18.3.1
- React-Leaflet v5.0.0-rc.1
- TailwindCSS for styling
- Vercel for deployment

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Data Sources

- EPA Data: ArcGIS Feature Service
- Geographic Data: S3-hosted GeoJSON files including:
  - US State Boundaries
  - County Boundaries
  - City Locations
  - Tribal Reservations

## API Routes

The application includes an optimized EPA data endpoint at `/api/epa` that:
- Implements edge runtime for better performance
- Includes intelligent caching
- Handles timeouts gracefully
- Provides fallback data on errors

## Deployment

This project is optimized for deployment on Vercel. The edge runtime and caching strategies are specifically configured for production performance.

## Environment Variables

No environment variables are required for basic operation. The application uses public APIs and S3 buckets for data access.