import type { FailedAction, RuntimeMode } from '@/lib/trip/trip-flow-state';
import {
  EMPTY_OPTIMIZATION,
  type NavigationLink,
  type OptimizationState,
} from '@/lib/trip/trip-workspace-state';
import type {
  MapProvider,
  Objective,
  OptimizedTrip,
  TravelMode,
} from '@/lib/trip/types';

export type WorkspaceStartState = {
  tripText: string;
  formImportedStopsCount: number;
  draftStopCount: number;
  optimizedStopCount: number;
  navigationLinkCount: number;
};

export type PlanningSettings = {
  travelMode: TravelMode;
  objective: Objective;
  mapProvider: MapProvider;
  timezone: string;
};

export function hasWorkspaceStarted(state: WorkspaceStartState) {
  return (
    state.tripText.trim().length > 0 ||
    state.formImportedStopsCount > 0 ||
    state.draftStopCount > 0 ||
    state.optimizedStopCount > 0 ||
    state.navigationLinkCount > 0
  );
}

export function shouldUseDemoOptimization(runtimeMode: RuntimeMode) {
  return runtimeMode === 'demo';
}

export function shouldUseDemoNavigation(
  runtimeMode: RuntimeMode,
  optimizedTrip: OptimizedTrip | null,
) {
  return runtimeMode === 'demo' || !optimizedTrip;
}

export function isOptimizationCompatible(
  optimizedTrip: OptimizedTrip | null,
  settings: PlanningSettings,
) {
  if (!optimizedTrip) return false;

  return (
    optimizedTrip.transportMode === settings.travelMode &&
    optimizedTrip.objective === settings.objective &&
    optimizedTrip.mapProvider === settings.mapProvider &&
    optimizedTrip.timezone === settings.timezone
  );
}

export function getVisibleOptimizationState(
  optimization: OptimizationState,
  settings: PlanningSettings,
) {
  return isOptimizationCompatible(optimization.optimizedTrip, settings)
    ? optimization
    : EMPTY_OPTIMIZATION;
}

export function getVisibleNavigationLinks(
  navigationLinks: NavigationLink[],
  optimization: OptimizationState,
  settings: PlanningSettings,
) {
  return isOptimizationCompatible(optimization.optimizedTrip, settings) ? navigationLinks : [];
}

export function getRecoveryActionTarget(failedAction: FailedAction) {
  switch (failedAction) {
    case 'parse':
    case 'optimize':
    case 'navigation':
      return failedAction;
    default:
      return null;
  }
}
