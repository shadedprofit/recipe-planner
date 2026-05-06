/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useWebDropZone } from '../src/hooks/useWebDropZone';

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

function createDropEvent(files: File[]): Event {
  const event = new Event('drop', { bubbles: false });
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  return event;
}

function createDragLeaveEvent(relatedTarget: EventTarget | null): Event {
  const event = new Event('dragleave');
  Object.defineProperty(event, 'relatedTarget', { value: relatedTarget });
  return event;
}

beforeEach(() => {
  jest.clearAllMocks();
  global.URL.createObjectURL = jest.fn(() => 'blob:test-uri');
  global.URL.revokeObjectURL = jest.fn();
  setPlatform('web');
});

describe('useWebDropZone', () => {
  it('returns isDragging false and attaches no listeners on native platforms', () => {
    setPlatform('ios');
    const el = document.createElement('div');
    const spy = jest.spyOn(el, 'addEventListener');
    const { result } = renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri: jest.fn(), imageCount: 0 }),
    );
    expect(result.current.isDragging).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sets isDragging true on dragenter', () => {
    const el = document.createElement('div');
    const { result } = renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri: jest.fn(), imageCount: 0 }),
    );
    act(() => { el.dispatchEvent(new Event('dragenter')); });
    expect(result.current.isDragging).toBe(true);
  });

  it('sets isDragging false when dragleave exits the container boundary', () => {
    const el = document.createElement('div');
    const { result } = renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri: jest.fn(), imageCount: 0 }),
    );
    act(() => { el.dispatchEvent(new Event('dragenter')); });
    act(() => { el.dispatchEvent(createDragLeaveEvent(null)); });
    expect(result.current.isDragging).toBe(false);
  });

  it('keeps isDragging true when dragleave target is a child element', () => {
    const el = document.createElement('div');
    const child = document.createElement('div');
    el.appendChild(child);
    const { result } = renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri: jest.fn(), imageCount: 0 }),
    );
    act(() => { el.dispatchEvent(new Event('dragenter')); });
    act(() => { el.dispatchEvent(createDragLeaveEvent(child)); });
    expect(result.current.isDragging).toBe(true);
  });

  it('calls addImageFromUri for each dropped image file and revokes object URLs', async () => {
    const el = document.createElement('div');
    const addImageFromUri = jest.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri, imageCount: 0 }),
    );
    const files = [
      new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
      new File([''], 'photo2.png', { type: 'image/png' }),
    ];
    await act(async () => { el.dispatchEvent(createDropEvent(files)); });
    expect(addImageFromUri).toHaveBeenCalledTimes(2);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-uri');
  });

  it('ignores non-image files silently', async () => {
    const el = document.createElement('div');
    const addImageFromUri = jest.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri, imageCount: 0 }),
    );
    const files = [
      new File([''], 'doc.pdf', { type: 'application/pdf' }),
      new File([''], 'photo.jpg', { type: 'image/jpeg' }),
    ];
    await act(async () => { el.dispatchEvent(createDropEvent(files)); });
    expect(addImageFromUri).toHaveBeenCalledTimes(1);
  });

  it('stops accepting files once imageCount + added reaches MAX_IMAGES', async () => {
    const el = document.createElement('div');
    const addImageFromUri = jest.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri, imageCount: 9 }),
    );
    const files = [
      new File([''], 'a.jpg', { type: 'image/jpeg' }),
      new File([''], 'b.jpg', { type: 'image/jpeg' }),
    ];
    await act(async () => { el.dispatchEvent(createDropEvent(files)); });
    expect(addImageFromUri).toHaveBeenCalledTimes(1);
  });

  it('sets isDragging false after drop regardless of files', async () => {
    const el = document.createElement('div');
    const { result } = renderHook(() =>
      useWebDropZone({
        containerRef: { current: el },
        addImageFromUri: jest.fn().mockResolvedValue(undefined),
        imageCount: 0,
      }),
    );
    act(() => { el.dispatchEvent(new Event('dragenter')); });
    expect(result.current.isDragging).toBe(true);
    await act(async () => { el.dispatchEvent(createDropEvent([])); });
    expect(result.current.isDragging).toBe(false);
  });

  it('removes event listeners on unmount', () => {
    const el = document.createElement('div');
    const spy = jest.spyOn(el, 'removeEventListener');
    const { unmount } = renderHook(() =>
      useWebDropZone({ containerRef: { current: el }, addImageFromUri: jest.fn(), imageCount: 0 }),
    );
    unmount();
    expect(spy).toHaveBeenCalledWith('dragenter', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('dragover', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('dragleave', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('drop', expect.any(Function));
  });
});
