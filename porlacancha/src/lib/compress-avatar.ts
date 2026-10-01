import * as ImageManipulator from "expo-image-manipulator";

const MAX_EDGE = 720;
const JPEG_QUALITY = 0.72;

export async function compressAvatarUri(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: MAX_EDGE } }], {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}
