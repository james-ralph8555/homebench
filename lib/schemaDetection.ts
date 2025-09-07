import { executeReadQuery } from './durableOperations';

export interface ColumnInfo {
  column_name: string;
  column_type: string;
  null: string;
  key: string;
  default: string;
  extra: string;
}

export interface SchemaPreviewData {
  columns: ColumnInfo[];
  sampleData: Record<string, any>[];
  rowCount?: number;
}

export interface TypeOverride {
  columnName: string;
  newType: string;
}

// Complete list of DuckDB data types for user selection
export const DUCKDB_TYPES = [
  // Numeric Types
  'BIGINT',
  'DOUBLE',
  'FLOAT',
  'HUGEINT', 
  'INTEGER',
  'SMALLINT',
  'TINYINT',
  'UBIGINT',
  'UHUGEINT',
  'UINTEGER',
  'USMALLINT',
  'UTINYINT',
  'DECIMAL',
  'NUMERIC',
  
  // Text Types
  'VARCHAR',
  'TEXT',
  'STRING',
  
  // Boolean Type
  'BOOLEAN',
  
  // Date/Time Types
  'DATE',
  'TIME',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'INTERVAL',
  
  // Special Types
  'BLOB',
  'BIT',
  'JSON',
  'UUID',
  
  // Nested Types (simplified - user can specify manually if needed)
  'ARRAY',
  'LIST',
  'MAP',
  'STRUCT'
] as const;

export type DuckDBType = typeof DUCKDB_TYPES[number];

/**
 * Get schema information and sample data from a file without creating a table
 */
export async function detectFileSchema(
  fileName: string, 
  fileExtension: string,
  sampleRows: number = 10
): Promise<SchemaPreviewData> {
  try {
    let readFunction: string;
    let extraOptions = '';
    
    // Determine the appropriate DuckDB read function
    switch (fileExtension.toLowerCase()) {
      case 'csv':
        readFunction = `read_csv_auto('${fileName}')`;
        break;
      case 'parquet':
        readFunction = `read_parquet('${fileName}')`;
        break;
      case 'json':
      case 'jsonl':
      case 'ndjson':
        readFunction = `read_json_auto('${fileName}', maximum_object_size = 104857600)`;
        break;
      case 'xlsx':
        readFunction = `read_xlsx('${fileName}', header=true)`;
        break;
      default:
        throw new Error(`Unsupported file extension: ${fileExtension}`);
    }
    
    // Get column information using DESCRIBE
    const describeQuery = `DESCRIBE SELECT * FROM ${readFunction}`;
    const schemaResult = await executeReadQuery(describeQuery);
    const columns: ColumnInfo[] = (schemaResult as any).toArray();
    
    // Get sample data (limit to avoid memory issues)
    const sampleQuery = `SELECT * FROM ${readFunction} LIMIT ${sampleRows}`;
    const sampleResult = await executeReadQuery(sampleQuery);
    const sampleData: Record<string, any>[] = (sampleResult as any).toArray();
    
    // Optionally get row count for smaller files (skip for performance on large files)
    let rowCount: number | undefined;
    try {
      // Only get count for files that are likely small enough to count quickly
      if (fileExtension.toLowerCase() === 'parquet' || sampleData.length < sampleRows) {
        const countQuery = `SELECT COUNT(*) as total_rows FROM ${readFunction}`;
        const countResult = await executeReadQuery(countQuery);
        const countData = (countResult as any).toArray();
        rowCount = countData[0]?.total_rows;
      }
    } catch (error) {
      console.warn('Could not get row count:', error);
      // Row count is optional, continue without it
    }
    
    return {
      columns,
      sampleData,
      rowCount
    };
  } catch (error: any) {
    console.error('Schema detection failed:', error);
    throw new Error(`Failed to detect schema: ${error.message}`);
  }
}

/**
 * Validate if a type conversion is likely to succeed
 */
