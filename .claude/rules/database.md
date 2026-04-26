---
paths:
  - "hcmue_be/**/*.py"
  - "hcmue_be/**/models.py"
  - "hcmue_be/**/migrations/*.py"
---

# Database Rules (PostgreSQL + Django ORM)

## 1. Data integrity (QUAN TRỌNG NHẤT)
- Always define clear primary key (prefer UUID or stable business key).
- CCCD must be unique unless business explicitly allows duplicates.
- Never silently overwrite existing data on import.
- Use `unique_together` or constraints for:
  - (candidate, major, aspiration_order)
  - (combination_code)
- Validate before insert, not after.

---

## 2. Transaction safety
- Use `transaction.atomic()` for:
  - import flows
  - admission calculation
  - bulk updates
- Never mix read + write logic without transaction if consistency matters.
- Avoid partial writes on failure → rollback must be clear.

---

## 3. Query optimization
- ALWAYS check for:
  - N+1 queries
- Use:
  - `select_related()` for FK
  - `prefetch_related()` for reverse/many
- Avoid loops calling DB inside:
```python
for candidate in candidates:
    candidate.scores.all()  # ❌ N+1

## 4. Indexing

Add indexes for:
- CCCD
- major_code
- combination_code
- aspiration_order
- frequently filtered fields (year, score range)

Use:
```python
class Meta:
    indexes = [
        models.Index(fields=["cccd"]),
    ]

## 5. Bulk Operations

- Use `bulk_create` and `bulk_update` to handle large-scale data imports efficiently.

- Always perform **full validation before executing bulk operations**:
  - Validate data schema
  - Check business rules
  - Detect duplicates or conflicts

- Do NOT rely on bulk operations to enforce validation logic.

- Process data in batches to avoid memory and transaction issues:
  - Recommended batch size: 500–1000 records per batch

- Wrap bulk operations inside `transaction.atomic()` to ensure:
  - Consistency
  - Safe rollback on failure

- Track and log import results:
  - number of records created
  - number of records updated
  - number of failed records (with reasons)

- Avoid mixing bulk operations with per-row logic inside loops.

- Be careful with side effects:
  - Signals (`post_save`, etc.) are NOT triggered by default in bulk operations
  - If needed, handle side effects manually

- For critical data (e.g., admissions, candidate identity):
  - Prefer correctness over speed
  - Fall back to row-by-row processing if validation is complex

## 6. Flexible Score Structure

- Candidate score sets may vary across individuals.

- Avoid fixed schema assumptions such as:
  - math, physics, chemistry always exist

- Preferred approaches:
  - Use `JSONField` for flexible structures
  - OR normalize into a separate table:
    - `CandidateSubjectScore(candidate, subject, score)`

- Ensure:
  - consistent access pattern across services
  - validation per subject type

- All calculations must:
  - dynamically adapt to available subjects
  - validate required subjects per combination

---

## 7. Admission Calculation Safety

- All admission logic must be centralized in the service layer.

- Never duplicate formulas across:
  - views
  - serializers
  - frontend

- Use deterministic functions:
```python
def calculate_score(candidate, combination):
    pass

- Ensure:
  - no hidden side effects
  - same input → same output
- Validate:
  - missing subjects
  - invalid combinations
  - condition constraints (e.g., threshold scores)

## 8. Import Rules

- Every import must explicitly define:
  - identity key (e.g., CCCD)
  - operation mode (insert, update, upsert, or ignore)

- Structure the import pipeline into clear stages:
  - parsing (read raw data)
  - normalization (standardize format)
  - validation (schema + business rules)
  - persistence (write to database)

- Always track and log:
  - number of records created
  - number of records updated
  - number of records skipped
  - number of failed rows (with error reasons)

- Prevent:
  - overwriting valid data with incomplete input
  - silent failures or partial updates without reporting

- Ensure import is:
  - idempotent when possible
  - safe to re-run without corrupting data

---

## 9. Soft Delete vs Hard Delete

- Prefer soft delete for critical and auditable entities:
  - candidate
  - admission results
  - import history

- Implement soft delete using:
  - `is_deleted` flag
  - `deleted_at` timestamp

- Default queries must:
  - exclude soft-deleted records unless explicitly requested

- Never hard delete:
  - data required for audit, reporting, or traceability

- Use hard delete only for:
  - temporary or non-critical data

---

## 10. Migration Discipline

- Never modify existing migrations in production environments.

- Always:
  - create new migration files
  - review generated SQL before applying

- Be cautious with:
  - schema changes on large tables
  - index creation (may lock tables)
  - column type changes

- For heavy migrations:
  - apply in phases (e.g., add column → backfill → enforce constraint)
  - consider background data migration strategies

---

## 11. Security

- Always use ORM or parameterized queries.
- Never construct raw SQL using string concatenation.

- Validate all external inputs:
  - API payloads
  - Excel import data

- Enforce role-based access control:
  - Admin, Admissions Council, Faculty must have clearly separated permissions

- Protect sensitive data:
  - avoid exposing CCCD and personal info unnecessarily
  - limit data returned in API responses based on role

- Log security-relevant actions:
  - imports
  - updates
  - admission result generation

## 12. Performance Hotspots

- Identify and monitor high-cost operations, especially:
  - score distribution queries
  - percentile calculations
  - large joins (candidate × aspiration × combination)

- Avoid:
  - full table scans without proper filtering
  - nested loops that trigger repeated database access (N+1 queries)
  - recomputing heavy aggregations on every request

- Optimize query patterns:
  - use indexed fields for filtering and sorting
  - limit selected columns to only what is needed
  - paginate large result sets

- For heavy analytical workloads, consider:
  - precomputed tables (denormalized data)
  - materialized views for score distribution and percentile
  - batch jobs for periodic recalculation

- Use caching where appropriate:
  - Redis for frequently accessed aggregates
  - cache keys based on filter parameters (major, combination, score range)

- Separate workloads:
  - transactional queries (CRUD) vs analytical queries (reporting)
  - do not mix both in the same endpoint

- Benchmark and validate:
  - measure query execution time before and after optimization
  - test with large datasets (realistic scale)

- Always prioritize:
  - correctness first
  - then optimize for performance based on actual bottlenecks