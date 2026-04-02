import { DraftStop, OptimizedTrip, ScheduleResult } from '@/lib/trip/types';

export type NavigationLink = { day: number; url: string };

export type OptimizationState = {
  optimizedStops: DraftStop[];
  schedule: ScheduleResult;
  optimizedTrip: OptimizedTrip | null;
};

export type TripWorkspaceState = {
  draftStops: DraftStop[];
  optimization: OptimizationState | null;
  navigationLinks: NavigationLink[];
  selectedStopId?: string;
};

type TripWorkspaceAction =
  | { type: 'resetAll' }
  | { type: 'setDraft'; draftStops: DraftStop[] }
  | {
      type: 'setOptimization';
      optimizedStops: DraftStop[];
      schedule: ScheduleResult;
      optimizedTrip: OptimizedTrip | null;
    }
  | { type: 'clearOptimization' }
  | { type: 'setNavigationLinks'; navigationLinks: NavigationLink[] }
  | { type: 'clearNavigationLinks' }
  | { type: 'toggleSelectedStop'; stopId: string }
  | { type: 'clearSelectedStop' };

export const EMPTY_SCHEDULE: ScheduleResult = {
  days: [],
  totalMinutes: 0,
  totalTravel: 0,
  totalStay: 0,
};

export const initialTripWorkspaceState: TripWorkspaceState = {
  draftStops: [],
  optimization: null,
  navigationLinks: [],
  selectedStopId: undefined,
};

export function tripWorkspaceReducer(
  state: TripWorkspaceState,
  action: TripWorkspaceAction,
): TripWorkspaceState {
  switch (action.type) {
    case 'resetAll':
      return initialTripWorkspaceState;

    case 'setDraft':
      return {
        draftStops: action.draftStops,
        optimization: null,
        navigationLinks: [],
        selectedStopId: undefined,
      };

    case 'setOptimization':
      return {
        ...state,
        optimization: {
          optimizedStops: action.optimizedStops,
          schedule: action.schedule,
          optimizedTrip: action.optimizedTrip,
        },
        navigationLinks: [],
        selectedStopId: undefined,
      };

    case 'clearOptimization':
      return {
        ...state,
        optimization: null,
        navigationLinks: [],
        selectedStopId: undefined,
      };

    case 'setNavigationLinks':
      return {
        ...state,
        navigationLinks: action.navigationLinks,
      };

    case 'clearNavigationLinks':
      return {
        ...state,
        navigationLinks: [],
      };

    case 'toggleSelectedStop':
      return {
        ...state,
        selectedStopId:
          state.selectedStopId === action.stopId ? undefined : action.stopId,
      };

    case 'clearSelectedStop':
      return {
        ...state,
        selectedStopId: undefined,
      };

    default:
      return state;
  }
}

export function selectOptimization(state: TripWorkspaceState): OptimizationState {
  return (
    state.optimization ?? {
      optimizedStops: [],
      schedule: EMPTY_SCHEDULE,
      optimizedTrip: null,
    }
  );
}
