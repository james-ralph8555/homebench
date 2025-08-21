# CSV Export

To export the data from a table to a CSV file, use the `COPY` statement:

    COPY tbl TO 'output.csv' (HEADER, DELIMITER ',');

The result of queries can also be directly exported to a CSV file:

    COPY (SELECT * FROM tbl) TO 'output.csv' (HEADER, DELIMITER ',');

For additional options, see the [`COPY` statement
documentation](/docs/stable/sql/statements/copy.html#csv-options).
