import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { uploadFile } from '../services/api';

export default function ImageUploadButton({ onUploaded, label = 'Upload image' }) {
  const ref = useRef(null);
  const [state, setState] = useState({ loading: false, error: '' });
  async function change(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setState({ loading: true, error: '' });
    try {
      const result = await uploadFile(file);
      onUploaded(result.url);
      setState({ loading: false, error: '' });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  }
  return <div className="upload-control"><input ref={ref} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={change}/><button type="button" className="button secondary small" disabled={state.loading} onClick={() => ref.current?.click()}><ImagePlus size={16}/>{state.loading ? 'Uploading…' : label}</button>{state.error && <small className="error-text">{state.error}</small>}</div>;
}
