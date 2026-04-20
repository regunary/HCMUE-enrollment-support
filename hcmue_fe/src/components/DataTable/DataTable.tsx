export type DataColumn<T> = {
  key: keyof T
  label: string
}

export function DataTable<T extends Record<string, string | number>>(props: {
  columns: DataColumn<T>[]
  rows: T[]
  onRowClick?: (row: T, rowIndex: number) => void
  selectedRowIndex?: number | null
}) {
  return (
    <div className="w-full overflow-auto border border-border rounded-xl mt-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th
                key={String(column.key)}
                className="bg-table-head text-primary text-left px-3 py-2.5 border-b border-border font-semibold whitespace-nowrap"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={[
                props.onRowClick ? 'cursor-pointer' : '',
                props.selectedRowIndex === rowIndex
                  ? 'bg-primary-100'
                  : props.onRowClick
                    ? 'hover:bg-bg-soft'
                    : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={props.onRowClick ? () => props.onRowClick?.(row, rowIndex) : undefined}
              role={props.onRowClick ? 'button' : undefined}
              tabIndex={props.onRowClick ? 0 : undefined}
              onKeyDown={
                props.onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        props.onRowClick?.(row, rowIndex)
                      }
                    }
                  : undefined
              }
            >
              {props.columns.map((column) => (
                <td key={String(column.key)} className="border-b border-border px-3 py-2.5 whitespace-nowrap">
                  {row[column.key] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
