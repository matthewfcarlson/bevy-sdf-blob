/**
 * OBJ file parser for loading triangle meshes.
 */

import { Mesh, computeBounds } from './types';

export class OBJParseError extends Error {
  constructor(message: string, public line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message);
    this.name = 'OBJParseError';
  }
}

interface ParsedOBJ {
  vertices: number[];
  indices: number[];
}

/**
 * Parse an OBJ file string into a Mesh.
 * Supports only triangular faces (will triangulate quads).
 */
export function parseOBJ(objContent: string): Mesh {
  const parsed = parseOBJContent(objContent);

  if (parsed.vertices.length === 0) {
    throw new OBJParseError('No vertices found in OBJ file');
  }

  if (parsed.indices.length === 0) {
    throw new OBJParseError('No faces found in OBJ file');
  }

  const vertices = new Float32Array(parsed.vertices);
  const indices = new Uint32Array(parsed.indices);
  const bounds = computeBounds(vertices);

  return {
    vertices,
    indices,
    triangleCount: indices.length / 3,
    bounds,
  };
}

function parseOBJContent(content: string): ParsedOBJ {
  const vertices: number[] = [];
  const indices: number[] = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum].trim();

    // Skip empty lines and comments
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const parts = line.split(/\s+/);
    const command = parts[0];

    switch (command) {
      case 'v':
        parseVertex(parts, vertices, lineNum + 1);
        break;
      case 'f':
        parseFace(parts, indices, vertices.length / 3, lineNum + 1);
        break;
      // Ignore other commands (vt, vn, mtllib, usemtl, o, g, s, etc.)
    }
  }

  return { vertices, indices };
}

function parseVertex(parts: string[], vertices: number[], lineNum: number): void {
  if (parts.length < 4) {
    throw new OBJParseError('Vertex must have at least 3 coordinates', lineNum);
  }

  const x = parseFloat(parts[1]);
  const y = parseFloat(parts[2]);
  const z = parseFloat(parts[3]);

  if (isNaN(x) || isNaN(y) || isNaN(z)) {
    throw new OBJParseError('Invalid vertex coordinates', lineNum);
  }

  vertices.push(x, y, z);
}

function parseFace(
  parts: string[],
  indices: number[],
  vertexCount: number,
  lineNum: number
): void {
  if (parts.length < 4) {
    throw new OBJParseError('Face must have at least 3 vertices', lineNum);
  }

  // Parse vertex indices (OBJ uses 1-based indexing)
  const faceIndices: number[] = [];

  for (let i = 1; i < parts.length; i++) {
    const indexPart = parts[i].split('/')[0]; // Take only vertex index (ignore texture/normal)
    const index = parseInt(indexPart, 10);

    if (isNaN(index)) {
      throw new OBJParseError(`Invalid face vertex index: ${parts[i]}`, lineNum);
    }

    // Convert to 0-based index, handle negative indices
    let zeroBasedIndex: number;
    if (index > 0) {
      zeroBasedIndex = index - 1;
    } else if (index < 0) {
      // Negative indices are relative to current vertex count
      zeroBasedIndex = vertexCount + index;
    } else {
      throw new OBJParseError('Face vertex index cannot be 0', lineNum);
    }

    if (zeroBasedIndex < 0 || zeroBasedIndex >= vertexCount) {
      throw new OBJParseError(
        `Face vertex index ${index} out of range (${vertexCount} vertices)`,
        lineNum
      );
    }

    faceIndices.push(zeroBasedIndex);
  }

  // Triangulate the face (fan triangulation for convex polygons)
  for (let i = 1; i < faceIndices.length - 1; i++) {
    indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
  }
}

/**
 * Load an OBJ file from a URL.
 */
export async function loadOBJFromURL(url: string): Promise<Mesh> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new OBJParseError(`Failed to load OBJ file: ${response.statusText}`);
  }
  const content = await response.text();
  return parseOBJ(content);
}

/**
 * Load an OBJ file from a File object (e.g., from file input).
 */
export async function loadOBJFromFile(file: File): Promise<Mesh> {
  const content = await file.text();
  return parseOBJ(content);
}
