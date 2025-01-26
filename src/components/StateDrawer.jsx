import React, { useState } from 'react';
import * as L from 'leaflet';



const StateDrawer = ({ stateData, reservations, epaData }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  const formatArea = (squareMeters) => {
    if (!squareMeters) return '0';
    const squareMiles = squareMeters / (1609.34 * 1609.34);
    return formatNumber(squareMiles);
  };

  console.log(epaData);

  // Filter reservations for current state if we have state data
  const stateReservations = stateData ? (reservations?.features.filter(reservation => {
    const [lon, lat] = reservation.geometry.coordinates[0][0];
    return lat >= stateData.bounds.minLat && 
           lat <= stateData.bounds.maxLat && 
           lon >= stateData.bounds.minLng && 
           lon <= stateData.bounds.maxLng;
  }) || []) : [];

  const handleReservationClick = (reservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  };

  return (
    <div style={{ 
      position: 'absolute',
      left: '20px',
      top: '80px',
      zIndex: 1000
    }}>
      <div className={`bg-white rounded-lg shadow-lg transition-all duration-300 ${isExpanded ? 'w-64' : 'w-48'}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
          style={{zIndex: 1001}}
          title={isExpanded ? "Hide details" : "Show details"}
        >
          <span className="text-gray-700">
            {isExpanded ? '+' : '-'}
          </span>
        </button>

        {!isExpanded ? (
          <div className="p-4">
            <p className="text-sm font-medium text-center">Click arrow to view details</p>
          </div>
        ) : (
          <div className="opacity-100 p-4">
            {stateData ? (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{stateData.name}</h2>
                <div className="space-y-4">
                  <section>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Tribal Nations</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-600 mb-2">
                        Total Tribal Nations: {stateReservations.length}
                      </p>
                      <div className="space-y-2 max-h-[330px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {stateReservations.map((reservation, index) => (
                          <div 
                            key={index}
                            className="p-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors duration-200 cursor-pointer"
                            onClick={() => handleReservationClick(reservation)}
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
              </>
            ) : (
              <p className="text-sm font-medium text-center text-gray-800">Click on a state to view details</p>
            )}
          </div>
        )}
      </div>

      {showModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedReservation.properties.BASENAME}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full transition-colors duration-200"
              >
                Close ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700">Geographic Information</h3>
                <p className="text-gray-600">Land Area: {formatArea(selectedReservation.aland)} sq mi</p>
                <p className="text-gray-600">Water Area: {formatArea(selectedReservation.awater)} sq mi</p>
                <p className="text-gray-600">FIPS: {selectedReservation.geoid}</p>
              </div>

              {epaData?.features && (
                <div>
                  <h3 className="font-semibold text-gray-700">EPA Status</h3>
                  {(() => {
                    console.log('Selected Reservation:', selectedReservation);
                    console.log('EPA Features:', epaData.features);
                    
                    // Check if any EPA feature's coordinates contain the reservation's coordinates
                    const matchingEpaFeature = epaData.features.find(epaFeature => {
                      // Get first coordinate of reservation (as a sample point)
                      const [resLng, resLat] = selectedReservation.geometry.coordinates[0][0];
                      
                      // Check if this point is within EPA feature's polygon
                      const epaCoords = epaFeature.geometry.coordinates[0];
                      let inside = false;
                      
                      // Simple point-in-polygon check
                      for (let i = 0, j = epaCoords.length - 1; i < epaCoords.length; j = i++) {
                        const [xi, yi] = epaCoords[i];
                        const [xj, yj] = epaCoords[j];
                        
                        const intersect = ((yi > resLat) !== (yj > resLat))
                            && (resLng < (xj - xi) * (resLat - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                      }
                      
                      return inside;
                    });

                    if (matchingEpaFeature) {
                      return (
                        <p className="text-gray-600">
                          {matchingEpaFeature.properties.Disadvantaged === "Yes" ? 
                            <span className="text-red-600 font-medium">Disadvantaged Community</span> : 
                            <span className="text-green-600 font-medium">Not Disadvantaged</span>
                          }
                        </p>
                      );
                    } else {
                      return <p className="text-gray-500 italic">Not within EPA assessment boundaries</p>;
                    }
                  })()}
                </div>
              )}

              <div className="max-h-[40vh] overflow-y-auto">
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(selectedReservation.properties, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateDrawer; 