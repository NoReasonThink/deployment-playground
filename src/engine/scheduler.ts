import type { SchedulerState } from '../types'

export function nextSchedulerTick(state: SchedulerState): SchedulerState {
  if (!state.running) {
    return state
  }
  return {
    ...state,
    tick: state.tick + 1,
  }
}

export function toggleScheduler(state: SchedulerState): SchedulerState {
  return {
    ...state,
    running: !state.running,
  }
}

export function changeSchedulerSpeed(state: SchedulerState, speed: SchedulerState['speed']): SchedulerState {
  return {
    ...state,
    speed,
  }
}

export function resetScheduler(speed: SchedulerState['speed'] = 1): SchedulerState {
  return {
    tick: 0,
    speed,
    running: false,
  }
}
