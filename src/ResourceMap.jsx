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
  'Northeast': '#69C3E5',       // Light Blue (Region 1)
  'East Central': '#FF6B6B',    // Coral Red (Region 2)
  'Southeast': '#FF9F5B',       // Orange (Region 3)
  'South Central': '#E5A1E5',   // Light Purple (Region 4)
  'West Central': '#FFE066',    // Yellow (Region 5)
  'Pacific West': '#98E698',    // Light Green (Region 6)
  'Native Tribes': '#7FDBDA'    // Turquoise (Region 6 Native Tribes)
};

// First, let's define the state mappings
const REGION_STATES = {
  'Pacific West': ['WA', 'OR', 'CA', 'NV', 'AK', 'HI', 'AS', 'GU', 'MP'],
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

      // For Pacific West region, add territories if they're not in the states data
      if (region.properties.name === 'Pacific West') {
        // Add placeholder geometries for territories if needed
        const territories = {
          'AS': { // American Samoa
            coordinates: [-170.7, -14.3],
            name: 'American Samoa'
          },
          'GU': { // Guam
            coordinates: [144.8, 13.4],
            name: 'Guam'
          },
          'MP': { // Northern Mariana Islands
            coordinates: [145.7, 15.2],
            name: 'Northern Mariana Islands'
          }
        };

        // Create point features for territories
        const territoryFeatures = Object.entries(territories)
          .filter(([code]) => !regionStates.some(state => state.properties.stusab === code))
          .map(([code, data]) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: data.coordinates
            },
            properties: {
              stusab: code,
              name: data.name
            }
          }));

        // Add territory points to the region's geometry
        if (territoryFeatures.length > 0) {
          const combinedGeometry = {
            type: 'GeometryCollection',
            geometries: [
              ...regionStates.map(state => state.geometry),
              ...territoryFeatures.map(t => t.geometry)
            ]
          };
          return {
            ...region,
            geometry: combinedGeometry
          };
        }
      }

      if (regionStates.length === 0) return region;

      const combinedGeometry = {
        type: 'MultiPolygon',
        coordinates: regionStates.flatMap(state => {
          const coords = state.geometry.coordinates;
          if (state.geometry.type === 'MultiPolygon') {
            return coords;
          }
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

// Update the PacificInsetMap component to remove permanent popups
const PacificInsetMap = React.memo(({ geoData, regionStyle }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="leaflet-bottom leaflet-left" style={{ 
       
      zIndex: 1000, 
      pointerEvents: "auto",
      position: "absolute",
      bottom: 20,
      left: 20
    }}>
      <div className="bg-white bg-opacity-90 p-2 rounded-lg shadow-md">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-2 w-fit bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          style={{zIndex: 1001}}
          title={isCollapsed ? "Show Pacific territories" : "Hide Pacific territories"}
        >
          <span className="text-gray-700">
            {isCollapsed ? '+' : '-'}
          </span>
        </button>

        {!isCollapsed ? (
          <>
            <h4 className="text-lg font-bold mb-2 text-gray-800">Pacific Territories</h4>
            <p className="text-xs text-gray-600 mb-2">Part of Pacific West Region</p>
            <MapContainer 
              key="pacific-inset"
              center={[14.5, 145.5]}
              zoom={6}
              style={{ height: "300px", width: "370px" }}
              zoomControl={true}
              dragging={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {geoData?.states && (
                <GeoJSON 
                  key={`pacific-territories-${geoData.states.features.length}`}
                  data={{
                    type: 'FeatureCollection',
                    features: geoData.states.features.filter(f => 
                      ['MP', 'GU'].includes(f.properties.stusab)
                    )
                  }}
                  style={{
                    fillColor: REGION_COLORS['Pacific West'],
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.3
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.bindPopup(`
                      <div class="p-2">
                        <h3 class="font-bold text-sm">${feature.properties.basename}</h3>
                        <p class="text-xs text-gray-600">Pacific West Region</p>
                        <p class="text-xs mt-1">
                          Center: ${feature.properties.centlat.toFixed(2)}°N, 
                          ${feature.properties.centlon.toFixed(2)}°E
                        </p>
                      </div>
                    `);
                    
                    layer.on({
                      mouseover: (e) => {
                        layer.setStyle({
                          fillOpacity: 0.7,
                          weight: 3
                        });
                      },
                      mouseout: (e) => {
                        layer.setStyle({
                          fillOpacity: 0.3,
                          weight: 2
                        });
                      }
                    });
                  }}
                />
              )}
            </MapContainer>
            <div className="mt-2 text-xs text-gray-600">
              <p>• Interactive map of Guam and Northern Mariana Islands</p>
              <p>• Click territories for details</p>
              <p>• Zoom and pan enabled</p>
            </div>
          </>
        ) : (
          <p className="text-sm font-medium text-center text-gray-800">Click + to view Pacific territories</p>
        )}
      </div>
    </div>
  );
});

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
  const [isLegendExpanded, setIsLegendExpanded] = useState(true);
  const [activeLayers, setActiveLayers] = useState(['regions']);

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
    layer.on({
      mouseover: (e) => {
        layer.setStyle({
          fillOpacity: 0.7,
          weight: 3
        });
      },
      mouseout: (e) => {
        layer.setStyle({
          fillOpacity: 0.3,
          weight: 2
        });
      },
      click: (e) => {
        // Always handle state clicks regardless of layer visibility
        const stateName = feature.properties.name;
        const bounds = layer.getBounds();
        setDrawerState({
          isOpen: true,
          stateData: {
            name: stateName,
            bounds: {
              minLat: bounds.getSouth(),
              maxLat: bounds.getNorth(),
              minLng: bounds.getWest(),
              maxLng: bounds.getEast()
            },
            epaData: epaData?.features.filter(f => 
              isPointInBounds(f.geometry.coordinates, bounds)
            )
          }
        });
      }
    });
  };

  const filterCitiesNearReservations = (cities, reservations) => {
    if (!cities || !reservations) return null;
    
    return {
      ...cities,
      features: cities.features.filter(city => {
        const cityPoint = L.latLng(city.geometry.coordinates[1], city.geometry.coordinates[0]);
        return reservations.features.some(reservation => {
          const [lon, lat] = reservation.geometry.coordinates[0][0];
          const reservationPoint = L.latLng(lat, lon);
          return cityPoint.distanceTo(reservationPoint) <= 100000; // 100km in meters
        });
      })
    };
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <MapContainer 
        center={[39.8283, -98.5795]} 
        zoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LayersControl position="topright" collapsed={false}>
          <LayersControl.Overlay name="State Boundaries">
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

          <LayersControl.Overlay checked name="Tribal Nations">
            {geoData.reservations && <GeoJSON 
              data={geoData.reservations} 
              style={{color: '#7FDBDA', weight: 1, fillOpacity: 0.7}}
              onEachFeature={onEachFeature}
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

          <LayersControl.Overlay checked={true} name="Grant Regions">
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
                    Tribal nations within 100km of this city:
                  </h5>
                  {selectedFeature.reservations.length > 0 ? (
                    <ul className="mt-2 max-h-40 overflow-y-auto">
                      {selectedFeature.reservations.map((reservation, index) => (
                        <li key={index} className="text-sm text-gray-600 mb-1">• {reservation}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600 mt-2">
                      No tribal nations found near this city.
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

      <div className="leaflet-bottom leaflet-right" style={{ margin: "20px", marginLeft: "70px", zIndex: 1000, pointerEvents: "auto" }}>
        <div className={`bg-white bg-opacity-90 p-8 rounded-lg shadow-md max-w-xs transition-all duration-300 ${!isLegendExpanded ? 'w-48' : ''}`}>
          <button 
            onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            className="absolute -right-3 top-2 w-fit bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
            style={{zIndex: 1001}}
            title={isLegendExpanded ? "Hide legend" : "Show legend"}
          >
            <span className="text-gray-700">
              {isLegendExpanded ? '-' : '+'}
            </span>
          </button>
          {!isLegendExpanded ? (
            <p className="text-sm font-medium text-center text-gray-800">Click + to view legend</p>
          ) : (
            <div className="opacity-100">
              <div className="flex flex-col gap-2">
                {/* CEC Regions Section */}
                <h3 className="font-bold text-lg text-gray-800 mb-2">CEC Regional Partners</h3>
                {Object.entries(REGION_COLORS).map(([region, color]) => (
                  <div key={region} className="flex items-center gap-2">
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: color,
                      opacity: 0.7,
                      border: "1px solid rgba(0,0,0,0.2)",
                      borderRadius: "4px"
                    }}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{region}</p>
                      {/* {region === 'Pacific West' && (
                        <p className="text-sm text-gray-600">Including Am. Samoa, Guam, Northern Mariana Islands</p>
                      )}
                      {region === 'Southeast' && (
                        <p className="text-sm text-gray-600">Including Puerto Rico & U.S. Virgin Islands</p>
                      )} */}
                    </div>
                  </div>
                ))}

                <div className="border-t border-gray-200 my-4"></div>

                {/* Other Layers Section */}
                <h3 className="font-bold text-lg text-gray-800 mb-2">Other Layers</h3>
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
                    backgroundColor: "#7FDBDA",
                    opacity: 0.7,
                    border: "1px solid #7FDBDA"
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
                <p className="text-sm text-gray-600 mt-2">
                  Click on a highlighted area to view more information. <br></br>
                  Each layer has unique information.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <StateDrawer
        isOpen={drawerState.isOpen}
        stateData={drawerState.stateData}
        reservations={geoData.reservations}
        epaData={epaData}
      />

      {/* Only render PacificInsetMap when data is available */}
      {geoData.states && <PacificInsetMap geoData={geoData} regionStyle={regionStyle} />}
    </div>
  );
};

export default ResourceMap;