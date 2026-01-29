import { describe, it, expect } from 'vitest';
import {
  computeBounds,
  boundsCenter,
  boundsSize,
  getTriangle,
  Mesh,
  BoundingBox,
} from '../src/mesh/types';

describe('computeBounds', () => {
  it('returns zero bounds for empty vertices', () => {
    const bounds = computeBounds(new Float32Array([]));
    expect(bounds.min).toEqual({ x: 0, y: 0, z: 0 });
    expect(bounds.max).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('computes bounds for single vertex', () => {
    const vertices = new Float32Array([1, 2, 3]);
    const bounds = computeBounds(vertices);
    expect(bounds.min).toEqual({ x: 1, y: 2, z: 3 });
    expect(bounds.max).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('computes bounds for multiple vertices', () => {
    const vertices = new Float32Array([
      -1, -2, -3,
      4, 5, 6,
      0, 0, 0,
    ]);
    const bounds = computeBounds(vertices);
    expect(bounds.min).toEqual({ x: -1, y: -2, z: -3 });
    expect(bounds.max).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('handles negative coordinates', () => {
    const vertices = new Float32Array([
      -10, -20, -30,
      -5, -10, -15,
    ]);
    const bounds = computeBounds(vertices);
    expect(bounds.min).toEqual({ x: -10, y: -20, z: -30 });
    expect(bounds.max).toEqual({ x: -5, y: -10, z: -15 });
  });
});

describe('boundsCenter', () => {
  it('computes center of symmetric bounds', () => {
    const bounds: BoundingBox = {
      min: { x: -1, y: -1, z: -1 },
      max: { x: 1, y: 1, z: 1 },
    };
    const center = boundsCenter(bounds);
    expect(center).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('computes center of asymmetric bounds', () => {
    const bounds: BoundingBox = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 20, z: 30 },
    };
    const center = boundsCenter(bounds);
    expect(center).toEqual({ x: 5, y: 10, z: 15 });
  });
});

describe('boundsSize', () => {
  it('computes size of bounds', () => {
    const bounds: BoundingBox = {
      min: { x: -1, y: -2, z: -3 },
      max: { x: 4, y: 5, z: 6 },
    };
    const size = boundsSize(bounds);
    expect(size).toEqual({ x: 5, y: 7, z: 9 });
  });

  it('returns zero size for point bounds', () => {
    const bounds: BoundingBox = {
      min: { x: 5, y: 5, z: 5 },
      max: { x: 5, y: 5, z: 5 },
    };
    const size = boundsSize(bounds);
    expect(size).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('getTriangle', () => {
  it('retrieves triangle vertices from mesh', () => {
    const mesh: Mesh = {
      vertices: new Float32Array([
        0, 0, 0,  // vertex 0
        1, 0, 0,  // vertex 1
        0, 1, 0,  // vertex 2
        1, 1, 0,  // vertex 3
      ]),
      indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
      triangleCount: 2,
      bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 0 } },
    };

    const tri0 = getTriangle(mesh, 0);
    expect(tri0.v0).toEqual({ x: 0, y: 0, z: 0 });
    expect(tri0.v1).toEqual({ x: 1, y: 0, z: 0 });
    expect(tri0.v2).toEqual({ x: 0, y: 1, z: 0 });

    const tri1 = getTriangle(mesh, 1);
    expect(tri1.v0).toEqual({ x: 1, y: 0, z: 0 });
    expect(tri1.v1).toEqual({ x: 1, y: 1, z: 0 });
    expect(tri1.v2).toEqual({ x: 0, y: 1, z: 0 });
  });
});
