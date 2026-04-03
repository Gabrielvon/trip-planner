'use client';

import { getSourceLabel } from '@/lib/trip/parse-client';
import type { TripFlowState } from '@/lib/trip/trip-flow-state';

type ModeMeta = {
  label: string;
  className: string;
  description: string;
};

type TripRuntimeStatusProps = {
  flowState: TripFlowState;
  modeMeta: ModeMeta;
  currentTimezone: string;
  onRecoveryAction: () => void;
};

export default function TripRuntimeStatus({
  flowState,
  modeMeta,
  currentTimezone,
  onRecoveryAction,
}: TripRuntimeStatusProps) {
  return (
    <>
      <div className={`rounded-2xl border px-4 py-3 text-sm ${modeMeta.className}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">Mode: {modeMeta.label}</span>
          <span>Source: {getSourceLabel(flowState.runtimeSource)}</span>
          <span>Timezone: {currentTimezone}</span>
        </div>
        <div className="mt-1 text-xs opacity-90">{modeMeta.description}</div>
        {flowState.lastAction ? (
          <div className="mt-2 text-xs opacity-90">Last action: {flowState.lastAction}</div>
        ) : null}
      </div>

      {flowState.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-medium">Live action failed</div>
          <div className="mt-1">{flowState.errorMessage}</div>
          {flowState.failedAction ? (
            <button
              className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-white"
              onClick={onRecoveryAction}
            >
              Switch to demo for {flowState.failedAction}
            </button>
          ) : null}
        </div>
      ) : null}

      {flowState.warningMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-medium">Note</div>
          <div className="mt-1">{flowState.warningMessage}</div>
        </div>
      ) : null}
    </>
  );
}
