'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
// import ResourceMap from '@/components/ResourceMap';

export default function MapPage() {
    const Map = useMemo(() => dynamic(() => import('@/ResourceMap'),
{ loading: () => <p>Loading Map</p>,
    ssr: false

}), [])

return <div>
    <Map />
</div>
}