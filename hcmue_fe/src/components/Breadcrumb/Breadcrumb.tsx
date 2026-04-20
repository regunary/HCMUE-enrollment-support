export function Breadcrumb(props: { items: string[] }) {
  return <p className="text-sm text-muted m-0">{props.items.join(' / ')}</p>
}
