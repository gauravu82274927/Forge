'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { searchColleges } from '@/lib/colleges';

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

/** Text input with a suggestion list. Any typed value is allowed. */
export function CollegeCombobox({ id, value, onChange, placeholder, maxLength }: Props) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const options = React.useMemo(() => searchColleges(value), [value]);
  const listId = `${id ?? 'college'}-listbox`;

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md"
        >
          {options.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(name);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-md px-3 py-2 ${
                i === active ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
