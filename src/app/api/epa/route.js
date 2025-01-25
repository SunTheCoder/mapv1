import { NextResponse } from 'next/server';

let LAST_FETCH_TIME = null;
let cachedData = null;

async function fetchEPAData() {
  console.log('\n🔍 CACHE STATUS: MISS - Fetching fresh data from ArcGIS');
  
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
      })
    }
  );

  if (!response.ok) {
    throw new Error(`ArcGIS API returned status ${response.status}`);
  }

  const data = await response.json();
  LAST_FETCH_TIME = Date.now();
  cachedData = data;
  return data;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    let data;
    if (forceRefresh || !cachedData) {
      data = await fetchEPAData();
    } else {
      console.log('\n📥 Using cached EPA data');
      data = cachedData;
    }

    const response = NextResponse.json({
      data,
      cached: LAST_FETCH_TIME !== null,
      last_fetch: LAST_FETCH_TIME
    });

    // Set cache control headers
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('ETag', Date.now().toString());

    console.log('✅ Response sent successfully');
    return response;

  } catch (error) {
    console.error('\n🔥 Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch EPA data' },
      { status: 500 }
    );
  }
} 