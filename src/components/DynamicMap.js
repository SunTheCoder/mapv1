'use client';

import Map from './Map';
import { useState, useEffect } from 'react';
import { epaDataManager } from '../utils/epaDataManager';
import StateDrawer from './StateDrawer';
import { REGION_COLORS, REGION_STATES, REGIONS_DATA, S3_URLS } from '../utils/mapConstants'; // Move constants to separate file

const DynamicMap = ({ width = 600, height = 600 }) => {
  // Your existing state declarations
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

  // Your existing useEffects and helper functions

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <Map
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
      >
        {(ReactLeaflet, Leaflet) => (
          <>
            <ReactLeaflet.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <ReactLeaflet.LayersControl position="topright">
              {/* Your existing layers using ReactLeaflet components */}
              {/* Convert all your existing layers to use ReactLeaflet.LayersControl.Overlay */}
            </ReactLeaflet.LayersControl>

            {selectedFeature && (
              <ReactLeaflet.Popup position={selectedFeature.coordinates}>
                {/* Your existing popup content */}
              </ReactLeaflet.Popup>
            )}
          </>
        )}
      </Map>

      <StateDrawer
        isOpen={drawerState.isOpen}
        stateData={drawerState.stateData}
        reservations={geoData.reservations}
        epaData={epaData}
      />
    </div>
  );
};

export default DynamicMap; 