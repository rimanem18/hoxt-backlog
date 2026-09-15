interface AsyncStateMessageProps {
  variant: 'info' | 'error';
  message: string;
}

const VARIANT_STYLES: Record<AsyncStateMessageProps['variant'], string> = {
  info: 'text-sm text-gray-500',
  error: 'text-sm text-red-700',
};

const VARIANT_ARIA_LIVE: Record<
  AsyncStateMessageProps['variant'],
  'polite' | 'assertive'
> = {
  info: 'polite',
  error: 'assertive',
};

export function AsyncStateMessage(
  props: AsyncStateMessageProps,
): React.ReactNode {
  return (
    <div aria-live={VARIANT_ARIA_LIVE[props.variant]}>
      <span className={VARIANT_STYLES[props.variant]}>{props.message}</span>
    </div>
  );
}
