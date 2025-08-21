# Profiling

The DataFusion `SessionContext` offers methods to collect execution information from the optimizer, physical plan, and task execution.

## Flight Recorders

The DataFusion `SessionContext` comes with two "flight recorders" that can capture information from the optimizer, physical plan, and task execution. These flight recorders are:

*   `ExecutionPlanFlightRecorder`: Collects information about the physical plan and execution.
*   `OptimizerFlightRecorder`: Collects information about the optimizer.

### `ExecutionPlanFlightRecorder`

The `ExecutionPlanFlightRecorder` is used to capture data related to the physical plan and its execution. This includes details like:

*   The structure of the physical plan.
*   The number of partitions.
*   The number of rows and batches processed at each operator.
*   The time spent in various stages of execution.

To use the `ExecutionPlanFlightRecorder`, you can attach it to your `SessionContext` and then query the collected data:

```rust
use datafusion::prelude::*;
use datafusion::execution::context::ExecutionPlanFlightRecorder;

#[tokio::main]
async fn main() -> datafusion::error::Result<()> {
    let mut ctx = SessionContext::new();

    // Create a FlightRecorder and attach it to the SessionContext
    let recorder = ExecutionPlanFlightRecorder::new();
    ctx.attach_execution_plan_recorder(recorder.clone());

    // Execute a query
    let df = ctx.read_csv("data.csv", CsvReadOptions::default()).await?;
    df.show().await?;

    // Get the recorded metrics
    let metrics = recorder.lock().await;

    // You can now inspect the metrics:
    // For example, print the number of recorded plans
    println!("Number of recorded plans: {}", metrics.recorded_plans().len());

    // Or iterate over plans and their metrics
    for (plan_id, plan_metrics) in metrics.recorded_plans() {
        println!("Plan ID: {:?}", plan_id);
        for metric in plan_metrics.iter() {
            println!("  Metric: {:?}", metric);
        }
    }

    Ok(())
}
```

### `OptimizerFlightRecorder`

The `OptimizerFlightRecorder` is designed to capture information about the logical plan optimization process. This can include:

*   The logical plan before and after each optimizer rule.
*   The time spent by each optimizer rule.
*   Details about the transformations applied by the rules.

To use the `OptimizerFlightRecorder`, you attach it to the `SessionContext` and then access the recorded data:

```rust
use datafusion::prelude::*;
use datafusion::execution::context::OptimizerFlightRecorder;

#[tokio::main]
async fn main() -> datafusion::error::Result<()> {
    let mut ctx = SessionContext::new();

    // Create an OptimizerFlightRecorder and attach it
    let recorder = OptimizerFlightRecorder::new();
    ctx.attach_optimizer_recorder(recorder.clone());

    // Execute a query
    let df = ctx.read_csv("data.csv", CsvReadOptions::default()).await?;
    df.show().await?;

    // Get the recorded metrics
    let metrics = recorder.lock().await;

    // You can now inspect the optimizer metrics:
    println!("Number of recorded optimizer passes: {}", metrics.recorded_passes().len());

    // Iterate over recorded passes
    for (pass_idx, pass_metrics) in metrics.recorded_passes().iter().enumerate() {
        println!("Optimizer Pass {}: Rule Name: {}", pass_idx, pass_metrics.rule_name());
        println!("  Time taken: {:?}", pass_metrics.time_taken());
        println!("  Logical plan before: {:?}", pass_metrics.plan_before());
        println!("  Logical plan after: {:?}", pass_metrics.plan_after());
    }

    Ok(())
}
```
