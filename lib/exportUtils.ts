export type ExportFormat = 'CSV' | 'PARQUET' | 'JSON';

// Function to export a query result to a file
export async function exportQueryAsFile(
  db: any, // Using any to avoid import issues
  sqlQuery: string,
  fileName: string,
  format: ExportFormat
): Promise<void> {
  const connection = await db.connect();
  try {
    // Generate a unique temporary filename
    const tempFileName = `export_${Date.now()}.${format.toLowerCase()}`;
    
    // Build the COPY command based on format
    // Remove trailing semicolon from sqlQuery to avoid syntax errors
    const cleanQuery = sqlQuery.trim().replace(/;+$/, '');
    let copyCommand = '';
    switch (format) {
      case 'CSV':
        copyCommand = `COPY (${cleanQuery}) TO '${tempFileName}' (FORMAT CSV, HEADER);`;
        break;
      case 'PARQUET':
        copyCommand = `COPY (${cleanQuery}) TO '${tempFileName}' (FORMAT PARQUET);`;
        break;
      case 'JSON':
        copyCommand = `COPY (${cleanQuery}) TO '${tempFileName}' (FORMAT JSON);`;
        break;
    }
    
    await connection.query(copyCommand);
    
    // Get the file buffer from DuckDB's virtual filesystem
    const buffer = await db.copyFileToBuffer(tempFileName);
    
    // Trigger browser download
    const blob = new Blob([buffer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Clean up the temporary file
    await db.dropFile(tempFileName);
  } finally {
    await connection.close();
  }
}

// Function to export the entire database  
export async function exportDatabase(db: any): Promise<void> {
  const connection = await db.connect();
  try {
    const exportDir = 'database_export';
    
    // Export the entire database to a directory
    await connection.query(`EXPORT DATABASE '${exportDir}';`);
    
    // Note: In a real implementation, you would need to zip the directory
    // and download it. For now, we'll just show a message.
    console.log('Database exported to virtual filesystem directory:', exportDir);
    
    // TODO: Implement directory zipping and download
    alert('Database export feature will be available in a future update.');
  } finally {
    await connection.close();
  }
}

// Utility function to suggest filename based on query
export function suggestFileName(query: string, format: ExportFormat): string {
  // Extract table name from query if possible
  const tableMatch = query.match(/FROM\s+["`']?([^"`'\s]+)["`']?/i);
  const tableName = tableMatch ? tableMatch[1] : 'query_result';
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  return `${tableName}_${timestamp}.${format.toLowerCase()}`;
}