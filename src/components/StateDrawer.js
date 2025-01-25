import React, { useState } from 'react';
import * as L from 'leaflet';

const StateDrawer = ({ isOpen, onClose, stateData, reservations }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showModal, setShowModal] = useState(false);

  if (!stateData) {
    return (
      <div style={{ 
        position: 'absolute',
        left: '10px',
        top: '80px',
        zIndex: 1000
      }}>
        <div className="bg-white rounded-lg shadow-lg w-48 p-4">
          <p className="text-sm font-medium text-center">Click on the map for details</p>
        </div>
      </div>
    );
  }

  const stateReservations = reservations?.features.filter(reservation => {
    const [lon, lat] = reservation.geometry.coordinates[0][0];
    return lat >= stateData.bounds.minLat && 
           lat <= stateData.bounds.maxLat && 
           lon >= stateData.bounds.minLng && 
           lon <= stateData.bounds.maxLng;
  }) || [];

  const handleReservationClick = (reservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  };

  return (
    <>
      <div style={{ 
        position: 'absolute',
        left: '10px',
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
            {isExpanded ? '←' : '→'}
          </button>
          
          {!isExpanded ? (
            <div className="p-4">
              <p className="text-sm font-medium text-center">Click arrow to view {stateData.name} details</p>
            </div>
          ) : (
            <div className="opacity-100 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">{stateData.name}</h2>
              </div>

              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <section>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Tribal Nations</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 mb-2">
                      Total Tribal Nations: {stateReservations.length}
                    </p>
                    <div className="space-y-2">
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
            </div>
          )}
        </div>
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
                <p className="text-gray-600">Area: {selectedReservation.properties.ALAND} sq meters</p>
                <p className="text-gray-600">Water Area: {selectedReservation.properties.AWATER} sq meters</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700">Administrative Details</h3>
                <p className="text-gray-600">FIPS Code: {selectedReservation.properties.GEOID}</p>
                <p className="text-gray-600">Class: {selectedReservation.properties.MTFCC}</p>
              </div>

              <div className="max-h-[40vh] overflow-y-auto">
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(selectedReservation.properties, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StateDrawer; 