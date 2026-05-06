import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { WebCameraCapture, captureVideoFrame } from '../src/components/WebCameraCapture';

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

const originalMediaDevicesDescriptor = Object.getOwnPropertyDescriptor(
  globalThis.navigator,
  'mediaDevices',
);

function setMediaDevices(mediaDevices?: MediaDevices) {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices,
  });
}

describe('WebCameraCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('web');
  });

  afterAll(() => {
    if (originalMediaDevicesDescriptor) {
      Object.defineProperty(globalThis.navigator, 'mediaDevices', originalMediaDevicesDescriptor);
      return;
    }

    Reflect.deleteProperty(globalThis.navigator, 'mediaDevices');
  });

  it('does not render on native platforms', () => {
    setPlatform('ios');

    const { toJSON } = render(
      <WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('shows an unsupported-browser message when getUserMedia is unavailable', async () => {
    setMediaDevices(undefined);

    render(<WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />);

    expect(
      await screen.findByText('This browser does not support direct camera capture.'),
    ).toBeTruthy();
  });

  it('starts the browser camera and stops the stream on unmount', async () => {
    const stop = jest.fn();
    const getUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    });
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    const { unmount } = render(
      <WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />,
    );

    await waitFor(() =>
      expect(getUserMedia).toHaveBeenCalledWith({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      }),
    );

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('stops the stream when the component unmounts before camera startup resolves', async () => {
    const stop = jest.fn();
    let resolveStream: (stream: { getTracks: () => { stop: jest.Mock }[] }) => void = () => {};
    const getUserMedia = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveStream = resolve;
        }),
    );
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    const { unmount } = render(
      <WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />,
    );
    unmount();
    resolveStream({ getTracks: () => [{ stop }] });

    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  it('shows a browser permission error when camera startup rejects', async () => {
    const getUserMedia = jest.fn().mockRejectedValue(new Error('denied'));
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    render(<WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />);

    expect(
      await screen.findByText(
        'Could not open the camera. Check browser camera permissions and try again.',
      ),
    ).toBeTruthy();
  });

  it('does not show a stale startup error after closing before camera rejection', async () => {
    let rejectCamera: (error: Error) => void = () => {};
    const getUserMedia = jest.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectCamera = reject;
        }),
    );
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    const { unmount } = render(
      <WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />,
    );
    unmount();
    rejectCamera(new Error('denied'));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  });

  it('reports when capture is pressed before video dimensions are ready', async () => {
    const getUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [],
    });
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);

    render(<WebCameraCapture visible onCapture={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => expect(screen.getByText('Capture').props.accessibilityState).toBeFalsy());

    fireEvent.press(screen.getByText('Capture'));

    expect(await screen.findByText('Camera is not ready yet.')).toBeTruthy();
  });

  it('captures a resized JPEG frame from a ready video element', () => {
    const drawImage = jest.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ({ drawImage })),
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,captured'),
    };
    const documentRef = {
      createElement: jest.fn(() => canvas),
    };
    const video = { videoWidth: 2048, videoHeight: 1024 };

    const result = captureVideoFrame(video as HTMLVideoElement, documentRef as unknown as Document);

    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(512);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1024, 512);
    expect(result).toEqual({
      ok: true,
      image: { uri: 'data:image/jpeg;base64,captured', base64: 'captured' },
    });
  });

  it('returns capture errors when canvas output is unavailable', () => {
    const video = { videoWidth: 800, videoHeight: 600 } as HTMLVideoElement;
    const noContextDocument = {
      createElement: jest.fn(() => ({
        getContext: () => null,
      })),
    } as unknown as Document;
    const noBase64Document = {
      createElement: jest.fn(() => ({
        getContext: () => ({ drawImage: jest.fn() }),
        toDataURL: () => 'data:image/jpeg',
      })),
    } as unknown as Document;

    expect(captureVideoFrame({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement)).toEqual({
      ok: false,
      error: 'Camera is not ready yet.',
    });
    expect(captureVideoFrame(video, noContextDocument)).toEqual({
      ok: false,
      error: 'Could not capture a photo from the camera.',
    });
    expect(captureVideoFrame(video, noBase64Document)).toEqual({
      ok: false,
      error: 'Could not capture a photo from the camera.',
    });
  });
});
