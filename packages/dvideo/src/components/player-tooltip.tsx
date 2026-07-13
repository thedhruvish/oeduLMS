import React from "react";

interface Props {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
}

export function PlayerTooltip({ children, content, shortcut }: Props) {
  return (
    <div className="relative group/tooltip flex items-center justify-center">
      {children}
      <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:flex flex-col items-center z-50 pointer-events-none">
        <div className="bg-zinc-950/95 backdrop-blur-md border border-white/10 text-white rounded-lg shadow-xl text-[10px] px-2 py-1 flex items-center gap-1.5 whitespace-nowrap">
          <span>{content}</span>
          {shortcut && (
            <kbd className="bg-white/20 px-1 py-0.2 rounded font-mono text-[9px] text-white/80">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
