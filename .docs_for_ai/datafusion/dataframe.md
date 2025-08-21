# DataFrame API

A DataFrame represents a logical set of rows with the same named
columns, similar to a [Pandas
DataFrame](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html)
or [Spark
DataFrame](https://spark.apache.org/docs/latest/sql-programming-guide.html).

DataFrames are typically created by calling a method on
[`SessionContext`](https://docs.rs/datafusion/latest/datafusion/execution/context/struct.SessionContext.html),
such as
[`read_csv`](https://docs.rs/datafusion/latest/datafusion/execution/context/struct.SessionContext.html#method.read_csv),
and can then be modified by calling the transformation methods, such as
[`filter`](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html#method.filter),
[`select`](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html#method.select),
[`aggregate`](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html#method.aggregate),
and
[`limit`](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html#method.limit)
to build up a query definition.

The query can be executed by calling the
[`collect`](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html#method.collect)
method.

DataFusion DataFrames use lazy evaluation, meaning that each
transformation creates a new plan but does not actually perform any
immediate actions. This approach allows for the overall plan to be
optimized before execution. The plan is evaluated (executed) when an
action method is invoked, such as
[`collect`](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html#method.collect).
See the [Library Users
Guide](../library-user-guide/using-the-dataframe-api.html) for more
details.

The DataFrame API is well documented in the [API reference on
docs.rs](https://docs.rs/datafusion/latest/datafusion/dataframe/struct.DataFrame.html).
Please refer to the [Expressions Reference](expressions.html) for more
information on building logical expressions (`Expr`) to use with the
DataFrame API.

## Example

The DataFrame struct is part of DataFusion's `prelude` and can be
imported with the following statement.

    use datafusion::prelude::*;

Here is a minimal example showing the execution of a query using the
DataFrame API.

Create DataFrame using macro API from in memory rows

    use datafusion::prelude::*;
    use datafusion::error::Result;

    #[tokio::main]
    async fn main() -> Result<()> {
        // Create a new dataframe with in-memory data using macro
        let df = dataframe!(
            "a" => [1, 2, 3],
            "b" => [true, true, false],
            "c" => [Some("foo"), Some("bar"), None]
        )?;
        df.show().await?;
        Ok(())
    }

Create DataFrame from file or in memory rows using standard API

    use datafusion::arrow::array::{Int32Array, RecordBatch, StringArray};
    use datafusion::arrow::datatypes::{DataType, Field, Schema};
    use datafusion::error::Result;
    use datafusion::functions_aggregate::expr_fn::min;
    use datafusion::prelude::*;
    use std::sync::Arc;

    #[tokio::main]
    async fn main() -> Result<()> {
        // Read the data from a csv file
        let ctx = SessionContext::new();
        let df = ctx.read_csv("tests/data/example.csv", CsvReadOptions::new()).await?;
        let df = df.filter(col("a").lt_eq(col("b")))?
            .aggregate(vec![col("a")], vec![min(col("b"))])?
            .limit(0, Some(100))?;
        // Print results
        df.show().await?;

        // Create a new dataframe with in-memory data
        let schema = Schema::new(vec![
          Field::new("id", DataType::Int32, true),
          Field::new("name", DataType::Utf8, true),
        ]);
        let batch = RecordBatch::try_new(
          Arc::new(schema),
          vec![
              Arc::new(Int32Array::from(vec![1, 2, 3])),
              Arc::new(StringArray::from(vec!["foo", "bar", "baz"])),
          ],
        )?;
        let df = ctx.read_batch(batch)?;
        df.show().await?;

        Ok(())
    }
