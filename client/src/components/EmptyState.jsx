export default function EmptyState({ title = 'Nothing here yet', text = 'Add content from the CMS to make this section visible.', action }) {
  return <div className="empty"><div className="empty-icon">+</div><h3>{title}</h3><p>{text}</p>{action}</div>;
}
