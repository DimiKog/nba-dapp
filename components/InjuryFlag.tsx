export default function InjuryFlag({ showLabel = false }: { showLabel?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 font-bold text-red-500"
      aria-label="Injury alert"
      title="Injury alert"
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M3 1.5v13" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M4 2.5h8l-2 2.75L12 8H4z" fill="currentColor" />
      </svg>
      {showLabel && <span>Injury</span>}
    </span>
  );
}
