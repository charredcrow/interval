/**
 * API layer: single entry point for all data operations.
 * Use these functions when you add a backend; replace implementations in dataLayer.ts with fetch().
 */
export {
  getTimelineState,
  getEventsInRange,
  addEvent,
  updateEvent,
  deleteEvent,
  moveEvent,
  restoreEvent,
  markReminderSent,
  getRecurringEvents,
  addRecurringEvent,
  updateRecurringEvent,
  deleteRecurringEvent,
  getTags,
  addTag,
  updateTag,
  deleteTag,
  getTodoState,
  addTodo,
  updateTodo,
  deleteTodo,
} from './dataLayer'
export type { TimelineState } from './dataLayer'
