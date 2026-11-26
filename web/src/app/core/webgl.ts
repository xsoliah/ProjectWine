/** Whether the browser can create a WebGL context (the 3D views fall back to flat pictures otherwise). */
export function hasWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
