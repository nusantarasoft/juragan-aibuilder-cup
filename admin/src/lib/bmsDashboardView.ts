import type { BmsAlarm, BmsSystem } from '@/lib/bmsService';

export function bmsHasLiveFacilityData(systems: BmsSystem[], alarms: BmsAlarm[]): boolean {
    return systems.length > 0 || alarms.length > 0;
}

export function bmsShouldShowSampleBanner(
    liveDataLoaded: boolean,
    systems: BmsSystem[],
    alarms: BmsAlarm[],
): boolean {
    return liveDataLoaded && !bmsHasLiveFacilityData(systems, alarms);
}
