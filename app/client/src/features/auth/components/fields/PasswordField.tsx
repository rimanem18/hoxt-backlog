'use client';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
}

export function PasswordField(props: PasswordFieldProps): React.ReactNode {
  return (
    <div className="space-y-1">
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-gray-700"
      >
        {props.label}
      </label>
      <input
        id={props.id}
        type="password"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        className="w-full px-3 py-3 border border-gray-300 rounded-lg
          text-sm focus:outline-none focus:ring-2 focus:ring-primary
          focus:border-transparent disabled:opacity-50"
      />
    </div>
  );
}
