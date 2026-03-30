import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CheckCircle2, Circle, Plus, Trash2, ListTodo } from 'lucide-react';

export function TodoList() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tasks'),
      where('teacherId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        text: newTask.trim(),
        completed: false,
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewTask('');
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = async (task: any) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">À faire</h3>
            <p className="text-xs font-medium text-zinc-500">
              {totalCount === 0 ? 'Aucune tâche' : `${completedCount} sur ${totalCount} terminée${completedCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        
        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-zinc-600 w-8">{progress}%</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <form onSubmit={handleAddTask} className="mb-5 flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Ajouter une nouvelle tâche..."
            className="flex-1 p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm text-sm"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newTask.trim() || isSubmitting}
            className="px-4 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              Votre liste de tâches est vide.
            </div>
          ) : (
            tasks.map((task) => (
              <div 
                key={task.id} 
                className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                  task.completed 
                    ? 'bg-zinc-50 border-zinc-100' 
                    : 'bg-white border-zinc-200 hover:border-primary-200 hover:shadow-sm'
                }`}
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => toggleTask(task)}
                >
                  <button className={`shrink-0 transition-colors ${task.completed ? 'text-primary-500' : 'text-zinc-300 group-hover:text-primary-400'}`}>
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <span className={`text-sm font-medium transition-all ${
                    task.completed ? 'text-zinc-400 line-through' : 'text-zinc-700'
                  }`}>
                    {task.text}
                  </span>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Supprimer la tâche"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
