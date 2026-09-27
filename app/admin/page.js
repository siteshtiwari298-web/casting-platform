'use client';

import { useEffect, useState } from 'react';
import { createClient, PHOTO_BUCKET } from '../../lib/supabaseClient';

export default function AdminPage() {
  const supabase = createClient();
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(null); // null = checking, false = blocked, true = ok

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAuthorized(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profile?.role !== 'admin') {
      setAuthorized(false);
      return;
    }

    setAuthorized(true);
    await loadPending();
  }

  async function loadPending() {
    setLoading(true);
    const { data, error } = await supabase
      .from('actors')
      .select('id, actor_code, full_name, current_location, status, created_at, actor_media(storage_path, is_primary)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!error) setActors(data || []);
    setLoading(false);
  }

  async function updateStatus(actorId, newStatus) {
    await supabase.from('actors').update({ status: newStatus }).eq('id', actorId);
    setActors((prev) => prev.filter((a) => a.id !== actorId));
  }

  function photoUrl(actor) {
    const primary = actor.actor_media?.find((m) => m.is_primary);
    if (!primary) return null;
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(primary.storage_path);
    return data?.publicUrl;
  }

  if (authorized === null) return <main style={{ padding: 40 }}>Checking access...</main>;
  if (authorized === false)
    return (
      <main style={{ padding: 40 }}>
        <p>You need to be logged in with an admin account to view this page.</p>
      </main>
    );

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px 60px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Pending Actor Profiles</h1>
      {loading && <p>Loading...</p>}
      {!loading && actors.length === 0 && <p>No pending profiles right now.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {actors.map((actor) => (
          <div key={actor.id} style={cardStyle}>
            {photoUrl(actor) && (
              <img
                src={photoUrl(actor)}
                alt={actor.full_name}
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {actor.full_name} <span style={{ color: '#999', fontWeight: 400 }}>({actor.actor_code})</span>
              </div>
              <div style={{ color: '#666', fontSize: 14 }}>{actor.current_location}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateStatus(actor.id, 'approved')} style={approveBtn}>
                Approve
              </button>
              <button onClick={() => updateStatus(actor.id, 'rejected')} style={rejectBtn}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

const cardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: 16,
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #eee',
};

const approveBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  background: '#1a7f37',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};

const rejectBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  background: '#c22',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};
