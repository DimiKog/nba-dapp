"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchablePlayerOption = {
  id: string;
  name: string;
  meta?: string;
  group?: string;
};

const PAGE_SIZE = 25;

export default function SearchablePlayerPicker({
  label,
  helper,
  placeholder = "Search players…",
  value,
  options,
  disabled = false,
  emptyLabel = "No players match",
  itemLabel = "players",
  onChange,
}: {
  label?: string;
  helper?: string;
  placeholder?: string;
  value: string;
  options: SearchablePlayerOption[];
  disabled?: boolean;
  emptyLabel?: string;
  itemLabel?: string;
  onChange: (id: string) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (!value) setQuery("");
  }

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => {
      const haystack = [option.name, option.meta, option.group]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  const visible = filtered.slice(0, visibleLimit);
  const remaining = filtered.length - visible.length;
  const activeOption = visible[highlightIndex] ?? null;
  const activeDescendant = activeOption
    ? `${listId}-option-${activeOption.id}`
    : undefined;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (selected) setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [selected]);

  useEffect(() => {
    if (!open || !activeDescendant) return;
    const option = document.getElementById(activeDescendant);
    option?.scrollIntoView({ block: "nearest" });
  }, [open, activeDescendant, highlightIndex]);

  function updateQuery(next: string) {
    setQuery(next);
    setVisibleLimit(PAGE_SIZE);
    setHighlightIndex(0);
    setOpen(true);
  }

  function selectOption(id: string) {
    onChange(id);
    setQuery("");
    setOpen(false);
    setHighlightIndex(0);
    inputRef.current?.focus();
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(false);
    setHighlightIndex(0);
    inputRef.current?.focus();
  }

  function moveHighlight(delta: number) {
    if (visible.length === 0) return;
    setOpen(true);
    setHighlightIndex((current) => {
      const next = current + delta;
      if (next < 0) return visible.length - 1;
      if (next >= visible.length) return 0;
      return next;
    });
  }

  const inputValue = open || query ? query : selected?.name ?? "";

  return (
    <div ref={rootRef} className="relative min-w-0">
      {(label || helper) && (
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {label && (
            <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </label>
          )}
          {helper && <span className="text-xs text-slate-400">{helper}</span>}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? activeDescendant : undefined}
            disabled={disabled}
            placeholder={selected ? selected.name : placeholder}
            value={inputValue}
            onChange={(event) => updateQuery(event.target.value)}
            onFocus={() => {
              if (!disabled) {
                setOpen(true);
                setHighlightIndex(0);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveHighlight(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveHighlight(-1);
              } else if (event.key === "Home" && open) {
                event.preventDefault();
                setHighlightIndex(0);
              } else if (event.key === "End" && open && visible.length > 0) {
                event.preventDefault();
                setHighlightIndex(visible.length - 1);
              } else if (event.key === "Enter" && open && activeOption) {
                event.preventDefault();
                selectOption(activeOption.id);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                setQuery("");
                inputRef.current?.blur();
              }
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/40 dark:disabled:bg-slate-900"
          />
        </div>
        {value && (
          <button
            type="button"
            disabled={disabled}
            onClick={clearSelection}
            className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-400 dark:hover:border-red-800 dark:hover:text-red-300"
          >
            Clear
          </button>
        )}
      </div>

      {open && !disabled && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900"
        >
          {visible.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">{emptyLabel}</p>
          ) : (
            <>
              <OptionList
                listId={listId}
                options={visible}
                value={value}
                highlightId={activeOption?.id ?? null}
                onSelect={selectOption}
                onHighlight={(id) => {
                  const index = visible.findIndex((option) => option.id === id);
                  if (index >= 0) setHighlightIndex(index);
                }}
              />
              {remaining > 0 && (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setVisibleLimit((current) => current + PAGE_SIZE);
                    inputRef.current?.focus();
                  }}
                  className="sticky bottom-0 w-full border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-300 dark:hover:bg-slate-800"
                >
                  Show {Math.min(PAGE_SIZE, remaining)} more · {remaining} remaining
                </button>
              )}
            </>
          )}
          <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-800">
            Showing {visible.length} of {filtered.length}
            {query.trim() ? " matches" : ` ${itemLabel}`}
          </p>
        </div>
      )}
    </div>
  );
}

function OptionList({
  listId,
  options,
  value,
  highlightId,
  onSelect,
  onHighlight,
}: {
  listId: string;
  options: SearchablePlayerOption[];
  value: string;
  highlightId: string | null;
  onSelect: (id: string) => void;
  onHighlight: (id: string) => void;
}) {
  const rows = useMemo(() => {
    const items: Array<
      | { kind: "group"; key: string; label: string }
      | { kind: "option"; key: string; option: SearchablePlayerOption }
    > = [];
    let lastGroup: string | undefined;
    for (const option of options) {
      if (option.group && option.group !== lastGroup) {
        items.push({ kind: "group", key: `group-${option.group}`, label: option.group });
        lastGroup = option.group;
      }
      items.push({ kind: "option", key: option.id, option });
    }
    return items;
  }, [options]);

  return (
    <ul className="py-1">
      {rows.map((row) => {
        if (row.kind === "group") {
          return (
            <li key={row.key} role="presentation">
              <p className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:bg-slate-950 dark:text-slate-500">
                {row.label}
              </p>
            </li>
          );
        }
        const { option } = row;
        const selected = option.id === value;
        const highlighted = option.id === highlightId;
        return (
          <li key={row.key} role="presentation">
            <button
              type="button"
              id={`${listId}-option-${option.id}`}
              role="option"
              tabIndex={-1}
              aria-selected={selected}
              onMouseEnter={() => onHighlight(option.id)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option.id)}
              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition ${
                highlighted
                  ? "bg-blue-50 dark:bg-blue-950/40"
                  : selected
                    ? "bg-slate-50 dark:bg-slate-800/80"
                    : "hover:bg-blue-50 dark:hover:bg-blue-950/30"
              }`}
            >
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {option.name}
              </span>
              {option.meta && (
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {option.meta}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
