'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { getExplain } from '@/lib/explain';

interface ExplainPanelProps {
  sql: string;
  analyze?: boolean;
  theme?: 'light' | 'dark';
  onClose?: () => void;
}

export const ExplainPanel: React.FC<ExplainPanelProps> = ({ sql, analyze = false, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [planText, setPlanText] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { text } = await getExplain(sql, analyze);
        if (!mounted) return;
        setPlanText(text);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to get EXPLAIN output');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [sql, analyze]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-md font-semibold">{analyze ? 'EXPLAIN ANALYZE' : 'EXPLAIN'} Plan</h4>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" onClick={onClose}>Hide</Button>
          )}
        </div>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            Generating {analyze ? 'profile' : 'plan'}…
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <pre className="text-xs overflow-auto whitespace-pre-wrap leading-relaxed">
{planText}
          </pre>
        )}
      </div>
    </div>
  );
};

export default ExplainPanel;
