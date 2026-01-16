import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Todo } from '@/types'

/**
 * Generate a unique ID for todos
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface TodoState {
  // List of todos
  todos: Todo[]
  
  // Actions
  addTodo: (title: string) => string
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  updateTodo: (id: string, title: string) => void
  clearCompleted: () => void
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      todos: [],

      addTodo: (title) => {
        const id = generateId()
        const newTodo: Todo = {
          id,
          title,
          completed: false,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          todos: [newTodo, ...state.todos],
        }))

        return id
      },

      toggleTodo: (id) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
          ),
        }))
      },

      deleteTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        }))
      },

      updateTodo: (id, title) => {
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, title } : todo
          ),
        }))
      },

      clearCompleted: () => {
        set((state) => ({
          todos: state.todos.filter((todo) => !todo.completed),
        }))
      },
    }),
    {
      name: 'interval-todo-storage',
    }
  )
)
