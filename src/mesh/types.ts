/**
 * Core mesh data types.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

/**
 * Mesh data structure containing vertices and triangle indices.
 */
export interface Mesh {
  /** Flat array of vertex positions [x0, y0, z0, x1, y1, z1, ...] */
  vertices: Float32Array;
  /** Triangle indices (3 per triangle) */
  indices: Uint32Array;
  /** Number of triangles */
  triangleCount: number;
  /** Axis-aligned bounding box */
  bounds: BoundingBox;
}

/**
 * Calculate the bounding box of a set of vertices.
 */
export function computeBounds(vertices: Float32Array): BoundingBox {
  if (vertices.length < 3) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }

  const min: Vec3 = {
    x: vertices[0],
    y: vertices[1],
    z: vertices[2],
  };
  const max: Vec3 = { ...min };

  for (let i = 3; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];

    min.x = Math.min(min.x, x);
    min.y = Math.min(min.y, y);
    min.z = Math.min(min.z, z);

    max.x = Math.max(max.x, x);
    max.y = Math.max(max.y, y);
    max.z = Math.max(max.z, z);
  }

  return { min, max };
}

/**
 * Get a triangle from the mesh by index.
 */
export function getTriangle(mesh: Mesh, triangleIndex: number): Triangle {
  const i0 = mesh.indices[triangleIndex * 3] * 3;
  const i1 = mesh.indices[triangleIndex * 3 + 1] * 3;
  const i2 = mesh.indices[triangleIndex * 3 + 2] * 3;

  return {
    v0: { x: mesh.vertices[i0], y: mesh.vertices[i0 + 1], z: mesh.vertices[i0 + 2] },
    v1: { x: mesh.vertices[i1], y: mesh.vertices[i1 + 1], z: mesh.vertices[i1 + 2] },
    v2: { x: mesh.vertices[i2], y: mesh.vertices[i2 + 1], z: mesh.vertices[i2 + 2] },
  };
}

/**
 * Calculate the center of a bounding box.
 */
export function boundsCenter(bounds: BoundingBox): Vec3 {
  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
}

/**
 * Calculate the size (extent) of a bounding box.
 */
export function boundsSize(bounds: BoundingBox): Vec3 {
  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
}
