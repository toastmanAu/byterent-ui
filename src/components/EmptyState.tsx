// Empty-state primitive. Per ui-design skill §8: icon + heading + description
// + CTA. All four are required — no blank boxes.

import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-br-border bg-br-surface-1/50 py-16 px-8 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-br-surface-2 text-br-muted">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-br-fg">{title}</h3>
      <p className="mt-2 max-w-prose text-sm text-br-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
