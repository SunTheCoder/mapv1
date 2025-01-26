"use client"

import { MapContainer, TileLayer, GeoJSON, LayersControl, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import React, { useEffect, useState } from "react";
import * as L from 'leaflet';
import { epaDataManager } from './utils/epaDataManager';
import StateDrawer from './components/StateDrawer';

const REGION_COLORS = {
  'Pacific West': '#2B5D8C',    // Blue
  'West Central': '#F7941D',    // Orange
  'South Central': '#4F9B55',   // Green
  'East Central': '#C1272D',    // Red
  'Southeast': '#FFF200',       // Yellow
  'Northeast': '#92278F',       // Purple
  'Native Tribes': '#666666'    // Gray (though this might not be visible on the map)
};

// First, let's define the state mappings
const REGION_STATES = {
  'Pacific West': ['WA', 'OR', 'CA', 'NV', 'AK', 'HI'],
  'West Central': ['MT', 'ID', 'WY', 'UT', 'CO', 'AZ', 'NM', 'ND', 'SD', 'NE', 'KS', 'IA', 'MN', 'MO'],
  'South Central': ['TX', 'OK', 'AR', 'LA'],
  'East Central': ['WI', 'MI', 'IL', 'IN', 'OH', 'KY', 'TN', 'WV', 'VA'],
  'Southeast': ['NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'PR', 'VI'],
  'Northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'PA', 'NJ', 'DE', 'MD', 'DC']
};

const REGIONS_DATA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Pacific West',
        region: 6,
        description: 'Including Am. Samoa, Guam, Northern Mariana Islands'
      },
      geometry: null
    },
    {
      type: 'Feature',
      properties: {
        name: 'West Central',
        region: 5,
        description: ''
      },
      geometry: null
    },
    {
      type: 'Feature',
      properties: {
        name: 'South Central',
        region: 4,
        description: ''
      },
      geometry: null
    },
    {
      type: 'Feature',
      properties: {
        name: 'East Central',
        region: 2,
        description: ''
      },
      geometry: null
    },
    {
      type: 'Feature',
      properties: {
        name: 'Southeast',
        region: 3,
        description: 'Including Puerto Rico & U.S. Virgin Islands'
      },
      geometry: null
    },
    {
      type: 'Feature',
      properties: {
        name: 'Northeast',
        region: 1,
        description: ''
      },
      geometry: null
    }
  ]
};

const processRegionsData = (states) => {
  if (!states) return REGIONS_DATA;

  return {
    ...REGIONS_DATA,
    features: REGIONS_DATA.features.map(region => {
      // Filter states using the stusab property from us-state-boundaries
      const regionStates = states.features.filter(state => 
        REGION_STATES[region.properties.name]?.includes(state.properties.stusab)
      );

      if (regionStates.length === 0) return region;

      const combinedGeometry = {
        type: 'MultiPolygon',
        coordinates: regionStates.flatMap(state => {
          // Handle the geometry from us-state-boundaries format
          const coords = state.geometry.coordinates;
          if (state.geometry.type === 'MultiPolygon') {
            return coords;
          }
          // If it's a Polygon, wrap it in an extra array to make it MultiPolygon format
          return [coords];
        })
      };

      return {
        ...region,
        geometry: combinedGeometry
      };
    })
  };
};

// S3 URLs for GeoJSON files
const S3_URLS = {
  states: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/us-state-boundaries.geojson',
  counties: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/georef-united-states-of-america-county.geojson',
  cities: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/us_cities.geojson',
  reservations: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/other_reservation.geojson'
};

