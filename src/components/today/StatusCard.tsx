import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function StatusCard({ title, children, className }: StatusCardProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800",
      className
    )}>
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}
