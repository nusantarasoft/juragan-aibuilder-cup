import { useEffect } from 'react';
import { useScadaStore } from './useScadaStore';

export const useSimulation = (isActive: boolean) => {
    const { tags, updateTag } = useScadaStore();

    useEffect(() => {
        if (!isActive) return;

        const interval = setInterval(() => {
            // Simulate Temp 1
            const temp1 = tags['tag_temp_1']?.value || 6.5;
            const newTemp1 = temp1 + (Math.random() - 0.5) * 0.2;
            updateTag('tag_temp_1', parseFloat(newTemp1.toFixed(1)));

            // Simulate Temp 2
            const temp2 = tags['tag_temp_2']?.value || 12.1;
            const newTemp2 = temp2 + (Math.random() - 0.5) * 0.3;
            updateTag('tag_temp_2', parseFloat(newTemp2.toFixed(1)));

            // Simulate Pump Hz
            if (tags['tag_pump_status']?.value) {
                const hz = tags['tag_pump_hz']?.value || 60.0;
                let newHz = hz + (Math.random() - 0.5) * 1.0;
                newHz = Math.min(Math.max(newHz, 55.0), 65.0);
                updateTag('tag_pump_hz', parseFloat(newHz.toFixed(1)));
            } else {
                updateTag('tag_pump_hz', 0);
            }

            // Simulate random vibration alarm on CT
            if (Math.random() > 0.95) {
                updateTag('tag_ct_vib', true, true);
                setTimeout(() => updateTag('tag_ct_vib', false, false), 3000); // clear after 3s
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, tags, updateTag]);
};
