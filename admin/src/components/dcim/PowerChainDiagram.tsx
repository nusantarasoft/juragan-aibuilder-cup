import React from 'react';

interface PowerChainProps {
    rackId: string;
    powerDraw: number;
}

export function PowerChainDiagram({ rackId, powerDraw }: PowerChainProps) {
    // A simple SVG diagram illustrating power flow from Utility -> UPS -> PDU -> Rack
    return (
        <svg viewBox="0 0 400 150" width="100%" height="100%" style={{ background: 'transparent' }}>
            {/* Utility Power */}
            <rect x="10" y="50" width="60" height="40" rx="4" fill="#2db7f5" />
            <text x="40" y="75" fill="white" fontSize="12" textAnchor="middle" dominantBaseline="middle">Grid</text>
            
            {/* Line Grid to UPS */}
            <line x1="70" y1="70" x2="130" y2="70" stroke="#1890ff" strokeWidth="3" strokeDasharray="5,5" />
            <circle cx="100" cy="70" r="4" fill="#1890ff">
                <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite"/>
            </circle>

            {/* UPS */}
            <rect x="130" y="40" width="80" height="60" rx="4" fill="#52c41a" />
            <text x="170" y="65" fill="white" fontSize="12" textAnchor="middle" dominantBaseline="middle">UPS-A</text>
            <text x="170" y="85" fill="white" fontSize="10" textAnchor="middle" dominantBaseline="middle">100%</text>

            {/* Line UPS to PDU */}
            <line x1="210" y1="70" x2="270" y2="70" stroke="#52c41a" strokeWidth="3" />
            
            {/* PDU */}
            <rect x="270" y="30" width="40" height="80" rx="4" fill="#faad14" />
            <text x="290" y="60" fill="white" fontSize="12" textAnchor="middle" transform="rotate(-90 290 60)">PDU</text>

            {/* Line PDU to Rack */}
            <line x1="310" y1="70" x2="350" y2="70" stroke="#faad14" strokeWidth="3" />
            
            {/* Rack */}
            <rect x="350" y="20" width="40" height="100" rx="4" fill="#1f1f1f" stroke="#444" strokeWidth="2" />
            <text x="370" y="70" fill="white" fontSize="10" textAnchor="middle" transform="rotate(-90 370 70)">{rackId}</text>

            {/* Power Metric */}
            <text x="240" y="55" fill="#aaa" fontSize="10" textAnchor="middle">{powerDraw} kW</text>
        </svg>
    );
}
