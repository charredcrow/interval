import { create } from 'zustand'
import type { Todo } from '@/types'
import * as api from '@/api/dataLayer'

interface TodoState {
  todos: Todo[]
  _hydrated: boolean

  hydrate: () => Promise<void>

  addTodo: (title: string) => Promise<string>
  toggleTodo: (id: string) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  updateTodo: (id: string, title: string) => Promise<void>
  clearCompleted: () => Promise<void>
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  todos: [],
  _hydrated: false,

  hydrate: async () => {
    const todos = await api.getTodoState()
    set({ todos, _hydrated: true })
  },

  addTodo: async (title) => {
    const todo = await api.addTodo({ title, completed: false })
    set((state) => ({ todos: [todo, ...state.todos] }))
    return todo.id
  },

  toggleTodo: async (id) => {
    const list = get().todos
    const todo = list.find((t) => t.id === id)
    if (!todo) return
    const updated = await api.updateTodo(id, { completed: !todo.completed })
    if (!updated) return
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updated : t)),
    }))
  },

  deleteTodo: async (id) => {
    await api.deleteTodo(id)
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }))
  },

  updateTodo: async (id, title) => {
    const updated = await api.updateTodo(id, { title })
    if (!updated) return
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updated : t)),
    }))
  },

  clearCompleted: async () => {
    const list = get().todos
    const completed = list.filter((t) => t.completed)
    for (const t of completed) {
      await api.deleteTodo(t.id)
    }
    set((state) => ({ todos: state.todos.filter((t) => !t.completed) }))
  },
}))
