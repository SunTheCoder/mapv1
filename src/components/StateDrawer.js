import React, { useState } from 'react';
import * as L from 'leaflet';

const StateDrawer = ({ isOpen, onClose, stateData, reservations }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!stateData) return null;

  const stateReservations = reservations?.features.filter(reservation => {
    const [lon, lat] = reservation.geometry.coordinates[0][0];
    return lat >= stateData.bounds.minLat && 
           lat <= stateData.bounds.maxLat && 
           lon >= stateData.bounds.minLng && 
           lon <= stateData.bounds.maxLng;
  }) || [];

  return (
    <div style={{ 
      position: 'absolute',
      left: '10px',
      top: '80px',
      zIndex: 1000
    }}>
      <div className={`bg-white rounded-lg shadow-lg transition-all duration-300 ${isExpanded ? 'w-64' : 'w-12'}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          style={{zIndex: 1001}}
          title={isExpanded ? "Hide details" : "Show details"}
        >
          {isExpanded ? '←' : '→'}
        </button>
        
        <div className={`${isExpanded ? 'opacity-100' : 'opacity-0 hidden'} p-4`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{stateData.name}</h2>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <section>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Tribal Nations</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600 mb-2">
                  Total Reservations: {stateReservations.length}
                </p>
                <div className="space-y-2">
                  {stateReservations.map((reservation, index) => (
                    <div 
                      key={index}
                      className="p-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors duration-200"
                    >
                      <p className="font-medium text-blue-700 text-sm">
                        {reservation.properties.BASENAME}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {stateData.epaData && (
              <section>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">EPA Data</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600">
                    Disadvantaged Communities: {stateData.epaData.length}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateDrawer; 