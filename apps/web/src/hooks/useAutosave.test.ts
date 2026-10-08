import { renderHook, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not save initially if value has not changed', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAutosave({ value: 'initial', onSave, delay: 1000 })
    );

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('should call onSave after the delay when value changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 1000 }),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Not called yet
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Now it should be called
    expect(onSave).toHaveBeenCalledWith('changed');
  });

  it('should debounce multiple rapid changes', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 1000 }),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'change 1' });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    rerender({ value: 'change 2' });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('change 2');
  });

  it('should flush immediately when flush is called', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave({ value, onSave, delay: 1000 }),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    act(() => {
      result.current.flush();
    });

    expect(onSave).toHaveBeenCalledWith('changed');
  });
});
