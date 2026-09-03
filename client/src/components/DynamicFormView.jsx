import { useState } from 'react';
import { post } from '../services/api';

export default function DynamicFormView({ form }) {
  const [values, setValues] = useState({});
  const [state, setState] = useState({ loading: false, message: '', error: '' });
  const fields = Array.isArray(form?.fields) ? form.fields : [];
  async function submit(event) {
    event.preventDefault(); setState({ loading: true, message: '', error: '' });
    try { const data = await post(`/storefront/forms/${form.key}/submissions`, values); setState({ loading: false, message: data.message, error: '' }); setValues({}); }
    catch (error) { setState({ loading: false, message: '', error: error.message }); }
  }
  return <form className="form-card" onSubmit={submit}>
    {form.description && <p className="muted">{form.description}</p>}
    <div className="form-grid">
      {fields.map((field) => <label className={field.type === 'textarea' ? 'span-2' : ''} key={field.key}>
        <span>{field.label}{field.required ? ' *' : ''}</span>
        {field.type === 'textarea'
          ? <textarea rows="5" required={field.required} placeholder={field.placeholder||''} value={values[field.key] || ''} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}/>
          : field.type === 'select'
            ? <select required={field.required} value={values[field.key] || ''} onChange={(e)=>setValues({...values,[field.key]:e.target.value})}><option value="">{field.placeholder||'Choose an option'}</option>{(field.options||[]).map((option)=><option key={option} value={option}>{option}</option>)}</select>
            : field.type === 'checkbox'
              ? <input type="checkbox" required={field.required} checked={Boolean(values[field.key])} onChange={(e)=>setValues({...values,[field.key]:e.target.checked})}/>
              : <input type={field.type || 'text'} required={field.required} placeholder={field.placeholder||''} value={values[field.key] || ''} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}/>}
        {field.helpText&&<small className="field-help">{field.helpText}</small>} 
      </label>)}
    </div>
    {state.error && <div className="alert error">{state.error}</div>}
    {state.message && <div className="alert success">{state.message}</div>}
    <button className="button primary" disabled={state.loading}>{state.loading ? 'Sending…' : form.settings?.submitLabel || 'Submit'}</button>
  </form>;
}
