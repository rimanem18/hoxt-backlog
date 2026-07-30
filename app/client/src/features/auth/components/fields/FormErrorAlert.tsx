'use client';

interface FormErrorAlertProps {
  message: string | null | undefined;
}

export function FormErrorAlert(props: FormErrorAlertProps): React.ReactNode {
  if (!props.message) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="px-3 py-2.5 bg-red-50 border border-red-200
        rounded-lg text-sm text-red-700"
    >
      {props.message}
    </div>
  );
}
