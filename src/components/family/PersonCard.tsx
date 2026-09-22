import { Person } from '@/types/family';
import { cn } from '@/lib/utils';

interface PersonCardProps {
  person: Person;
  onClick?: (person: Person) => void;
}

export function PersonCard({ person, onClick }: PersonCardProps) {
  return (
    <button
      onClick={() => onClick?.(person)}
      className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="relative">
        <img 
          src={person.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`} 
          alt={person.name} 
          className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800"
        />
        <div className={cn(
          "absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900",
          person.state === 'home' ? 'bg-green-500' : (person.state === 'away' ? 'bg-zinc-400' : 'bg-zinc-300')
        )} />
      </div>
      <div className="text-center">
        <div className="font-bold text-lg">{person.name}</div>
        <div className="text-sm text-zinc-500 capitalize">{person.state}</div>
        {person.currentZone && (
          <div className="text-xs text-zinc-400 mt-1">{person.currentZone}</div>
        )}
      </div>
      {person.batteryLevel !== undefined && (
        <div className="text-[10px] text-zinc-400 mt-1">
          {person.batteryLevel}% {person.charging ? '⚡' : ''}
        </div>
      )}
    </button>
  );
}
