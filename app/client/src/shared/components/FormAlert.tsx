interface FormAlertProps {
  variant: 'error' | 'success';
  message: string;
  className?: string;
}

const VARIANT_STYLES: Record<FormAlertProps['variant'], string> = {
  error: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
};

export function FormAlert(props: FormAlertProps): React.ReactNode {
  return (
    <div
      className={`p-3 rounded-lg ${VARIANT_STYLES[props.variant]} ${
        props.className ?? ''
      }`}
      role={props.variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="text-sm">{props.message}</span>
    </div>
  );
}
