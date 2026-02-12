import type { AKGSource } from './nodes.js';

/** A reference from a node/edge to an API endpoint. */
export interface ApiCallReference {
  endpointId: string;
  method: string;
  path: string;
  statusCode?: number;
  responseTimeMs?: number;
}

/** Simplified JSON Schema for request/response shapes. */
export interface SchemaDefinition {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, SchemaDefinition>;
  items?: SchemaDefinition;
  required?: string[];
  description?: string;
}

/** HTTP method enum for API endpoints. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** A single HTTP API endpoint the application interacts with. */
export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  baseUrl?: string;
  source: AKGSource;
  requestShape?: SchemaDefinition;
  responseShape?: SchemaDefinition;
  contentType: string;
  authRequired: boolean;
  requiredRoles: string[];
  calledOnLoadBy: string[];
  calledByEdges: string[];
  responseTimesMs?: [number, number, number];
  observedStatusCodes?: Record<number, number>;
}

/** Summary of API-level discrepancies between code and exploration. */
export interface ApiReconciliation {
  deadEndpoints: string[];
  undocumentedEndpoints: string[];
  authMismatches: Array<{
    endpointId: string;
    codeRequiresAuth: boolean;
    explorationRequiredAuth: boolean;
  }>;
}
