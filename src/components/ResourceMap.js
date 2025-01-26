// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import maplibregl from 'maplibre-gl';
// import 'maplibre-gl/dist/maplibre-gl.css';
// import { epaDataManager } from '../utils/epaDataManager';
// import StateDrawer from './StateDrawer';
// import * as turf from '@turf/turf';
// // import { REGION_COLORS } from '../utils/mapConstants';

// // S3 URLs for GeoJSON files
// const S3_URLS = {
//   states: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/us-state-boundaries.geojson',
//   counties: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/georef-united-states-of-america-county.geojson', 
//   cities: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/us_cities.geojson',
//   reservations: 'https://cec-geo-data.s3.us-east-2.amazonaws.com/other_reservation.geojson'
// };

// const ResourceMap = () => {
//   const mapContainer = useRef(null);
//   const map = useRef(null);
//   const [geoData, setGeoData] = useState({
//     states: null,
//     counties: null,
//     cities: null,
//     reservations: null
//   });
//   const [drawerState, setDrawerState] = useState({
//     isOpen: false,
//     stateData: null
//   });
//   const [epaData, setEpaData] = useState(null);
//   const [layerVisibility, setLayerVisibility] = useState({
//     states: true,
//     counties: false,
//     cities: false,
//     epa: false,
//     reservations: true
//   });

//   const toggleLayer = (layerId) => {
//     const newVisibility = !layerVisibility[layerId];
//     setLayerVisibility(prev => ({
//       ...prev,
//       [layerId]: newVisibility
//     }));
    
//     if (map.current) {
//       const visibility = newVisibility ? 'visible' : 'none';
//       switch(layerId) {
//         case 'states':
//           map.current.setLayoutProperty('state-fills', 'visibility', visibility);
//           map.current.setLayoutProperty('state-borders', 'visibility', visibility);
//           break;
//         case 'counties':
//           map.current.setLayoutProperty('county-borders', 'visibility', visibility);
//           break;
//         case 'cities':
//           map.current.setLayoutProperty('cities', 'visibility', visibility);
//           break;
//         case 'epa':
//           map.current.setLayoutProperty('epa-fills', 'visibility', visibility);
//           break;
//         case 'reservations':
//           map.current.setLayoutProperty('reservation-fills', 'visibility', visibility);
//           break;
//       }
//     }
//   };

//   const addMapSources = (states, counties, cities, reservations) => {
//     // Add state boundaries source
//     map.current.addSource('states', {
//       type: 'geojson',
//       data: states
//     });

//     // Add county boundaries source
//     map.current.addSource('counties', {
//       type: 'geojson',
//       data: counties
//     });

//     // Add cities source
//     map.current.addSource('cities', {
//       type: 'geojson',
//       data: cities
//     });

//     // Add reservations source
//     map.current.addSource('reservations', {
//       type: 'geojson',
//       data: reservations
//     });
//   };

//   const addMapLayers = () => {
//     // Add state boundaries layer
//     map.current.addLayer({
//       id: 'state-fills',
//       type: 'fill',
//       source: 'states',
//       layout: {
//         'visibility': 'visible'
//       },
//       paint: {
//         'fill-color': '#2563eb',
//         'fill-opacity': 0.1
//       }
//     });

//     map.current.addLayer({
//       id: 'state-borders',
//       type: 'line',
//       source: 'states',
//       layout: {
//         'visibility': 'visible'
//       },
//       paint: {
//         'line-color': '#2563eb',
//         'line-width': 1
//       }
//     });

//     // Add county layer
//     map.current.addLayer({
//       id: 'county-borders',
//       type: 'line',
//       source: 'counties',
//       layout: {
//         'visibility': 'none'  // Hidden by default
//       },
//       paint: {
//         'line-color': '#999',
//         'line-width': 1
//       }
//     });

//     // Add reservation layer
//     map.current.addLayer({
//       id: 'reservation-fills',
//       type: 'fill',
//       source: 'reservations',
//       layout: {
//         'visibility': 'visible'
//       },
//       paint: {
//         'fill-color': '#060',
//         'fill-opacity': 0.1
//       }
//     });

//     // Add cities layer
//     map.current.addLayer({
//       id: 'cities',
//       type: 'circle',
//       source: 'cities',
//       layout: {
//         'visibility': 'none'  // Hidden by default
//       },
//       paint: {
//         'circle-radius': 6,
//         'circle-color': '#22c55e',
//         'circle-stroke-width': 1,
//         'circle-stroke-color': '#000'
//       }
//     });

    

//     // Add click handlers
//     map.current.on('click', 'state-fills', (e) => {
//       if (e.features.length > 0) {
//         const clickedState = e.features[0];
//         console.log("Clicked State:", clickedState);

