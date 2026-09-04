'use client';

import type React from 'react';

interface NotificationToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

/**
 * project単位の通知ON/OFFを切り替えるトグルスイッチ
 *
 * @example
 * ```tsx
 * <NotificationToggle
 *   checked={project.notificationEnabled}
 *   onChange={(enabled) => mutate({ projectId, enabled })}
 *   label={`${project.projectName} の通知`}
 * />
 * ```
 */
export function NotificationToggle(
  props: NotificationToggleProps,
): React.ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled ?? false}
      onClick={() => props.onChange(!props.checked)}
      className={`relative inline-flex h-[24px] w-[44px] min-h-[44px] min-w-[44px] items-center justify-center disabled:opacity-50 transition-colors`}
    >
      <span
        className={`inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors ${
          props.checked ? 'bg-primary' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform ${
            props.checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </button>
  );
}
