import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import { MAX_IMAGES, useImageSelection } from '../src/hooks/useImageSelection';

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

const mockPicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

const mockSaveAsync = jest.fn();
const mockRenderAsync = jest.fn();
const mockContext = { resize: jest.fn(), renderAsync: mockRenderAsync };

function grantMediaLibrary() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
}

function grantCamera() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
}

function makeAsset(n: number) {
  return { uri: `file://photo${n}.jpg`, width: 800, height: 600, type: 'image' as const };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockContext.resize.mockReturnValue(mockContext);
  mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync });
  mockSaveAsync.mockImplementation(async () => ({
    uri: `file://processed-${Math.random()}.jpg`,
    base64: 'base64data',
    width: 800,
    height: 600,
  }));
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(mockContext);
});

describe('useImageSelection', () => {
  it('starts with an empty image list and isLoading false', () => {
    const { result } = renderHook(() => useImageSelection());
    expect(result.current.images).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('pickFromLibrary', () => {
    it('adds processed images when permission is granted', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1), makeAsset(2)],
      });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.images).toHaveLength(2);
      expect(result.current.images[0].base64).toBe('base64data');
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when permission is denied', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.images).toHaveLength(0);
      expect(result.current.error).toBe('Photo library access is required to add images.');
      expect(mockPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('records an error when photo library permission request fails', async () => {
      mockPicker.requestMediaLibraryPermissionsAsync.mockRejectedValue(
        new Error('permission failed'),
      );

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.error).toBe('Could not open photos. Please try again.');
      expect(result.current.isLoading).toBe(false);
      expect(mockPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('records an error when the photo library picker fails to open', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockRejectedValue(new Error('picker failed'));

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.error).toBe('Could not open photos. Please try again.');
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when the picker is canceled', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.images).toHaveLength(0);
    });

    it('caps total images at MAX_IMAGES', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: Array.from({ length: MAX_IMAGES + 2 }, (_, i) => makeAsset(i)),
      });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.images).toHaveLength(MAX_IMAGES);
    });

    it('clears isLoading and records an error when resize throws', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1)],
      });
      mockSaveAsync.mockRejectedValue(new Error('resize failed'));

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Could not process that photo. Please try another image.');
      expect(result.current.images).toHaveLength(0);
    });

    it('records an error when image processing returns no base64 data', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1)],
      });
      mockSaveAsync.mockResolvedValue({ uri: 'file://processed.jpg', width: 800, height: 600 });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());

      expect(result.current.error).toBe('Could not process that photo. Please try another image.');
      expect(result.current.images).toHaveLength(0);
    });
  });

  describe('pickFromCamera', () => {
    it('adds a processed image when permission is granted', async () => {
      grantCamera();
      mockPicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1)],
      });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());

      expect(result.current.images).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when camera permission is denied', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());

      expect(result.current.images).toHaveLength(0);
      expect(result.current.error).toBe('Camera access is required to take photos.');
      expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('records an error when camera permission request fails', async () => {
      mockPicker.requestCameraPermissionsAsync.mockRejectedValue(new Error('permission failed'));

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());

      expect(result.current.error).toBe('Could not open the camera. Please try again.');
      expect(result.current.isLoading).toBe(false);
      expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('records an error when the camera fails to open', async () => {
      grantCamera();
      mockPicker.launchCameraAsync.mockRejectedValue(new Error('camera failed'));

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());

      expect(result.current.error).toBe('Could not open the camera. Please try again.');
      expect(result.current.isLoading).toBe(false);
    });

    it('does nothing when the camera is canceled', async () => {
      grantCamera();
      mockPicker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());

      expect(result.current.images).toHaveLength(0);
    });

    it('clears isLoading and records an error when camera image processing fails', async () => {
      grantCamera();
      mockPicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1)],
      });
      mockSaveAsync.mockRejectedValue(new Error('resize failed'));

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Could not process that photo. Please try another image.');
      expect(result.current.images).toHaveLength(0);
    });
  });

  describe('removeImage', () => {
    it('removes the image with the matching uri', async () => {
      grantMediaLibrary();
      const firstUri = 'file://processed-first.jpg';
      mockSaveAsync
        .mockResolvedValueOnce({ uri: firstUri, base64: 'b1', width: 800, height: 600 })
        .mockResolvedValue({
          uri: 'file://processed-second.jpg',
          base64: 'b2',
          width: 800,
          height: 600,
        });
      mockPicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1), makeAsset(2)],
      });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());
      expect(result.current.images).toHaveLength(2);

      act(() => result.current.removeImage(firstUri));
      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].uri).not.toBe(firstUri);
    });
  });

  describe('clearImages', () => {
    it('empties the image list', async () => {
      grantMediaLibrary();
      mockPicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [makeAsset(1)],
      });

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromLibrary());
      expect(result.current.images).toHaveLength(1);

      act(() => result.current.clearImages());
      expect(result.current.images).toHaveLength(0);
    });
  });

  describe('clearError', () => {
    it('clears the current error message', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

      const { result } = renderHook(() => useImageSelection());
      await act(() => result.current.pickFromCamera());
      expect(result.current.error).toBe('Camera access is required to take photos.');

      act(() => result.current.clearError());
      expect(result.current.error).toBeNull();
    });
  });
});
