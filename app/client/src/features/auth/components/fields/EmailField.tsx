'use client';

interface EmailFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function EmailField(props: EmailFieldProps): React.ReactNode {
  return (
    <div className="space-y-1">
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-gray-700"
      >
        メールアドレス
      </label>
      <input
        id={props.id}
        type="email"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete="email"
        inputMode="email"
        disabled={props.disabled}
        className="w-full px-3 py-3 border border-gray-300 rounded-lg
          text-sm focus:outline-none focus:ring-2 focus:ring-primary
          focus:border-transparent disabled:opacity-50"
      />
    </div>
  );
}
