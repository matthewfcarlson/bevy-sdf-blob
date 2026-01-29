import { describe, it, expect } from 'vitest';
import { parseOBJ, OBJParseError } from '../src/mesh/obj-loader';

describe('parseOBJ', () => {
  it('parses a simple triangle', () => {
    const obj = `
      v 0 0 0
      v 1 0 0
      v 0 1 0
      f 1 2 3
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(1);
    expect(mesh.vertices.length).toBe(9); // 3 vertices * 3 components
    expect(mesh.indices.length).toBe(3);

    // Check vertices
    expect(Array.from(mesh.vertices)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    // Check indices (0-based)
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2]);
  });

  it('parses a quad and triangulates it', () => {
    const obj = `
      v 0 0 0
      v 1 0 0
      v 1 1 0
      v 0 1 0
      f 1 2 3 4
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(2);
    expect(mesh.indices.length).toBe(6);

    // Fan triangulation: 0-1-2, 0-2-3
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2, 0, 2, 3]);
  });

  it('handles vertex/texture/normal format', () => {
    const obj = `
      v 0 0 0
      v 1 0 0
      v 0 1 0
      vt 0 0
      vt 1 0
      vt 0 1
      vn 0 0 1
      f 1/1/1 2/2/1 3/3/1
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(1);
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2]);
  });

  it('handles comments and empty lines', () => {
    const obj = `
      # This is a comment
      v 0 0 0

      # Another comment
      v 1 0 0
      v 0 1 0

      f 1 2 3
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(1);
  });

  it('handles negative indices', () => {
    const obj = `
      v 0 0 0
      v 1 0 0
      v 0 1 0
      f -3 -2 -1
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(1);
    expect(Array.from(mesh.indices)).toEqual([0, 1, 2]);
  });

  it('computes correct bounding box', () => {
    const obj = `
      v -1 -2 -3
      v 4 5 6
      v 0 0 0
      f 1 2 3
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.bounds.min).toEqual({ x: -1, y: -2, z: -3 });
    expect(mesh.bounds.max).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('handles multiple faces', () => {
    const obj = `
      v 0 0 0
      v 1 0 0
      v 1 1 0
      v 0 1 0
      f 1 2 3
      f 1 3 4
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(2);
  });

  it('ignores unsupported commands', () => {
    const obj = `
      mtllib material.mtl
      o MyObject
      g MyGroup
      v 0 0 0
      v 1 0 0
      v 0 1 0
      vt 0 0
      vn 0 0 1
      usemtl MyMaterial
      s 1
      f 1 2 3
    `;
    const mesh = parseOBJ(obj);

    expect(mesh.triangleCount).toBe(1);
  });

  describe('error handling', () => {
    it('throws on empty file', () => {
      expect(() => parseOBJ('')).toThrow(OBJParseError);
      expect(() => parseOBJ('')).toThrow('No vertices found');
    });

    it('throws on file with only vertices', () => {
      const obj = `
        v 0 0 0
        v 1 0 0
      `;
      expect(() => parseOBJ(obj)).toThrow('No faces found');
    });

    it('throws on invalid vertex', () => {
      const obj = `
        v 0 0
        f 1
      `;
      expect(() => parseOBJ(obj)).toThrow('at least 3 coordinates');
    });

    it('throws on invalid face', () => {
      const obj = `
        v 0 0 0
        v 1 0 0
        f 1 2
      `;
      expect(() => parseOBJ(obj)).toThrow('at least 3 vertices');
    });

    it('throws on out of range index', () => {
      const obj = `
        v 0 0 0
        v 1 0 0
        v 0 1 0
        f 1 2 4
      `;
      expect(() => parseOBJ(obj)).toThrow('out of range');
    });

    it('throws on index of 0', () => {
      const obj = `
        v 0 0 0
        v 1 0 0
        v 0 1 0
        f 0 1 2
      `;
      expect(() => parseOBJ(obj)).toThrow('cannot be 0');
    });

    it('throws on non-numeric vertex', () => {
      const obj = `
        v abc 0 0
        f 1 1 1
      `;
      expect(() => parseOBJ(obj)).toThrow('Invalid vertex');
    });

    it('throws on non-numeric face index', () => {
      const obj = `
        v 0 0 0
        v 1 0 0
        v 0 1 0
        f 1 abc 3
      `;
      expect(() => parseOBJ(obj)).toThrow('Invalid face vertex index');
    });
  });
});
