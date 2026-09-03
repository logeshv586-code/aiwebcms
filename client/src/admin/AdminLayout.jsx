import { NavLink, Navigate, Outlet, Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Boxes, CircleHelp, ClipboardList, FileText, FolderTree, FormInput, Home, LogOut, Megaphone, Navigation as NavigationIcon, Package, PackageSearch, Plug, Settings, ShoppingBag, UserCog, Users } from 'lucide-react';
import { useAuth } from '../store/auth';

const nav = [
  ['Dashboard', '/admin', Home, true],
  ['Products', '/admin/products', Package],
  ['Catalog setup', '/admin/catalog', FolderTree],
  ['Inventory', '/admin/inventory', PackageSearch, false, ['OWNER','ADMIN','MANAGER']],
  ['Orders', '/admin/orders', ClipboardList, false, ['OWNER','ADMIN','MANAGER']],
  ['Customers', '/admin/customers', Users, false, ['OWNER','ADMIN','MANAGER']],
  ['Reports', '/admin/reports', BarChart3, false, ['OWNER','ADMIN','MANAGER']],
  ['Payment review', '/admin/payment-reviews', AlertTriangle, false, ['OWNER','ADMIN','MANAGER']],
  ['Homepage', '/admin/homepage', Boxes],
  ['Pages & FAQ', '/admin/content', FileText],
  ['Forms & enquiries', '/admin/forms', FormInput],
  ['Navigation', '/admin/navigation', NavigationIcon],
  ['Promotions & reviews', '/admin/promotions', Megaphone, false, ['OWNER','ADMIN','MANAGER']],
  ['Store settings', '/admin/settings', Settings, false, ['OWNER','ADMIN','MANAGER']],
  ['Integrations', '/admin/integrations', Plug, false, ['OWNER','ADMIN','MANAGER']],
  ['Staff access', '/admin/staff', UserCog, false, ['OWNER']]
];

export default function AdminLayout() {
  const user = useAuth((s) => s.user); const logout = useAuth((s) => s.logout);
  if (!user || !['OWNER','ADMIN','MANAGER','EDITOR'].includes(user.role)) return <Navigate to="/admin/login" replace/>;
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link to="/admin" className="admin-brand"><div className="admin-brand-icon"><ShoppingBag size={18}/></div><div><strong>Commerce CMS</strong><small>White-label store</small></div></Link>
      <nav>{nav.filter(([, , , , roles])=>!roles||roles.includes(user.role)).map(([label, to, Icon, end]) => <NavLink key={to} to={to} end={Boolean(end)}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="admin-side-bottom"><Link to="/" target="_blank"><BarChart3 size={18}/> View storefront</Link><button onClick={logout}><LogOut size={18}/> Sign out</button></div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-top"><div><strong>{user.name || 'Store admin'}</strong><small>{user.role.toLowerCase()}</small></div><Link className="button secondary small" to="/" target="_blank">Open store ↗</Link></header>
      <main className="admin-content"><Outlet/></main>
    </div>
  </div>;
}

export function AdminPageHead({ eyebrow = 'CMS', title, description, action }) {
  return <div className="admin-page-head"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function HelpNote({ title = 'Simple tip', children }) {
  return <div className="help-note"><CircleHelp size={20}/><div><strong>{title}</strong><p>{children}</p></div></div>;
}
