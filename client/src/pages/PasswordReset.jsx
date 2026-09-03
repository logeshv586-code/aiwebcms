import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { post } from '../services/api';

export default function PasswordReset({ mode = 'forgot' }) {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState({ loading: false, message: '', error: '', developmentToken: '' });
  const token = params.get('token') || '';

  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, message: '', error: '', developmentToken: '' });
    try {
      if (mode === 'reset') {
        if (!token) throw new Error('This reset link does not contain a token.');
        if (password !== confirmPassword) throw new Error('The new passwords do not match.');
        const result = await post('/auth/reset-password', { token, password });
        setState({ loading: false, message: result.message, error: '', developmentToken: '' });
      } else {
        const result = await post('/auth/forgot-password', { email });
        setState({ loading: false, message: result.message, error: '', developmentToken: result.developmentResetToken || '' });
      }
    } catch (error) {
      setState({ loading: false, message: '', error: error.message, developmentToken: '' });
    }
  }

  return <main className="auth-page"><div className="auth-card"><Link className="brand-mark" to="/">Store account</Link><span className="eyebrow">Account security</span><h1>{mode === 'reset' ? 'Choose a new password' : 'Reset your password'}</h1><p className="muted">{mode === 'reset' ? 'Use at least 8 characters.' : 'Enter your account email. If email delivery is connected, we will send a secure reset link.'}</p><form onSubmit={submit} className="stack-form">{mode === 'reset' ? <><label><span>New password</span><input type="password" minLength="8" required value={password} onChange={(e)=>setPassword(e.target.value)}/></label><label><span>Confirm new password</span><input type="password" minLength="8" required value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)}/></label></> : <label><span>Email</span><input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}/></label>}{state.error&&<div className="alert error">{state.error}</div>}{state.message&&<div className="alert success">{state.message}</div>}{state.developmentToken&&<div className="help-note"><div><strong>Development only</strong><p>Email is not connected, so this local environment returned a test token. <Link className="text-link" to={`/reset-password?token=${encodeURIComponent(state.developmentToken)}`}>Open reset form</Link>.</p></div></div>}<button className="button primary full" disabled={state.loading}>{state.loading?'Please wait…':mode==='reset'?'Update password':'Send reset link'}</button></form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></div></main>;
}
