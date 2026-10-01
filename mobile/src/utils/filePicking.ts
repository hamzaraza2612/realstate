import { Platform } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'

/**
 * Camera / gallery / file pickers producing a `FormData`-ready file part, for the EXISTING multipart
 * document endpoints (`POST /documents`, `POST /documents/{id}/versions`, which take an `IFormFile`).
 * Phase 1 only provides the plumbing; the Documents screens that call it arrive in Phase 2.
 */

export interface PickedFile {
  uri: string
  name: string
  mimeType: string
  /** The browser `File` on web (react-native-web), where FormData needs a real Blob. */
  file?: File
}

export async function pickImage(source: 'camera' | 'library'): Promise<PickedFile | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return null

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
  if (result.canceled || result.assets.length === 0) return null

  const asset = result.assets[0]
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
    file: asset.file,
  }
}

export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
  if (result.canceled || result.assets.length === 0) return null
  const asset = result.assets[0]
  return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream', file: asset.file }
}

/** Appends a picked file under `field` — the RN `{ uri, name, type }` part on native, a Blob on web. */
export function appendFile(form: FormData, field: string, picked: PickedFile) {
  if (Platform.OS === 'web' && picked.file) {
    form.append(field, picked.file, picked.name)
    return
  }
  // React Native's FormData accepts this object shape for file parts.
  form.append(field, { uri: picked.uri, name: picked.name, type: picked.mimeType } as unknown as Blob)
}
