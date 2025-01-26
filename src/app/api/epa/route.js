import { NextResponse } from 'next/server';

let LAST_FETCH_TIME = null;
let cachedData = null;

// Set a longer timeout for the ArcGIS fetch
export const runtime = 'edge'; // This helps with timeout issues
export const maxDuration = 300; // 5 minutes

async function fetchEPAData() {
  console.log('\n🔍 CACHE STATUS: MISS - Fetching fresh data from ArcGIS');
  
  // Add timeout to the fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(
      'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/epa_ira/FeatureServer/0/query',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          where: "Disadvantaged = 'Yes' AND (American_Indian_Reservations = 'Yes' OR Alaska_Native_Villages = 'Yes' OR Alaska_Native_Allotments = 'Yes')",
          outFields: '*',
          f: 'geojson',
          geometryPrecision: '6'
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(`ArcGIS API returned status ${response.status}`);
    }

    const data = await response.json();
    LAST_FETCH_TIME = Date.now();
    cachedData = data;
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh && cachedData) {
      console.log('\n📥 Using cached EPA data');
      return NextResponse.json({
        data: cachedData,
        cached: true,
        last_fetch: LAST_FETCH_TIME
      });
    }

    const data = await fetchEPAData();
    const response = NextResponse.json({
      data,
      cached: false,
      last_fetch: LAST_FETCH_TIME
    });

    // Set cache control headers for CDN
    response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    console.log('✅ Response sent successfully');
    return response;

  } catch (error) {
    console.error('\n🔥 Error:', error);
    // If we have cached data, return it even if refresh was requested
    if (cachedData) {
      console.log('\n♻️ Returning cached data after error');
      return NextResponse.json({
        data: cachedData,
        cached: true,
        last_fetch: LAST_FETCH_TIME,
        error: error.message
      });
    }
    return NextResponse.json(
      { error: 'Failed to fetch EPA data' },
      { status: 500 }
    );
  }
} 