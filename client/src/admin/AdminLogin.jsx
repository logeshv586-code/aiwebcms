import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useState } from 'react';

export default function AdminLogin() {
  const user = useAuth((s) => s.user); const login = useAuth((s) => s.login); const loading = useAuth((s) => s.loading); const error = useAuth((s) => s.error); const [values, setValues] = useState({ email: '', password: '' }); const navigate = useNavigate();
  if (user && ['OWNER','ADMIN','MANAGER','EDITOR'].includes(user.role)) return <Navigate to="/admin" replace/>;
  async function submit(e) { e.preventDefault(); try { const logged = await login(values.email, values.password); if (!['OWNER','ADMIN','MANAGER','EDITOR'].includes(logged.role)) throw new Error('This account does not have CMS access.'); navigate('/admin'); } catch {} }
  return <main className="admin-login"><div className="admin-login-card"><div className="admin-logo"><ShieldCheck/><span>Commerce CMS</span></div><span className="eyebrow">Store management</span><h1>Sign in to your CMS</h1><p className="muted">Manage your store without editing code.</p><form className="stack-form" onSubmit={submit}><label><span>Email</span><input type="email" required value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })}/></label><label><span>Password</span><input type="password" required value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })}/></label>{error && <div className="alert error">{error}</div>}<button className="button primary full" disabled={loading}>{loading ? 'Signing in…' : 'Open CMS'}</button></form><Link className="text-link" to="/">← Back to storefront</Link></div></main>;
}
