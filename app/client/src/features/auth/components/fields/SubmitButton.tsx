'use client';

interface SubmitButtonProps {
  isLoading: boolean;
  loadingLabel: string;
  label: string;
}

export function SubmitButton(props: SubmitButtonProps): React.ReactNode {
  return (
    <button
      type="submit"
      disabled={props.isLoading}
      className="w-full py-3 px-4 bg-primary text-white text-sm
        font-medium rounded-lg hover:opacity-90 active:opacity-80
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-opacity"
    >
      {props.isLoading ? props.loadingLabel : props.label}
    </button>
  );
}
