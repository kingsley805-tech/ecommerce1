import { Check } from 'lucide-react';
import { cn, colorToHex } from '@/lib/utils';

interface ColorSwatchesProps {
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
  size?: number;
}

export function ColorSwatches({ options, selected, onSelect, disabled, size = 28 }: ColorSwatchesProps) {
  return (
    <div className="flex items-center gap-2">
      {options.map((opt) => {
        const active = selected === opt;
        const hex = colorToHex(opt);
        const isLight = ['#ffffff', '#f5f5dc', '#fdf3e3', '#e6e6fa', '#f0f0f0'].includes(hex.toLowerCase());
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            aria-label={`Color: ${opt}`}
            aria-pressed={active}
            title={opt}
            className={cn(
              'rounded-full border transition-all',
              active ? 'ring-2 ring-primary ring-offset-2' : 'ring-0 hover:scale-110',
              isLight && 'border-border',
              disabled && 'cursor-not-allowed opacity-40',
            )}
            style={{ width: size, height: size, backgroundColor: hex, borderColor: isLight ? undefined : 'rgba(0,0,0,0.15)' }}
          >
            {active && (
              <span className="flex h-full w-full items-center justify-center">
                <Check className={cn('h-3.5 w-3.5', isLight ? 'text-foreground' : 'text-white')} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
