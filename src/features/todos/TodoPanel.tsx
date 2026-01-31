import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Check, Trash2, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUIStore } from '@/store/uiStore'
import { useTodoStore } from '@/store/todoStore'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'

export function TodoPanel() {
  const { isTodoPanelOpen, closeTodoPanel } = useUIStore()
  const { todos, addTodo, toggleTodo, deleteTodo, clearCompleted } = useTodoStore()
  
  const [newTodoInput, setNewTodoInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when panel opens
  useEffect(() => {
    if (isTodoPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isTodoPanelOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTodoPanelOpen) {
        closeTodoPanel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTodoPanelOpen, closeTodoPanel])

  const handleAddTodo = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newTodoInput.trim()) return
      await addTodo(newTodoInput.trim())
      setNewTodoInput('')
      toast.success('Todo added')
    },
    [newTodoInput, addTodo]
  )

  const handleDeleteTodo = useCallback(
    async (id: string) => {
      await deleteTodo(id)
      toast.success('Todo deleted')
    },
    [deleteTodo]
  )

  const handleClearCompleted = useCallback(async () => {
    const completedCount = todos.filter((t) => t.completed).length
    if (completedCount === 0) {
      toast.error('No completed todos to clear')
      return
    }
    await clearCompleted()
    toast.success(`Cleared ${completedCount} completed todo${completedCount !== 1 ? 's' : ''}`)
  }, [todos, clearCompleted])

  const activeTodos = todos.filter((t) => !t.completed)
  const completedTodos = todos.filter((t) => t.completed)

  return (
    <AnimatePresence>
      {isTodoPanelOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={closeTodoPanel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border rounded-xl shadow-2xl overflow-hidden mx-4 flex flex-col max-h-full">
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Todo List</h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {activeTodos.length} active
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={closeTodoPanel}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Add todo form */}
              <form onSubmit={handleAddTodo} className="p-4 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={newTodoInput}
                    onChange={(e) => setNewTodoInput(e.target.value)}
                    placeholder="Add a new todo..."
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newTodoInput.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Todo list */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {todos.length === 0 ? (
                  <div className="p-8 text-center">
                    <ListTodo className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No todos yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Add your first todo above
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {/* Active todos */}
                    {activeTodos.length > 0 && (
                      <div className="space-y-1">
                        {activeTodos.map((todo) => (
                          <motion.div
                            key={todo.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <button
                              onClick={async () => await toggleTodo(todo.id)}
                              className={cn(
                                'h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                'border-border hover:border-foreground'
                              )}
                            >
                              {todo.completed && <Check className="h-3 w-3" />}
                            </button>
                            <span className="flex-1 text-sm">{todo.title}</span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Completed todos */}
                    {completedTodos.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                          <p className="text-xs text-muted-foreground font-medium">
                            Completed ({completedTodos.length})
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearCompleted}
                            className="h-6 text-xs text-muted-foreground hover:text-destructive"
                          >
                            Clear all
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {completedTodos.map((todo) => (
                            <motion.div
                              key={todo.id}
                              layout
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <button
                                onClick={async () => await toggleTodo(todo.id)}
                                className={cn(
                                  'h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                  'border-foreground bg-foreground text-background'
                                )}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <span className="flex-1 text-sm text-muted-foreground line-through">
                                {todo.title}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {todos.length > 0 && (
                <div className="p-3 border-t bg-muted/30 flex-shrink-0">
                  <p className="text-xs text-muted-foreground text-center">
                    {activeTodos.length} item{activeTodos.length !== 1 ? 's' : ''} left
                    {completedTodos.length > 0 && ` · ${completedTodos.length} completed`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