//         setDrawerState({
//           isOpen: true,
//           stateData: {
//             name: clickedState.properties.name,
//             abbreviation: clickedState.properties.stusps,
//             stateProperties: {
//               GEOID: clickedState.properties.geoid,
//               REGION: clickedState.properties.region,
//               DIVISION: clickedState.properties.division
//             },
//             cities: [],  // We'll add this back once basic state data works
//             reservations: [], // We'll add this back once basic state data works
//             statistics: {
//               totalArea: 0,
//               reservationArea: 0,
//               reservationPercentage: "0.00",
//               majorCities: 0,
//               totalReservations: 0
//             }
//           }
//         });
//       }
//     });
//   };

//   const addEPALayers = (data) => {
//     if (!map.current.getSource('epa-data')) {
//       map.current.addSource('epa-data', {
//         type: 'geojson',
//         data: data
//       });

//       map.current.addLayer({
//         id: 'epa-fills',
//         type: 'fill',
//         source: 'epa-data',
//         layout: {
//           'visibility': 'none'  // Hidden by default
//         },
//         paint: {
//           'fill-color': '#ef4444',
//           'fill-opacity': 0.35
//         }
//       });
//     }
//   };

//   useEffect(() => {
//     if (map.current) return;

//     map.current = new maplibregl.Map({
//       container: mapContainer.current,
//       style: {
//         version: 8,
//         sources: {
//           'osm': {
//             type: 'raster',
//             tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
//             tileSize: 256,
//             attribution: '&copy; OpenStreetMap Contributors'
//           }
//         },
//         layers: [{
//           id: 'osm',
//           type: 'raster',
//           source: 'osm',
//           minzoom: 0,
//           maxzoom: 19
//         }]
//       },
//       center: [-98.5795, 39.8283],
//       zoom: 4
//     });

//     map.current.addControl(new maplibregl.NavigationControl());

//     map.current.on('load', () => {
//       loadGeoData();
//       loadEPAData();
//     });
//   }, []);

//   const loadGeoData = async () => {
//     try {
//       const responses = await Promise.all([
//         fetch(S3_URLS.states),
//         fetch(S3_URLS.counties),
//         fetch(S3_URLS.cities), 
//         fetch(S3_URLS.reservations)
//       ]);

//       // Check if any requests failed
//       responses.forEach(response => {
//         if (!response.ok) {
//           throw new Error(`HTTP error! status: ${response.status}`);
//         }
//       });

//       const [states, counties, cities, reservations] = await Promise.all(
//         responses.map(r => r.json())
//       );

//       console.log("States", states);
//       console.log("Counties", counties);
//       console.log("Cities", cities);
//       console.log("Reservations", reservations);

//       setGeoData({ states, counties, cities, reservations });
      
//       if (map.current) {
          
//         addMapSources(states, counties, cities, reservations);
//         addMapLayers();
//       }
//     } catch (error) {
//       console.error('Error loading GeoJSON data:', error);
//       // Could add user-facing error handling here
//     }
//   };

//   const loadEPAData = async () => {
//     try {
//       const data = await epaDataManager.preloadData();
//       setEpaData(data);
//       if (map.current && data) {
//         addEPALayers(data);
//       }
//     } catch (error) {
//       console.error('Error loading EPA data:', error);
//     }
//   };

//   return (
//     <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
//       <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
//       {/* Layer Controls */}
//       <div className="absolute top-4 right-4 bg-white p-4 rounded shadow-lg">
//         <h3 className="font-bold mb-2">Layers</h3>
//         <div className="space-y-2">
//           <label className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               checked={layerVisibility.states}
//               onChange={() => toggleLayer('states')}
//             />
//             <span>States</span>
//           </label>
//           <label className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               checked={layerVisibility.counties}
//               onChange={() => toggleLayer('counties')}
//             />
//             <span>Counties</span>
//           </label>
//           <label className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               checked={layerVisibility.cities}
//               onChange={() => toggleLayer('cities')}
//             />
//             <span>Cities</span>
//           </label>
//           <label className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               checked={layerVisibility.reservations}
//               onChange={() => toggleLayer('reservations')}
//             />
//             <span>Reservations</span>
//           </label>
//           <label className="flex items-center space-x-2">
//             <input
//               type="checkbox"
//               checked={layerVisibility.epa}
//               onChange={() => toggleLayer('epa')}
//             />
//             <span>EPA Data</span>
//           </label>
//         </div>
//       </div>

//       <StateDrawer
//         isOpen={drawerState.isOpen}
//         stateData={drawerState.stateData}
//       />
//     </div>
//   );
// };

// export default ResourceMap; 