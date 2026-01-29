/**
 * WebGPU context initialization and management.
 */

export interface GPUContext {
  device: GPUDevice;
  queue: GPUQueue;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export class WebGPUError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGPUError';
  }
}

/**
 * Check if WebGPU is available in the current browser.
 */
export function isWebGPUSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/**
 * Initialize WebGPU and return the context.
 * Throws WebGPUError if initialization fails.
 */
export async function initWebGPU(canvas: HTMLCanvasElement): Promise<GPUContext> {
  if (!isWebGPUSupported()) {
    throw new WebGPUError(
      'WebGPU is not supported in this browser. Please use Chrome 113+ or another WebGPU-enabled browser.'
    );
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    throw new WebGPUError(
      'Failed to get GPU adapter. Your GPU may not support WebGPU.'
    );
  }

  const device = await adapter.requestDevice({
    requiredFeatures: [],
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    },
  });

  device.lost.then((info) => {
    console.error('WebGPU device lost:', info.message);
    if (info.reason !== 'destroyed') {
      // Could attempt to reinitialize here
      throw new WebGPUError(`GPU device lost: ${info.message}`);
    }
  });

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new WebGPUError('Failed to get WebGPU canvas context.');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  return {
    device,
    queue: device.queue,
    canvas,
    context,
    format,
  };
}

/**
 * Create a shader module from WGSL source code.
 */
export function createShaderModule(
  device: GPUDevice,
  code: string,
  label?: string
): GPUShaderModule {
  return device.createShaderModule({
    label,
    code,
  });
}

/**
 * Create a buffer with initial data.
 */
export function createBuffer(
  device: GPUDevice,
  data: ArrayBuffer | ArrayBufferView,
  usage: GPUBufferUsageFlags,
  label?: string
): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });

  const dst = new Uint8Array(buffer.getMappedRange());
  const src = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(data);
  dst.set(src);
  buffer.unmap();

  return buffer;
}

/**
 * Create an empty buffer of specified size.
 */
export function createEmptyBuffer(
  device: GPUDevice,
  size: number,
  usage: GPUBufferUsageFlags,
  label?: string
): GPUBuffer {
  return device.createBuffer({
    label,
    size,
    usage,
  });
}
