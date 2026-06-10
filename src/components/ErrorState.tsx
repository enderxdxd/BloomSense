interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 sm:p-8"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-600">
        Something went wrong
      </p>
      <p className="mt-2 text-sm leading-relaxed text-red-900">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}
