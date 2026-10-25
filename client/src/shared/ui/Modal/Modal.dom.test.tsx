import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal } from './index';

afterEach(() => vi.useRealTimers());

describe('Modal lifecycle', () => {
  it('opens natively, reports Escape and keeps the exit animation before closing', () => {
    const close = vi.fn();
    const { rerender } = render(
      <Modal open title="Confirm" onClose={close}>
        <span>Summary</span>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(close).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute('open');
    rerender(
      <Modal open={false} title="Confirm" onClose={close}>
        <span>Summary</span>
      </Modal>,
    );
    expect(dialog).toHaveAttribute('data-closing');
    fireEvent.animationEnd(screen.getByText('Summary'));
    expect(dialog).toHaveAttribute('open');
    fireEvent.animationEnd(dialog);
    expect(dialog).not.toHaveAttribute('open');
  });
  it('falls back after 400ms and cancels a stale close when reopened', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Modal open title="Confirm" onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    rerender(<Modal open={false} title="Confirm" onClose={vi.fn()} />);
    void act(() => vi.advanceTimersByTime(399));
    expect(dialog).toHaveAttribute('open');
    rerender(<Modal open title="Confirm" onClose={vi.fn()} />);
    void act(() => vi.advanceTimersByTime(1));
    expect(dialog).toHaveAttribute('open');
    expect(dialog).not.toHaveAttribute('data-closing');
    rerender(<Modal open={false} title="Confirm" onClose={vi.fn()} />);
    void act(() => vi.advanceTimersByTime(400));
    expect(dialog).not.toHaveAttribute('open');
  });
  it('only treats a press and release on the backdrop as dismissal', () => {
    const close = vi.fn();
    render(
      <Modal open title="Confirm" onClose={close}>
        <span>Summary</span>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(screen.getByText('Summary'));
    fireEvent.click(dialog);
    expect(close).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(close).toHaveBeenCalledOnce();
  });
});
