import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/format";
import { Download, Loader2, Mail, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, btnDanger, btnGhost, Card, DataTable, downloadCsv, splitName, Td } from "./kit";

export function MembersTab({ onWrite }: { onWrite: (email: string) => void }) {
  const users = trpc.admin.users.useQuery();
  const legacy = trpc.members.list.useQuery();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "students" | "active" | "removed">("all");
  const refresh = () => void users.refetch();
  const setActive = trpc.admin.setActive.useMutation({ onSuccess: refresh, onError: error => toast.error(error.message) });
  const remove = trpc.admin.deleteUser.useMutation({ onSuccess: () => { toast.success("Membre supprimé définitivement."); refresh(); }, onError: error => toast.error(error.message) });

  const list = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (users.data ?? []).filter(user => {
      if (filter === "students" && !/^(étudiant|élève)/i.test(user.profession ?? "")) return false;
      if (filter === "active" && !user.isActive) return false;
      if (filter === "removed" && user.isActive) return false;
      if (!needle) return true;
      return [user.name, user.firstName, user.lastName, user.email, user.phone, user.city, user.country, user.university, user.profession].some(value => value?.toLowerCase().includes(needle));
    });
  }, [users.data, search, filter]);

  const exportCsv = () => downloadCsv(`membres-cmai-${new Date().toISOString().slice(0, 10)}.csv`, [
    ["Nom", "Prénom", "Sexe", "Pays", "Ville", "Téléphone", "E-mail", "Profession / statut", "Niveau d'études", "Université / établissement", "Adresse", "E-mail vérifié", "Statut du compte", "Inscrit le"],
    ...list.map(user => { const n = splitName(user); return [n.last, n.first, user.gender, user.country, user.city, user.phone, user.email, user.profession, user.educationLevel, user.university, user.address, user.emailVerified ? "oui" : "non", user.isActive ? "actif" : "retiré", formatDate(user.createdAt)]; }),
  ]);

  return (
    <div className="space-y-6">
      <Card title={`Membres (${list.length})`} subtitle="Toutes les informations saisies à l'inscription. Le compte d'un membre retiré est désactivé (réversible) ; la suppression définitive efface ses données personnelles." actions={<button onClick={exportCsv} className={btnGhost}><Download className="h-4 w-4" /> Exporter en CSV</button>}>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa49d]" />
            <input className="form-input !mt-0 !h-11 pl-10" placeholder="Rechercher (nom, e-mail, ville, université…)" value={search} onChange={event => setSearch(event.target.value)} />
          </div>
          <select className="form-input !mt-0 !h-11 !w-auto" value={filter} onChange={event => setFilter(event.target.value as typeof filter)} aria-label="Filtrer les membres">
            <option value="all">Tous</option><option value="students">Étudiants</option><option value="active">Actifs</option><option value="removed">Retirés</option>
          </select>
        </div>
        {users.isLoading && <Loader2 className="h-5 w-5 animate-spin text-[#eb6a3d]" />}
        <DataTable head={["Nom", "Prénom", "Sexe", "Pays", "Ville", "Téléphone", "E-mail", "Profession / statut", "Niveau", "Université", "Statut", "Actions"]} empty={list.length === 0 && !users.isLoading ? "Aucun membre trouvé." : undefined}>
          {list.map(user => {
            const n = splitName(user);
            return (
              <tr key={user.id} className={user.isActive ? "" : "bg-[#faf6f4] opacity-80"}>
                <Td className="font-semibold text-[#193f36]">{n.last || "—"}</Td><Td>{n.first || "—"}</Td><Td>{user.gender ?? "—"}</Td><Td>{user.country ?? "—"}</Td><Td>{user.city ?? "—"}</Td>
                <Td className="whitespace-nowrap">{user.phone ?? "—"}</Td><Td>{user.email}</Td><Td>{user.profession ?? "—"}</Td><Td>{user.educationLevel ?? "—"}</Td><Td className="min-w-[160px]">{user.university ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    {user.role === "admin" && <Badge color="gold">Admin</Badge>}
                    {user.isActive ? <Badge color="green">Actif</Badge> : <Badge color="orange">Retiré</Badge>}
                    {!user.emailVerified && <Badge color="gray">E-mail non vérifié</Badge>}
                    {user.studentAccessGranted ? <Badge color="green">Accès étudiant</Badge> : null}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    {user.email && <button onClick={() => onWrite(user.email as string)} className={btnGhost + " !px-3 !py-1.5 !text-xs"}><Mail className="h-3.5 w-3.5" /> Écrire</button>}
                    {user.role !== "admin" && (user.isActive
                      ? <button className={btnDanger} onClick={() => window.confirm(`Retirer ${n.first} ${n.last} ? Son compte sera désactivé.`) && setActive.mutate({ id: user.id, active: false })}>Retirer</button>
                      : <button className={btnGhost + " !px-3 !py-1.5 !text-xs"} onClick={() => setActive.mutate({ id: user.id, active: true })}>Réactiver</button>)}
                    {user.role !== "admin" && <button className={btnDanger} onClick={() => window.confirm(`Supprimer DÉFINITIVEMENT ${n.first} ${n.last} et ses données personnelles ? Cette action est irréversible.`) && remove.mutate({ id: user.id })}>Supprimer</button>}
                  </div>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </Card>

      <Card title={`Inscriptions au club (${legacy.data?.length ?? 0})`} subtitle="Personnes inscrites via le formulaire public de la page d'accueil (sans compte).">
        <DataTable head={["Nom", "E-mail", "Téléphone", "Pays / ville", "Profil", "Centres d'intérêt", "Date"]} empty={legacy.data?.length === 0 ? "Aucune inscription." : undefined}>
          {legacy.data?.map(item => (
            <tr key={item.id}><Td className="font-semibold text-[#193f36]">{item.firstName} {item.lastName}</Td><Td>{item.email}</Td><Td>{item.phone ?? "—"}</Td><Td>{item.country}{item.city ? ` · ${item.city}` : ""}</Td><Td>{item.profileType}</Td><Td>{item.interests}</Td><Td>{formatDate(item.createdAt)}</Td></tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
