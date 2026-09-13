import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationToggle } from '../components/NotificationToggle';

describe('NotificationToggle', () => {
  afterEach(() => {
    cleanup();
    mock.restore();
    mock.clearAllMocks();
  });

  test('通知ONの状態が表示される', () => {
    // Given: checked=trueのトグル
    render(
      <NotificationToggle
        checked={true}
        onChange={mock(() => {})}
        label="project A の通知"
      />,
    );

    // When & Then: switchロールがON状態で表示される
    const toggle = screen.getByRole('switch', { name: 'project A の通知' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('通知OFFの状態が表示される', () => {
    // Given: checked=falseのトグル
    render(
      <NotificationToggle
        checked={false}
        onChange={mock(() => {})}
        label="project A の通知"
      />,
    );

    // When & Then: switchロールがOFF状態で表示される
    const toggle = screen.getByRole('switch', { name: 'project A の通知' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('クリックすると現在の状態を反転してonChangeが呼ばれる', async () => {
    // Given: checked=trueのトグル
    const user = userEvent.setup();
    const onChange = mock(() => {});
    render(
      <NotificationToggle
        checked={true}
        onChange={onChange}
        label="project A の通知"
      />,
    );

    // When: トグルをクリック
    await user.click(screen.getByRole('switch', { name: 'project A の通知' }));

    // Then: 反転した値（false）でonChangeが呼ばれる
    expect(onChange).toHaveBeenCalledWith(false);
  });

  test('無効化状態の場合はクリックしてもonChangeが呼ばれない', async () => {
    // Given: disabled=trueのトグル
    const user = userEvent.setup();
    const onChange = mock(() => {});
    render(
      <NotificationToggle
        checked={true}
        onChange={onChange}
        disabled={true}
        label="project A の通知"
      />,
    );

    // When: トグルをクリック
    await user.click(screen.getByRole('switch', { name: 'project A の通知' }));

    // Then: onChangeは呼ばれない
    expect(onChange).not.toHaveBeenCalled();
  });
});
