import { useState, useMemo } from 'react';
import { Search, ChevronRight, PenSquare } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import type { Conversation, Participant } from '../types/messages.types';

interface Props {
  conversations: Conversation[];
  contacts:      Participant[];
  activeId:      number | null;
  isLoading:     boolean;
  onSelect:      (conv: Conversation) => void;
  onNewChat:     () => void;
}

/* Group conversations by the other participant's branch */
const groupByBranch = (convs: Conversation[]) => {
  return convs.reduce<Record<string, Conversation[]>>((acc, c) => {
    const branch = (c.other_participant as any)?.clinic_branch_name || 'Main Branch';
    if (!acc[branch]) acc[branch] = [];
    acc[branch].push(c);
    return acc;
  }, {});
};

export const ConversationList = ({
  conversations,
  contacts,
  activeId,
  isLoading,
  onSelect,
  onNewChat,
}: Props) => {
  const [search,           setSearch]           = useState('');
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(new Set());

  const filtered = useMemo(() =>
    conversations.filter(c =>
      c.other_participant?.full_name.toLowerCase().includes(search.toLowerCase())
    ),
    [conversations, search]
  );

  const grouped = useMemo(() => groupByBranch(filtered), [filtered]);
  const branches = Object.keys(grouped).sort((a, b) =>
    a === 'Main Branch' ? -1 : b === 'Main Branch' ? 1 : a.localeCompare(b)
  );

  const toggleBranch = (branch: string) => {
    setCollapsedBranches(prev => {
      const next = new Set(prev);
      next.has(branch) ? next.delete(branch) : next.add(branch);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Conversations</span>
        <button
          onClick={onNewChat}
          title="New Message"
          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500"
        >
          <PenSquare className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 transition-all"
          />
        </div>
      </div>

      {/* Branch-grouped conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
            <p className="text-sm">No conversations yet</p>
            <button
              onClick={onNewChat}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Start a new message →
            </button>
          </div>
        ) : (
          branches.map(branch => (
            <div key={branch}>
              {/* Branch header */}
              <button
                onClick={() => toggleBranch(branch)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {branch}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({grouped[branch].length})
                  </span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                    collapsedBranches.has(branch) ? '' : 'rotate-90'
                  }`}
                />
              </button>

              {/* Conversation rows */}
              {!collapsedBranches.has(branch) && (
                <div className="px-2 pb-1 space-y-0.5">
                  {grouped[branch].map(conv => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeId}
                      onClick={() => onSelect(conv)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* "See all branches" link if > 2 branches */}
        {branches.length > 2 && (
          <div className="py-2 text-center">
            <span className="text-xs text-gray-400 hover:text-blue-500 cursor-pointer transition-colors">
              See all branches...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};