export function validateTypeConversion(
  sampleValue: any, 
  targetType: string
): { isValid: boolean; warning?: string } {
  if (sampleValue === null || sampleValue === undefined) {
    return { isValid: true }; // NULL values can be cast to any type
  }
  
  const value = String(sampleValue).trim();
  const upperType = targetType.toUpperCase();
  
  try {
    switch (upperType) {
      case 'BIGINT':
      case 'INTEGER':
      case 'SMALLINT':
      case 'TINYINT':
      case 'HUGEINT':
      case 'UBIGINT':
      case 'UINTEGER':
      case 'USMALLINT':
      case 'UTINYINT':
        const intValue = parseInt(value);
        if (isNaN(intValue)) {
          return { isValid: false, warning: `Cannot convert "${value}" to integer` };
        }
        return { isValid: true };
        
      case 'DOUBLE':
      case 'FLOAT':
      case 'DECIMAL':
      case 'NUMERIC':
        const floatValue = parseFloat(value);
        if (isNaN(floatValue)) {
          return { isValid: false, warning: `Cannot convert "${value}" to number` };
        }
        return { isValid: true };
        
      case 'BOOLEAN':
        const lowerValue = value.toLowerCase();
        if (!['true', 'false', '1', '0', 't', 'f', 'yes', 'no', 'y', 'n'].includes(lowerValue)) {
          return { isValid: false, warning: `Cannot convert "${value}" to boolean` };
        }
        return { isValid: true };
        
      case 'DATE':
        // Basic date validation - DuckDB is quite flexible with date parsing
        if (value.length === 0) {
          return { isValid: false, warning: `Empty string cannot be converted to date` };
        }
        return { isValid: true, warning: 'Date conversion will be attempted - verify format compatibility' };
        
      case 'TIMESTAMP':
      case 'TIMESTAMPTZ':
        if (value.length === 0) {
          return { isValid: false, warning: `Empty string cannot be converted to timestamp` };
        }
        return { isValid: true, warning: 'Timestamp conversion will be attempted - verify format compatibility' };
        
      case 'JSON':
        try {
          JSON.parse(value);
          return { isValid: true };
        } catch {
          return { isValid: false, warning: `"${value}" is not valid JSON` };
        }
        
      case 'UUID':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          return { isValid: false, warning: `"${value}" is not a valid UUID format` };
        }
        return { isValid: true };
        
      case 'VARCHAR':
      case 'TEXT':
      case 'STRING':
      case 'BLOB':
      case 'BIT':
        // String types can accept almost any value
        return { isValid: true };
        
      default:
        // For complex types like ARRAY, LIST, MAP, STRUCT, we'll let DuckDB handle validation
        return { isValid: true, warning: `Type conversion to ${targetType} will be attempted` };
    }
  } catch (error) {
    return { isValid: false, warning: `Validation error: ${error}` };
  }
}

/**
 * Generate SQL for creating a table with custom column types
 */
export function generateCustomTableSQL(
  tableName: string,
  fileName: string,
  fileExtension: string,
  typeOverrides: TypeOverride[]
): string {
  let readFunction: string;
  
  switch (fileExtension.toLowerCase()) {
    case 'csv':
      readFunction = `read_csv_auto('${fileName}')`;
      break;
    case 'parquet':
      readFunction = `read_parquet('${fileName}')`;
      break;
    case 'json':
    case 'jsonl':
    case 'ndjson':
      readFunction = `read_json_auto('${fileName}', maximum_object_size = 104857600)`;
      break;
    case 'xlsx':
      readFunction = `read_xlsx('${fileName}', header=true)`;
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }
  
  if (typeOverrides.length === 0) {
    // No type overrides, use auto-detection
    return `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM ${readFunction}`;
  }
  
  // Generate SELECT with CAST functions for overridden types
  const castExpressions = typeOverrides.map(override => 
    `CAST("${override.columnName}" AS ${override.newType}) AS "${override.columnName}"`
  );
  
  // For columns not in typeOverrides, select them as-is
  // We'll need to get the column list first, but for now create a parameterized version
  const selectClause = castExpressions.length > 0 
    ? `SELECT *, ${castExpressions.join(', ')}`
    : 'SELECT *';
    
  return `CREATE OR REPLACE TABLE "${tableName}" AS ${selectClause} FROM ${readFunction}`;
}

/**
 * Generate more sophisticated SQL that handles partial casting
 * This version tries to cast each column individually and falls back gracefully
 */
export function generateRobustCustomTableSQL(
  tableName: string,
  fileName: string,
  fileExtension: string,
  columns: ColumnInfo[],
  typeOverrides: TypeOverride[]
): string {
  let readFunction: string;
  
  switch (fileExtension.toLowerCase()) {
    case 'csv':
      readFunction = `read_csv_auto('${fileName}')`;
      break;
    case 'parquet':
      readFunction = `read_parquet('${fileName}')`;
      break;
    case 'json':
    case 'jsonl': 
    case 'ndjson':
      readFunction = `read_json_auto('${fileName}', maximum_object_size = 104857600)`;
      break;
    case 'xlsx':
      readFunction = `read_xlsx('${fileName}', header=true)`;
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }
  
  if (typeOverrides.length === 0) {
    return `CREATE OR REPLACE TABLE "${tableName}" AS SELECT * FROM ${readFunction}`;
  }
  
  // Create a map for quick lookup of type overrides
  const overrideMap = new Map(typeOverrides.map(o => [o.columnName, o.newType]));
  
  // Generate SELECT clause with appropriate casting
  const selectClauses = columns.map(col => {
    const override = overrideMap.get(col.column_name);
    if (override) {
      // Use TRY_CAST for safer casting that returns NULL on failure instead of erroring
      return `TRY_CAST("${col.column_name}" AS ${override}) AS "${col.column_name}"`;
    } else {
      return `"${col.column_name}"`;
    }
  });
  
  return `CREATE OR REPLACE TABLE "${tableName}" AS SELECT ${selectClauses.join(', ')} FROM ${readFunction}`;
}