import { DataSource } from '@/lib/trip/types';

export type RuntimeMode = 'idle' | 'live' | 'demo' | 'error';
export type FlowActionName = 'parse' | 'optimize' | 'navigation';
export type FailedAction = FlowActionName | null;
export type OperationStatus = 'idle' | 'running' | 'slow';

export type TripFlowState = {
  runtimeMode: RuntimeMode;
  runtimeSource: DataSource;
  warningMessage: string;
  errorMessage: string;
  failedAction: FailedAction;
  lastAction: string;
  operationStatus: Record<FlowActionName, OperationStatus>;
};

type TripFlowReducerAction =
  | {
      type: 'start';
      action: FlowActionName;
      lastAction: string;
    }
  | {
      type: 'markSlow';
      action: FlowActionName;
    }
  | {
      type: 'succeed';
      action: FlowActionName;
      mode: Exclude<RuntimeMode, 'idle' | 'error'>;
      source: DataSource;
      lastAction: string;
      warningMessage?: string;
    }
  | {
      type: 'fail';
      action: FlowActionName;
      errorMessage: string;
      lastAction: string;
      source?: DataSource;
    }
  | {
      type: 'setIdleContext';
      source?: DataSource;
      lastAction: string;
      warningMessage?: string;
    }
  | {
      type: 'clearStatus';
    };

export const initialTripFlowState: TripFlowState = {
  runtimeMode: 'idle',
  runtimeSource: 'manual',
  warningMessage: '',
  errorMessage: '',
  failedAction: null,
  lastAction: '',
  operationStatus: {
    parse: 'idle',
    optimize: 'idle',
    navigation: 'idle',
  },
};

export function tripFlowReducer(
  state: TripFlowState,
  action: TripFlowReducerAction,
): TripFlowState {
  switch (action.type) {
    case 'start':
      return {
        ...state,
        warningMessage: '',
        errorMessage: '',
        failedAction: null,
        lastAction: action.lastAction,
        operationStatus: {
          ...state.operationStatus,
          [action.action]: 'running',
        },
      };

    case 'markSlow':
      if (state.operationStatus[action.action] !== 'running') return state;

      return {
        ...state,
        operationStatus: {
          ...state.operationStatus,
          [action.action]: 'slow',
        },
      };

    case 'succeed':
      return {
        ...state,
        runtimeMode: action.mode,
        runtimeSource: action.source,
        warningMessage: action.warningMessage ?? '',
        errorMessage: '',
        failedAction: null,
        lastAction: action.lastAction,
        operationStatus: {
          ...state.operationStatus,
          [action.action]: 'idle',
        },
      };

    case 'fail':
      return {
        ...state,
        runtimeMode: 'error',
        runtimeSource: action.source ?? state.runtimeSource,
        warningMessage: '',
        errorMessage: action.errorMessage,
        failedAction: action.action,
        lastAction: action.lastAction,
        operationStatus: {
          ...state.operationStatus,
          [action.action]: 'idle',
        },
      };

    case 'setIdleContext':
      return {
        ...state,
        runtimeMode: 'idle',
        runtimeSource: action.source ?? 'manual',
        warningMessage: action.warningMessage ?? '',
        errorMessage: '',
        failedAction: null,
        lastAction: action.lastAction,
      };

    case 'clearStatus':
      return {
        ...state,
        warningMessage: '',
        errorMessage: '',
        failedAction: null,
      };

    default:
      return state;
  }
}

export function getModeMeta(mode: RuntimeMode) {
  switch (mode) {
    case 'live':
      return {
        label: 'Live',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        description: 'Results came from the live API path.',
      };
    case 'demo':
      return {
        label: 'Demo',
        className: 'border-amber-200 bg-amber-50 text-amber-800',
        description: 'Results came from local demo logic.',
      };
    case 'error':
      return {
        label: 'Error',
        className: 'border-rose-200 bg-rose-50 text-rose-800',
        description: 'The last live action failed and needs recovery.',
      };
    default:
      return {
        label: 'Ready',
        className: 'border-slate-200 bg-slate-50 text-slate-700',
        description: 'Draft is local until you run a live or demo action.',
      };
  }
}

export function isActionActive(state: TripFlowState, action: FlowActionName) {
  return state.operationStatus[action] === 'running' || state.operationStatus[action] === 'slow';
}

export function isActionSlow(state: TripFlowState, action: FlowActionName) {
  return state.operationStatus[action] === 'slow';
}
