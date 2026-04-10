import type { RouteLocationRaw } from 'vue-router'
import {
  hasRouteHistoryEntry,
  ROUTE_TRANSITION_DIRECTION_STATE_KEY,
  type RouteTransitionDirection
} from '~/utils/route-transition'

export function useRouteBackNavigation() {
  const router = useRouter()
  const nextDirection = useState<RouteTransitionDirection | null>(
    ROUTE_TRANSITION_DIRECTION_STATE_KEY,
    () => null
  )

  async function navigateBack(fallback: RouteLocationRaw) {
    nextDirection.value = 'back'

    if (import.meta.client && hasRouteHistoryEntry()) {
      router.back()
      return
    }

    await navigateTo(fallback)
  }

  return {
    navigateBack
  }
}
