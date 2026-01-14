interface ErrorCardProps {
  title?: string;
  message: string;
  code?: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorCard({
  title = 'Ein Fehler ist aufgetreten',
  message,
  code,
  requestId,
  onRetry
}: ErrorCardProps) {
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center">
      <h3 className="font-serif text-xl text-red-400 mb-2">{title}</h3>
      <p className="text-sm text-red-300/80 mb-4">{message}</p>

      {(code || requestId) && (
        <div className="text-xs font-mono text-red-400/60 mb-4 space-y-1">
          {code && <div>Code: {code}</div>}
          {requestId && <div>Request-ID: {requestId}</div>}
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-sm transition-colors"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
