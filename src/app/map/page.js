'use client';

import dynamic from 'next/dynamic';
import ResourceMap from '@/ResourceMap';

// const ResourceMap = dynamic(() => import('@/ResourceMap'), {
//   ssr: false,
//   loading: () => <div>Loading map...</div>
// });

const MapPage = () => {
  return (
    <div className="w-full h-screen">
      <ResourceMap />
    </div>
  );
};

export default MapPage;