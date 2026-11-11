import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { uploadDir } from '../middleware/upload.js';

/** Elimina de forma segura un archivo dentro del directorio de subidas. */
export async function deleteStoredFile(relativePath: string): Promise<void> {
  const absolute = path.resolve(uploadDir, path.basename(relativePath));
  if (!absolute.startsWith(uploadDir)) {
    throw new Error('Ruta de archivo fuera del directorio permitido');
  }
  try {
    await unlink(absolute);
  } catch (error) {
    // Si el archivo ya no existe no es un error de negocio
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('No se pudo eliminar el archivo:', error);
    }
  }
}

export function absoluteStoredPath(relativePath: string): string {
  const absolute = path.resolve(uploadDir, path.basename(relativePath));
  if (!absolute.startsWith(uploadDir)) {
    throw new Error('Ruta de archivo fuera del directorio permitido');
  }
  return absolute;
}
