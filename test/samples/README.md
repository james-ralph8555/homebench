# Sample Data for Agent Testing

This directory contains sample datasets for automated browser verification via Chrome DevTools MCP.

## Files

| File | Format | Rows | Description |
|------|--------|------|-------------|
| `employees.csv` | CSV | 10 | Employee records with department and salary |
| `products.json` | JSON | 10 | Product catalog with pricing and stock |

## Reference Queries

After loading a sample file into HomeBench, use these queries to verify functionality:

### employees.csv

```sql
-- Count employees by department
SELECT department, COUNT(*) as count, AVG(salary) as avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;
```

Expected result: 3 departments (Engineering, Marketing, Sales), Engineering has highest avg salary.

```sql
-- Find highest paid employees
SELECT name, department, salary
FROM employees
ORDER BY salary DESC
LIMIT 3;
```

Expected result: Henry Wilson ($125000), Carol Williams ($110000), Alice Johnson ($95000).

### products.json

```sql
-- Category summary
SELECT category, COUNT(*) as products, SUM(stock) as total_stock, AVG(price) as avg_price
FROM products
GROUP BY category;
```

Expected result: 2 categories, Electronics has more products and stock.

```sql
-- Low stock items
SELECT name, category, stock
FROM products
WHERE stock < 20
ORDER BY stock;
```

Expected result: Standing Desk (12), Bookshelf (8).

## Browser Verification Steps

1. Navigate to `http://localhost:3000`
2. Upload a sample file via the file upload component
3. Verify the table is created and shown in the schema panel
4. Run a reference query in the SQL editor
5. Verify results display correctly in the results grid
6. Check console for any errors

## Agent Usage

When using Chrome DevTools MCP:

```
mcp_chrome-devtools_navigate_page -> http://localhost:3000
mcp_chrome-devtools_take_snapshot -> identify upload element
mcp_chrome-devtools_upload_file -> upload sample file
mcp_chrome-devtools_fill -> enter query in SQL editor
mcp_chrome-devtools_click -> execute query
mcp_chrome-devtools_take_screenshot -> capture results
mcp_chrome-devtools_list_console_messages -> check for errors
```
