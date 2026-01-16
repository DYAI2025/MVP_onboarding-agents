interface ErrorCardProps {
  title?: string;
  message: string;
  code?: string;
  requestId?: string;
  onRetry?: () => void;
  // New props for flexible actions
  actionLabel?: string;
  onAction?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export function ErrorCard({
  title = 'Ein Fehler ist aufgetreten',
  message,
  code,
  requestId,
  onRetry,
  actionLabel,
  onAction,
  severity = 'error'
}: ErrorCardProps) {
  // Color scheme based on severity
  const colorScheme = {
    error: {
      bg: 'bg-red-900/20',
      border: 'border-red-500/30',
      title: 'text-red-400',
      text: 'text-red-300/80',
      code: 'text-red-400/60',
      button: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300'
    },
    warning: {
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-500/30',
      title: 'text-yellow-400',
      text: 'text-yellow-300/80',
      code: 'text-yellow-400/60',
      button: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40 text-yellow-300'
    },
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-500/30',
      title: 'text-blue-400',
      text: 'text-blue-300/80',
      code: 'text-blue-400/60',
      button: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40 text-blue-300'
    }
  }[severity];

  return (
    <div className={`${colorScheme.bg} border ${colorScheme.border} rounded-2xl p-6 text-center`}>
      <h3 className={`font-serif text-xl ${colorScheme.title} mb-2`}>{title}</h3>
      <p className={`text-sm ${colorScheme.text} mb-4`}>{message}</p>

      {(code || requestId) && (
        <div className={`text-xs font-mono ${colorScheme.code} mb-4 space-y-1`}>
          {code && <div>Code: {code}</div>}
          {requestId && <div>Request-ID: {requestId}</div>}
        </div>
      )}

      <div className="flex gap-2 justify-center">
        {/* Custom action button (takes precedence) */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`px-4 py-2 ${colorScheme.button} border rounded-lg text-sm transition-colors`}
          >
            {actionLabel}
          </button>
        )}

        {/* Retry button (fallback if no custom action) */}
        {!actionLabel && onRetry && (
          <button
            onClick={onRetry}
            className={`px-4 py-2 ${colorScheme.button} border rounded-lg text-sm transition-colors`}
          >
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
}
