'use client';

import { useState } from 'react';
import { createClient, MAX_PHOTO_BYTES, PHOTO_BUCKET } from '../../../lib/supabaseClient';

const MAX_PHOTO_MB = (MAX_PHOTO_BYTES / (1024 * 1024)).toFixed(0);

export default function ActorRegisterPage() {
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    height_cm: '',
    current_location: '',
    languages: '',
    special_skills: '',
    phone: '',
    email: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(
        `That photo is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose a photo under ${MAX_PHOTO_MB} MB.`
      );
      setPhotoFile(null);
      e.target.value = '';
      return;
    }

    setPhotoError('');
    setPhotoFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');

    if (!photoFile) {
      setStatus('A profile photo is required.');
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus('You must be logged in.');
      setSubmitting(false);
      return;
    }

    // 1. Insert the actor record (status defaults to 'pending')
    const { data: actor, error: insertError } = await supabase
      .from('actors')
      .insert({
        profile_id: user.id,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        current_location: form.current_location,
        languages: form.languages ? form.languages.split(',').map((s) => s.trim()) : [],
        special_skills: form.special_skills ? form.special_skills.split(',').map((s) => s.trim()) : [],
        phone: form.phone,
        email: form.email,
      })
      .select()
      .single();

    if (insertError) {
      setStatus(`Error: ${insertError.message}`);
      setSubmitting(false);
      return;
    }

    // 2. Upload the profile photo to Storage
    // The bucket itself also enforces a max file size (see storage setup),
    // so this is a second, redundant safety net, not the only check.
    const filePath = `${user.id}/${Date.now()}-${photoFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(filePath, photoFile);

    if (uploadError) {
      setStatus(`Profile saved, but photo upload failed: ${uploadError.message}`);
      setSubmitting(false);
      return;
    }

    // 3. Record the media row
    await supabase.from('actor_media').insert({
      actor_id: actor.id,
      kind: 'photo',
      storage_path: filePath,
      is_primary: true,
    });

    setSubmitting(false);
    setStatus('Your profile has been submitted and is awaiting approval.');
  }

  return (
    <main style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px 60px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Create Your Actor Profile</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={labelStyle}>
          Full Name
          <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Date of Birth
          <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Gender
          <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label style={labelStyle}>
          Height (cm)
          <input name="height_cm" value={form.height_cm} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Current Location
          <input name="current_location" value={form.current_location} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Languages (comma-separated)
          <input name="languages" value={form.languages} onChange={handleChange} placeholder="Nepali, Hindi, English" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Special Skills (comma-separated)
          <input name="special_skills" value={form.special_skills} onChange={handleChange} placeholder="Dancing, Martial arts" style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Phone (kept private — never shown publicly)
          <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Email (kept private — never shown publicly)
          <input type="email" name="email" value={form.email} onChange={handleChange} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Profile Photo (max {MAX_PHOTO_MB} MB)
          <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ marginTop: 6 }} />
        </label>
        {photoError && <p style={{ color: 'crimson', fontSize: 14 }}>{photoError}</p>}
        {photoFile && !photoError && (
          <p style={{ color: '#2a7', fontSize: 14 }}>
            Selected: {photoFile.name} ({(photoFile.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}

        {status && <p style={{ fontSize: 14 }}>{status}</p>}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? 'Submitting...' : 'Submit Profile'}
        </button>
      </form>
    </main>
  );
}

const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#333' };
const inputStyle = { padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 };
const buttonStyle = {
  padding: '14px 20px',
  borderRadius: 10,
  background: '#111',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
  marginTop: 8,
};
