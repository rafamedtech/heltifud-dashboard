import { gsap } from 'gsap'
import { nextTick } from 'vue'
import {
  getRouteHistoryPosition,
  ROUTE_TRANSITION_DIRECTION_STATE_KEY,
  ROUTE_TRANSITION_HISTORY_POSITION_STATE_KEY,
  type RouteTransitionDirection
} from '~/utils/route-transition'

const TRANSITION_ROOT_SELECTOR = '[data-route-transition-root]'
const ROUTE_TRANSITION_CLEANUP_KEY = '__heltifudRouteTransitionCleanup__'

type WindowWithRouteTransitionCleanup = Window & {
  [ROUTE_TRANSITION_CLEANUP_KEY]?: () => void
}

function getTransitionTarget() {
  const root = document.querySelector(TRANSITION_ROOT_SELECTOR)

  if (!(root instanceof HTMLElement)) {
    return null
  }

  return root.firstElementChild instanceof HTMLElement ? root.firstElementChild : root
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateRouteOut(direction: RouteTransitionDirection) {
  const target = getTransitionTarget()

  if (!target || prefersReducedMotion()) {
    return Promise.resolve()
  }

  gsap.killTweensOf(target)

  return new Promise<void>((resolve) => {
    gsap.to(target, {
      x: direction === 'back' ? -18 : 18,
      opacity: 0,
      filter: 'blur(1px)',
      duration: 0.22,
      ease: 'power2.in',
      onComplete: resolve
    })
  })
}

function animateRouteIn(direction: RouteTransitionDirection) {
  const target = getTransitionTarget()

  if (!target || prefersReducedMotion()) {
    return Promise.resolve()
  }

  gsap.killTweensOf(target)
  gsap.set(target, {
    x: direction === 'back' ? 36 : -36,
    opacity: 0,
    filter: 'blur(1px)',
    willChange: 'transform, opacity, filter'
  })

  return new Promise<void>((resolve) => {
    gsap.to(target, {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.42,
      ease: 'power3.out',
      clearProps: 'transform,opacity,filter,willChange',
      onComplete: resolve
    })
  })
}

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const clientWindow = window as WindowWithRouteTransitionCleanup
  let hasCompletedInitialNavigation = false

  clientWindow[ROUTE_TRANSITION_CLEANUP_KEY]?.()

  const historyPosition = useState<number>(
    ROUTE_TRANSITION_HISTORY_POSITION_STATE_KEY,
    () => getRouteHistoryPosition()
  )
  const nextDirection = useState<RouteTransitionDirection | null>(
    ROUTE_TRANSITION_DIRECTION_STATE_KEY,
    () => null
  )
  const activeDirection = useState<RouteTransitionDirection>(
    'route-transition-active-direction',
    () => 'forward'
  )

  const syncHistoryPosition = () => {
    historyPosition.value = getRouteHistoryPosition()
  }

  const handlePopState = () => {
    const currentPosition = getRouteHistoryPosition()
    nextDirection.value = currentPosition < historyPosition.value ? 'back' : 'forward'
  }

  syncHistoryPosition()

  window.addEventListener('popstate', handlePopState)

  const removeBeforeEach = router.beforeEach(async () => {
    if (!hasCompletedInitialNavigation) {
      return
    }

    const currentPosition = getRouteHistoryPosition()
    const direction = nextDirection.value
      ?? (currentPosition < historyPosition.value ? 'back' : 'forward')

    activeDirection.value = direction
    await animateRouteOut(direction)
  })

  const removeAfterEach = router.afterEach(async () => {
    syncHistoryPosition()

    if (!hasCompletedInitialNavigation) {
      hasCompletedInitialNavigation = true
      nextDirection.value = null
      return
    }

    await nextTick()
    await animateRouteIn(activeDirection.value)
    nextDirection.value = null
  })

  const cleanup = () => {
    window.removeEventListener('popstate', handlePopState)
    removeBeforeEach()
    removeAfterEach()

    if (clientWindow[ROUTE_TRANSITION_CLEANUP_KEY] === cleanup) {
      clientWindow[ROUTE_TRANSITION_CLEANUP_KEY] = undefined
    }
  }

  clientWindow[ROUTE_TRANSITION_CLEANUP_KEY] = cleanup

  if (import.meta.hot) {
    import.meta.hot.dispose(cleanup)
  }
})
