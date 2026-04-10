export type RouteTransitionDirection = 'forward' | 'back'
export const ROUTE_TRANSITION_DIRECTION_STATE_KEY = 'route-transition-next-direction'
export const ROUTE_TRANSITION_HISTORY_POSITION_STATE_KEY = 'route-transition-history-position'

export function getRouteHistoryPosition() {
  if (import.meta.server) {
    return 0
  }

  return typeof window.history.state?.position === 'number'
    ? window.history.state.position
    : 0
}

export function hasRouteHistoryEntry() {
  return getRouteHistoryPosition() > 1
}
