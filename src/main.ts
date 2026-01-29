/**
 * SDF Mesh Approximation - Main Entry Point
 */

import { initWebGPU, GPUContext, WebGPUError } from './webgpu';
import { loadOBJFromFile, Mesh } from './mesh';
import { computeDistanceField, DistanceField } from './sdf';

// UI Elements
let canvas: HTMLCanvasElement;
let fileInput: HTMLInputElement;
let resolutionSelect: HTMLSelectElement;
let computeBtn: HTMLButtonElement;
let statusDiv: HTMLElement;
let errorDiv: HTMLElement;

// State
let gpuContext: GPUContext | null = null;
let currentMesh: Mesh | null = null;
let currentDistanceField: DistanceField | null = null;

function setStatus(message: string): void {
  statusDiv.textContent = message;
  console.log('[Status]', message);
}

function showError(message: string): void {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  console.error('[Error]', message);
}

function clearError(): void {
  errorDiv.style.display = 'none';
}

function updateUI(): void {
  const canCompute = gpuContext !== null && currentMesh !== null;
  computeBtn.disabled = !canCompute;
}

async function handleFileLoad(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  clearError();
  setStatus(`Loading ${file.name}...`);

  try {
    currentMesh = await loadOBJFromFile(file);
    setStatus(
      `Loaded mesh: ${currentMesh.triangleCount} triangles, ` +
        `${currentMesh.vertices.length / 3} vertices`
    );
    updateUI();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showError(`Failed to load mesh: ${message}`);
    setStatus('Ready');
  }
}

async function handleCompute(): Promise<void> {
  if (!gpuContext || !currentMesh) {
    return;
  }

  clearError();
  const resolution = parseInt(resolutionSelect.value, 10);
  setStatus(`Computing distance field (${resolution}³)...`);
  computeBtn.disabled = true;

  try {
    const startTime = performance.now();

    // Clean up previous distance field
    if (currentDistanceField) {
      currentDistanceField.texture.destroy();
    }

    currentDistanceField = await computeDistanceField(gpuContext, currentMesh, {
      resolution,
    });

    const elapsed = performance.now() - startTime;
    setStatus(
      `Distance field computed in ${elapsed.toFixed(1)}ms ` +
        `(${resolution}³ = ${resolution ** 3} voxels)`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    showError(`Compute failed: ${message}`);
    setStatus('Ready');
  } finally {
    updateUI();
  }
}

async function init(): Promise<void> {
  // Get UI elements
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  fileInput = document.getElementById('mesh-file') as HTMLInputElement;
  resolutionSelect = document.getElementById('resolution') as HTMLSelectElement;
  computeBtn = document.getElementById('compute-btn') as HTMLButtonElement;
  statusDiv = document.getElementById('status') as HTMLElement;
  errorDiv = document.getElementById('error') as HTMLElement;

  // Set up event listeners
  fileInput.addEventListener('change', handleFileLoad);
  computeBtn.addEventListener('click', handleCompute);

  // Initialize WebGPU
  setStatus('Initializing WebGPU...');

  try {
    gpuContext = await initWebGPU(canvas);
    setStatus('WebGPU ready. Load a mesh to begin.');
  } catch (err) {
    if (err instanceof WebGPUError) {
      showError(err.message);
    } else {
      showError('Failed to initialize WebGPU');
    }
    setStatus('WebGPU unavailable');
  }

  updateUI();
}

// Start the application
init().catch((err) => {
  console.error('Initialization failed:', err);
});
