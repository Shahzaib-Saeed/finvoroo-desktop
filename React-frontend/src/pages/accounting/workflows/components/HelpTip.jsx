import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function HelpTip({ children }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="inline-flex text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => e.preventDefault()}
      >
        <HelpCircle className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent variant="light" className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
