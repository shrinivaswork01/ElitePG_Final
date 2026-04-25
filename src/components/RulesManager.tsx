import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Plus, X, Edit3, Trash2, ScrollText, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils';

interface RulesManagerProps {
  rules: string[];
  onUpdate: (newRules: string[]) => void;
  isAdmin?: boolean;
}

export const RulesManager: React.FC<RulesManagerProps> = ({ rules, onUpdate, isAdmin }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newRule, setNewRule] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleAdd = () => {
    if (newRule.trim()) {
      onUpdate([...rules, newRule.trim()]);
      setNewRule("");
      setIsEditing(false);
    }
  };

  const handleRemove = (index: number) => {
    onUpdate(rules.filter((_, i) => i !== index));
  };

  const handleEditInit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(rules[index]);
  };

  const handleSaveEdit = () => {
    if (editingValue.trim() && editingIndex !== null) {
      const updated = [...rules];
      updated[editingIndex] = editingValue.trim();
      onUpdate(updated);
      setEditingIndex(null);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">PG Rules</h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mt-0.5">{rules.length} Total Guidelines</p>
          </div>
        </div>
        
        {isAdmin && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all hover:translate-y-[-1px]"
            style={{ background: 'var(--brand-primary, #4f46e5)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rule
          </button>
        )}
      </div>

      <div className="p-6 sm:p-8">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {rules.map((rule, i) => (
              <motion.div
                key={`${rule}-${i}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "group relative flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 transition-all",
                  editingIndex === i ? "ring-2 ring-indigo-500/20 border-indigo-500 shadow-xl" : "hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 hover:border-indigo-100 dark:hover:border-indigo-500/20"
                )}
              >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  {editingIndex === i ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingValue}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingIndex(null);
                      }}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="flex-1 bg-transparent border-none text-sm font-bold text-indigo-600 dark:text-indigo-400 p-0 focus:ring-0"
                    />
                  ) : (
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed truncate">
                      {rule}
                    </span>
                  )}
                </div>
                
                {isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={() => handleEditInit(i)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemove(i)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isEditing ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex items-center justify-between gap-4 p-2 bg-indigo-600/5 dark:bg-indigo-500/10 rounded-2xl border-2 border-indigo-500/30 shadow-indigo-500/10 shadow-2xl transition-all"
            >
              <div className="flex-1 flex items-center gap-3 pl-3">
                <Plus className="w-5 h-5 text-indigo-500 animate-pulse" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Ex: Gate closes at 11PM..."
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                  className="flex-1 bg-transparent border-none text-sm font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 p-0 focus:ring-0 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleAdd}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Confirm
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2.5 text-gray-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ) : isAdmin && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-2.5 py-5 bg-white dark:bg-white/[0.03] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Add New PG Rule</span>
            </motion.button>
          )}

          {!isEditing && rules.length === 0 && (
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 py-4 italic">No specific rules set for this PG.</p>
          )}
        </div>
      </div>
    </div>
  );
};
