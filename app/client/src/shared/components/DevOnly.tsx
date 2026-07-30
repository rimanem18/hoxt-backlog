import type { ReactNode } from 'react';

interface DevOnlyProps {
  children: ReactNode;
}

export function DevOnly(props: DevOnlyProps): React.ReactNode {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  return props.children;
}