const ResourceMap = () => {
  const hasReservationsNearby = (feature, type) => {
    if (!geoData.reservations) return false;
    
    if (type === 'state') {
      const bounds = L.geoJSON(feature).getBounds();
      return geoData.reservations.features.some(reservation => {
        const [lon, lat] = reservation.geometry.coordinates[0][0];
        return bounds.contains(L.latLng(lat, lon));
      });
    } else if (type === 'county') {
      const bounds = L.geoJSON(feature).getBounds();
      return geoData.reservations.features.some(reservation => {
        const [lon, lat] = reservation.geometry.coordinates[0][0];
        return bounds.contains(L.latLng(lat, lon));
      });
    }
    return false;
  };

  const [geoData, setGeoData] = useState({
    states: null,
    counties: null,
    cities: null,
    reservations: null
  });
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [epaData, setEpaData] = useState(null);
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    stateData: null
  });
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        console.log('Fetching GeoJSON data from S3...');
        const responses = await Promise.all([
          fetch(S3_URLS.states),
          fetch(S3_URLS.counties),
          fetch(S3_URLS.cities),
          fetch(S3_URLS.reservations)
        ]);

        const [states, counties, cities, reservations] = await Promise.all(
          responses.map(r => r.json())
        );

        console.log('Successfully loaded GeoJSON data from S3');
        setGeoData({
          states,
          counties,
          cities,
          reservations
        });
      } catch (error) {
        console.error('Error loading GeoJSON data:', error);
      }
    };

    fetchGeoData();
  }, []);

  useEffect(() => {
    const loadEPAData = async () => {
      try {
        const data = await epaDataManager.preloadData();
        setEpaData(data);
      } catch (error) {
        console.error('Error loading EPA data:', error);
      }
    };

    loadEPAData();
  }, []);

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        setSelectedFeature({
          name: feature.properties.BASENAME || "Unknown Location",
          centlat: feature.properties.CENTLAT || "No latitude available",
          centlng: feature.properties.CENTLON || "No longitude available",
          fullData: feature.properties,
          coordinates: e.latlng,
        });
        setIsExpanded(false);
      },
    });
  };

  const onEachCity = (feature, layer) => {
    layer.on({
      click: (e) => {
        const cityName = feature.properties.name;
        const cityPoint = L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
        const cityReservations = geoData.reservations?.features.filter(reservation => {
          const [lon, lat] = reservation.geometry.coordinates[0][0];
          const reservationPoint = L.latLng(lat, lon);
          return cityPoint.distanceTo(reservationPoint) <= 100000;
        }).map(reservation => reservation.properties.BASENAME) || [];

        setSelectedFeature({
          name: cityName,
          coordinates: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
          isCity: true,
          reservations: cityReservations
        });
      }
    });
  };

  const onEachState = (feature, layer) => {
    layer.on({
      click: (e) => {
        const bounds = layer.getBounds();
        setDrawerState({
          isOpen: true,
          stateData: {
            name: feature.properties.name,
            bounds: {
              minLat: bounds.getSouth(),
              maxLat: bounds.getNorth(),
              minLng: bounds.getWest(),
              maxLng: bounds.getEast()
            },
            epaData: epaData?.features.filter(epaFeature => {
              const [lon, lat] = epaFeature.geometry.coordinates[0][0];
              return bounds.contains([lat, lon]);
            })
          }
        });
      }
    });
  };

  const regionStyle = (feature) => {
    return {
      fillColor: REGION_COLORS[feature.properties.name],
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.3
    };
  };

  const onEachRegion = (feature, layer) => {
    layer.bindPopup(`
      <h3 class="font-bold">${feature.properties.name}</h3>
      <p>Region ${feature.properties.region}</p>
      ${feature.properties.description ? `<p>${feature.properties.description}</p>` : ''}
    `);
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <MapContainer 
        center={[39.8283, -98.5795]} 
        zoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Info Box */}
        <div className="leaflet-bottom leaflet-right" style={{ margin: "20px", marginLeft: "70px", zIndex: 1000, pointerEvents: "auto" }}>
          <div className={`bg-white bg-opacity-90 p-8 rounded-lg shadow-md max-w-xs transition-all duration-300 ${!isLegendExpanded ? 'w-48' : ''}`}>
            <button 
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="absolute -right-3 top-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              style={{zIndex: 1001}}
              title={isLegendExpanded ? "Hide legend" : "Show legend"}
            >
              <span className="text-gray-700">
                {isLegendExpanded ? '←' : '→'}
              </span>
            </button>
            {!isLegendExpanded ? (
              <p className="text-sm font-medium text-center text-gray-800">Click arrow to view map legend</p>
            ) : (
              <div className="opacity-100">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#2563eb",
                      opacity: 0.3,
                      border: "1px solid #2563eb"
                    }}></div>
                    <p className="text-sm font-medium text-gray-800">States with Tribal Nations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#999",
                      opacity: 0.3,
                      border: "1px solid #999"
                    }}></div>
                    <p className="text-sm font-medium text-gray-800">County Boundaries</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#22c55e",
                      opacity: 0.8,
                      border: "1px solid #000",
                      borderRadius: "50%"
                    }}></div>
                    <p className="text-sm font-medium text-gray-800">Cities near Tribal Nations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#060",
                      opacity: 0.3,
                      border: "1px solid #060"
                    }}></div>
                    <p className="text-sm font-medium text-gray-800">Tribal Nation Boundaries</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#ef4444",
                      opacity: 0.3,
                      border: "1px solid #ef4444"
                    }}></div>
                    <p className="text-sm font-medium text-gray-800">EPA Communities</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Click on a highlighted area to view more information. <br></br>
                    Each layer has unique information.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="State Boundaries">
            {geoData.states && <GeoJSON 
              data={geoData.states}
              style={(feature) => ({
                color: hasReservationsNearby(feature, 'state') ? '#2563eb' : '#666',
                weight: 1,
                fillOpacity: 0.1,
                fillColor: hasReservationsNearby(feature, 'state') ? '#2563eb' : '#666'
              })}
              onEachFeature={onEachState}
            />}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="County Boundaries" checked={false}>
            {geoData.counties && <GeoJSON 
              data={geoData.counties} 
              style={{color: '#999', weight: 1, fillOpacity: 0.05}} 
            />}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Tribal Nations">
            {geoData.reservations && <GeoJSON 
              data={geoData.reservations} 
              style={{color: '#060', weight: 1, fillOpacity: 0.1}}
              onEachFeature={onEachFeature}
            />}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Cities near Tribal Nations" checked={false}>
            {geoData.cities && <GeoJSON 
              data={geoData.cities}
              pointToLayer={(feature, latlng) => L.circleMarker(latlng, {
                radius: 8,
                fillColor: "#22c55e",
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
              })}
              onEachFeature={onEachCity}
            />}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="EPA Disadvantaged Communities">
            {epaData && (
              <GeoJSON
                data={epaData}
                style={{
                  color: '#ff0000',
                  weight: 2,
                  opacity: 0.8,
                  fillOpacity: 0.35
                }}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div>
                      <h4>${feature.properties.NAME || 'EPA Community'}</h4>
                      <p>Disadvantaged: ${feature.properties.Disadvantaged}</p>
                    </div>
                  `);
                }}
              />
            )}
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Grant Regions">
            {geoData.states && (
              <GeoJSON 
                key="grant-regions"
                data={processRegionsData(geoData.states)}
                style={regionStyle}
                onEachFeature={onEachRegion}
                zIndex={1000}
              />
            )}
          </LayersControl.Overlay>
        </LayersControl>

        {selectedFeature && (
          <Popup position={selectedFeature.coordinates}>
            <div className="p-4 bg-white shadow-lg rounded-lg w-64">
              <h4 className="text-lg font-bold text-gray-800">{selectedFeature.name}</h4>
              
              {selectedFeature.isCity ? (
                <div>
                  <h5 className="text-md font-semibold text-gray-700 mt-2">
                    Reservations within 100km of this city:
                  </h5>
                  {selectedFeature.reservations.length > 0 ? (
                    <ul className="mt-2 max-h-40 overflow-y-auto">
                      {selectedFeature.reservations.map((reservation, index) => (
                        <li key={index} className="text-sm text-gray-600 mb-1">• {reservation}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600 mt-2">
                      No reservations found near this city.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong className="text-gray-900">Nation:</strong> {selectedFeature.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-900">Center Latitude:</strong> {selectedFeature.centlat}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-900">Center Longitude:</strong> {selectedFeature.centlng}
                  </p>
                  
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-3 w-full bg-blue-600 text-white py-1 px-3 rounded-md text-sm font-medium hover:bg-blue-700 transition"
                  >
                    {isExpanded ? "Hide Details ▲" : "Show More ▼"}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-3 max-h-40 overflow-y-auto bg-gray-100 p-2 rounded border border-gray-300">
                      <pre className="text-xs text-gray-700">{JSON.stringify(selectedFeature.fullData, null, 2)}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </Popup>
        )}
      </MapContainer>

      <StateDrawer
        isOpen={drawerState.isOpen}
        stateData={drawerState.stateData}
        reservations={geoData.reservations}
        epaData={epaData}
      />
    </div>
  );
};

export default ResourceMap;