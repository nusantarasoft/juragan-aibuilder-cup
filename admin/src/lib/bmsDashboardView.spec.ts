import { describe, expect, it } from 'vitest';
import { bmsHasLiveFacilityData, bmsShouldShowSampleBanner } from './bmsDashboardView';

describe('bmsDashboardView', () => {
    it('detects live data when systems exist', () => {
        expect(bmsHasLiveFacilityData([{ id: '1', tenantId: 't', name: 'HVAC', systemType: 'hvac' }], [])).toBe(true);
    });

    it('shows sample banner only after load when API is empty', () => {
        expect(bmsShouldShowSampleBanner(false, [], [])).toBe(false);
        expect(bmsShouldShowSampleBanner(true, [], [])).toBe(true);
        expect(bmsShouldShowSampleBanner(true, [{ id: '1', tenantId: 't', name: 'X', systemType: 'hvac' }], [])).toBe(false);
    });
});
