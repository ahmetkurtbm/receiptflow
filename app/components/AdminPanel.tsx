"use client";

import { Check, Database, FolderPlus, LoaderCircle, Save, UserPlus, Users } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

type User = {
  id: string; external_user_id: string; display_name: string; email: string | null;
  active: boolean; group_ids: string[];
};
type Group = { id: string; code: string; name: string; description: string; active: boolean };

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [userForm, setUserForm] = useState({ externalUserId: "", displayName: "", email: "" });
  const [groupForm, setGroupForm] = useState({ code: "", name: "", description: "" });
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  const loadData = useCallback(async () => {
    const response = await fetch("/api/admin");
    const data = await response.json();
    setConfigured(data.configured ?? true);
    setUsers(data.users || []); setGroups(data.groups || []);
    setAssignments(Object.fromEntries((data.users || []).map((user: User) => [user.id, user.group_ids])));
  }, []);

  useEffect(() => { loadData().catch(() => setNotice("Admin verileri yuklenemedi.")); }, [loadData]);

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Islem tamamlanamadi.");
      await loadData(); setNotice("Degisiklik kaydedildi.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Bir hata olustu."); }
    finally { setBusy(false); }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    await post({ action: "createUser", ...userForm });
    setUserForm({ externalUserId: "", displayName: "", email: "" });
  };
  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    await post({ action: "createGroup", ...groupForm });
    setGroupForm({ code: "", name: "", description: "" });
  };
  const toggleGroup = (userId: string, groupId: string) => {
    setAssignments((current) => {
      const selected = current[userId] || [];
      return { ...current, [userId]: selected.includes(groupId) ? selected.filter((id) => id !== groupId) : [...selected, groupId] };
    });
  };

  if (configured === false) return <section className="admin-view"><div className="database-empty"><Database size={34} /><h2>PostgreSQL baglantisi bekleniyor</h2><p>`DATABASE_URL` degerini ekleyip `database/schema.sql` dosyasini veritabaninda calistirin.</p></div></section>;

  return <section className="admin-view">
    <div className="admin-summary"><div><Users size={21} /><span><small>Kullanicilar</small><strong>{users.length}</strong></span></div><div><FolderPlus size={21} /><span><small>Fis tipi gruplari</small><strong>{groups.length}</strong></span></div>{notice && <p><Check size={15} />{notice}</p>}</div>

    <div className="admin-forms">
      <form onSubmit={createUser}><header><UserPlus size={19} /><div><h2>Kullanici eslestir</h2><p>Ana projedeki kullanici kimligini ReceiptFlow'a tanitin.</p></div></header><div className="admin-form-grid"><label>Harici kullanici ID<input required value={userForm.externalUserId} onChange={(e) => setUserForm({ ...userForm, externalUserId: e.target.value })} placeholder="orn. usr_1042" /></label><label>Gorunen ad<input required value={userForm.displayName} onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })} placeholder="Ahmet Yilmaz" /></label><label>E-posta<input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="ahmet@firma.com" /></label></div><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <UserPlus size={17} />} Kullanici ekle</button></form>
      <form onSubmit={createGroup}><header><FolderPlus size={19} /><div><h2>Fis tipi grubu</h2><p>Kullanicilara atanacak masraf gruplarini tanimlayin.</p></div></header><div className="admin-form-grid"><label>Grup kodu<input required value={groupForm.code} onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })} placeholder="SEYAHAT" /></label><label>Grup adi<input required value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Seyahat Masraflari" /></label><label>Aciklama<input value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Ulasim ve konaklama" /></label></div><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <FolderPlus size={17} />} Grup ekle</button></form>
    </div>

    <section className="assignment-section"><header><div><h2>Kullanici grup atamalari</h2><p>Her kullanicinin fis kaydederken secebilecegi gruplari belirleyin.</p></div></header>{users.length ? <div className="assignment-list">{users.map((user) => <div className="assignment-row" key={user.id}><div className="assignment-user"><span>{user.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{user.display_name}</strong><small>{user.external_user_id}{user.email ? ` · ${user.email}` : ""}</small></div></div><div className="group-options">{groups.map((group) => <label key={group.id}><input type="checkbox" checked={(assignments[user.id] || []).includes(group.id)} onChange={() => toggleGroup(user.id, group.id)} /><span>{group.name}</span></label>)}</div><button className="secondary-button" disabled={busy} onClick={() => post({ action: "assignGroups", userId: user.id, groupIds: assignments[user.id] || [] })}><Save size={16} /> Kaydet</button></div>)}</div> : <div className="admin-empty">Once ana projeden bir kullanici kimligi ekleyin.</div>}</section>
  </section>;
}
